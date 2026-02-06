import { backendApi } from './api'
import { buildApiUrl } from './apiBaseUrl'

// Debug-mode ingest: allow logging from both http and https origins (e.g. Office add-in runs on https://localhost)
const canIngest = typeof window !== 'undefined';

// ============================================
// TYPES (matching backend schema)
// ============================================

export interface Tag {
  id: string
  userId: string
  name: string
  slug: string
  description?: string | null
  color?: string | null
  icon?: string | null
  parentId?: string | null
  path: string
  level: number
  scope: 'all' | 'clauses' | 'projects' | 'playbooks'
  isSystem?: boolean | null
  createdAt: string
  updatedAt: string
  children?: Tag[]
}

export interface CreateTagRequest {
  name: string
  description?: string
  color?: string
  icon?: string
  parentId?: string
  scope?: 'all' | 'clauses' | 'projects' | 'playbooks'
}

export interface UpdateTagRequest {
  name?: string
  description?: string
  color?: string
  icon?: string
  parentId?: string
  scope?: 'all' | 'clauses' | 'projects' | 'playbooks'
}

export interface Label {
  id: string
  userId: string
  name: string
  color: string
  category: string
  sortOrder?: number | null
  createdAt: string
}

export interface CreateLabelRequest {
  name: string
  color?: string
  category: 'risk_level' | 'status' | 'priority' | 'jurisdiction' | 'position'
  sortOrder?: number
}

export interface UpdateLabelRequest {
  name?: string
  color?: string
  category?: string
  sortOrder?: number
}

export interface Clause {
  id: string
  userId: string
  name: string
  description?: string | null
  currentVersionId?: string | null
  clauseType?: string | null
  jurisdiction?: string | null
  language?: string | null
  sourceType?: string | null
  sourceDocumentName?: string | null
  sourcePlaybookId?: string | null
  sourceRuleId?: string | null
  visibility: 'private' | 'shared' | 'public'
  useCount?: number | null
  lastUsedAt?: string | null
  searchVector?: string | null
  metadata?: any
  isActive?: boolean | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
  labels?: Label[]
}

export interface ClauseVersion {
  id: string
  clauseId: string
  versionNumber: number
  previousVersionId?: string | null
  text: string
  summary?: string | null
  changeType?: string | null
  changeDescription?: string | null
  changedBy?: string | null
  diffFromPrevious?: any
  createdAt: string
}

export interface CreateClauseRequest {
  name: string
  description?: string
  text: string
  clauseType?: string
  jurisdiction?: string
  language?: string
  sourceType?: string
  sourceDocumentName?: string
  sourcePlaybookId?: string
  sourceRuleId?: string
  visibility?: 'private' | 'shared' | 'public'
  tagIds?: string[]
  labelIds?: string[]
  metadata?: any
}

export interface UpdateClauseRequest {
  name?: string
  description?: string
  clauseType?: string
  jurisdiction?: string
  language?: string
  visibility?: 'private' | 'shared' | 'public'
  tagIds?: string[]
  labelIds?: string[]
  metadata?: any
}

export interface CreateClauseVersionRequest {
  text: string
  summary?: string
  changeDescription?: string
}

export interface Project {
  id: string
  userId: string
  name: string
  description?: string | null
  projectType?: string | null
  status: 'active' | 'archived' | 'completed'
  visibility: 'private' | 'shared' | 'public'
  currentVersionId?: string | null
  itemCount?: number | null
  searchVector?: string | null
  metadata?: any
  isActive?: boolean | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
  labels?: Label[]
}

export interface CreateProjectRequest {
  name: string
  description?: string
  projectType?: string
  status?: 'active' | 'archived' | 'completed'
  visibility?: 'private' | 'shared' | 'public'
  tagIds?: string[]
  labelIds?: string[]
  metadata?: any
}

export interface UpdateProjectRequest {
  name?: string
  description?: string
  projectType?: string
  status?: 'active' | 'archived' | 'completed'
  visibility?: 'private' | 'shared' | 'public'
  tagIds?: string[]
  labelIds?: string[]
  metadata?: any
}

export interface ProjectFile {
  id: string
  projectId: string
  name: string
  storagePath?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  extractedText?: string | null
  parsedStructure?: any
  searchVector?: string | null
  createdAt: string
}

export interface ProjectItem {
  id: string
  projectId: string
  itemType: 'file' | 'clause' | 'playbook' | 'folder'
  fileId?: string | null
  clauseId?: string | null
  playbookId?: string | null
  parentItemId?: string | null
  name?: string | null
  sortOrder?: number | null
  metadata?: any
  createdAt: string
}

