import { Hono } from 'hono'
import { handle } from 'hono/vercel'
import { cors } from 'hono/cors'
import { etag } from 'hono/etag'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'

// Import routes
import { health } from '../src/routes/health'
import { auth } from '../src/routes/auth'
import { documents } from '../src/routes/documents'
import { playbookGenRoutes } from '../src/routes/playbook-generation'
import { llmRoutes } from '../src/routes/llm'
import { playbooks } from '../src/routes/playbooks'
import { users } from '../src/routes/users'
import { contractReviewRoutes } from '../src/routes/contract-review'
import definitionCheckerRoutes from '../src/routes/definition-checker'
import { reviewWithPrecedentsRoutes } from '../src/routes/review-with-precedents'
import { documentClassificationRoutes } from '../src/routes/document-classification'
import { playbookCombinationRoutes } from '../src/routes/playbook-combination'
import { subscriptionsRouter } from '../src/routes/subscriptions'
import { vaultRoutes } from '../src/routes/vault'
import { redraftRoutes } from '../src/routes/redraft'
import { summaryGenRoutes } from '../src/routes/summary-generation'
import { redomicileRoutes } from '../src/routes/redomicile'
import reviewSessionsRouter from '../src/routes/review-sessions'
import { complianceRoutes } from '../src/routes/compliance'
import { negotiationRoutes } from '../src/routes/negotiation'
import { askRoutes } from '../src/routes/ask'
import { translateRoutes } from '../src/routes/translate'
import { thinkRoutes } from '../src/routes/think'
import libraryRoutes from '../src/routes/library'
import { annotationPrepareRoutes } from '../src/routes/annotation-prepare'
import { clientLogs } from '../src/routes/client-logs'
import organizationsRoutes from '../src/routes/organizations'
import chatSessionsRoutes from '../src/routes/chat-sessions'
import documentVersionsRoutes from '../src/routes/document-versions'
import { notifications } from '../src/routes/notifications'
import { redactionRoutes } from '../src/routes/redaction'
import { draftingRoutes } from '../src/routes/drafting'
import adminRoutes from '../src/routes/admin'
import superAdminRoutes from '../src/routes/superadmin'
import { integrationsRoutes } from '../src/routes/integrations'

// Use Node.js runtime for full compatibility
export const config = {
  runtime: 'nodejs',
  maxDuration: 60,
}

const app = new Hono()

// Global middleware
app.use('*', timing())
app.use('*', etag())
app.use('*', secureHeaders())
app.use('*', cors({
  origin: (origin) => origin || '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposeHeaders: ['Content-Length', 'X-Request-Id'],
  maxAge: 86400,
  credentials: true,
}))

// Global OPTIONS handler for CORS preflight
app.options('*', (c) => c.text('', 200))

// Health check routes
app.route('/health', health as any)
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))

// API routes
app.route('/api/auth', auth)
app.route('/api/documents', documents)
app.route('/api/llm', llmRoutes as any)
app.route('/api/playbooks', playbooks as any)
app.route('/api/playbook-generation', playbookGenRoutes as any)
app.route('/api/contract-review', contractReviewRoutes as any)
app.route('/api/users', users as any)
app.route('/api/definition-checker', definitionCheckerRoutes)
app.route('/api/review-with-precedents', reviewWithPrecedentsRoutes as any)
app.route('/api/document', documentClassificationRoutes)
app.route('/api/playbook-combination', playbookCombinationRoutes)
app.route('/api/subscriptions', subscriptionsRouter)
app.route('/api/vault', vaultRoutes)
app.route('/api/redraft', redraftRoutes as any)
app.route('/api/summary-generation', summaryGenRoutes as any)
app.route('/api/redomicile', redomicileRoutes as any)
app.route('/api/review-sessions', reviewSessionsRouter)
app.route('/api/compliance', complianceRoutes)
app.route('/api/negotiation', negotiationRoutes)
app.route('/api/ask', askRoutes)
app.route('/api/translate', translateRoutes)
app.route('/api/think', thinkRoutes)
app.route('/api/library', libraryRoutes)
app.route('/api/annotations', annotationPrepareRoutes as any)
app.route('/api/client-logs', clientLogs)
app.route('/api/organization', organizationsRoutes)
app.route('/api/integrations', integrationsRoutes)
app.route('/api/chat-sessions', chatSessionsRoutes)
app.route('/api/document-versions', documentVersionsRoutes)
app.route('/api/notifications', notifications as any)
app.route('/api/redaction', redactionRoutes as any)
app.route('/api/drafting', draftingRoutes as any)
app.route('/api/admin', adminRoutes)
app.route('/api/superadmin', superAdminRoutes)

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'ThinkDoc Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      documents: '/api/documents',
      llm: '/api/llm',
      playbooks: '/api/playbooks',
      users: '/api/users',
      vault: '/api/vault',
      subscriptions: '/api/subscriptions',
    },
  })
})

app.get('/api', (c) => {
  return c.json({
    name: 'ThinkDoc Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  })
})

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

// Error handler
app.onError((err, c) => {
  console.error('API Error:', err)
  return c.json({
    error: {
      message: err.message || 'Internal server error',
      status: 500,
    }
  }, 500)
})

export default handle(app)
