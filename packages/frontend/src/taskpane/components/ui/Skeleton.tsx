import * as React from 'react'
import './Skeleton.css'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  animation?: 'pulse' | 'wave' | 'none'
  style?: React.CSSProperties
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className = '',
  variant = 'rectangular',
  animation = 'pulse',
  style: propStyle,
}) => {
  const style: React.CSSProperties = {
    width: width || '100%',
    height: height || '1em',
    ...(variant === 'circular' && { borderRadius: '50%' }),
    ...(variant === 'text' && { borderRadius: '4px' }),
    ...(variant === 'rectangular' && { borderRadius: '4px' }),
    ...propStyle,
  }

  return (
    <div
      className={`skeleton skeleton-${variant} skeleton-${animation} ${className}`}
      style={style}
    />
  )
}

/**
 * Skeleton loader for list items
 */
export const SkeletonList: React.FC<{
  count?: number
  itemHeight?: string | number
}> = ({ count = 3, itemHeight = '60px' }) => {
  return (
    <div className="skeleton-list">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          height={itemHeight}
          variant="rectangular"
          className="skeleton-list-item"
        />
      ))}
    </div>
  )
}

/**
 * Skeleton loader for cards
 */
export const SkeletonCard: React.FC = () => {
  return (
    <div className="skeleton-card">
      <Skeleton variant="rectangular" height="200px" />
      <div style={{ padding: '16px' }}>
        <Skeleton variant="text" width="60%" height="24px" />
        <Skeleton variant="text" width="40%" height="16px" style={{ marginTop: '8px' }} />
        <Skeleton variant="text" width="80%" height="16px" style={{ marginTop: '4px' }} />
      </div>
    </div>
  )
}

