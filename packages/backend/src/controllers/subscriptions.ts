import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import Stripe from 'stripe'
import { db } from '@/config/database'
import { subscriptions, users, type NewSubscription } from '@/db/schema/index'
import { eq, and, desc } from 'drizzle-orm'
import { env } from '@/config/env'
import { logger } from '@/config/logger'
import { notify } from '@/services/notifications'

// Lazy initialize Stripe client
let stripeClient: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-10-29.clover',
    })
  }
  return stripeClient
}

// Helper function to safely convert Unix timestamp to Date
function safeTimestampToDate(timestamp: number | null | undefined): Date | null {
  if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp)) {
    return null
  }
  const date = new Date(timestamp * 1000)
  // Validate the date is valid
  if (isNaN(date.getTime())) {
    return null
  }
  return date
}

// Stripe payment links configuration (prices managed in Stripe dashboard)
const STRIPE_PAYMENT_LINKS: Record<string, Record<string, string>> = {
  basic: {
    monthly: '',
    quarterly: '',
    yearly: '',
  },
  professional: {
    monthly: env.STRIPE_PAYMENT_LINK,
    quarterly: '',
    yearly: '',
  },
  enterprise: {
    monthly: '',
    quarterly: '',
    yearly: '',
  },
}

export const subscriptionsController = {
  /**
   * Create a new subscription and return Stripe checkout session
   */
  async create(c: Context) {
    const user = c.get('user')
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' })
    }

    // Get request body with defaults
    const body = await c.req.json().catch(() => ({}))
    const subscriptionType = body.subscriptionType || 'professional'
    const billingPeriod = body.billingPeriod || 'monthly'

    // Validate subscription type
    if (subscriptionType === 'free') {
      throw new HTTPException(400, { message: 'Cannot create paid subscription for free tier' })
    }

    // Get Stripe payment link
    const basePaymentUrl = STRIPE_PAYMENT_LINKS[subscriptionType]?.[billingPeriod]
    if (!basePaymentUrl) {
      throw new HTTPException(400, { message: 'Invalid subscription type or billing period' })
    }

    // Add user information to payment link for tracking
    const url = new URL(basePaymentUrl)
    url.searchParams.set('client_reference_id', user.id)
    
    // Pre-fill user email if available
    if (user.email) {
      url.searchParams.set('prefilled_email', user.email)
    }

    const paymentUrl = url.toString()

    logger.info({
      userId: user.id,
      userEmail: user.email,
      subscriptionType,
      billingPeriod,
      paymentUrl,
    }, 'Stripe payment link generated with user binding')

    return c.json(
      {
        url: paymentUrl,
        subscriptionType,
        billingPeriod,
      },
      201
    )
  },

  /**
   * List all subscriptions for the authenticated user
   */
  async list(c: Context) {
    const user = c.get('user')
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' })
    }

    const userSubscriptions = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(desc(subscriptions.createdAt))

    return c.json({ data: userSubscriptions })
  },

  /**
   * Get a specific subscription by ID
   */
  async get(c: Context) {
    const user = c.get('user')
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' })
    }

    const { id } = c.req.param()
    
    if (!id) {
      throw new HTTPException(400, { message: 'Subscription ID is required' })
    }

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
      .limit(1)

    if (!subscription) {
      throw new HTTPException(404, { message: 'Subscription not found' })
    }

    return c.json({ data: subscription })
  },

  /**
   * Cancel a subscription
   */
  async cancel(c: Context) {
    const user = c.get('user')
    if (!user) {
      throw new HTTPException(401, { message: 'User not authenticated' })
    }

    const { id } = c.req.param()
    
    if (!id) {
      throw new HTTPException(400, { message: 'Subscription ID is required' })
    }
    
    let reason: string | undefined
    try {
      const body = await c.req.json()
      reason = body?.reason
    } catch {
      // No body provided
    }

    // Get subscription
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, user.id)))
      .limit(1)

    if (!subscription) {
      throw new HTTPException(404, { message: 'Subscription not found' })
    }

    if (subscription.status === 'cancelled' || subscription.status === 'expired') {
      throw new HTTPException(400, { message: 'Subscription is already cancelled or expired' })
    }

    try {
      // Cancel subscription in Stripe if paymentId exists
      if (subscription.paymentId) {
        const stripe = getStripe()
        await stripe.subscriptions.cancel(subscription.paymentId)
      }

      // Update subscription in database
      const [updatedSubscription] = await db
        .update(subscriptions)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelReason: reason || null,
          autoRenew: false,
          updatedAt: new Date(),
        })
        .where(eq(subscriptions.id, subscription.id))
        .returning()

      logger.info({
        userId: user.id,
        subscriptionId: id,
        reason,
      }, 'Subscription cancelled')

      return c.json({ data: updatedSubscription })
    } catch (error) {
      logger.error({ error, subscriptionId: id }, 'Failed to cancel subscription')
      throw new HTTPException(500, { message: 'Failed to cancel subscription' })
    }
  },

  /**
   * Handle Stripe webhook events
   */
  async webhook(c: Context) {
    const signature = c.req.header('stripe-signature')
    if (!signature) {
      throw new HTTPException(400, { message: 'Missing stripe-signature header' })
    }

    let event: Stripe.Event

    try {
      const rawBody = await c.req.text()
      const stripe = getStripe()
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      )
    } catch (error) {
      logger.error({ error }, 'Webhook signature verification failed')
      throw new HTTPException(400, { message: 'Invalid signature' })
    }

    logger.info({ eventType: event.type, eventId: event.id }, 'Processing Stripe webhook event')

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session
          await handleCheckoutSessionCompleted(session)
          break
        }

        case 'customer.subscription.created': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionInfo(subscription, 'customer.subscription.created')
          break
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionInfo(subscription, 'customer.subscription.updated')
          break
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription
          await handleSubscriptionDeleted(subscription)
          break
        }

        default:
          logger.info({ eventType: event.type }, 'Unhandled webhook event type')
      }

      return c.json({ received: true })
    } catch (error) {
      logger.error({ error, eventType: event.type }, 'Error processing webhook event')
      throw new HTTPException(500, { message: 'Webhook processing failed' })
    }
  },
}

