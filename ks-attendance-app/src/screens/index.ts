/**
 * Screens barrel export
 * Centralized export for all screen components
 */

// Auth screens
export { LoginScreen, ForgotPinScreen, ResetPinScreen } from './auth';

// Home screens (role-based)
export { EmployeeHomeScreen, ManagerHomeScreen, AdminHomeScreen } from './home';

// Main screens
export { HomeScreen } from './HomeScreen';
export { CheckinScreen } from './CheckinScreen';
export { CheckinResultScreen } from './CheckinResultScreen';
export { OfflineQueueScreen } from './OfflineQueueScreen';

// New checkin screens
export { CheckinCapture } from './checkin/CheckinCapture';
export { OfflineQueue } from './checkin/OfflineQueue';

// History screens
export { HistoryHome } from './history/HistoryHome';
export { DayDetail } from './history/DayDetail';
export { Charts } from './history/Charts';

// Manager Dashboard screens
export { ManagerDashboardHome } from './manager/ManagerDashboardHome';
export { PendingApprovals } from './manager/PendingApprovals';
export { EmployeeDetail } from './manager/EmployeeDetail';
export { OverrideEventModal } from './manager/OverrideEventModal';
export { DeviceStatusScreen } from './manager/DeviceStatusScreen';

// Face-First UX screens
export { default as CompanyLoginScreen } from './CompanyLoginScreen';
export { default as CreateCompanyScreen } from './CreateCompanyScreen';
export { default as FaceScannerHome } from './FaceScannerHome';
export { default as EmployeeProfileScreen } from './EmployeeProfileScreen';
export { default as PinLoginScreen } from './PinLoginScreen';

// Admin screens
export { default as AdminDashboardHome } from './admin/AdminDashboardHome';
export { default as CompanyUsersScreen } from './admin/CompanyUsersScreen';
export { default as EmployeesManagementScreen } from './admin/EmployeesManagementScreen';
export { default as FaceEnrollmentScreen } from './admin/FaceEnrollmentScreen';
export { default as DeviceManagementScreen } from './admin/DeviceManagementScreen';
export { default as PoliciesScreen } from './admin/PoliciesScreen';
export { default as ReportsScreen } from './admin/ReportsScreen';
export { default as AttendanceHistoryScreen } from './admin/AttendanceHistoryScreen';

