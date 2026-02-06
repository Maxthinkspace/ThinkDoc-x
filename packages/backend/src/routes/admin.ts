import { Hono } from 'hono'
import { adminController } from '@/controllers/admin'
import { authMiddleware, requireRole } from '@/middleware/auth'

const adminRoutes = new Hono()

// Apply auth middleware to all routes
adminRoutes.use('*', authMiddleware())

// Apply admin role requirement to all admin routes
adminRoutes.use('*', requireRole(['admin']))

// User management routes
adminRoutes.get('/users', adminController.listUsers)
adminRoutes.post('/users', adminController.inviteUser)
adminRoutes.get('/users/:id', adminController.getUser)
adminRoutes.patch('/users/:id', adminController.updateUser)
adminRoutes.delete('/users/:id', adminController.removeUser)

// Role management routes
adminRoutes.get('/roles', adminController.listRoles)
adminRoutes.post('/roles', adminController.createRole)
adminRoutes.patch('/roles/:id', adminController.updateRole)
adminRoutes.delete('/roles/:id', adminController.deleteRole)
adminRoutes.get('/users/:id/roles', adminController.getUserRoles)
adminRoutes.put('/users/:id/roles', adminController.assignUserRoles)

// Subscription management routes (admin view)
adminRoutes.get('/subscriptions', adminController.listOrganizationSubscriptions)

export default adminRoutes

