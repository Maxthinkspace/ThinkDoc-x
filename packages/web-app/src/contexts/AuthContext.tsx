import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";

interface User {
  id: string;
  email: string;
  name?: string;
  roles?: string[];
  permissions?: string[];
  subscription?: {
    id: string;
    subscriptionType: string;
    status: string;
    endDate: string;
  } | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  getToken: () => string | null;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  isAdmin: boolean;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://localhost:3003';
const TOKEN_KEY = 'auth_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const getToken = useCallback((): string | null => {
    return localStorage.getItem(TOKEN_KEY);
  }, []);

  const setToken = (token: string): void => {
    localStorage.setItem(TOKEN_KEY, token);
  };

  const clearToken = (): void => {
    localStorage.removeItem(TOKEN_KEY);
  };

  const checkAuth = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        clearToken();
        setUser(null);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      
      // The /api/auth/me endpoint should return user data with roles
      setUser({
        id: data.user?.id || data.id,
        email: data.user?.email || data.email,
        name: data.user?.name || data.name,
        roles: data.user?.roles || data.roles || [],
        permissions: data.user?.permissions || data.permissions || [],
        subscription: data.user?.subscription || data.subscription || null,
      });
    } catch (error) {
      console.error('Auth check failed:', error);
      clearToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(error.error?.message || error.message || 'Login failed');
      }

      const data = await response.json();
      
      if (!data.token) {
        throw new Error('No token received from server');
      }

      setToken(data.token);
      
      // Set user from login response
      setUser({
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.name,
        roles: data.user?.roles || [],
        permissions: data.user?.permissions || [],
        subscription: data.subscription || null,
      });
    } catch (error) {
      clearToken();
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name?: string) => {
    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Registration failed' }));
        throw new Error(error.error?.message || error.message || 'Registration failed');
      }

      const data = await response.json();
      
      if (!data.token) {
        throw new Error('No token received from server');
      }

      setToken(data.token);
      
      // Set user from registration response
      setUser({
        id: data.user?.id,
        email: data.user?.email,
        name: data.user?.name,
        roles: data.user?.roles || ['user'],
        permissions: data.user?.permissions || [],
        subscription: null,
      });
    } catch (error) {
      clearToken();
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const token = getToken();
    
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      }
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      clearToken();
      setUser(null);
    }
  };

  const hasRole = useCallback((role: string): boolean => {
    return user?.roles?.includes(role) || false;
  }, [user]);

  const hasPermission = useCallback((permission: string): boolean => {
    return user?.permissions?.includes(permission) || false;
  }, [user]);

  const isAdmin = user?.roles?.includes('admin') || false;

  const forgotPassword = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to send reset email' }));
        throw new Error(error.error?.message || error.message || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('Forgot password failed:', error);
      throw error;
    }
  };

  const resetPassword = async (token: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
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
  };

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    checkAuth,
    getToken,
    hasRole,
    hasPermission,
    isAdmin,
    forgotPassword,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
