import { Hono } from 'hono'
import { libraryController } from '@/controllers/library'
import { authMiddleware } from '@/middleware/auth'

const libraryRoutes = new Hono()

// Handle OPTIONS requests without auth (for CORS preflight)
libraryRoutes.options('*', (c) => c.text('', 200))

// Apply auth middleware to all non-OPTIONS routes
libraryRoutes.use('*', async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    return next()
  }
  // Call auth middleware - it will return a Response on auth failure, or void on success
  return authMiddleware()(c, next)
})

// Tags
libraryRoutes.get('/tags', libraryController.listTags)
libraryRoutes.post('/tags', libraryController.createTag)
libraryRoutes.patch('/tags/:id', libraryController.updateTag)
libraryRoutes.delete('/tags/:id', libraryController.deleteTag)

// Labels
libraryRoutes.get('/labels', libraryController.listLabels)
libraryRoutes.post('/labels', libraryController.createLabel)
libraryRoutes.patch('/labels/:id', libraryController.updateLabel)
libraryRoutes.delete('/labels/:id', libraryController.deleteLabel)

// Clauses
libraryRoutes.get('/clauses', libraryController.listClauses)
libraryRoutes.post('/clauses', libraryController.createClause)
libraryRoutes.get('/clauses/:id', libraryController.getClause)
libraryRoutes.patch('/clauses/:id', libraryController.updateClause)
libraryRoutes.delete('/clauses/:id', libraryController.deleteClause)
libraryRoutes.get('/clauses/:id/versions', libraryController.getClauseVersions)
libraryRoutes.post('/clauses/:id/versions', libraryController.createClauseVersion)
libraryRoutes.post('/clauses/:id/restore/:versionId', libraryController.restoreClauseVersion)

// Projects
libraryRoutes.get('/projects', libraryController.listProjects)
libraryRoutes.post('/projects', libraryController.createProject)
libraryRoutes.get('/projects/:id', libraryController.getProject)
libraryRoutes.patch('/projects/:id', libraryController.updateProject)
libraryRoutes.delete('/projects/:id', libraryController.deleteProject)
libraryRoutes.post('/projects/:id/items', libraryController.addProjectItem)
libraryRoutes.delete('/projects/:id/items/:itemId', libraryController.removeProjectItem)

// Playbooks
libraryRoutes.get('/playbooks', libraryController.listPlaybooks)
libraryRoutes.post('/playbooks', libraryController.createPlaybook)
libraryRoutes.get('/playbooks/:id', libraryController.getPlaybook)
libraryRoutes.patch('/playbooks/:id', libraryController.updatePlaybook)
libraryRoutes.delete('/playbooks/:id', libraryController.deletePlaybook)
libraryRoutes.post('/playbooks/:id/rules', libraryController.updatePlaybookRules)
libraryRoutes.post('/playbooks/:id/rules/:ruleId/link-clause', libraryController.linkRuleToClause)
libraryRoutes.get('/playbooks/:id/versions', libraryController.getPlaybookVersions)
libraryRoutes.post('/playbooks/:id/restore/:versionId', libraryController.restorePlaybookVersion)

// Unified search
libraryRoutes.post('/search', libraryController.search)

export default libraryRoutes

