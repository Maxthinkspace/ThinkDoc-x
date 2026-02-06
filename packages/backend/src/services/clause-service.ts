import { db } from '@/config/database'
import {
  clauses,
  clauseVersions,
  clauseTags,
  clauseLabels,
  tags,
  labels,
  type Clause,
  type NewClause,
  type ClauseVersion,
  type NewClauseVersion,
} from '@/db/schema/library'
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { logger } from '@/config/logger'

export interface ClauseWithVersion extends Clause {
  currentVersion?: ClauseVersion
  tags?: Array<{ id: string; name: string; slug: string }>
  labels?: Array<{ id: string; name: string; category: string }>
}

export class ClauseService {
  /**
   * Create a new clause with initial version
   */
  async createClause(
    userId: string,
    data: {
      name: string
      description?: string
      text: string
      clauseType?: string
      jurisdiction?: string
      language?: string
      sourceType?: string
      sourceDocumentName?: string
      sourcePlaybookId?: string
      sourceRuleId?: string
      visibility?: 'private' | 'shared' | 'public'
      tagIds?: string[]
      labelIds?: string[]
      metadata?: Record<string, unknown>
    }
  ): Promise<ClauseWithVersion> {
    // Create clause record
    const newClause: NewClause = {
      userId,
      name: data.name,
      description: data.description,
      clauseType: data.clauseType,
      jurisdiction: data.jurisdiction,
      language: data.language || 'en',
      sourceType: data.sourceType || 'manual',
      sourceDocumentName: data.sourceDocumentName,
      sourcePlaybookId: data.sourcePlaybookId || null,
      sourceRuleId: data.sourceRuleId,
      visibility: data.visibility || 'private',
      useCount: 0,
      metadata: data.metadata || {},
      isActive: true,
    }

    const [insertedClause] = await db.insert(clauses).values(newClause).returning()

    // Create initial version
    const newVersion: NewClauseVersion = {
      clauseId: insertedClause.id,
      versionNumber: 1,
      text: data.text,
      changeType: 'created',
      changeDescription: 'Initial version',
      changedBy: userId,
    }

    const [version] = await db.insert(clauseVersions).values(newVersion).returning()

    // Update clause with current version
    await db
      .update(clauses)
      .set({ currentVersionId: version.id })
      .where(eq(clauses.id, insertedClause.id))

    // Add tags if provided
    if (data.tagIds && data.tagIds.length > 0) {
      await db.insert(clauseTags).values(
        data.tagIds.map((tagId) => ({
          clauseId: insertedClause.id,
          tagId,
        }))
      )
    }

    // Add labels if provided
    if (data.labelIds && data.labelIds.length > 0) {
      await db.insert(clauseLabels).values(
        data.labelIds.map((labelId) => ({
          clauseId: insertedClause.id,
          labelId,
        }))
      )
    }

    logger.info({ userId, clauseId: insertedClause.id, name: insertedClause.name }, 'Clause created')

    return this.getClauseById(userId, insertedClause.id)
  }

  /**
   * Get clause by ID with current version
   */
  async getClauseById(userId: string, clauseId: string): Promise<ClauseWithVersion | null> {
    const [clause] = await db
      .select()
      .from(clauses)
      .where(and(eq(clauses.id, clauseId), eq(clauses.userId, userId), eq(clauses.isActive, true)))
      .limit(1)

    if (!clause) {
      return null
    }

    // Get current version
    let currentVersion: ClauseVersion | undefined
    if (clause.currentVersionId) {
      const [version] = await db
        .select()
        .from(clauseVersions)
        .where(eq(clauseVersions.id, clause.currentVersionId))
        .limit(1)
      currentVersion = version
    }

    // Get tags
    const clauseTagRows = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(clauseTags)
      .innerJoin(tags, eq(clauseTags.tagId, tags.id))
      .where(eq(clauseTags.clauseId, clauseId))

    // Get labels
    const clauseLabelRows = await db
      .select({
        id: labels.id,
        name: labels.name,
        category: labels.category,
      })
      .from(clauseLabels)
      .innerJoin(labels, eq(clauseLabels.labelId, labels.id))
      .where(eq(clauseLabels.clauseId, clauseId))

    return {
      ...clause,
      currentVersion,
      tags: clauseTagRows,
      labels: clauseLabelRows,
    }
  }

