import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { db } from '@/config/database'
import { playbooks, playbookShares, users, type NewPlaybook, type NewPlaybookShare } from '@/db/schema/index'
import { eq, and, desc, or } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { logger } from '@/config/logger'

export const playbooksController = {
  async list(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }
      const page = Number.parseInt(c.req.query('page') || '1')
      const limit = Math.min(Number.parseInt(c.req.query('limit') || '10'), 50)
      const offset = (page - 1) * limit

      const playbookList = await db
        .select({
          id: playbooks.id,
          playbookName: playbooks.playbookName,
          description: playbooks.description,
          playbookType: playbooks.playbookType,
          userPosition: playbooks.userPosition,
          jurisdiction: playbooks.jurisdiction,
          tags: playbooks.tags,
          rules: playbooks.rules,
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
        data: playbookList,
        pagination: {
          page,
          limit,
          hasMore: playbookList.length === limit,
        },
      })
    } catch (error) {
      logger.error({ error, userId: c.get('user')?.id }, 'Playbooks: Failed to list playbooks')
      if (error instanceof HTTPException) {
        throw error
      }
      throw new HTTPException(500, { message: error instanceof Error ? error.message : 'Failed to fetch playbooks' })
    }
  },

  async get(c: Context) {
    const user = c.get('user')
    if (!user?.id) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }
    const { id } = c.req.param()
    if (!id) {
      throw new HTTPException(400, { message: 'Playbook ID is required' })
    }

    const [playbook] = await db
      .select()
      .from(playbooks)
      .where(and(
        eq(playbooks.id, id),
        eq(playbooks.userId, user.id),
        eq(playbooks.isActive, true)
      ))
      .limit(1)

    if (!playbook) {
      throw new HTTPException(404, { message: 'Playbook not found' })
    }

    return c.json({ data: playbook })
  },

  async create(c: Context) {
    const user = c.get('user')
    if (!user?.id) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }
    const { playbookName, description, playbookType, userPosition, jurisdiction, tags, rules, metadata } = await c.req.json()

    if (!playbookName || !rules) {
      throw new HTTPException(400, { message: 'playbookName and rules are required' })
    }

    const newPlaybook: NewPlaybook = {
      id: uuidv4(),
      userId: user.id,
      playbookName,
      description: description || null,
      playbookType: playbookType || null,
      userPosition: userPosition || null,
      jurisdiction: jurisdiction || null,
      tags: tags || null,
      rules,
      metadata: metadata || {},
    }

    const [playbook] = await db
      .insert(playbooks)
      .values(newPlaybook)
      .returning()

    return c.json({ data: playbook }, 201)
  },

  async update(c: Context) {
    const user = c.get('user')
    if (!user?.id) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }
    const { id } = c.req.param()
    if (!id) {
      throw new HTTPException(400, { message: 'Playbook ID is required' })
    }
    const { playbookName, description, playbookType, userPosition, jurisdiction, tags, rules, metadata } = await c.req.json()

    const updateData: Partial<typeof playbooks.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (playbookName !== undefined) updateData.playbookName = playbookName
    if (description !== undefined) updateData.description = description
    if (playbookType !== undefined) updateData.playbookType = playbookType
    if (userPosition !== undefined) updateData.userPosition = userPosition
    if (jurisdiction !== undefined) updateData.jurisdiction = jurisdiction
    if (tags !== undefined) updateData.tags = tags
    if (rules !== undefined) updateData.rules = rules
    if (metadata !== undefined) updateData.metadata = metadata

    const [playbook] = await db
      .update(playbooks)
      .set(updateData)
      .where(and(
        eq(playbooks.id, id),
        eq(playbooks.userId, user.id),
        eq(playbooks.isActive, true)
      ))
      .returning()

    if (!playbook) {
      throw new HTTPException(404, { message: 'Playbook not found' })
    }

    return c.json({ data: playbook })
  },

  async delete(c: Context) {
    const user = c.get('user')
    if (!user?.id) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }
    const { id } = c.req.param()
    if (!id) {
      throw new HTTPException(400, { message: 'Playbook ID is required' })
    }

    const [playbook] = await db
      .update(playbooks)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(playbooks.id, id),
        eq(playbooks.userId, user.id),
        eq(playbooks.isActive, true)
      ))
      .returning({ id: playbooks.id })

    if (!playbook) {
      throw new HTTPException(404, { message: 'Playbook not found' })
    }

    return c.json({ message: 'Playbook deleted successfully' })
  },

  async share(c: Context) {
    const user = c.get('user')
    if (!user?.id) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }
    const { id } = c.req.param()
    if (!id) {
      throw new HTTPException(400, { message: 'Playbook ID is required' })
    }
    const { sharedWithEmail, shareType = 'view' } = await c.req.json()

    if (!sharedWithEmail) {
      throw new HTTPException(400, { message: 'sharedWithEmail is required' })
    }

    if (!['view', 'remix'].includes(shareType)) {
      throw new HTTPException(400, { message: 'shareType must be either "view" or "remix"' })
    }

    // Check if playbook exists and is owned by user
    const [playbook] = await db
      .select()
      .from(playbooks)
      .where(and(
        eq(playbooks.id, id),
        eq(playbooks.userId, user.id),
        eq(playbooks.isActive, true)
      ))
      .limit(1)

    if (!playbook) {
      throw new HTTPException(404, { message: 'Playbook not found' })
    }

    // Find the user to share with
    const [sharedWithUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, sharedWithEmail))
      .limit(1)

    if (!sharedWithUser) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    if (sharedWithUser.id === user.id) {
      throw new HTTPException(400, { message: 'Cannot share with yourself' })
    }

    // Check if already shared
    const [existingShare] = await db
      .select()
      .from(playbookShares)
      .where(and(
        eq(playbookShares.playbookId, id),
        eq(playbookShares.sharedWithUserId, sharedWithUser.id)
      ))
      .limit(1)

    if (existingShare) {
      throw new HTTPException(400, { message: 'Playbook already shared with this user' })
    }

    const newShare: NewPlaybookShare = {
      id: uuidv4(),
      playbookId: id as string,
      ownerId: user.id,
      sharedWithUserId: sharedWithUser.id,
      shareType,
    }

    const [share] = await db
      .insert(playbookShares)
      .values(newShare)
      .returning()

    return c.json({ data: share }, 201)
  },

  async sharedWithMe(c: Context) {
    const user = c.get('user')
    if (!user?.id) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }
    const page = Number.parseInt(c.req.query('page') || '1')
    const limit = Math.min(Number.parseInt(c.req.query('limit') || '10'), 50)
    const offset = (page - 1) * limit

    const sharedPlaybooks = await db
      .select({
        id: playbooks.id,
        playbookName: playbooks.playbookName,
        description: playbooks.description,
        playbookType: playbooks.playbookType,
        userPosition: playbooks.userPosition,
        jurisdiction: playbooks.jurisdiction,
        tags: playbooks.tags,
        rules: playbooks.rules,
        metadata: playbooks.metadata,
        createdAt: playbooks.createdAt,
        updatedAt: playbooks.updatedAt,
        shareType: playbookShares.shareType,
        ownerEmail: users.email,
        ownerId: playbookShares.ownerId,
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

    return c.json({
      data: sharedPlaybooks,
      pagination: {
        page,
        limit,
        hasMore: sharedPlaybooks.length === limit,
      },
    })
  },

  async remix(c: Context) {
    const user = c.get('user')
    if (!user?.id) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }
    const { id } = c.req.param()
    if (!id) {
      throw new HTTPException(400, { message: 'Playbook ID is required' })
    }
    const { playbookName, description } = await c.req.json()

    if (!playbookName) {
      throw new HTTPException(400, { message: 'playbookName is required for remix' })
    }

    // Check if user has access to this playbook (either owns it or has remix permission)
    const playbook = await db
      .select({
        playbook: playbooks,
        share: playbookShares,
      })
      .from(playbooks)
      .leftJoin(playbookShares, and(
        eq(playbookShares.playbookId, playbooks.id),
        eq(playbookShares.sharedWithUserId, user.id)
      ))
      .where(and(
        eq(playbooks.id, id),
        eq(playbooks.isActive, true),
        or(
          eq(playbooks.userId, user.id), // User owns the playbook
          and(
            eq(playbookShares.sharedWithUserId, user.id),
            eq(playbookShares.shareType, 'remix')
          ) // User has remix permission
        )
      ))
      .limit(1)

    const originalPlaybook = playbook[0]?.playbook

    if (!originalPlaybook) {
      throw new HTTPException(404, { message: 'Playbook not found or no remix permission' })
    }

    // Create remix as a new playbook
    const remixMetadata = {
      ...(originalPlaybook.metadata && typeof originalPlaybook.metadata === 'object' ? originalPlaybook.metadata : {}),
      originalPlaybookId: originalPlaybook.id,
      isRemix: true,
      remixedAt: new Date().toISOString(),
    }

    const newPlaybook: NewPlaybook = {
      id: uuidv4(),
      userId: user.id,
      playbookName,
      description: description || originalPlaybook.description,
      playbookType: originalPlaybook.playbookType,
      userPosition: originalPlaybook.userPosition,
      jurisdiction: originalPlaybook.jurisdiction,
      tags: originalPlaybook.tags,
      rules: originalPlaybook.rules, // Copy rules exactly
      metadata: remixMetadata,
    }

    const [remixedPlaybook] = await db
      .insert(playbooks)
      .values(newPlaybook)
      .returning()

    return c.json({ data: remixedPlaybook }, 201)
  },

  async unshare(c: Context) {
    const user = c.get('user')
    if (!user?.id) {
      throw new HTTPException(401, { message: 'Authentication required' })
    }
    const { id } = c.req.param()
    if (!id) {
      throw new HTTPException(400, { message: 'Playbook ID is required' })
    }
    const { sharedWithEmail } = await c.req.json()

    if (!sharedWithEmail) {
      throw new HTTPException(400, { message: 'sharedWithEmail is required' })
    }

    // Find the user to unshare with
    const [sharedWithUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, sharedWithEmail))
      .limit(1)

    if (!sharedWithUser) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    const [deletedShare] = await db
      .delete(playbookShares)
      .where(and(
        eq(playbookShares.playbookId, id as string),
        eq(playbookShares.ownerId, user.id),
        eq(playbookShares.sharedWithUserId, sharedWithUser.id)
      ))
      .returning({ id: playbookShares.id })

    if (!deletedShare) {
      throw new HTTPException(404, { message: 'Share not found' })
    }

    return c.json({ message: 'Playbook unshared successfully' })
  },
}