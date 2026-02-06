const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Check if response has content before trying to parse JSON
    const contentType = response.headers.get('content-type');
    const hasJsonContent = contentType?.includes('application/json');
    const contentLength = response.headers.get('content-length');
    const hasContent = contentLength !== '0' && contentLength !== null;
    
    let data: any = null;
    
    if (hasJsonContent || hasContent) {
      const text = await response.text();
      if (text) {
        try {
          data = JSON.parse(text);
        } catch {
          // Response was not valid JSON
          if (!response.ok) {
            return {
              success: false,
              error: {
                message: text || `Request failed with status ${response.status}`,
                code: 'PARSE_ERROR',
              },
            };
          }
        }
      }
    }

    if (!response.ok) {
      return {
        success: false,
        error: {
          message: data?.error?.message || data?.message || `Request failed with status ${response.status}`,
          code: data?.error?.code,
        },
      };
    }

    return {
      success: true,
      data: data?.data ?? data ?? null,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Network error',
        code: 'NETWORK_ERROR',
      },
    };
  }
}

// User types
export interface UserWithRoles {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
  roles: {
    id: string;
    name: string;
    description: string | null;
  }[];
  subscription?: {
    id: string;
    subscriptionType: string;
    status: string;
    endDate: string;
  } | null;
}

export interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  isSystem: boolean;
}

export interface Team {
  id: string;
  name: string;
  description: string | null;
  organizationId: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  memberCount?: number;
}

export interface TeamMember {
  userId: string;
  email: string;
  name: string | null;
  role: 'admin' | 'member';
  createdAt: string;
}

export interface SubscriptionInfo {
  user: {
    id: string;
    email: string;
    name: string | null;
  };
  subscription: {
    id: string;
    subscriptionType: string;
    status: string;
    startDate: string;
    endDate: string;
    billingPeriod: string;
  } | null;
}

// Admin API functions
export const adminApi = {
  // User Management
  async listUsers(params?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<{ users: UserWithRoles[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    
    const queryString = searchParams.toString();
    const endpoint = `/api/admin/users${queryString ? `?${queryString}` : ''}`;
    
    return apiRequest(endpoint);
  },

  async getUser(userId: string): Promise<ApiResponse<UserWithRoles>> {
    return apiRequest(`/api/admin/users/${userId}`);
  },

  async inviteUser(data: { email: string; name?: string; roles?: string[] }): Promise<ApiResponse<UserWithRoles>> {
    return apiRequest('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateUser(userId: string, data: { name?: string; isActive?: boolean }): Promise<ApiResponse<UserWithRoles>> {
    return apiRequest(`/api/admin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async removeUser(userId: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest(`/api/admin/users/${userId}`, {
      method: 'DELETE',
    });
  },

  // Role Management
  async listRoles(): Promise<ApiResponse<Role[]>> {
    return apiRequest('/api/admin/roles');
  },

  async createRole(data: { name: string; description?: string; permissions: string[] }): Promise<ApiResponse<Role>> {
    return apiRequest('/api/admin/roles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRole(roleId: string, data: { name?: string; description?: string; permissions?: string[] }): Promise<ApiResponse<Role>> {
    return apiRequest(`/api/admin/roles/${roleId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteRole(roleId: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest(`/api/admin/roles/${roleId}`, {
      method: 'DELETE',
    });
  },

  async getUserRoles(userId: string): Promise<ApiResponse<{ id: string; name: string; description: string | null }[]>> {
    return apiRequest(`/api/admin/users/${userId}/roles`);
  },

  async assignUserRoles(userId: string, roles: string[]): Promise<ApiResponse<{ id: string; name: string; description: string | null }[]>> {
    return apiRequest(`/api/admin/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roles }),
    });
  },

  // Subscription Management
  async listOrganizationSubscriptions(): Promise<ApiResponse<SubscriptionInfo[]>> {
    return apiRequest('/api/admin/subscriptions');
  },

  // Team Management (uses organization routes)
  async listTeams(): Promise<ApiResponse<Team[]>> {
    return apiRequest('/api/organization/teams');
  },

  async createTeam(data: { name: string; description?: string }): Promise<ApiResponse<Team>> {
    return apiRequest('/api/organization/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getTeam(teamId: string): Promise<ApiResponse<Team>> {
    return apiRequest(`/api/organization/teams/${teamId}`);
  },

  async updateTeam(teamId: string, data: { name?: string; description?: string }): Promise<ApiResponse<Team>> {
    return apiRequest(`/api/organization/teams/${teamId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  async deleteTeam(teamId: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest(`/api/organization/teams/${teamId}`, {
      method: 'DELETE',
    });
  },

  async getTeamMembers(teamId: string): Promise<ApiResponse<TeamMember[]>> {
    return apiRequest(`/api/organization/teams/${teamId}/members`);
  },

  async inviteTeamMember(teamId: string, data: { email: string; role?: 'admin' | 'member' }): Promise<ApiResponse<TeamMember>> {
    return apiRequest(`/api/organization/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async removeTeamMember(teamId: string, userId: string): Promise<ApiResponse<{ message: string }>> {
    return apiRequest(`/api/organization/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  async updateTeamMemberRole(teamId: string, userId: string, role: 'admin' | 'member'): Promise<ApiResponse<TeamMember>> {
    return apiRequest(`/api/organization/teams/${teamId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
};

export default adminApi;

