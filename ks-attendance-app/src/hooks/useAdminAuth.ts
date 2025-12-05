import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { authService } from '../services';
import { tokenStorage } from '../utils';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'hr';
}

interface UseAdminAuthReturn {
  user: AdminUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

export function useAdminAuth(): UseAdminAuthReturn {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (token) {
        // In real implementation, verify token with backend
        // const userData = await AuthService.verifyToken(token);
        
        // Mock authenticated user
        setUser({
          id: 'admin1',
          name: 'Admin User',
          email: 'admin@company.com',
          role: 'admin',
        });
        setIsAuthenticated(true);
        setError(null);
      }
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      
      // Call AuthService with ToonClient
      const response = await authService.signIn(email, password);
      
      if (response.success && response.user) {
        // Store tokens
        if (response.accessToken) {
          await tokenStorage.setAccessToken(response.accessToken);
        }
        if (response.refreshToken) {
          await tokenStorage.setRefreshToken(response.refreshToken);
        }

        setUser({
          id: response.user.id,
          name: response.user.name,
          email: response.user.email,
          role: response.user.role as 'admin' | 'manager' | 'hr',
        });
        setIsAuthenticated(true);
        setError(null);
        return true;
      }
      
      setError('Invalid credentials');
      Alert.alert('Error', 'Invalid credentials');
      return false;
    } catch (error: any) {
      const message = error?.message || 'Login failed';
      setError(message);
      Alert.alert('Error', message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await tokenStorage.clearTokens();
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to logout');
    }
  };

  return {
    user,
    loading,
    isAuthenticated,
    error,
    login,
    logout,
  };
}
