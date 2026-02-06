// ============================================
// VAULT API CLIENT
// Replaces Supabase direct calls with your Hono backend
// ============================================

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003';
const TOKEN_KEY = 'auth_token';

// File upload limits
export const MAX_VAULT_FILES = 50;
export const MAX_FILE_SIZE_MB = 20;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// ============================================
// Types (matching your backend)
// ============================================

export interface VaultProject {
  id: string;
  userId: string;
  name: string;
  fileCount: number;
  description?: string;
  visibility?: 'private' | 'shared';
  clientMatter?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VaultFile {
  id: string;
  projectId: string;
  name: string;
  storagePath: string | null;
  category: string | null;
  sizeBytes: number | null;
  mimeType: string | null;
  extractedText?: string | null;
  parsedStructure?: unknown;
  createdAt: string;
}

export interface VaultQuery {
  id: string;
  projectId: string;
  queryType: 'review' | 'ask';
  queryText: string | null;
  columns: ColumnConfig[] | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: unknown;
  createdAt: string;
}

export interface ColumnConfig {
  id: string;
  type: 'free-response' | 'date' | 'classification' | 'verbatim' | 'duration' | 'currency' | 'number';
  name: string;
  query: string;
  classificationOptions?: string[];
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'done' | 'error';
  progress?: {
    currentStep: number;
    totalSteps: number;
    stepName: string;
  };
  result?: unknown;
  error?: string;
}

// ============================================
// API Helper
// ============================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}/api/vault${endpoint}`;
  const token = getToken();

  // Build headers - start with defaults, merge with provided headers
  const headers = new Headers(options.headers);
  
  // Set Content-Type if not already set (for JSON requests)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add Authorization header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    
    // Handle nested error format from backend: { error: { message, code, ... } }
    let errorMessage = `API error: ${response.status}`;
    
    if (errorData.error) {
      if (typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      } else if (errorData.error.message) {
        errorMessage = errorData.error.message;
        // Include details if available (e.g., validation errors)
        if (errorData.error.details) {
          const details = Array.isArray(errorData.error.details) 
            ? errorData.error.details.map((d: any) => d.message || JSON.stringify(d)).join(', ')
            : String(errorData.error.details);
          errorMessage = `${errorMessage}: ${details}`;
        }
      }
    } else if (errorData.details) {
      errorMessage = errorData.details;
    } else if (typeof errorData === 'string') {
      errorMessage = errorData;
    }
    
    throw new Error(errorMessage);
  }

  return response.json();
}

// ============================================
// Projects API
// ============================================

