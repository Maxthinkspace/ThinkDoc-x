import { backendApi } from './api'

// ============================================
// TYPES
// ============================================

export interface VersionedDocument {
  id: string
  userId: string
  organizationId?: string | null
  name: string
  currentMainVersion?: number | null
  currentSubVersion?: string | null
  latestVersionId?: string | null
  latestSubVersionId?: string | null
  documentType?: string | null
  matterReference?: string | null
  createdAt: string
  updatedAt: string
}

export interface DocumentVersion {
  id: string
  documentId: string
  mainVersion: number
  description: string
  editorName: string
  editorUserId: string
  content?: string | null
  fileBlob?: Buffer | null
  fileSizeBytes?: number | null
  isMilestone?: boolean | null
  status?: 'draft' | 'circulated' | 'executed' | 'archived' | null
  createdAt: string
}

export interface DocumentSubVersion {
  id: string
  parentVersionId: string
  documentId: string
  subVersionLetter: string
  description: string
  editorName: string
  editorUserId: string
  content?: string | null
  fileBlob?: Buffer | null
  fileSizeBytes?: number | null
  createdAt: string
}

export interface VersionTree {
  document: VersionedDocument
  versions: Array<{
    version: DocumentVersion
    subVersions: DocumentSubVersion[]
  }>
}

export interface SaveVersionParams {
  documentId?: string // null for new document
  documentName: string
  content: string
  fileBlob?: string // base64 encoded
  description: string
  editorName: string
  versionType: 'main' | 'sub'
  status?: 'draft' | 'circulated' | 'executed' | 'archived'
  documentType?: string
  matterReference?: string
}

export interface CompareVersionsResult {
  versionA: DocumentVersion | DocumentSubVersion
  versionB: DocumentVersion | DocumentSubVersion
  diffSummary: string
}

// ============================================
// API CLIENT
// ============================================

export class DocumentVersionApiService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003'
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('authToken')
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const clone = response.clone()
      let errorData: any = {}
      let errorText: string | null = null
      try {
        errorData = await clone.json()
      } catch {
        try {
          const txt = await clone.text()
          errorText = txt?.trim() ? txt.trim() : null
        } catch {
          // ignore
        }
      }

      throw new Error(
        errorData?.error?.message ||
          errorText ||
          `HTTP ${response.status}: ${response.statusText}`
      )
    }
    return response.json()
  }

  /**
   * List user's versioned documents
   */
  async listDocuments(): Promise<VersionedDocument[]> {
    const response = await fetch(`${this.baseUrl}/api/document-versions`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: VersionedDocument[] }>(response)
    return data.data
  }

  /**
   * Get document with version history tree
   */
  async getVersionHistory(documentId: string): Promise<VersionTree> {
    const response = await fetch(`${this.baseUrl}/api/document-versions/${documentId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: VersionTree }>(response)
    return data.data
  }

  /**
   * Create a new document with its first version
   */
  async createDocument(params: Omit<SaveVersionParams, 'documentId' | 'versionType'>): Promise<DocumentVersion> {
    const response = await fetch(`${this.baseUrl}/api/document-versions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        ...params,
        versionType: 'main', // First version is always main
      }),
    })
    const data = await this.handleResponse<{ data: DocumentVersion }>(response)
    return data.data
  }

  /**
   * Save a new version (main or sub)
   */
  async saveVersion(params: SaveVersionParams): Promise<DocumentVersion | DocumentSubVersion> {
    const { documentId, versionType, ...restParams } = params

    if (!documentId) {
      throw new Error('documentId is required. Use createDocument() for new documents.')
    }

    if (versionType === 'main') {
      const response = await fetch(`${this.baseUrl}/api/document-versions/${documentId}/versions`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(restParams),
      })
      const data = await this.handleResponse<{ data: DocumentVersion }>(response)
      return data.data
    } else {
      // For sub-versions, we need to get the latest main version first
      const history = await this.getVersionHistory(documentId)
      const latestMainVersion = history.versions[0]?.version
      if (!latestMainVersion) {
        throw new Error('No main version found to create sub-version from')
      }

      const response = await fetch(
        `${this.baseUrl}/api/document-versions/${documentId}/versions/${latestMainVersion.id}/sub`,
        {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(restParams),
        }
      )
      const data = await this.handleResponse<{ data: DocumentSubVersion }>(response)
      return data.data
    }
  }

  /**
   * Get specific version content
   */
  async getVersion(
    documentId: string,
    versionId: string,
    isSubVersion: boolean = false
  ): Promise<DocumentVersion | DocumentSubVersion> {
    const response = await fetch(
      `${this.baseUrl}/api/document-versions/${documentId}/versions/${versionId}?subVersion=${isSubVersion}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )
    const data = await this.handleResponse<{ data: DocumentVersion | DocumentSubVersion }>(response)
    return data.data
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    documentId: string,
    versionAId: string,
    versionBId: string,
    isSubVersionA: boolean,
    isSubVersionB: boolean
  ): Promise<CompareVersionsResult> {
    const queryParams = new URLSearchParams({
      versionAId,
      versionBId,
      isSubVersionA: String(isSubVersionA),
      isSubVersionB: String(isSubVersionB),
    })

    const response = await fetch(
      `${this.baseUrl}/api/document-versions/${documentId}/compare?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )
    const data = await this.handleResponse<{ data: CompareVersionsResult }>(response)
    return data.data
  }

  /**
   * Restore document to a previous version
   */
  async restoreVersion(
    documentId: string,
    versionId: string,
    isSubVersion: boolean,
    description: string,
    editorName: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/document-versions/${documentId}/restore/${versionId}?subVersion=${isSubVersion}`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ description, editorName }),
      }
    )
    await this.handleResponse<{ message: string }>(response)
  }

  /**
   * Export redline PDF comparing two versions
   */
  async exportRedlinePdf(
    documentId: string,
    versionAId: string,
    versionBId: string,
    isSubVersionA: boolean,
    isSubVersionB: boolean
  ): Promise<Blob> {
    const queryParams = new URLSearchParams({
      versionAId,
      versionBId,
      isSubVersionA: String(isSubVersionA),
      isSubVersionB: String(isSubVersionB),
    })

    const response = await fetch(
      `${this.baseUrl}/api/document-versions/${documentId}/export-redline?${queryParams.toString()}`,
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )

    if (!response.ok) {
      const clone = response.clone()
      let errorData: any = {}
      let errorText: string | null = null
      try {
        errorData = await clone.json()
      } catch {
        try {
          const txt = await clone.text()
          errorText = txt?.trim() ? txt.trim() : null
        } catch {
          // ignore
        }
      }

      throw new Error(
        errorData?.error?.message ||
          errorText ||
          `HTTP ${response.status}: ${response.statusText}`
      )
    }

    return response.blob()
  }
}

// Export singleton instance
export const documentVersionApi = new DocumentVersionApiService()

