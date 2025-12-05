/**
 * Policy Store Module
 * 
 * Manages policy configurations with per-employee and per-role overrides.
 * Supports loading from bundled defaults, merging server updates, and
 * local persistence for offline operation.
 * 
 * STORAGE STRATEGY:
 * - Default policy: bundled with app (immutable)
 * - Server overrides: fetched via ToonClient, cached locally
 * - Merge priority: default < role < employee
 * 
 * PERSISTENCE:
 * - Use SecureStore for sensitive policy data
 * - Cache server policies with TTL
 * - Support offline operation with last-known policies
 */

import * as SecureStore from 'expo-secure-store';
import { PolicyConfig, DEFAULT_POLICY } from './thresholdEngine';

const POLICY_STORAGE_KEY = 'matcher_policy_config';
const POLICY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Stored policy data with metadata
 */
interface StoredPolicyData {
  basePolicy: PolicyConfig;
  roleOverrides: Record<string, Partial<PolicyConfig>>;
  employeeOverrides: Record<string, Partial<PolicyConfig>>;
  lastUpdated: number;
  ttl: number;
}

/**
 * Policy Store singleton
 */
class PolicyStore {
  private policyData: StoredPolicyData;
  private initialized: boolean = false;

  constructor() {
    this.policyData = {
      basePolicy: DEFAULT_POLICY,
      roleOverrides: {},
      employeeOverrides: {},
      lastUpdated: Date.now(),
      ttl: POLICY_TTL_MS,
    };
  }

  /**
   * Initialize policy store (load from storage)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      const stored = await SecureStore.getItemAsync(POLICY_STORAGE_KEY);
      
      if (stored) {
        const parsed: StoredPolicyData = JSON.parse(stored);
        
        // Check if cached policy is still valid (within TTL)
        const age = Date.now() - parsed.lastUpdated;
        if (age < parsed.ttl) {
          this.policyData = parsed;
          console.log('[PolicyStore] Loaded cached policy from storage');
        } else {
          console.log('[PolicyStore] Cached policy expired, using defaults');
        }
      }
    } catch (error) {
      console.warn('[PolicyStore] Failed to load from storage:', error);
    }

    this.initialized = true;
  }

  /**
   * Get policy for a specific employee
   * 
   * Merges base → role → employee overrides.
   */
  async getPolicyForEmployee(
    employeeId: string,
    role?: string
  ): Promise<PolicyConfig> {
    await this.initialize();

    let policy = { ...this.policyData.basePolicy };

    // Apply role override
    if (role && this.policyData.roleOverrides[role]) {
      policy = { ...policy, ...this.policyData.roleOverrides[role] };
    }

    // Apply employee override (highest priority)
    if (this.policyData.employeeOverrides[employeeId]) {
      policy = { ...policy, ...this.policyData.employeeOverrides[employeeId] };
    }

    return policy;
  }

  /**
   * Get policy for a role
   */
  async getPolicyForRole(role: string): Promise<PolicyConfig> {
    await this.initialize();

    let policy = { ...this.policyData.basePolicy };

    if (this.policyData.roleOverrides[role]) {
      policy = { ...policy, ...this.policyData.roleOverrides[role] };
    }

    return policy;
  }

  /**
   * Get base policy (no overrides)
   */
  async getBasePolicy(): Promise<PolicyConfig> {
    await this.initialize();
    return { ...this.policyData.basePolicy };
  }

  /**
   * Update base policy
   */
  async updateBasePolicy(policy: Partial<PolicyConfig>): Promise<void> {
    await this.initialize();

    this.policyData.basePolicy = {
      ...this.policyData.basePolicy,
      ...policy,
    };

    this.policyData.lastUpdated = Date.now();
    await this.persist();
  }

  /**
   * Set role-specific policy override
   */
  async setRoleOverride(role: string, overrides: Partial<PolicyConfig>): Promise<void> {
    await this.initialize();

    this.policyData.roleOverrides[role] = overrides;
    this.policyData.lastUpdated = Date.now();
    await this.persist();
  }