/**
 * Handle checkout session completed
 * Create initial subscription record with pending status
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.userId
  
  if (!userId) {
    logger.warn({ 
      sessionId: session.id,
      client_reference_id: session.client_reference_id,
      metadata: session.metadata 
    }, 'No user ID in checkout session')
    return
  }

  const stripeSubscriptionId = session.subscription as string
  if (!stripeSubscriptionId) {
    logger.warn({ sessionId: session.id }, 'No subscription ID in session')
    return
  }

  try {
    // Check if subscription already exists
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.paymentId, stripeSubscriptionId))
      .limit(1)

    if (existingSubscription) {
      logger.info({ 
        stripeSubscriptionId, 
        existingId: existingSubscription.id 
      }, 'Subscription already exists, skipping creation')
      return
    }

    // Create initial subscription record with pending status
    // Will be updated when customer.subscription.created event arrives
    const now = new Date()
    const newSubscription: NewSubscription = {
      userId,
      subscriptionType: 'professional', // Default, will be updated
      status: 'pending',
      startDate: now,
      endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // +30 days placeholder
      autoRenew: true,
      paymentProvider: 'stripe',
      paymentId: stripeSubscriptionId,
      paymentStatus: 'pending',
      currency: session.currency?.toUpperCase() || 'USD',
      billingPeriod: 'monthly', // Default, will be updated
    }

    await db.insert(subscriptions).values(newSubscription)

    logger.info({
      userId,
      stripeSubscriptionId,
      sessionId: session.id,
    }, 'Initial subscription record created from checkout session')
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : { error: String(error) }
    
    logger.error({ 
      ...errorDetails,
      sessionId: session.id,
      stripeSubscriptionId 
    }, 'Failed to create initial subscription record')
  }
}

/**
 * Extract subscription data from Stripe subscription object
 */
