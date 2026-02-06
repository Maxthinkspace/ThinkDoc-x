import { HTTPException } from 'hono/http-exception'

/**
 * Standard error codes for the application
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_REQUIRED = 'AUTHENTICATION_REQUIRED',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  LLM_PROVIDER_ERROR = 'LLM_PROVIDER_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

/**
 * Custom application error class with error codes
 */
export class AppError extends HTTPException {
  public readonly code: ErrorCode
  public readonly details?: any

  constructor(
    status: number,
    code: ErrorCode,
    message: string,
    details?: any
  ) {
    super(status, { message })
    this.code = code
    this.details = details
    this.name = 'AppError'
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      error: {
        message: this.message,
        code: this.code,
        status: this.status,
        ...(this.details && { details: this.details }),
      },
    }
  }
}

/**
 * Helper functions to create common errors
 */
export const AppErrors = {
  validation: (message: string, details?: any) =>
    new AppError(400, ErrorCode.VALIDATION_ERROR, message, details),

  authenticationRequired: (message: string = 'Authentication required') =>
    new AppError(401, ErrorCode.AUTHENTICATION_REQUIRED, message),

  insufficientPermissions: (message: string = 'Insufficient permissions') =>
    new AppError(403, ErrorCode.INSUFFICIENT_PERMISSIONS, message),

  notFound: (resource: string = 'Resource') =>
    new AppError(404, ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`),

  llmProviderError: (message: string, details?: any) =>
    new AppError(502, ErrorCode.LLM_PROVIDER_ERROR, message, details),

  rateLimitExceeded: (message: string = 'Rate limit exceeded') =>
    new AppError(429, ErrorCode.RATE_LIMIT_EXCEEDED, message),

  subscriptionRequired: (message: string = 'Active subscription required') =>
    new AppError(402, ErrorCode.SUBSCRIPTION_REQUIRED, message),

  databaseError: (message: string, details?: any) =>
    new AppError(500, ErrorCode.DATABASE_ERROR, message, details),

  externalServiceError: (service: string, message: string, details?: any) =>
    new AppError(502, ErrorCode.EXTERNAL_SERVICE_ERROR, `${service}: ${message}`, details),

  internal: (message: string = 'Internal server error', details?: any) =>
    new AppError(500, ErrorCode.INTERNAL_ERROR, message, details),
}

