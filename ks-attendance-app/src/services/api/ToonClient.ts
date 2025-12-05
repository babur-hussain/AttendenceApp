/**
 * ToonClient
 * Network client for TOON protocol communication
 * Handles HTTP requests, retries, auth tokens, and error handling
 */

import {
  ToonError,
  ToonNetworkError,
  ToonAuthError,
  ToonTokenMissingError,
  ToonTokenExpiredError,
  ToonTimeoutError,
  ToonServerError,
  ToonPayloadCorruptedError,
  isAuthError,
} from '../../errors/ToonError';
import { encodeToToonPayload, decodeFromToonPayload } from '../../utils/toon';
import { buildUrl, buildHeaders } from './config';

/**
 * ToonClientConfig
 * Configuration options for ToonClient
 */
export interface ToonClientConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
  authToken?: string;
  onTokenExpired?: () => void | Promise<void>;
}

/**
 * ToonRequestOptions
 * Options for individual requests
 */
export interface ToonRequestOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  requireAuth?: boolean;
}

/**
 * ToonClient Class
 * Main network client for TOON-based API communication
 */
export class ToonClient {
  private config: ToonClientConfig;
  private requestCount: number = 0;

  constructor(config: Partial<ToonClientConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'https://api.example.com',
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 1000,
      authToken: config.authToken,
      onTokenExpired: config.onTokenExpired,
    };
  }

  /**
   * GET request with TOON encoding
   * 
   * @param path - API endpoint path
   * @param params - Optional query parameters
   * @param options - Request options
   * @returns Decoded response data
   */
  async toonGet<T = any>(
    path: string,
    params?: Record<string, any>,
    options?: ToonRequestOptions
  ): Promise<T> {
    const url = this.buildUrlWithParams(path, params);
    return this.sendRequest<T>('GET', url, undefined, options);
  }

  /**
   * POST request with TOON encoding
   * 
   * @param path - API endpoint path
   * @param body - Request body to encode
   * @param options - Request options
   * @returns Decoded response data
   */
  async toonPost<T = any>(
    path: string,
    body?: any,
    options?: ToonRequestOptions
  ): Promise<T> {
    const url = buildUrl(path);
    return this.sendRequest<T>('POST', url, body, options);
  }

  /**
   * PUT request with TOON encoding
   * 
   * @param path - API endpoint path
   * @param body - Request body to encode
   * @param options - Request options
   * @returns Decoded response data
   */
  async toonPut<T = any>(
    path: string,
    body?: any,
    options?: ToonRequestOptions
  ): Promise<T> {
    const url = buildUrl(path);
    return this.sendRequest<T>('PUT', url, body, options);
  }

  /**
   * DELETE request with TOON encoding
   * 
   * @param path - API endpoint path
   * @param options - Request options
   * @returns Decoded response data
   */
  async toonDelete<T = any>(
    path: string,
    options?: ToonRequestOptions
  ): Promise<T> {
    const url = buildUrl(path);
    return this.sendRequest<T>('DELETE', url, undefined, options);
  }

  /**
   * Core request sender with retry logic and error handling
   * 
   * @param method - HTTP method
   * @param url - Full URL
   * @param body - Request body
   * @param options - Request options
   * @returns Decoded response
   */
  private async sendRequest<T>(
    method: string,
    url: string,
    body?: any,
    options?: ToonRequestOptions
  ): Promise<T> {
    const maxRetries = options?.retries ?? this.config.maxRetries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // Check auth token if required
        if (options?.requireAuth !== false && !this.config.authToken) {
          throw new ToonTokenMissingError('Authentication token is required for this request');
        }

        // Execute request
        const response = await this.executeRequest<T>(method, url, body, options);
        
        // Increment successful request count
        this.requestCount++;
        
        return response;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on auth errors
        if (isAuthError(error)) {
          if (error instanceof ToonTokenExpiredError && this.config.onTokenExpired) {
            await this.config.onTokenExpired();
          }
          throw error;
        }

        // Don't retry on validation/payload errors
        if (
          error instanceof ToonPayloadCorruptedError ||
          (error instanceof ToonError && error.code.includes('VALIDATION'))
        ) {
          throw error;
        }

        // Retry on network errors
        if (attempt < maxRetries) {
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          console.log(`Retrying request (${attempt + 1}/${maxRetries}) after ${delay}ms...`);
          await this.sleep(delay);
          continue;
        }

        // Max retries reached
        throw lastError;
      }
    }

    throw lastError || new ToonNetworkError('Request failed after maximum retries');
  }

  /**
   * Execute single HTTP request
   * 
   * @param method - HTTP method
   * @param url - Full URL
   * @param body - Request body
   * @param options - Request options
   * @returns Decoded response
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    body?: any,
    options?: ToonRequestOptions
  ): Promise<T> {
    const timeout = options?.timeout ?? this.config.timeout;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // Build headers
      const headers = {
        ...buildHeaders(this.config.authToken),
        ...options?.headers,
      };

      // Encode body to TOON if present
      let encodedBody: string | Uint8Array | undefined;
      if (body !== undefined) {
        encodedBody = encodeToToonPayload(body);
      }

      // Prepare request body
      let requestBody: string | undefined;
      if (encodedBody instanceof Uint8Array) {
        // Convert Uint8Array to base64 string for transmission
        requestBody = this.uint8ArrayToBase64(encodedBody);
        headers['Content-Transfer-Encoding'] = 'base64';
      } else if (typeof encodedBody === 'string') {
        requestBody = encodedBody;
      }

      // Make HTTP request
      if (__DEV__) {
        console.log('🌐 ToonClient Request:', {
          method,
          url,
          headers,
          bodyLength: requestBody?.length || 0,
        });
      }

      const response = await fetch(url, {
        method,
        headers,
        body: requestBody,
        signal: controller.signal,
      });

      if (__DEV__) {
        console.log('📥 ToonClient Response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
        });
      }

      clearTimeout(timeoutId);

      // Handle HTTP errors
      await this.handleHttpErrors(response);

      // Read response
      const responseText = await response.text();
      
      if (__DEV__) {
        console.log('📦 ToonClient Raw Response:', responseText.substring(0, 200));
      }
      
      // Check if response is base64 encoded
      let rawResponse: string | Uint8Array = responseText;
      if (response.headers.get('Content-Transfer-Encoding') === 'base64') {
        rawResponse = this.base64ToUint8Array(responseText);
      }

      // Decode TOON response (never use JSON.parse!)
      const decodedData = decodeFromToonPayload(rawResponse);

      if (__DEV__) {
        console.log('✅ ToonClient Decoded:', JSON.stringify(decodedData, null, 2).substring(0, 500));
      }

      return decodedData as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ToonTimeoutError('Request timed out', timeout);
      }

      // Handle fetch errors
      if (error instanceof TypeError) {
        console.error('❌ Network Error Details:', {
          message: error.message,
          url,
          method,
        });
        throw new ToonNetworkError('Network request failed', undefined, {
          originalError: error.message,
        });
      }

      // Re-throw ToonErrors
      if (error instanceof ToonError) {
        throw error;
      }

      // Wrap other errors
      throw new ToonNetworkError(
        error instanceof Error ? error.message : 'Unknown network error',
        undefined,
        { originalError: String(error) }
      );
    }
  }

  /**
   * Handle HTTP error responses
   * 
   * @param response - Fetch response
   */
  private async handleHttpErrors(response: Response): Promise<void> {
    if (response.ok) {
      return;
    }

    const statusCode = response.status;
    const statusText = response.statusText;

    // Handle auth errors
    if (statusCode === 401) {
      const errorText = await response.text();
      if (errorText.includes('expired') || errorText.includes('invalid')) {
        throw new ToonTokenExpiredError(`Token expired: ${statusText}`);
      }
      throw new ToonAuthError(`Authentication failed: ${statusText}`, statusCode);
    }

    if (statusCode === 403) {
      throw new ToonAuthError(`Access forbidden: ${statusText}`, statusCode);
    }

    // Handle server errors
    if (statusCode >= 500) {
      throw new ToonServerError(`Server error: ${statusText}`, statusCode);
    }

    // Handle other client errors
    throw new ToonNetworkError(`HTTP ${statusCode}: ${statusText}`, statusCode);
  }

  /**
   * Build URL with query parameters
   * 
   * @param path - API path
   * @param params - Query parameters
   * @returns Full URL with params
   */
  private buildUrlWithParams(path: string, params?: Record<string, any>): string {
    const baseUrl = buildUrl(path);
    
    if (!params || Object.keys(params).length === 0) {
      return baseUrl;
    }

    const queryString = Object.entries(params)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
      .join('&');

    return `${baseUrl}?${queryString}`;
  }

  /**
   * Convert Uint8Array to base64 string
   * 
   * @param array - Uint8Array to convert
   * @returns Base64 string
   */
  private uint8ArrayToBase64(array: Uint8Array): string {
    let binary = '';
    for (let i = 0; i < array.length; i++) {
      binary += String.fromCharCode(array[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 string to Uint8Array
   * 
   * @param base64 - Base64 string
   * @returns Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return array;
  }

  /**
   * Sleep utility for retry delays
   * 
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // ==================== CONFIGURATION METHODS ====================

  /**
   * Set authentication token
   * 
   * @param token - Auth token
   */
  setAuthToken(token: string): void {
    this.config.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.config.authToken = undefined;
  }

  /**
   * Update client configuration
   * 
   * @param config - Partial config to update
   */
  updateConfig(config: Partial<ToonClientConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * 
   * @returns Current config
   */
  getConfig(): Readonly<ToonClientConfig> {
    return { ...this.config };
  }

  /**
   * Get request statistics
   * 
   * @returns Request count
   */
  getRequestCount(): number {
    return this.requestCount;
  }

  /**
   * Reset request statistics
   */
  resetRequestCount(): void {
    this.requestCount = 0;
  }
}

// Export singleton instance
export const toonClient = new ToonClient();
