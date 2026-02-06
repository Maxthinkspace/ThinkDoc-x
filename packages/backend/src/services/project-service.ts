import { db } from '@/config/database'
import {
  projects,
  projectFiles,
  projectItems,
  projectTags,
  projectLabels,
  tags,
  labels,
  type Project,
  type NewProject,
  type ProjectFile,
  type NewProjectFile,
  type ProjectItem,
  type NewProjectItem,
} from '@/db/schema/library'
import { eq, and, desc, inArray, sql } from 'drizzle-orm'
import { logger } from '@/config/logger'

export interface ProjectWithItems extends Project {
  items?: ProjectItem[]
  files?: ProjectFile[]
  tags?: Array<{ id: string; name: string; slug: string }>
  labels?: Array<{ id: string; name: string; category: string }>
}

export class ProjectService {
  /**
   * Create a new project
   */
  async createProject(
    userId: string,
    data: {
      name: string
      description?: string
      projectType?: string
      status?: string
      visibility?: 'private' | 'shared' | 'public'
      tagIds?: string[]
      labelIds?: string[]
      metadata?: Record<string, unknown>
    }
  ): Promise<ProjectWithItems> {
    const newProject: NewProject = {
      userId,
      name: data.name,
      description: data.description,
      projectType: data.projectType,
      status: data.status || 'active',
      visibility: data.visibility || 'private',
      itemCount: 0,
      metadata: data.metadata || {},
      isActive: true,
    }

    const [inserted] = await db.insert(projects).values(newProject).returning()

    // Add tags if provided
    if (data.tagIds && data.tagIds.length > 0) {
      await db.insert(projectTags).values(
        data.tagIds.map((tagId) => ({
          projectId: inserted.id,
          tagId,
        }))
      )
    }

    // Add labels if provided
    if (data.labelIds && data.labelIds.length > 0) {
      await db.insert(projectLabels).values(
        data.labelIds.map((labelId) => ({
          projectId: inserted.id,
          labelId,
        }))
      )
    }

    logger.info({ userId, projectId: inserted.id, name: inserted.name }, 'Project created')
    return this.getProjectById(userId, inserted.id)
  }

