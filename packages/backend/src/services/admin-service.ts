import { db } from '@/config/database'
import { users, subscriptions } from '@/db/schema/index'
import { roles, userRoles } from '@/db/schema/roles'
import { organizations } from '@/db/schema/organizations'
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm'
import { logger } from '@/config/logger'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'

export interface UserWithRoles {
  id: string
  email: string
  name: string | null
  isActive: boolean
  organizationId: string | null
  createdAt: Date
  updatedAt: Date
  roles: {
    id: string
    name: string
    description: string | null
  }[]
  subscription?: {
    id: string
    subscriptionType: string
    status: string
    endDate: Date
  } | null
}

export interface ListUsersParams {
  organizationId: string
  page?: number
  limit?: number
  search?: string
}

class AdminService {
  /**
   * List all users in an organization with their roles
   */
  async listOrganizationUsers(params: ListUsersParams): Promise<{ users: UserWithRoles[], total: number }> {
    const { organizationId, page = 1, limit = 50, search } = params
    const offset = (page - 1) * limit

    // Build where conditions
    let whereCondition = eq(users.organizationId, organizationId)
    
    // Get users with pagination
    let query = db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(whereCondition)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)

    const userList = await query

    // Get total count
    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(whereCondition)

    // Get roles for each user
    const usersWithRoles: UserWithRoles[] = await Promise.all(
      userList.map(async (user) => {
        // Get user roles
        const userRolesList = await db
          .select({
            id: roles.id,
            name: roles.name,
            description: roles.description,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(
            and(
              eq(userRoles.userId, user.id),
              or(
                eq(userRoles.organizationId, organizationId),
                sql`${userRoles.organizationId} IS NULL`
              )
            )
          )

        // Get latest subscription
        const [subscription] = await db
          .select({
            id: subscriptions.id,
            subscriptionType: subscriptions.subscriptionType,
            status: subscriptions.status,
            endDate: subscriptions.endDate,
          })
          .from(subscriptions)
          .where(eq(subscriptions.userId, user.id))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1)

        return {
          ...user,
          roles: userRolesList,
          subscription: subscription || null,
        }
      })
    )

    // Filter by search if provided (post-query filter for simplicity)
    let filteredUsers = usersWithRoles
    if (search) {
      const searchLower = search.toLowerCase()
      filteredUsers = usersWithRoles.filter(
        u => u.email.toLowerCase().includes(searchLower) ||
             (u.name && u.name.toLowerCase().includes(searchLower))
      )
    }

    return {
      users: filteredUsers,
      total: countResult?.count || 0,
    }
  }

