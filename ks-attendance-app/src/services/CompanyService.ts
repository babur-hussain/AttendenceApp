/**
 * CompanyService
 * TOON-based company and user management service
 */

import { toonClient } from './api/ToonClient';
import { API_ENDPOINTS } from './api/config';

export interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'hr';
  createdAt: string;
  lastLogin?: string;
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'manager' | 'hr';
}

export interface UpdateUserRequest {
  name?: string;
  email?: string;
  role?: 'admin' | 'manager' | 'hr';
  password?: string;
}

export class CompanyService {
  /**
   * Get all company users
   */
  static async getUsers(): Promise<CompanyUser[]> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.COMPANY.USERS,
        { operation: 'list' },
        { timeout: 5000 }
      );

      return response.users || [];
    } catch (error) {
      console.error('Failed to fetch company users:', error);
      throw error;
    }
  }

  /**
   * Get a specific user by ID
   */
  static async getUser(userId: string): Promise<CompanyUser> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.COMPANY.USER_DETAIL,
        { userId },
        { timeout: 5000 }
      );

      return response.user;
    } catch (error) {
      console.error('Failed to fetch user:', error);
      throw error;
    }
  }

  /**
   * Create a new company user
   */
  static async createUser(userData: CreateUserRequest): Promise<CompanyUser> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.COMPANY.CREATE_USER,
        userData,
        { timeout: 5000 }
      );

      return response.user;
    } catch (error) {
      console.error('Failed to create user:', error);
      throw error;
    }
  }

  /**
   * Update an existing user
   */
  static async updateUser(userId: string, updates: UpdateUserRequest): Promise<CompanyUser> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.COMPANY.UPDATE_USER,
        { userId, ...updates },
        { timeout: 5000 }
      );

      return response.user;
    } catch (error) {
      console.error('Failed to update user:', error);
      throw error;
    }
  }

  /**
   * Delete a user
   */
  static async deleteUser(userId: string): Promise<void> {
    try {
      await toonClient.toonPost(
        API_ENDPOINTS.COMPANY.DELETE_USER,
        { userId },
        { timeout: 5000 }
      );
    } catch (error) {
      console.error('Failed to delete user:', error);
      throw error;
    }
  }

  /**
   * Get company settings
   */
  static async getSettings(): Promise<Record<string, any>> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.COMPANY.SETTINGS,
        { operation: 'get' },
        { timeout: 5000 }
      );

      return response.settings || {};
    } catch (error) {
      console.error('Failed to fetch company settings:', error);
      throw error;
    }
  }

  /**
   * Update company settings
   */
  static async updateSettings(settings: Record<string, any>): Promise<void> {
    try {
      await toonClient.toonPost(
        API_ENDPOINTS.COMPANY.SETTINGS,
        { operation: 'update', settings },
        { timeout: 5000 }
      );
    } catch (error) {
      console.error('Failed to update company settings:', error);
      throw error;
    }
  }
}

export const companyService = new CompanyService();
