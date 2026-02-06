import { createOpenAPIApp } from '@/lib/openapi'
import { subscriptionsController } from '@/controllers/subscriptions'
import { authMiddleware } from '@/middleware/auth'
import {
  createSubscriptionRoute,
  listSubscriptionsRoute,
  getSubscriptionRoute,
  cancelSubscriptionRoute,
  stripeWebhookRoute,
} from '@/schemas/subscriptions'

const subscriptionsRouter = createOpenAPIApp()

// Webhook endpoint (no auth required - validated by Stripe signature)
subscriptionsRouter.openapi(stripeWebhookRoute, subscriptionsController.webhook as any)

// Protected routes (require authentication)
subscriptionsRouter.use('/*', authMiddleware())
subscriptionsRouter.openapi(createSubscriptionRoute, subscriptionsController.create)
subscriptionsRouter.openapi(listSubscriptionsRoute, subscriptionsController.list)
subscriptionsRouter.openapi(getSubscriptionRoute, subscriptionsController.get)
subscriptionsRouter.openapi(cancelSubscriptionRoute, subscriptionsController.cancel)

export { subscriptionsRouter }

