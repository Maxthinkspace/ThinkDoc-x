import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { metrics } from '@/utils/metrics'
import { env } from '@/config/env'
import { logger } from '@/config/logger'

const metricsApp = new Hono()

metricsApp.get('/metrics', (c) => {
  const metricsData = metrics.getMetrics()
  return c.text(metricsData, 200, {
    'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
  })
})

metricsApp.get('/health', (c) => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

let metricsServer: any = null

export const startMetricsServer = () => {
  if (metricsServer) {
    logger.warn('Metrics server already running')
    return
  }
  
  try {
    metricsServer = serve({
      fetch: metricsApp.fetch,
      port: env.METRICS_PORT,
      hostname: '0.0.0.0',
    })

    // Prevent unhandled 'error' event (e.g. EADDRINUSE) from crashing the process
    if (typeof metricsServer?.on === 'function') {
      metricsServer.on('error', (err: any) => {
        if (err?.code === 'EADDRINUSE') {
          logger.warn(
            { port: env.METRICS_PORT, code: err.code },
            '📊 Metrics server port already in use; continuing without metrics server'
          )
          metricsServer = null
          return
        }
        logger.error({ error: err }, 'Metrics server error')
      })
    }
    
    logger.info({
      port: env.METRICS_PORT,
    }, '📊 Metrics server started')
    
  } catch (error) {
    logger.error({ error }, 'Failed to start metrics server')
  }
}

export const stopMetricsServer = () => {
  if (metricsServer) {
    metricsServer.close()
    metricsServer = null
    logger.info('Metrics server stopped')
  }
}