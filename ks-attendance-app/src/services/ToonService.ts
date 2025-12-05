/**
 * ToonService
 * Main service class for communicating with backend using TOON protocol
 * Handles all employee and attendance operations with TOON encoding/decoding
 */

import {
  Employee,
  CreateEmployeeData,
  UpdateEmployeeData,
  AttendanceRecord,
  RecordAttendanceData,
  AttendanceQuery,
  AttendanceStatus,
} from '../types/domain';
import {
  ToonServiceConfig,
} from '../types/toon';
import { API_CONFIG, API_ENDPOINTS } from './api/config';
import { toonClient } from './api/ToonClient';
import { loadCompanySession } from '../utils/companySessionStorage';

/**
 * ToonService Class
 * Singleton service for TOON-based API communication
 */
export class ToonService {
  private config: ToonServiceConfig;

  constructor(config?: Partial<ToonServiceConfig>) {
    this.config = {
      baseUrl: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      useMockData: API_CONFIG.USE_MOCK,
      ...config,
    };

    // Configure toonClient with service config
    toonClient.updateConfig({
      baseUrl: this.config.baseUrl,
      timeout: this.config.timeout,
      authToken: this.config.authToken,
    });
  }

  // ==================== EMPLOYEE METHODS ====================

  /**
   * Create a new employee
   * 
   * @param data - Employee creation data
   * @returns Created employee
   */
  async createEmployee(data: CreateEmployeeData): Promise<Employee> {
    if (this.config.useMockData) {
      return this.generateMockEmployee(data);
    }
    
    return await toonClient.toonPost<Employee>(API_ENDPOINTS.EMPLOYEES.CREATE, data);
  }

  /**
   * Get all employees
   * 
   * @returns Array of employees
   */
  async getEmployees(): Promise<Employee[]> {
    if (this.config.useMockData) {
      return this.generateMockEmployees();
    }
    
    try {
      // Get company ID from session
      const session = await loadCompanySession();
      console.log('🔍 ToonService.getEmployees - Session loaded:', {
        hasSession: !!session,
        companyId: session?.companyId,
        hasSessionToken: !!session?.sessionToken,
      });

      if (!session) {
        console.error('❌ ToonService.getEmployees - No session found, returning empty');
        return [];
      }

      console.log('📤 ToonService - Sending employee list request with:', {
        COMP1: session.companyId,
        T1: 'EMPLOYEE_LIST',
        SESSION1Length: session.sessionToken?.length,
      });

      // Use POST with TOON payload (required by server)
      const response = await toonClient.toonPost<any>(
        API_ENDPOINTS.EMPLOYEE_LIST,
        {
          T1: 'EMPLOYEE_LIST',
          COMP1: session.companyId,
          SESSION1: session.sessionToken,
        },
        { requireAuth: false }
      );

      console.log('📥 ToonService - Employee list response:', {
        hasEmployees: Array.isArray(response?.employees),
        count: response?.employees?.length || 0,
        total: response?.total,
      });

      if (!Array.isArray(response?.employees)) {
        console.warn('⚠️ ToonService - No employees array in response');
        return [];
      }

      return response.employees.map((emp: any) => ({
        id: emp.E1 || emp.id || '',
        name: emp.E2 || emp.name || '',
        email: emp.E3 || emp.email || '',
        role: emp.E6 || emp.role || 'General',
        enrolled: emp.ENR || emp.hasFaceEnrolled || false,
      }));
    } catch (error) {
      console.error('❌ ToonService.getEmployees - Error:', error);
      return [];
    }
  }

  /**
   * Get employee by ID
   * 
   * @param id - Employee ID
   * @returns Employee data
   */
  async getEmployeeById(id: string): Promise<Employee> {
    if (this.config.useMockData) {
      return this.generateMockEmployee({ name: 'Mock Employee' });
    }
    
    return await toonClient.toonGet<Employee>(API_ENDPOINTS.EMPLOYEES.GET(id));
  }

  /**
   * Update employee
   * 
   * @param id - Employee ID
   * @param data - Updated employee data
   * @returns Updated employee
   */
  async updateEmployee(id: string, data: UpdateEmployeeData): Promise<Employee> {
    if (this.config.useMockData) {
      return this.generateMockEmployee(data);
    }
    
    return await toonClient.toonPut<Employee>(API_ENDPOINTS.EMPLOYEES.UPDATE(id), data);
  }

  /**
   * Delete employee
   * 
   * @param id - Employee ID
   * @returns Success status
   */
  async deleteEmployee(id: string): Promise<{ success: boolean }> {
    if (this.config.useMockData) {
      return { success: true };
    }
    
    return await toonClient.toonDelete<{ success: boolean }>(API_ENDPOINTS.EMPLOYEES.DELETE(id));
  }

  // ==================== ATTENDANCE METHODS ====================

