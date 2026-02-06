import { Hono } from 'hono'
import { documentVersionsController } from '@/controllers/document-versions'
import { authMiddleware } from '@/middleware/auth'

const documentVersionsRoutes = new Hono()

// Apply auth middleware to all routes
documentVersionsRoutes.use('*', authMiddleware)

// Document version routes
documentVersionsRoutes.get('/', documentVersionsController.list)
documentVersionsRoutes.post('/', documentVersionsController.createDocument)
documentVersionsRoutes.get('/:id', documentVersionsController.get)
documentVersionsRoutes.post('/:id/versions', documentVersionsController.saveMainVersion)
documentVersionsRoutes.post('/:id/versions/:versionId/sub', documentVersionsController.saveSubVersion)
documentVersionsRoutes.get('/:id/versions/:versionId', documentVersionsController.getVersion)
documentVersionsRoutes.post('/:id/restore/:versionId', documentVersionsController.restoreVersion)
documentVersionsRoutes.get('/:id/compare', documentVersionsController.compareVersions)
documentVersionsRoutes.get('/:id/export-redline', documentVersionsController.exportRedlinePdf)

export default documentVersionsRoutes

