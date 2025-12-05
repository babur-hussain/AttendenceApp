/**
 * TOON Error Classes
 * Typed error handling for TOON protocol operations
 */

/**
 * Base ToonError class
 * Extended by specific TOON error types
 */
export class ToonError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: Record<string, any>;
  public readonly timestamp: number;

  constructor(
    message: string,
    code: string = 'TOON_ERROR',
    statusCode?: number,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ToonError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = Date.now();

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ToonError);
    }
  }
}

/**
 * ToonEncodingError
 * Thrown when encoding to TOON format fails
 */
export class ToonEncodingError extends ToonError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TOON_ENCODING_ERROR', undefined, details);
    this.name = 'ToonEncodingError';
  }
}

/**
 * ToonDecodingError
 * Thrown when decoding from TOON format fails
 */
export class ToonDecodingError extends ToonError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TOON_DECODING_ERROR', undefined, details);
    this.name = 'ToonDecodingError';
  }
}

/**
 * ToonValidationError
 * Thrown when TOON structure validation fails
 */
export class ToonValidationError extends ToonError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TOON_VALIDATION_ERROR', undefined, details);
    this.name = 'ToonValidationError';
  }
}

/**
 * ToonNetworkError
 * Thrown when network request fails
 */
export class ToonNetworkError extends ToonError {
  constructor(message: string, statusCode?: number, details?: Record<string, any>) {
    super(message, 'TOON_NETWORK_ERROR', statusCode, details);
    this.name = 'ToonNetworkError';
  }
}

/**
 * ToonAuthError
 * Thrown when authentication fails or token is invalid
 */
export class ToonAuthError extends ToonError {
  constructor(message: string, statusCode: number = 401, details?: Record<string, any>) {
    super(message, 'TOON_AUTH_ERROR', statusCode, details);
    this.name = 'ToonAuthError';
  }
}

/**
 * ToonTokenMissingError
 * Thrown when auth token is required but not provided
 */
export class ToonTokenMissingError extends ToonAuthError {
  constructor(message: string = 'Authentication token is missing') {
    super(message, 401, { reason: 'token_missing' });
    this.name = 'ToonTokenMissingError';
  }
}

/**
 * ToonTokenExpiredError
 * Thrown when auth token has expired
 */
export class ToonTokenExpiredError extends ToonAuthError {
  constructor(message: string = 'Authentication token has expired') {
    super(message, 401, { reason: 'token_expired' });
    this.name = 'ToonTokenExpiredError';
  }
}

/**
 * ToonPayloadCorruptedError
 * Thrown when payload data is corrupted or malformed
 */
export class ToonPayloadCorruptedError extends ToonError {
  constructor(message: string = 'Payload data is corrupted or malformed') {
    super(message, 'TOON_PAYLOAD_CORRUPTED', undefined, { reason: 'corrupted_payload' });
    this.name = 'ToonPayloadCorruptedError';
  }
}

/**
 * ToonTimeoutError
 * Thrown when request times out
 */
export class ToonTimeoutError extends ToonError {
  constructor(message: string = 'Request timed out', timeout?: number) {
    super(message, 'TOON_TIMEOUT_ERROR', 408, { timeout });
    this.name = 'ToonTimeoutError';
  }
}

/**
 * ToonServerError
 * Thrown when server returns 5xx error
 */
export class ToonServerError extends ToonError {
  constructor(message: string, statusCode: number = 500, details?: Record<string, any>) {
    super(message, 'TOON_SERVER_ERROR', statusCode, details);
    this.name = 'ToonServerError';
  }
}

/**
 * Check if error is a TOON error
 * 
 * @param error - Error to check
 * @returns True if error is a ToonError
 */
export function isToonError(error: any): error is ToonError {
  return error instanceof ToonError;
}

/**
 * Check if error is a network-related TOON error
 * 
 * @param error - Error to check
 * @returns True if error is network-related
 */
export function isNetworkError(error: any): boolean {
  return (
    error instanceof ToonNetworkError ||
    error instanceof ToonTimeoutError ||
    error instanceof ToonServerError
  );
}

/**
 * Check if error is auth-related TOON error
 * 
 * @param error - Error to check
 * @returns True if error is auth-related
 */
export function isAuthError(error: any): boolean {
  return (
    error instanceof ToonAuthError ||
    error instanceof ToonTokenMissingError ||
    error instanceof ToonTokenExpiredError
  );
}
