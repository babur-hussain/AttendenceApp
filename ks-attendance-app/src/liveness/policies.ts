/**
 * Liveness Policies
 * 
 * Configurable policies for different liveness scenarios.
 * Supports per-device, per-role, and per-employee overrides.
 */

import type { FusionWeights } from './fusionEngine';
import type { EvidenceStoreConfig } from './evidenceStore';

/**
 * Liveness policy configuration
 */
export interface LivenessPolicy {
  name: string;
  description: string;
  
  // Fusion weights
  weights: FusionWeights;
  
  // Thresholds
  thresholds: {
    liveness: number;        // L1 threshold (0-1)
    minMotion: number;       // Minimum motion score
    minML: number;           // Minimum ML score
    minQuality: number;      // Minimum quality score
    minStability: number;    // Minimum stability score
  };
  
  // Evidence storage
  evidenceConfig: Partial<EvidenceStoreConfig> & {
    storeEvidence: boolean;  // Whether to store evidence
    requireConsent: boolean; // Require C1 consent token
  };
  
  // Behavioral requirements
  behavior: {
    requireBlink: boolean;
    requireHeadTurn: boolean;
    requireMouthMovement: boolean;
    maxAttempts: number;     // Max liveness attempts
    timeout: number;         // Timeout in seconds
  };
}

/**
 * Default policy (balanced)
 */
export const DEFAULT_POLICY: LivenessPolicy = {
  name: 'default',
  description: 'Balanced liveness policy for general use',
  
  weights: {
    motion: 0.6,
    ml: 0.3,
    quality: 0.05,
    device: 0.03,
    stability: 0.02,
  },
  
  thresholds: {
    liveness: 0.7,
    minMotion: 0.4,
    minML: 0.4,
    minQuality: 0.5,
    minStability: 0.5,
  },
  
  evidenceConfig: {
    storeEvidence: true,
    requireConsent: true,
    ttlHours: 24,
    encryptionLevel: 'standard',
    maxSize: 5 * 1024 * 1024,
    autoCleanup: true,
  },
  
  behavior: {
    requireBlink: true,
    requireHeadTurn: true,
    requireMouthMovement: false,
    maxAttempts: 3,
    timeout: 10,
  },
};

/**
 * Strict policy (high security)
 */
export const STRICT_POLICY: LivenessPolicy = {
  name: 'strict',
  description: 'High-security liveness policy with ML emphasis',
  
  weights: {
    motion: 0.4,
    ml: 0.5,
    quality: 0.05,
    device: 0.03,
    stability: 0.02,
  },
  
  thresholds: {
    liveness: 0.85,
    minMotion: 0.6,
    minML: 0.7,
    minQuality: 0.6,
    minStability: 0.7,
  },
  
  evidenceConfig: {
    storeEvidence: true,
    requireConsent: true,
    ttlHours: 48,
    encryptionLevel: 'high',
    maxSize: 10 * 1024 * 1024,
    autoCleanup: true,
  },
  
  behavior: {
    requireBlink: true,
    requireHeadTurn: true,
    requireMouthMovement: true,
    maxAttempts: 2,
    timeout: 15,
  },
};

/**
 * Lenient policy (poor lighting or low-end devices)
 */
export const LENIENT_POLICY: LivenessPolicy = {
  name: 'lenient',
  description: 'Lenient policy for challenging conditions',
  
  weights: {
    motion: 0.7,
    ml: 0.15,
    quality: 0.1,
    device: 0.03,
    stability: 0.02,
  },
  
  thresholds: {
    liveness: 0.6,
    minMotion: 0.3,
    minML: 0.3,
    minQuality: 0.3,
    minStability: 0.4,
  },
  
  evidenceConfig: {
    storeEvidence: true,
    requireConsent: true,
    ttlHours: 24,
    encryptionLevel: 'standard',
    maxSize: 3 * 1024 * 1024,
    autoCleanup: true,
  },
  
  behavior: {
    requireBlink: true,
    requireHeadTurn: false,
    requireMouthMovement: false,
    maxAttempts: 5,
    timeout: 12,
  },
};

/**
 * Fast policy (quick checks)
 */
