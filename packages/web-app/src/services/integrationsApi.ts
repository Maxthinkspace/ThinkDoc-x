// ============================================
// INTEGRATIONS API CLIENT
// Handles organization-level integration management
// ============================================

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3003';
const TOKEN_KEY = 'auth_token';

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

// ============================================
// Types
// ============================================

export type IntegrationType = 'imanage' | 'imanage-onprem' | 'sharepoint' | 'googledrive';

export interface Integration {
  id: string;
  integrationType: IntegrationType;
  enabled: boolean;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateIntegrationRequest {
  enabled: boolean;
  config?: Record<string, unknown>;
}

// ============================================
// API Helper
// ============================================

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || data;
}

// ============================================
// API Methods
// ============================================

/**
 * Get all integrations for the current organization
 */
export async function getIntegrations(): Promise<Integration[]> {
  return apiRequest<Integration[]>('/api/integrations');
}

/**
 * Update an integration (enable/disable and configure)
 */
export async function updateIntegration(
  integrationType: IntegrationType,
  data: UpdateIntegrationRequest
): Promise<Integration> {
  return apiRequest<Integration>(`/api/integrations/${integrationType}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

