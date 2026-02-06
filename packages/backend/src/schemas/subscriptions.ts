import { z } from 'zod'
import { createRoute } from '@hono/zod-openapi'
import { commonResponses, dataResponse } from '@/lib/openapi'

// Subscription type and status enums
export const subscriptionTypeEnum = z.enum(['free', 'basic', 'professional', 'enterprise'])
export const subscriptionStatusEnum = z.enum(['active', 'cancelled', 'expired', 'pending', 'trialing'])
export const billingPeriodEnum = z.enum(['monthly', 'yearly', 'quarterly'])
export const currencyEnum = z.enum(['USD', 'CNY', 'EUR', 'GBP', 'JPY'])

// Create subscription request schema
export const createSubscriptionSchema = z
  .object({
    subscriptionType: subscriptionTypeEnum.openapi({
      description: 'Type of subscription plan',
      example: 'professional',
    }),
    billingPeriod: billingPeriodEnum.default('monthly').openapi({
      description: 'Billing period for the subscription',
      example: 'yearly',
    }),
    currency: currencyEnum.default('USD').openapi({
      description: 'Currency code',
      example: 'USD',
    }),
    successUrl: z.string().url().optional().openapi({
      description: 'URL to redirect after successful payment',
      example: 'https://example.com/success',
    }),
    cancelUrl: z.string().url().optional().openapi({
      description: 'URL to redirect after cancelled payment',
      example: 'https://example.com/cancel',
    }),
  })
  .openapi({
    title: 'Create Subscription',
    description: 'Request body to create a new subscription',
  })

// Subscription response schema
export const subscriptionSchema = z
  .object({
    id: z.string().openapi({
      description: 'Unique subscription identifier',
      example: 'cuid2_sub_12345',
    }),
    userId: z.string().openapi({
      description: 'User ID associated with subscription',
      example: 'cuid2_user_12345',
    }),
    subscriptionType: subscriptionTypeEnum.openapi({
      description: 'Type of subscription plan',
      example: 'professional',
    }),
    status: subscriptionStatusEnum.openapi({
      description: 'Current status of subscription',
      example: 'active',
    }),
    startDate: z.string().datetime().openapi({
      description: 'Subscription start date',
      example: '2024-01-01T00:00:00.000Z',
    }),
    endDate: z.string().datetime().openapi({
      description: 'Subscription end date',
      example: '2025-01-01T00:00:00.000Z',
    }),
    trialEndDate: z.string().datetime().nullable().openapi({
      description: 'Trial period end date',
      example: '2024-01-15T00:00:00.000Z',
    }),
    autoRenew: z.boolean().openapi({
      description: 'Auto-renewal enabled',
      example: true,
    }),
    amount: z.string().nullable().openapi({
      description: 'Subscription amount',
      example: '99.99',
    }),
    currency: z.string().openapi({
      description: 'Currency code',
      example: 'USD',
    }),
    billingPeriod: z.string().openapi({
      description: 'Billing period',
      example: 'yearly',
    }),
    paymentProvider: z.string().nullable().openapi({
      description: 'Payment provider name',
      example: 'stripe',
    }),
    paymentId: z.string().nullable().openapi({
      description: 'External payment ID',
      example: 'sub_xxxxxxxxxxxxxx',
    }),
    createdAt: z.string().datetime().openapi({
      description: 'Record creation timestamp',
      example: '2024-01-01T00:00:00.000Z',
    }),
    updatedAt: z.string().datetime().openapi({
      description: 'Record update timestamp',
      example: '2024-01-01T00:00:00.000Z',
    }),
  })
  .openapi({
    title: 'Subscription',
    description: 'Subscription information',
  })

// Checkout session response
export const checkoutSessionSchema = z
  .object({
    sessionId: z.string().openapi({
      description: 'Stripe checkout session ID',
      example: 'cs_test_xxxxxxxxxxxxx',
    }),
    url: z.string().url().openapi({
      description: 'Stripe checkout page URL',
      example: 'https://checkout.stripe.com/c/pay/cs_test_xxxxx',
    }),
  })
  .openapi({
    title: 'Checkout Session',
    description: 'Stripe checkout session information',
  })

// Webhook event schema
export const stripeWebhookEventSchema = z
  .object({
    type: z.string().openapi({
      description: 'Stripe event type',
      example: 'checkout.session.completed',
    }),
    data: z.any().openapi({
      description: 'Event data payload',
    }),
  })
  .openapi({
    title: 'Stripe Webhook Event',
    description: 'Stripe webhook event data',
  })

// Cancel subscription schema
export const cancelSubscriptionSchema = z
  .object({
    reason: z.string().optional().openapi({
      description: 'Reason for cancellation',
      example: 'No longer needed',
    }),
  })
  .openapi({
    title: 'Cancel Subscription',
    description: 'Cancel subscription request',
  })

// OpenAPI route definitions
export const createSubscriptionRoute = createRoute({
  method: 'post',
  path: '/',
  tags: ['Subscriptions'],
  summary: 'Create a new subscription',
  description: 'Create a new subscription and return Stripe checkout session URL',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: createSubscriptionSchema,
        },
      },
      description: 'Subscription creation request',
      required: true,
    },
  },
  responses: {
    201: {
      description: 'Checkout session created successfully',
      content: {
        'application/json': {
          schema: dataResponse(checkoutSessionSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const listSubscriptionsRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Subscriptions'],
  summary: 'List user subscriptions',
  description: 'Get all subscriptions for the authenticated user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Subscriptions retrieved successfully',
      content: {
        'application/json': {
          schema: dataResponse(z.array(subscriptionSchema)),
        },
      },
    },
    ...commonResponses,
  },
})

export const getSubscriptionRoute = createRoute({
  method: 'get',
  path: '/{id}',
  tags: ['Subscriptions'],
  summary: 'Get subscription details',
  description: 'Get details of a specific subscription',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({
        description: 'Subscription ID',
        example: 'cuid2_sub_12345',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Subscription retrieved successfully',
      content: {
        'application/json': {
          schema: dataResponse(subscriptionSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const cancelSubscriptionRoute = createRoute({
  method: 'post',
  path: '/{id}/cancel',
  tags: ['Subscriptions'],
  summary: 'Cancel a subscription',
  description: 'Cancel an active subscription',
  security: [{ bearerAuth: [] }],
  request: {
    params: z.object({
      id: z.string().openapi({
        description: 'Subscription ID',
        example: 'cuid2_sub_12345',
      }),
    }),
    body: {
      content: {
        'application/json': {
          schema: cancelSubscriptionSchema,
        },
      },
      description: 'Cancellation request',
      required: false,
    },
  },
  responses: {
    200: {
      description: 'Subscription cancelled successfully',
      content: {
        'application/json': {
          schema: dataResponse(subscriptionSchema),
        },
      },
    },
    ...commonResponses,
  },
})

export const stripeWebhookRoute = createRoute({
  method: 'post',
  path: '/webhook',
  tags: ['Subscriptions'],
  summary: 'Stripe webhook handler',
  description: 'Handle Stripe webhook events for subscription updates',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.any(),
        },
      },
      description: 'Stripe webhook event payload',
      required: true,
    },
    headers: z.object({
      'stripe-signature': z.string().openapi({
        description: 'Stripe signature for webhook verification',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Webhook processed successfully',
      content: {
        'application/json': {
          schema: z.object({
            received: z.boolean(),
          }),
        },
      },
    },
    400: {
      description: 'Invalid webhook signature',
      content: {
        'application/json': {
          schema: z.object({
            error: z.string(),
          }),
        },
      },
    },
  },
})

