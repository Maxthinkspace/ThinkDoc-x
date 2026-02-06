import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { notificationsController } from '@/controllers/notifications'
import { authMiddleware } from '@/middleware/auth'

const notifications = new Hono()

// Apply auth middleware to all routes
notifications.use(authMiddleware())

// Validation schemas
const querySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
})

// Routes
notifications.get('/', zValidator('query', querySchema), notificationsController.list)
notifications.patch('/:id/read', notificationsController.markAsRead)
notifications.patch('/read-all', notificationsController.markAllAsRead)
notifications.delete('/:id', notificationsController.delete)

export { notifications }

