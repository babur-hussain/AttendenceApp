/**
 * Liveness Fusion Engine
 * 
 * Combines multiple liveness signals into a final score (L1).
 * Supports configurable weighting and provides detailed breakdown.
 */

import type { BlinkDetectionResult, HeadTurnResult, MouthMovementResult, StabilityResult } from './motionDetector';
import type { MLLivenessResult } from './onnxLiveness';

/**
 * Liveness fusion inputs
 */
export interface LivenessFusionInputs {
  motionScores?: {
    blink?: BlinkDetectionResult;
    headTurn?: HeadTurnResult;
    mouthMovement?: MouthMovementResult;
  };
  mlScores?: MLLivenessResult;
  qualityScore?: number;      // Frame quality (0-1)
  deviceTrustScore?: number;  // Device integrity score (0-1)
  stabilityResult?: StabilityResult;
}

/**
 * Fusion weights configuration
 */
export interface FusionWeights {
  motion: number;      // Weight for motion-based signals
  ml: number;          // Weight for ML model
  quality: number;     // Weight for frame quality
  device: number;      // Weight for device trust
  stability: number;   // Weight for frame stability
}

/**
 * Liveness decision result
 */
export interface LivenessDecision {
  L1: number;                  // Final liveness score (0-1)
  isLive: boolean;             // Binary verdict
  confidence: number;          // Decision confidence (0-100)
  components: {
    motion: number;            // Aggregated motion score
    ml: number;                // ML score
    quality: number;           // Quality score
    device: number;            // Device trust score
    stability: number;         // Stability score
  };
  weights: FusionWeights;      // Weights used
  evidenceTokens: string[];    // LVID references to evidence
  reasons: string[];           // Reasons if low score
  timestamp: string;           // Decision timestamp
  processingTime: number;      // Total processing time in ms
}

/**
 * Default fusion weights
 */
export const DEFAULT_FUSION_WEIGHTS: FusionWeights = {
  motion: 0.6,
  ml: 0.3,
  quality: 0.05,
  device: 0.03,
  stability: 0.02,
};

/**
 * Strict fusion weights (higher ML weight)
 */
export const STRICT_FUSION_WEIGHTS: FusionWeights = {
  motion: 0.4,
  ml: 0.5,
  quality: 0.05,
  device: 0.03,
  stability: 0.02,
};

/**
 * Lenient fusion weights (lower ML requirement for poor lighting)
 */
export const LENIENT_FUSION_WEIGHTS: FusionWeights = {
  motion: 0.7,
  ml: 0.15,
  quality: 0.1,
  device: 0.03,
  stability: 0.02,
};

/**
 * Compute aggregated motion score
 * 
 * Combines blink, head turn, and mouth movement scores.
 * 
 * @param motionScores Motion detection results
 * @returns Aggregated motion score (0-1)
 */
function computeMotionScore(
  motionScores?: {
    blink?: BlinkDetectionResult;
    headTurn?: HeadTurnResult;
    mouthMovement?: MouthMovementResult;
  }
): number {
  if (!motionScores) {
    return 0.5; // Neutral if no motion data
  }

  const scores: number[] = [];
  
  if (motionScores.blink) {
    scores.push(motionScores.blink.score * 1.0); // Blink is important
  }

  if (motionScores.headTurn) {
    scores.push(motionScores.headTurn.score * 0.9); // Head turn is important
  }

  if (motionScores.mouthMovement) {
    scores.push(motionScores.mouthMovement.score * 0.5); // Mouth is optional
  }

  if (scores.length === 0) {
    return 0.5;
  }

  // Weighted average
  const totalWeight = (motionScores.blink ? 1.0 : 0) + 
                      (motionScores.headTurn ? 0.9 : 0) + 
                      (motionScores.mouthMovement ? 0.5 : 0);

  const weightedSum = scores.reduce((sum, score, idx) => {
    const weight = idx === 0 ? 1.0 : (idx === 1 ? 0.9 : 0.5);
    return sum + score * weight;
  }, 0);

  return weightedSum / totalWeight;
}

/**
 * Fuse liveness signals into final L1 score
 * 
 * @param inputs Liveness fusion inputs
 * @param weights Fusion weights
 * @param options Fusion options
 * @returns Liveness decision
 */
