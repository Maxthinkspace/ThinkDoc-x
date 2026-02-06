import { Hono } from 'hono'
import { organizationsController } from '@/controllers/organizations'
import { teamsController } from '@/controllers/organizations'
import { authMiddleware } from '@/middleware/auth'

const organizationsRoutes = new Hono()

// Apply auth middleware to all routes
organizationsRoutes.use('*', authMiddleware())

// Organization routes
organizationsRoutes.get('/', organizationsController.getOrganization)
organizationsRoutes.get('/playbooks', organizationsController.getOrganizationPlaybooks)

// Team routes
organizationsRoutes.get('/teams', teamsController.list)
organizationsRoutes.post('/teams', teamsController.create)
organizationsRoutes.get('/teams/:id', teamsController.get)
organizationsRoutes.patch('/teams/:id', teamsController.update)
organizationsRoutes.delete('/teams/:id', teamsController.delete)
organizationsRoutes.get('/teams/:id/members', teamsController.getMembers)
organizationsRoutes.post('/teams/:id/members', teamsController.inviteMember)
organizationsRoutes.delete('/teams/:id/members/:userId', teamsController.removeMember)
organizationsRoutes.patch('/teams/:id/members/:userId', teamsController.updateMemberRole)
organizationsRoutes.get('/teams/:id/shares', teamsController.getShares)
organizationsRoutes.post('/teams/:id/shares', teamsController.shareResource)
organizationsRoutes.delete('/teams/shares/:shareId', teamsController.unshareResource)

export default organizationsRoutes