export const FAST_POLICY: LivenessPolicy = {
  name: 'fast',
  description: 'Fast liveness check for frequent attendance',
  
  weights: {
    motion: 0.8,
    ml: 0.1,
    quality: 0.05,
    device: 0.03,
    stability: 0.02,
  },
  
  thresholds: {
    liveness: 0.65,
    minMotion: 0.5,
    minML: 0.3,
    minQuality: 0.4,
    minStability: 0.4,
  },
  
  evidenceConfig: {
    storeEvidence: false,  // No evidence for fast checks
    requireConsent: false,
    ttlHours: 1,
    encryptionLevel: 'none',
    maxSize: 1 * 1024 * 1024,
    autoCleanup: true,
  },
  
  behavior: {
    requireBlink: true,
    requireHeadTurn: false,
    requireMouthMovement: false,
    maxAttempts: 2,
    timeout: 5,
  },
};

/**
 * All predefined policies
 */
export const PREDEFINED_POLICIES: Record<string, LivenessPolicy> = {
  default: DEFAULT_POLICY,
  strict: STRICT_POLICY,
  lenient: LENIENT_POLICY,
  fast: FAST_POLICY,
};

/**
 * Policy store (in-memory cache)
 */
const policyStore = new Map<string, LivenessPolicy>();

// Initialize with predefined policies
Object.entries(PREDEFINED_POLICIES).forEach(([name, policy]) => {
  policyStore.set(name, policy);
});

/**
 * Get policy by name
 * 
 * @param name Policy name
 * @returns Liveness policy or default if not found
 */
export function getPolicy(name: string): LivenessPolicy {
  const policy = policyStore.get(name);
  
  if (!policy) {
    console.warn('[Policy] Policy not found:', name, '- using default');
    return DEFAULT_POLICY;
  }
  
  return policy;
}

/**
 * Get policy for device
 * 
 * Device-specific overrides based on device characteristics.
 * 
 * @param deviceId Device ID
 * @param deviceInfo Device information
 * @returns Recommended policy
 */
export function getPolicyForDevice(
  deviceId: string,
  deviceInfo?: {
    platform?: 'ios' | 'android' | 'web' | 'raspberry-pi';
    hasML?: boolean;
    cameraQuality?: 'high' | 'medium' | 'low';
    trustScore?: number;
  }
): LivenessPolicy {
  // Check for custom device policy
  const customPolicy = policyStore.get(`device:${deviceId}`);
  if (customPolicy) {
    return customPolicy;
  }
  
  // Select policy based on device characteristics
  if (!deviceInfo) {
    return DEFAULT_POLICY;
  }
  
  const { platform, hasML, cameraQuality, trustScore } = deviceInfo;
  
  // Raspberry Pi or low-trust device → strict
  if (platform === 'raspberry-pi' || (trustScore !== undefined && trustScore < 0.7)) {
    return STRICT_POLICY;
  }
  
  // Low camera quality or no ML → lenient
  if (cameraQuality === 'low' || hasML === false) {
    return LENIENT_POLICY;
  }
  
  // High camera quality + ML → default
  return DEFAULT_POLICY;
}

/**
 * Get policy for role
 * 
 * Role-based policies (admin, manager, employee).
 * 
 * @param role User role
 * @returns Recommended policy
 */
export function getPolicyForRole(role: 'admin' | 'manager' | 'employee' | 'guest'): LivenessPolicy {
  // Check for custom role policy
  const customPolicy = policyStore.get(`role:${role}`);
  if (customPolicy) {
    return customPolicy;
  }
  
  // Default role-based policies
  switch (role) {
    case 'admin':
      return FAST_POLICY; // Admins can use fast checks
      
    case 'manager':
      return DEFAULT_POLICY;
      
    case 'employee':
      return DEFAULT_POLICY;
      
    case 'guest':
      return STRICT_POLICY; // Guests need strict validation
      
    default:
      return DEFAULT_POLICY;
  }
}

/**
 * Get policy for employee
 * 
 * Employee-specific overrides.
 * 
 * @param employeeId Employee ID
 * @returns Employee policy or default
 */
