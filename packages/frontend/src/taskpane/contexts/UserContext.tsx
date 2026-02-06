import * as React from "react";
import { backendApi, type GetMeResponse, type Subscription } from "../../services/api";
import { authService } from "../../services/auth";

interface User {
  id: string;
  email: string;
  name: string | null;
  organizationId?: string | null;
  organization?: {
    id: string;
    name: string;
    domain: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  subscription?: Subscription | null;
}

interface UserContextType {
  user: User | null;
  subscription: Subscription | null;
  isLoading: boolean;
  isCheckingAuth: boolean;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (updates: { name?: string; email?: string }) => Promise<void>;
}

const UserContext = React.createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [subscription, setSubscription] = React.useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(false);
  const bypassLogin = process.env.BYPASS_LOGIN === "true";

  const refreshUser = React.useCallback(async () => {
    setIsCheckingAuth(true);
    setIsLoading(true);

    try {
      const token = backendApi.getAuthToken();
      if (!token) {
        console.log('🔒 No token found');
        setUser(null);
        setSubscription(null);
        setIsLoading(false);
        setIsCheckingAuth(false);
        return;
      }

      // Get user info from /api/auth/me
      console.log('🔍 Fetching user info...');
      const meResponse = await backendApi.getMe();
      const userData = meResponse.data;
      
      // Validate that we have the required user data
      if (!userData || !userData.id || !userData.email) {
        console.error('❌ Invalid user data received:', userData);
        setUser(null);
        setSubscription(null);
        return;
      }
      
      console.log('✅ User data received:', { 
        id: userData.id, 
        email: userData.email, 
        name: userData.name,
        hasOrg: !!userData.organization,
        hasSubscription: !!userData.subscription
      });
      
      setUser(userData as User);
      
      // Set subscription if available
      if (userData.subscription) {
        setSubscription(userData.subscription);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      // Don't set user to null if there was an error - might be a temporary network issue
      // Only clear if it's an auth error (401/403)
      if (error instanceof Error && (error as any).status === 401 || (error as any).status === 403) {
        console.log('🔒 Authentication error, clearing user');
        setUser(null);
        setSubscription(null);
      }
    } finally {
      setIsLoading(false);
      setIsCheckingAuth(false);
    }
  }, []);

  const updateUser = React.useCallback(async (updates: { name?: string; email?: string }) => {
    try {
      const meResponse = await backendApi.updateMe(updates);
      const userData = meResponse.data;
      
      if (!userData || !userData.id || !userData.email) {
        throw new Error('Invalid user data received');
      }
      
      setUser(userData as User);
      
      // Set subscription if available
      if (userData.subscription) {
        setSubscription(userData.subscription);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      // Set logout flag BEFORE calling logout to prevent auto-auth
      sessionStorage.setItem('logout_flag', 'true');
      await authService.logout();
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      // Always clear local state, even if API call fails
      backendApi.clearAuthToken();
      // Clear all possible token storage locations
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      localStorage.removeItem('jwt');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('dev_api_token');
      localStorage.removeItem('tokenExpiresIn');
      localStorage.removeItem('userId');
      
      setUser(null);
      setSubscription(null);
      
      // Force a hard reload to ensure all state is cleared
      // Try multiple methods to ensure reload works in Word add-in context
      try {
        // Method 1: Direct reload
        window.location.reload();
      } catch (e) {
        try {
          // Method 2: Navigate to same URL
          window.location.href = window.location.href.split('?')[0];
        } catch (e2) {
          // Method 3: Replace location
          window.location.replace(window.location.href.split('?')[0]);
        }
      }
    }
  }, []);

  // Check auth on mount
  React.useEffect(() => {
    const checkAuthAndSubscription = async () => {
      if (bypassLogin) {
        console.log("Bypass login");
        const jwtToken = localStorage.getItem('authToken') ||
            localStorage.getItem('token') ||
            localStorage.getItem('jwt') ||
            localStorage.getItem('accessToken') ||
            localStorage.getItem('dev_api_token');

        if (!jwtToken) {
          alert('No authentication token found.');
          setIsLoading(false);
          setIsCheckingAuth(false);
          return;
        }
        // Even in bypass mode, try to fetch user data if token exists
        await refreshUser();
        return;
      }

      await refreshUser();
    };

    checkAuthAndSubscription();
  }, [bypassLogin, refreshUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        subscription,
        isLoading,
        isCheckingAuth,
        logout,
        refreshUser,
        updateUser,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = React.useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};

