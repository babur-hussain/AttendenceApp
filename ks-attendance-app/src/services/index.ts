/**
 * Services barrel export
 * Centralized export for all service modules (API, storage, etc.)
 */
export { ToonService, toonService } from './ToonService';
export { AuthService, authService } from './AuthService';
export { EmployeeService } from './EmployeeService';
export { AttendanceService } from './AttendanceService';
export { BreakCalculator } from './BreakCalculator';
export { AdminService, adminService } from './AdminService';
export { CompanyService, companyService } from './CompanyService';
export { DeviceService, deviceService } from './DeviceService';
export { PolicyService, policyService } from './PolicyService';
export { ToonClient, toonClient } from './api/ToonClient';
export { API_CONFIG, API_ENDPOINTS, buildUrl, buildHeaders } from './api/config';
export type { ToonClientConfig, ToonRequestOptions } from './api/ToonClient';
export type { EnrollEmployeeFormData } from './EmployeeService';
export type {
  EventType,
  EventStatus,
  BreakType,
  AttendanceEventPayload,
  QueuedEvent,
  ReconcileResult,
  AttendanceEventListener,
} from './AttendanceService';
export type { BreakSession, DailyBreakSummary } from './BreakCalculator';

// Biometric services
export {
  MobileFaceAdapter,
  ExternalFaceDeviceAdapter,
  ExternalFingerprintAdapter,
  BiometricManager,
  FacePipeline,
} from './biometric';
export type {
  ExternalFaceDeviceConfig,
  ExternalFingerprintDeviceConfig,
  BiometricManagerConfig,
} from './biometric';