export interface AddProjectItemRequest {
  itemType: 'file' | 'clause' | 'playbook' | 'folder'
  fileId?: string
  clauseId?: string
  playbookId?: string
  parentItemId?: string
  name?: string
  sortOrder?: number
  metadata?: any
}

export interface Playbook {
  id: string
  userId: string
  name: string
  description?: string | null
  playbookType?: string | null
  userPosition?: string | null
  jurisdiction?: string | null
  documentTypes?: any
  currentVersionId?: string | null
  visibility: 'private' | 'shared' | 'public'
  useCount?: number | null
  lastUsedAt?: string | null
  ruleCount?: number | null
  searchVector?: string | null
  metadata?: any
  isActive?: boolean | null
  createdAt: string
  updatedAt: string
  tags?: Tag[]
  labels?: Label[]
  rules?: PlaybookRule[]
}

export interface PlaybookRule {
  id: string
  playbookId: string
  ruleNumber: string
  ruleType: string
  briefName: string
  instruction: string
  exampleLanguage?: string | null
  linkedClauseId?: string | null
  conditions?: any
  sourceAnnotationType?: string | null
  sourceAnnotationKey?: string | null
  sortOrder?: number | null
  isActive?: boolean | null
  searchVector?: string | null
  createdAt: string
  updatedAt: string
}

export interface PlaybookVersion {
  id: string
  playbookId: string
  versionNumber: number
  previousVersionId?: string | null
  rulesSnapshot: any
  changeType?: string | null
  changeDescription?: string | null
  changedBy?: string | null
  createdAt: string
}

export interface CreatePlaybookRequest {
  name: string
  description?: string
  playbookType?: string
  userPosition?: string
  jurisdiction?: string
  documentTypes?: any
  visibility?: 'private' | 'shared' | 'public'
  tagIds?: string[]
  labelIds?: string[]
  metadata?: any
  // Rules array - backend accepts this for creating playbooks with rules
  rules?: Array<{
    ruleNumber: string
    ruleType: string
    briefName: string
    instruction: string
    exampleLanguage?: string
    linkedClauseId?: string
    conditions?: any
    sourceAnnotationType?: string
    sourceAnnotationKey?: string
    sortOrder?: number
  }>
  // Tags as comma-separated string (for backward compatibility)
  tags?: string
}

export interface UpdatePlaybookRequest {
  name?: string
  description?: string
  playbookType?: string
  userPosition?: string
  jurisdiction?: string
  documentTypes?: any
  visibility?: 'private' | 'shared' | 'public'
  tagIds?: string[]
  labelIds?: string[]
  metadata?: any
}

export interface UpdatePlaybookRulesRequest {
  rules: Array<{
    id?: string
    ruleNumber: string
    ruleType: string
    briefName: string
    instruction: string
    exampleLanguage?: string
    linkedClauseId?: string
    conditions?: any
    sourceAnnotationType?: string
    sourceAnnotationKey?: string
    sortOrder?: number
    isActive?: boolean
  }>
}

export interface LibrarySearchRequest {
  query: string
  types?: ('clause' | 'project' | 'playbook')[]
  tagIds?: string[]
  limit?: number
}

export interface LibrarySearchResult {
  type: 'clause' | 'project' | 'playbook'
  id: string
  name: string
  description?: string
  relevanceScore?: number
  highlights?: string[]
}

export interface LibraryShare {
  id: string
  resourceType: 'clause' | 'project' | 'playbook'
  resourceId: string
  ownerId: string
  sharedWithUserId?: string | null
  sharedWithEmail?: string | null
  permission: 'view' | 'use' | 'edit' | 'remix' | 'admin'
  expiresAt?: string | null
  createdAt: string
}

export interface CreateShareRequest {
  resourceType: 'clause' | 'project' | 'playbook' | 'document' | 'chat_session'
  resourceId: string
  sharedWithUserId?: string
  sharedWithEmail?: string
  permission: 'view' | 'use' | 'edit' | 'remix' | 'admin'
  expiresAt?: string
}

// ============================================
// API CLIENT
// ============================================

export class LibraryApiService {
  private baseUrl: string

  constructor(baseUrl?: string) {
    // Default to HTTP for local dev unless explicitly overridden.
    // this.baseUrl = baseUrl || process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003'
    const envBaseUrl = process.env.REACT_APP_API_BASE_URL?.trim()
    this.baseUrl = baseUrl || (envBaseUrl ? envBaseUrl : '')
  }

