import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { logger } from '@/config/logger'
import { documentVersionService } from '@/services/document-versions'
import { generateRedlinePdf } from '@/services/redline-pdf-service'

export const documentVersionsController = {
  /**
   * List user's documents
   */
  async list(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const documents = await documentVersionService.listDocuments(user.id)
      return c.json({ data: documents })
    } catch (error) {
      logger.error({ error }, 'Failed to list documents')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch documents' })
    }
  },

  /**
   * Get document with version history
   */
  async get(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const history = await documentVersionService.getVersionHistory(id)

      return c.json({ data: history })
    } catch (error) {
      logger.error({ error }, 'Failed to get document')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to fetch document' })
    }
  },

  /**
   * Save new main version
   */
  async saveMainVersion(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const body = await c.req.json()
      const {
        documentName,
        content,
        fileBlob,
        description,
        editorName,
        status,
        documentType,
        matterReference,
      } = body

      if (!description || !editorName) {
        throw new HTTPException(400, { message: 'description and editorName are required' })
      }

      // Convert base64 fileBlob to Buffer if provided
      let fileBuffer: Buffer | undefined
      if (fileBlob) {
        fileBuffer = Buffer.from(fileBlob, 'base64')
      }

      const version = await documentVersionService.saveVersion(user.id, {
        documentId: id,
        documentName: documentName || '',
        content: content || '',
        fileBlob: fileBuffer,
        description,
        editorName,
        editorUserId: user.id,
        isMainVersion: true,
        status,
        documentType,
        matterReference,
      })

      return c.json({ data: version }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to save main version')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to save version' })
    }
  },

  /**
   * Save sub-version
   */
  async saveSubVersion(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id, versionId } = c.req.param()
      const body = await c.req.json()
      const {
        documentName,
        content,
        fileBlob,
        description,
        editorName,
      } = body

      if (!description || !editorName) {
        throw new HTTPException(400, { message: 'description and editorName are required' })
      }

      // Convert base64 fileBlob to Buffer if provided
      let fileBuffer: Buffer | undefined
      if (fileBlob) {
        fileBuffer = Buffer.from(fileBlob, 'base64')
      }

      // Get document first to ensure it exists
      const doc = await documentVersionService.getDocument(id)
      if (!doc) {
        throw new HTTPException(404, { message: 'Document not found' })
      }

      const version = await documentVersionService.saveVersion(user.id, {
        documentId: id,
        documentName: documentName || doc.name,
        content: content || '',
        fileBlob: fileBuffer,
        description,
        editorName,
        editorUserId: user.id,
        isMainVersion: false,
      })

      return c.json({ data: version }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to save sub-version')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to save sub-version' })
    }
  },

  /**
   * Get specific version
   */
  async getVersion(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id, versionId } = c.req.param()
      const isSubVersion = c.req.query('subVersion') === 'true'

      const version = await documentVersionService.getVersion(versionId, isSubVersion)
      if (!version) {
        throw new HTTPException(404, { message: 'Version not found' })
      }

      return c.json({ data: version })
    } catch (error) {
      logger.error({ error }, 'Failed to get version')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to fetch version' })
    }
  },

  /**
   * Restore to version
   */
  async restoreVersion(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id, versionId } = c.req.param()
      const body = await c.req.json()
      const { description, editorName } = body
      const isSubVersion = c.req.query('subVersion') === 'true'

      if (!description || !editorName) {
        throw new HTTPException(400, { message: 'description and editorName are required' })
      }

      await documentVersionService.restoreVersion(
        id,
        versionId,
        isSubVersion,
        user.id,
        editorName,
        description
      )

      return c.json({ message: 'Version restored successfully' })
    } catch (error) {
      logger.error({ error }, 'Failed to restore version')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to restore version' })
    }
  },

  /**
   * Compare two versions
   */
  async compareVersions(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const { versionAId, versionBId, isSubVersionA, isSubVersionB } = c.req.query()

      if (!versionAId || !versionBId) {
        throw new HTTPException(400, { message: 'versionAId and versionBId are required' })
      }

      const comparison = await documentVersionService.compareVersions(
        versionAId,
        versionBId,
        isSubVersionA === 'true',
        isSubVersionB === 'true'
      )

      return c.json({ data: comparison })
    } catch (error) {
      logger.error({ error }, 'Failed to compare versions')
      if (error instanceof HTTPException) throw error
      if (error instanceof Error && error.message.includes('not found')) {
        throw new HTTPException(404, { message: error.message })
      }
      throw new HTTPException(500, { message: 'Failed to compare versions' })
    }
  },

  /**
   * Create new document with first version
   */
  async createDocument(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const body = await c.req.json()
      const {
        documentName,
        content,
        fileBlob,
        description,
        editorName,
        status,
        documentType,
        matterReference,
      } = body

      if (!description || !editorName || !documentName) {
        throw new HTTPException(400, { message: 'documentName, description and editorName are required' })
      }

      // Convert base64 fileBlob to Buffer if provided
      let fileBuffer: Buffer | undefined
      if (fileBlob) {
        fileBuffer = Buffer.from(fileBlob, 'base64')
      }

      const version = await documentVersionService.saveVersion(user.id, {
        documentId: undefined, // null for new document
        documentName,
        content: content || '',
        fileBlob: fileBuffer,
        description,
        editorName,
        editorUserId: user.id,
        isMainVersion: true,
        status,
        documentType,
        matterReference,
      })

      return c.json({ data: version }, 201)
    } catch (error) {
      logger.error({ error }, 'Failed to create document')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to create document' })
    }
  },

  /**
   * Export redline PDF comparing two versions
   */
  async exportRedlinePdf(c: Context) {
    try {
      const user = c.get('user')
      if (!user?.id) {
        throw new HTTPException(401, { message: 'Authentication required' })
      }

      const { id } = c.req.param()
      const { versionAId, versionBId, isSubVersionA, isSubVersionB } = c.req.query()

      if (!versionAId || !versionBId) {
        throw new HTTPException(400, { message: 'versionAId and versionBId are required' })
      }

      // Get document to verify ownership
      const doc = await documentVersionService.getDocument(id)
      if (!doc) {
        throw new HTTPException(404, { message: 'Document not found' })
      }

      if (doc.userId !== user.id) {
        throw new HTTPException(403, { message: 'Access denied' })
      }

      // Get both versions
      const versionA = await documentVersionService.getVersion(versionAId, isSubVersionA === 'true')
      const versionB = await documentVersionService.getVersion(versionBId, isSubVersionB === 'true')

      if (!versionA || !versionB) {
        throw new HTTPException(404, { message: 'One or both versions not found' })
      }

      // Get version labels
      const versionTree = await documentVersionService.getVersionHistory(id)
      const getVersionLabel = (version: typeof versionA, isSub: boolean): string => {
        if (isSub) {
          const subVersion = version as any
          const parentVersion = versionTree.versions.find((v) => v.version.id === subVersion.parentVersionId)
          const mainVersion = parentVersion?.version.mainVersion || 1
          return `v${mainVersion}.${subVersion.subVersionLetter}`
        } else {
          const mainVersion = version as any
          return `v${mainVersion.mainVersion}`
        }
      }

      const versionALabel = getVersionLabel(versionA, isSubVersionA === 'true')
      const versionBLabel = getVersionLabel(versionB, isSubVersionB === 'true')

      // Generate PDF
      const pdfBuffer = await generateRedlinePdf({
        documentName: doc.name,
        versionA: {
          label: versionALabel,
          content: versionA.content || '',
          date: new Date(versionA.createdAt),
          editor: versionA.editorName,
        },
        versionB: {
          label: versionBLabel,
          content: versionB.content || '',
          date: new Date(versionB.createdAt),
          editor: versionB.editorName,
        },
      })

      // Return PDF as downloadable response
      return new Response(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${doc.name}_${versionALabel}_vs_${versionBLabel}.pdf"`,
        },
      })
    } catch (error) {
      logger.error({ error }, 'Failed to export redline PDF')
      if (error instanceof HTTPException) throw error
      throw new HTTPException(500, { message: 'Failed to export PDF' })
    }
  },
}

