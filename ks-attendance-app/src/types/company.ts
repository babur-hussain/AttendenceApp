/**
 * Company Types
 * Type definitions for company, departments, and organizational structure
 */

export interface Company {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logo?: string;
  timezone: string;
  currency: string;
  settings: CompanySettings;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  attendance: {
    gracePeriodsMinutes: number;
    autoCheckoutAfterHours: number;
    requireFaceRecognition: boolean;
    requireLivenessCheck: boolean;
    allowManualCheckout: boolean;
  };
  workHours: {
    standardStartTime: string; // HH:mm format
    standardEndTime: string;
    weekendDays: number[]; // 0=Sunday, 6=Saturday
    holidays: Holiday[];
  };
  breaks: {
    maxBreakTimeMinutes: number;
    maxBreaksPerDay: number;
    requireBreakApproval: boolean;
  };
  notifications: {
    lateArrivalNotification: boolean;
    absenceNotification: boolean;
    overtimeNotification: boolean;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
}

export interface Holiday {
  id: string;
  name: string;
  date: string; // ISO date string
  type: 'public' | 'company' | 'religious';
}

export interface Department {
  id: string;
  companyId: string;
  name: string;
  code: string;
  managerId?: string;
  managerName?: string;
  employeeCount: number;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyUser {
  id: string;
  companyId: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'hr';
  departmentId?: string;
  departmentName?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface CreateDepartmentRequest {
  name: string;
  code: string;
  managerId?: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  name?: string;
  code?: string;
  managerId?: string;
  description?: string;
}

export interface UpdateCompanySettingsRequest {
  attendance?: Partial<CompanySettings['attendance']>;
  workHours?: Partial<CompanySettings['workHours']>;
  breaks?: Partial<CompanySettings['breaks']>;
  notifications?: Partial<CompanySettings['notifications']>;
}

export interface CompanyStats {
  totalEmployees: number;
  totalDepartments: number;
  totalDevices: number;
  activeUsersToday: number;
  averageAttendanceRate: number;
  averageWorkHoursPerDay: number;
}
