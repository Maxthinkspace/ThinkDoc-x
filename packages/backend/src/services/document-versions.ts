import { db } from '@/config/database'
import {
  versionedDocuments,
  documentVersions,
  documentSubVersions,
  type VersionedDocument,
  type NewVersionedDocument,
  type DocumentVersion,
  type NewDocumentVersion,
  type DocumentSubVersion,
  type NewDocumentSubVersion,
} from '@/db/schema/document-versions'
import { eq, and, desc, max } from 'drizzle-orm'
import { logger } from '@/config/logger'

export interface SaveVersionParams {
  documentId?: string // null for new document
  documentName: string
  content: string // Document content
  fileBlob?: Buffer // Binary .docx
  description: string // Required: "Taking CFO comments"
  editorName: string // Required: "John Smith"
  editorUserId: string
  isMainVersion: boolean // true = v2, false = v1.B
  status?: 'draft' | 'circulated' | 'executed' | 'archived'
  documentType?: string
  matterReference?: string
}

export interface VersionTree {
  document: VersionedDocument
  versions: Array<{
    version: DocumentVersion
    subVersions: DocumentSubVersion[]
  }>
}

export class DocumentVersionService {
  /**
   * Save a new version (main or sub)
   */
  async saveVersion(userId: string, params: SaveVersionParams): Promise<DocumentVersion | DocumentSubVersion> {
    let doc: VersionedDocument

    if (params.documentId) {
      // Existing document
      const [existing] = await db
        .select()
        .from(versionedDocuments)
        .where(eq(versionedDocuments.id, params.documentId))
        .limit(1)

      if (!existing) {
        throw new Error('Document not found')
      }

      doc = existing
    } else {
      // New document - create it
      const [newDoc] = await db
        .insert(versionedDocuments)
        .values({
          userId,
          name: params.documentName,
          documentType: params.documentType,
          matterReference: params.matterReference,
          currentMainVersion: 1,
        })
        .returning()

      if (!newDoc) {
        throw new Error('Failed to create document')
      }

      doc = newDoc
    }

    if (params.isMainVersion) {
      // Create new main version (v2, v3, etc.)
      const nextMainVersion = await this.getNextMainVersion(doc.id)
      
      const [version] = await db
        .insert(documentVersions)
        .values({
          documentId: doc.id,
          mainVersion: nextMainVersion,
          description: params.description,
          editorName: params.editorName,
          editorUserId: params.editorUserId,
          content: params.content,
          fileBlob: params.fileBlob || null,
          fileSizeBytes: params.fileBlob ? params.fileBlob.length : null,
          status: params.status || 'draft',
        })
        .returning()

      if (!version) {
        throw new Error('Failed to create version')
      }

      // Update document to point to new main version
      await db
        .update(versionedDocuments)
        .set({
          currentMainVersion: nextMainVersion,
          currentSubVersion: null,
          latestVersionId: version.id,
          latestSubVersionId: null,
          updatedAt: new Date(),
        })
        .where(eq(versionedDocuments.id, doc.id))

      logger.info({ documentId: doc.id, version: nextMainVersion, editorUserId: params.editorUserId }, 'Created main version')
      return version
    } else {
      // Create sub-version (v1.A, v1.B, etc.)
      const currentMainVersion = doc.currentMainVersion || 1
      
      // Get the latest main version
      const [parentVersion] = await db
        .select()
        .from(documentVersions)
        .where(and(
          eq(documentVersions.documentId, doc.id),
          eq(documentVersions.mainVersion, currentMainVersion)
        ))
        .orderBy(desc(documentVersions.createdAt))
        .limit(1)

      if (!parentVersion) {
        throw new Error('Parent version not found')
      }

      const nextSubVersion = await this.getNextSubVersion(parentVersion.id)
      
      const [subVersion] = await db
        .insert(documentSubVersions)
        .values({
          parentVersionId: parentVersion.id,
          documentId: doc.id,
          subVersionLetter: nextSubVersion,
          description: params.description,
          editorName: params.editorName,
          editorUserId: params.editorUserId,
          content: params.content,
          fileBlob: params.fileBlob || null,
          fileSizeBytes: params.fileBlob ? params.fileBlob.length : null,
        })
        .returning()

      if (!subVersion) {
        throw new Error('Failed to create sub-version')
      }

      // Update document to point to new sub-version
      await db
        .update(versionedDocuments)
        .set({
          currentSubVersion: nextSubVersion,
          latestSubVersionId: subVersion.id,
          updatedAt: new Date(),
        })
        .where(eq(versionedDocuments.id, doc.id))

      logger.info({ documentId: doc.id, version: `${currentMainVersion}.${nextSubVersion}`, editorUserId: params.editorUserId }, 'Created sub-version')
      return subVersion
    }
  }

