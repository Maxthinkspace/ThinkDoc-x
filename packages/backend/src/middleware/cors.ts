import { cors } from 'hono/cors'
import { env } from '@/config/env'
import { logger } from '@/config/logger'

export const corsMiddleware = cors({
  origin: (origin, c) => {
    // If there's no Origin header, it's not a browser CORS request (curl, server-to-server, etc.)
    // Returning undefined avoids sending ACAO="*" with credentials=true (which browsers reject).
    if (!origin) return undefined

    // DEV: reflect the Origin to support Office WebView / add-in runtimes that use different origins.
    if (env.NODE_ENV === 'development') {
      logger.debug(
        { origin, path: c.req.path, method: c.req.method },
        'CORS dev mode: reflecting origin'
      )
      return origin
    }

    // PROD: check against allowlist
    const isAllowed = env.ALLOWED_ORIGINS.includes(origin)

    if (!isAllowed) {
      logger.warn({ origin, path: c.req.path }, 'CORS request from non-allowed origin')
    }

    return isAllowed ? origin : undefined
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-API-Key',
    'X-Request-Id',
    'Accept',
    'Origin',
    'Cache-Control',
    'Pragma',
  ],
  exposeHeaders: ['X-Request-Id', 'X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 86400,
})