  private getAuthHeaders(): HeadersInit {
    // Try both token keys for compatibility
    const rawToken = localStorage.getItem('authToken') || localStorage.getItem('auth_token')
    const token = rawToken?.trim()
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    } else {
      // Log warning if no token found
      console.warn('LibraryApi: No auth token found in localStorage')
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
    
    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()
    const trimmed = text.trim()

    if (!trimmed) {
      if (response.status === 204) {
        return {} as T
      }
      throw new Error(
        `Unexpected empty response from API (status=${response.status}, url=${response.url})`
      )
    }

    const looksJson = contentType.includes('application/json') ||
      trimmed.startsWith('{') ||
      trimmed.startsWith('[')

    if (looksJson) {
      try {
        return JSON.parse(trimmed) as T
      } catch {
        console.error('Failed to parse response as JSON:', trimmed.substring(0, 200))
        throw new Error(`Invalid JSON response: ${trimmed.substring(0, 100)}`)
      }
    }

    throw new Error(
      `Unexpected response from API (content-type=${contentType || 'unknown'}): ${trimmed.substring(0, 200)}`
    )
  }

  /**
   * Safely build API URL using buildApiUrl to handle Office add-in environments.
   * Falls back to relative URL if baseUrl is set (for backwards compatibility).
   */
  private buildUrl(path: string): string {
    // If baseUrl was explicitly provided in constructor, use it
    if (this.baseUrl) {
      return `${this.baseUrl}${path}`
    }
    // Otherwise, use buildApiUrl which handles Office add-in environments
    return buildApiUrl(path)
  }

  // ============================================
  // TAGS
  // ============================================

