import { backendApi } from './api';

// Auth service for development and production
// Uses real backend authentication with development token support

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: AuthUser;
  token: string;
}

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // Make actual API call to backend auth endpoint
      const response = await fetch(`${backendApi['baseUrl']}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
      }

      const authData: AuthResponse = await response.json();

      // Store the token
      backendApi.setAuthToken(authData.token);

      return authData;
    } catch (error) {
      console.warn('Real auth failed, falling back to development mode', error);
      return this.loginWithDevToken();
    }
  }

  private loginWithDevToken(): AuthResponse {
    // Use development token from environment
    const devToken = process.env.REACT_APP_DEV_API_TOKEN;

    if (!devToken) {
      throw new Error('No development token available and auth failed');
    }

    const mockUser: AuthUser = {
      id: 'dev-admin-id',
      email: 'admin@example.com',
      name: 'Admin User (Dev)',
    };

    // Store the development token
    backendApi.setAuthToken(devToken);

    return {
      user: mockUser,
      token: devToken,
    };
  }

  async logout(): Promise<void> {
    const token = backendApi.getAuthToken();

    // Call backend logout endpoint for any token (including dev tokens)
    if (token) {
      try {
        await fetch(`${backendApi['baseUrl']}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.warn('Logout API call failed:', error);
      }
    }

    // Clear all token storage locations (including dev tokens)
    backendApi.clearAuthToken();
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    localStorage.removeItem('jwt');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('dev_api_token');
    localStorage.removeItem('tokenExpiresIn');
    localStorage.removeItem('userId');
    
    // Set a flag to prevent auto-auth after logout
    sessionStorage.setItem('logout_flag', 'true');
  }

  getCurrentUser(): AuthUser | null {
    const token = backendApi.getAuthToken();
    if (!token) return null;

    // For development token, return dev user
    if (token === process.env.REACT_APP_DEV_API_TOKEN) {
      return {
        id: 'dev-admin-id',
        email: 'admin@example.com',
        name: 'Admin User (Dev)',
      };
    }

    // In production, you'd decode the JWT or make API call to get user info
    // For now, return placeholder
    return {
      id: 'current-user',
      email: 'user@example.com',
      name: 'Current User',
    };
  }

  isAuthenticated(): boolean {
    return backendApi.isAuthenticated();
  }

  // Auto-setup development authentication
  // Only sets dev token if no token exists (won't override real login tokens)
  // Respects logout flag to prevent re-authentication after logout
  async setupDevAuth(): Promise<void> {
    // Check if user just logged out - if so, don't auto-auth
    const logoutFlag = sessionStorage.getItem('logout_flag');
    if (logoutFlag === 'true') {
      console.log('🔒 Logout flag detected - skipping dev auth setup');
      sessionStorage.removeItem('logout_flag');
      return;
    }
    
    const devToken = process.env.REACT_APP_DEV_API_TOKEN;
    const devMode = process.env.REACT_APP_DEV_MODE === 'true';

    if (!devMode || !devToken) {
      return;
    }

    console.log('🔧 Development auth setup:');
    console.log('  - REACT_APP_DEV_MODE:', process.env.REACT_APP_DEV_MODE);
    console.log('  - REACT_APP_DEV_API_TOKEN exists:', !!devToken);
    console.log('  - Token preview:', devToken ? `${devToken.slice(0, 20)}...` : 'undefined');

    const currentToken = backendApi.getAuthToken();

    // Only set dev token if no token exists (don't override existing tokens)
    if (!currentToken) {
      console.log('🔧 Setting development authentication token...');
      backendApi.setAuthToken(devToken);
      console.log('✅ Development authentication ready');
    } else {
      console.log('ℹ️ Token already exists, skipping dev auth setup');
    }
  }

  // Auto-login for development/testing (legacy compatibility)
  async autoLogin(): Promise<void> {
    if (!this.isAuthenticated()) {
      await this.setupDevAuth();
    }
  }

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      const response = await fetch(`${backendApi['baseUrl']}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to send reset email' }));
        throw new Error(error.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password failed:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${backendApi['baseUrl']}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to reset password' }));
        throw new Error(error.error?.message || error.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password failed:', error);
      throw error;
    }
  }

  /**
   * Verify reset token
   */
  async verifyResetToken(token: string): Promise<boolean> {
    try {
      const response = await fetch(`${backendApi['baseUrl']}/api/auth/verify-reset-token/${encodeURIComponent(token)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const token = backendApi.getAuthToken();
    
    if (!token) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${backendApi['baseUrl']}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to change password' }));
        throw new Error(error.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Change password failed:', error);
      throw error;
    }
  }
}

export const authService = new AuthService();