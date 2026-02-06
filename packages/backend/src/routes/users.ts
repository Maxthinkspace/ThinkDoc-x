import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { usersController } from '@/controllers/users'
import { authMiddleware } from '@/middleware/auth'

const users = new Hono()

// Apply auth middleware to all routes
users.use(authMiddleware())

// Validation schemas
const querySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
})

// Routes for user-specific data
users.get('/me/playbooks', zValidator('query', querySchema), usersController.getUserPlaybooks)
users.get('/me/documents', zValidator('query', querySchema), usersController.getUserDocuments)
users.get('/me/playbook-shares', zValidator('query', querySchema), usersController.getUserPlaybookShares)
users.get('/me/stats', usersController.getUserStats)

export { users }