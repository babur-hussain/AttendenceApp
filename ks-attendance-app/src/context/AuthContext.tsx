import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthState, AuthContextType } from '../types/auth';
import { authService } from '../services/AuthService';
import {
  ToonAuthError,
  ToonTokenExpiredError,
  ToonPayloadCorruptedError,
  isAuthError,
} from '../errors/ToonError';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  /**
   * Load stored authentication on mount
   */
  useEffect(() => {
    restoreSession();
  }, []);

  /**
   * Restore authentication session from stored tokens
   */
  const restoreSession = async (): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // Attempt to restore session using AuthService
      const user = await authService.restoreSession();

      if (user && typeof user === 'object') {
        // Get token from storage for state
        const { getAccessToken } = await import('../utils/tokenStorage');
        const token = await getAccessToken();

        setAuthState({
          user,
          token: token || null,
          isLoading: false,
        });
      } else {
        setAuthState({
          user: null,
          token: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Session restore failed:', error);
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
      });
    }
  };

  /**
   * Sign in with email and password
   * Uses AuthService to send TOON-encoded request and handle TOON response
   * 
   * @param email - User email
   * @param password - User password
   */
  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // Call AuthService which handles TOON encoding/decoding
      const response = await authService.signIn(email, password);

      // AuthService already stored tokens and decoded TOON user object
      // Update state with decoded data
      setAuthState({
        user: response.user ?? null,
        token: response.accessToken ?? null,
        isLoading: false,
      });

      if (response.user && response.user.email) {
        console.log('User signed in via TOON:', response.user.email);
      }
    } catch (error) {
      console.error('Sign in error:', error);

      // Handle specific TOON errors
      if (error instanceof ToonAuthError) {
        // Invalid credentials
        throw new Error('Invalid email or password');
      } else if (error instanceof ToonPayloadCorruptedError) {
        // Corrupted TOON response
        throw new Error('Server response corrupted. Please try again.');
      } else if (isAuthError(error)) {
        // Other auth errors
        throw new Error('Authentication failed. Please try again.');
      }

      // Reset state on error
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
      });

      throw error;
    }
  };

  /**
   * Sign out
   * Uses AuthService to send TOON-encoded sign out request
   */
  const signOut = async (): Promise<void> => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true }));

      // Call AuthService which handles TOON sign out
      await authService.signOut();

      // Update state
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
      });

      console.log('User signed out');
    } catch (error) {
      console.error('Sign out error:', error);

      // Always clear state even on error
      setAuthState({
        user: null,
        token: null,
        isLoading: false,
      });
    }
  };

  /**
   * Refresh token when expired
   * Uses AuthService to handle TOON token refresh
   */
  const handleTokenRefresh = async (): Promise<void> => {
    try {
      // AuthService handles TOON encoding/decoding for refresh
      const newAccessToken = await authService.refreshToken();

      // Update state with new token
      setAuthState((prev) => ({
        ...prev,
        token: newAccessToken,
      }));

      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed:', error);

      // Token refresh failed, sign out user
      if (error instanceof ToonTokenExpiredError) {
        await signOut();
      }
    }
  };

  const value: AuthContextType = {
    ...authState,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to access auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
