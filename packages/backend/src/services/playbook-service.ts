import { db } from '@/config/database'
import {
  playbooksNew,
  playbookVersions,
  playbookRules,
  playbookTags,
  playbookLabels,
  tags,
  labels,
  type PlaybookNew,
  type NewPlaybookNew,
  type PlaybookVersion,
  type NewPlaybookVersion,
  type PlaybookRule,
  type NewPlaybookRule,
} from '@/db/schema/library'
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { logger } from '@/config/logger'

export interface PlaybookWithRules extends PlaybookNew {
  currentVersion?: PlaybookVersion
  rules?: PlaybookRule[]
  tags?: Array<{ id: string; name: string; slug: string }>
  labels?: Array<{ id: string; name: string; category: string }>
}

export interface RuleInput {
  ruleNumber: string
  ruleType: 'instruction_request' | 'amendment_always' | 'amendment_conditional'
  briefName: string
  instruction: string
  exampleLanguage?: string
  linkedClauseId?: string
  conditions?: Record<string, unknown>
  sourceAnnotationType?: string
  sourceAnnotationKey?: string
  sortOrder?: number
}

export class PlaybookService {
  /**
   * Create a new playbook with rules
   */
  async createPlaybook(
    userId: string,
    data: {
      name: string
      description?: string
      playbookType?: string
      userPosition?: string
      jurisdiction?: string
      documentTypes?: string[]
      visibility?: 'private' | 'shared' | 'public'
      rules?: RuleInput[]
      tagIds?: string[]
      labelIds?: string[]
      metadata?: Record<string, unknown>
    }
  ): Promise<PlaybookWithRules> {
    const newPlaybook: NewPlaybookNew = {
      userId,
      name: data.name,
      description: data.description,
      playbookType: data.playbookType,
      userPosition: data.userPosition,
      jurisdiction: data.jurisdiction,
      documentTypes: data.documentTypes || null,
      visibility: data.visibility || 'private',
      useCount: 0,
      ruleCount: data.rules?.length || 0,
      metadata: data.metadata || {},
      isActive: true,
    }

    const [inserted] = await db.insert(playbooksNew).values(newPlaybook).returning()

    // Create initial version with rules snapshot
    const rulesSnapshot = data.rules || []
    const newVersion: NewPlaybookVersion = {
      playbookId: inserted.id,
      versionNumber: 1,
      rulesSnapshot: rulesSnapshot as unknown as typeof playbookVersions.$inferInsert.rulesSnapshot,
      changeType: 'created',
      changeDescription: 'Initial version',
      changedBy: userId,
    }

    const [version] = await db.insert(playbookVersions).values(newVersion).returning()

    // Update playbook with current version
    await db
      .update(playbooksNew)
      .set({ currentVersionId: version.id })
      .where(eq(playbooksNew.id, inserted.id))

    // Create normalized rules
    if (data.rules && data.rules.length > 0) {
      const ruleRecords: NewPlaybookRule[] = data.rules.map((rule) => ({
        playbookId: inserted.id,
        ruleNumber: rule.ruleNumber,
        ruleType: rule.ruleType,
        briefName: rule.briefName,
        instruction: rule.instruction,
        exampleLanguage: rule.exampleLanguage,
        linkedClauseId: rule.linkedClauseId || null,
        conditions: rule.conditions || null,
        sourceAnnotationType: rule.sourceAnnotationType,
        sourceAnnotationKey: rule.sourceAnnotationKey,
        sortOrder: rule.sortOrder || 0,
        isActive: true,
      }))

      await db.insert(playbookRules).values(ruleRecords)
    }

    // Add tags if provided
    if (data.tagIds && data.tagIds.length > 0) {
      await db.insert(playbookTags).values(
        data.tagIds.map((tagId) => ({
          playbookId: inserted.id,
          tagId,
        }))
      )
    }

    // Add labels if provided
    if (data.labelIds && data.labelIds.length > 0) {
      await db.insert(playbookLabels).values(
        data.labelIds.map((labelId) => ({
          playbookId: inserted.id,
          labelId,
        }))
      )
    }

    logger.info({ userId, playbookId: inserted.id, name: inserted.name }, 'Playbook created')
    return this.getPlaybookById(userId, inserted.id)
  }

