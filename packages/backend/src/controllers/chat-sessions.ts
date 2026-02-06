import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logger } from '@/config/logger'
import { chatSessionService } from '@/services/chat-sessions'

export const chatSessionsController = {
  /**
   * List user's chat sessions
   */
  async list(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const sessions = await chatSessionService.listUserSessions(user.id)
      return c.json({ data: sessions })
    } catch (error) {
      logger.error({ error }, 'Failed to list chat sessions')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch chat sessions' })
    }
  },

  /**
   * Create new chat session
   */
  async create(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const { title, sourceConfig } = body

      const session = await chatSessionService.createSession(user.id, { title, sourceConfig })

      return c.json({ data: session }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to create chat session')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to create chat session' })
    }
  },

  /**
   * Get chat session with messages
   */
  async get(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const session = await chatSessionService.getSession(id, user.id)

      if (!session) {
        throw new HTTPException(404, { message: 'Chat session not found' })
      }

      const messages = await chatSessionService.getSessionMessages(id)
      return c.json({ data: { ...session, messages } })
    } catch (error) {
      logger.error({ error }, 'Failed to get chat session')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch chat session' })
    }
  },

  /**
   * Update chat session
   */
  async update(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const { title } = body

      const session = await chatSessionService.updateSession(id, user.id, { title })
      return c.json({ data: session })
    } catch (error) {
      logger.error({ error }, 'Failed to update chat session')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to update chat session' })
    }
  },

  /**
   * Delete chat session
   */
  async delete(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      await chatSessionService.deleteSession(id, user.id)

      return c.json({ message: 'Chat session deleted successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to delete chat session')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to delete chat session' })
    }
  },

  /**
   * Add message to session
   */
  async addMessage(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const { role, content, citations } = body

      if (!role || !content) {
        throw new HTTPException(400, { message: 'role and content are required' })
      }

      if (!['user', 'assistant'].includes(role)) {
        throw new HTTPException(400, { message: 'role must be "user" or "assistant"' })
      }

      const message = await chatSessionService.addMessage(id, { role, content, citations })
      return c.json({ data: message }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to add message')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to add message' })
    }
  },

  /**
   * Generate share link
   */
  async generateShareLink(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const token = await chatSessionService.generateShareLink(id, user.id)

      return c.json({ data: { shareToken: token, shareUrl: `/shared/chat/${token}` } })
    } catch (error) {
      logger.error({ error }, 'Failed to generate share link')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to generate share link' })
    }
  },

  /**
   * Revoke share link
   */
  async revokeShareLink(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      await chatSessionService.revokeShareLink(id, user.id)

      return c.json({ message: 'Share link revoked successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to revoke share link')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to revoke share link' })
    }
  },

  /**
   * Get shared chat (public access)
   */
  async getShared(c: Context) {
    try {
      const { token } = c.req.param()
      const session = await chatSessionService.getSessionByShareToken(token)

      if (!session) {
        throw new HTTPException(404, { message: 'Shared chat not found' })
      }

      const messages = await chatSessionService.getSessionMessages(session.id)
      return c.json({ data: { ...session, messages } })
    } catch (error) {
      logger.error({ error }, 'Failed to get shared chat')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch shared chat' })
    }
  },
}

