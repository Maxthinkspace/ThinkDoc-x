import { Hono } from 'hono'
import { authMiddleware } from '@/middleware/auth'
import { reviewSessionsController } from '@/controllers/review-sessions'

const router = new Hono()


// Apply auth middleware to all routes
router.use('*', authMiddleware as any)

// List review sessions for current user
router.get('/', (c) => reviewSessionsController.list(c))

// Get a specific review session
router.get('/:id', (c) => reviewSessionsController.get(c))

// Create a new review session
router.post('/', (c) => reviewSessionsController.create(c))

// Delete a review session
router.delete('/:id', (c) => reviewSessionsController.delete(c))

// Delete multiple review sessions
router.post('/delete/multiple', (c) => reviewSessionsController.deleteMultiple(c))

export default router

