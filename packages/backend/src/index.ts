import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { etag } from 'hono/etag'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'
import { createServer as createHttpsServer } from 'https'
import { Readable } from 'node:stream';
import fs from 'fs'
import path from 'path'
import { existsSync } from 'node:fs';
import { readdir, stat, unlink } from 'node:fs/promises';

import { env } from '@/config/env'
import { logger } from '@/config/logger'
import { testDatabaseConnection, closeDatabaseConnection } from '@/config/database'
import { createOpenAPIApp } from '@/lib/openapi'
import { setupApiDocs } from '@/routes/docs'

import { requestLogger } from '@/middleware/logger'
import { errorHandler } from '@/middleware/error'
import { corsMiddleware } from '@/middleware/cors'
import { chunkReassembler } from '@/middleware/chunk-reassembler'
import { metricsMiddleware } from '@/utils/metrics'
import { startMetricsServer } from '@/services/metrics'

import { health } from '@/routes/health'
import { auth } from '@/routes/auth'
import { documents } from '@/routes/documents'
import { playbookGenRoutes } from '@/routes/playbook-generation'
import { llmRoutes } from '@/routes/llm'
import { playbooks } from '@/routes/playbooks'
import { users } from '@/routes/users'
import { contractReviewRoutes } from "@/routes/contract-review";
import definitionCheckerRoutes from './routes/definition-checker';
import { reviewWithPrecedentsRoutes } from '@/routes/review-with-precedents';
import { documentClassificationRoutes } from '@/routes/document-classification';
import { playbookCombinationRoutes } from '@/routes/playbook-combination';
import { subscriptionsRouter } from '@/routes/subscriptions';
import { vaultRoutes } from '@/routes/vault';
import { redraftRoutes } from '@/routes/redraft';
import { summaryGenRoutes } from '@/routes/summary-generation';
import { redomicileRoutes } from '@/routes/redomicile';
import reviewSessionsRouter from '@/routes/review-sessions';
import { complianceRoutes } from '@/routes/compliance';
import { negotiationRoutes } from '@/routes/negotiation';
import { askRoutes } from '@/routes/ask';
import { translateRoutes } from '@/routes/translate';
import { thinkRoutes } from '@/routes/think';
import libraryRoutes from '@/routes/library';
import { annotationPrepareRoutes } from '@/routes/annotation-prepare';
import { clientLogs } from '@/routes/client-logs';
import organizationsRoutes from '@/routes/organizations';
import chatSessionsRoutes from '@/routes/chat-sessions';
import documentVersionsRoutes from '@/routes/document-versions';
import { notifications } from '@/routes/notifications';
import { redactionRoutes } from '@/routes/redaction';
import { draftingRoutes } from '@/routes/drafting';
import adminRoutes from '@/routes/admin';
import superAdminRoutes from '@/routes/superadmin';
import { integrationsRoutes } from '@/routes/integrations';

const app = createOpenAPIApp()

// Global middleware
app.use(timing())
// if (env.NODE_ENV !== 'test') {
//   app.use(compress({ encoding: 'gzip' }))
// }
app.use(etag())
app.use(secureHeaders())
app.use(corsMiddleware)


// Global OPTIONS handler for CORS preflight (before error handler)
app.options('*', (c) => c.text('', 200))

app.use(requestLogger())
app.use(errorHandler())
app.use(metricsMiddleware())

app.post('/api/chunked-upload', chunkReassembler(app as any))

// Static files
app.use('/static/*', serveStatic({ root: './public' }))

// API routes (register routes BEFORE setting up documentation)
app.route('/health', health as any) // Non-OpenAPI route
app.route('/api/auth', auth)
app.route('/api/documents', documents)
app.route('/api/llm', llmRoutes as any) // TODO: Migrate to OpenAPI
app.route('/api/playbooks', playbooks as any) // TODO: Migrate to OpenAPI
app.route('/api/playbook-generation', playbookGenRoutes as any)
app.route('/api/contract-review', contractReviewRoutes as any)
app.route('/api/users', users as any) // TODO: Migrate to OpenAPI
app.route('/api/definition-checker', definitionCheckerRoutes);
app.route('/api/review-with-precedents', reviewWithPrecedentsRoutes as any); 
app.route('/api/document', documentClassificationRoutes);
app.route('/api/playbook-combination', playbookCombinationRoutes);
app.route('/api/subscriptions', subscriptionsRouter);
app.route('/api/vault', vaultRoutes);
app.route('/api/redraft', redraftRoutes as any);
app.route('/api/summary-generation', summaryGenRoutes as any);
app.route('/api/redomicile', redomicileRoutes as any);
app.route('/api/review-sessions', reviewSessionsRouter);
app.route('/api/compliance', complianceRoutes);
app.route('/api/negotiation', negotiationRoutes);
app.route('/api/ask', askRoutes);
app.route('/api/translate', translateRoutes);
app.route('/api/think', thinkRoutes);
app.route('/api/library', libraryRoutes);
app.route('/api/annotations', annotationPrepareRoutes as any);
app.route('/api/client-logs', clientLogs);
app.route('/api/organization', organizationsRoutes);
app.route('/api/integrations', integrationsRoutes);
app.route('/api/chat-sessions', chatSessionsRoutes);
app.route('/api/document-versions', documentVersionsRoutes);
app.route('/api/notifications', notifications as any);
app.route('/api/redaction', redactionRoutes as any);
app.route('/api/drafting', draftingRoutes as any);
app.route('/api/admin', adminRoutes);
app.route('/api/superadmin', superAdminRoutes);


