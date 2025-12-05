import { ToonService } from './ToonService';
import { toonClient } from './api/ToonClient';
import { API_CONFIG, API_ENDPOINTS } from './api/config';
import {
  type EnrollEmployeeRequest,
  type EnrollEmployeeResponse,
  type GetEmployeeRequest,
  type GetEmployeeResponse,
  type ListEmployeesRequest,
  type ListEmployeesResponse,
  type UpdateEmployeeRequest,
  type UpdateEmployeeResponse,
} from '../types/employee-requests';
import type {
  Employee,
  FaceEmbedding,
  EmployeeStatus,
} from '../types/domain';
import {
  toToonEnrollmentPayload,
  fromToonEmployeeResponse,
  validateToonEnrollmentResponseSchema,
  validateToonEmployeeResponseSchema,
} from '../utils/employeeToon';
import {
  isValidEmployeeId,
  isValidEmployeeName,
  isValidEmployeeEmail,
} from '../utils/employeeValidation';
import { ToonError, ToonValidationError } from '../errors/ToonError';

export interface EnrollEmployeeFormData {
  name: string;
  email: string;
  phone?: string;
  department: string;
  role: string;
  position: string;
  designation?: string;
  status: EmployeeStatus;
}

/**
 * EmployeeService
 *
 * Handles employee enrollment, profile updates, and retrieval
 * using TOON protocol.
 */
export class EmployeeService extends ToonService {
  constructor() {
    super({
      baseUrl: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      useMockData: API_CONFIG.USE_MOCK,
    });
  }

  /**
   * Enroll a new employee with face embeddings
   *
   * @param formData - Employee profile information
   * @param faceEmbeddings - Array of face embeddings for recognition
   * @param enrolledBy - Optional user ID of the enroller
   * @returns Enrolled employee with enrollment details
   */
  async enrollEmployee(
    formData: EnrollEmployeeFormData,
    faceEmbeddings: FaceEmbedding[],
    enrolledBy?: string
  ): Promise<EnrollEmployeeResponse> {
    // Validate form data
    if (!isValidEmployeeName(formData.name)) {
      throw new ToonValidationError('Invalid employee name');
    }

    if (!isValidEmployeeEmail(formData.email)) {
      throw new ToonValidationError('Invalid employee email');
    }

    if (faceEmbeddings.length === 0) {
      throw new ToonValidationError('At least one face embedding is required');
    }

    // Transform to TOON payload
    const payload = toToonEnrollmentPayload(
      formData,
      faceEmbeddings,
      enrolledBy
    );

    // Send TOON request
    const response = await toonClient.toonPost<EnrollEmployeeResponse>(
      API_ENDPOINTS.EMPLOYEE_ENROLL,
      payload
    );

    // Validate TOON response structure
    if (!validateToonEnrollmentResponseSchema(response)) {
      throw new ToonValidationError('Invalid enrollment response from server');
    }

    return response;
  }

  /**
   * Get employee by ID
   *
   * @param employeeId - Unique employee ID
   * @returns Employee profile data
   */
  async getEmployeeById(employeeId: string): Promise<Employee> {
    // Validate employee ID
    if (!isValidEmployeeId(employeeId)) {
      throw new ToonValidationError('Invalid employee ID format');
    }

    // Create TOON request
    const request: GetEmployeeRequest = {
      operation: 'getemployee',
      E1: employeeId,
    };

    // Send TOON request
    const response = await toonClient.toonGet<GetEmployeeResponse>(
      API_ENDPOINTS.EMPLOYEE_GET,
      request
    );

    // Validate TOON response structure
    if (!validateToonEmployeeResponseSchema(response)) {
      throw new ToonValidationError('Invalid employee response from server');
    }

    // Transform TOON response to Employee
    const employee = fromToonEmployeeResponse(response);

    return employee;
  }

  /**
   * List employees with optional filters
   *
   * @param department - Optional department filter
   * @param status - Optional status filter
   * @param limit - Maximum number of employees to return
   * @param offset - Pagination offset
   * @returns List of employees
   */
  async listEmployees(
    department?: string,
    status?: EmployeeStatus,
    limit: number = 50,
    offset: number = 0
  ): Promise<ListEmployeesResponse> {
    // Create TOON request
    const request: ListEmployeesRequest = {
      operation: 'listemployees',
      limit,
      offset,
    };

    // Add optional filters
    if (department !== undefined) {
      request.department = department;
    }

    if (status !== undefined) {
      request.isActive = status === 'active';
    }

    // Send TOON request
    const response = await toonClient.toonGet<ListEmployeesResponse>(
      API_ENDPOINTS.EMPLOYEE_LIST,
      request
    );

    // Validate response has required fields
    if (
      !Array.isArray(response.employees) ||
      typeof response.total !== 'number'
    ) {
      throw new ToonValidationError('Invalid list employees response');
    }

    // Validate each employee in the list
    for (const empData of response.employees) {
      if (!validateToonEmployeeResponseSchema(empData)) {
        throw new ToonValidationError('Invalid employee data in list');
      }
    }

    return response;
  }

  /**
   * Update employee profile
   *
   * @param employeeId - Unique employee ID
   * @param updates - Partial employee data to update
   * @returns Updated employee profile
   */
  async updateEmployeeProfile(
    employeeId: string,
    updates: Partial<Omit<EnrollEmployeeFormData, 'status'>> & {
      status?: EmployeeStatus;
    }
  ): Promise<UpdateEmployeeResponse> {
    // Validate employee ID
    if (!isValidEmployeeId(employeeId)) {
      throw new ToonValidationError('Invalid employee ID format');
    }

    // Validate update fields
    if (updates.name !== undefined && !isValidEmployeeName(updates.name)) {
      throw new ToonValidationError('Invalid employee name');
    }

    if (updates.email !== undefined && !isValidEmployeeEmail(updates.email)) {
      throw new ToonValidationError('Invalid employee email');
    }

    // Create TOON request with only changed fields
    const request: UpdateEmployeeRequest = {
      operation: 'updateprofile',
      E1: employeeId,
      updates: {},
      M1: {
        updatedAt: new Date().toISOString(),
      },
    };

    if (updates.name !== undefined) {
      request.updates.E2 = updates.name;
    }

    if (updates.email !== undefined) {
      request.updates.E3 = updates.email;
    }

    if (updates.phone !== undefined) {
      request.updates.E4 = updates.phone;
    }

    if (updates.department !== undefined) {
      request.updates.E6 = updates.department;
    }

    if (updates.role !== undefined) {
      request.updates.E5 = updates.role;
    }

    if (updates.position !== undefined) {
      request.updates.E7 = updates.position;
    }

    // Send TOON request
    const response = await toonClient.toonPut<UpdateEmployeeResponse>(
      API_ENDPOINTS.EMPLOYEE_UPDATE,
      request
    );

    // Validate TOON response structure
    if (!validateToonEmployeeResponseSchema(response)) {
      throw new ToonValidationError('Invalid update response from server');
    }

    return response;
  }
}