  /**
   * Get project by ID with items
   */
  async getProjectById(userId: string, projectId: string): Promise<ProjectWithItems | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId), eq(projects.isActive, true)))
      .limit(1)

    if (!project) {
      return null
    }

    // Get items
    const items = await db
      .select()
      .from(projectItems)
      .where(eq(projectItems.projectId, projectId))
      .orderBy(projectItems.sortOrder, projectItems.createdAt)

    // Get files
    const files = await db.select().from(projectFiles).where(eq(projectFiles.projectId, projectId))

    // Get tags
    const projectTagRows = await db
      .select({
        id: tags.id,
        name: tags.name,
        slug: tags.slug,
      })
      .from(projectTags)
      .innerJoin(tags, eq(projectTags.tagId, tags.id))
      .where(eq(projectTags.projectId, projectId))

    // Get labels
    const projectLabelRows = await db
      .select({
        id: labels.id,
        name: labels.name,
        category: labels.category,
      })
      .from(projectLabels)
      .innerJoin(labels, eq(projectLabels.labelId, labels.id))
      .where(eq(projectLabels.projectId, projectId))

    return {
      ...project,
      items,
      files,
      tags: projectTagRows,
      labels: projectLabelRows,
    }
  }

  /**
   * List projects with filtering
   */
  async listProjects(
    userId: string,
    options: {
      tagIds?: string[]
      labelIds?: string[]
      projectType?: string
      status?: string
      visibility?: 'private' | 'shared' | 'public'
      search?: string
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ projects: ProjectWithItems[]; total: number }> {
    const limit = options.limit || 20
    const offset = options.offset || 0

    const conditions = [eq(projects.userId, userId), eq(projects.isActive, true)]

    if (options.projectType) {
      conditions.push(eq(projects.projectType, options.projectType))
    }
    if (options.status) {
      conditions.push(eq(projects.status, options.status))
    }
    if (options.visibility) {
      conditions.push(eq(projects.visibility, options.visibility))
    }
    if (options.search) {
      conditions.push(sql`${projects.name} ILIKE ${'%' + options.search + '%'}`)
    }

    // Filter by tags
    if (options.tagIds && options.tagIds.length > 0) {
      const projectIdsWithTags = await db
        .select({ projectId: projectTags.projectId })
        .from(projectTags)
        .where(inArray(projectTags.tagId, options.tagIds))
        .groupBy(projectTags.projectId)

      const ids = projectIdsWithTags.map((r) => r.projectId)
      if (ids.length > 0) {
        conditions.push(inArray(projects.id, ids))
      } else {
        return { projects: [], total: 0 }
      }
    }

    // Filter by labels
    if (options.labelIds && options.labelIds.length > 0) {
      const projectIdsWithLabels = await db
        .select({ projectId: projectLabels.projectId })
        .from(projectLabels)
        .where(inArray(projectLabels.labelId, options.labelIds))
        .groupBy(projectLabels.projectId)

      const ids = projectIdsWithLabels.map((r) => r.projectId)
      if (ids.length > 0) {
        conditions.push(inArray(projects.id, ids))
      } else {
        return { projects: [], total: 0 }
      }
    }

    const allProjects = await db
      .select()
      .from(projects)
      .where(and(...conditions))
      .orderBy(desc(projects.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(and(...conditions))

    // Fetch details for each project
    const projectsWithDetails = await Promise.all(
      allProjects.map(async (project) => {
        return this.getProjectById(userId, project.id)
      })
    )

    return {
      projects: projectsWithDetails.filter((p): p is ProjectWithItems => p !== null),
      total: Number(count),
    }
  }

  /**
   * Add item to project
   */
  async addItem(
    userId: string,
    projectId: string,
    data: {
      itemType: 'file' | 'clause' | 'playbook' | 'folder'
      fileId?: string
      clauseId?: string
      playbookId?: string
      parentItemId?: string
      name?: string
      sortOrder?: number
      metadata?: Record<string, unknown>
    }
  ): Promise<ProjectItem> {
    const project = await this.getProjectById(userId, projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const newItem: NewProjectItem = {
      projectId,
      itemType: data.itemType,
      fileId: data.fileId || null,
      clauseId: data.clauseId || null,
      playbookId: data.playbookId || null,
      parentItemId: data.parentItemId || null,
      name: data.name,
      sortOrder: data.sortOrder || 0,
      metadata: data.metadata || {},
    }

    const [inserted] = await db.insert(projectItems).values(newItem).returning()

    // Update project item count
    await db
      .update(projects)
      .set({ itemCount: sql`${projects.itemCount} + 1` })
      .where(eq(projects.id, projectId))

    logger.info({ userId, projectId, itemId: inserted.id, itemType: data.itemType }, 'Item added to project')
    return inserted
  }

  /**
   * Remove item from project
   */
  async removeItem(userId: string, projectId: string, itemId: string): Promise<void> {
    const project = await this.getProjectById(userId, projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    await db
      .delete(projectItems)
      .where(and(eq(projectItems.id, itemId), eq(projectItems.projectId, projectId)))

    // Update project item count
    await db
      .update(projects)
      .set({ itemCount: sql`${projects.itemCount} - 1` })
      .where(eq(projects.id, projectId))

    logger.info({ userId, projectId, itemId }, 'Item removed from project')
  }

  /**
   * Update project metadata
   */
  async updateProject(
    userId: string,
    projectId: string,
    updates: {
      name?: string
      description?: string
      projectType?: string
      status?: string
      visibility?: 'private' | 'shared' | 'public'
      tagIds?: string[]
      labelIds?: string[]
      metadata?: Record<string, unknown>
    }
  ): Promise<ProjectWithItems> {
    const project = await this.getProjectById(userId, projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    const updateData: Partial<Project> = {
      updatedAt: new Date(),
    }

    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.projectType !== undefined) updateData.projectType = updates.projectType
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.visibility !== undefined) updateData.visibility = updates.visibility
    if (updates.metadata !== undefined) updateData.metadata = updates.metadata

    await db.update(projects).set(updateData).where(eq(projects.id, projectId))

    // Update tags
    if (updates.tagIds !== undefined) {
      await db.delete(projectTags).where(eq(projectTags.projectId, projectId))
      if (updates.tagIds.length > 0) {
        await db.insert(projectTags).values(
          updates.tagIds.map((tagId) => ({
            projectId,
            tagId,
          }))
        )
      }
    }

    // Update labels
    if (updates.labelIds !== undefined) {
      await db.delete(projectLabels).where(eq(projectLabels.projectId, projectId))
      if (updates.labelIds.length > 0) {
        await db.insert(projectLabels).values(
          updates.labelIds.map((labelId) => ({
            projectId,
            labelId,
          }))
        )
      }
    }

    logger.info({ userId, projectId, updates }, 'Project updated')
    return this.getProjectById(userId, projectId)
  }

  /**
   * Delete project (soft delete)
   */
  async deleteProject(userId: string, projectId: string): Promise<void> {
    const project = await this.getProjectById(userId, projectId)
    if (!project) {
      throw new Error('Project not found')
    }

    await db.update(projects).set({ isActive: false, updatedAt: new Date() }).where(eq(projects.id, projectId))
    logger.info({ userId, projectId }, 'Project deleted')
  }
}

export const projectService = new ProjectService()

