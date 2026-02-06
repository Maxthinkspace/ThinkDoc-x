import { createOpenAPIApp } from '@/lib/openapi'
import { errorHandler } from '@/middleware/error'
import { corsMiddleware } from '@/middleware/cors'
import { requestLogger } from '@/middleware/logger'
import { health } from '@/routes/health'
import { auth } from '@/routes/auth'
import { documents } from '@/routes/documents'
import { playbooks } from '@/routes/playbooks'
import { playbookGenRoutes } from '@/routes/playbook-generation'
import { contractReviewRoutes } from '@/routes/contract-review'
import { reviewWithPrecedentsRoutes } from '@/routes/review-with-precedents'
import { subscriptionsRouter } from '@/routes/subscriptions'
import { vaultRoutes } from '@/routes/vault'
import { askRoutes } from '@/routes/ask'
import { translateRoutes } from '@/routes/translate'
import { redraftRoutes } from '@/routes/redraft'
import { redomicileRoutes } from '@/routes/redomicile'
import definitionCheckerRoutes from '@/routes/definition-checker'
import { timing } from 'hono/timing'
import { etag } from 'hono/etag'
import { secureHeaders } from 'hono/secure-headers'

/**
 * Setup a test app instance with all routes
 * This mirrors the main app setup but without starting a server
 */
export function setupTestApp() {
  const app = createOpenAPIApp()

  // Global middleware (minimal for tests)
  app.use(timing())
  app.use(etag())
  app.use(secureHeaders())
  app.use(corsMiddleware)
  app.use(errorHandler())
  app.use(requestLogger())

  // Global OPTIONS handler
  app.options('*', (c) => c.text('', 200))

  // Register routes
  app.route('/health', health as any)
  app.route('/api/auth', auth)
  app.route('/api/documents', documents)
  app.route('/api/playbooks', playbooks as any)
  app.route('/api/playbook-generation', playbookGenRoutes as any)
  app.route('/api/contract-review', contractReviewRoutes as any)
  app.route('/api/review-with-precedents', reviewWithPrecedentsRoutes as any)
  app.route('/api/subscriptions', subscriptionsRouter)
  app.route('/api/vault', vaultRoutes)
  app.route('/api/ask', askRoutes)
  app.route('/api/translate', translateRoutes)
  app.route('/api/redraft', redraftRoutes as any)
  app.route('/api/redomicile', redomicileRoutes as any)
  app.route('/api/definition-checker', definitionCheckerRoutes)

  // 404 handler
  app.notFound((c) => {
    return c.json({
      error: {
        message: 'Not found',
        status: 404,
        path: c.req.path,
      }
    }, 404)
  })

  return app
}