function extractStripeSubscriptionData(stripeSubscription: Stripe.Subscription) {
  const plan = stripeSubscription.items.data[0]?.plan || (stripeSubscription as any).plan
  
  // Determine subscription type from metadata or default
  const subscriptionType = stripeSubscription.metadata?.subscriptionType || 'professional'
  
  // Map Stripe interval to billing period
  let billingPeriod: 'monthly' | 'quarterly' | 'yearly' = 'monthly'
  if (plan) {
    if (plan.interval === 'year') {
      billingPeriod = 'yearly'
    } else if (plan.interval === 'month') {
      billingPeriod = plan.interval_count === 3 ? 'quarterly' : 'monthly'
    }
  }

  // Get dates from Stripe subscription (safely handle timestamps)
  const startDate = safeTimestampToDate(stripeSubscription.start_date)
  const currentPeriodEnd = safeTimestampToDate((stripeSubscription as any).current_period_end)
  const trialEndDate = safeTimestampToDate(stripeSubscription.trial_end || null)
  const cancelledAt = safeTimestampToDate(stripeSubscription.canceled_at || null)

  // Get amount from plan (convert from cents to dollars)
  const amount = plan?.amount ? (plan.amount / 100).toString() : null
  const currency = stripeSubscription.currency.toUpperCase()

  // Map Stripe status to our status
  let status: 'active' | 'trialing' | 'pending' | 'cancelled' | 'expired' = 'active'
  const stripeStatus = stripeSubscription.status
  if (stripeStatus === 'trialing') {
    status = 'trialing'
  } else if (stripeStatus === 'active') {
    status = 'active'
  } else if (stripeStatus === 'canceled') {
    status = 'cancelled'
  } else if (stripeStatus === 'past_due' || stripeStatus === 'unpaid') {
    status = 'expired'
  } else if (stripeStatus === 'incomplete' || stripeStatus === 'incomplete_expired') {
    status = 'pending'
  }

  // Determine payment status
  const paymentStatus = stripeSubscription.status === 'active' || stripeSubscription.status === 'trialing' 
    ? 'paid' 
    : 'pending'

  return {
    subscriptionType,
    billingPeriod,
    startDate,
    currentPeriodEnd,
    trialEndDate,
    cancelledAt,
    amount,
    currency,
    status,
    paymentStatus,
    autoRenew: !stripeSubscription.cancel_at_period_end,
    cancelReason: stripeSubscription.cancellation_details?.reason || null,
  }
}

/**
 * Sync subscription data from Stripe (create or update)
 */
