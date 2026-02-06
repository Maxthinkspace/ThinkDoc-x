const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

class ApiClient {
  public baseUrl: string; // Made public for access in other services
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      // Log the request for debugging (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API] ${options.method || 'GET'} ${url}`);
      }
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: `HTTP ${response.status}: ${response.statusText}`,
        }));
        
        // Handle different error formats:
        // 1. { error: 'string' } - backend vault controller format
        // 2. { error: { message: 'string', code?: string } } - standard format
        // 3. { message: 'string' } - some error handlers
        let errorMessage = 'Request failed';
        let errorCode: string | undefined;
        
        if (typeof error === 'string') {
          errorMessage = error;
        } else if (error?.error) {
          if (typeof error.error === 'string') {
            errorMessage = error.error;
          } else if (error.error?.message) {
            errorMessage = error.error.message;
            errorCode = error.error.code;
          }
        } else if (error?.message) {
          errorMessage = error.message;
          errorCode = error.code;
        }
        
        return {
          success: false,
          error: {
            message: errorMessage,
            code: errorCode,
          },
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      // Handle network errors (failed to fetch, CORS, etc.)
      let errorMessage = 'Network error';
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = `Cannot connect to backend server at ${this.baseUrl}. Please ensure the backend is running on port 3003 with HTTPS enabled.`;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      return {
        success: false,
        error: {
          message: errorMessage,
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  // Projects
  async getProjects() {
    return this.request('/api/vault/projects');
  }

  async createProject(name: string, description?: string) {
    return this.request('/api/vault/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async getProject(projectId: string) {
    return this.request(`/api/vault/projects/${projectId}`);
  }

  async updateProject(projectId: string, updates: { name?: string; description?: string }) {
    return this.request(`/api/vault/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteProject(projectId: string) {
    return this.request(`/api/vault/projects/${projectId}`, {
      method: 'DELETE',
    });
  }

  // Documents
  async getProjectDocuments(projectId: string) {
    return this.request(`/api/vault/projects/${projectId}/files`);
  }

  async uploadDocuments(projectId: string, files: File[]) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(
      `${this.baseUrl}/api/vault/projects/${projectId}/files`,
      {
        method: 'POST',
        headers,
        body: formData,
      }
    );

    return response.json();
  }

  // Clauses
  async getClauses(category?: string) {
    const url = category
      ? `/api/vault/clauses?category=${encodeURIComponent(category)}`
      : '/api/vault/clauses';
    return this.request(url);
  }

  async createClause(clause: {
    name: string;
    text: string;
    category?: string;
    tags?: string[];
    description?: string;
  }) {
    return this.request('/api/vault/clauses', {
      method: 'POST',
      body: JSON.stringify(clause),
    });
  }

  // Playbooks
  async getPlaybooks() {
    return this.request('/api/playbooks');
  }

  async createPlaybook(playbook: {
    playbookName: string;
    description?: string;
    rules: any[];
    playbookType?: string;
    userPosition?: string;
    jurisdiction?: string;
  }) {
    return this.request('/api/playbooks', {
      method: 'POST',
      body: JSON.stringify(playbook),
    });
  }

  // Workflows
  async getWorkflows() {
    return this.request('/api/workflows');
  }

  async getWorkflow(workflowId: string) {
    return this.request(`/api/workflows/${workflowId}`);
  }

  async createWorkflow(workflow: {
    name: string;
    description?: string;
    blocks: any[];
    enabled?: boolean;
  }) {
    return this.request('/api/workflows', {
      method: 'POST',
      body: JSON.stringify(workflow),
    });
  }

  async updateWorkflow(workflowId: string, updates: {
    name?: string;
    description?: string;
    blocks?: any[];
    enabled?: boolean;
  }) {
    return this.request(`/api/workflows/${workflowId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteWorkflow(workflowId: string) {
    return this.request(`/api/workflows/${workflowId}`, {
      method: 'DELETE',
    });
  }

  async runWorkflow(workflowId: string, input: {
    documentId?: string;
    projectId?: string;
    fileIds?: string[];
    input?: Record<string, any>;
  }) {
    return this.request(`/api/workflows/${workflowId}/run`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  // Analysis
  async runContractReview(documentId: string, playbookId: string) {
    return this.request('/api/contract-review/review-with-playbooks', {
      method: 'POST',
      body: JSON.stringify({
        documentId,
        playbookId,
      }),
    });
  }

  async getJobStatus(jobId: string) {
    return this.request(`/api/jobs/${jobId}`);
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

