/**
 * Admin Types
 * Type definitions for admin users, permissions, and dashboard data
 */

export type AdminRole = 'admin' | 'manager' | 'hr';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: AdminPermission[];
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface AdminPermission {
  resource: 'employees' | 'attendance' | 'devices' | 'policies' | 'users' | 'reports';
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface AdminStats {
  totalEmployees: number;
  activeToday: number;
  presentToday: number;
  lateArrivals: number;
  absences: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  pendingApprovals: number;
}

export interface AdminActivity {
  id: string;
  type: 'login' | 'logout' | 'employee_added' | 'employee_updated' | 'employee_deleted' | 
        'policy_updated' | 'device_registered' | 'user_created' | 'attendance_modified';
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
  metadata?: Record<string, any>;
}

export interface AdminDashboardData {
  stats: AdminStats;
  recentActivities: AdminActivity[];
  systemHealth: {
    status: 'healthy' | 'degraded' | 'down';
    message: string;
    lastCheck: string;
  };
}

export interface CreateAdminUserRequest {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
  permissions?: AdminPermission[];
}

export interface UpdateAdminUserRequest {
  name?: string;
  email?: string;
  password?: string;
  role?: AdminRole;
  permissions?: AdminPermission[];
  isActive?: boolean;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
