import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logger } from '@/config/logger'
import { organizationService } from '@/services/organizations'
import { teamService } from '@/services/team-service'

export const organizationsController = {
  /**
   * Get current user's organization
   */
  async getOrganization(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      // Get user's organization
      const org = await organizationService.getOrganizationByDomain(user.email)
      
      if (!org) {
        // Auto-create organization if doesn't exist
        const newOrg = await organizationService.getOrCreateByDomain(user.email)
        return c.json({ data: newOrg })
      }

      return c.json({ data: org })
    } catch (error) {
      logger.error({ error }, 'Failed to get organization')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch organization' })
    }
  },

  /**
   * Get organization playbooks
   */
  async getOrganizationPlaybooks(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        throw new HTTPException(404, { message: 'Organization not found' })
      }

      const playbooks = await organizationService.getOrganizationPlaybooks(org.id)
      return c.json({ data: playbooks })
    } catch (error) {
      logger.error({ error }, 'Failed to get organization playbooks')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch organization playbooks' })
    }
  },
}

export const teamsController = {
  /**
   * List teams
   */
  async list(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      // Auto-create organization if it doesn't exist
      let org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        org = await organizationService.getOrCreateByDomain(user.email)
      }

      const teams = await teamService.listTeams(org.id, user.id)
      return c.json({ data: teams })
    } catch (error) {
      logger.error({ error }, 'Failed to list teams')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch teams' })
    }
  },

  /**
   * Create team
   */
  async create(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const { name, description } = body

      if (!name) {
        throw new HTTPException(400, { message: 'Team name is required' })
      }

      // Auto-create organization if it doesn't exist
      let org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        org = await organizationService.getOrCreateByDomain(user.email)
      }

      const team = await teamService.createTeam(org.id, user.id, { name, description })
      return c.json({ data: team }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to create team')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('already')) {
        throw new HTTPException(400, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to create team' })
    }
  },

  /**
   * Get team
   */
  async get(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const team = await teamService.getTeam(id)

      if (!team) {
        throw new HTTPException(404, { message: 'Team not found' })
      }

      return c.json({ data: team })
    } catch (error) {
      logger.error({ error }, 'Failed to get team')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch team' })
    }
  },

  /**
   * Update team
   */
  async update(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()

      const team = await teamService.updateTeam(id, user.id, body)
      return c.json({ data: team })
    } catch (error) {
      logger.error({ error }, 'Failed to update team')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found') || error.message.includes('admin')) {
        throw new HTTPException(403, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to update team' })
    }
  },

  /**
   * Delete team
   */
  async delete(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      await teamService.deleteTeam(id, user.id)

      return c.json({ message: 'Team deleted successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to delete team')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found') || error.message.includes('admin')) {
        throw new HTTPException(403, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to delete team' })
    }
  },

  /**
   * Get team members
   */
  async getMembers(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const members = await teamService.getTeamMembers(id)

      return c.json({ data: members })
    } catch (error) {
      logger.error({ error }, 'Failed to get team members')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch team members' })
    }
  },

  /**
   * Invite member
   */
  async inviteMember(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const { email, role = 'member' } = body

      if (!email) {
        throw new HTTPException(400, { message: 'Email is required' })
      }

      const member = await teamService.inviteMember(id, user.id, email, role)
      return c.json({ data: member }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to invite member')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found') || error.message.includes('already')) {
        throw new HTTPException(400, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to invite member' })
    }
  },

  /**
   * Remove member
   */
  async removeMember(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id, userId } = c.req.param()
      await teamService.removeMember(id, userId, user.id)

      return c.json({ message: 'Member removed successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to remove member')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found') || error.message.includes('admin')) {
        throw new HTTPException(403, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to remove member' })
    }
  },

  /**
   * Update member role
   */
  async updateMemberRole(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id, userId } = c.req.param()
      const body = await c.req.json()
      const { role } = body

      if (!role || !['admin', 'member'].includes(role)) {
        throw new HTTPException(400, { message: 'Valid role is required' })
      }

      const member = await teamService.updateMemberRole(id, userId, role, user.id)
      return c.json({ data: member })
    } catch (error) {
      logger.error({ error }, 'Failed to update member role')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found') || error.message.includes('admin')) {
        throw new HTTPException(403, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to update member role' })
    }
  },

  /**
   * Get team shares
   */
  async getShares(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const shares = await teamService.getTeamShares(id)

      return c.json({ data: shares })
    } catch (error) {
      logger.error({ error }, 'Failed to get team shares')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch team shares' })
    }
  },

  /**
   * Share resource with team
   */
  async shareResource(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const { resourceType, resourceId, permission = 'view' } = body

      if (!resourceType || !resourceId) {
        throw new HTTPException(400, { message: 'resourceType and resourceId are required' })
      }

      const share = await teamService.shareResource(id, resourceType, resourceId, permission, user.id)
      return c.json({ data: share }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to share resource')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to share resource' })
    }
  },

  /**
   * Unshare resource
   */
  async unshareResource(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { shareId } = c.req.param()
      await teamService.unshareResource(shareId, user.id)

      return c.json({ message: 'Resource unshared successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to unshare resource')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found') || error.message.includes('admin')) {
        throw new HTTPException(403, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to unshare resource' })
    }
  },
}