  /**
   * Record attendance
   * 
   * @param data - Attendance record data
   * @returns Created attendance record
   */
  async recordAttendance(data: RecordAttendanceData): Promise<AttendanceRecord> {
    if (this.config.useMockData) {
      return this.generateMockAttendanceRecord(data);
    }
    
    return await toonClient.toonPost<AttendanceRecord>(API_ENDPOINTS.ATTENDANCE.RECORD, data);
  }

  /**
   * Get attendance records by employee ID
   * 
   * @param employeeId - Employee ID
   * @returns Array of attendance records
   */
  async getAttendanceByEmployee(employeeId: string): Promise<AttendanceRecord[]> {
    if (this.config.useMockData) {
      return this.generateMockAttendanceRecords();
    }
    
    return await toonClient.toonGet<AttendanceRecord[]>(
      API_ENDPOINTS.ATTENDANCE.BY_EMPLOYEE(employeeId)
    );
  }

  /**
   * Query attendance records with filters
   * 
   * @param query - Query parameters
   * @returns Array of attendance records
   */
  async queryAttendance(query: AttendanceQuery): Promise<AttendanceRecord[]> {
    if (this.config.useMockData) {
      return this.generateMockAttendanceRecords();
    }
    
    return await toonClient.toonGet<AttendanceRecord[]>(
      API_ENDPOINTS.ATTENDANCE.LIST,
      query
    );
  }

  /**
   * Get attendance record by ID
   * 
   * @param id - Attendance record ID
   * @returns Attendance record
   */
  async getAttendanceById(id: string): Promise<AttendanceRecord> {
    if (this.config.useMockData) {
      return this.generateMockAttendanceRecord({});
    }
    
    return await toonClient.toonGet<AttendanceRecord>(API_ENDPOINTS.ATTENDANCE.GET(id));
  }

  /**
   * Send raw TOON event to server
   * 
   * @param path - API endpoint path
   * @param toonPayload - Raw TOON payload string
   * @returns Server response
   */
  async sendToonEvent(path: string, toonPayload: string): Promise<any> {
    if (this.config.useMockData) {
      return { success: true, status: 'accepted' };
    }
    
    return await toonClient.toonPost<any>(path, toonPayload);
  }

  // ==================== MOCK DATA GENERATORS ====================

  private generateMockEmployee(data: any): Employee {
    const now = new Date().toISOString();
    return {
      id: `emp_${Date.now()}`,
      name: data.name || 'John Doe',
      email: data.email || 'john@example.com',
      department: data.department || 'Engineering',
      position: data.position || 'Developer',
      phoneNumber: data.phoneNumber,
      joinDate: data.joinDate || now,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  private generateMockEmployees(): Employee[] {
    const now = new Date().toISOString();
    return [
      {
        id: 'emp_1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        department: 'Engineering',
        position: 'Senior Developer',
        phoneNumber: '+1234567890',
        joinDate: '2023-01-15',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'emp_2',
        name: 'Bob Smith',
        email: 'bob@example.com',
        department: 'Marketing',
        position: 'Marketing Manager',
        phoneNumber: '+1234567891',
        joinDate: '2023-03-20',
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  private generateMockAttendanceRecord(data: any): AttendanceRecord {
    const now = new Date().toISOString();
    return {
      id: `att_${Date.now()}`,
      employeeId: data.employeeId || 'emp_1',
      employeeName: 'Mock Employee',
      date: data.date || now.split('T')[0],
      checkInTime: data.checkInTime || '09:00:00',
      checkOutTime: data.checkOutTime,
      status: data.status || AttendanceStatus.PRESENT,
      location: data.location,
      notes: data.notes,
      createdAt: now,
      updatedAt: now,
    };
  }

  private generateMockAttendanceRecords(): AttendanceRecord[] {
    const now = new Date().toISOString();
    const today = now.split('T')[0];
    
    return [
      {
        id: 'att_1',
        employeeId: 'emp_1',
        employeeName: 'Alice Johnson',
        date: today,
        checkInTime: '09:00:00',
        checkOutTime: '17:00:00',
        status: AttendanceStatus.PRESENT,
        location: 'Office',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'att_2',
        employeeId: 'emp_2',
        employeeName: 'Bob Smith',
        date: today,
        checkInTime: '09:15:00',
        status: AttendanceStatus.PRESENT,
        location: 'Office',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Update service configuration
   * 
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<ToonServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Set authentication token
   * 
   * @param token - Auth token
   */
  setAuthToken(token: string): void {
    this.config.authToken = token;
    toonClient.setAuthToken(token);
  }

  /**
   * Clear authentication token
   */
  clearAuthToken(): void {
    this.config.authToken = undefined;
    toonClient.clearAuthToken();
  }
}

// Export singleton instance
export const toonService = new ToonService();
