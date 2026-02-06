import { Hono } from 'hono'
import { chatSessionsController } from '@/controllers/chat-sessions'
import { authMiddleware } from '@/middleware/auth'

const chatSessionsRoutes = new Hono()

// Public route for shared chats (no auth)
chatSessionsRoutes.get('/shared/chat/:token', chatSessionsController.getShared)

// Apply auth middleware to all other routes
chatSessionsRoutes.use('*', authMiddleware)

// Chat session routes
chatSessionsRoutes.get('/', chatSessionsController.list)
chatSessionsRoutes.post('/', chatSessionsController.create)
chatSessionsRoutes.get('/:id', chatSessionsController.get)
chatSessionsRoutes.patch('/:id', chatSessionsController.update)
chatSessionsRoutes.delete('/:id', chatSessionsController.delete)
chatSessionsRoutes.post('/:id/messages', chatSessionsController.addMessage)
chatSessionsRoutes.post('/:id/share', chatSessionsController.generateShareLink)
chatSessionsRoutes.delete('/:id/share', chatSessionsController.revokeShareLink)

export default chatSessionsRoutes

