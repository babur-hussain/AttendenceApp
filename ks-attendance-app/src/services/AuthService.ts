/**
 * AuthService
 * TOON-based authentication service
 * Handles sign in, sign out, token refresh using TOON protocol
 */

import { User } from '../types/auth';
import {
  SignInRequest,
  SignInResponse,
  SignOutRequest,
  SignOutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  GetCurrentUserRequest,
  GetCurrentUserResponse,
  TokenPair,
} from '../types/auth-requests';
import { toonClient } from './api/ToonClient';
import { API_ENDPOINTS } from './api/config';
import {
  storeTokens,
  getStoredTokens,
  getAccessToken,
  getRefreshToken,
  updateAccessToken,
  clearTokens,
  isTokenExpired,
} from '../utils/tokenStorage';
import {
  ToonAuthError,
  ToonTokenExpiredError,
  ToonPayloadCorruptedError,
} from '../errors/ToonError';

/**
 * AuthService Class
 * Manages authentication using TOON protocol
 */
export class AuthService {
  private currentUser: User | null = null;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<string> | null = null;

  /**
   * Sign in with email and password
   * Encodes credentials to TOON, sends to backend, decodes TOON response
   * 
   * @param email - User email
   * @param password - User password
   * @returns SignInResponse with tokens and user data
   */
  async signIn(email: string, password: string): Promise<SignInResponse> {
    try {
      // Build TOON request structure: T1=signin, U1=email, U2=password
      const request: SignInRequest = {
        operation: 'signin',
        email,
        password,
      };

      // Send TOON-encoded request (ToonClient handles encoding)
      const response: any = await toonClient.toonPost<SignInResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        request,
        { requireAuth: false }
      );

      // Handle explicit TOON error tokens when success=false
      if (response && response.success === false && response.error) {
        const code: string = response.error.code || '';
        // Propagate specific TOON error codes for UI mapping
        throw new ToonAuthError(code || 'invalid_credentials', 401);
      }

      // Validate response
      if (!response || !response.success || !response.accessToken || !response.refreshToken || !response.user) {
        throw new ToonPayloadCorruptedError('Invalid sign in response structure');
      }

      // Calculate token expiration timestamp
      const expiresAt = Date.now() + (response.expiresIn * 1000);

      // Store tokens securely
      const tokenPair: TokenPair = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        expiresAt,
      };
      await storeTokens(tokenPair);

      // Update ToonClient with access token
      toonClient.setAuthToken(response.accessToken);

      // Cache user data; map TOON tokens to fields if present
      this.currentUser = {
        ...response.user,
      } as User;

