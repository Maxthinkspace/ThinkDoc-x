import { createOpenAPIApp } from '@/lib/openapi'
import { documentsController } from '@/controllers/documents'
import { authMiddleware } from '@/middleware/auth'
import {
  listDocumentsRoute,
  getDocumentRoute,
  createDocumentRoute,
  updateDocumentRoute,
  deleteDocumentRoute,
} from '@/schemas/documents'

const documents = createOpenAPIApp()

// Apply auth middleware to all routes
documents.use(authMiddleware())

// Routes with OpenAPI documentation
documents.openapi(listDocumentsRoute, documentsController.list)
documents.openapi(getDocumentRoute, documentsController.get)
documents.openapi(createDocumentRoute, documentsController.create)
documents.openapi(updateDocumentRoute, documentsController.update)
documents.openapi(deleteDocumentRoute, documentsController.delete)

export { documents }