  async getTags(scope?: 'all' | 'clauses' | 'projects' | 'playbooks'): Promise<Tag[]> {
    const url = this.buildUrl(`/api/library/tags${scope ? `?scope=${scope}` : ''}`)
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Tag[] }>(response)
    return data.data
  }

  async createTag(request: CreateTagRequest): Promise<Tag> {
    const response = await fetch(this.buildUrl(`/api/library/tags`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Tag }>(response)
    return data.data
  }

  async updateTag(id: string, request: UpdateTagRequest): Promise<Tag> {
    const response = await fetch(this.buildUrl(`/api/library/tags/${id}`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Tag }>(response)
    return data.data
  }

  async deleteTag(id: string, deleteChildren: boolean = false): Promise<void> {
    const response = await fetch(
      this.buildUrl(`/api/library/tags/${id}${deleteChildren ? '?deleteChildren=true' : ''}`),
      {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
      }
    )
    await this.handleResponse<{ message: string }>(response)
  }

  // ============================================
  // LABELS
  // ============================================

  async getLabels(category?: string): Promise<Label[]> {
    const url = this.buildUrl(`/api/library/labels${category ? `?category=${category}` : ''}`)
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Label[] }>(response)
    return data.data
  }

  async createLabel(request: CreateLabelRequest): Promise<Label> {
    const response = await fetch(this.buildUrl(`/api/library/labels`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Label }>(response)
    return data.data
  }

  async updateLabel(id: string, request: UpdateLabelRequest): Promise<Label> {
    const response = await fetch(this.buildUrl(`/api/library/labels/${id}`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Label }>(response)
    return data.data
  }

  async deleteLabel(id: string): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/library/labels/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  // ============================================
  // CLAUSES
  // ============================================

  async getClauses(params?: {
    tagIds?: string[]
    labelIds?: string[]
    jurisdiction?: string
    clauseType?: string
    visibility?: string
    limit?: number
    offset?: number
  }): Promise<Clause[]> {
    const queryParams = new URLSearchParams()
    if (params?.tagIds) params.tagIds.forEach(id => queryParams.append('tagIds', id))
    if (params?.labelIds) params.labelIds.forEach(id => queryParams.append('labelIds', id))
    if (params?.jurisdiction) queryParams.append('jurisdiction', params.jurisdiction)
    if (params?.clauseType) queryParams.append('clauseType', params.clauseType)
    if (params?.visibility) queryParams.append('visibility', params.visibility)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())

    const url = this.buildUrl(`/api/library/clauses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`)
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Clause[] }>(response)
    return data.data
  }

  async getClause(id: string): Promise<Clause> {
    const response = await fetch(this.buildUrl(`/api/library/clauses/${id}`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Clause }>(response)
    return data.data
  }

  async createClause(request: CreateClauseRequest): Promise<Clause> {
    const response = await fetch(this.buildUrl(`/api/library/clauses`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Clause }>(response)
    return data.data
  }

  async updateClause(id: string, request: UpdateClauseRequest): Promise<Clause> {
    const response = await fetch(this.buildUrl(`/api/library/clauses/${id}`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Clause }>(response)
    return data.data
  }

  async deleteClause(id: string): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/library/clauses/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  async getClauseVersions(id: string): Promise<ClauseVersion[]> {
    const response = await fetch(this.buildUrl(`/api/library/clauses/${id}/versions`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: ClauseVersion[] }>(response)
    return data.data
  }

  async createClauseVersion(id: string, request: CreateClauseVersionRequest): Promise<ClauseVersion> {
    const response = await fetch(this.buildUrl(`/api/library/clauses/${id}/versions`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: ClauseVersion }>(response)
    return data.data
  }

  async restoreClauseVersion(id: string, versionId: string): Promise<Clause> {
    const response = await fetch(this.buildUrl(`/api/library/clauses/${id}/restore/${versionId}`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Clause }>(response)
    return data.data
  }

  // ============================================
  // PROJECTS
  // ============================================

  async getProjects(params?: {
    tagIds?: string[]
    labelIds?: string[]
    projectType?: string
    status?: string
    visibility?: string
    limit?: number
    offset?: number
  }): Promise<Project[]> {
    const queryParams = new URLSearchParams()
    if (params?.tagIds) params.tagIds.forEach(id => queryParams.append('tagIds', id))
    if (params?.labelIds) params.labelIds.forEach(id => queryParams.append('labelIds', id))
    if (params?.projectType) queryParams.append('projectType', params.projectType)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.visibility) queryParams.append('visibility', params.visibility)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())

    const url = this.buildUrl(`/api/library/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`)
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Project[] }>(response)
    return data.data
  }

  async getProject(id: string): Promise<Project> {
    const response = await fetch(this.buildUrl(`/api/library/projects/${id}`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Project }>(response)
    return data.data
  }

  async createProject(request: CreateProjectRequest): Promise<Project> {
    const response = await fetch(this.buildUrl(`/api/library/projects`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Project }>(response)
    return data.data
  }

  async updateProject(id: string, request: UpdateProjectRequest): Promise<Project> {
    const response = await fetch(this.buildUrl(`/api/library/projects/${id}`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Project }>(response)
    return data.data
  }

  async deleteProject(id: string): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/library/projects/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  async addProjectItem(projectId: string, request: AddProjectItemRequest): Promise<ProjectItem> {
    const response = await fetch(this.buildUrl(`/api/library/projects/${projectId}/items`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: ProjectItem }>(response)
    return data.data
  }

  async removeProjectItem(projectId: string, itemId: string): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/library/projects/${projectId}/items/${itemId}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  // ============================================
  // PLAYBOOKS
  // ============================================

  async getPlaybooks(params?: {
    tagIds?: string[]
    labelIds?: string[]
    playbookType?: string
    jurisdiction?: string
    visibility?: string
    limit?: number
    offset?: number
  }): Promise<Playbook[]> {
    const queryParams = new URLSearchParams()
    if (params?.tagIds) params.tagIds.forEach(id => queryParams.append('tagIds', id))
    if (params?.labelIds) params.labelIds.forEach(id => queryParams.append('labelIds', id))
    if (params?.playbookType) queryParams.append('playbookType', params.playbookType)
    if (params?.jurisdiction) queryParams.append('jurisdiction', params.jurisdiction)
    if (params?.visibility) queryParams.append('visibility', params.visibility)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    
    const url = this.buildUrl(`/api/library/playbooks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`)
    console.log("url", url)
    let response: Response
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
      })
    } catch (e) {
      throw e
    }
    console.log("response", response)
    const data = await this.handleResponse<{ data: Playbook[] }>(response)
    return data.data
  }

  async getPlaybook(id: string): Promise<Playbook> {
    const response = await fetch(this.buildUrl(`/api/library/playbooks/${id}`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Playbook }>(response)
    return data.data
  }

  async createPlaybook(request: CreatePlaybookRequest): Promise<Playbook> {
    const response = await fetch(this.buildUrl(`/api/library/playbooks`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Playbook }>(response)
    return data.data
  }

  async updatePlaybook(id: string, request: UpdatePlaybookRequest): Promise<Playbook> {
    const response = await fetch(this.buildUrl(`/api/library/playbooks/${id}`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Playbook }>(response)
    return data.data
  }

  async deletePlaybook(id: string): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/library/playbooks/${id}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  async updatePlaybookRules(id: string, request: UpdatePlaybookRulesRequest): Promise<Playbook> {
    const response = await fetch(this.buildUrl(`/api/library/playbooks/${id}/rules`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Playbook }>(response)
    return data.data
  }

  async linkRuleToClause(playbookId: string, ruleId: string, clauseId: string): Promise<PlaybookRule> {
    const response = await fetch(this.buildUrl(`/api/library/playbooks/${playbookId}/rules/${ruleId}/link-clause`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ clauseId }),
    })
    const data = await this.handleResponse<{ data: PlaybookRule }>(response)
    return data.data
  }

  async getPlaybookVersions(id: string): Promise<PlaybookVersion[]> {
    const response = await fetch(this.buildUrl(`/api/library/playbooks/${id}/versions`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: PlaybookVersion[] }>(response)
    return data.data
  }

  async restorePlaybookVersion(id: string, versionId: string): Promise<Playbook> {
    const response = await fetch(this.buildUrl(`/api/library/playbooks/${id}/restore/${versionId}`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Playbook }>(response)
    return data.data
  }

  // ============================================
  // SEARCH
  // ============================================

  async search(request: LibrarySearchRequest): Promise<LibrarySearchResult[]> {
    const response = await fetch(this.buildUrl(`/api/library/search`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: LibrarySearchResult[] }>(response)
    return data.data
  }

  // ============================================
  // SHARING (Note: Backend routes may not exist yet)
  // ============================================

  async getShares(_resourceType: 'clause' | 'project' | 'playbook' | 'document' | 'chat_session', _resourceId: string): Promise<LibraryShare[]> {
    // TODO: Implement when backend route is available
    // const response = await fetch(this.buildUrl(`/api/library/shares?resourceType=${resourceType}&resourceId=${resourceId}`, {
    //   method: 'GET',
    //   headers: this.getAuthHeaders(),
    // })
    // const data = await this.handleResponse<{ data: LibraryShare[] }>(response)
    // return data.data
    throw new Error('Sharing API not yet implemented')
  }

  async createShare(_request: CreateShareRequest): Promise<LibraryShare> {
    // TODO: Implement when backend route is available
    // const response = await fetch(this.buildUrl(`/api/library/shares`, {
    //   method: 'POST',
    //   headers: this.getAuthHeaders(),
    //   body: JSON.stringify(request),
    // })
    // const data = await this.handleResponse<{ data: LibraryShare }>(response)
    // return data.data
    throw new Error('Sharing API not yet implemented')
  }

  async deleteShare(_shareId: string): Promise<void> {
    // TODO: Implement when backend route is available
    // const response = await fetch(this.buildUrl(`/api/library/shares/${shareId}`, {
    //   method: 'DELETE',
    //   headers: this.getAuthHeaders(),
    // })
    // await this.handleResponse<{ message: string }>(response)
    throw new Error('Sharing API not yet implemented')
  }

  // ============================================
  // ORGANIZATIONS & TEAMS
  // ============================================

  async getOrganization(): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/organization`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async getOrganizationPlaybooks(): Promise<any[]> {
    const response = await fetch(this.buildUrl(`/api/organization/playbooks`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: any[] }>(response)
    return data.data
  }

  async getTeams(): Promise<any[]> {
    const response = await fetch(this.buildUrl(`/api/organization/teams`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: any[] }>(response)
    return data.data
  }

  async createTeam(name: string, description?: string): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/organization/teams`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name, description }),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async getTeam(teamId: string): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/organization/teams/${teamId}`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async updateTeam(teamId: string, name?: string, description?: string): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/organization/teams/${teamId}`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name, description }),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async deleteTeam(teamId: string): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/organization/teams/${teamId}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  async getTeamMembers(teamId: string): Promise<any[]> {
    const response = await fetch(this.buildUrl(`/api/organization/teams/${teamId}/members`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: any[] }>(response)
    return data.data
  }

  async inviteTeamMember(teamId: string, email: string, role: 'admin' | 'member' = 'member'): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/organization/teams/${teamId}/members`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ email, role }),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/organization/teams/${teamId}/members/${userId}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  async updateTeamMemberRole(teamId: string, userId: string, role: 'admin' | 'member'): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/organization/teams/${teamId}/members/${userId}`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ role }),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async shareWithTeam(
    teamId: string,
    resourceType: 'clause' | 'project' | 'playbook' | 'chat_session' | 'document',
    resourceId: string,
    permission: 'view' | 'use' | 'edit' | 'remix' | 'admin' = 'view'
  ): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/organization/teams/${teamId}/shares`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ resourceType, resourceId, permission }),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async getTeamShares(teamId: string): Promise<any[]> {
    const response = await fetch(this.buildUrl(`/api/organization/teams/${teamId}/shares`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: any[] }>(response)
    return data.data
  }

  async unshareFromTeam(shareId: string): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/organization/teams/shares/${shareId}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  // ============================================
  // CHAT SESSIONS
  // ============================================

  async getChatSessions(): Promise<any[]> {
    const response = await fetch(this.buildUrl(`/api/chat-sessions`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<any>(response)
    const sessions = data?.data ?? data
    return Array.isArray(sessions) ? sessions : []
  }

  async createChatSession(title?: string, sourceConfig?: any): Promise<any> {
    const url = this.buildUrl(`/api/chat-sessions`)
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ title, sourceConfig }),
    })
    const data = await this.handleResponse<any>(response)
    const session = data?.data ?? data
    if (!session?.id) {
      throw new Error(
        `Chat session creation failed: missing session id. Response: ${JSON.stringify(data).slice(0, 200)}`
      )
    }
    return session
  }

  async getChatSession(sessionId: string): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/chat-sessions/${sessionId}`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<any>(response)
    return data?.data ?? data
  }

  async updateChatSession(sessionId: string, title: string): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/chat-sessions/${sessionId}`), {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ title }),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async deleteChatSession(sessionId: string): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/chat-sessions/${sessionId}`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  async addChatMessage(sessionId: string, role: 'user' | 'assistant', content: string, citations?: any[]): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/chat-sessions/${sessionId}/messages`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ role, content, citations }),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async generateChatShareLink(sessionId: string): Promise<{ shareToken: string; shareUrl: string }> {
    const response = await fetch(this.buildUrl(`/api/chat-sessions/${sessionId}/share`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: { shareToken: string; shareUrl: string } }>(response)
    return data.data
  }

  async revokeChatShareLink(sessionId: string): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/chat-sessions/${sessionId}/share`), {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  // ============================================
  // DOCUMENT VERSIONS
  // ============================================

  async getDocuments(): Promise<any[]> {
    const response = await fetch(this.buildUrl(`/api/documents`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: any[] }>(response)
    return data.data
  }

  async getDocument(documentId: string): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/documents/${documentId}`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async saveMainVersion(
    documentId: string,
    params: {
      documentName: string
      content: string
      fileBlob?: string // base64 encoded
      description: string
      editorName: string
      status?: 'draft' | 'circulated' | 'executed' | 'archived'
      documentType?: string
      matterReference?: string
    }
  ): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/documents/${documentId}/versions`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async saveSubVersion(
    documentId: string,
    versionId: string,
    params: {
      documentName: string
      content: string
      fileBlob?: string // base64 encoded
      description: string
      editorName: string
    }
  ): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/documents/${documentId}/versions/${versionId}/sub`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(params),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async getVersion(documentId: string, versionId: string, isSubVersion: boolean = false): Promise<any> {
    const response = await fetch(this.buildUrl(`/api/documents/${documentId}/versions/${versionId}?subVersion=${isSubVersion}`), {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }

  async restoreVersion(
    documentId: string,
    versionId: string,
    isSubVersion: boolean,
    description: string,
    editorName: string
  ): Promise<void> {
    const response = await fetch(this.buildUrl(`/api/documents/${documentId}/restore/${versionId}?subVersion=${isSubVersion}`), {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ description, editorName }),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  async compareVersions(
    documentId: string,
    versionAId: string,
    versionBId: string,
    isSubVersionA: boolean,
    isSubVersionB: boolean
  ): Promise<any> {
    const response = await fetch(
      this.buildUrl(`/api/documents/${documentId}/compare?versionAId=${versionAId}&versionBId=${versionBId}&isSubVersionA=${isSubVersionA}&isSubVersionB=${isSubVersionB}`),
      {
        method: 'GET',
        headers: this.getAuthHeaders(),
      }
    )
    const data = await this.handleResponse<{ data: any }>(response)
    return data.data
  }
}

// Export singleton instance
export const libraryApi = new LibraryApiService()

