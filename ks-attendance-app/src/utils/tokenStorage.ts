/**
 * Token Storage Utilities
 * Secure token management using expo-secure-store
 */

import * as SecureStore from 'expo-secure-store';
import { TokenPair } from '../types/auth-requests';

// Storage keys
const ACCESS_TOKEN_KEY = 'auth_access_token';
const REFRESH_TOKEN_KEY = 'auth_refresh_token';
const TOKEN_EXPIRES_AT_KEY = 'auth_token_expires_at';

/**
 * Store token pair securely
 * 
 * @param tokens - Access and refresh tokens with expiration
 */
export async function storeTokens(tokens: TokenPair): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken),
      SecureStore.setItemAsync(TOKEN_EXPIRES_AT_KEY, tokens.expiresAt.toString()),
    ]);
  } catch (error) {
    console.error('Failed to store tokens:', error);
    throw new Error('Token storage failed');
  }
}

/**
 * Retrieve stored token pair
 * 
 * @returns Token pair or null if not found
 */
export async function getStoredTokens(): Promise<TokenPair | null> {
  try {
    const [accessToken, refreshToken, expiresAtStr] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.getItemAsync(TOKEN_EXPIRES_AT_KEY),
    ]);

    if (!accessToken || !refreshToken || !expiresAtStr) {
      return null;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: parseInt(expiresAtStr, 10),
    };
  } catch (error) {
    console.error('Failed to retrieve tokens:', error);
    return null;
  }
}

/**
 * Get access token only
 * 
 * @returns Access token or null
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get access token:', error);
    return null;
  }
}

/**
 * Get refresh token only
 * 
 * @returns Refresh token or null
 */
export async function getRefreshToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Failed to get refresh token:', error);
    return null;
  }
}

/**
 * Update access token only
 * Used after token refresh
 * 
 * @param accessToken - New access token
 * @param expiresAt - New expiration timestamp
 */
export async function updateAccessToken(accessToken: string, expiresAt: number): Promise<void> {
  try {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(TOKEN_EXPIRES_AT_KEY, expiresAt.toString()),
    ]);
  } catch (error) {
    console.error('Failed to update access token:', error);
    throw new Error('Token update failed');
  }
}

/**
 * Clear all stored tokens
 */
export async function clearTokens(): Promise<void> {
  try {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      SecureStore.deleteItemAsync(TOKEN_EXPIRES_AT_KEY),
    ]);
  } catch (error) {
    console.error('Failed to clear tokens:', error);
    // Don't throw - clearing tokens should always succeed
  }
}

/**
 * Check if access token is expired
 * 
 * @returns True if token is expired or will expire in next 60 seconds
 */
export async function isTokenExpired(): Promise<boolean> {
  try {
    const expiresAtStr = await SecureStore.getItemAsync(TOKEN_EXPIRES_AT_KEY);
    
    if (!expiresAtStr) {
      return true;
    }

    const expiresAt = parseInt(expiresAtStr, 10);
    const now = Date.now();
    
    // Consider token expired if it expires in next 60 seconds (buffer)
    return now >= (expiresAt - 60000);
  } catch (error) {
    console.error('Failed to check token expiration:', error);
    return true; // Assume expired on error
  }
}

/**
 * Check if auth tokens are stored
 * 
 * @returns True if both tokens are stored
 */
export async function hasTokens(): Promise<boolean> {
  try {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
    ]);

    return !!(accessToken && refreshToken);
  } catch (error) {
    console.error('Failed to check for tokens:', error);
    return false;
  }
}

const tokenStorage = {
  setAccessToken: (token: string) => SecureStore.setItemAsync(ACCESS_TOKEN_KEY, token),
  setRefreshToken: (token: string) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token),
  getAccessToken: () => SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
  getRefreshToken: () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
  clearTokens,
  storeTokens,
  hasTokens,
};

export default tokenStorage;
