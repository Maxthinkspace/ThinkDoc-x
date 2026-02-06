import * as React from 'react'
import { X } from 'lucide-react'
import { useNotifications, type Notification } from '../../contexts/NotificationContext'
import './Notifications.css'

interface NotificationItemProps {
  notification: Notification
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications()

  const handleClick = async () => {
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteNotification(notification.id)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div
      className={`notification-item ${notification.isRead ? 'read' : 'unread'}`}
      onClick={handleClick}
    >
      <div className="notification-item-content">
        <div className="notification-item-header">
          <h4 className="notification-title">{notification.title}</h4>
          {!notification.isRead && <span className="notification-dot" />}
        </div>
        <p className="notification-message">{notification.message}</p>
        <span className="notification-time">{formatDate(notification.createdAt)}</span>
      </div>
      <button
        className="notification-item-delete"
        onClick={handleDelete}
        aria-label="Delete notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}