async function handleSubscriptionInfo(stripeSubscription: Stripe.Subscription, eventType: string) {
  const stripeSubscriptionId = stripeSubscription.id

  try {
    // Check if subscription already exists
    const [existingSubscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.paymentId, stripeSubscriptionId))
      .limit(1)

    // Extract subscription data from Stripe
    const data = extractStripeSubscriptionData(stripeSubscription)

    // For trialing status, use trial_end as the end date; otherwise use current_period_end
    const endDate = data.status === 'trialing' && data.trialEndDate 
      ? data.trialEndDate 
      : data.currentPeriodEnd

    // Validate required dates for creation
    if (!data.startDate || !endDate) {
      logger.error({ 
        stripeSubscriptionId, 
        status: data.status,
        start_date: stripeSubscription.start_date,
        current_period_end: (stripeSubscription as any).current_period_end,
        trial_start: stripeSubscription.trial_start,
        trial_end: stripeSubscription.trial_end,
      }, 'Invalid dates in Stripe subscription')
      return
    }

    if (existingSubscription) {
      // Update existing subscription
      const updateData: any = {
        subscriptionType: data.subscriptionType,
        status: data.status,
        startDate: data.startDate,
        endDate: endDate,
        trialEndDate: data.trialEndDate,
        autoRenew: data.autoRenew,
        paymentStatus: data.paymentStatus,
        amount: data.amount,
        currency: data.currency,
        billingPeriod: data.billingPeriod,
        cancelledAt: data.cancelledAt,
        cancelReason: data.cancelReason,
        updatedAt: new Date(),
      }

      await db
        .update(subscriptions)
        .set(updateData)
        .where(eq(subscriptions.paymentId, stripeSubscriptionId))

      logger.info({
        subscriptionId: existingSubscription.id,
        userId: existingSubscription.userId,
        subscriptionType: data.subscriptionType,
        billingPeriod: data.billingPeriod,
        status: data.status,
        trialEndDate: data.trialEndDate?.toISOString(),
        endDate: endDate.toISOString(),
        stripeSubscriptionId,
        eventType,
      }, 'Subscription synced from Stripe')

      // Send notification for subscription confirmation or trial ending
      if (data.status === 'active' && !existingSubscription.status || existingSubscription.status === 'pending') {
        // New subscription confirmed
        notify(existingSubscription.userId, 'subscription_confirmed', {
          subscriptionType: data.subscriptionType,
          billingPeriod: data.billingPeriod,
          amount: data.amount,
          currency: data.currency,
        }).catch((error) => {
          logger.error({ error, userId: existingSubscription.userId }, 'Failed to send subscription confirmation notification')
        })
      } else if (data.status === 'trialing' && data.trialEndDate) {
        // Trial ending reminder (only send if trial ends within 3 days)
        const daysUntilTrialEnd = Math.ceil((data.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        if (daysUntilTrialEnd <= 3 && daysUntilTrialEnd > 0) {
          notify(existingSubscription.userId, 'subscription_trial_ending', {
            trialEndDate: data.trialEndDate,
          }).catch((error) => {
            logger.error({ error, userId: existingSubscription.userId }, 'Failed to send trial ending notification')
          })
        }
      } else if (data.status === 'expired' && data.paymentStatus === 'pending') {
        // Payment failed
        notify(existingSubscription.userId, 'subscription_payment_failed', {}).catch((error) => {
          logger.error({ error, userId: existingSubscription.userId }, 'Failed to send payment failed notification')
        })
      }
    } else {
      // Create new subscription (fallback scenario)
      logger.warn({ 
        stripeSubscriptionId,
        eventType 
      }, 'Subscription not found, creating new record (fallback)')
      
      // Find userId from customer
      let userId: string | undefined
      const customerId = typeof stripeSubscription.customer === 'string' 
        ? stripeSubscription.customer 
        : stripeSubscription.customer?.id

      if (customerId) {
        const stripe = getStripe()
        const customer = await stripe.customers.retrieve(customerId)
        
        if (customer && !customer.deleted && customer.email) {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, customer.email))
            .limit(1)
          
          if (user) {
            userId = user.id
          }
        }
      }

      if (!userId) {
        logger.error({ 
          stripeSubscriptionId,
          customer: stripeSubscription.customer
        }, 'Cannot create subscription: user not found')
        return
      }

      const newSubscription: NewSubscription = {
        userId,
        subscriptionType: data.subscriptionType,
        status: data.status,
        startDate: data.startDate,
        endDate: endDate,
        trialEndDate: data.trialEndDate,
        autoRenew: data.autoRenew,
        paymentProvider: 'stripe',
        paymentId: stripeSubscriptionId,
        paymentStatus: data.paymentStatus,
        amount: data.amount,
        currency: data.currency,
        billingPeriod: data.billingPeriod,
        cancelledAt: data.cancelledAt,
        cancelReason: data.cancelReason,
      }

      await db.insert(subscriptions).values(newSubscription)

      logger.info({
        userId,
        subscriptionType: data.subscriptionType,
        billingPeriod: data.billingPeriod,
        status: data.status,
        trialEndDate: data.trialEndDate?.toISOString(),
        endDate: endDate.toISOString(),
        stripeSubscriptionId,
        eventType,
      }, 'Subscription created from Stripe (fallback)')

      // Send notification for new subscription
      if (data.status === 'active') {
        notify(userId, 'subscription_confirmed', {
          subscriptionType: data.subscriptionType,
          billingPeriod: data.billingPeriod,
          amount: data.amount,
          currency: data.currency,
        }).catch((error) => {
          logger.error({ error, userId }, 'Failed to send subscription confirmation notification')
        })
      } else if (data.status === 'trialing' && data.trialEndDate) {
        const daysUntilTrialEnd = Math.ceil((data.trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        if (daysUntilTrialEnd <= 3 && daysUntilTrialEnd > 0) {
          notify(userId, 'subscription_trial_ending', {
            trialEndDate: data.trialEndDate,
          }).catch((error) => {
            logger.error({ error, userId }, 'Failed to send trial ending notification')
          })
        }
      }
    }
  } catch (error) {
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack, name: error.name }
      : { error: String(error) }
    
    logger.error({ 
      ...errorDetails,
      stripeSubscriptionId,
      eventType
    }, 'Failed to sync subscription from Stripe')
    throw error
  }
}

/**
 * Handle subscription deletion
 */
async function handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription) {
  const subscriptionId = stripeSubscription.id

  await db
    .update(subscriptions)
    .set({
      status: 'cancelled',
      cancelledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.paymentId, subscriptionId))

  logger.info({ subscriptionId }, 'Subscription deleted')
}

