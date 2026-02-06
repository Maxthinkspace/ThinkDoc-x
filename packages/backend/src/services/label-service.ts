import { db } from '@/config/database'
import { labels, type Label, type NewLabel } from '@/db/schema/library'
import { eq, and, sql } from 'drizzle-orm'
import { logger } from '@/config/logger'

export class LabelService {
  /**
   * Create a new label
   */
  async createLabel(userId: string, data: {
    name: string
    color?: string
    category: string
    sortOrder?: number
  }): Promise<Label> {
    // Check if label already exists for this user and category
    const [existing] = await db
      .select()
      .from(labels)
      .where(
        and(
          eq(labels.userId, userId),
          eq(labels.category, data.category),
          eq(labels.name, data.name)
        )
      )
      .limit(1)

    if (existing) {
      throw new Error(`Label "${data.name}" already exists in category "${data.category}"`)
    }

    const newLabel: NewLabel = {
      userId,
      name: data.name,
      color: data.color || '#6B7280',
      category: data.category,
      sortOrder: data.sortOrder || 0,
    }

    const [inserted] = await db
      .insert(labels)
      .values(newLabel)
      .returning()

    if (!inserted) {
      throw new Error('Failed to create label')
    }

    logger.info({ userId, labelId: inserted.id, name: inserted.name, category: inserted.category }, 'Label created')
    return inserted
  }

  /**
   * Get label by ID
   */
  async getLabelById(userId: string, labelId: string): Promise<Label | null> {
    const [label] = await db
      .select()
      .from(labels)
      .where(and(eq(labels.id, labelId), eq(labels.userId, userId)))
      .limit(1)

    return label || null
  }

  /**
   * Get all labels for a user, optionally filtered by category
   */
  async getLabels(userId: string, category?: string): Promise<Label[]> {
    const conditions = [eq(labels.userId, userId)]
    if (category) {
      conditions.push(eq(labels.category, category))
    }

    const allLabels = await db
      .select()
      .from(labels)
      .where(and(...conditions))
      .orderBy(labels.category, labels.sortOrder, labels.name)

    return allLabels
  }

  /**
   * Get labels grouped by category
   */
  async getLabelsByCategory(userId: string): Promise<Record<string, Label[]>> {
    const allLabels = await this.getLabels(userId)
    const grouped: Record<string, Label[]> = {}

    for (const label of allLabels) {
      const category = label.category
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(label)
    }

    return grouped
  }

  /**
   * Update a label
   */
  async updateLabel(
    userId: string,
    labelId: string,
    updates: {
      name?: string
      color?: string
      category?: string
      sortOrder?: number
    }
  ): Promise<Label> {
    const [existing] = await db
      .select()
      .from(labels)
      .where(and(eq(labels.id, labelId), eq(labels.userId, userId)))
      .limit(1)

    if (!existing) {
      throw new Error('Label not found')
    }

    // Check for duplicate if name or category is changing
    if (updates.name || updates.category) {
      const checkName = updates.name ?? existing.name
      const checkCategory = updates.category ?? existing.category

      const [duplicate] = await db
        .select()
        .from(labels)
        .where(
          and(
            eq(labels.userId, userId),
            eq(labels.category, checkCategory),
            eq(labels.name, checkName),
            sql`${labels.id} != ${labelId}`
          )
        )
        .limit(1)

      if (duplicate) {
        throw new Error(`Label "${checkName}" already exists in category "${checkCategory}"`)
      }
    }

    const updateData: Partial<Label> = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.category !== undefined) updateData.category = updates.category
    if (updates.sortOrder !== undefined) updateData.sortOrder = updates.sortOrder

    const [updated] = await db
      .update(labels)
      .set(updateData)
      .where(eq(labels.id, labelId))
      .returning()

    if (!updated) {
      throw new Error('Failed to update label')
    }

    logger.info({ userId, labelId, updates }, 'Label updated')
    return updated
  }

  /**
   * Delete a label
   */
  async deleteLabel(userId: string, labelId: string): Promise<void> {
    const [label] = await db
      .select()
      .from(labels)
      .where(and(eq(labels.id, labelId), eq(labels.userId, userId)))
      .limit(1)

    if (!label) {
      throw new Error('Label not found')
    }

    await db.delete(labels).where(eq(labels.id, labelId))
    logger.info({ userId, labelId }, 'Label deleted')
  }

  /**
   * Search labels
   */
  async searchLabels(userId: string, query: string, category?: string): Promise<Label[]> {
    const conditions = [
      eq(labels.userId, userId),
      sql`${labels.name} ILIKE ${'%' + query + '%'}`
    ]

    if (category) {
      conditions.push(eq(labels.category, category))
    }

    const results = await db
      .select()
      .from(labels)
      .where(and(...conditions))
      .orderBy(labels.category, labels.sortOrder, labels.name)
      .limit(50)

    return results
  }
}

export const labelService = new LabelService()

