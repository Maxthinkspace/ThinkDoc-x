import * as React from 'react'
import './PageHeader.css'

interface PageHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  backButton?: {
    onClick: () => void
    label?: string
  }
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  backButton,
}) => {
  return (
    <div className="page-header">
      <div className="page-header-content">
        {backButton && (
          <button className="page-header-back" onClick={backButton.onClick}>
            ← {backButton.label || 'Back'}
          </button>
        )}
        <div className="page-header-text">
          <h1 className="page-header-title">{title}</h1>
          {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </div>
  )
}

