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
  resourceType: 'clause' | 'project' | 'playbook'
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
    this.baseUrl = baseUrl || process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003'
  }

  private getAuthHeaders(): HeadersInit {
    // Try both token keys for compatibility
    const token = localStorage.getItem('authToken') || localStorage.getItem('auth_token')
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

  // ============================================
  // TAGS
  // ============================================

  async getTags(scope?: 'all' | 'clauses' | 'projects' | 'playbooks'): Promise<Tag[]> {
    const url = `${this.baseUrl}/api/library/tags${scope ? `?scope=${scope}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Tag[] }>(response)
    return data.data
  }

  async createTag(request: CreateTagRequest): Promise<Tag> {
    const response = await fetch(`${this.baseUrl}/api/library/tags`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Tag }>(response)
    return data.data
  }

  async updateTag(id: string, request: UpdateTagRequest): Promise<Tag> {
    const response = await fetch(`${this.baseUrl}/api/library/tags/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Tag }>(response)
    return data.data
  }

  async deleteTag(id: string, deleteChildren: boolean = false): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/api/library/tags/${id}${deleteChildren ? '?deleteChildren=true' : ''}`,
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
    const url = `${this.baseUrl}/api/library/labels${category ? `?category=${category}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Label[] }>(response)
    return data.data
  }

  async createLabel(request: CreateLabelRequest): Promise<Label> {
    const response = await fetch(`${this.baseUrl}/api/library/labels`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Label }>(response)
    return data.data
  }

  async updateLabel(id: string, request: UpdateLabelRequest): Promise<Label> {
    const response = await fetch(`${this.baseUrl}/api/library/labels/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Label }>(response)
    return data.data
  }

  async deleteLabel(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/library/labels/${id}`, {
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

    const url = `${this.baseUrl}/api/library/clauses${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Clause[] }>(response)
    return data.data
  }

  async getClause(id: string): Promise<Clause> {
    const response = await fetch(`${this.baseUrl}/api/library/clauses/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Clause }>(response)
    return data.data
  }

  async createClause(request: CreateClauseRequest): Promise<Clause> {
    const response = await fetch(`${this.baseUrl}/api/library/clauses`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Clause }>(response)
    return data.data
  }

  async updateClause(id: string, request: UpdateClauseRequest): Promise<Clause> {
    const response = await fetch(`${this.baseUrl}/api/library/clauses/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Clause }>(response)
    return data.data
  }

  async deleteClause(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/library/clauses/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  async getClauseVersions(id: string): Promise<ClauseVersion[]> {
    const response = await fetch(`${this.baseUrl}/api/library/clauses/${id}/versions`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: ClauseVersion[] }>(response)
    return data.data
  }

  async createClauseVersion(id: string, request: CreateClauseVersionRequest): Promise<ClauseVersion> {
    const response = await fetch(`${this.baseUrl}/api/library/clauses/${id}/versions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: ClauseVersion }>(response)
    return data.data
  }

  async restoreClauseVersion(id: string, versionId: string): Promise<Clause> {
    const response = await fetch(`${this.baseUrl}/api/library/clauses/${id}/restore/${versionId}`, {
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

    const url = `${this.baseUrl}/api/library/projects${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Project[] }>(response)
    return data.data
  }

  async getProject(id: string): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/api/library/projects/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Project }>(response)
    return data.data
  }

  async createProject(request: CreateProjectRequest): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/api/library/projects`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Project }>(response)
    return data.data
  }

  async updateProject(id: string, request: UpdateProjectRequest): Promise<Project> {
    const response = await fetch(`${this.baseUrl}/api/library/projects/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Project }>(response)
    return data.data
  }

  async deleteProject(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/library/projects/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  async addProjectItem(projectId: string, request: AddProjectItemRequest): Promise<ProjectItem> {
    const response = await fetch(`${this.baseUrl}/api/library/projects/${projectId}/items`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: ProjectItem }>(response)
    return data.data
  }

  async removeProjectItem(projectId: string, itemId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/library/projects/${projectId}/items/${itemId}`, {
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

    const url = `${this.baseUrl}/api/library/playbooks${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Playbook[] }>(response)
    return data.data
  }

  async getPlaybook(id: string): Promise<Playbook> {
    const response = await fetch(`${this.baseUrl}/api/library/playbooks/${id}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: Playbook }>(response)
    return data.data
  }

  async createPlaybook(request: CreatePlaybookRequest): Promise<Playbook> {
    const response = await fetch(`${this.baseUrl}/api/library/playbooks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Playbook }>(response)
    return data.data
  }

  async updatePlaybook(id: string, request: UpdatePlaybookRequest): Promise<Playbook> {
    const response = await fetch(`${this.baseUrl}/api/library/playbooks/${id}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Playbook }>(response)
    return data.data
  }

  async deletePlaybook(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/library/playbooks/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    await this.handleResponse<{ message: string }>(response)
  }

  async updatePlaybookRules(id: string, request: UpdatePlaybookRulesRequest): Promise<Playbook> {
    const response = await fetch(`${this.baseUrl}/api/library/playbooks/${id}/rules`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request),
    })
    const data = await this.handleResponse<{ data: Playbook }>(response)
    return data.data
  }

  async linkRuleToClause(playbookId: string, ruleId: string, clauseId: string): Promise<PlaybookRule> {
    const response = await fetch(`${this.baseUrl}/api/library/playbooks/${playbookId}/rules/${ruleId}/link-clause`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ clauseId }),
    })
    const data = await this.handleResponse<{ data: PlaybookRule }>(response)
    return data.data
  }

  async getPlaybookVersions(id: string): Promise<PlaybookVersion[]> {
    const response = await fetch(`${this.baseUrl}/api/library/playbooks/${id}/versions`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    })
    const data = await this.handleResponse<{ data: PlaybookVersion[] }>(response)
    return data.data
  }

  async restorePlaybookVersion(id: string, versionId: string): Promise<Playbook> {
    const response = await fetch(`${this.baseUrl}/api/library/playbooks/${id}/restore/${versionId}`, {
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
    const response = await fetch(`${this.baseUrl}/api/library/search`, {
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

  async getShares(resourceType: 'clause' | 'project' | 'playbook', resourceId: string): Promise<LibraryShare[]> {
    // TODO: Implement when backend route is available
    throw new Error('Sharing API not yet implemented')
  }

  async createShare(request: CreateShareRequest): Promise<LibraryShare> {
    // TODO: Implement when backend route is available
    throw new Error('Sharing API not yet implemented')
  }

  async deleteShare(shareId: string): Promise<void> {
    // TODO: Implement when backend route is available
    throw new Error('Sharing API not yet implemented')
  }
}

// Export singleton instance
export const libraryApi = new LibraryApiService()

