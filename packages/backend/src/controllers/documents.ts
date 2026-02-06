import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '@/config/database'
import { documents, type NewDocument } from '@/db/schema/index'
import { eq, and, desc } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

export const documentsController = {
  async list(c: Context) {
    const user = c.get('user')
    const page = Number.parseInt(c.req.query('page') || '1')
    const limit = Math.min(Number.parseInt(c.req.query('limit') || '10'), 50)
    const offset = (page - 1) * limit
    
    const docs = await db
      .select({
        id: documents.id,
        title: documents.title,
        metadata: documents.metadata,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
      })
      .from(documents)
      .where(and(
        eq(documents.userId, user.id),
        eq(documents.isActive, true)
      ))
      .orderBy(desc(documents.updatedAt))
      .limit(limit)
      .offset(offset)
    
    return c.json({
      data: docs,
      pagination: {
        page,
        limit,
        hasMore: docs.length === limit,
      },
    })
  },

  async get(c: Context) {
    const user = c.get('user')
    const { id } = c.req.param()

    if (!id) {
      throw new HTTPException(400, { message: 'Document ID is required' })
    }

    const [doc] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, id),
        eq(documents.userId, user.id),
        eq(documents.isActive, true)
      ))
      .limit(1)
    
    if (!doc) {
      throw new HTTPException(404, { message: 'Document not found' })
    }
    
    return c.json({ data: doc })
  },

  async create(c: Context) {
    const user = c.get('user')
    const { title, content, metadata } = await c.req.json()
    
    if (!title) {
      throw new HTTPException(400, { message: 'Title is required' })
    }
    
    const newDocument: NewDocument = {
      id: createId(),
      userId: user.id,
      title,
      content: content || '',
      metadata: metadata || {},
    }
    
    const [doc] = await db
      .insert(documents)
      .values(newDocument)
      .returning()
    
    return c.json({ data: doc }, 201)
  },

  async update(c: Context) {
    const user = c.get('user')
    const { id } = c.req.param()
    const { title, content, metadata } = await c.req.json()

    if (!id) {
      throw new HTTPException(400, { message: 'Document ID is required' })
    }
    
    const [doc] = await db
      .update(documents)
      .set({
        title,
        content,
        metadata,
        updatedAt: new Date(),
      })
      .where(and(
        eq(documents.id, id),
        eq(documents.userId, user.id),
        eq(documents.isActive, true)
      ))
      .returning()
    
    if (!doc) {
      throw new HTTPException(404, { message: 'Document not found' })
    }
    
    return c.json({ data: doc })
  },

  async delete(c: Context) {
    const user = c.get('user')
    const { id } = c.req.param()

    if (!id) {
      throw new HTTPException(400, { message: 'Document ID is required' })
    }
    
    const [doc] = await db
      .update(documents)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(
        eq(documents.id, id),
        eq(documents.userId, user.id),
        eq(documents.isActive, true)
      ))
      .returning({ id: documents.id })
    
    if (!doc) {
      throw new HTTPException(404, { message: 'Document not found' })
    }
    
    return c.json({ message: 'Document deleted successfully' })
  },
}