  /**
   * Set employee-specific policy override
   */
  async setEmployeeOverride(
    employeeId: string,
    overrides: Partial<PolicyConfig>
  ): Promise<void> {
    await this.initialize();

    this.policyData.employeeOverrides[employeeId] = overrides;
    this.policyData.lastUpdated = Date.now();
    await this.persist();
  }

  /**
   * Remove role override
   */
  async removeRoleOverride(role: string): Promise<void> {
    await this.initialize();

    delete this.policyData.roleOverrides[role];
    this.policyData.lastUpdated = Date.now();
    await this.persist();
  }

  /**
   * Remove employee override
   */
  async removeEmployeeOverride(employeeId: string): Promise<void> {
    await this.initialize();

    delete this.policyData.employeeOverrides[employeeId];
    this.policyData.lastUpdated = Date.now();
    await this.persist();
  }

  /**
   * TODO: TOON CLIENT INTEGRATION
   * 
   * Fetch policy updates from server via ToonClient.
   * 
   * INTEGRATION STEPS:
   * 1. Call ToonClient.toonGet('/api/v1/policies')
   * 2. Parse TOON response:
   *    - P1_GLOBAL_FACE=0.55
   *    - P2_UNCERTAIN=0.40
   *    - P3_LIVENESS_MIN=0.70
   *    - PR_MANAGER=0.60 (role override for MANAGER)
   *    - PE_EMP123=0.70 (employee override for EMP123)
   * 3. Merge with local policy
   * 4. Persist to SecureStore
   * 
   * @returns true if update successful
   */
  async fetchPolicyFromServer(): Promise<boolean> {
    // TODO: Implement ToonClient integration
    // const toonClient = getToonClient();
    // 
    // try {
    //   const response = await toonClient.toonGet('/api/v1/policies');
    //   
    //   // Parse TOON policy tokens
    //   const updates: Partial<PolicyConfig> = {
    //     globalFaceThreshold: parseFloat(response.P1_GLOBAL_FACE || '0.55'),
    //     uncertainThreshold: parseFloat(response.P2_UNCERTAIN || '0.40'),
    //     livenessMin: parseFloat(response.P3_LIVENESS_MIN || '0.70'),
    //     // ... parse other fields
    //   };
    //   
    //   await this.updateBasePolicy(updates);
    //   
    //   // Parse role overrides (PR_*)
    //   for (const [key, value] of Object.entries(response)) {
    //     if (key.startsWith('PR_')) {
    //       const role = key.substring(3);
    //       await this.setRoleOverride(role, { globalFaceThreshold: parseFloat(value) });
    //     }
    //   }
    //   
    //   // Parse employee overrides (PE_*)
    //   for (const [key, value] of Object.entries(response)) {
    //     if (key.startsWith('PE_')) {
    //       const employeeId = key.substring(3);
    //       await this.setEmployeeOverride(employeeId, { globalFaceThreshold: parseFloat(value) });
    //     }
    //   }
    //   
    //   return true;
    // } catch (error) {
    //   console.error('[PolicyStore] Failed to fetch from server:', error);
    //   return false;
    // }

    console.warn('[PolicyStore] Server fetch not implemented, using cached policy');
    return false;
  }

  /**
   * Persist policy data to SecureStore
   */
  private async persist(): Promise<void> {
    try {
      const serialized = JSON.stringify(this.policyData);
      await SecureStore.setItemAsync(POLICY_STORAGE_KEY, serialized);
      console.log('[PolicyStore] Policy persisted to storage');
    } catch (error) {
      console.error('[PolicyStore] Failed to persist:', error);
    }
  }

  /**
   * Clear all cached policies (reset to defaults)
   */
  async clearCache(): Promise<void> {
    this.policyData = {
      basePolicy: DEFAULT_POLICY,
      roleOverrides: {},
      employeeOverrides: {},
      lastUpdated: Date.now(),
      ttl: POLICY_TTL_MS,
    };

    await this.persist();
    console.log('[PolicyStore] Cache cleared, reset to defaults');
  }

  /**
   * Get cache age in milliseconds
   */
  getCacheAge(): number {
    return Date.now() - this.policyData.lastUpdated;
  }

