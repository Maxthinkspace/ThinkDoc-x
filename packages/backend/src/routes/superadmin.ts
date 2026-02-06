import { Hono } from 'hono'
import { superAdminController } from '@/controllers/superadmin'
import { authMiddleware, requireRole } from '@/middleware/auth'

const superAdminRoutes = new Hono()

// Apply authMiddleware to all superadmin routes
superAdminRoutes.use('*', authMiddleware())
// Apply requireRole('superadmin') middleware to all superadmin routes
superAdminRoutes.use('*', requireRole(['superadmin']))

// Platform Statistics
superAdminRoutes.get('/stats', superAdminController.getStats)

// User Management (across all organizations)
superAdminRoutes.get('/users', superAdminController.listUsers)
superAdminRoutes.get('/users/:id', superAdminController.getUser)
superAdminRoutes.patch('/users/:id', superAdminController.updateUser)
superAdminRoutes.put('/users/:id/roles', superAdminController.assignUserRoles)
superAdminRoutes.post('/users/:id/impersonate', superAdminController.impersonateUser)

// Organization Management
superAdminRoutes.get('/organizations', superAdminController.listOrganizations)

// Subscription Management (across all organizations)
superAdminRoutes.get('/subscriptions', superAdminController.listSubscriptions)
superAdminRoutes.patch('/subscriptions/:id', superAdminController.updateSubscription)

export default superAdminRoutes

