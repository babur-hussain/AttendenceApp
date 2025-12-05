/**
 * Authentication Request/Response Types
 * TOON-based auth data structures
 */

import { User } from './auth';

/**
 * SignInRequest
 * TOON structure: T1=signin, U1=email, U2=password
 */
export interface SignInRequest {
  operation: 'signin';
  email: string;
  password: string;
}

/**
 * SignInResponse
 * TOON structure with tokens and user data
 */
export interface SignInResponse {
  success: boolean;
  accessToken: string;
  refreshToken: string;
  user: User;
  expiresIn: number; // seconds until token expires
}

/**
 * SignOutRequest
 * TOON structure: T1=signout, A1=accessToken
 */
export interface SignOutRequest {
  operation: 'signout';
  accessToken: string;
}

/**
 * SignOutResponse
 * Simple success response
 */
export interface SignOutResponse {
  success: boolean;
  message: string;
}

/**
 * RefreshTokenRequest
 * TOON structure: T1=refresh, A2=refreshToken
 */
export interface RefreshTokenRequest {
  operation: 'refresh';
  refreshToken: string;
}

/**
 * RefreshTokenResponse
 * New access token with expiration
 */
export interface RefreshTokenResponse {
  success: boolean;
  accessToken: string;
  refreshToken?: string; // Optional new refresh token
  expiresIn: number;
}

/**
 * GetCurrentUserRequest
 * TOON structure: T1=getuser, A1=accessToken
 */
export interface GetCurrentUserRequest {
  operation: 'getuser';
  accessToken: string;
}

/**
 * GetCurrentUserResponse
 * User data response
 */
export interface GetCurrentUserResponse {
  success: boolean;
  user: User;
}

/**
 * AuthErrorResponse
 * TOON error structure
 */
export interface AuthErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * TokenPair
 * Access and refresh token storage
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // timestamp when token expires
}

/**
 * ForgotPinRequest
 * TOON structure: T1=forgot, U1=email
 */
export interface ForgotPinRequest {
  operation: 'forgot';
  email: string;
}

/**
 * ForgotPinResponse
 * Success response with message
 */
export interface ForgotPinResponse {
  success: boolean;
  message: string;
}

/**
 * ResetPinRequest
 * TOON structure: T1=reset, RT1=resetToken, U2=newPin
 */
export interface ResetPinRequest {
  operation: 'reset';
  resetToken: string;
  newPin: string;
}

/**
 * ResetPinResponse
 * Success response with message
 */
export interface ResetPinResponse {
  success: boolean;
  message: string;
}
