/**
 * Hooks barrel export
 * Centralized export for all custom hooks
 */
export { useAttendanceQueue } from './useAttendanceQueue';
export { useHistory } from './useHistory';
export { useCharts } from './useCharts';

// Manager Dashboard Hooks
export { useManagerDashboard } from './useManagerDashboard';
export { useApprovals } from './useApprovals';
export { useEmployeeDetail } from './useEmployeeDetail';
export { useDeviceStatus } from './useDeviceStatus';

// Face-First UX Hooks
export { useFaceScanner } from './useFaceScanner';
export { useEmployeeProfile } from './useEmployeeProfile';
export { useAdminAuth } from './useAdminAuth';
export { useCompanyUsers } from './useCompanyUsers';
export { useEmployeeManagement } from './useEmployeeManagement';
export { useFaceEnrollment } from './useFaceEnrollment';
export { useDeviceRegistry } from './useDeviceRegistry';
export { usePolicies } from './usePolicies';
export { useAdminSession, AdminSessionProvider } from './useAdminSession';
export { useCompanyLogin } from './useCompanyLogin';
export { usePinLogin } from './usePinLogin';

export type {
  HistoryFilters,
  DayBadge,
  MonthSummary,
  AttendanceEvent,
  PaginationInfo,
} from './useHistory';

export type {
  WeeklyHoursData,
  PunctualityPoint,
  BreakUsageData,
  OvertimeBin,
} from './useCharts';

// Manager Dashboard Types
export type {
  TeamMemberStatus,
  DashboardKPIs,
  DashboardFilters,
  DashboardData,
} from './useManagerDashboard';

export type {
  PendingApproval,
  ApprovalDecision,
  ApprovalFilters,
} from './useApprovals';

export type {
  EmployeeMetrics,
  EmployeeEvent,
  EmployeeDetail,
} from './useEmployeeDetail';

export type {
  DeviceStatus,
  DeviceCommand,
} from './useDeviceStatus';
