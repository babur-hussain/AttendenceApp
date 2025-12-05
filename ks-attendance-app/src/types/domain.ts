/**
 * Domain Type Definitions
 * Core business entities for the attendance system
 */

/**
 * EmployeeStatus
 * Status of an employee in the system
 */
export type EmployeeStatus = 'active' | 'inactive' | 'suspended';

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
 * Employee
 * Represents an employee in the system
 */
export interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  phoneNumber?: string;
  joinDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * CreateEmployeeData
 * Data required to create a new employee
 */
export interface CreateEmployeeData {
  name: string;
  email: string;
  department: string;
  position: string;
  phoneNumber?: string;
  joinDate: string;
}

/**
 * UpdateEmployeeData
 * Data that can be updated for an employee
 */
export interface UpdateEmployeeData {
  name?: string;
  email?: string;
  department?: string;
  position?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

/**
 * AttendanceRecord
 * Represents a single attendance record
 */
export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  location?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * AttendanceStatus
 * Possible statuses for attendance records
 */
export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  HALF_DAY = 'HALF_DAY',
  LEAVE = 'LEAVE',
  WORK_FROM_HOME = 'WORK_FROM_HOME',
}

/**
 * RecordAttendanceData
 * Data required to record attendance
 */
export interface RecordAttendanceData {
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status: AttendanceStatus;
  location?: string;
  notes?: string;
}

/**
 * AttendanceQuery
 * Query parameters for fetching attendance records
 */
export interface AttendanceQuery {
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  limit?: number;
  offset?: number;
}