  /**
   * List clauses with filtering
   */
  async listClauses(
    userId: string,
    options: {
      tagIds?: string[]
      labelIds?: string[]
      clauseType?: string
      jurisdiction?: string
      visibility?: 'private' | 'shared' | 'public'
      search?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ clauses: ClauseWithVersion[]; total: number }> {
    const limit = options.limit || 20
    const offset = options.offset || 0

    const conditions = [eq(clauses.userId, userId), eq(clauses.isActive, true)]

    if (options.clauseType) {
      conditions.push(eq(clauses.clauseType, options.clauseType))
    }
    if (options.jurisdiction) {
      conditions.push(eq(clauses.jurisdiction, options.jurisdiction))
    }
    if (options.visibility) {
      conditions.push(eq(clauses.visibility, options.visibility))
    }
    if (options.search) {
      conditions.push(sql`${clauses.name} ILIKE ${'%' + options.search + '%'}`)
    }

    // Filter by tags
    if (options.tagIds && options.tagIds.length > 0) {
      const clauseIdsWithTags = await db
        .select({ clauseId: clauseTags.clauseId })
        .from(clauseTags)
        .where(inArray(clauseTags.tagId, options.tagIds))
        .groupBy(clauseTags.clauseId)

      const ids = clauseIdsWithTags.map((r) => r.clauseId)
      if (ids.length > 0) {
        conditions.push(inArray(clauses.id, ids))
      } else {
        // No clauses match tags, return empty
        return { clauses: [], total: 0 }
      }
    }

    // Filter by labels
    if (options.labelIds && options.labelIds.length > 0) {
      const clauseIdsWithLabels = await db
        .select({ clauseId: clauseLabels.clauseId })
        .from(clauseLabels)
        .where(inArray(clauseLabels.labelId, options.labelIds))
        .groupBy(clauseLabels.clauseId)

      const ids = clauseIdsWithLabels.map((r) => r.clauseId)
      if (ids.length > 0) {
        conditions.push(inArray(clauses.id, ids))
      } else {
        return { clauses: [], total: 0 }
      }
    }

    const allClauses = await db
      .select()
      .from(clauses)
      .where(and(...conditions))
      .orderBy(desc(clauses.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(clauses)
      .where(and(...conditions))

    // Fetch versions and tags/labels for each clause
    const clausesWithDetails = await Promise.all(
      allClauses.map(async (clause) => {
        return this.getClauseById(userId, clause.id)
      })
    )

    return {
      clauses: clausesWithDetails.filter((c): c is ClauseWithVersion => c !== null),
      total: Number(count),
    }
  }

  /**
   * Create a new version of a clause
   */
  async createVersion(
    userId: string,
    clauseId: string,
    data: {
      text: string
      changeDescription?: string
      changeType?: 'edited' | 'restored' | 'merged'
    }
  ): Promise<ClauseVersion> {
    const clause = await this.getClauseById(userId, clauseId)
    if (!clause) {
      throw new Error('Clause not found')
    }

    const currentVersion = clause.currentVersion
    if (!currentVersion) {
      throw new Error('Clause has no current version')
    }

    const nextVersionNumber = currentVersion.versionNumber + 1

    const newVersion: NewClauseVersion = {
      clauseId,
      versionNumber: nextVersionNumber,
      previousVersionId: currentVersion.id,
      text: data.text,
      changeType: data.changeType || 'edited',
      changeDescription: data.changeDescription,
      changedBy: userId,
    }

    const [version] = await db.insert(clauseVersions).values(newVersion).returning()

    // Update clause with new current version
    await db.update(clauses).set({ currentVersionId: version.id }).where(eq(clauses.id, clauseId))

    logger.info({ userId, clauseId, versionNumber: nextVersionNumber }, 'Clause version created')
    return version
  }

  /**
   * Get version history for a clause
   */
  async getVersionHistory(userId: string, clauseId: string): Promise<ClauseVersion[]> {
    const clause = await this.getClauseById(userId, clauseId)
    if (!clause) {
      throw new Error('Clause not found')
    }

    const versions = await db
      .select()
      .from(clauseVersions)
      .where(eq(clauseVersions.clauseId, clauseId))
      .orderBy(desc(clauseVersions.versionNumber))

    return versions
  }

  /**
   * Restore clause to a specific version
   */
  async restoreVersion(userId: string, clauseId: string, versionId: string): Promise<ClauseVersion> {
    const clause = await this.getClauseById(userId, clauseId)
    if (!clause) {
      throw new Error('Clause not found')
    }

    const [targetVersion] = await db
      .select()
      .from(clauseVersions)
      .where(and(eq(clauseVersions.id, versionId), eq(clauseVersions.clauseId, clauseId)))
      .limit(1)

    if (!targetVersion) {
      throw new Error('Version not found')
    }

    // Create new version with restored text
    return this.createVersion(userId, clauseId, {
      text: targetVersion.text,
      changeDescription: `Restored from version ${targetVersion.versionNumber}`,
      changeType: 'restored',
    })
  }

  /**
   * Update clause metadata
   */
  async updateClause(
    userId: string,
    clauseId: string,
    updates: {
      name?: string
      description?: string
      clauseType?: string
      jurisdiction?: string
      visibility?: 'private' | 'shared' | 'public'
      tagIds?: string[]
      labelIds?: string[]
      metadata?: Record<string, unknown>
    }
  ): Promise<ClauseWithVersion> {
    const clause = await this.getClauseById(userId, clauseId)
    if (!clause) {
      throw new Error('Clause not found')
    }

    const updateData: Partial<Clause> = {
      updatedAt: new Date(),
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.clauseType !== undefined) updateData.clauseType = updates.clauseType
    if (updates.jurisdiction !== undefined) updateData.jurisdiction = updates.jurisdiction
    if (updates.visibility !== undefined) updateData.visibility = updates.visibility
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata

    await db.update(clauses).set(updateData).where(eq(clauses.id, clauseId))

    // Update tags
    if (updates.tagIds !== undefined) {
      await db.delete(clauseTags).where(eq(clauseTags.clauseId, clauseId))
      if (updates.tagIds.length > 0) {
        await db.insert(clauseTags).values(
          updates.tagIds.map((tagId) => ({
            clauseId,
            tagId,
          }))
        )
      }
    }

    // Update labels
    if (updates.labelIds !== undefined) {
      await db.delete(clauseLabels).where(eq(clauseLabels.clauseId, clauseId))
      if (updates.labelIds.length > 0) {
        await db.insert(clauseLabels).values(
          updates.labelIds.map((labelId) => ({
            clauseId,
            labelId,
          }))
        )
      }
    }

    logger.info({ userId, clauseId, updates }, 'Clause updated')
    return this.getClauseById(userId, clauseId)
  }

  /**
   * Delete clause (soft delete)
   */
  async deleteClause(userId: string, clauseId: string): Promise<void> {
    const clause = await this.getClauseById(userId, clauseId)
    if (!clause) {
      throw new Error('Clause not found')
    }

    await db.update(clauses).set({ isActive: false, updatedAt: new Date() }).where(eq(clauses.id, clauseId))
    logger.info({ userId, clauseId }, 'Clause deleted')
  }

  /**
   * Increment usage count
   */
  async recordUsage(userId: string, clauseId: string): Promise<void> {
    await db
      .update(clauses)
      .set({
        useCount: sql`${clauses.useCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(clauses.id, clauseId))
  }
}

export const clauseService = new ClauseService()