// Setup API documentation AFTER all routes are registered
setupApiDocs(app)

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

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Office Add-in Backend API',
    version: '1.0.0',
    environment: env.NODE_ENV,
    status: 'running',
    timestamp: new Date().toISOString(),
    documentation: {
      interactive: '/api/docs',
      openapi: '/api/docs/openapi.json',
      redoc: '/api/docs/redoc',
      swagger: '/api/docs/swagger',
      info: '/api/docs/info',
    },
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      documents: '/api/documents',
      llm: '/api/llm',
      playbooks: '/api/playbooks',
      paragraphs: '/api/paragraphs',
      users: '/api/users',
      playbookGeneration: '/api/playbook-generation',
      contractReview: '/api/contract-review',
      reviewWithPrecedents: '/api/review-with-precedents',
      subscriptions: '/api/subscriptions',
      redraft: '/api/redraft',
      summaryGeneration: '/api/summary-generation',    
      reviewSessions: '/api/review-sessions',
    },
  })
})

export const cleanupTempUploads = async () => {
  const tempDir = path.join(process.cwd(), 'temp_uploads');
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  // Check if directory exists synchronously to avoid errors
  if (!existsSync(tempDir)) return;

  try {
    const files = await readdir(tempDir);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await stat(filePath);
      const fileAge = now - stats.mtimeMs;

      if (fileAge > MAX_AGE_MS) {
        await unlink(filePath);
        logger.info(`Cleaned up orphaned upload: ${file}`);
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error during temp_uploads cleanup');
  }
};

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully...`)
  
  try {
    await closeDatabaseConnection()
    logger.info('Database connection closed')
  } catch (error) {
    logger.error({ error }, 'Error during shutdown')
  }
  
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// Start server
const startServer = async () => {
  try {
    console.log("starting server");
    // Test database connection
    const dbHealthy = await testDatabaseConnection()
    console.log("test DB connection done");
    if (!dbHealthy) {
      logger.error('Database connection failed, exiting...')
      process.exit(1)
    }

    // Start metrics server
    startMetricsServer()

    console.log("metrics server started");

    // --- ADD CLEANUP LOGIC HERE ---
    // Run an initial cleanup on startup to clear any junk from a previous crash
    cleanupTempUploads().catch(err => logger.error(err, 'Initial cleanup failed'));
    // Set an interval to run every 24 hours
    setInterval(() => {
      cleanupTempUploads().catch(err => logger.error(err, 'Scheduled cleanup failed'));
    }, 24 * 60 * 60 * 1000);
    // ------------------------------

    // Check if we should use HTTPS (if certificates exist)
    const certPath = path.join(process.cwd(), 'certificates', 'localhost.pem')
    const keyPath = path.join(process.cwd(), 'certificates', 'localhost-key.pem')

    const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath)

    if (useHttps) {

      // Start HTTPS server using Node.js https.createServer with proper adapter
      const sslOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      }

      const httpsServer = createHttpsServer(sslOptions, async (req, res) => {
        try {

          // Handle request body properly
          const hasBody = req.method !== 'GET' &&
                          req.method !== 'HEAD' &&
                          req.method !== 'OPTIONS' &&
                          req.headers['content-length'] &&
                          req.headers['content-length'] !== '0'

          const requestInit: RequestInit & { duplex?: string } = {
            method: req.method!,
            headers: req.headers as HeadersInit,
          }

          // Only add body and duplex for requests that actually have a body
          const webStream = Readable.toWeb(req!);
          if (hasBody) {
            requestInit.body = webStream as unknown as ReadableStream;
            requestInit.duplex = 'half'
          }

          const response = await app.fetch(new Request(
            `https://${req.headers.host}${req.url}`,
            requestInit
          ))


          res.statusCode = response.status
          response.headers.forEach((value, key) => {
            res.setHeader(key, value)
          })

          if (response.body) {
            const reader = response.body.getReader()
            const pump = async () => {
              let chunk
              try {
                chunk = await reader.read()
              } catch (e) {
                throw e
              }
              const { done, value } = chunk
              if (done) {
                res.end()
                return
              }
              try {
                res.write(value)
              } catch (e) {
                throw e
              }
              return pump()
            }
            await pump()
          } else {
            res.end()
          }
        } catch (error) {
          logger.error({
            error: error instanceof Error ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            } : error,
            method: req.method,
            url: req.url,
            headers: req.headers,
          }, 'Error handling HTTPS request')

          res.statusCode = 500
          res.end('Internal Server Error')
        }
      })

      httpsServer.listen(env.PORT, env.HOST, () => {
        logger.info({
          port: env.PORT,
          host: env.HOST,
          environment: env.NODE_ENV,
          protocol: 'HTTPS',
        }, '🔒 HTTPS Server started successfully')
      })

      return httpsServer
    } else {

      // Fallback to HTTP server
      const server = serve({
        fetch: app.fetch,
        port: env.PORT,
        hostname: env.HOST,
      })

      logger.info({
        port: env.PORT,
        host: env.HOST,
        environment: env.NODE_ENV,
        protocol: 'HTTP',
      }, '🚀 HTTP Server started successfully (no SSL certificates found)')

      return server
    }
  } catch (error) {
    logger.error({ error }, '❌ Failed to start server')
    process.exit(1)
  }
}

export { app, startServer }

startServer()
