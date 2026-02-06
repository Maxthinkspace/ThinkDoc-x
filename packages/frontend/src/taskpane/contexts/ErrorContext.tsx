import * as React from 'react'
import { useToast } from '../hooks/use-toast'

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: any
}

interface ErrorContextValue {
  showError: (error: Error | ApiError | string, options?: ErrorDisplayOptions) => void
  clearError: () => void
  currentError: ApiError | null
}

interface ErrorDisplayOptions {
  title?: string
  duration?: number
  showRetry?: boolean
  onRetry?: () => void
}

const ErrorContext = React.createContext<ErrorContextValue | undefined>(undefined)

export function ErrorProvider({ children }: { children: React.ReactNode }) {
  const [currentError, setCurrentError] = React.useState<ApiError | null>(null)
  const { toast } = useToast()

  const showError = React.useCallback(
    (error: Error | ApiError | string, options?: ErrorDisplayOptions) => {
      let apiError: ApiError

      if (typeof error === 'string') {
        apiError = { message: error }
      } else if (error instanceof Error) {
        apiError = {
          message: error.message,
          code: (error as any).code,
          status: (error as any).status,
        }
      } else {
        apiError = error
      }

      setCurrentError(apiError)

      // Map error codes to user-friendly messages
      const userMessage = getErrorMessage(apiError)

      toast({
        title: options?.title || 'Error',
        description: userMessage,
        variant: 'error',
      })
    },
    [toast]
  )

  const clearError = React.useCallback(() => {
    setCurrentError(null)
  }, [])

  return (
    <ErrorContext.Provider value={{ showError, clearError, currentError }}>
      {children}
    </ErrorContext.Provider>
  )
}

export function useError() {
  const context = React.useContext(ErrorContext)
  if (!context) {
    throw new Error('useError must be used within ErrorProvider')
  }
  return context
}

/**
 * Map error codes to user-friendly messages
 */
function getErrorMessage(error: ApiError): string {
  // Check for specific error codes
  if (error.code) {
    const codeMessages: Record<string, string> = {
      VALIDATION_ERROR: 'Please check your input and try again.',
      AUTHENTICATION_REQUIRED: 'Please log in to continue.',
      INSUFFICIENT_PERMISSIONS: "You don't have permission to perform this action.",
      RESOURCE_NOT_FOUND: 'The requested resource was not found.',
      LLM_PROVIDER_ERROR: 'AI service is temporarily unavailable. Please try again later.',
      RATE_LIMIT_EXCEEDED: 'Too many requests. Please wait a moment and try again.',
      SUBSCRIPTION_REQUIRED: 'An active subscription is required for this feature.',
      DATABASE_ERROR: 'A database error occurred. Please try again.',
      EXTERNAL_SERVICE_ERROR: 'An external service error occurred. Please try again later.',
      INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
    }

    if (codeMessages[error.code]) {
      return codeMessages[error.code]
    }
  }

  // Check HTTP status codes
  if (error.status) {
    if (error.status === 401) {
      return 'Please log in to continue.'
    }
    if (error.status === 403) {
      return "You don't have permission to perform this action."
    }
    if (error.status === 404) {
      return 'The requested resource was not found.'
    }
    if (error.status === 429) {
      return 'Too many requests. Please wait a moment and try again.'
    }
    if (error.status >= 500) {
      return 'Server error. Please try again later.'
    }
  }

  // Fallback to error message
  return error.message || 'An unexpected error occurred.'
}

