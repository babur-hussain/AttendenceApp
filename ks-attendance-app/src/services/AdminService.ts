/**
 * AdminService
 * TOON-based admin management service
 */

import { toonClient } from './api/ToonClient';
import { API_ENDPOINTS } from './api/config';

export interface AdminStats {
  totalEmployees: number;
  activeToday: number;
  totalDevices: number;
  onlineDevices: number;
}

export interface AdminActivity {
  id: string;
  type: 'login' | 'employee_added' | 'policy_updated' | 'device_registered';
  description: string;
  timestamp: string;
  userId: string;
  userName: string;
}

export class AdminService {
  /**
   * Get dashboard statistics
   */
  static async getDashboardStats(): Promise<AdminStats> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.ADMIN.STATS,
        {},
        { timeout: 5000 }
      );

      return {
        totalEmployees: response.totalEmployees || 0,
        activeToday: response.activeToday || 0,
        totalDevices: response.totalDevices || 0,
        onlineDevices: response.onlineDevices || 0,
      };
    } catch (error) {
      console.error('Failed to fetch admin stats:', error);
      throw error;
    }
  }

  /**
   * Get recent admin activities
   */
  static async getRecentActivities(limit: number = 10): Promise<AdminActivity[]> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.ADMIN.ACTIVITIES,
        { limit },
        { timeout: 5000 }
      );

      return response.activities || [];
    } catch (error) {
      console.error('Failed to fetch admin activities:', error);
      throw error;
    }
  }

  /**
   * Get system health status
   */
  static async getSystemHealth(): Promise<{ status: 'healthy' | 'degraded' | 'down'; message: string }> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.ADMIN.HEALTH,
        {},
        { timeout: 3000 }
      );

      return {
        status: response.status || 'unknown',
        message: response.message || '',
      };
    } catch (error) {
      console.error('Failed to fetch system health:', error);
      return { status: 'down', message: 'Unable to reach server' };
    }
  }
}

export const adminService = new AdminService();