  /**
   * Get playbook by ID with rules
   */
  async getPlaybookById(userId: string, playbookId: string): Promise<PlaybookWithRules | null> {
    const [playbook] = await db
      .select()
      .from(playbooksNew)
      .where(
        and(eq(playbooksNew.id, playbookId), eq(playbooksNew.userId, userId), eq(playbooksNew.isActive, true))
      )
      .limit(1)

    if (!playbook) {
      return null
    }

    // Get current version
    let currentVersion: PlaybookVersion | undefined
    if (playbook.currentVersionId) {
      const [version] = await db
        .select()
        .from(playbookVersions)
        .where(eq(playbookVersions.id, playbook.currentVersionId))
        .limit(1)
      currentVersion = version
    }

    // Get rules
    const rules = await db
      .select()
      .from(playbookRules)
      .where(and(eq(playbookRules.playbookId, playbookId), eq(playbookRules.isActive, true)))
      .orderBy(playbookRules.sortOrder, playbookRules.ruleNumber)

    // Get tags
    const playbookTagRows = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(playbookTags)
      .innerJoin(tags, eq(playbookTags.tagId, tags.id))
      .where(eq(playbookTags.playbookId, playbookId))

    // Get labels
    const playbookLabelRows = await db
      .select({
        id: labels.id,
        name: labels.name,
        category: labels.category,
      })
      .from(playbookLabels)
      .innerJoin(labels, eq(playbookLabels.labelId, labels.id))
      .where(eq(playbookLabels.playbookId, playbookId))

    return {
      ...playbook,
      currentVersion,
      rules,
      tags: playbookTagRows,
      labels: playbookLabelRows,
    }
  }

