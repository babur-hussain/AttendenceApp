/**
 * Employee Request/Response Types
 * TOON-based employee enrollment and management structures
 */

import { Employee } from './domain';

/**
 * FaceEmbedding
 * Represents a facial recognition embedding vector
 */
export interface FaceEmbedding {
  vector: number[]; // Embedding vector (typically 128, 256, or 512 dimensions)
  quality?: number; // Quality score (0-1)
  livenessScore?: number; // Liveness detection score (0-1)
  capturedAt?: string; // ISO timestamp when captured
  metadata?: {
    source?: string; // 'camera' | 'upload'
    deviceId?: string;
    [key: string]: any;
  };
}

/**
 * EnrollEmployeeFormData
 * Basic employee details for enrollment
 */
export interface EnrollEmployeeFormData {
  name: string;
  email: string;
  phone?: string;
  role: string;
  department: string;
  position: string;
  joinDate?: string;
  metadata?: Record<string, any>;
}

/**
 * EnrollEmployeeRequest
 * TOON structure for employee enrollment
 * E1=employeeId, E2=name, E3=email, E4=phone, E5=role
 * F1-FN=face embeddings, P1=profile metadata, M1=enrollment metadata
 */
export interface EnrollEmployeeRequest {
  operation: 'enroll';
  // Employee basic fields (E tokens)
  E2: string; // name
  E3: string; // email
  E4?: string; // phone
  E5: string; // role
  E6: string; // department
  E7: string; // position
  E8?: string; // joinDate
  // Face embedding fields (F tokens)
  faceEmbeddings: FaceEmbedding[];
  // Profile metadata (P tokens)
  P1?: Record<string, any>;
  // Enrollment metadata (M tokens)
  M1: {
    enrolledAt: string;
    enrolledBy?: string;
    source: string;
  };
}

/**
 * EnrollEmployeeResponse
 * TOON response after successful enrollment
 */
export interface EnrollEmployeeResponse {
  success: boolean;
  employee: Employee;
  enrollmentId: string;
  faceCount: number;
  message: string;
}

/**
 * GetEmployeeRequest
 * TOON structure: operation=getemployee, E1=employeeId
 */
export interface GetEmployeeRequest {
  operation: 'getemployee';
  E1: string; // employeeId
}

/**
 * GetEmployeeResponse
 * Employee data with TOON structure
 */
export interface GetEmployeeResponse {
  success: boolean;
  employee: Employee;
}

/**
 * ListEmployeesRequest
 * TOON structure with optional filters
 */
export interface ListEmployeesRequest {
  operation: 'listemployees';
  department?: string;
  role?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * ListEmployeesResponse
 * Array of employees with pagination
 */
export interface ListEmployeesResponse {
  success: boolean;
  employees: Employee[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * UpdateEmployeeProfileRequest
 * TOON structure for profile updates
 */
export interface UpdateEmployeeProfileRequest {
  operation: 'updateprofile';
  E1: string; // employeeId
  updates: {
    E2?: string; // name
    E3?: string; // email
    E4?: string; // phone
    E5?: string; // role
    E6?: string; // department
    E7?: string; // position
    P1?: Record<string, any>; // metadata
  };
  M1: {
    updatedAt: string;
    updatedBy?: string;
  };
}

/**
 * UpdateEmployeeProfileResponse
 * Updated employee data
 */
export interface UpdateEmployeeProfileResponse {
  success: boolean;
  employee: Employee;
  message: string;
}

/**
 * UpdateEmployeeRequest (alias for UpdateEmployeeProfileRequest)
 */
export type UpdateEmployeeRequest = UpdateEmployeeProfileRequest;

/**
 * UpdateEmployeeResponse (alias for UpdateEmployeeProfileResponse)
 */
export type UpdateEmployeeResponse = UpdateEmployeeProfileResponse;

/**
 * AddFaceEmbeddingRequest
 * TOON structure for adding additional face embeddings
 * Future feature: multi-face enrollment
 */
export interface AddFaceEmbeddingRequest {
  operation: 'addface';
  E1: string; // employeeId
  faceEmbedding: FaceEmbedding;
  M1: {
    addedAt: string;
    addedBy?: string;
  };
}

/**
 * AddFaceEmbeddingResponse
 * Confirmation of face addition
 */
export interface AddFaceEmbeddingResponse {
  success: boolean;
  faceId: string;
  totalFaces: number;
  message: string;
}

/**
 * ValidationError
 * TOON validation error structure
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * EmployeeValidationResult
 * Result of employee data validation
 */
export interface EmployeeValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
