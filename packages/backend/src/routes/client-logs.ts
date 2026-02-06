import { Hono } from 'hono'
import { logger } from '@/config/logger'

type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error'

interface ClientLogPayload {
  level?: ClientLogLevel
  message?: string
  event?: string
  functionName?: string
  requestId?: string
  duration?: number
  timestamp?: number
  data?: unknown
}

const clientLogs = new Hono()

clientLogs.post('/', async (c) => {
  let payload: ClientLogPayload | null = null

  try {
    payload = await c.req.json()
  } catch (error) {
    logger.warn({ error }, 'Client log payload is not valid JSON')
    return c.json({ ok: false }, 400)
  }

  const {
    level = 'info',
    message = 'Client log',
    event,
    functionName,
    requestId,
    duration,
    timestamp,
    data,
  } = payload

  const logContext = {
    source: 'frontend',
    event,
    functionName,
    requestId,
    duration,
    timestamp,
    data,
  }

  switch (level) {
    case 'debug':
      logger.debug(logContext, message)
      break
    case 'warn':
      logger.warn(logContext, message)
      break
    case 'error':
      logger.error(logContext, message)
      break
    case 'info':
    default:
      logger.info(logContext, message)
      break
  }

  return c.json({ ok: true })
})

export { clientLogs }
