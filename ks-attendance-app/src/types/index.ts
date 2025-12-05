/**
 * Types barrel export
 * Centralized export for all TypeScript types
 */
export type {
  RootStackParamList,
  RootStackNavigationProp,
  RootStackRouteProp,
  ScreenProps,
} from './navigation';

export type {
  User,
  AuthState,
  AuthContextType,
} from './auth';

export type {
  AdminRole,
  AdminUser,
  AdminPermission,
  AdminStats,
  AdminActivity,
  AdminDashboardData,
  CreateAdminUserRequest,
  UpdateAdminUserRequest,
  AdminLoginRequest,
  AdminLoginResponse,
} from './admin';

export type {
  Company,
  CompanySettings,
  Holiday,
  Department,
  CompanyUser,
  CreateDepartmentRequest,
  UpdateDepartmentRequest,
  UpdateCompanySettingsRequest,
  CompanyStats,
} from './company';

export type {
  DeviceType,
  DeviceStatus,
  Device,
  DeviceCapabilities,
  DeviceConfig,
  DeviceLog,
  DeviceRecognitionEvent,
  RegisterDeviceRequest,
  UpdateDeviceRequest,
  DeviceHealthCheck,
  DeviceStats,
  BulkDeviceAction,
} from './device';

export type {
  SignInRequest,
  SignInResponse,
  SignOutRequest,
  SignOutResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  GetCurrentUserRequest,
  GetCurrentUserResponse,
  AuthErrorResponse,
  TokenPair,
} from './auth-requests';

export type {
  ToonToken,
  ToonRequest,
  ToonResponse,
  ToonError,
  ToonServiceConfig,
} from './toon';

export type {
  Employee,
  CreateEmployeeData,
  UpdateEmployeeData,
  AttendanceRecord,
  RecordAttendanceData,
  AttendanceQuery,
  FaceEmbedding,
  EmployeeStatus,
} from './domain';

export { AttendanceStatus } from './domain';

export type {
  EnrollEmployeeRequest,
  EnrollEmployeeResponse,
  GetEmployeeRequest,
  GetEmployeeResponse,
  ListEmployeesRequest,
  ListEmployeesResponse,
  UpdateEmployeeRequest,
  UpdateEmployeeResponse,
  EnrollEmployeeFormData,
} from './employee-requests';

export type {
  BiometricAdapter,
  FaceData,
  FingerprintData,
  BiometricDeviceInfo,
  BiometricCaptureOptions,
  BiometricMatchResult,
  BiometricToonTokens,
  BiometricDeviceType,
  BiometricCapability,
} from './biometric';

export { BiometricError, BiometricErrorCode } from './biometric';

export type {
  FaceFrame,
  FaceBoundingBox,
  FaceLandmarks,
  FacePose,
  LivenessResult,
  FaceQuality,
  FacePipelineResult,
  FacePipelineConfig,
  FacePipelineToonTokens,
  ExternalFacePipelineInput,
} from './face-pipeline';

export {
  FacePipelineStage,
  FacePipelineError,
  FacePipelineErrorCode,
} from './face-pipeline';

export type {
  AttendanceEvent,
  AttendanceSummary,
  AttendancePolicy,
  RecordCheckinOptions,
  HybridEventInput,
  PendingEvent,
  AuditLogEntry,
  AttendanceEventHook,
  DeviceValidator,
  ReconciliationResult,
  AttendanceEventToonTokens,
  AttendanceLocation,
  BiometricVerificationData,
} from './attendance';

export {
  AttendanceEventType,
  AttendanceEventStatus,
  BreakType,
  BiometricVerificationMode,
  AttendanceError,
  AttendanceErrorCode,
} from './attendance';