  /**
   * List playbooks with filtering
   */
  async listPlaybooks(
    userId: string,
    options: {
      tagIds?: string[]
      labelIds?: string[]
      playbookType?: string
      jurisdiction?: string
      visibility?: 'private' | 'shared' | 'public'
      search?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ playbooks: PlaybookWithRules[]; total: number }> {
    const limit = options.limit || 20
    const offset = options.offset || 0

    const conditions = [eq(playbooksNew.userId, userId), eq(playbooksNew.isActive, true)]

    if (options.playbookType) {
      conditions.push(eq(playbooksNew.playbookType, options.playbookType))
    }
    if (options.jurisdiction) {
      conditions.push(eq(playbooksNew.jurisdiction, options.jurisdiction))
    }
    if (options.visibility) {
      conditions.push(eq(playbooksNew.visibility, options.visibility))
    }
    if (options.search) {
      conditions.push(sql`${playbooksNew.name} ILIKE ${'%' + options.search + '%'}`)
    }

    // Filter by tags
    if (options.tagIds && options.tagIds.length > 0) {
      const playbookIdsWithTags = await db
        .select({ playbookId: playbookTags.playbookId })
        .from(playbookTags)
        .where(inArray(playbookTags.tagId, options.tagIds))
        .groupBy(playbookTags.playbookId)

      const ids = playbookIdsWithTags.map((r) => r.playbookId)
      if (ids.length > 0) {
        conditions.push(inArray(playbooksNew.id, ids))
      } else {
        return { playbooks: [], total: 0 }
      }
    }

    // Filter by labels
    if (options.labelIds && options.labelIds.length > 0) {
      const playbookIdsWithLabels = await db
        .select({ playbookId: playbookLabels.playbookId })
        .from(playbookLabels)
        .where(inArray(playbookLabels.labelId, options.labelIds))
        .groupBy(playbookLabels.playbookId)

      const ids = playbookIdsWithLabels.map((r) => r.playbookId)
      if (ids.length > 0) {
        conditions.push(inArray(playbooksNew.id, ids))
      } else {
        return { playbooks: [], total: 0 }
      }
    }

    const allPlaybooks = await db
      .select()
      .from(playbooksNew)
      .where(and(...conditions))
      .orderBy(desc(playbooksNew.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(playbooksNew)
      .where(and(...conditions))

    // Fetch details for each playbook
    const playbooksWithDetails = await Promise.all(
      allPlaybooks.map(async (playbook) => {
        return this.getPlaybookById(userId, playbook.id)
      })
    )

    return {
      playbooks: playbooksWithDetails.filter((p): p is PlaybookWithRules => p !== null),
      total: Number(count),
    }
  }

  /**
   * Update playbook rules and create new version
   */
  async updateRules(
    userId: string,
    playbookId: string,
    rules: RuleInput[],
    changeDescription?: string
  ): Promise<PlaybookVersion> {
    const playbook = await this.getPlaybookById(userId, playbookId)
    if (!playbook) {
      throw new Error('Playbook not found')
    }

    // Soft delete existing rules
    await db
      .update(playbookRules)
      .set({ isActive: false })
      .where(eq(playbookRules.playbookId, playbookId))

    // Create new rules
    if (rules.length > 0) {
      const ruleRecords: NewPlaybookRule[] = rules.map((rule) => ({
        playbookId,
        ruleNumber: rule.ruleNumber,
        ruleType: rule.ruleType,
        briefName: rule.briefName,
        instruction: rule.instruction,
        exampleLanguage: rule.exampleLanguage,
        linkedClauseId: rule.linkedClauseId || null,
        conditions: rule.conditions || null,
        sourceAnnotationType: rule.sourceAnnotationType,
        sourceAnnotationKey: rule.sourceAnnotationKey,
        sortOrder: rule.sortOrder || 0,
        isActive: true,
      }))

      await db.insert(playbookRules).values(ruleRecords)
    }

    // Create new version
    const currentVersion = playbook.currentVersion
    const nextVersionNumber = currentVersion ? currentVersion.versionNumber + 1 : 1

    const newVersion: NewPlaybookVersion = {
      playbookId,
      versionNumber: nextVersionNumber,
      previousVersionId: currentVersion?.id || null,
      rulesSnapshot: rules as unknown as typeof playbookVersions.$inferInsert.rulesSnapshot,
      changeType: 'rules_modified',
      changeDescription: changeDescription || `Updated rules`,
      changedBy: userId,
    }

    const [version] = await db.insert(playbookVersions).values(newVersion).returning()

    // Update playbook
    await db
      .update(playbooksNew)
      .set({
        currentVersionId: version.id,
        ruleCount: rules.length,
        updatedAt: new Date(),
      })
      .where(eq(playbooksNew.id, playbookId))

    logger.info({ userId, playbookId, versionNumber: nextVersionNumber }, 'Playbook rules updated')
    return version
  }

  /**
   * Link a rule to a clause
   */
  async linkRuleToClause(
    userId: string,
    playbookId: string,
    ruleId: string,
    clauseId: string
  ): Promise<PlaybookRule> {
    const playbook = await this.getPlaybookById(userId, playbookId)
    if (!playbook) {
      throw new Error('Playbook not found')
    }

    const [rule] = await db
      .select()
      .from(playbookRules)
      .where(and(eq(playbookRules.id, ruleId), eq(playbookRules.playbookId, playbookId)))
      .limit(1)

    if (!rule) {
      throw new Error('Rule not found')
    }

    const [updated] = await db
      .update(playbookRules)
      .set({ linkedClauseId: clauseId })
      .where(eq(playbookRules.id, ruleId))
      .returning()

    logger.info({ userId, playbookId, ruleId, clauseId }, 'Rule linked to clause')
    return updated
  }

  /**
   * Get version history for a playbook
   */
  async getVersionHistory(userId: string, playbookId: string): Promise<PlaybookVersion[]> {
    const playbook = await this.getPlaybookById(userId, playbookId)
    if (!playbook) {
      throw new Error('Playbook not found')
    }

    const versions = await db
      .select()
      .from(playbookVersions)
      .where(eq(playbookVersions.playbookId, playbookId))
      .orderBy(desc(playbookVersions.versionNumber))

    return versions
  }

  /**
   * Restore playbook to a specific version
   */
  async restoreVersion(userId: string, playbookId: string, versionId: string): Promise<PlaybookVersion> {
    const playbook = await this.getPlaybookById(userId, playbookId)
    if (!playbook) {
      throw new Error('Playbook not found')
    }

    const [targetVersion] = await db
      .select()
      .from(playbookVersions)
      .where(and(eq(playbookVersions.id, versionId), eq(playbookVersions.playbookId, playbookId)))
      .limit(1)

    if (!targetVersion) {
      throw new Error('Version not found')
    }

    // Restore rules from snapshot
    const rulesSnapshot = targetVersion.rulesSnapshot as unknown as RuleInput[]
    await this.updateRules(userId, playbookId, rulesSnapshot, `Restored from version ${targetVersion.versionNumber}`)

    const [restoredVersion] = await db
      .select()
      .from(playbookVersions)
      .where(eq(playbookVersions.playbookId, playbookId))
      .orderBy(desc(playbookVersions.versionNumber))
      .limit(1)

    return restoredVersion!
  }

  /**
   * Update playbook metadata
   */
  async updatePlaybook(
    userId: string,
    playbookId: string,
    updates: {
      name?: string
      description?: string
      playbookType?: string
      userPosition?: string
      jurisdiction?: string
      documentTypes?: string[]
      visibility?: 'private' | 'shared' | 'public'
      tagIds?: string[]
      labelIds?: string[]
      metadata?: Record<string, unknown>
    }
  ): Promise<PlaybookWithRules> {
    const playbook = await this.getPlaybookById(userId, playbookId)
    if (!playbook) {
      throw new Error('Playbook not found')
    }

    const updateData: Partial<PlaybookNew> = {
      updatedAt: new Date(),
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.playbookType !== undefined) updateData.playbookType = updates.playbookType
    if (updates.userPosition !== undefined) updateData.userPosition = updates.userPosition
    if (updates.jurisdiction !== undefined) updateData.jurisdiction = updates.jurisdiction
    if (updates.documentTypes !== undefined) updateData.documentTypes = updates.documentTypes as unknown as typeof playbooksNew.$inferInsert.documentTypes
    if (updates.visibility !== undefined) updateData.visibility = updates.visibility
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata

    await db.update(playbooksNew).set(updateData).where(eq(playbooksNew.id, playbookId))

    // Update tags
    if (updates.tagIds !== undefined) {
      await db.delete(playbookTags).where(eq(playbookTags.playbookId, playbookId))
      if (updates.tagIds.length > 0) {
        await db.insert(playbookTags).values(
          updates.tagIds.map((tagId) => ({
            playbookId,
            tagId,
          }))
        )
      }
    }

    // Update labels
    if (updates.labelIds !== undefined) {
      await db.delete(playbookLabels).where(eq(playbookLabels.playbookId, playbookId))
      if (updates.labelIds.length > 0) {
        await db.insert(playbookLabels).values(
          updates.labelIds.map((labelId) => ({
            playbookId,
            labelId,
          }))
        )
      }
    }

    logger.info({ userId, playbookId, updates }, 'Playbook updated')
    return this.getPlaybookById(userId, playbookId)
  }

  /**
   * Delete playbook (soft delete)
   */
  async deletePlaybook(userId: string, playbookId: string): Promise<void> {
    const playbook = await this.getPlaybookById(userId, playbookId)
    if (!playbook) {
      throw new Error('Playbook not found')
    }

    await db
      .update(playbooksNew)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(playbooksNew.id, playbookId))
    logger.info({ userId, playbookId }, 'Playbook deleted')
  }

  /**
   * Increment usage count
   */
  async recordUsage(userId: string, playbookId: string): Promise<void> {
    await db
      .update(playbooksNew)
      .set({
        useCount: sql`${playbooksNew.useCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(playbooksNew.id, playbookId))
  }
}

export const playbookService = new PlaybookService()