  /**
   * Get version history tree
   */
  async getVersionHistory(documentId: string): Promise<VersionTree> {
    const [doc] = await db
      .select()
      .from(versionedDocuments)
      .where(eq(versionedDocuments.id, documentId))
      .limit(1)

    if (!doc) {
      throw new Error('Document not found')
    }

    // Get all main versions
    const mainVersions = await db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))
      .orderBy(desc(documentVersions.mainVersion))

    // Get sub-versions for each main version
    const versionTree = await Promise.all(
      mainVersions.map(async (version) => {
        const subVersions = await db
          .select()
          .from(documentSubVersions)
          .where(eq(documentSubVersions.parentVersionId, version.id))
          .orderBy(documentSubVersions.subVersionLetter)

        return {
          version,
          subVersions,
        }
      })
    )

    return {
      document: doc,
      versions: versionTree,
    }
  }

  /**
   * Get specific version content
   */
  async getVersion(versionId: string, isSubVersion: boolean): Promise<DocumentVersion | DocumentSubVersion | null> {
    if (isSubVersion) {
      const [subVersion] = await db
        .select()
        .from(documentSubVersions)
        .where(eq(documentSubVersions.id, versionId))
        .limit(1)

      return subVersion || null
    } else {
      const [version] = await db
        .select()
        .from(documentVersions)
        .where(eq(documentVersions.id, versionId))
        .limit(1)

      return version || null
    }
  }

  /**
   * Restore document to a previous version
   */
  async restoreVersion(
    documentId: string,
    versionId: string,
    isSubVersion: boolean,
    userId: string,
    editorName: string,
    description: string
  ): Promise<void> {
    const version = await this.getVersion(versionId, isSubVersion)
    if (!version) {
      throw new Error('Version not found')
    }

    // Get version content
    const content = version.content
    const fileBlob = 'fileBlob' in version ? version.fileBlob : null

    // Create new version from restored content
    await this.saveVersion(userId, {
      documentId,
      documentName: '', // Not used for existing docs
      content: content || '',
      fileBlob: fileBlob as Buffer | undefined,
      description: `Restored: ${description}`,
      editorName,
      editorUserId: userId,
      isMainVersion: !isSubVersion, // Restore as same type
    })

    logger.info({ documentId, versionId, userId }, 'Restored document version')
  }

  /**
   * Compare two versions (returns diff metadata)
   */
  async compareVersions(versionAId: string, versionBId: string, isSubVersionA: boolean, isSubVersionB: boolean): Promise<{
    versionA: DocumentVersion | DocumentSubVersion
    versionB: DocumentVersion | DocumentSubVersion
    diffSummary: string
  }> {
    const versionA = await this.getVersion(versionAId, isSubVersionA)
    const versionB = await this.getVersion(versionBId, isSubVersionB)

    if (!versionA || !versionB) {
      throw new Error('One or both versions not found')
    }

    // Simple diff summary (can be enhanced with actual diff algorithm)
    const contentA = versionA.content || ''
    const contentB = versionB.content || ''
    const diffSummary = `Version A: ${contentA.length} chars, Version B: ${contentB.length} chars`

    return {
      versionA,
      versionB,
      diffSummary,
    }
  }

  /**
   * List user's documents
   */
  async listDocuments(userId: string): Promise<VersionedDocument[]> {
    return await db
      .select()
      .from(versionedDocuments)
      .where(eq(versionedDocuments.userId, userId))
      .orderBy(desc(versionedDocuments.updatedAt))
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId: string): Promise<VersionedDocument | null> {
    const [doc] = await db
      .select()
      .from(versionedDocuments)
      .where(eq(versionedDocuments.id, documentId))
      .limit(1)

    return doc || null
  }

  /**
   * Get next main version number
   */
  private async getNextMainVersion(documentId: string): Promise<number> {
    const [result] = await db
      .select({ maxVersion: max(documentVersions.mainVersion) })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId))

    const currentMax = result?.maxVersion || 0
    return currentMax + 1
  }

  /**
   * Get next sub-version letter
   */
  private async getNextSubVersion(parentVersionId: string): Promise<string> {
    const subVersions = await db
      .select({ subVersionLetter: documentSubVersions.subVersionLetter })
      .from(documentSubVersions)
      .where(eq(documentSubVersions.parentVersionId, parentVersionId))
      .orderBy(desc(documentSubVersions.subVersionLetter))
      .limit(1)

    const maxLetter = subVersions[0]?.subVersionLetter || ''
    
    if (!maxLetter) {
      return 'A'
    }

    // Increment letter: A -> B -> C -> ... -> Z -> AA
    const charCode = maxLetter.charCodeAt(0)
    if (charCode < 90) { // Z
      return String.fromCharCode(charCode + 1)
    } else {
      // Handle AA, AB, etc. (simplified - just increment last char)
      return maxLetter + 'A'
    }
  }
}

export const documentVersionService = new DocumentVersionService()