      return response as SignInResponse;
    } catch (error) {
      // Clear any partial state
      await clearTokens();
      toonClient.clearAuthToken();
      this.currentUser = null;

      // Re-throw TOON errors
      if (error instanceof ToonAuthError || error instanceof ToonPayloadCorruptedError) {
        throw error;
      }

      // Wrap other errors
      throw new ToonAuthError(
        error instanceof Error ? error.message : 'Sign in failed',
        401
      );
    }
  }

  /**
   * Sign out
   * Sends sign out request with TOON encoding and clears local tokens
   */
  async signOut(): Promise<void> {
    try {
      const accessToken = await getAccessToken();
      if (accessToken) {
        const request: SignOutRequest = { operation: 'signout', accessToken };
        try { await toonClient.toonPost<SignOutResponse>(API_ENDPOINTS.AUTH.LOGOUT, request); } catch {}
      }
    } finally {
      await clearTokens();
      toonClient.clearAuthToken();
      this.currentUser = null;
    }
  }

  /**
   * Refresh access token using refresh token
   * Handles TOON encoding/decoding of token refresh request
   * 
   * @returns New access token
   */
  async refreshToken(): Promise<string> {
    // Prevent multiple simultaneous refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const newAccessToken = await this.refreshPromise;
      return newAccessToken;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform actual token refresh
   * 
   * @returns New access token
   */
  private async performTokenRefresh(): Promise<string> {
    try {
      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        throw new ToonTokenExpiredError('No refresh token available');
      }

      // Build TOON request: T1=refresh, A2=refreshToken
      const request: RefreshTokenRequest = {
        operation: 'refresh',
        refreshToken,
      };

      // Send TOON-encoded refresh request
      const response = await toonClient.toonPost<RefreshTokenResponse>(
        API_ENDPOINTS.AUTH.REFRESH,
        request,
        { requireAuth: false }
      );

      // Validate response
      if (!response.success || !response.accessToken) {
        throw new ToonTokenExpiredError('Token refresh failed');
      }

      // Calculate new expiration
      const expiresAt = Date.now() + (response.expiresIn * 1000);

      // Update access token in storage
      await updateAccessToken(response.accessToken, expiresAt);

      // Update ToonClient with new token
      toonClient.setAuthToken(response.accessToken);

      // If new refresh token provided, update it
      if (response.refreshToken) {
        const tokens = await getStoredTokens();
        if (tokens) {
          await storeTokens({
            accessToken: response.accessToken,
            refreshToken: response.refreshToken,
            expiresAt,
          });
        }
      }

      console.log('Token refreshed successfully');

      return response.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);

      // Clear tokens on refresh failure
      await clearTokens();
      toonClient.clearAuthToken();
      this.currentUser = null;

      // Re-throw as expired token error
      if (error instanceof ToonTokenExpiredError) {
        throw error;
      }

      throw new ToonTokenExpiredError(
        error instanceof Error ? error.message : 'Token refresh failed'
      );
    }
  }

  /**
   * Get current user from server
   * Fetches user data using TOON-encoded request
   * 
   * @returns Current user data
   */
  async getCurrentUser(): Promise<User> {
    try {
      if (this.currentUser) return this.currentUser;

      const accessToken = await getAccessToken();
      if (!accessToken) throw new ToonAuthError('No access token available', 401);

      const expired = await isTokenExpired();
      if (expired) await this.refreshToken();

      const request: GetCurrentUserRequest = { operation: 'getuser', accessToken };
      const response: any = await toonClient.toonPost<GetCurrentUserResponse>(
        '/auth/me',
        request
      );

      if (!response || !response.success || !response.user || typeof response.user !== 'object') {
        throw new ToonPayloadCorruptedError('Invalid user response structure');
      }

      const user: User = {
        ...response.user,
      } as User;
      this.currentUser = user;
      return user;
    } catch (error) {
      this.currentUser = null;
      throw error;
    }
  }

  /**
   * Restore session from stored tokens
   * Loads tokens and validates them
   * 
   * @returns User data if session is valid, null otherwise
   */
  async restoreSession(): Promise<User | null> {
    try {
      const tokens = await getStoredTokens();

      if (!tokens) {
        console.log('No stored tokens found');
        return null;
      }

      // Check if token is expired
      const expired = await isTokenExpired();
      
      if (expired) {
        console.log('Stored token is expired, attempting refresh');
        try {
          await this.refreshToken();
        } catch (error) {
          console.warn('Token refresh failed during session restore:', error);
          await clearTokens();
          return null;
        }
      } else {
        // Set token in client
        toonClient.setAuthToken(tokens.accessToken);
      }

      // Fetch current user
      const user = await this.getCurrentUser();
      
      console.log('Session restored successfully:', user.email);
      
      return user;
    } catch (error) {
      console.error('Session restore failed:', error);
      
      // Clear invalid session
      await clearTokens();
      toonClient.clearAuthToken();
      this.currentUser = null;
      
      return null;
    }
  }

  /**
   * Clear cached user data
   */
  clearUserCache(): void {
    this.currentUser = null;
  }

  /**
   * Get cached user without server request
   * 
   * @returns Cached user or null
   */
  getCachedUser(): User | null {
    return this.currentUser;
  }

  /**
   * Check if user is authenticated
   * 
   * @returns True if user has valid tokens
   */
  async isAuthenticated(): Promise<boolean> {
    const tokens = await getStoredTokens();
    return tokens !== null;
  }

  /**
   * Request PIN reset
   * Sends TOON-encoded request to initiate PIN reset flow
   * 
   * @param email - User email
   * @returns Success response with reset instructions
   */
  async requestPinReset(email: string): Promise<{ success: boolean; message: string }> {
    try {
      const request = {
        operation: 'forgot',
        email,
      };

      const response: any = await toonClient.toonPost(
        API_ENDPOINTS.AUTH.FORGOT,
        request,
        { requireAuth: false }
      );

      if (!response || !response.success) {
        throw new ToonAuthError('PIN reset request failed', 400);
      }

      return {
        success: true,
        message: response.message || 'PIN reset instructions sent to your email',
      };
    } catch (error) {
      if (error instanceof ToonAuthError || error instanceof ToonPayloadCorruptedError) {
        throw error;
      }
      throw new ToonAuthError(
        error instanceof Error ? error.message : 'Failed to request PIN reset',
        400
      );
    }
  }

  /**
   * Reset PIN with token
   * Sends TOON-encoded request to reset PIN using reset token
   * 
   * @param resetToken - Token from email/SMS
   * @param newPin - New PIN
   * @returns Success response
   */
  async resetPin(resetToken: string, newPin: string): Promise<{ success: boolean; message: string }> {
    try {
      const request = {
        operation: 'reset',
        resetToken,
        newPin,
      };

      const response: any = await toonClient.toonPost(
        API_ENDPOINTS.AUTH.RESET,
        request,
        { requireAuth: false }
      );

      if (!response || !response.success) {
        throw new ToonAuthError('PIN reset failed', 400);
      }

      return {
        success: true,
        message: response.message || 'PIN reset successfully. Please sign in with your new PIN.',
      };
    } catch (error) {
      if (error instanceof ToonAuthError || error instanceof ToonPayloadCorruptedError) {
        throw error;
      }
      throw new ToonAuthError(
        error instanceof Error ? error.message : 'Failed to reset PIN',
        400
      );
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
