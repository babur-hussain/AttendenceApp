/**
 * TOON Employee Transformation Helpers
 * Converts between Employee data and TOON token structures
 */

import { Employee } from '../types/domain';
import {
  EnrollEmployeeFormData,
  EnrollEmployeeRequest,
  FaceEmbedding,
  GetEmployeeResponse,
  EnrollEmployeeResponse,
} from '../types/employee-requests';
import { ToonValidationError } from '../errors/ToonError';

/**
 * Convert employee form data and face embeddings to TOON enrollment payload
 * Creates TOON structure with E, F, P, and M tokens
 * 
 * @param formData - Employee form data
 * @param faceEmbeddings - Array of face embeddings
 * @param enrolledBy - Optional user ID who is enrolling
 * @returns TOON enrollment request structure
 */
export function toToonEnrollmentPayload(
  formData: EnrollEmployeeFormData,
  faceEmbeddings: FaceEmbedding[],
  enrolledBy?: string
): EnrollEmployeeRequest {
  // Build TOON enrollment request
  const payload: EnrollEmployeeRequest = {
    operation: 'enroll',
    // Employee tokens (E series)
    E2: formData.name,
    E3: formData.email,
    E4: formData.phone,
    E5: formData.role,
    E6: formData.department,
    E7: formData.position,
    E8: formData.joinDate,
    // Face embeddings (F series)
    faceEmbeddings: faceEmbeddings.map((embedding) => ({
      vector: embedding.vector,
      quality: embedding.quality,
      livenessScore: embedding.livenessScore,
      capturedAt: embedding.capturedAt || new Date().toISOString(),
      metadata: embedding.metadata,
    })),
    // Profile metadata (P1)
    P1: formData.metadata,
    // Enrollment metadata (M1)
    M1: {
      enrolledAt: new Date().toISOString(),
      enrolledBy,
      source: 'mobile_app',
    },
  };

  return payload;
}

/**
 * Convert TOON employee response to Employee type
 * Decodes TOON tokens back to structured Employee object
 * 
 * @param response - TOON employee response
 * @returns Employee object
 */
export function fromToonEmployeeResponse(
  response: GetEmployeeResponse | EnrollEmployeeResponse
): Employee {
  if (!response.success || !response.employee) {
    throw new ToonValidationError('Invalid TOON employee response structure', {
      response,
    });
  }

  const employee = response.employee;

  // Validate required fields from TOON response
  if (!employee.id || !employee.name || !employee.email) {
    throw new ToonValidationError('Missing required employee fields in TOON response', {
      employee,
    });
  }

  return {
    id: employee.id,
    name: employee.name,
    email: employee.email,
    department: employee.department,
    position: employee.position,
    phoneNumber: employee.phoneNumber,
    joinDate: employee.joinDate,
    isActive: employee.isActive,
    createdAt: employee.createdAt,
    updatedAt: employee.updatedAt,
  };
}

/**
 * Convert face embedding to TOON token structure
 * Prepares face data for TOON encoding
 * 
 * @param embedding - Face embedding
 * @param index - Index in array (for F token numbering)
 * @returns TOON-ready face embedding object
 */
export function faceEmbeddingToToonTokens(
  embedding: FaceEmbedding,
  index: number
): Record<string, any> {
  const tokens: Record<string, any> = {
    [`F${index}_vector`]: embedding.vector,
    [`F${index}_dimension`]: embedding.vector.length,
  };

  if (embedding.quality !== undefined) {
    tokens[`F${index}_quality`] = embedding.quality;
  }

  if (embedding.livenessScore !== undefined) {
    tokens[`F${index}_liveness`] = embedding.livenessScore;
  }

  if (embedding.capturedAt) {
    tokens[`F${index}_captured`] = embedding.capturedAt;
  }

  if (embedding.metadata) {
    tokens[`F${index}_metadata`] = embedding.metadata;
  }

  return tokens;
}

/**
 * Convert multiple face embeddings to TOON token structure
 * Supports multi-face enrollment with indexed F tokens
 * 
 * @param embeddings - Array of face embeddings
 * @returns TOON-ready embeddings object with indexed tokens
 */
export function faceEmbeddingsToToonTokens(
  embeddings: FaceEmbedding[]
): Record<string, any> {
  const allTokens: Record<string, any> = {
    F_count: embeddings.length,
  };

  embeddings.forEach((embedding, index) => {
    const embeddingTokens = faceEmbeddingToToonTokens(embedding, index + 1);
    Object.assign(allTokens, embeddingTokens);
  });

  return allTokens;
}

/**
 * Validate TOON employee response schema
 * Ensures response has correct TOON structure
 * 
 * @param response - Response to validate
 * @returns True if valid
 */
export function validateToonEmployeeResponseSchema(
  response: any
): response is GetEmployeeResponse {
  if (!response || typeof response !== 'object') {
    return false;
  }

  if (typeof response.success !== 'boolean') {
    return false;
  }

  if (!response.employee || typeof response.employee !== 'object') {
    return false;
  }

  const employee = response.employee;

  // Validate required employee fields (E tokens)
  const requiredFields = ['id', 'name', 'email', 'department', 'position'];
  const hasAllFields = requiredFields.every(
    (field) => field in employee && typeof employee[field] === 'string'
  );

  return hasAllFields;
}

/**
 * Validate TOON enrollment response schema
 * Ensures enrollment response has correct structure
 * 
 * @param response - Response to validate
 * @returns True if valid
 */
export function validateToonEnrollmentResponseSchema(
  response: any
): response is EnrollEmployeeResponse {
  if (!validateToonEmployeeResponseSchema(response)) {
    return false;
  }

  if (typeof (response as any).enrollmentId !== 'string') {
    return false;
  }

  if (typeof (response as any).faceCount !== 'number') {
    return false;
  }

  return true;
}

/**
 * Extract employee list from TOON response
 * Handles array of employees from list endpoint
 * 
 * @param response - TOON list response
 * @returns Array of Employee objects
 */
export function fromToonEmployeeListResponse(response: any): Employee[] {
  if (!response || !response.success || !Array.isArray(response.employees)) {
    throw new ToonValidationError('Invalid TOON employee list response structure', {
      response,
    });
  }

  return response.employees.map((empData: any) => {
    // Validate each employee in the list
    if (!empData.id || !empData.name || !empData.email) {
      throw new ToonValidationError('Invalid employee data in list response', {
        employee: empData,
      });
    }

    return {
      id: empData.id,
      name: empData.name,
      email: empData.email,
      department: empData.department,
      position: empData.position,
      phoneNumber: empData.phoneNumber,
      joinDate: empData.joinDate,
      isActive: empData.isActive,
      createdAt: empData.createdAt,
      updatedAt: empData.updatedAt,
    };
  });
}

/**
 * Create update payload with only changed fields
 * Optimizes TOON payload by only including updated E tokens
 * 
 * @param updates - Partial employee updates
 * @returns TOON update payload
 */
export function createToonUpdatePayload(updates: Partial<Employee>): Record<string, any> {
  const payload: Record<string, any> = {
    operation: 'updateprofile',
    updates: {},
    M1: {
      updatedAt: new Date().toISOString(),
    },
  };

  // Map Employee fields to E tokens
  if (updates.name !== undefined) payload.updates.E2 = updates.name;
  if (updates.email !== undefined) payload.updates.E3 = updates.email;
  if (updates.phoneNumber !== undefined) payload.updates.E4 = updates.phoneNumber;
  if (updates.department !== undefined) payload.updates.E6 = updates.department;
  if (updates.position !== undefined) payload.updates.E7 = updates.position;

  return payload;
}
