import type { Context, Next } from 'hono'
import jwt from 'jsonwebtoken'
import { env } from '@/config/env'
import { db } from '@/config/database'
import { users, sessions } from '@/db/schema/index'
import { roles, userRoles } from '@/db/schema/roles'
import { eq, and, gt, or, sql } from 'drizzle-orm'

export interface AuthUser {
  id: string
  email: string
  name?: string
  organizationId?: string
  roles?: string[]
  permissions?: string[]
}

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser
    requestId: string
    startTime: number
  }
}

export const authMiddleware = () => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('authorization');
    // Note: keep auth failures JSON so frontend can surface useful errors.
    const debug_mode = env.NODE_ENV == 'development';

    if (debug_mode) {console.log("auth beings");}
    
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({
        error: { message: 'Missing or invalid authorization header', status: 401 }
      }, 401)
    }

    if (debug_mode) {console.log("header check passed");}

    const token = authHeader.slice(7)

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string, sessionId: string };

      // Verify session is still valid
      const session = await db
        .select({
          id: sessions.id,
          userId: sessions.userId,
          expiresAt: sessions.expiresAt,
        })
        .from(sessions)
        .where(and(
          eq(sessions.id, payload.sessionId),
          gt(sessions.expiresAt, new Date())
        ))
        .limit(1)

      if (debug_mode) { console.log("session table accessed successfully"); }

      if (!session.length) {
        // DEV: allow JWT-authenticated requests even if the session row is missing
        // (e.g. DB reset or using an old dev token). Still requires user to exist & be active.
        if (env.NODE_ENV !== 'development') {
          return c.json({
            error: { message: 'Invalid or expired session', status: 401 }
          }, 401)
        }

      }

      if (debug_mode) { console.log("session check passed"); }
      
      // Get user data
      const user = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
        })
        .from(users)
        .where(and(
          eq(users.id, payload.userId),
          eq(users.isActive, true)
        ))
        .limit(1)

      if (debug_mode) { console.log("user table accessed successfully"); }

      if (!user.length) {
        return c.json({
          error: { message: 'User not found or inactive', status: 401 }
        }, 401)
      }

      if (debug_mode) { console.log("user check passed"); }

      const authedUser = user[0]
      if (!authedUser) {
        return c.json({
          error: { message: 'User not found or inactive', status: 401 }
        }, 401)
      }

      // Fetch user roles and permissions
      const userRolesList = await db
        .select({
          roleName: roles.name,
          permissions: roles.permissions,
        })
        .from(userRoles)
        .innerJoin(roles, eq(userRoles.roleId, roles.id))
        .where(eq(userRoles.userId, payload.userId))

      const roleNames = userRolesList.map(r => r.roleName)
      const allPermissions = new Set<string>()
      for (const role of userRolesList) {
        const perms = role.permissions as string[]
        if (perms) {
          perms.forEach(p => allPermissions.add(p))
        }
      }

      if (debug_mode) { console.log("roles fetched:", roleNames); }

      c.set('user', {
        id: authedUser.id,
        email: authedUser.email,
        ...(authedUser.name ? { name: authedUser.name } : {}),
        roles: roleNames,
        permissions: Array.from(allPermissions),
      });
      await next();
      if (debug_mode) { console.log("auth ends"); }
      return
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return c.json({
          error: { message: 'Invalid token', status: 401 }
        }, 401)
      }
      throw error
    }
  }
}

export const optionalAuth = () => {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header('authorization')
    
    if (authHeader?.startsWith('Bearer ')) {
      const res = await authMiddleware()(c, next)
      // If authMiddleware returned a Response, auth failed; continue without auth.
      if (res) {
        return next()
      }
      // Auth succeeded; authMiddleware already called next().
      return
    }
    
    return next()
  }
}

/**
 * Convenience helper for controllers that need the authenticated userId.
 * Throws if auth middleware hasn't populated `c.get('user')`.
 */
export function getUserId(c: Context): string {
  const user = c.get('user')
  if (!user?.id) {
    throw new Error('User not authenticated')
  }
  return user.id
}

/**
 * Middleware that requires the user to have one of the specified roles.
 * Must be used AFTER authMiddleware.
 * 
 * @param allowedRoles - Array of role names that are allowed access
 * @returns Middleware function
 * 
 * @example
 * router.use(authMiddleware())
 * router.use(requireRole(['admin']))
 * router.get('/admin-only', handler)
 */
export const requireRole = (allowedRoles: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    
    if (!user) {
      return c.json({
        error: { message: 'Authentication required', status: 401 }
      }, 401)
    }

    const userRoles = user.roles || []
    const hasRole = allowedRoles.some(role => userRoles.includes(role))

    if (!hasRole) {
      return c.json({
        error: { 
          message: 'Insufficient permissions. Required role: ' + allowedRoles.join(' or '),
          status: 403 
        }
      }, 403)
    }

    await next()
  }
}

/**
 * Middleware that requires the user to have one of the specified permissions.
 * Must be used AFTER authMiddleware.
 * 
 * @param requiredPermissions - Array of permission strings (any one is sufficient)
 * @returns Middleware function
 * 
 * @example
 * router.use(authMiddleware())
 * router.use(requirePermission(['users:write']))
 * router.post('/users', handler)
 */
export const requirePermission = (requiredPermissions: string[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    
    if (!user) {
      return c.json({
        error: { message: 'Authentication required', status: 401 }
      }, 401)
    }

    const userPermissions = user.permissions || []
    const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm))

    if (!hasPermission) {
      return c.json({
        error: { 
          message: 'Insufficient permissions. Required: ' + requiredPermissions.join(' or '),
          status: 403 
        }
      }, 403)
    }

    await next()
  }
}

/**
 * Check if the current user has a specific role.
 * @param c - Hono context
 * @param roleName - Role name to check
 * @returns boolean
 */
export function hasRole(c: Context, roleName: string): boolean {
  const user = c.get('user')
  return user?.roles?.includes(roleName) || false
}

/**
 * Check if the current user has a specific permission.
 * @param c - Hono context  
 * @param permission - Permission string to check
 * @returns boolean
 */
export function hasPermission(c: Context, permission: string): boolean {
  const user = c.get('user')
  return user?.permissions?.includes(permission) || false
}