import type { Context } from 'hono'
import { db } from '@/config/database'
import {
  users,
  documents,
  playbooks,
  playbookShares,
} from '@/db/schema/index'
import { eq, and, desc, count, sql } from 'drizzle-orm'

interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const usersController = {
  async getUserPlaybooks(c: Context) {
    const user = c.get('user') as AuthUser
    const page = Number.parseInt(c.req.query('page') || '1')
    const limit = Math.min(Number.parseInt(c.req.query('limit') || '10'), 50)
    const offset = (page - 1) * limit

    const userPlaybooks = await db
      .select({
        id: playbooks.id,
        playbookName: playbooks.playbookName,
        description: playbooks.description,
        playbookType: playbooks.playbookType,
        userPosition: playbooks.userPosition,
        jurisdiction: playbooks.jurisdiction,
        tags: playbooks.tags,
        metadata: playbooks.metadata,
        createdAt: playbooks.createdAt,
        updatedAt: playbooks.updatedAt,
      })
      .from(playbooks)
      .where(and(
        eq(playbooks.userId, user.id),
        eq(playbooks.isActive, true)
      ))
      .orderBy(desc(playbooks.createdAt))
      .limit(limit)
      .offset(offset)

    return c.json({
      data: userPlaybooks,
      pagination: {
        page,
        limit,
        hasMore: userPlaybooks.length === limit,
      },
    })
  },

  async getUserDocuments(c: Context) {
    const user = c.get('user') as AuthUser
    const page = Number.parseInt(c.req.query('page') || '1')
    const limit = Math.min(Number.parseInt(c.req.query('limit') || '10'), 50)
    const offset = (page - 1) * limit

    const userDocuments = await db
      .select({
        id: documents.id,
        title: documents.title,
        content: documents.content,
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
      data: userDocuments,
      pagination: {
        page,
        limit,
        hasMore: userDocuments.length === limit,
      },
    })
  },

  async getUserPlaybookShares(c: Context) {
    const user = c.get('user') as AuthUser
    const page = Number.parseInt(c.req.query('page') || '1')
    const limit = Math.min(Number.parseInt(c.req.query('limit') || '10'), 50)
    const offset = (page - 1) * limit

    // Get playbooks shared WITH the user
    const sharedWithMe = await db
      .select({
        type: sql<string>`'received'`.as('type'),
        playbookId: playbooks.id,
        playbookName: playbooks.playbookName,
        description: playbooks.description,
        shareType: playbookShares.shareType,
        ownerEmail: users.email,
        ownerId: playbookShares.ownerId,
        sharedAt: playbookShares.createdAt,
      })
      .from(playbookShares)
      .innerJoin(playbooks, eq(playbookShares.playbookId, playbooks.id))
      .innerJoin(users, eq(playbookShares.ownerId, users.id))
      .where(and(
        eq(playbookShares.sharedWithUserId, user.id),
        eq(playbooks.isActive, true)
      ))
      .orderBy(desc(playbookShares.createdAt))
      .limit(limit)
      .offset(offset)

    // Get playbooks shared BY the user
    const sharedByMe = await db
      .select({
        type: sql<string>`'given'`.as('type'),
        playbookId: playbooks.id,
        playbookName: playbooks.playbookName,
        description: playbooks.description,
        shareType: playbookShares.shareType,
        sharedWithEmail: users.email,
        sharedWithUserId: playbookShares.sharedWithUserId,
        sharedAt: playbookShares.createdAt,
      })
      .from(playbookShares)
      .innerJoin(playbooks, eq(playbookShares.playbookId, playbooks.id))
      .innerJoin(users, eq(playbookShares.sharedWithUserId, users.id))
      .where(and(
        eq(playbookShares.ownerId, user.id),
        eq(playbooks.isActive, true)
      ))
      .orderBy(desc(playbookShares.createdAt))
      .limit(limit)
      .offset(offset)

    return c.json({
      data: {
        sharedWithMe,
        sharedByMe,
      },
      pagination: {
        page,
        limit,
        hasMore: Math.max(sharedWithMe.length, sharedByMe.length) === limit,
      },
    })
  },

  async getUserStats(c: Context) {
    const user = c.get('user') as AuthUser

    // Count playbooks owned by user
    const [playbookCount] = await db
      .select({ count: count() })
      .from(playbooks)
      .where(and(
        eq(playbooks.userId, user.id),
        eq(playbooks.isActive, true)
      ))

    // Count documents owned by user
    const [documentCount] = await db
      .select({ count: count() })
      .from(documents)
      .where(and(
        eq(documents.userId, user.id),
        eq(documents.isActive, true)
      ))

    // Count playbooks shared with user
    const [sharedWithMeCount] = await db
      .select({ count: count() })
      .from(playbookShares)
      .innerJoin(playbooks, eq(playbookShares.playbookId, playbooks.id))
      .where(and(
        eq(playbookShares.sharedWithUserId, user.id),
        eq(playbooks.isActive, true)
      ))

    // Count playbooks shared by user
    const [sharedByMeCount] = await db
      .select({ count: count() })
      .from(playbookShares)
      .innerJoin(playbooks, eq(playbookShares.playbookId, playbooks.id))
      .where(and(
        eq(playbookShares.ownerId, user.id),
        eq(playbooks.isActive, true)
      ))

    return c.json({
      data: {
        playbooks: Number(playbookCount?.count ?? 0),
        documents: Number(documentCount?.count ?? 0),
        playbookShares: {
          receivedShares: Number(sharedWithMeCount?.count ?? 0),
          givenShares: Number(sharedByMeCount?.count ?? 0),
          totalShares: Number(sharedWithMeCount?.count ?? 0) + Number(sharedByMeCount?.count ?? 0),
        },
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: user.createdAt,
        },
      },
    })
  },
}