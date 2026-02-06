import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logger } from '@/config/logger'
import { tagService } from '@/services/tag-service'
import { labelService } from '@/services/label-service'
import { clauseService } from '@/services/clause-service'
import { projectService } from '@/services/project-service'
import { playbookService } from '@/services/playbook-service'
import { librarySearchService } from '@/services/library-search'

export const libraryController = {
  // ============================================
  // TAGS
  // ============================================

  async listTags(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const scope = c.req.query('scope') as 'all' | 'clauses' | 'projects' | 'playbooks' | undefined
      const tags = await tagService.getTagTree(user.id, scope)

      return c.json({ data: tags })
    } catch (error) {
      logger.error({ error }, 'Failed to list tags')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch tags' })
    }
  },

  async createTag(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const tag = await tagService.createTag(user.id, body)

      return c.json({ data: tag }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to create tag')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new HTTPException(400, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to create tag' })
    }
  },

  async updateTag(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const tag = await tagService.updateTag(user.id, id, body)

      return c.json({ data: tag })
    } catch (error) {
      logger.error({ error }, 'Failed to update tag')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to update tag' })
    }
  },

  async deleteTag(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const deleteChildren = c.req.query('deleteChildren') === 'true'
      await tagService.deleteTag(user.id, id, deleteChildren)

      return c.json({ message: 'Tag deleted successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to delete tag')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to delete tag' })
    }
  },

  // ============================================
  // LABELS
  // ============================================

  async listLabels(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const category = c.req.query('category')
      const grouped = c.req.query('grouped') === 'true'

      if (grouped) {
        const labels = await labelService.getLabelsByCategory(user.id)
        return c.json({ data: labels })
      }

      const labels = await labelService.getLabels(user.id, category)
      return c.json({ data: labels })
    } catch (error) {
      logger.error({ error }, 'Failed to list labels')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch labels' })
    }
  },

  async createLabel(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const label = await labelService.createLabel(user.id, body)

      return c.json({ data: label }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to create label')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new HTTPException(400, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to create label' })
    }
  },

  async updateLabel(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const label = await labelService.updateLabel(user.id, id, body)

      return c.json({ data: label })
    } catch (error) {
      logger.error({ error }, 'Failed to update label')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to update label' })
    }
  },

  async deleteLabel(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      await labelService.deleteLabel(user.id, id)

      return c.json({ message: 'Label deleted successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to delete label')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to delete label' })
    }
  },

  // ============================================
  // CLAUSES
  // ============================================

  async listClauses(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const page = Number.parseInt(c.req.query('page') || '1')
      const limit = Math.min(Number.parseInt(c.req.query('limit') || '20'), 100)
      const offset = (page - 1) * limit

      const options: Parameters<typeof clauseService.listClauses>[1] = {
        tagIds: c.req.query('tagIds')?.split(',').filter(Boolean),
        labelIds: c.req.query('labelIds')?.split(',').filter(Boolean),
        clauseType: c.req.query('clauseType'),
        jurisdiction: c.req.query('jurisdiction'),
        visibility: c.req.query('visibility') as 'private' | 'shared' | 'public' | undefined,
        search: c.req.query('search'),
        limit,
        offset,
      }

      const result = await clauseService.listClauses(user.id, options)

      return c.json({
        data: result.clauses,
        pagination: {
          page,
          limit,
          total: result.total,
          hasMore: offset + result.clauses.length < result.total,
        },
      })
    } catch (error) {
      logger.error({ error }, 'Failed to list clauses')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch clauses' })
    }
  },

  async getClause(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const clause = await clauseService.getClauseById(user.id, id)

      if (!clause) {
        throw new HTTPException(404, { message: 'Clause not found' })
      }

      return c.json({ data: clause })
    } catch (error) {
      logger.error({ error }, 'Failed to get clause')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch clause' })
    }
  },

  async createClause(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const clause = await clauseService.createClause(user.id, body)

      return c.json({ data: clause }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to create clause')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to create clause' })
    }
  },

  async updateClause(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const clause = await clauseService.updateClause(user.id, id, body)

      return c.json({ data: clause })
    } catch (error) {
      logger.error({ error }, 'Failed to update clause')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to update clause' })
    }
  },

  async deleteClause(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      await clauseService.deleteClause(user.id, id)

      return c.json({ message: 'Clause deleted successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to delete clause')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to delete clause' })
    }
  },

  async getClauseVersions(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const versions = await clauseService.getVersionHistory(user.id, id)

      return c.json({ data: versions })
    } catch (error) {
      logger.error({ error }, 'Failed to get clause versions')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to fetch clause versions' })
    }
  },

  async createClauseVersion(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const version = await clauseService.createVersion(user.id, id, body)

      return c.json({ data: version }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to create clause version')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to create clause version' })
    }
  },

  async restoreClauseVersion(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const { versionId } = c.req.param()
      const version = await clauseService.restoreVersion(user.id, id, versionId)

      return c.json({ data: version })
    } catch (error) {
      logger.error({ error }, 'Failed to restore clause version')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to restore clause version' })
    }
  },

  // ============================================
  // PROJECTS
  // ============================================

  async listProjects(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const page = Number.parseInt(c.req.query('page') || '1')
      const limit = Math.min(Number.parseInt(c.req.query('limit') || '20'), 100)
      const offset = (page - 1) * limit

      const options: Parameters<typeof projectService.listProjects>[1] = {
        tagIds: c.req.query('tagIds')?.split(',').filter(Boolean),
        labelIds: c.req.query('labelIds')?.split(',').filter(Boolean),
        projectType: c.req.query('projectType'),
        status: c.req.query('status'),
        visibility: c.req.query('visibility') as 'private' | 'shared' | 'public' | undefined,
        search: c.req.query('search'),
        limit,
        offset,
      }

      const result = await projectService.listProjects(user.id, options)

      return c.json({
        data: result.projects,
        pagination: {
          page,
          limit,
          total: result.total,
          hasMore: offset + result.projects.length < result.total,
        },
      })
    } catch (error) {
      logger.error({ error }, 'Failed to list projects')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch projects' })
    }
  },

  async getProject(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const project = await projectService.getProjectById(user.id, id)

      if (!project) {
        throw new HTTPException(404, { message: 'Project not found' })
      }

      return c.json({ data: project })
    } catch (error) {
      logger.error({ error }, 'Failed to get project')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch project' })
    }
  },

  async createProject(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const project = await projectService.createProject(user.id, body)

      return c.json({ data: project }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to create project')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to create project' })
    }
  },

  async updateProject(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const project = await projectService.updateProject(user.id, id, body)

      return c.json({ data: project })
    } catch (error) {
      logger.error({ error }, 'Failed to update project')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to update project' })
    }
  },

  async deleteProject(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      await projectService.deleteProject(user.id, id)

      return c.json({ message: 'Project deleted successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to delete project')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to delete project' })
    }
  },

  async addProjectItem(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const item = await projectService.addItem(user.id, id, body)

      return c.json({ data: item }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to add project item')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to add project item' })
    }
  },

  async removeProjectItem(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const { itemId } = c.req.param()
      await projectService.removeItem(user.id, id, itemId)

      return c.json({ message: 'Item removed successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to remove project item')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to remove project item' })
    }
  },

  // ============================================
  // PLAYBOOKS
  // ============================================

  async listPlaybooks(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const page = Number.parseInt(c.req.query('page') || '1')
      const limit = Math.min(Number.parseInt(c.req.query('limit') || '20'), 100)
      const offset = (page - 1) * limit

      const options: Parameters<typeof playbookService.listPlaybooks>[1] = {
        tagIds: c.req.query('tagIds')?.split(',').filter(Boolean),
        labelIds: c.req.query('labelIds')?.split(',').filter(Boolean),
        playbookType: c.req.query('playbookType'),
        jurisdiction: c.req.query('jurisdiction'),
        visibility: c.req.query('visibility') as 'private' | 'shared' | 'public' | undefined,
        search: c.req.query('search'),
        limit,
        offset,
      }

      const result = await playbookService.listPlaybooks(user.id, options)

      return c.json({
        data: result.playbooks,
        pagination: {
          page,
          limit,
          total: result.total,
          hasMore: offset + result.playbooks.length < result.total,
        },
      })
    } catch (error) {
      logger.error({ error }, 'Failed to list playbooks')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch playbooks' })
    }
  },

  async getPlaybook(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const playbook = await playbookService.getPlaybookById(user.id, id)

      if (!playbook) {
        throw new HTTPException(404, { message: 'Playbook not found' })
      }

      return c.json({ data: playbook })
    } catch (error) {
      logger.error({ error }, 'Failed to get playbook')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch playbook' })
    }
  },

  async createPlaybook(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const playbook = await playbookService.createPlaybook(user.id, body)

      return c.json({ data: playbook }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to create playbook')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to create playbook' })
    }
  },

  async updatePlaybook(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const playbook = await playbookService.updatePlaybook(user.id, id, body)

      return c.json({ data: playbook })
    } catch (error) {
      logger.error({ error }, 'Failed to update playbook')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to update playbook' })
    }
  },

  async deletePlaybook(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      await playbookService.deletePlaybook(user.id, id)

      return c.json({ message: 'Playbook deleted successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to delete playbook')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to delete playbook' })
    }
  },

  async updatePlaybookRules(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const { rules, changeDescription } = await c.req.json()
      const version = await playbookService.updateRules(user.id, id, rules, changeDescription)

      return c.json({ data: version })
    } catch (error) {
      logger.error({ error }, 'Failed to update playbook rules')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to update playbook rules' })
    }
  },

  async linkRuleToClause(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id, ruleId } = c.req.param()
      const { clauseId } = await c.req.json()
      const rule = await playbookService.linkRuleToClause(user.id, id, ruleId, clauseId)

      return c.json({ data: rule })
    } catch (error) {
      logger.error({ error }, 'Failed to link rule to clause')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to link rule to clause' })
    }
  },

  async getPlaybookVersions(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const versions = await playbookService.getVersionHistory(user.id, id)

      return c.json({ data: versions })
    } catch (error) {
      logger.error({ error }, 'Failed to get playbook versions')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to fetch playbook versions' })
    }
  },

  async restorePlaybookVersion(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const { versionId } = c.req.param()
      const version = await playbookService.restoreVersion(user.id, id, versionId)

      return c.json({ data: version })
    } catch (error) {
      logger.error({ error }, 'Failed to restore playbook version')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to restore playbook version' })
    }
  },

  // ============================================
  // UNIFIED SEARCH
  // ============================================

  async search(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const { query, types, tagIds, limit } = body

      if (!query) {
        throw new HTTPException(400, { message: 'Query is required' })
      }

      const results = await librarySearchService.search({
        userId: user.id,
        query,
        types,
        tagIds,
        limit,
      })

      return c.json({ data: results })
    } catch (error) {
      logger.error({ error }, 'Failed to search')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to search' })
    }
  },
}

