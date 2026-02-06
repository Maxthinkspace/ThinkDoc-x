import type { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logger } from '@/config/logger'
import { ZodError } from 'zod'
import { AppError, ErrorCode } from '@/utils/errors'

export const errorHandler = () => {
  return async (c: Context, next: Next) => {
    try {
      return await next()
    } catch (error) {
      const requestId = c.get('requestId') || 'unknown'
      
      // Log error details
      logger.error({
        requestId,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
          ...(error instanceof AppError && { code: error.code }),
        } : error,
        url: c.req.url,
        method: c.req.method,
      }, 'Request error')

      // Handle AppError (custom application errors)
      if (error instanceof AppError) {
        return c.json({
          error: {
            message: error.message,
            code: error.code,
            status: error.status,
            requestId,
            ...(error.details && { details: error.details }),
          }
        }, error.status)
      }

      // Handle HTTPException (from Hono)
      if (error instanceof HTTPException) {
        return c.json({
          error: {
            message: error.message,
            status: error.status,
            requestId,
          }
        }, error.status)
      }
      
      // Handle Zod validation errors
      if (error instanceof ZodError) {
        return c.json({
          error: {
            message: 'Validation error',
            code: ErrorCode.VALIDATION_ERROR,
            status: 400,
            requestId,
            details: error.issues,
          }
        }, 400)
      }

      // Handle database errors (Postgres/Drizzle)
      if (error && typeof error === 'object' && 'code' in error) {
        const dbError = error as { code?: string; message?: string }
        // PostgreSQL error codes
        if (dbError.code === '23505') { // Unique violation
          return c.json({
            error: {
              message: 'Resource already exists',
              code: ErrorCode.VALIDATION_ERROR,
              status: 409,
              requestId,
            }
          }, 409)
        }
        if (dbError.code === '23503') { // Foreign key violation
          return c.json({
            error: {
              message: 'Referenced resource does not exist',
              code: ErrorCode.VALIDATION_ERROR,
              status: 400,
              requestId,
            }
          }, 400)
        }
        if (dbError.code?.startsWith('23')) { // Other constraint violations
          return c.json({
            error: {
              message: dbError.message || 'Database constraint violation',
              code: ErrorCode.DATABASE_ERROR,
              status: 400,
              requestId,
            }
          }, 400)
        }
      }
      
      // Unknown error - return generic 500
      return c.json({
        error: {
          message: 'Internal server error',
          code: ErrorCode.INTERNAL_ERROR,
          status: 500,
          requestId,
        }
      }, 500)
    }
  }
}