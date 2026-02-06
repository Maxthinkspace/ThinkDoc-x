import * as React from 'react'
import './ErrorCard.css'

interface ErrorCardProps {
  title?: string
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  variant?: 'error' | 'warning' | 'info'
}

export const ErrorCard: React.FC<ErrorCardProps> = ({
  title = 'Error',
  message,
  onRetry,
  onDismiss,
  variant = 'error',
}) => {
  return (
    <div className={`error-card error-card-${variant}`}>
      <div className="error-card-content">
        <h4 className="error-card-title">{title}</h4>
        <p className="error-card-message">{message}</p>
      </div>
      <div className="error-card-actions">
        {onRetry && (
          <button className="error-card-retry" onClick={onRetry}>
            Retry
          </button>
        )}
        {onDismiss && (
          <button className="error-card-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        )}
      </div>
    </div>
  )
}

