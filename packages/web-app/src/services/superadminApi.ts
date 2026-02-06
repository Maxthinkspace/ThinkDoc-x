import { apiClient, ApiResponse } from "./api";

export interface PlatformStats {
  totalUsers: number;
  totalOrganizations: number;
  totalSubscriptions: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  canceledSubscriptions: number;
  recentSignups: number;
}

export interface UserWithOrg {
  id: string;
  email: string;
  name?: string | null;
  isActive: boolean;
  organizationId?: string | null;
  organizationName?: string | null;
  createdAt: string;
  roles: string[];
  subscription?: {
    id: string;
    subscriptionType: string;
    status: string;
    endDate: string | null;
  } | null;
}

export interface OrganizationWithStats {
  id: string;
  name: string;
  domain?: string | null;
  createdAt: string;
  userCount: number;
  activeSubscriptionCount: number;
}

export interface SubscriptionWithUser {
  id: string;
  userId: string;
  userEmail: string;
  userName?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
  subscriptionType: string;
  status: string;
  startDate: string;
  endDate: string | null;
  trialEndDate?: string | null;
  autoRenew: boolean;
  currency: string;
  billingPeriod: string;
  createdAt: string;
  updatedAt: string;
}

class SuperAdminApiClient {
  async getStats(): Promise<ApiResponse<PlatformStats>> {
    const response = await apiClient.request<{ data: PlatformStats }>('/api/superadmin/stats');
    if (response.success && response.data) {
      // Backend returns { data: {...} }, API client wraps it, so unwrap here
      const data = (response.data as any)?.data;
      return {
        success: true,
        data: data || response.data,
      };
    }
    return response;
  }

  async listUsers(params?: {
    page?: number;
    limit?: number;
    search?: string;
    organizationId?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<ApiResponse<{ data: UserWithOrg[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.search) queryParams.append('search', params.search);
    if (params?.organizationId) queryParams.append('organizationId', params.organizationId);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    const query = queryParams.toString();
    const response = await apiClient.request<{ data: UserWithOrg[]; pagination: any }>(`/api/superadmin/users${query ? `?${query}` : ''}`);
    if (response.success && response.data) {
      // Backend returns { data: users, pagination: {...} }, API client wraps it, so unwrap here
      const data = (response.data as any)?.data;
      const pagination = (response.data as any)?.pagination;
      return {
        success: true,
        data: {
          data: Array.isArray(data) ? data : [],
          pagination: pagination || {},
        },
      };
    }
    return response;
  }

  async getUser(userId: string): Promise<ApiResponse<UserWithOrg>> {
    return apiClient.request(`/api/superadmin/users/${userId}`);
  }

  async updateUser(userId: string, updates: {
    name?: string;
    email?: string;
    isActive?: boolean;
    organizationId?: string | null;
  }): Promise<ApiResponse<UserWithOrg>> {
    return apiClient.request(`/api/superadmin/users/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async assignUserRoles(userId: string, roleNames: string[], organizationId?: string | null): Promise<ApiResponse<{ id: string; name: string; description: string | null }[]>> {
    return apiClient.request(`/api/superadmin/users/${userId}/roles`, {
      method: 'PUT',
      body: JSON.stringify({ roleNames, organizationId }),
    });
  }

  async impersonateUser(userId: string): Promise<ApiResponse<{ token: string; user: UserWithOrg; expiresAt: string }>> {
    return apiClient.request(`/api/superadmin/users/${userId}/impersonate`, {
      method: 'POST',
    });
  }

  async listOrganizations(): Promise<ApiResponse<OrganizationWithStats[]>> {
    const response = await apiClient.request<{ data: OrganizationWithStats[] }>('/api/superadmin/organizations');
    if (response.success && response.data) {
      // Backend returns { data: [...] }, API client wraps it, so unwrap here
      const data = (response.data as any)?.data;
      return {
        success: true,
        data: Array.isArray(data) ? data : [],
      };
    }
    return response;
  }

  async listSubscriptions(params?: {
    page?: number;
    limit?: number;
    status?: string;
    organizationId?: string;
  }): Promise<ApiResponse<{ data: SubscriptionWithUser[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.organizationId) queryParams.append('organizationId', params.organizationId);

    const query = queryParams.toString();
    const response = await apiClient.request<{ data: SubscriptionWithUser[]; pagination: any }>(`/api/superadmin/subscriptions${query ? `?${query}` : ''}`);
    if (response.success && response.data) {
      // Backend returns { data: subscriptions, pagination: {...} }, API client wraps it, so unwrap here
      const data = (response.data as any)?.data;
      const pagination = (response.data as any)?.pagination;
      return {
        success: true,
        data: {
          data: Array.isArray(data) ? data : [],
          pagination: pagination || {},
        },
      };
    }
    return response;
  }

  async updateSubscription(subscriptionId: string, updates: {
    status?: string;
    subscriptionType?: string;
    endDate?: string | null;
    autoRenew?: boolean;
  }): Promise<ApiResponse<SubscriptionWithUser>> {
    return apiClient.request(`/api/superadmin/subscriptions/${subscriptionId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }
}

export const superAdminApiClient = new SuperAdminApiClient();

