/**
 * Employee Validation Utilities
 * Validates employee data before TOON encoding
 */

import {
  EnrollEmployeeFormData,
  FaceEmbedding,
  ValidationError,
  EmployeeValidationResult,
} from '../types/employee-requests';

/**
 * Validate employee ID format
 * 
 * @param employeeId - Employee ID to validate
 * @returns True if valid
 */
export function isValidEmployeeId(employeeId: string): boolean {
  return !!(
    employeeId &&
    typeof employeeId === 'string' &&
    employeeId.length > 0 &&
    employeeId.length <= 50
  );
}

/**
 * Validate employee name
 * 
 * @param name - Employee name to validate
 * @returns True if valid
 */
export function isValidEmployeeName(name: string): boolean {
  return !!(
    name &&
    typeof name === 'string' &&
    name.trim().length > 0 &&
    name.trim().length <= 100
  );
}

/**
 * Validate employee email
 * 
 * @param email - Email to validate
 * @returns True if valid
 */
export function isValidEmployeeEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate email format (legacy)
 * 
 * @param email - Email to validate
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 * 
 * @param phone - Phone number to validate
 * @returns True if valid
 */
export function isValidPhone(phone: string): boolean {
  // Basic phone validation - adjust regex as needed
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate employee form data
 * Checks all required fields and formats
 * 
 * @param formData - Employee form data
 * @returns Validation result with errors
 */
export function validateEmployeeFormData(
  formData: EnrollEmployeeFormData
): EmployeeValidationResult {
  const errors: ValidationError[] = [];

  // Validate name
  if (!formData.name || formData.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Name is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (formData.name.length < 2) {
    errors.push({
      field: 'name',
      message: 'Name must be at least 2 characters',
      code: 'MIN_LENGTH',
    });
  } else if (formData.name.length > 100) {
    errors.push({
      field: 'name',
      message: 'Name must be less than 100 characters',
      code: 'MAX_LENGTH',
    });
  }

  // Validate email
  if (!formData.email || formData.email.trim().length === 0) {
    errors.push({
      field: 'email',
      message: 'Email is required',
      code: 'REQUIRED_FIELD',
    });
  } else if (!isValidEmail(formData.email)) {
    errors.push({
      field: 'email',
      message: 'Invalid email format',
      code: 'INVALID_FORMAT',
    });
  }

  // Validate phone (if provided)
  if (formData.phone && !isValidPhone(formData.phone)) {
    errors.push({
      field: 'phone',
      message: 'Invalid phone number format',
      code: 'INVALID_FORMAT',
    });
  }

  // Validate role
  if (!formData.role || formData.role.trim().length === 0) {
    errors.push({
      field: 'role',
      message: 'Role is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate department
  if (!formData.department || formData.department.trim().length === 0) {
    errors.push({
      field: 'department',
      message: 'Department is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate position
  if (!formData.position || formData.position.trim().length === 0) {
    errors.push({
      field: 'position',
      message: 'Position is required',
      code: 'REQUIRED_FIELD',
    });
  }

  // Validate joinDate (if provided)
  if (formData.joinDate) {
    const date = new Date(formData.joinDate);
    if (isNaN(date.getTime())) {
      errors.push({
        field: 'joinDate',
        message: 'Invalid date format',
        code: 'INVALID_FORMAT',
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate face embedding
 * Checks embedding vector structure and dimensions
 * 
 * @param embedding - Face embedding to validate
 * @returns Validation result
 */
export function validateFaceEmbedding(
  embedding: FaceEmbedding
): EmployeeValidationResult {
  const errors: ValidationError[] = [];

  // Validate vector exists
  if (!embedding.vector || !Array.isArray(embedding.vector)) {
    errors.push({
      field: 'vector',
      message: 'Embedding vector is required and must be an array',
      code: 'REQUIRED_FIELD',
    });
    return { isValid: false, errors };
  }

  // Validate vector dimensions (common sizes: 128, 256, 512, 1024)
  const validDimensions = [128, 256, 512, 1024, 2048];
  if (!validDimensions.includes(embedding.vector.length)) {
    errors.push({
      field: 'vector',
      message: `Invalid embedding dimension: ${embedding.vector.length}. Expected one of: ${validDimensions.join(', ')}`,
      code: 'INVALID_DIMENSION',
    });
  }

  // Validate vector contains only numbers
  const hasInvalidValues = embedding.vector.some(
    (val) => typeof val !== 'number' || isNaN(val)
  );
  if (hasInvalidValues) {
    errors.push({
      field: 'vector',
      message: 'Embedding vector must contain only valid numbers',
      code: 'INVALID_VALUES',
    });
  }

  // Validate quality score (if provided)
  if (
    embedding.quality !== undefined &&
    (embedding.quality < 0 || embedding.quality > 1)
  ) {
    errors.push({
      field: 'quality',
      message: 'Quality score must be between 0 and 1',
      code: 'OUT_OF_RANGE',
    });
  }

  // Validate liveness score (if provided)
  if (
    embedding.livenessScore !== undefined &&
    (embedding.livenessScore < 0 || embedding.livenessScore > 1)
  ) {
    errors.push({
      field: 'livenessScore',
      message: 'Liveness score must be between 0 and 1',
      code: 'OUT_OF_RANGE',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate face embeddings array
 * Ensures at least one valid embedding exists
 * 
 * @param embeddings - Array of face embeddings
 * @returns Validation result
 */
export function validateFaceEmbeddings(
  embeddings: FaceEmbedding[]
): EmployeeValidationResult {
  const errors: ValidationError[] = [];

  // Check array exists and has items
  if (!embeddings || !Array.isArray(embeddings)) {
    errors.push({
      field: 'faceEmbeddings',
      message: 'Face embeddings array is required',
      code: 'REQUIRED_FIELD',
    });
    return { isValid: false, errors };
  }

  if (embeddings.length === 0) {
    errors.push({
      field: 'faceEmbeddings',
      message: 'At least one face embedding is required',
      code: 'MIN_ITEMS',
    });
    return { isValid: false, errors };
  }

  // Validate maximum embeddings (for future multi-face support)
  const MAX_EMBEDDINGS = 10;
  if (embeddings.length > MAX_EMBEDDINGS) {
    errors.push({
      field: 'faceEmbeddings',
      message: `Maximum ${MAX_EMBEDDINGS} face embeddings allowed`,
      code: 'MAX_ITEMS',
    });
  }

  // Validate each embedding
  embeddings.forEach((embedding, index) => {
    const result = validateFaceEmbedding(embedding);
    if (!result.isValid) {
      result.errors.forEach((error) => {
        errors.push({
          ...error,
          field: `faceEmbeddings[${index}].${error.field}`,
        });
      });
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete enrollment data
 * Validates both form data and face embeddings
 * 
 * @param formData - Employee form data
 * @param embeddings - Face embeddings
 * @returns Combined validation result
 */
export function validateEnrollmentData(
  formData: EnrollEmployeeFormData,
  embeddings: FaceEmbedding[]
): EmployeeValidationResult {
  const formValidation = validateEmployeeFormData(formData);
  const embeddingsValidation = validateFaceEmbeddings(embeddings);

  return {
    isValid: formValidation.isValid && embeddingsValidation.isValid,
    errors: [...formValidation.errors, ...embeddingsValidation.errors],
  };
}