  /**
   * Get a single user by ID with roles
   */
  async getUserById(userId: string, organizationId: string): Promise<UserWithRoles | null> {
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
      .limit(1)

    if (!user) return null

    // Get user roles
    const userRolesList = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          or(
            eq(userRoles.organizationId, organizationId),
            sql`${userRoles.organizationId} IS NULL`
          )
        )
      )

    // Get latest subscription
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        subscriptionType: subscriptions.subscriptionType,
        status: subscriptions.status,
        endDate: subscriptions.endDate,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)

    return {
      ...user,
      roles: userRolesList,
      subscription: subscription || null,
    }
  }

  /**
   * Invite a new user to the organization
   */
  async inviteUser(
    organizationId: string,
    email: string,
    name: string | null,
    roleNames: string[],
    invitedBy: string
  ): Promise<UserWithRoles> {
    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Generate temporary password (user will need to reset)
    const tempPassword = nanoid(16)
    const passwordHash = await bcrypt.hash(tempPassword, 12)

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name,
        passwordHash,
        organizationId,
        isActive: true,
      })
      .returning()

    if (!newUser) {
      throw new Error('Failed to create user')
    }

    // Get role IDs and assign roles
    if (roleNames.length > 0) {
      const rolesList = await db
        .select({ id: roles.id, name: roles.name })
        .from(roles)
        .where(sql`${roles.name} = ANY(${roleNames})`)

      for (const role of rolesList) {
        await db.insert(userRoles).values({
          userId: newUser.id,
          roleId: role.id,
          organizationId,
          assignedBy: invitedBy,
        })
      }
    } else {
      // Assign default 'user' role
      const [defaultRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(eq(roles.name, 'user'))
        .limit(1)

      if (defaultRole) {
        await db.insert(userRoles).values({
          userId: newUser.id,
          roleId: defaultRole.id,
          organizationId,
          assignedBy: invitedBy,
        })
      }
    }

    // Return user with roles
    return this.getUserById(newUser.id, organizationId) as Promise<UserWithRoles>
  }

  /**
   * Update user details
   */
  async updateUser(
    userId: string,
    organizationId: string,
    updates: { name?: string; isActive?: boolean }
  ): Promise<UserWithRoles | null> {
    const [updated] = await db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
      .returning()

    if (!updated) return null

    return this.getUserById(userId, organizationId)
  }

  /**
   * Remove user from organization (soft delete - deactivate)
   */
  async removeUser(userId: string, organizationId: string): Promise<boolean> {
    const [updated] = await db
      .update(users)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(and(eq(users.id, userId), eq(users.organizationId, organizationId)))
      .returning()

    return !!updated
  }

  /**
   * List all available roles
   */
  async listRoles(): Promise<{ id: string; name: string; description: string | null; permissions: unknown; isSystem: boolean }[]> {
    const rolesList = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        permissions: roles.permissions,
        isSystem: roles.isSystem,
      })
      .from(roles)
      .orderBy(roles.name)

    return rolesList
  }

  /**
   * Create a new role
   */
  async createRole(
    name: string,
    description: string | null,
    permissions: string[]
  ): Promise<{ id: string; name: string; description: string | null; permissions: unknown; isSystem: boolean }> {
    // Check if role already exists
    const [existing] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1)

    if (existing) {
      throw new Error('Role with this name already exists')
    }

    const [newRole] = await db
      .insert(roles)
      .values({
        name,
        description,
        permissions: permissions as any,
        isSystem: false,
      })
      .returning({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        permissions: roles.permissions,
        isSystem: roles.isSystem,
      })

    if (!newRole) {
      throw new Error('Failed to create role')
    }

    return newRole
  }

  /**
   * Update an existing role
   */
  async updateRole(
    roleId: string,
    updates: { name?: string; description?: string | null; permissions?: string[] }
  ): Promise<{ id: string; name: string; description: string | null; permissions: unknown; isSystem: boolean } | null> {
    // Check if role exists and is not a system role
    const [existing] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)

    if (!existing) {
      return null
    }

    if (existing.isSystem) {
      throw new Error('Cannot modify system roles')
    }

    // Check if new name conflicts with existing role
    if (updates.name && updates.name !== existing.name) {
      const [conflict] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, updates.name))
        .limit(1)

      if (conflict) {
        throw new Error('Role with this name already exists')
      }
    }

    const updateData: any = {}
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined) updateData.description = updates.description
    if (updates.permissions !== undefined) updateData.permissions = updates.permissions as any

    const [updated] = await db
      .update(roles)
      .set(updateData)
      .where(eq(roles.id, roleId))
      .returning({
        id: roles.id,
        name: roles.name,
        description: roles.description,
        permissions: roles.permissions,
        isSystem: roles.isSystem,
      })

    return updated || null
  }

  /**
   * Delete a role
   */
  async deleteRole(roleId: string): Promise<boolean> {
    // Check if role exists and is not a system role
    const [existing] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)

    if (!existing) {
      return false
    }

    if (existing.isSystem) {
      throw new Error('Cannot delete system roles')
    }

    // Check if role is assigned to any users
    const [userRoleCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleId))

    if (userRoleCount && userRoleCount.count > 0) {
      throw new Error('Cannot delete role that is assigned to users')
    }

    const result = await db
      .delete(roles)
      .where(eq(roles.id, roleId))

    return true
  }

  /**
   * Get roles for a specific user
   */
  async getUserRoles(userId: string, organizationId: string): Promise<{ id: string; name: string; description: string | null }[]> {
    const userRolesList = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(
        and(
          eq(userRoles.userId, userId),
          or(
            eq(userRoles.organizationId, organizationId),
            sql`${userRoles.organizationId} IS NULL`
          )
        )
      )

    return userRolesList
  }

  /**
   * Assign roles to a user (replaces existing roles)
   */
  async assignUserRoles(
    userId: string,
    organizationId: string,
    roleNames: string[],
    assignedBy: string
  ): Promise<{ id: string; name: string; description: string | null }[]> {
    // Delete existing roles for this user in this organization
    await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          eq(userRoles.organizationId, organizationId)
        )
      )

    // Get role IDs
    const rolesList = await db
      .select({ id: roles.id, name: roles.name, description: roles.description })
      .from(roles)
      .where(sql`${roles.name} = ANY(${roleNames})`)

    // Assign new roles
    for (const role of rolesList) {
      await db.insert(userRoles).values({
        userId,
        roleId: role.id,
        organizationId,
        assignedBy,
      })
    }

    return rolesList
  }

  /**
   * Check if a user has a specific role
   */
  async userHasRole(userId: string, roleName: string, organizationId?: string): Promise<boolean> {
    const conditions = [
      eq(userRoles.userId, userId),
      eq(roles.name, roleName),
    ]

    if (organizationId) {
      conditions.push(
        or(
          eq(userRoles.organizationId, organizationId),
          sql`${userRoles.organizationId} IS NULL`
        ) as any
      )
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(...conditions))

    return (result?.count || 0) > 0
  }

  /**
   * Check if a user has a specific permission
   */
  async userHasPermission(userId: string, permission: string, organizationId?: string): Promise<boolean> {
    const conditions = [eq(userRoles.userId, userId)]

    if (organizationId) {
      conditions.push(
        or(
          eq(userRoles.organizationId, organizationId),
          sql`${userRoles.organizationId} IS NULL`
        ) as any
      )
    }

    const userRolesList = await db
      .select({
        permissions: roles.permissions,
      })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(...conditions))

    // Check if any role has the required permission
    for (const role of userRolesList) {
      const permissions = role.permissions as string[]
      if (permissions && permissions.includes(permission)) {
        return true
      }
    }

    return false
  }

  /**
   * List subscriptions for an organization (admin view)
   */
  async listOrganizationSubscriptions(organizationId: string): Promise<any[]> {
    // Get all users in the organization
    const orgUsers = await db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .where(eq(users.organizationId, organizationId))

    // Get subscriptions for each user
    const result = await Promise.all(
      orgUsers.map(async (user) => {
        const [subscription] = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.userId, user.id))
          .orderBy(desc(subscriptions.createdAt))
          .limit(1)

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
          },
          subscription: subscription || null,
        }
      })
    )

    return result
  }
}

export const adminService = new AdminService()