  /**
   * Check if cache is expired
   */
  isCacheExpired(): boolean {
    return this.getCacheAge() > this.policyData.ttl;
  }

  /**
   * Get all role overrides
   */
  async getAllRoleOverrides(): Promise<Record<string, Partial<PolicyConfig>>> {
    await this.initialize();
    return { ...this.policyData.roleOverrides };
  }

  /**
   * Get all employee overrides
   */
  async getAllEmployeeOverrides(): Promise<Record<string, Partial<PolicyConfig>>> {
    await this.initialize();
    return { ...this.policyData.employeeOverrides };
  }

  /**
   * Bulk update policies from TOON response
   * 
   * @param toonData TOON response object with policy tokens
   */
  async updateFromToonResponse(toonData: Record<string, string>): Promise<void> {
    await this.initialize();

    // Parse base policy updates
    const baseUpdates: Partial<PolicyConfig> = {};

    if (toonData.P1_GLOBAL_FACE) {
      baseUpdates.globalFaceThreshold = parseFloat(toonData.P1_GLOBAL_FACE);
    }
    if (toonData.P2_UNCERTAIN) {
      baseUpdates.uncertainThreshold = parseFloat(toonData.P2_UNCERTAIN);
    }
    if (toonData.P3_LIVENESS_MIN) {
      baseUpdates.livenessMin = parseFloat(toonData.P3_LIVENESS_MIN);
    }
    if (toonData.P4_FINGERPRINT) {
      baseUpdates.fingerprintThreshold = parseFloat(toonData.P4_FINGERPRINT);
    }
    if (toonData.P5_MODE) {
      baseUpdates.biometricMode = toonData.P5_MODE as any;
    }

    if (Object.keys(baseUpdates).length > 0) {
      await this.updateBasePolicy(baseUpdates);
    }

    // Parse role overrides (PR_ROLE_FIELD format)
    for (const [key, value] of Object.entries(toonData)) {
      if (key.startsWith('PR_')) {
        const parts = key.substring(3).split('_');
        if (parts.length >= 2) {
          const role = parts[0];
          const field = parts.slice(1).join('_');

          const roleOverride = this.policyData.roleOverrides[role] || {};
          
          if (field === 'FACE') {
            roleOverride.globalFaceThreshold = parseFloat(value);
          } else if (field === 'LIVENESS') {
            roleOverride.livenessMin = parseFloat(value);
          }

          await this.setRoleOverride(role, roleOverride);
        }
      }
    }

    // Parse employee overrides (PE_EMP_FIELD format)
    for (const [key, value] of Object.entries(toonData)) {
      if (key.startsWith('PE_')) {
        const parts = key.substring(3).split('_');
        if (parts.length >= 2) {
          const employeeId = parts[0];
          const field = parts.slice(1).join('_');

          const empOverride = this.policyData.employeeOverrides[employeeId] || {};
          
          if (field === 'FACE') {
            empOverride.globalFaceThreshold = parseFloat(value);
          } else if (field === 'LIVENESS') {
            empOverride.livenessMin = parseFloat(value);
          }

          await this.setEmployeeOverride(employeeId, empOverride);
        }
      }
    }
  }
}

// Singleton instance
const policyStore = new PolicyStore();

export default policyStore;

// Convenience exports
export const getPolicyForEmployee = (employeeId: string, role?: string) =>
  policyStore.getPolicyForEmployee(employeeId, role);

export const getPolicyForRole = (role: string) =>
  policyStore.getPolicyForRole(role);

export const getBasePolicy = () =>
  policyStore.getBasePolicy();

export const updateBasePolicy = (policy: Partial<PolicyConfig>) =>
  policyStore.updateBasePolicy(policy);

export const setRoleOverride = (role: string, overrides: Partial<PolicyConfig>) =>
  policyStore.setRoleOverride(role, overrides);

export const setEmployeeOverride = (employeeId: string, overrides: Partial<PolicyConfig>) =>
  policyStore.setEmployeeOverride(employeeId, overrides);

export const fetchPolicyFromServer = () =>
  policyStore.fetchPolicyFromServer();

export const clearPolicyCache = () =>
  policyStore.clearCache();

export { policyStore };
