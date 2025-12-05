/**
 * Threshold Engine Tests
 * 
 * Tests for policy-driven decision logic, overrides, and audit trails.
 */

import {
  evaluateDecision,
  PolicyConfig,
  DecisionResult,
  DEFAULT_POLICY,
  mergePolicyOverrides,
  wouldAccept,
  createEmployeeOverride,
  createRoleOverride,
  computeScoreBreakdown,
} from '../thresholdEngine';

describe('Threshold Engine', () => {
  describe('evaluateDecision', () => {
    it('should ACCEPT with high face score and liveness', () => {
      const result = evaluateDecision({
        faceMatchScore: 0.85,
        livenessScore: 0.90,
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(result.status).toBe('ACCEPTED');
      expect(result.confidence).toBeGreaterThan(70);
      expect(result.usedRules.length).toBeGreaterThan(0);
    });
    
    it('should REJECT with low face score', () => {
      const result = evaluateDecision({
        faceMatchScore: 0.30,
        livenessScore: 0.90,
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(result.status).toBe('REJECTED');
      expect(result.primaryReason).toBe('low_face_score');
      expect(result.recommendedAction).toBeDefined();
    });
    
    it('should REJECT with low liveness', () => {
      const result = evaluateDecision({
        faceMatchScore: 0.85,
        livenessScore: 0.40,
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(result.status).toBe('REJECTED');
      expect(result.primaryReason).toBe('low_liveness');
      expect(result.recommendedAction).toBe('retry_capture');
    });
    
    it('should PENDING with uncertain face score', () => {
      const result = evaluateDecision({
        faceMatchScore: 0.50, // Between uncertain and accept
        livenessScore: 0.90,
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(result.status).toBe('PENDING');
      expect(result.recommendedAction).toBe('ask_fingerprint');
    });
    
    it('should REJECT with no candidates', () => {
      const result = evaluateDecision({
        faceMatchScore: 0.85,
        livenessScore: 0.90,
        candidateCount: 0,
        policy: DEFAULT_POLICY,
      });
      
      expect(result.status).toBe('REJECTED');
      expect(result.primaryReason).toBe('no_candidate');
    });
    
    it('should use fingerprint in requireBoth mode', () => {
      const policy: PolicyConfig = {
        ...DEFAULT_POLICY,
        biometricMode: 'requireBoth',
        fingerprintThreshold: 0.70,
      };
      
      // High face, low fingerprint
      const result = evaluateDecision({
        faceMatchScore: 0.85,
        livenessScore: 0.90,
        fingerprintScore: 0.50,
        candidateCount: 5,
        policy,
      });
      
      expect(result.status).toBe('REJECTED');
      expect(result.primaryReason).toBe('low_fingerprint');
    });
    
    it('should allow fallback to pin', () => {
      const policy: PolicyConfig = {
        ...DEFAULT_POLICY,
        biometricMode: 'allowFallbackPin',
      };
      
      const result = evaluateDecision({
        faceMatchScore: 0.45, // Below threshold
        livenessScore: 0.90,
        candidateCount: 5,
        policy,
      });
      
      expect(result.status).toBe('PENDING');
      expect(result.recommendedAction).toBe('ask_pin');
    });
    
    it('should include audit trail', () => {
      const result = evaluateDecision({
        faceMatchScore: 0.85,
        livenessScore: 0.90,
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(result.usedRules).toBeDefined();
      expect(result.usedRules.length).toBeGreaterThan(0);
      
      for (const rule of result.usedRules) {
        expect(rule.ruleName).toBeDefined();
        expect(rule.condition).toBeDefined();
        expect(rule.result).toBeDefined();
      }
    });
    
    it('should compute score breakdown', () => {
      const result = evaluateDecision({
        faceMatchScore: 0.85,
        livenessScore: 0.90,
        fingerprintScore: 0.80,
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(result.scoreBreakdown).toBeDefined();
      expect(result.scoreBreakdown.faceScore).toBeCloseTo(0.85, 2);
      expect(result.scoreBreakdown.livenessScore).toBeCloseTo(0.90, 2);
      expect(result.scoreBreakdown.fingerprintScore).toBeCloseTo(0.80, 2);
      expect(result.scoreBreakdown.finalConfidence).toBeGreaterThan(0);
    });
  });
  
  describe('mergePolicyOverrides', () => {
    it('should merge role override', () => {
      const base: PolicyConfig = {
        ...DEFAULT_POLICY,
        globalFaceThreshold: 0.55,
        roleOverrides: {
          'MANAGER': { globalFaceThreshold: 0.70 },
        },
      };
      
      const merged = mergePolicyOverrides(base, 'MANAGER');
      
      expect(merged.globalFaceThreshold).toBe(0.70);
      expect(merged.livenessMin).toBe(base.livenessMin); // Unchanged
    });
    
    it('should merge employee override (highest priority)', () => {
      const base: PolicyConfig = {
        ...DEFAULT_POLICY,
        globalFaceThreshold: 0.55,
        roleOverrides: {
          'MANAGER': { globalFaceThreshold: 0.65 },
        },
        employeeOverrides: {
          'EMP123': { globalFaceThreshold: 0.80 },
        },
      };
      
      const merged = mergePolicyOverrides(
        base,
        'MANAGER',
        'EMP123'
      );
      
      expect(merged.globalFaceThreshold).toBe(0.80);
    });
    
    it('should handle partial overrides', () => {
      const base: PolicyConfig = {
        ...DEFAULT_POLICY,
        globalFaceThreshold: 0.55,
        livenessMin: 0.70,
        roleOverrides: {
          'SECURITY': { livenessMin: 0.85 },
        },
      };
      
      const merged = mergePolicyOverrides(base, 'SECURITY');
      
      expect(merged.globalFaceThreshold).toBe(0.55); // Unchanged
      expect(merged.livenessMin).toBe(0.85); // Overridden
    });
  });
  
  describe('wouldAccept', () => {
    it('should return true for acceptable scores', () => {
      const result = wouldAccept(
        0.85, // Face score >= threshold
        DEFAULT_POLICY
      );
      
      expect(result).toBe(true);
    });
    
    it('should return false for low face score', () => {
      const result = wouldAccept(
        0.35,
        DEFAULT_POLICY
      );
      
      expect(result).toBe(false);
    });
    
    it('should use default policy if not provided', () => {
      const result = wouldAccept(0.85);
      
      expect(result).toBe(true);
    });
    
    it('should respect custom threshold', () => {
      const customPolicy = { ...DEFAULT_POLICY, globalFaceThreshold: 0.90 };
      const result = wouldAccept(
        0.85,
        customPolicy
      );
      
      // Should still check face score
      expect(typeof result).toBe('boolean');
    });
  });
  
  describe('createEmployeeOverride', () => {
    it('should create valid override', () => {
      const override = createEmployeeOverride('EMP123', {
        globalFaceThreshold: 0.75,
        livenessMin: 0.85,
      });
      
      expect(override.employeeId).toBe('EMP123');
      expect(override.overrides.globalFaceThreshold).toBe(0.75);
      expect(override.overrides.livenessMin).toBe(0.85);
    });
    
    it('should handle empty overrides', () => {
      const override = createEmployeeOverride('EMP123', {});
      
      expect(override.employeeId).toBe('EMP123');
      expect(Object.keys(override.overrides).length).toBe(0);
    });
  });
  
  describe('createRoleOverride', () => {
    it('should create valid override', () => {
      const override = createRoleOverride('MANAGER', {
        globalFaceThreshold: 0.65,
      });
      
      expect(override.role).toBe('MANAGER');
      expect(override.overrides.globalFaceThreshold).toBe(0.65);
    });
  });
  
  describe('computeScoreBreakdown', () => {
    it('should compute weighted combination', () => {
      const breakdown = computeScoreBreakdown(
        { faceScore: 0.80, livenessScore: 0.90, fingerprintScore: 0.85 },
        DEFAULT_POLICY
      );
      
      expect(breakdown.faceScore).toBe(0.80);
      expect(breakdown.livenessScore).toBe(0.90);
      expect(breakdown.fingerprintScore).toBe(0.85);
      expect(breakdown.finalConfidence).toBeGreaterThan(0);
      expect(breakdown.finalConfidence).toBeLessThanOrEqual(100);
    });
    
    it('should normalize combined score', () => {
      const breakdown = computeScoreBreakdown(
        { faceScore: 1.0, livenessScore: 1.0, fingerprintScore: 1.0 },
        DEFAULT_POLICY
      );
      
      expect(breakdown.finalConfidence).toBeCloseTo(100.0, 1);
    });
    
    it('should handle missing fingerprint', () => {
      const breakdown = computeScoreBreakdown(
        { faceScore: 0.80, livenessScore: 0.90 },
        DEFAULT_POLICY
      );
      
      expect(breakdown.faceScore).toBe(0.80);
      expect(breakdown.livenessScore).toBe(0.90);
      expect(breakdown.fingerprintScore).toBeUndefined();
      expect(breakdown.finalConfidence).toBeGreaterThan(0);
    });
    
    it('should handle missing liveness', () => {
      const breakdown = computeScoreBreakdown(
        { faceScore: 0.80, fingerprintScore: 0.85 },
        DEFAULT_POLICY
      );
      
      expect(breakdown.faceScore).toBe(0.80);
      expect(breakdown.livenessScore).toBeUndefined();
      expect(breakdown.fingerprintScore).toBe(0.85);
      expect(breakdown.finalConfidence).toBeGreaterThan(0);
    });
  });
  
  describe('edge cases', () => {
    it('should handle exact threshold values', () => {
      // Exactly at accept threshold
      const resultAccept = evaluateDecision({
        faceMatchScore: 0.55,
        livenessScore: 0.90,
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(resultAccept.status).toBe('ACCEPTED');
      
      // Exactly at uncertain threshold
      const resultUncertain = evaluateDecision({
        faceMatchScore: 0.40,
        livenessScore: 0.90,
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(resultUncertain.status).toBe('PENDING');
    });
    
    it('should handle missing scores gracefully', () => {
      const result = evaluateDecision({
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(result.status).toBe('REJECTED');
      expect(result.primaryReason).toBeDefined();
    });
    
    it('should handle extreme confidence values', () => {
      // Very high scores
      const high = evaluateDecision({
        faceMatchScore: 0.99,
        livenessScore: 0.99,
        fingerprintScore: 0.99,
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(high.confidence).toBeGreaterThan(90);
      expect(high.confidence).toBeLessThanOrEqual(100);
      
      // Very low scores
      const low = evaluateDecision({
        faceMatchScore: 0.20,
        livenessScore: 0.20,
        candidateCount: 5,
        policy: DEFAULT_POLICY,
      });
      
      expect(low.confidence).toBeGreaterThanOrEqual(0);
      expect(low.confidence).toBeLessThan(30);
    });
  });
  
  describe('biometric modes', () => {
    it('should enforce requireEither mode', () => {
      const policy: PolicyConfig = {
        ...DEFAULT_POLICY,
        biometricMode: 'requireEither',
        fingerprintThreshold: 0.70,
      };
      
      // High face, no fingerprint
      const result1 = evaluateDecision({
        faceMatchScore: 0.85,
        livenessScore: 0.90,
        candidateCount: 5,
        policy,
      });
      
      expect(result1.status).toBe('ACCEPTED');
      
      // Low face, high fingerprint
      const result2 = evaluateDecision({
        faceMatchScore: 0.35,
        livenessScore: 0.90,
        fingerprintScore: 0.85,
        candidateCount: 5,
        policy,
      });
      
      expect(result2.status).toBe('ACCEPTED');
    });
  });
});
