import { db } from '@/config/database'
import {
  clauses,
  projects,
  playbooksNew,
  clauseTags,
  projectTags,
  playbookTags,
  tags,
} from '@/db/schema/library'
import { eq, and, or, sql, inArray } from 'drizzle-orm'
import { logger } from '@/config/logger'

export interface SearchResult {
  type: 'clause' | 'project' | 'playbook'
  id: string
  name: string
  description?: string
  relevanceScore?: number
}

export interface UnifiedSearchOptions {
  userId: string
  query: string
  types?: ('clause' | 'project' | 'playbook')[]
  tagIds?: string[]
  limit?: number
}

export class LibrarySearchService {
  /**
   * Unified search across all libraries
   */
  async search(options: UnifiedSearchOptions): Promise<SearchResult[]> {
    const { userId, query, types = ['clause', 'project', 'playbook'], tagIds, limit = 20 } = options

    const results: SearchResult[] = []

    // Search clauses
    if (types.includes('clause')) {
      const clauseResults = await this.searchClauses(userId, query, tagIds, Math.ceil(limit / types.length))
      results.push(...clauseResults)
    }

    // Search projects
    if (types.includes('project')) {
      const projectResults = await this.searchProjects(userId, query, tagIds, Math.ceil(limit / types.length))
      results.push(...projectResults)
    }

    // Search playbooks
    if (types.includes('playbook')) {
      const playbookResults = await this.searchPlaybooks(userId, query, tagIds, Math.ceil(limit / types.length))
      results.push(...playbookResults)
    }

    // Sort by relevance score if available
    results.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))

    return results.slice(0, limit)
  }

  /**
   * Search clauses
   */
  private async searchClauses(
    userId: string,
    query: string,
    tagIds?: string[],
    limit: number = 10
  ): Promise<SearchResult[]> {
    const conditions = [
      eq(clauses.userId, userId),
      eq(clauses.isActive, true),
      or(
        sql`${clauses.name} ILIKE ${'%' + query + '%'}`,
        sql`${clauses.description} ILIKE ${'%' + query + '%'}`
      ),
    ]

    // Filter by tags if provided
    if (tagIds && tagIds.length > 0) {
      const clauseIdsWithTags = await db
        .select({ clauseId: clauseTags.clauseId })
        .from(clauseTags)
        .where(inArray(clauseTags.tagId, tagIds))
        .groupBy(clauseTags.clauseId)

      const ids = clauseIdsWithTags.map((r) => r.clauseId)
      if (ids.length > 0) {
        conditions.push(inArray(clauses.id, ids))
      } else {
        return []
      }
    }

    const clauseResults = await db
      .select({
        id: clauses.id,
        name: clauses.name,
        description: clauses.description,
      })
      .from(clauses)
      .where(and(...conditions))
      .limit(limit)

    return clauseResults.map((c) => ({
      type: 'clause' as const,
      id: c.id,
      name: c.name,
      description: c.description || undefined,
    }))
  }

  /**
   * Search projects
   */
  private async searchProjects(
    userId: string,
    query: string,
    tagIds?: string[],
    limit: number = 10
  ): Promise<SearchResult[]> {
    const conditions = [
      eq(projects.userId, userId),
      eq(projects.isActive, true),
      or(
        sql`${projects.name} ILIKE ${'%' + query + '%'}`,
        sql`${projects.description} ILIKE ${'%' + query + '%'}`
      ),
    ]

    // Filter by tags if provided
    if (tagIds && tagIds.length > 0) {
      const projectIdsWithTags = await db
        .select({ projectId: projectTags.projectId })
        .from(projectTags)
        .where(inArray(projectTags.tagId, tagIds))
        .groupBy(projectTags.projectId)

      const ids = projectIdsWithTags.map((r) => r.projectId)
      if (ids.length > 0) {
        conditions.push(inArray(projects.id, ids))
      } else {
        return []
      }
    }

    const projectResults = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
      })
      .from(projects)
      .where(and(...conditions))
      .limit(limit)

    return projectResults.map((p) => ({
      type: 'project' as const,
      id: p.id,
      name: p.name,
      description: p.description || undefined,
    }))
  }

  /**
   * Search playbooks
   */
  private async searchPlaybooks(
    userId: string,
    query: string,
    tagIds?: string[],
    limit: number = 10
  ): Promise<SearchResult[]> {
    const conditions = [
      eq(playbooksNew.userId, userId),
      eq(playbooksNew.isActive, true),
      or(
        sql`${playbooksNew.name} ILIKE ${'%' + query + '%'}`,
        sql`${playbooksNew.description} ILIKE ${'%' + query + '%'}`
      ),
    ]

    // Filter by tags if provided
    if (tagIds && tagIds.length > 0) {
      const playbookIdsWithTags = await db
        .select({ playbookId: playbookTags.playbookId })
        .from(playbookTags)
        .where(inArray(playbookTags.tagId, tagIds))
        .groupBy(playbookTags.playbookId)

      const ids = playbookIdsWithTags.map((r) => r.playbookId)
      if (ids.length > 0) {
        conditions.push(inArray(playbooksNew.id, ids))
      } else {
        return []
      }
    }

    const playbookResults = await db
      .select({
        id: playbooksNew.id,
        name: playbooksNew.name,
        description: playbooksNew.description,
      })
      .from(playbooksNew)
      .where(and(...conditions))
      .limit(limit)

    return playbookResults.map((p) => ({
      type: 'playbook' as const,
      id: p.id,
      name: p.name,
      description: p.description || undefined,
    }))
  }

  /**
   * Search by tags across all libraries
   */
  async searchByTags(
    userId: string,
    tagIds: string[],
    types?: ('clause' | 'project' | 'playbook')[]
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = []
    const searchTypes = types || ['clause', 'project', 'playbook']

    if (searchTypes.includes('clause')) {
      const clauseIds = await db
        .select({ clauseId: clauseTags.clauseId })
        .from(clauseTags)
        .where(inArray(clauseTags.tagId, tagIds))
        .groupBy(clauseTags.clauseId)

      if (clauseIds.length > 0) {
        const clauses = await db
          .select({
            id: clauses.id,
            name: clauses.name,
            description: clauses.description,
          })
          .from(clauses)
          .where(
            and(
              eq(clauses.userId, userId),
              eq(clauses.isActive, true),
              inArray(
                clauses.id,
                clauseIds.map((c) => c.clauseId)
              )
            )
          )

        results.push(
          ...clauses.map((c) => ({
            type: 'clause' as const,
            id: c.id,
            name: c.name,
            description: c.description || undefined,
          }))
        )
      }
    }

    if (searchTypes.includes('project')) {
      const projectIds = await db
        .select({ projectId: projectTags.projectId })
        .from(projectTags)
        .where(inArray(projectTags.tagId, tagIds))
        .groupBy(projectTags.projectId)

      if (projectIds.length > 0) {
        const projectsList = await db
          .select({
            id: projects.id,
            name: projects.name,
            description: projects.description,
          })
          .from(projects)
          .where(
            and(
              eq(projects.userId, userId),
              eq(projects.isActive, true),
              inArray(
                projects.id,
                projectIds.map((p) => p.projectId)
              )
            )
          )

        results.push(
          ...projectsList.map((p) => ({
            type: 'project' as const,
            id: p.id,
            name: p.name,
            description: p.description || undefined,
          }))
        )
      }
    }

    if (searchTypes.includes('playbook')) {
      const playbookIds = await db
        .select({ playbookId: playbookTags.playbookId })
        .from(playbookTags)
        .where(inArray(playbookTags.tagId, tagIds))
        .groupBy(playbookTags.playbookId)

      if (playbookIds.length > 0) {
        const playbooks = await db
          .select({
            id: playbooksNew.id,
            name: playbooksNew.name,
            description: playbooksNew.description,
          })
          .from(playbooksNew)
          .where(
            and(
              eq(playbooksNew.userId, userId),
              eq(playbooksNew.isActive, true),
              inArray(
                playbooksNew.id,
                playbookIds.map((p) => p.playbookId)
              )
            )
          )

        results.push(
          ...playbooks.map((p) => ({
            type: 'playbook' as const,
            id: p.id,
            name: p.name,
            description: p.description || undefined,
          }))
        )
      }
    }

    return results
  }
}

export const librarySearchService = new LibrarySearchService()

