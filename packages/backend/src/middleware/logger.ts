import type { Context, Next } from 'hono'
import { logger } from '@/config/logger'
import { nanoid } from 'nanoid'

export interface RequestContext {
  requestId: string
  startTime: number
  userAgent?: string
  ip?: string
}

export const requestLogger = () => {
  return async (c: Context, next: Next) => {
    // Extract request ID from header if provided by frontend, otherwise generate one
    const frontendRequestId = c.req.header('x-request-id')
    const requestId = frontendRequestId || nanoid()
    const startTime = Date.now()
    
    // Set request context
    c.set('requestId', requestId)
    c.set('startTime', startTime)
    c.header('X-Request-Id', requestId)
    
    const { method, url } = c.req
    const userAgent = c.req.header('user-agent')
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
    
    logger.debug({
      requestId,
      method,
      url,
      userAgent,
      ip,
    }, 'Request started')

    await next()
    
    const duration = Date.now() - startTime
    const status = c.res.status
    
    logger.debug({
      requestId,
      method,
      url,
      status,
      duration,
      ip,
    }, 'Request completed')
  }
}
