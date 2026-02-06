import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import bcrypt from 'bcryptjs'
import jwt, { type SignOptions } from 'jsonwebtoken'
import { db } from '@/config/database'
import { users, sessions, subscriptions, passwordResetTokens, type NewUser, type NewSession, type NewPasswordResetToken } from '@/db/schema/index'
import { organizations } from '@/db/schema/organizations'
import { roles, userRoles } from '@/db/schema/roles'
import { eq, and, desc, sql, lt } from 'drizzle-orm'
import { env } from '@/config/env'
import { createId } from '@paralleldrive/cuid2'
import { nanoid } from 'nanoid'
import { logger } from '@/config/logger'
import { organizationService } from '@/services/organizations'
import { notify } from '@/services/notifications'
import { passwordResetEmailTemplate } from '@/services/email-templates'
import { Resend } from 'resend'

// Helper function to get user roles and permissions
async function getUserRolesAndPermissions(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
  const userRolesList = await db
    .select({
      roleName: roles.name,
      permissions: roles.permissions,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId))

  const roleNames = userRolesList.map(r => r.roleName)
  const allPermissions = new Set<string>()
  for (const role of userRolesList) {
    const perms = role.permissions as string[]
    if (perms) {
      perms.forEach(p => allPermissions.add(p))
    }
  }

  return {
    roles: roleNames,
    permissions: Array.from(allPermissions),
  }
}

// Helper function to assign default role to new user
async function assignDefaultRole(userId: string, organizationId?: string): Promise<void> {
  const [defaultRole] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, 'user'))
    .limit(1)

  if (defaultRole) {
    await db.insert(userRoles).values({
      userId,
      roleId: defaultRole.id,
      organizationId: organizationId || null,
      assignedBy: null,
    }).onConflictDoNothing()
  }
}

