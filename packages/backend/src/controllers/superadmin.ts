import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { superAdminService } from '@/services/superadmin-service'
import { logger } from '@/config/logger'
import jwt from 'jsonwebtoken'
import { env } from '@/config/env'
import { db } from '@/config/database'
import { users, sessions } from '@/db/schema/index'
import { eq, and, gt } from 'drizzle-orm'
import { nanoid } from 'nanoid'

export const superAdminController = {
  /**
   * Get platform-wide statistics
   */
  async getStats(c: Context) {
    try {
      const stats = await superAdminService.getPlatformStats()
      return c.json({ data: stats })
    } catch (error) {
      logger.error({ error }, 'Failed to get platform stats')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch platform statistics' })
    }
  },

  /**
   * List all users across all organizations
   */
  async listUsers(c: Context) {
    try {
      const page = parseInt(c.req.query('page') || '1')
      const limit = parseInt(c.req.query('limit') || '50')
      const search = c.req.query('search')
      const organizationId = c.req.query('organizationId')
      const role = c.req.query('role')
      const isActive = c.req.query('isActive') === 'true' ? true : c.req.query('isActive') === 'false' ? false : undefined

      const result = await superAdminService.listAllUsers({
        page,
        limit,
        search,
        organizationId,
        role,
        isActive,
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
      logger.error({ error }, 'Failed to list all users')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch users' })
    }
  },

  /**
   * Get a single user by ID
   */
  async getUser(c: Context) {
    try {
      const { id } = c.req.param()
      const user = await superAdminService.getUserById(id)
      
      if (!user) {
        throw new HTTPException(404, { message: 'User not found' })
      }

      return c.json({ data: user })
    } catch (error) {
      logger.error({ error }, 'Failed to get user')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch user' })
    }
  },

  /**
   * Update any user
   */
  async updateUser(c: Context) {
    try {
      const { id } = c.req.param()
      const updates = await c.req.json()
      
      const updatedUser = await superAdminService.updateUser(id, updates)
      return c.json({ data: updatedUser })
    } catch (error) {
      logger.error({ error }, 'Failed to update user')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to update user' })
    }
  },

  /**
   * Assign roles to a user (superadmin can assign any role including admin and superadmin)
   */
  async assignUserRoles(c: Context) {
    try {
      const { id } = c.req.param()
      const superAdminUser = c.get('user')
      const { roleNames, organizationId } = await c.req.json()
      
      if (!Array.isArray(roleNames) || roleNames.length === 0) {
        throw new HTTPException(400, { message: 'roleNames must be a non-empty array' })
      }

      const assignedRoles = await superAdminService.assignUserRoles(
        id,
        roleNames,
        superAdminUser.id,
        organizationId !== undefined ? organizationId : null
      )
      
      return c.json({ data: assignedRoles })
    } catch (error) {
      logger.error({ error }, 'Failed to assign user roles')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to assign user roles' })
    }
  },

  /**
   * List all organizations
   */
  async listOrganizations(c: Context) {
    try {
      const orgs = await superAdminService.listAllOrganizations()
      return c.json({ data: orgs })
    } catch (error) {
      logger.error({ error }, 'Failed to list organizations')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch organizations' })
    }
  },

  /**
   * List all subscriptions
   */
  async listSubscriptions(c: Context) {
    try {
      const page = parseInt(c.req.query('page') || '1')
      const limit = parseInt(c.req.query('limit') || '50')
      const status = c.req.query('status')
      const organizationId = c.req.query('organizationId')

      const result = await superAdminService.listAllSubscriptions({
        page,
        limit,
        status,
        organizationId,
      })

      return c.json({
        data: result.subscriptions,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
      })
    } catch (error) {
      logger.error({ error }, 'Failed to list subscriptions')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch subscriptions' })
    }
  },

  /**
   * Update any subscription
   */
  async updateSubscription(c: Context) {
    try {
      const { id } = c.req.param()
      const updates = await c.req.json()
      
      const updated = await superAdminService.updateSubscription(id, updates)
      return c.json({ data: updated })
    } catch (error) {
      logger.error({ error }, 'Failed to update subscription')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to update subscription' })
    }
  },

  /**
   * Impersonate a user - generate a token to act as them
   */
  async impersonateUser(c: Context) {
    try {
      const { id } = c.req.param()
      const superAdminUser = c.get('user')

      // Get the user to impersonate
      const targetUser = await superAdminService.getUserById(id)
      if (!targetUser) {
        throw new HTTPException(404, { message: 'User not found' })
      }

      // Create a session for the impersonated user
      const sessionToken = nanoid(64)
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

      const [session] = await db
        .insert(sessions)
        .values({
          userId: targetUser.id,
          token: sessionToken,
          expiresAt,
        })
        .returning()

      if (!session) {
        throw new HTTPException(500, { message: 'Failed to create impersonation session' })
      }

      // Generate JWT for impersonated user
      const token = jwt.sign(
        { userId: targetUser.id, sessionId: session.id },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN }
      )

      logger.info({ 
        superAdminId: superAdminUser.id, 
        impersonatedUserId: targetUser.id 
      }, 'Super admin impersonated user')

      return c.json({
        data: {
          token,
          user: targetUser,
          expiresAt,
        },
      })
    } catch (error) {
      logger.error({ error }, 'Failed to impersonate user')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to impersonate user' })
    }
  },
}

