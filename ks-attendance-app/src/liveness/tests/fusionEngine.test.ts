/**
 * Fusion Engine Tests
 * 
 * Tests for score fusion and decision matrix.
 */

import { describe, it, expect } from '@jest/globals';
import {
  fuseLivenessSignals,
  evaluateLiveness,
  tuneWeights,
  getRecommendedWeights,
  DEFAULT_FUSION_WEIGHTS,
  STRICT_FUSION_WEIGHTS,
  LENIENT_FUSION_WEIGHTS,
  type LivenessFusionInputs,
} from '../fusionEngine';

describe('Fusion Engine', () => {
  describe('fuseLivenessSignals', () => {
    it('should return high L1 for high motion + high ML', () => {
      const inputs: LivenessFusionInputs = {
        motionScores: {
          blink: { score: 0.9, blinkCount: 2, blinkEvents: [], avgEAR: 0.25, normalized: true },
          headTurn: { score: 0.85, turnCount: 2, turnEvents: [], yawRange: 40, normalized: true },
        },
        mlScores: { score: 0.9, confidence: 95, modelUsed: 'minivision_frame', isLive: true, processingTime: 100 },
        qualityScore: 0.8,
        deviceTrustScore: 0.9,
        stabilityResult: { score: 0.85, isStatic: false, variance: 500, temporalConsistency: 0.9, reasons: [] },
      };

      const decision = fuseLivenessSignals(inputs, DEFAULT_FUSION_WEIGHTS);

      expect(decision.L1).toBeGreaterThan(0.8);
      expect(decision.isLive).toBe(true);
    });

    it('should return medium L1 for high motion + low ML', () => {
      const inputs: LivenessFusionInputs = {
        motionScores: {
          blink: { score: 0.85, blinkCount: 2, blinkEvents: [], avgEAR: 0.25, normalized: true },
          headTurn: { score: 0.8, turnCount: 2, turnEvents: [], yawRange: 35, normalized: true },
        },
        mlScores: { score: 0.4, confidence: 55, modelUsed: 'minivision_frame', isLive: false, processingTime: 100 },
        qualityScore: 0.7,
        deviceTrustScore: 0.85,
        stabilityResult: { score: 0.75, isStatic: false, variance: 400, temporalConsistency: 0.8, reasons: [] },
      };

      const decision = fuseLivenessSignals(inputs, DEFAULT_FUSION_WEIGHTS);

      expect(decision.L1).toBeGreaterThan(0.55);
      expect(decision.L1).toBeLessThan(0.75);
    });

    it('should return low L1 for low motion + low ML', () => {
      const inputs: LivenessFusionInputs = {
        motionScores: {
          blink: { score: 0.2, blinkCount: 0, blinkEvents: [], avgEAR: 0.3, normalized: true },
          headTurn: { score: 0.15, turnCount: 0, turnEvents: [], yawRange: 5, normalized: true },
        },
        mlScores: { score: 0.3, confidence: 40, modelUsed: 'minivision_frame', isLive: false, processingTime: 100 },
        qualityScore: 0.5,
        deviceTrustScore: 0.7,
        stabilityResult: { score: 0.4, isStatic: true, variance: 50, temporalConsistency: 0.3, reasons: ['static_frames'] },
      };

      const decision = fuseLivenessSignals(inputs, DEFAULT_FUSION_WEIGHTS);

      expect(decision.L1).toBeLessThan(0.4);
      expect(decision.isLive).toBe(false);
      expect(decision.reasons).toContain('low_motion');
    });

    it('should normalize weights', () => {
      const inputs: LivenessFusionInputs = {
        motionScores: {
          blink: { score: 0.7, blinkCount: 2, blinkEvents: [], avgEAR: 0.24, normalized: true },
        },
        mlScores: { score: 0.7, confidence: 75, modelUsed: 'minivision_frame', isLive: true, processingTime: 100 },
      };

      // Unnormalized weights
      const weights = { motion: 2.0, ml: 1.0, quality: 0.5, device: 0.3, stability: 0.2 };

      const decision = fuseLivenessSignals(inputs, weights);

      // Check that weights in decision are normalized
      const totalWeight = Object.values(decision.weights).reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);
    });

    it('should provide reasons for low scores', () => {
      const inputs: LivenessFusionInputs = {
        motionScores: {
          blink: { score: 0.3, blinkCount: 0, blinkEvents: [], avgEAR: 0.28, normalized: true },
          headTurn: { score: 0.25, turnCount: 0, turnEvents: [], yawRange: 8, normalized: true },
        },
        mlScores: { score: 0.35, confidence: 45, modelUsed: 'minivision_frame', isLive: false, processingTime: 100 },
        qualityScore: 0.45,
        stabilityResult: { score: 0.35, isStatic: true, variance: 60, temporalConsistency: 0.4, reasons: [] },
      };

      const decision = fuseLivenessSignals(inputs, DEFAULT_FUSION_WEIGHTS);

      expect(decision.reasons).toContain('low_motion');
      expect(decision.reasons).toContain('low_ml');
      expect(decision.reasons).toContain('low_quality');
      expect(decision.reasons).toContain('possible_replay');
    });

    it('should apply threshold correctly', () => {
      const inputs: LivenessFusionInputs = {
        motionScores: {
          blink: { score: 0.7, blinkCount: 2, blinkEvents: [], avgEAR: 0.24, normalized: true },
        },
        mlScores: { score: 0.7, confidence: 75, modelUsed: 'minivision_frame', isLive: true, processingTime: 100 },
      };

      // Test with default threshold (0.7)
      const decision1 = fuseLivenessSignals(inputs, DEFAULT_FUSION_WEIGHTS, { livenessThreshold: 0.7 });
      
      // Test with strict threshold (0.85)
      const decision2 = fuseLivenessSignals(inputs, DEFAULT_FUSION_WEIGHTS, { livenessThreshold: 0.85 });

      expect(decision1.isLive).toBe(true);
      expect(decision2.isLive).toBe(false);
    });
  });

  describe('evaluateLiveness', () => {
    // TODO: These tests need actual LivenessFrame data
    // it('should use default policy', async () => {
    //   const decision = await evaluateLiveness({
    //     frames: [],
    //     sessionId: 'test_session',
    //     deviceId: 'test_device',
    //   }, 'default');
    //   expect(decision).toBeDefined();
    // });

    // it('should use strict policy', async () => {
    //   const decision = await evaluateLiveness({
    //     frames: [],
    //     sessionId: 'test_session',
    //     deviceId: 'test_device',
    //   }, 'strict');
    //   expect(decision.weights).toEqual(STRICT_FUSION_WEIGHTS);
    // });
  });

  describe('tuneWeights', () => {
    it('should optimize weights for test data', () => {
      const testResults = [
        {
          inputs: {
            motionScores: {
              blink: { score: 0.9, blinkCount: 2, blinkEvents: [], avgEAR: 0.25, normalized: true },
            },
            mlScores: { score: 0.9, confidence: 95, modelUsed: 'test', isLive: true, processingTime: 100 },
          },
          groundTruth: true,
        },
        {
          inputs: {
            motionScores: {
              blink: { score: 0.2, blinkCount: 0, blinkEvents: [], avgEAR: 0.3, normalized: true },
            },
            mlScores: { score: 0.3, confidence: 40, modelUsed: 'test', isLive: false, processingTime: 100 },
          },
          groundTruth: false,
        },
      ];

      const optimizedWeights = tuneWeights(testResults, 0.01);

      expect(optimizedWeights).toBeDefined();
      expect(optimizedWeights.motion).toBeGreaterThan(0);
      expect(optimizedWeights.ml).toBeGreaterThan(0);
    });
  });

  describe('getRecommendedWeights', () => {
    it('should recommend lenient weights for poor lighting', () => {
      const weights = getRecommendedWeights({ lighting: 'poor' });

      expect(weights.motion).toBeGreaterThan(LENIENT_FUSION_WEIGHTS.motion - 0.1);
      expect(weights.ml).toBeLessThan(DEFAULT_FUSION_WEIGHTS.ml);
    });

    it('should recommend strict weights for high security', () => {
      const weights = getRecommendedWeights({ securityLevel: 'high' });

      expect(weights.ml).toBeGreaterThan(DEFAULT_FUSION_WEIGHTS.ml);
    });

    it('should recommend default weights for good conditions', () => {
      const weights = getRecommendedWeights({ lighting: 'good', deviceQuality: 'high' });

      expect(weights.motion).toBeCloseTo(DEFAULT_FUSION_WEIGHTS.motion, 1);
    });
  });
});
