/**
 * TOON (Token-Oriented Object Notation) Type Definitions
 * Protocol for encoding/decoding structured data as token arrays
 */

/**
 * ToonToken
 * Base unit of TOON encoding - represents a single value with type metadata
 */
export interface ToonToken {
  type: 'string' | 'number' | 'boolean' | 'null' | 'object' | 'array';
  key?: string;
  value: string | number | boolean | null;
}

/**
 * ToonRequest
 * Structure for outgoing TOON-encoded requests
 */
export interface ToonRequest {
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  tokens: ToonToken[];
  headers?: Record<string, string>;
}

/**
 * ToonResponse<T>
 * Structure for incoming TOON-encoded responses
 */
export interface ToonResponse<T = any> {
  success: boolean;
  tokens: ToonToken[];
  data?: T;
  error?: ToonError;
  timestamp: number;
}

/**
 * ToonError
 * Error structure for TOON responses
 */
export interface ToonError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * ToonServiceConfig
 * Configuration for TOON service layer
 */
export interface ToonServiceConfig {
  baseUrl: string;
  timeout?: number;
  useMockData?: boolean;
  authToken?: string;
}
