import pino from 'pino'
import { env } from './env'

const isProduction = env.NODE_ENV === 'production'

export const logger = isProduction
  ? pino({
      level: env.LOG_LEVEL,
      formatters: {
        level: (label) => ({ level: label }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      base: {
        pid: process.pid,
        hostname: process.env.HOSTNAME || 'localhost',
      },
    })
  : pino({
      level: env.LOG_LEVEL,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      },
    })

export type Logger = typeof logger

/**
 * Create a child logger with additional context
 * Useful for function-scoped logging with request IDs
 */
export function createChildLogger(context: Record<string, any>): Logger {
  return logger.child(context)
}

/**
 * Create a function-scoped logger
 */
export function createFunctionLogger(functionName: string, requestId?: string): Logger {
  const context: Record<string, any> = {
    function: functionName,
  }
  
  if (requestId) {
    context.requestId = requestId
  }
  
  return logger.child(context)
}
