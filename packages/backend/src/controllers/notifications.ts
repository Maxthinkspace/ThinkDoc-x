import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '@/config/database'
import { notifications, type NewNotification } from '@/db/schema/index'
import { eq, and, desc, count, sql } from 'drizzle-orm'

interface AuthUser {
  id: string
  email: string
  name: string | null
}

export const notificationsController = {
  /**
   * Get all notifications for the authenticated user
   * Returns notifications with unread count
   */
  async list(c: Context) {
    const user = c.get('user') as AuthUser
    const page = Number.parseInt(c.req.query('page') || '1')
    const limit = Math.min(Number.parseInt(c.req.query('limit') || '50'), 100)
    const offset = (page - 1) * limit

    // Get unread count
    const [unreadCountResult] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false)
      ))

    const unreadCount = Number(unreadCountResult?.count ?? 0)

    // Get notifications
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset)

    return c.json({
      data: userNotifications,
      unreadCount,
      pagination: {
        page,
        limit,
        hasMore: userNotifications.length === limit,
      },
    })
  },

  /**
   * Mark a notification as read
   */
  async markAsRead(c: Context) {
    const user = c.get('user') as AuthUser
    const { id } = c.req.param()

    if (!id) {
      throw new HTTPException(400, { message: 'Notification ID is required' })
    }

    // Verify notification belongs to user
    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, user.id)
      ))
      .limit(1)

    if (!notification) {
      throw new HTTPException(404, { message: 'Notification not found' })
    }

    // Update notification
    const [updated] = await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id))
      .returning()

    return c.json({ data: updated })
  },

  /**
   * Mark all notifications as read for the authenticated user
   */
  async markAllAsRead(c: Context) {
    const user = c.get('user') as AuthUser

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(
        eq(notifications.userId, user.id),
        eq(notifications.isRead, false)
      ))

    return c.json({ message: 'All notifications marked as read' })
  },

  /**
   * Delete a notification
   */
  async delete(c: Context) {
    const user = c.get('user') as AuthUser
    const { id } = c.req.param()

    if (!id) {
      throw new HTTPException(400, { message: 'Notification ID is required' })
    }

    // Verify notification belongs to user
    const [notification] = await db
      .select()
      .from(notifications)
      .where(and(
        eq(notifications.id, id),
        eq(notifications.userId, user.id)
      ))
      .limit(1)

    if (!notification) {
      throw new HTTPException(404, { message: 'Notification not found' })
    }

    await db
      .delete(notifications)
      .where(eq(notifications.id, id))

    return c.json({ message: 'Notification deleted' })
  },
}

