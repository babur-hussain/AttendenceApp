/**
 * PolicyService
 * TOON-based policy management service
 */

import { toonClient } from './api/ToonClient';
import { API_ENDPOINTS } from './api/config';

export interface Policy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  category: 'attendance' | 'security' | 'general';
  config?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePolicyRequest {
  name: string;
  description: string;
  category: 'attendance' | 'security' | 'general';
  enabled: boolean;
  config?: Record<string, any>;
}

export interface UpdatePolicyRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
  config?: Record<string, any>;
}

export class PolicyService {
  /**
   * Get all policies
   */
  static async getAllPolicies(): Promise<Policy[]> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.POLICIES.LIST,
        { operation: 'list' },
        { timeout: 5000 }
      );

      return response.policies || [];
    } catch (error) {
      console.error('Failed to fetch policies:', error);
      throw error;
    }
  }

  /**
   * Get policies by category
   */
  static async getPoliciesByCategory(category: 'attendance' | 'security' | 'general'): Promise<Policy[]> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.POLICIES.LIST,
        { category },
        { timeout: 5000 }
      );

      return response.policies || [];
    } catch (error) {
      console.error('Failed to fetch policies by category:', error);
      throw error;
    }
  }

  /**
   * Get a specific policy
   */
  static async getPolicy(policyId: string): Promise<Policy> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.POLICIES.DETAIL,
        { policyId },
        { timeout: 5000 }
      );

      return response.policy;
    } catch (error) {
      console.error('Failed to fetch policy:', error);
      throw error;
    }
  }

  /**
   * Create a new policy
   */
  static async createPolicy(policyData: CreatePolicyRequest): Promise<Policy> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.POLICIES.CREATE,
        policyData,
        { timeout: 5000 }
      );

      return response.policy;
    } catch (error) {
      console.error('Failed to create policy:', error);
      throw error;
    }
  }

  /**
   * Update a policy
   */
  static async updatePolicy(policyId: string, updates: UpdatePolicyRequest): Promise<Policy> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.POLICIES.UPDATE,
        { policyId, ...updates },
        { timeout: 5000 }
      );

      return response.policy;
    } catch (error) {
      console.error('Failed to update policy:', error);
      throw error;
    }
  }

  /**
   * Delete a policy
   */
  static async deletePolicy(policyId: string): Promise<void> {
    try {
      await toonClient.toonPost(
        API_ENDPOINTS.POLICIES.DELETE,
        { policyId },
        { timeout: 5000 }
      );
    } catch (error) {
      console.error('Failed to delete policy:', error);
      throw error;
    }
  }

  /**
   * Enable/disable a policy
   */
  static async togglePolicy(policyId: string, enabled: boolean): Promise<Policy> {
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.POLICIES.TOGGLE,
        { policyId, enabled },
        { timeout: 5000 }
      );

      return response.policy;
    } catch (error) {
      console.error('Failed to toggle policy:', error);
      throw error;
    }
  }
}

export const policyService = new PolicyService();