export function fuseLivenessSignals(
  inputs: LivenessFusionInputs,
  weights: FusionWeights = DEFAULT_FUSION_WEIGHTS,
  options: {
    livenessThreshold?: number;  // Threshold for binary verdict (default: 0.7)
    evidenceTokens?: string[];   // Pre-generated evidence tokens
  } = {}
): LivenessDecision {
  const startTime = Date.now();
  const { livenessThreshold = 0.7, evidenceTokens = [] } = options;

  // Normalize weights (ensure they sum to 1.0)
  const totalWeight = weights.motion + weights.ml + weights.quality + weights.device + weights.stability;
  const normalizedWeights: FusionWeights = {
    motion: weights.motion / totalWeight,
    ml: weights.ml / totalWeight,
    quality: weights.quality / totalWeight,
    device: weights.device / totalWeight,
    stability: weights.stability / totalWeight,
  };

  // Compute component scores
  const motionScore = computeMotionScore(inputs.motionScores);
  const mlScore = inputs.mlScores?.score ?? 0.5;
  const qualityScore = inputs.qualityScore ?? 0.8; // Default good quality
  const deviceScore = inputs.deviceTrustScore ?? 0.9; // Default trusted device
  const stabilityScore = inputs.stabilityResult?.score ?? 0.8; // Default stable

  // Compute weighted L1 score
  const L1 = 
    motionScore * normalizedWeights.motion +
    mlScore * normalizedWeights.ml +
    qualityScore * normalizedWeights.quality +
    deviceScore * normalizedWeights.device +
    stabilityScore * normalizedWeights.stability;

  // Binary verdict
  const isLive = L1 >= livenessThreshold;

  // Compute confidence (distance from threshold)
  const distanceFromThreshold = Math.abs(L1 - livenessThreshold);
  const confidence = Math.round(Math.min(100, distanceFromThreshold * 200));

  // Identify reasons for low score
  const reasons: string[] = [];

  if (!isLive) {
    if (motionScore < 0.5) {
      reasons.push('low_motion');
      
      if (inputs.motionScores?.blink && inputs.motionScores.blink.score < 0.4) {
        reasons.push('insufficient_blinks');
      }
      
      if (inputs.motionScores?.headTurn && inputs.motionScores.headTurn.score < 0.4) {
        reasons.push('insufficient_head_turns');
      }
    }

    if (mlScore < 0.5) {
      reasons.push('low_ml');
    }

    if (qualityScore < 0.6) {
      reasons.push('low_quality');
    }

    if (stabilityScore < 0.5) {
      reasons.push('possible_replay');
    }

    if (deviceScore < 0.7) {
      reasons.push('device_trust_low');
    }

    if (reasons.length === 0) {
      reasons.push('overall_score_low');
    }
  }

  const processingTime = Date.now() - startTime;

  return {
    L1: Math.max(0, Math.min(1, L1)),
    isLive,
    confidence,
    components: {
      motion: motionScore,
      ml: mlScore,
      quality: qualityScore,
      device: deviceScore,
      stability: stabilityScore,
    },
    weights: normalizedWeights,
    evidenceTokens,
    reasons,
    timestamp: new Date().toISOString(),
    processingTime,
  };
}

/**
 * Evaluate liveness decision with policy
 * 
 * Applies policy-specific weights and thresholds.
 * 
 * @param inputs Liveness fusion inputs
 * @param policy Policy name or custom weights
 * @param options Additional options
 * @returns Liveness decision
 */
export function evaluateLiveness(
  inputs: LivenessFusionInputs,
  policy: 'default' | 'strict' | 'lenient' | FusionWeights = 'default',
  options?: {
    livenessThreshold?: number;
    evidenceTokens?: string[];
  }
): LivenessDecision {
  let weights: FusionWeights;

  if (typeof policy === 'string') {
    switch (policy) {
      case 'strict':
        weights = STRICT_FUSION_WEIGHTS;
        break;
      case 'lenient':
        weights = LENIENT_FUSION_WEIGHTS;
        break;
      case 'default':
      default:
        weights = DEFAULT_FUSION_WEIGHTS;
        break;
    }
  } else {
    weights = policy;
  }

  return fuseLivenessSignals(inputs, weights, options);
}

/**
 * Tune fusion weights based on false positive/negative rates
 * 
 * Helper for threshold optimization using ROC analysis.
 * 
 * @param testResults Array of test results with ground truth
 * @param targetFPR Target false positive rate
 * @returns Optimized weights
 */
