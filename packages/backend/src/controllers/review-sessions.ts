import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '@/config/database'
import { reviewSessions, playbooks, type NewReviewSession } from '@/db/schema/index'
import { eq, desc, and } from 'drizzle-orm'

export const reviewSessionsController = {
  async list(c: Context) {
    const user = c.get('user')
    const page = Number.parseInt(c.req.query('page') || '1')
    const pageSize = Math.min(Number.parseInt(c.req.query('limit') || '10'), 50)
    const skip = (page - 1) * pageSize


    try {
      const sessions = await db
        .select({
          id: reviewSessions.id,
          documentName: reviewSessions.documentName,
          playbookId: reviewSessions.playbookId,
          playbookName: reviewSessions.playbookName,
          status: reviewSessions.status,
          resultsCount: reviewSessions.resultsCount,
          createdAt: reviewSessions.createdAt,
        })
        .from(reviewSessions)
        .where(eq(reviewSessions.userId, user.id))
        .orderBy(desc(reviewSessions.createdAt))
        .limit(pageSize)
        .offset(skip)

      const countResult = await db
        .select({ count: reviewSessions.id })
        .from(reviewSessions)
        .where(eq(reviewSessions.userId, user.id))

      return c.json({
        data: sessions,
        pagination: {
          page,
          limit: pageSize,
          total: countResult.length,
          hasMore: sessions.length === pageSize,
        },
      })
    } catch (error: any) {
      throw new HTTPException(500, {
        message: 'Failed to list review sessions',
        cause: error,
      })
    }
  },

  async get(c: Context) {
    const user = c.get('user')
    const sessionId = c.req.param('id')

    try {
      const [session] = await db
        .select()
        .from(reviewSessions)
        .where(and(eq(reviewSessions.id, sessionId), eq(reviewSessions.userId, user.id)))
        .limit(1)

      if (!session) {
        throw new HTTPException(404, { message: 'Review session not found' })
      }

      return c.json(session)
    } catch (error: any) {
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, {
        message: 'Failed to get review session',
        cause: error,
      })
    }
  },

  async create(c: Context) {
    const user = c.get('user')
    const body = await c.req.json()

    const {
      documentName,
      playbookId,
      playbookName,
      status = 'completed',
      resultsCount = 0,
      metadata,
    } = body

    if (!documentName) {
      throw new HTTPException(400, { message: 'documentName is required' })
    }

    try {
      const newSession: NewReviewSession = {
        userId: user.id,
        documentName,
        playbookId,
        playbookName,
        status,
        resultsCount,
        metadata,
      }

      const [created] = await db.insert(reviewSessions).values(newSession).returning()

      return c.json(created, 201)
    } catch (error: any) {
      throw new HTTPException(500, {
        message: 'Failed to create review session',
        cause: error,
      })
    }
  },

  async delete(c: Context) {
    const user = c.get('user')
    const sessionId = c.req.param('id')

    try {
      const [deleted] = await db
        .delete(reviewSessions)
        .where(and(eq(reviewSessions.id, sessionId), eq(reviewSessions.userId, user.id)))
        .returning()

      if (!deleted) {
        throw new HTTPException(404, { message: 'Review session not found' })
      }

      return c.json({ message: 'Review session deleted successfully' })
    } catch (error: any) {
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, {
        message: 'Failed to delete review session',
        cause: error,
      })
    }
  },

  async deleteMultiple(c: Context) {
    const user = c.get('user')
    const body = await c.req.json()
    const { sessionIds } = body


    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      throw new HTTPException(400, { message: 'sessionIds array is required' })
    }

    try {
      const result = await db
        .delete(reviewSessions)
        .where(
          and(eq(reviewSessions.userId, user.id))
        )
        .returning()


      return c.json({
        message: 'Review sessions deleted successfully',
        deletedCount: result.length,
      })
    } catch (error: any) {
      throw new HTTPException(500, {
        message: 'Failed to delete review sessions',
        cause: error,
      })
    }
  },
}