export const authController = {
  async register(c: Context) {
    const { email, password, name } = await c.req.json()
    
    if (!email || !password) {
      throw new HTTPException(400, { message: 'Email and password are required' })
    }
    
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    
    if (existingUser.length > 0) {
      throw new HTTPException(409, { message: 'User already exists' })
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Get or create organization for user's email domain
    let organizationId: string | undefined
    try {
      const org = await organizationService.getOrCreateByDomain(email)
      organizationId = org.id
    } catch (e: any) {
      // Log error but don't fail registration if org creation fails
      logger.error({ error: e }, 'Failed to create/get organization')
    }
    
    // Create user
    const newUser: NewUser = {
      email,
      name,
      passwordHash,
      organizationId,
    }
    // Let database generate UUID using gen_random_uuid()
    
    const [user] = await db
      .insert(users)
      .values(newUser)
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
      })
    
    if (!user) {
      throw new HTTPException(500, { message: 'Failed to create user' })
    }

    // Create session
    const sessionToken = nanoid(64)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    const newSession: NewSession = {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    }
    
    const [session] = await db.insert(sessions).values(newSession).returning()
    
    if (!session) {
      throw new HTTPException(500, { message: 'Failed to create session' })
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, sessionId: session.id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
    )

    // Assign default 'user' role
    await assignDefaultRole(user.id, organizationId)

    // Get roles and permissions
    const { roles: userRoleNames, permissions } = await getUserRolesAndPermissions(user.id)

    // Send welcome notification (don't await - fire and forget)
    notify(user.id, 'welcome', {
      userEmail: user.email,
      userName: user.name,
    }).catch((error) => {
      logger.error({ error }, 'Failed to send welcome notification')
    })

    return c.json({
      user: {
        ...user,
        roles: userRoleNames,
        permissions,
      },
      token,
      expiresAt,
    }, 201)
  },

  async login(c: Context) {
    const { email, password } = await c.req.json()
    
    if (!email || !password) {
      throw new HTTPException(400, { message: 'Email and password are required' })
    }
    
    // Find user
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    
    if (!user || !user.passwordHash) {
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash)
    
    if (!passwordValid) {
      throw new HTTPException(401, { message: 'Invalid credentials' })
    }
    
    // Query user's active subscription (get the most recent active one)
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        subscriptionType: subscriptions.subscriptionType,
        status: subscriptions.status,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        trialEndDate: subscriptions.trialEndDate,
        autoRenew: subscriptions.autoRenew,
        currency: subscriptions.currency,
        billingPeriod: subscriptions.billingPeriod,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)

    // Create session
    const sessionToken = nanoid(64)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    
    const newSession: NewSession = {
      userId: user.id,
      token: sessionToken,
      expiresAt,
    }
    
    const [session] = await db.insert(sessions).values(newSession).returning()
    
    if (!session) {
      throw new HTTPException(500, { message: 'Failed to create session' })
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, sessionId: session.id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN } as SignOptions
    )

    // Get roles and permissions
    const { roles: userRoleNames, permissions } = await getUserRolesAndPermissions(user.id)
    
    return c.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roles: userRoleNames,
        permissions,
        subscription: subscription || null,
      },
      token,
      expiresAt,
    })
  },

  async logout(c: Context) {
    const authHeader = c.req.header('authorization')
    
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      
      try {
        const payload = jwt.verify(token, env.JWT_SECRET) as { sessionId: string }
        
        // Delete session
        await db
          .delete(sessions)
          .where(eq(sessions.id, payload.sessionId))
      } catch {
        // Token invalid, continue with logout
      }
    }
    
    return c.json({ message: 'Logged out successfully' })
  },

  async me(c: Context) {
    const authUser = c.get('user')
    
    // Query full user information including timestamps and organizationId
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1)
    
    if (!user) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Query user's organization if organizationId exists
    let organization = null
    if (user.organizationId) {
      const [org] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          domain: organizations.domain,
        })
        .from(organizations)
        .where(eq(organizations.id, user.organizationId))
        .limit(1)
      
      if (org) {
        organization = org
      }
    }
    
    // Query user's active subscription (get the most recent active one)
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        subscriptionType: subscriptions.subscriptionType,
        status: subscriptions.status,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        trialEndDate: subscriptions.trialEndDate,
        autoRenew: subscriptions.autoRenew,
        currency: subscriptions.currency,
        billingPeriod: subscriptions.billingPeriod,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, user.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)
    
    // Get roles and permissions
    const { roles: userRoleNames, permissions } = await getUserRolesAndPermissions(user.id)

    return c.json({ 
      user: {
        ...user,
        roles: userRoleNames,
        permissions,
        organization: organization || null,
        subscription: subscription || null,
      }
    })
  },

  async updateMe(c: Context) {
    const authUser = c.get('user')
    const updates = await c.req.json()
    
    // Only allow updating name and email
    const updateData: any = { updatedAt: new Date() }
    if (updates.name !== undefined) {
      updateData.name = updates.name
    }
    if (updates.email !== undefined) {
      // Check if email is already taken by another user
      if (updates.email !== authUser.email) {
        const [existingUser] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.email, updates.email))
          .limit(1)
        
        if (existingUser) {
          throw new HTTPException(409, { message: 'Email already in use' })
        }
      }
      updateData.email = updates.email
    }

    // Update user
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, authUser.id))

    // Fetch updated user
    const [updatedUser] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        organizationId: users.organizationId,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1)
    
    if (!updatedUser) {
      throw new HTTPException(404, { message: 'User not found' })
    }

    // Query user's organization if organizationId exists
    let organization = null
    if (updatedUser.organizationId) {
      const [org] = await db
        .select({
          id: organizations.id,
          name: organizations.name,
          domain: organizations.domain,
        })
        .from(organizations)
        .where(eq(organizations.id, updatedUser.organizationId))
        .limit(1)
      
      if (org) {
        organization = org
      }
    }
    
    // Query user's active subscription
    const [subscription] = await db
      .select({
        id: subscriptions.id,
        subscriptionType: subscriptions.subscriptionType,
        status: subscriptions.status,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        trialEndDate: subscriptions.trialEndDate,
        autoRenew: subscriptions.autoRenew,
        currency: subscriptions.currency,
        billingPeriod: subscriptions.billingPeriod,
      })
      .from(subscriptions)
      .where(eq(subscriptions.userId, updatedUser.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1)
    
    // Get roles and permissions
    const { roles: userRoleNames, permissions } = await getUserRolesAndPermissions(updatedUser.id)

    logger.info({ userId: updatedUser.id, updates }, 'User updated their profile')

    return c.json({ 
      user: {
        ...updatedUser,
        roles: userRoleNames,
        permissions,
        organization: organization || null,
        subscription: subscription || null,
      }
    })
  },

  async forgotPassword(c: Context) {
    const { email } = await c.req.json()
    
    if (!email) {
      throw new HTTPException(400, { message: 'Email is required' })
    }
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)
    
    // Don't reveal if user exists or not (security best practice)
    // Always return success message even if user doesn't exist
    if (user) {
      // Generate reset token
      const resetToken = nanoid(64)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour from now
      
      // Invalidate any existing reset tokens for this user
      await db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, user.id))
      
      // Create new reset token
      const newResetToken: NewPasswordResetToken = {
        userId: user.id,
        token: resetToken,
        expiresAt,
      }
      
      await db.insert(passwordResetTokens).values(newResetToken)
      
      // Send password reset email
      try {
        if (env.RESEND_API_KEY && env.RESEND_FROM_EMAIL) {
          const resend = new Resend(env.RESEND_API_KEY)
          const { subject, html } = {
            subject: 'Reset Your Password',
            html: passwordResetEmailTemplate(resetToken, user.name),
          }
          
          const { error } = await resend.emails.send({
            from: env.RESEND_FROM_EMAIL,
            to: user.email,
            subject,
            html,
          })
          
          if (error) {
            logger.error({ error, userId: user.id }, 'Resend failed to send password reset email')
          } else {
            logger.info({ userId: user.id, email: user.email }, 'Password reset email sent')
          }
        } else {
          logger.warn({ userId: user.id }, 'Resend not configured, password reset email not sent')
          // In development, log the token for testing
          logger.info({ resetToken, expiresAt }, 'Password reset token (development only)')
        }
      } catch (error) {
        logger.error({ error, userId: user.id }, 'Failed to send password reset email')
        // Don't fail the request if email fails - token is still created
      }
    }
    
    // Always return success to prevent email enumeration
    return c.json({ message: 'If an account with that email exists, a password reset link has been sent.' })
  },

  async resetPassword(c: Context) {
    const { token, password } = await c.req.json()
    
    if (!token || !password) {
      throw new HTTPException(400, { message: 'Token and password are required' })
    }
    
    if (password.length < 8) {
      throw new HTTPException(400, { message: 'Password must be at least 8 characters long' })
    }
    
    // Find reset token
    const [resetTokenRecord] = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1)
    
    if (!resetTokenRecord) {
      throw new HTTPException(400, { message: 'Invalid or expired reset token' })
    }
    
    // Check if token has been used
    if (resetTokenRecord.usedAt) {
      throw new HTTPException(400, { message: 'This reset token has already been used' })
    }
    
    // Check if token has expired
    if (new Date() > resetTokenRecord.expiresAt) {
      throw new HTTPException(400, { message: 'This reset token has expired' })
    }
    
    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12)
    
    // Update user password
    await db
      .update(users)
      .set({ 
        passwordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, resetTokenRecord.userId))
    
    // Mark token as used
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetTokenRecord.id))
    
    // Invalidate all sessions for this user (force re-login)
    await db
      .delete(sessions)
      .where(eq(sessions.userId, resetTokenRecord.userId))
    
    logger.info({ userId: resetTokenRecord.userId }, 'Password reset successful')
    
    return c.json({ message: 'Password has been reset successfully' })
  },

  async verifyResetToken(c: Context) {
    const token = c.req.param('token')
    
    if (!token) {
      throw new HTTPException(400, { message: 'Token is required' })
    }
    
    // Find reset token
    const [resetTokenRecord] = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
      })
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token))
      .limit(1)
    
    if (!resetTokenRecord) {
      return c.json({ valid: false })
    }
    
    // Check if token has been used
    if (resetTokenRecord.usedAt) {
      return c.json({ valid: false })
    }
    
    // Check if token has expired
    if (new Date() > resetTokenRecord.expiresAt) {
      return c.json({ valid: false })
    }
    
    // Get user email
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, resetTokenRecord.userId))
      .limit(1)
    
    return c.json({ 
      valid: true,
      email: user?.email,
    })
  },

  async changePassword(c: Context) {
    const authUser = c.get('user')
    const { currentPassword, newPassword } = await c.req.json()
    
    if (!currentPassword || !newPassword) {
      throw new HTTPException(400, { message: 'Current password and new password are required' })
    }
    
    if (newPassword.length < 8) {
      throw new HTTPException(400, { message: 'New password must be at least 8 characters long' })
    }
    
    // Get user with password hash
    const [user] = await db
      .select({
        id: users.id,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1)
    
    if (!user || !user.passwordHash) {
      throw new HTTPException(404, { message: 'User not found' })
    }
    
    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    
    if (!passwordValid) {
      throw new HTTPException(401, { message: 'Current password is incorrect' })
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12)
    
    // Update user password
    await db
      .update(users)
      .set({ 
        passwordHash: newPasswordHash,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id))
    
    logger.info({ userId: user.id }, 'Password changed successfully')
    
    return c.json({ message: 'Password has been changed successfully' })
  },
}