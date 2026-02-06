import * as React from 'react'
import { X, Check } from 'lucide-react'
import { useNotifications } from '../../contexts/NotificationContext'
import { NotificationItem } from './NotificationItem'
import './Notifications.css'

interface NotificationPanelProps {
  onClose: () => void
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, markAllAsRead } = useNotifications()

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
  }

  return (
    <div className="notification-panel-overlay" onClick={onClose}>
      <div className="notification-panel" onClick={(e) => e.stopPropagation()}>
        <div className="notification-panel-header">
          <h3>Notifications</h3>
          <div className="notification-panel-actions">
            {unreadCount > 0 && (
              <button
                className="notification-mark-all-read"
                onClick={handleMarkAllAsRead}
                title="Mark all as read"
              >
                <Check size={16} />
                Mark all read
              </button>
            )}
            <button
              className="notification-close"
              onClick={onClose}
              aria-label="Close notifications"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="notification-panel-content">
          {notifications.length === 0 ? (
            <div className="notification-empty">
              <p>No notifications</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <NotificationItem key={notification.id} notification={notification} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

