import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logger } from '@/config/logger'
import { adminService } from '@/services/admin-service'
import { organizationService } from '@/services/organizations'

export const adminController = {
  /**
   * List all users in the organization
   */
  async listUsers(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      // Get user's organization
      const org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        throw new HTTPException(404, { message: 'Organization not found' })
      }

      // Get query params
      const page = parseInt(c.req.query('page') || '1')
      const limit = parseInt(c.req.query('limit') || '50')
      const search = c.req.query('search')

      const result = await adminService.listOrganizationUsers({
        organizationId: org.id,
        page,
        limit,
        search,
      })

      return c.json({
        data: result.users,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      })
    } catch (error) {
      logger.error({ error }, 'Failed to list users')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch users' })
    }
  },

  /**
   * Get a specific user by ID
   */
  async getUser(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      if (!id) {
        throw new HTTPException(400, { message: 'User ID is required' })
      }

      // Get user's organization
      const org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        throw new HTTPException(404, { message: 'Organization not found' })
      }

      const userData = await adminService.getUserById(id, org.id)
      if (!userData) {
        throw new HTTPException(404, { message: 'User not found' })
      }

      return c.json({ data: userData })
    } catch (error) {
      logger.error({ error }, 'Failed to get user')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch user' })
    }
  },

  /**
   * Invite a new user to the organization
   */
  async inviteUser(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const { email, name, roles: roleNames = [] } = body

      if (!email) {
        throw new HTTPException(400, { message: 'Email is required' })
      }

      // Get user's organization
      const org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        throw new HTTPException(404, { message: 'Organization not found' })
      }

      const newUser = await adminService.inviteUser(
        org.id,
        email,
        name || null,
        roleNames,
        user.id
      )

      return c.json({ data: newUser }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to invite user')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new HTTPException(409, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to invite user' })
    }
  },

  /**
   * Update a user
   */
  async updateUser(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      if (!id) {
        throw new HTTPException(400, { message: 'User ID is required' })
      }

      const body = await c.req.json()
      const { name, isActive } = body

      // Get user's organization
      const org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        throw new HTTPException(404, { message: 'Organization not found' })
      }

      const updates: { name?: string; isActive?: boolean } = {}
      if (name !== undefined) updates.name = name
      if (isActive !== undefined) updates.isActive = isActive

      const updatedUser = await adminService.updateUser(id, org.id, updates)
      if (!updatedUser) {
        throw new HTTPException(404, { message: 'User not found' })
      }

      return c.json({ data: updatedUser })
    } catch (error) {
      logger.error({ error }, 'Failed to update user')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to update user' })
    }
  },

  /**
   * Remove a user from the organization
   */
  async removeUser(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      if (!id) {
        throw new HTTPException(400, { message: 'User ID is required' })
      }

      // Prevent self-removal
      if (id === user.id) {
        throw new HTTPException(400, { message: 'Cannot remove yourself' })
      }

      // Get user's organization
      const org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        throw new HTTPException(404, { message: 'Organization not found' })
      }

      const removed = await adminService.removeUser(id, org.id)
      if (!removed) {
        throw new HTTPException(404, { message: 'User not found' })
      }

      return c.json({ message: 'User removed successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to remove user')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to remove user' })
    }
  },

  /**
   * List all available roles
   */
  async listRoles(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const rolesList = await adminService.listRoles()
      return c.json({ data: rolesList })
    } catch (error) {
      logger.error({ error }, 'Failed to list roles')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch roles' })
    }
  },

  /**
   * Create a new role
   */
  async createRole(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const { name, description, permissions } = body

      if (!name) {
        throw new HTTPException(400, { message: 'Role name is required' })
      }

      if (!permissions || !Array.isArray(permissions)) {
        throw new HTTPException(400, { message: 'Permissions array is required' })
      }

      const newRole = await adminService.createRole(name, description || null, permissions)
      return c.json({ data: newRole }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to create role')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('already exists')) {
        throw new HTTPException(409, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to create role' })
    }
  },

  /**
   * Update an existing role
   */
  async updateRole(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      if (!id) {
        throw new HTTPException(400, { message: 'Role ID is required' })
      }

      const body = await c.req.json()
      const { name, description, permissions } = body

      const updates: { name?: string; description?: string | null; permissions?: string[] } = {}
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (permissions !== undefined) {
        if (!Array.isArray(permissions)) {
          throw new HTTPException(400, { message: 'Permissions must be an array' })
        }
        updates.permissions = permissions
      }

      const updatedRole = await adminService.updateRole(id, updates)
      if (!updatedRole) {
        throw new HTTPException(404, { message: 'Role not found' })
      }

      return c.json({ data: updatedRole })
    } catch (error) {
      logger.error({ error }, 'Failed to update role')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && (error.message.includes('system roles') || error.message.includes('already exists'))) {
        throw new HTTPException(400, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to update role' })
    }
  },

  /**
   * Delete a role
   */
  async deleteRole(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      if (!id) {
        throw new HTTPException(400, { message: 'Role ID is required' })
      }

      const deleted = await adminService.deleteRole(id)
      if (!deleted) {
        throw new HTTPException(404, { message: 'Role not found' })
      }

      return c.json({ message: 'Role deleted successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to delete role')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && (error.message.includes('system roles') || error.message.includes('assigned to users'))) {
        throw new HTTPException(400, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to delete role' })
    }
  },

  /**
   * Get roles for a specific user
   */
  async getUserRoles(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      if (!id) {
        throw new HTTPException(400, { message: 'User ID is required' })
      }

      // Get user's organization
      const org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        throw new HTTPException(404, { message: 'Organization not found' })
      }

      const userRoles = await adminService.getUserRoles(id, org.id)
      return c.json({ data: userRoles })
    } catch (error) {
      logger.error({ error }, 'Failed to get user roles')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch user roles' })
    }
  },

  /**
   * Assign roles to a user
   */
  async assignUserRoles(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      if (!id) {
        throw new HTTPException(400, { message: 'User ID is required' })
      }

      const body = await c.req.json()
      const { roles: roleNames } = body

      if (!roleNames || !Array.isArray(roleNames)) {
        throw new HTTPException(400, { message: 'Roles array is required' })
      }

      // Get user's organization
      const org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        throw new HTTPException(404, { message: 'Organization not found' })
      }

      const assignedRoles = await adminService.assignUserRoles(
        id,
        org.id,
        roleNames,
        user.id
      )

      return c.json({ data: assignedRoles })
    } catch (error) {
      logger.error({ error }, 'Failed to assign user roles')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to assign roles' })
    }
  },

  /**
   * List subscriptions for the organization (admin view)
   */
  async listOrganizationSubscriptions(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id || !user?.email) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      // Get user's organization
      const org = await organizationService.getOrganizationByDomain(user.email)
      if (!org) {
        throw new HTTPException(404, { message: 'Organization not found' })
      }

      const subscriptionsList = await adminService.listOrganizationSubscriptions(org.id)
      return c.json({ data: subscriptionsList })
    } catch (error) {
      logger.error({ error }, 'Failed to list organization subscriptions')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch subscriptions' })
    }
  },
}

