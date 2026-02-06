import { db } from '@/config/database'
import { tags, type Tag, type NewTag } from '@/db/schema/library'
import { eq, and, or, sql, desc } from 'drizzle-orm'
import { logger } from '@/config/logger'

export class TagService {
  /**
   * Create a slug from a tag name
   */
  private createSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  /**
   * Build materialized path for hierarchical tags
   */
  private async buildPath(tagId: string, parentId: string | null, userId: string): Promise<string> {
    if (!parentId) {
      return tagId
    }

    const [parent] = await db
      .select({ path: tags.path })
      .from(tags)
      .where(and(eq(tags.id, parentId), eq(tags.userId, userId)))
      .limit(1)

    if (!parent) {
      throw new Error('Parent tag not found')
    }

    return `${parent.path}.${tagId}`
  }

  /**
   * Calculate level based on path depth
   */
  private calculateLevel(path: string): number {
    return path.split('.').length - 1
  }

  /**
   * Create a new tag
   */
  async createTag(userId: string, data: {
    name: string
    description?: string
    color?: string
    icon?: string
    parentId?: string | null
    scope?: 'all' | 'clauses' | 'projects' | 'playbooks'
  }): Promise<Tag> {
    const slug = this.createSlug(data.name)

    // Check if slug already exists for this user
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.userId, userId), eq(tags.slug, slug)))
      .limit(1)

    if (existing) {
      throw new Error(`Tag with slug "${slug}" already exists`)
    }

    // Validate parent if provided
    if (data.parentId) {
      const [parent] = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, data.parentId), eq(tags.userId, userId)))
        .limit(1)

      if (!parent) {
        throw new Error('Parent tag not found')
      }
    }

    const newTag: NewTag = {
      userId,
      name: data.name,
      slug,
      description: data.description,
      color: data.color || '#6B7280',
      icon: data.icon,
      parentId: data.parentId || null,
      path: '', // Will be set after insert
      level: 0, // Will be calculated
      scope: data.scope || 'all',
      isSystem: false,
    }

    const [inserted] = await db
      .insert(tags)
      .values(newTag)
      .returning()

    // Build path and update
    const path = await this.buildPath(inserted.id, inserted.parentId, userId)
    const level = this.calculateLevel(path)

    const [updated] = await db
      .update(tags)
      .set({ path, level })
      .where(eq(tags.id, inserted.id))
      .returning()

    logger.info({ userId, tagId: updated.id, name: updated.name }, 'Tag created')
    return updated
  }

  /**
   * Get tag by ID
   */
  async getTagById(userId: string, tagId: string): Promise<Tag | null> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
      .limit(1)

    return tag || null
  }

  /**
   * Get all tags for a user as a tree structure
   */
  async getTagTree(userId: string, scope?: 'all' | 'clauses' | 'projects' | 'playbooks'): Promise<Tag[]> {
    const conditions = [eq(tags.userId, userId)]
    if (scope && scope !== 'all') {
      conditions.push(or(eq(tags.scope, 'all'), eq(tags.scope, scope)))
    }

    const allTags = await db
      .select()
      .from(tags)
      .where(and(...conditions))
      .orderBy(tags.level, tags.name)

    return allTags
  }

  /**
   * Get children of a tag
   */
  async getTagChildren(userId: string, parentId: string): Promise<Tag[]> {
    const [parent] = await db
      .select({ path: tags.path })
      .from(tags)
      .where(and(eq(tags.id, parentId), eq(tags.userId, userId)))
      .limit(1)

    if (!parent) {
      return []
    }

    const children = await db
      .select()
      .from(tags)
      .where(
        and(
          eq(tags.userId, userId),
          sql`${tags.path} LIKE ${parent.path + '.%'}`
        )
      )
      .orderBy(tags.level, tags.name)

    return children
  }

  /**
   * Update a tag
   */
  async updateTag(
    userId: string,
    tagId: string,
    updates: {
      name?: string
      description?: string
      color?: string
      icon?: string
      parentId?: string | null
      scope?: 'all' | 'clauses' | 'projects' | 'playbooks'
    }
  ): Promise<Tag> {
    const [existing] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
      .limit(1)

    if (!existing) {
      throw new Error('Tag not found')
    }

    const updateData: Partial<Tag> = {
      updatedAt: new Date(),
    }

    if (updates.name !== undefined) {
      updateData.name = updates.name
      updateData.slug = this.createSlug(updates.name)
    }
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.color !== undefined) updateData.color = updates.color
    if (updates.icon !== undefined) updateData.icon = updates.icon
    if (updates.scope !== undefined) updateData.scope = updates.scope

    // Handle parent change
    if (updates.parentId !== undefined) {
      if (updates.parentId === tagId) {
        throw new Error('Tag cannot be its own parent')
      }

      // Check for circular reference
      if (updates.parentId) {
        const [parent] = await db
          .select({ path: tags.path })
          .from(tags)
          .where(and(eq(tags.id, updates.parentId), eq(tags.userId, userId)))
          .limit(1)

        if (!parent) {
          throw new Error('Parent tag not found')
        }

        if (parent.path.includes(tagId)) {
          throw new Error('Cannot create circular reference')
        }
      }

      updateData.parentId = updates.parentId
      const newPath = await this.buildPath(tagId, updates.parentId, userId)
      updateData.path = newPath
      updateData.level = this.calculateLevel(newPath)
    }

    const [updated] = await db
      .update(tags)
      .set(updateData)
      .where(eq(tags.id, tagId))
      .returning()

    // Update all children's paths if parent changed
    if (updates.parentId !== undefined) {
      const children = await this.getTagChildren(userId, tagId)
      for (const child of children) {
        const childPath = await this.buildPath(child.id, child.parentId, userId)
        const childLevel = this.calculateLevel(childPath)
        await db
          .update(tags)
          .set({ path: childPath, level: childLevel })
          .where(eq(tags.id, child.id))
      }
    }

    logger.info({ userId, tagId, updates }, 'Tag updated')
    return updated
  }

  /**
   * Delete a tag (and optionally its children)
   */
  async deleteTag(userId: string, tagId: string, deleteChildren: boolean = false): Promise<void> {
    const [tag] = await db
      .select()
      .from(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
      .limit(1)

    if (!tag) {
      throw new Error('Tag not found')
    }

    if (deleteChildren) {
      // Delete all children first
      const children = await this.getTagChildren(userId, tagId)
      for (const child of children) {
        await db.delete(tags).where(eq(tags.id, child.id))
      }
    } else {
      // Check if tag has children
      const children = await this.getTagChildren(userId, tagId)
      if (children.length > 0) {
        throw new Error('Tag has children. Set deleteChildren=true to delete recursively.')
      }
    }

    await db.delete(tags).where(eq(tags.id, tagId))
    logger.info({ userId, tagId }, 'Tag deleted')
  }

  /**
   * Search tags by name or path
   */
  async searchTags(userId: string, query: string, scope?: 'all' | 'clauses' | 'projects' | 'playbooks'): Promise<Tag[]> {
    const conditions = [
      eq(tags.userId, userId),
      or(
        sql`${tags.name} ILIKE ${'%' + query + '%'}`,
        sql`${tags.path} ILIKE ${'%' + query + '%'}`
      )
    ]

    if (scope && scope !== 'all') {
      conditions.push(or(eq(tags.scope, 'all'), eq(tags.scope, scope)))
    }

    const results = await db
      .select()
      .from(tags)
      .where(and(...conditions))
      .orderBy(tags.level, tags.name)
      .limit(50)

    return results
  }
}

export const tagService = new TagService()