export function tuneWeights(
  testResults: Array<{
    inputs: LivenessFusionInputs;
    groundTruth: boolean; // True if actually live
  }>,
  targetFPR: number = 0.01
): FusionWeights {
  console.log('[FusionEngine] Tuning weights with', testResults.length, 'samples');

  // Start with default weights
  let bestWeights = { ...DEFAULT_FUSION_WEIGHTS };
  let bestScore = 0;

  // Grid search over weight combinations
  const motionWeights = [0.4, 0.5, 0.6, 0.7];
  const mlWeights = [0.15, 0.25, 0.35, 0.45];

  for (const wMotion of motionWeights) {
    for (const wML of mlWeights) {
      // Distribute remaining weight
      const remaining = 1.0 - wMotion - wML;
      const weights: FusionWeights = {
        motion: wMotion,
        ml: wML,
        quality: remaining * 0.5,
        device: remaining * 0.3,
        stability: remaining * 0.2,
      };

      // Compute performance metrics
      let truePositives = 0;
      let falsePositives = 0;
      let trueNegatives = 0;
      let falseNegatives = 0;

      for (const test of testResults) {
        const decision = fuseLivenessSignals(test.inputs, weights);

        if (decision.isLive && test.groundTruth) {
          truePositives++;
        } else if (decision.isLive && !test.groundTruth) {
          falsePositives++;
        } else if (!decision.isLive && !test.groundTruth) {
          trueNegatives++;
        } else {
          falseNegatives++;
        }
      }

      const fpr = falsePositives / (falsePositives + trueNegatives);
      const tpr = truePositives / (truePositives + falseNegatives);

      // Score: maximize TPR while keeping FPR below target
      const score = fpr <= targetFPR ? tpr : 0;

      if (score > bestScore) {
        bestScore = score;
        bestWeights = { ...weights };
      }
    }
  }

  console.log('[FusionEngine] Best weights:', bestWeights, 'Score:', bestScore);

  return bestWeights;
}

/**
 * Get recommended weights for environment
 * 
 * @param environment Environment characteristics
 * @returns Recommended fusion weights
 */
export function getRecommendedWeights(environment: {
  lighting?: 'good' | 'poor' | 'variable';
  deviceQuality?: 'high' | 'medium' | 'low';
  securityLevel?: 'standard' | 'high' | 'critical';
}): FusionWeights {
  const { lighting = 'good', deviceQuality = 'medium', securityLevel = 'standard' } = environment;

  // Start with default
  let weights = { ...DEFAULT_FUSION_WEIGHTS };

  // Adjust for poor lighting (rely more on motion)
  if (lighting === 'poor') {
    weights.motion = 0.7;
    weights.ml = 0.15;
    weights.quality = 0.1;
  }

  // Adjust for high security (rely more on ML)
  if (securityLevel === 'high' || securityLevel === 'critical') {
    weights.motion = 0.4;
    weights.ml = 0.5;
    weights.device = 0.05;
  }

  // Adjust for low device quality (boost stability check)
  if (deviceQuality === 'low') {
    weights.stability = 0.05;
    weights.device = 0.05;
    weights.motion = 0.55;
    weights.ml = 0.3;
  }

  // Normalize
  const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
  Object.keys(weights).forEach(key => {
    weights[key as keyof FusionWeights] /= total;
  });

  return weights;
}

/**
 * Format liveness decision for TOON transmission
 * 
 * @param decision Liveness decision
 * @returns TOON token object
 */
export function formatLivenessForToon(decision: LivenessDecision): Record<string, any> {
  return {
    L1: decision.L1.toFixed(4),
    LIVE: decision.isLive ? '1' : '0',
    CONF1: decision.confidence.toString(),
    
    // Component scores
    L_MOT: decision.components.motion.toFixed(3),
    L_ML: decision.components.ml.toFixed(3),
    L_QUAL: decision.components.quality.toFixed(3),
    L_DEV: decision.components.device.toFixed(3),
    L_STAB: decision.components.stability.toFixed(3),
    
    // Evidence tokens (if any)
    ...(decision.evidenceTokens.length > 0 && {
      LVID: decision.evidenceTokens.join(','),
      LVID_COUNT: decision.evidenceTokens.length.toString(),
    }),
    
    // Reasons (if not live)
    ...(decision.reasons.length > 0 && {
      L_REASON: decision.reasons.join('|'),
    }),
    
    // Timestamp
    L_TS: decision.timestamp,
  };
}