export const projectsApi = {
  async list(): Promise<VaultProject[]> {
    const result = await apiRequest<{ success: boolean; projects: VaultProject[] }>('/projects');
    return result.projects;
  },

  async create(name: string, description?: string, clientMatter?: string): Promise<VaultProject> {
    const body: { name: string; description?: string; clientMatter?: string } = { name };
    if (description && description.trim()) {
      body.description = description.trim();
    }
    if (clientMatter && clientMatter.trim()) {
      body.clientMatter = clientMatter.trim();
    }
    const result = await apiRequest<{ success: boolean; project: VaultProject }>('/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return result.project;
  },

  async get(projectId: string): Promise<VaultProject> {
    const result = await apiRequest<{ success: boolean; project: VaultProject }>(`/projects/${projectId}`);
    return result.project;
  },

  async update(projectId: string, data: { name?: string; description?: string }): Promise<VaultProject> {
    const result = await apiRequest<{ success: boolean; project: VaultProject }>(`/projects/${projectId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    return result.project;
  },

  async delete(projectId: string): Promise<void> {
    await apiRequest(`/projects/${projectId}`, { method: 'DELETE' });
  },
};

// ============================================
// Files API
// ============================================

export const filesApi = {
  async list(projectId: string): Promise<VaultFile[]> {
    const result = await apiRequest<{ success: boolean; files: VaultFile[] }>(`/projects/${projectId}/files`);
    return result.files;
  },

  async get(fileId: string): Promise<VaultFile> {
    const result = await apiRequest<{ success: boolean; file: VaultFile }>(`/files/${fileId}`);
    return result.file;
  },

  async upload(
    projectId: string,
    files: FileList | File[],
    onProgress?: (uploaded: number, total: number) => void
  ): Promise<{ files: VaultFile[]; errors?: { fileName: string; error: string }[] }> {
    if (!files || files.length === 0) {
      throw new Error('No files selected');
    }

    const fileArray = Array.from(files);

    // Validate file count
    if (fileArray.length > MAX_VAULT_FILES) {
      throw new Error(`Too many files selected. Maximum ${MAX_VAULT_FILES} files allowed per upload. You selected ${fileArray.length} files.`);
    }

    // Validate individual file sizes
    const oversizedFiles = fileArray.filter(f => f.size > MAX_FILE_SIZE_BYTES);
    if (oversizedFiles.length > 0) {
      const names = oversizedFiles.map(f => f.name).join(', ');
      throw new Error(`The following files exceed the ${MAX_FILE_SIZE_MB}MB size limit: ${names}`);
    }

    const formData = new FormData();

    for (const file of fileArray) {
      formData.append('files', file);
    }

    // Note: For progress tracking, you'd need XMLHttpRequest or a library
    const token = getToken();
    const headers = new Headers();
    
    // Don't set Content-Type for FormData - browser will set it with boundary
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    console.log('Uploading files:', {
      projectId,
      fileCount: fileArray.length,
      fileNames: fileArray.map(f => f.name),
      hasToken: !!token
    });

    // Start progress simulation (since fetch doesn't support upload progress)
    let progressInterval: ReturnType<typeof setInterval> | null = null;
    let simulatedProgress = 0;
    
    if (onProgress) {
      // Simulate progress while uploading
      progressInterval = setInterval(() => {
        // Slowly increase progress, max out at 90% until complete
        simulatedProgress = Math.min(simulatedProgress + Math.random() * 10, 90);
        const filesEstimate = Math.floor((simulatedProgress / 100) * fileArray.length);
        onProgress(filesEstimate, fileArray.length);
      }, 500);
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/vault/projects/${projectId}/files`, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include',
      });

      // Clear progress interval
      if (progressInterval) {
        clearInterval(progressInterval);
        onProgress?.(fileArray.length, fileArray.length); // Set to 100%
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
        console.error('Upload error:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        // Handle nested error format from backend
        let errorMessage = 'Upload failed';
        if (errorData.error) {
          if (typeof errorData.error === 'string') {
            errorMessage = errorData.error;
          } else if (errorData.error.message) {
            errorMessage = errorData.error.message;
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Upload success:', result);
      return result;
    } catch (error) {
      // Clear progress interval on error
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      throw error;
    }
  },

  async delete(fileId: string): Promise<void> {
    await apiRequest(`/files/${fileId}`, { method: 'DELETE' });
  },

  getDownloadUrl(fileId: string): string {
    return `${API_BASE_URL}/api/vault/files/${fileId}/download`;
  },
};

// ============================================
// AI Features API
// ============================================

export const aiApi = {
  async generateColumns(prompt: string, existingColumns?: ColumnConfig[]): Promise<ColumnConfig[]> {
    const result = await apiRequest<{ success: boolean; columns: ColumnConfig[] }>('/columns/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, existingColumns }),
    });
    return result.columns;
  },

  async runExtraction(
    projectId: string,
    fileIds: string[],
    columns: ColumnConfig[]
  ): Promise<{ jobId: string; queryId: string }> {
    const result = await apiRequest<{ success: boolean; jobId: string; queryId: string }>('/extract', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        fileIds,
        columns,
        queryType: 'review',
      }),
    });
    return { jobId: result.jobId, queryId: result.queryId };
  },

  async askQuery(
    projectId: string,
    fileIds: string[],
    question: string
  ): Promise<{ jobId: string; queryId: string }> {
    const result = await apiRequest<{ success: boolean; jobId: string; queryId: string }>('/ask', {
      method: 'POST',
      body: JSON.stringify({ projectId, fileIds, question }),
    });
    return { jobId: result.jobId, queryId: result.queryId };
  },
};

// ============================================
// Queries API
// ============================================

export const queriesApi = {
  async list(projectId: string): Promise<VaultQuery[]> {
    const result = await apiRequest<{ success: boolean; queries: VaultQuery[] }>(`/projects/${projectId}/queries`);
    return result.queries;
  },

  async getResults(queryId: string): Promise<VaultQuery> {
    const result = await apiRequest<{ success: boolean; query: VaultQuery }>(`/queries/${queryId}`);
    return result.query;
  },
};

// ============================================
// Jobs API
// ============================================

export const jobsApi = {
  async getStatus(jobId: string): Promise<JobStatus> {
    return apiRequest<JobStatus>(`/jobs/${jobId}`);
  },

  async pollUntilComplete(
    jobId: string,
    onProgress?: (status: JobStatus) => void,
    intervalMs = 1000,
    maxAttempts = 300
  ): Promise<JobStatus> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.getStatus(jobId);

      if (onProgress) {
        onProgress(status);
      }

      if (status.status === 'done' || status.status === 'error') {
        return status;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts++;
    }

    throw new Error('Job polling timeout');
  },
};

// ============================================
// Combined Export
// ============================================

export const vaultApi = {
  projects: projectsApi,
  files: filesApi,
  ai: aiApi,
  queries: queriesApi,
  jobs: jobsApi,
};

export default vaultApi;
