import { db } from '@/config/database'
import {
  chatSessions,
  chatMessages,
  type ChatSession,
  type NewChatSession,
  type ChatMessage,
  type NewChatMessage,
} from '@/db/schema/chat-sessions'
import { eq, desc, and } from 'drizzle-orm'
import { logger } from '@/config/logger'
import { randomBytes } from 'crypto'

export class ChatSessionService {
  /**
   * Create a new chat session
   */
  async createSession(
    userId: string,
    data: {
      title?: string
      sourceConfig?: Record<string, unknown>
    }
  ): Promise<ChatSession> {
    const [session] = await db
      .insert(chatSessions)
      .values({
        userId,
        title: data.title,
        sourceConfig: data.sourceConfig || null,
      })
      .returning()

    if (!session) {
      throw new Error('Failed to create chat session')
    }

    logger.info({ sessionId: session.id, userId }, 'Created chat session')
    return session
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string, userId?: string): Promise<ChatSession | null> {
    const conditions = [eq(chatSessions.id, sessionId)]
    
    // If userId provided, verify ownership unless public
    if (userId) {
      const [session] = await db
        .select()
        .from(chatSessions)
        .where(and(
          eq(chatSessions.id, sessionId),
          eq(chatSessions.userId, userId)
        ))
        .limit(1)
      
      return session || null
    }

    const [session] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1)

    return session || null
  }

  /**
   * Get session by share token (public access)
   */
  async getSessionByShareToken(token: string): Promise<ChatSession | null> {
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.shareToken, token),
        eq(chatSessions.isPublic, true)
      ))
      .limit(1)

    return session || null
  }

  /**
   * List user's chat sessions
   */
  async listUserSessions(userId: string): Promise<ChatSession[]> {
    return await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.userId, userId))
      .orderBy(desc(chatSessions.updatedAt))
  }

  /**
   * Update session title
   */
  async updateSession(
    sessionId: string,
    userId: string,
    data: { title?: string }
  ): Promise<ChatSession> {
    // Verify ownership
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, userId)
      ))
      .limit(1)

    if (!session) {
      throw new Error('Session not found or access denied')
    }

    const [updated] = await db
      .update(chatSessions)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update session')
    }

    return updated
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    // Verify ownership
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, userId)
      ))
      .limit(1)

    if (!session) {
      throw new Error('Session not found or access denied')
    }

    await db.delete(chatSessions).where(eq(chatSessions.id, sessionId))
    logger.info({ sessionId, userId }, 'Deleted chat session')
  }

  /**
   * Add message to session
   */
  async addMessage(
    sessionId: string,
    data: {
      role: 'user' | 'assistant'
      content: string
      citations?: Array<Record<string, unknown>>
    }
  ): Promise<ChatMessage> {
    // Verify session exists
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1)

    if (!session) {
      throw new Error('Session not found')
    }

    const [message] = await db
      .insert(chatMessages)
      .values({
        sessionId,
        role: data.role,
        content: data.content,
        citations: data.citations || null,
      })
      .returning()

    if (!message) {
      throw new Error('Failed to add message')
    }

    // Update session updatedAt
    await db
      .update(chatSessions)
      .set({ updatedAt: new Date() })
      .where(eq(chatSessions.id, sessionId))

    // Auto-generate title from first user message if not set
    if (!session.title && data.role === 'user') {
      const title = data.content.substring(0, 50).trim()
      await db
        .update(chatSessions)
        .set({ title })
        .where(eq(chatSessions.id, sessionId))
    }

    return message
  }

  /**
   * Get session messages
   */
  async getSessionMessages(sessionId: string): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt)
  }

  /**
   * Generate share link for session
   */
  async generateShareLink(sessionId: string, userId: string): Promise<string> {
    // Verify ownership
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, userId)
      ))
      .limit(1)

    if (!session) {
      throw new Error('Session not found or access denied')
    }

    // Generate unique token
    const token = randomBytes(32).toString('hex')

    const [updated] = await db
      .update(chatSessions)
      .set({
        shareToken: token,
        isPublic: true,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId))
      .returning()

    if (!updated) {
      throw new Error('Failed to generate share link')
    }

    logger.info({ sessionId, userId }, 'Generated share link for chat session')
    return token
  }

  /**
   * Revoke share link
   */
  async revokeShareLink(sessionId: string, userId: string): Promise<void> {
    // Verify ownership
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.id, sessionId),
        eq(chatSessions.userId, userId)
      ))
      .limit(1)

    if (!session) {
      throw new Error('Session not found or access denied')
    }

    await db
      .update(chatSessions)
      .set({
        shareToken: null,
        isPublic: false,
        updatedAt: new Date(),
      })
      .where(eq(chatSessions.id, sessionId))

    logger.info({ sessionId, userId }, 'Revoked share link')
  }
}

export const chatSessionService = new ChatSessionService()

