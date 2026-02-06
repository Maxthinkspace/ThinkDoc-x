import { db } from '@/config/database'
import { users, subscriptions } from '@/db/schema/index'
import { roles, userRoles } from '@/db/schema/roles'
import { organizations } from '@/db/schema/organizations'
import { eq, and, desc, sql, ilike, or, gte, lte, count, inArray } from 'drizzle-orm'
import { HTTPException } from 'hono/http-exception'
import { logger } from '@/config/logger'

export interface PlatformStats {
  totalUsers: number
  totalOrganizations: number
  totalSubscriptions: number
  activeSubscriptions: number
  trialingSubscriptions: number
  canceledSubscriptions: number
  recentSignups: number // Last 7 days
}

export interface UserWithOrg {
  id: string
  email: string
  name: string | null
  isActive: boolean
  organizationId: string | null
  organizationName: string | null
  createdAt: Date
  roles: string[]
  subscription?: {
    id: string
    subscriptionType: string
    status: string
    endDate: Date | null
  } | null
}

export interface OrganizationWithStats {
  id: string
  name: string
  domain: string | null
  createdAt: Date
  userCount: number
  activeSubscriptionCount: number
}

export interface ListAllUsersParams {
  page?: number
  limit?: number
  search?: string
  organizationId?: string
  role?: string
  isActive?: boolean
}

export interface ListAllSubscriptionsParams {
  page?: number
  limit?: number
  status?: string
  organizationId?: string
}

export class SuperAdminService {
  /**
   * Get platform-wide statistics
   */
  async getPlatformStats(): Promise<PlatformStats> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const [totalUsers] = await db.select({ count: count() }).from(users)
    const [totalOrgs] = await db.select({ count: count() }).from(organizations)
    const [totalSubs] = await db.select({ count: count() }).from(subscriptions)
    
