import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
// Comment out these imports for now
import { db } from '@/config/database'
import { subscriptions } from '@/db/schema/index'
import { eq, and, gte, desc } from 'drizzle-orm'

/**
 * Middleware to check if user has a valid active subscription
 * Must be used after authMiddleware as it depends on user being set in context
 */
export const subscriptionMiddleware = () => {
  return async (c: Context, next: Next) => {
    // TEMPORARILY DISABLED FOR LOCAL TESTING
    // TODO: Re-enable subscription checks before production
    await next()
    return

    // Original code commented out below:

    const user = c.get('user')
    
    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }
    
    // Query user's active subscription
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        subscriptionType: subscriptions.subscriptionType,
        status: subscriptions.status,
        endDate: subscriptions.endDate,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)
    
    // Check if subscription exists and is valid
    if (!subscription) {
      throw new HTTPException(403, { 
        message: 'No subscription found. Please subscribe to use this feature.' 
      })
    }
    
    // Check subscription status
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      throw new HTTPException(403, { 
        message: `Subscription is ${subscription.status}. Please renew your subscription to continue.` 
      })
    }
    
    // Check if subscription has expired
    const now = new Date()
    if (subscription.endDate < now) {
      throw new HTTPException(403, { 
        message: 'Subscription has expired. Please renew your subscription to continue.' 
      })
    }
    
    // Subscription is valid, continue to next middleware/handler
    await next()

  }
}