export function getPolicyForEmployee(employeeId: string): LivenessPolicy {
  const customPolicy = policyStore.get(`employee:${employeeId}`);
  if (customPolicy) {
    return customPolicy;
  }
  
  return DEFAULT_POLICY;
}

/**
 * Set custom policy
 * 
 * @param key Policy key (name or device:ID or role:NAME or employee:ID)
 * @param policy Custom policy
 */
export function setPolicy(key: string, policy: LivenessPolicy): void {
  console.log('[Policy] Setting custom policy:', key);
  policyStore.set(key, policy);
}

/**
 * Remove custom policy
 * 
 * @param key Policy key
 * @returns True if removed
 */
export function removePolicy(key: string): boolean {
  if (PREDEFINED_POLICIES[key]) {
    console.warn('[Policy] Cannot remove predefined policy:', key);
    return false;
  }
  
  return policyStore.delete(key);
}

/**
 * List all policies
 * 
 * @returns Array of policy names
 */
export function listPolicies(): string[] {
  return Array.from(policyStore.keys());
}

/**
 * Merge policy with overrides
 * 
 * @param basePolicy Base policy
 * @param overrides Partial overrides
 * @returns Merged policy
 */
export function mergePolicy(
  basePolicy: LivenessPolicy,
  overrides: Partial<LivenessPolicy>
): LivenessPolicy {
  return {
    ...basePolicy,
    ...overrides,
    weights: { ...basePolicy.weights, ...overrides.weights },
    thresholds: { ...basePolicy.thresholds, ...overrides.thresholds },
    evidenceConfig: { ...basePolicy.evidenceConfig, ...overrides.evidenceConfig },
    behavior: { ...basePolicy.behavior, ...overrides.behavior },
  };
}

/**
 * Validate policy configuration
 * 
 * @param policy Policy to validate
 * @returns Validation errors (empty if valid)
 */
export function validatePolicy(policy: LivenessPolicy): string[] {
  const errors: string[] = [];
  
  // Validate weights sum to 1.0
  const weightSum = Object.values(policy.weights).reduce((sum, w) => sum + w, 0);
  if (Math.abs(weightSum - 1.0) > 0.01) {
    errors.push(`Weights must sum to 1.0 (got ${weightSum.toFixed(3)})`);
  }
  
  // Validate thresholds in range [0, 1]
  Object.entries(policy.thresholds).forEach(([key, value]) => {
    if (value < 0 || value > 1) {
      errors.push(`Threshold ${key} must be in [0, 1] (got ${value})`);
    }
  });
  
  // Validate behavior
  if (policy.behavior.maxAttempts < 1) {
    errors.push('maxAttempts must be >= 1');
  }
  
  if (policy.behavior.timeout < 3 || policy.behavior.timeout > 60) {
    errors.push('timeout must be in [3, 60] seconds');
  }
  
  // Validate evidence config
  if (policy.evidenceConfig.storeEvidence && policy.evidenceConfig.requireConsent === false) {
    errors.push('Evidence storage requires consent (requireConsent must be true)');
  }
  
  return errors;
}

/**
 * Get recommended policy for environment
 * 
 * @param environment Environment characteristics
 * @returns Recommended policy
 */
export function getRecommendedPolicy(environment: {
  lighting?: 'good' | 'poor' | 'variable';
  deviceQuality?: 'high' | 'medium' | 'low';
  securityLevel?: 'standard' | 'high' | 'critical';
  frequentUser?: boolean;
}): LivenessPolicy {
  const { lighting, deviceQuality, securityLevel, frequentUser } = environment;
  
  // Critical security → strict
  if (securityLevel === 'critical') {
    return STRICT_POLICY;
  }
  
  // Frequent user + good conditions → fast
  if (frequentUser && lighting === 'good' && deviceQuality !== 'low') {
    return FAST_POLICY;
  }
  
  // Poor lighting or low device quality → lenient
  if (lighting === 'poor' || deviceQuality === 'low') {
    return LENIENT_POLICY;
  }
  
  // High security → strict
  if (securityLevel === 'high') {
    return STRICT_POLICY;
  }
  
  // Default for most cases
  return DEFAULT_POLICY;
}