    const [activeSubs] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'active'))
    
    const [trialingSubs] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'trialing'))
    
    const [canceledSubs] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.status, 'canceled'))
    
    const [recentSignups] = await db
      .select({ count: count() })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo))

    return {
      totalUsers: totalUsers.count,
      totalOrganizations: totalOrgs.count,
      totalSubscriptions: totalSubs.count,
      activeSubscriptions: activeSubs.count,
      trialingSubscriptions: trialingSubs.count,
      canceledSubscriptions: canceledSubs.count,
      recentSignups: recentSignups.count,
    }
  }

  /**
   * List all users across all organizations
   */
  async listAllUsers(params: ListAllUsersParams = {}): Promise<{ users: UserWithOrg[], total: number }> {
    const { page = 1, limit = 50, search, organizationId, role, isActive } = params
    const offset = (page - 1) * limit

    // Build where conditions
    const conditions: any[] = []
    
    if (search) {
      conditions.push(
        or(
          ilike(users.email, `%${search}%`),
          ilike(users.name, `%${search}%`)
        )
      )
    }
    
    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId))
    }
    
    if (isActive !== undefined) {
      conditions.push(eq(users.isActive, isActive))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause)

    // Get users first (without roles to avoid GROUP BY complexity)
    const usersList = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset)

    // Get organization names for users
    const orgIds = [...new Set(usersList.map(u => u.organizationId).filter(Boolean) as string[])]
    const orgsMap = new Map<string, string>()
    if (orgIds.length > 0) {
      const orgs = await db
        .select({
          id: organizations.id,
          name: organizations.name,
        })
        .from(organizations)
        .where(inArray(organizations.id, orgIds))
      
      orgs.forEach(org => orgsMap.set(org.id, org.name))
    }

    // Get roles for all users in one query
    const userIds = usersList.map(u => u.id)
    const userRolesData = userIds.length > 0
      ? await db
          .select({
            userId: userRoles.userId,
            roleName: roles.name,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(inArray(userRoles.userId, userIds))
      : []

    // Group roles by user ID
    const rolesByUserId = new Map<string, string[]>()
    userRolesData.forEach(ur => {
      const existing = rolesByUserId.get(ur.userId) || []
      if (!existing.includes(ur.roleName)) {
        rolesByUserId.set(ur.userId, [...existing, ur.roleName])
      }
    })

    // Filter by role if specified
    let filteredUsers = usersList
    if (role) {
      filteredUsers = usersList.filter(u => {
        const userRoles = rolesByUserId.get(u.id) || []
        return userRoles.includes(role)
      })
    }

    // Get subscriptions for users
    const filteredUserIds = filteredUsers.map(u => u.id)
    const subsData = filteredUserIds.length > 0
      ? await db
          .select({
            userId: subscriptions.userId,
            id: subscriptions.id,
            subscriptionType: subscriptions.subscriptionType,
            status: subscriptions.status,
            endDate: subscriptions.endDate,
          })
          .from(subscriptions)
          .where(inArray(subscriptions.userId, filteredUserIds))
      : []

    const subsByUserId = new Map(subsData.map(s => [s.userId, s]))

    const usersWithSubs: UserWithOrg[] = filteredUsers.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      isActive: u.isActive,
      organizationId: u.organizationId,
      organizationName: u.organizationId ? (orgsMap.get(u.organizationId) || null) : null,
      createdAt: u.createdAt,
      roles: rolesByUserId.get(u.id) || [],
      subscription: subsByUserId.get(u.id) || null,
    }))

    return {
      users: usersWithSubs,
      total: totalResult.count,
    }
  }

  /**
   * Get a single user by ID with full details
   */
  async getUserById(userId: string): Promise<UserWithOrg | null> {
    const [userData] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        isActive: users.isActive,
        organizationId: users.organizationId,
        organizationName: organizations.name,
        createdAt: users.createdAt,
        roles: sql<string[]>`COALESCE(json_agg(DISTINCT ${roles.name}) FILTER (WHERE ${roles.name} IS NOT NULL), '[]')`,
      })
      .from(users)
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .leftJoin(userRoles, eq(users.id, userRoles.userId))
      .leftJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(users.id, userId))
      .groupBy(users.id, organizations.name)
      .limit(1)

    if (!userData) return null

    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)

    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      isActive: userData.isActive,
      organizationId: userData.organizationId,
      organizationName: userData.organizationName,
      createdAt: userData.createdAt,
      roles: userData.roles,
      subscription: subscription ? {
        id: subscription.id,
        subscriptionType: subscription.subscriptionType,
        status: subscription.status,
        endDate: subscription.endDate,
      } : null,
    }
  }

  /**
   * Update any user
   */
  async updateUser(userId: string, updates: {
    name?: string
    email?: string
    isActive?: boolean
    organizationId?: string | null
  }): Promise<UserWithOrg> {
    const updateData: any = { updatedAt: new Date() }
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.email !== undefined) updateData.email = updates.email
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive
    if (updates.organizationId !== undefined) updateData.organizationId = updates.organizationId

    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))

    const updated = await this.getUserById(userId)
    if (!updated) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    logger.info({ userId, updates }, 'Super admin updated user')
    return updated
  }

  /**
   * Assign roles to a user (superadmin can assign any role including admin and superadmin)
   */
  async assignUserRoles(
    userId: string,
    roleNames: string[],
    assignedBy: string,
    organizationId?: string | null
  ): Promise<{ id: string; name: string; description: string | null }[]> {
    // Verify user exists
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Use user's organizationId if not provided
    const targetOrgId = organizationId !== undefined ? organizationId : user.organizationId

    // Delete existing roles for this user (in the specified organization or globally)
    await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, userId),
          targetOrgId !== null && targetOrgId !== undefined
            ? eq(userRoles.organizationId, targetOrgId)
            : sql`${userRoles.organizationId} IS NULL`
        )
      )

    // Get role IDs for the requested roles (including admin and superadmin)
    // If roleNames is empty, we're removing all roles (already deleted above)
    let rolesList: { id: string; name: string; description: string | null }[] = []
    
    if (roleNames.length > 0) {
      rolesList = await db
        .select({ id: roles.id, name: roles.name, description: roles.description })
        .from(roles)
        .where(inArray(roles.name, roleNames))

      if (rolesList.length !== roleNames.length) {
        const foundRoleNames = rolesList.map(r => r.name)
        const missingRoles = roleNames.filter(r => !foundRoleNames.includes(r))
        throw new HTTPException(400, { message: `Invalid role names: ${missingRoles.join(', ')}` })
      }

      // Assign new roles
      for (const role of rolesList) {
        await db.insert(userRoles).values({
          userId,
          roleId: role.id,
          organizationId: targetOrgId,
          assignedBy,
        })
      }
    }

    logger.info({ userId, roleNames, organizationId: targetOrgId, assignedBy }, 'Super admin assigned roles to user')
    return rolesList
  }

  /**
   * List all organizations with statistics
   */
  async listAllOrganizations(): Promise<OrganizationWithStats[]> {
    const orgsData = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        domain: organizations.domain,
        createdAt: organizations.createdAt,
        userCount: sql<number>`COUNT(DISTINCT ${users.id})`,
        activeSubscriptionCount: sql<number>`COUNT(DISTINCT CASE WHEN ${subscriptions.status} = 'active' THEN ${subscriptions.id} END)`,
      })
      .from(organizations)
      .leftJoin(users, eq(organizations.id, users.organizationId))
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .groupBy(organizations.id)
      .orderBy(desc(organizations.createdAt))

    return orgsData.map(org => ({
      id: org.id,
      name: org.name,
      domain: org.domain,
      createdAt: org.createdAt,
      userCount: Number(org.userCount) || 0,
      activeSubscriptionCount: Number(org.activeSubscriptionCount) || 0,
    }))
  }

  /**
   * List all subscriptions across all organizations
   */
  async listAllSubscriptions(params: ListAllSubscriptionsParams = {}): Promise<{ subscriptions: any[], total: number }> {
    const { page = 1, limit = 50, status, organizationId } = params
    const offset = (page - 1) * limit

    const conditions: any[] = []
    if (status) {
      conditions.push(eq(subscriptions.status, status))
    }
    if (organizationId) {
      conditions.push(eq(users.organizationId, organizationId))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    const [totalResult] = await db
      .select({ count: count() })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .where(whereClause)

    const subsData = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        userEmail: users.email,
        userName: users.name,
        organizationId: users.organizationId,
        organizationName: organizations.name,
        subscriptionType: subscriptions.subscriptionType,
        status: subscriptions.status,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        trialEndDate: subscriptions.trialEndDate,
        autoRenew: subscriptions.autoRenew,
        currency: subscriptions.currency,
        billingPeriod: subscriptions.billingPeriod,
        createdAt: subscriptions.createdAt,
        updatedAt: subscriptions.updatedAt,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .leftJoin(organizations, eq(users.organizationId, organizations.id))
      .where(whereClause)
      .orderBy(desc(subscriptions.createdAt))
      .limit(limit)
      .offset(offset)

    return {
      subscriptions: subsData,
      total: totalResult.count,
    }
  }

  /**
   * Update any subscription
   */
  async updateSubscription(subscriptionId: string, updates: {
    status?: string
    subscriptionType?: string
    endDate?: Date | null
    autoRenew?: boolean
  }): Promise<any> {
    const updateData: any = { updatedAt: new Date() }
    if (updates.status !== undefined) updateData.status = updates.status
    if (updates.subscriptionType !== undefined) updateData.subscriptionType = updates.subscriptionType
    if (updates.endDate !== undefined) updateData.endDate = updates.endDate
    if (updates.autoRenew !== undefined) updateData.autoRenew = updates.autoRenew

    const [updated] = await db
      .update(subscriptions)
      .set(updateData)
      .where(eq(subscriptions.id, subscriptionId))
      .returning()

    if (!updated) {
      throw new HTTPException(404, { message: 'Subscription not found' })
    }

    logger.info({ subscriptionId, updates }, 'Super admin updated subscription')
    return updated
  }
}

export const superAdminService = new SuperAdminService()

