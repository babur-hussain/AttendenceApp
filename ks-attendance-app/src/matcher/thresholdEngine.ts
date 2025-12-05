/**
 * Threshold Engine Module
 * 
 * Policy-driven decision engine for biometric authentication.
 * Evaluates face match scores, liveness, fingerprint, and policy rules
 * to produce deterministic ACCEPT/PENDING/REJECTED decisions.
 * 
 * DESIGN PRINCIPLES:
 * - Deterministic: same inputs always produce same output
 * - Auditable: usedRules array shows which rules fired
 * - Configurable: per-employee, per-role, and global overrides
 * - Extensible: easy to add new decision factors
 * 
 * THRESHOLD GUIDELINES (starting points, tune with ROC analysis):
 * - Face: 0.55 (accept), 0.40 (uncertain/pending)
 * - Liveness: 0.70 minimum
 * - Fingerprint: 0.70 minimum
 * - Combined confidence: weight face + liveness + fingerprint
 */

export type DecisionStatus = 'ACCEPTED' | 'PENDING' | 'REJECTED';
export type BiometricMode = 'requireBoth' | 'requireEither' | 'allowFallbackPin';

/**
 * Rejection reason codes (map to R1 TOON tokens)
 */
export type RejectionReason =
  | 'low_face_score'
  | 'low_liveness'
  | 'low_fingerprint'
  | 'no_candidate'
  | 'spoof_detected'
  | 'policy_violation'
  | 'uncertain_match'
  | 'quality_too_low'
  | 'multiple_candidates'
  | 'biometric_mismatch';

/**
 * Recommended action for pending/rejected decisions
 */
export type RecommendedAction =
  | 'none'
  | 'ask_fingerprint'
  | 'ask_pin'
  | 'require_manual_review'
  | 'retry_capture'
  | 'improve_lighting';

/**
 * Policy configuration for threshold-based decisions
 */
export interface PolicyConfig {
  // Face matching thresholds
  globalFaceThreshold: number;      // Accept if >= this (e.g., 0.55)
  uncertainThreshold: number;       // Pending if between uncertain and global (e.g., 0.40)
  
  // Liveness thresholds
  livenessMin: number;              // Minimum liveness score (e.g., 0.70)
  livenessWeight: number;           // Weight in final confidence (0-1)
  
  // Fingerprint thresholds
  fingerprintThreshold: number;     // Minimum fingerprint score (e.g., 0.70)
  fingerprintWeight: number;        // Weight in final confidence (0-1)
  
  // Biometric combination mode
  biometricMode: BiometricMode;     // How to combine face + fingerprint
  
  // Advanced options
  requireLiveness: boolean;         // Reject if liveness not provided
  allowUncertainWithPin: boolean;   // Allow PIN for uncertain face matches
  maxCandidates: number;            // Reject if > N candidates match (ambiguity)
  
  // Per-role overrides (applied before per-employee)
  roleOverrides?: Record<string, Partial<PolicyConfig>>;
  
  // Per-employee overrides (highest priority)
  employeeOverrides?: Record<string, Partial<PolicyConfig>>;
}

/**
 * Default policy configuration (conservative settings)
 */
export const DEFAULT_POLICY: PolicyConfig = {
  globalFaceThreshold: 0.55,
  uncertainThreshold: 0.40,
  livenessMin: 0.70,
  livenessWeight: 0.3,
  fingerprintThreshold: 0.70,
  fingerprintWeight: 0.2,
  biometricMode: 'requireEither',
  requireLiveness: true,
  allowUncertainWithPin: true,
  maxCandidates: 3,
};

/**
 * Rule that was evaluated in decision process
 */
export interface EvaluatedRule {
  ruleName: string;
  condition: string;
  result: boolean;
  impact: 'accept' | 'reject' | 'pending' | 'neutral';
}

/**
 * Score breakdown for transparency
 */
export interface ScoreBreakdown {
  faceScore?: number;
  livenessScore?: number;
  fingerprintScore?: number;
  finalConfidence: number;  // 0-100 weighted composite
  weights: {
    face: number;
    liveness: number;
    fingerprint: number;
  };
}

/**
 * Decision result from threshold evaluation
 */
export interface DecisionResult {
  status: DecisionStatus;
  primaryReason: RejectionReason | null;
  message: string;                   // Human-friendly explanation
  usedRules: EvaluatedRule[];        // Audit trail of rules evaluated
  recommendedAction: RecommendedAction;
  scoreBreakdown: ScoreBreakdown;
  confidence: number;                 // 0-100 overall confidence
  policyApplied: Partial<PolicyConfig>; // Which policy was used
}

/**
 * Input parameters for decision evaluation
 */
export interface DecisionParams {
  faceScore?: number;           // 0-1 cosine similarity
  faceMatchScore?: number;      // Alias for faceScore
  livenessScore?: number;       // 0-1 liveness confidence
  fingerprintScore?: number;    // 0-1 fingerprint match score
  employeeId?: string;          // For per-employee overrides
  role?: string;                // For per-role overrides
  candidateCount?: number;      // Number of matching candidates
  policyConfig?: PolicyConfig;  // Custom policy (overrides default)
  policy?: PolicyConfig;        // Alias for policyConfig
}

/**
 * Merge policy overrides in priority order:
 * base → role override → employee override
 */
export function mergePolicyOverrides(
  basePolicy: PolicyConfig,
  role?: string,
  employeeId?: string
): PolicyConfig {
  let policy = { ...basePolicy };
  
  // Apply role override
  if (role && basePolicy.roleOverrides?.[role]) {
    policy = { ...policy, ...basePolicy.roleOverrides[role] };
  }
  
  // Apply employee override (highest priority)
  if (employeeId && basePolicy.employeeOverrides?.[employeeId]) {
    policy = { ...policy, ...basePolicy.employeeOverrides[employeeId] };
  }
  
  return policy;
}

/**
 * Evaluate biometric decision based on scores and policy
 * 
 * DECISION LOGIC:
 * 1. Check liveness (if required)
 * 2. Check face score against thresholds
 * 3. Check fingerprint (if available, based on biometric mode)
 * 4. Compute final confidence
 * 5. Apply policy rules (candidate count, quality, etc.)
 * 6. Return decision with audit trail
 * 
 * @param params Decision parameters
 * @returns DecisionResult with status and reasoning
 */
export function evaluateDecision(params: DecisionParams): DecisionResult {
  const {
    faceScore: faceScoreParam,
    faceMatchScore,
    livenessScore,
    fingerprintScore,
    employeeId,
    role,
    candidateCount = 1,
    policy: policyParam,
    policyConfig,
  } = params;
  
  // Use policy or policyConfig (backward compat)
  const basePolicyConfig = policyParam || policyConfig || DEFAULT_POLICY;
  
  // Merge policy overrides
  const policy = mergePolicyOverrides(basePolicyConfig, role, employeeId);
  
  // Use faceMatchScore or faceScore (backward compat)
  const faceScore = faceMatchScore ?? faceScoreParam;
  
  const usedRules: EvaluatedRule[] = [];
  let status: DecisionStatus = 'PENDING';
  let primaryReason: RejectionReason | null = null;
  let message = '';
  let recommendedAction: RecommendedAction = 'none';
  
  // === RULE 1: Liveness Check ===
  if (policy.requireLiveness && livenessScore === undefined) {
    usedRules.push({
      ruleName: 'liveness_required',
      condition: 'policy.requireLiveness && !livenessScore',
      result: true,
      impact: 'reject',
    });
    
    return {
      status: 'REJECTED',
      primaryReason: 'low_liveness',
      message: 'Liveness verification required but not provided',
      usedRules,
      recommendedAction: 'retry_capture',
      scoreBreakdown: computeScoreBreakdown(params, policy),
      confidence: 0,
      policyApplied: policy,
    };
  }
  
  if (livenessScore !== undefined && livenessScore < policy.livenessMin) {
    usedRules.push({
      ruleName: 'liveness_below_threshold',
      condition: `livenessScore (${livenessScore.toFixed(2)}) < livenessMin (${policy.livenessMin})`,
      result: true,
      impact: 'reject',
    });
    
    return {
      status: 'REJECTED',
      primaryReason: 'low_liveness',
      message: `Liveness score ${livenessScore.toFixed(2)} below minimum ${policy.livenessMin}`,
      usedRules,
      recommendedAction: 'retry_capture',
      scoreBreakdown: computeScoreBreakdown(params, policy),
      confidence: Math.round(livenessScore * 100),
      policyApplied: policy,
    };
  }
  
  // === RULE 2: Face Score Check ===
  if (faceScore === undefined) {
    usedRules.push({
      ruleName: 'no_face_score',
      condition: 'faceScore === undefined',
      result: true,
      impact: 'reject',
    });
    
    return {
      status: 'REJECTED',
      primaryReason: 'no_candidate',
      message: 'No face match score available',
      usedRules,
      recommendedAction: 'retry_capture',
      scoreBreakdown: computeScoreBreakdown(params, policy),
      confidence: 0,
      policyApplied: policy,
    };
  }
  
  // Check face score against thresholds
  if (faceScore >= policy.globalFaceThreshold) {
    usedRules.push({
      ruleName: 'face_above_threshold',
      condition: `faceScore (${faceScore.toFixed(2)}) >= globalFaceThreshold (${policy.globalFaceThreshold})`,
      result: true,
      impact: 'accept',
    });
    
    status = 'ACCEPTED';
    message = `Face match score ${faceScore.toFixed(2)} exceeds threshold`;
  } else if (faceScore >= policy.uncertainThreshold) {
    usedRules.push({
      ruleName: 'face_in_uncertain_range',
      condition: `faceScore (${faceScore.toFixed(2)}) in [${policy.uncertainThreshold}, ${policy.globalFaceThreshold})`,
      result: true,
      impact: 'pending',
    });
    
    status = 'PENDING';
    primaryReason = 'uncertain_match';
    message = `Face match score ${faceScore.toFixed(2)} in uncertain range`;
    recommendedAction = policy.allowUncertainWithPin ? 'ask_pin' : 'require_manual_review';
  } else {
    usedRules.push({
      ruleName: 'face_below_threshold',
      condition: `faceScore (${faceScore.toFixed(2)}) < uncertainThreshold (${policy.uncertainThreshold})`,
      result: true,
      impact: 'reject',
    });
    
    status = 'REJECTED';
    primaryReason = 'low_face_score';
    message = `Face match score ${faceScore.toFixed(2)} too low`;
    recommendedAction = 'retry_capture';
  }
  
  // === RULE 3: Biometric Mode Logic ===
  if (policy.biometricMode === 'requireBoth') {
    // Require both face AND fingerprint
    if (fingerprintScore === undefined) {
      usedRules.push({
        ruleName: 'fingerprint_required',
        condition: 'biometricMode=requireBoth && !fingerprintScore',
        result: true,
        impact: 'reject',
      });
      
      status = 'PENDING';
      primaryReason = 'biometric_mismatch';
      message = 'Fingerprint required but not provided';
      recommendedAction = 'ask_fingerprint';
    } else if (fingerprintScore < policy.fingerprintThreshold) {
      usedRules.push({
        ruleName: 'fingerprint_below_threshold',
        condition: `fingerprintScore (${fingerprintScore.toFixed(2)}) < threshold (${policy.fingerprintThreshold})`,
        result: true,
        impact: 'reject',
      });
      
      status = 'REJECTED';
      primaryReason = 'low_fingerprint';
      message = `Fingerprint score ${fingerprintScore.toFixed(2)} below threshold`;
      recommendedAction = 'retry_capture';
    } else {
      usedRules.push({
        ruleName: 'fingerprint_accepted',
        condition: `fingerprintScore (${fingerprintScore.toFixed(2)}) >= threshold`,
        result: true,
        impact: 'accept',
      });
    }
  } else if (policy.biometricMode === 'requireEither') {
    // Accept if EITHER face OR fingerprint passes
    if (status !== 'ACCEPTED' && fingerprintScore !== undefined) {
      if (fingerprintScore >= policy.fingerprintThreshold) {
        usedRules.push({
          ruleName: 'fingerprint_fallback_accepted',
          condition: `fingerprintScore (${fingerprintScore.toFixed(2)}) >= threshold (fallback)`,
          result: true,
          impact: 'accept',
        });
        
        status = 'ACCEPTED';
        message = 'Accepted via fingerprint fallback';
      }
    }
  }
  // biometricMode='allowFallbackPin' handled by recommendedAction
  
  // === RULE 4: Candidate Count Check ===
  if (candidateCount > policy.maxCandidates) {
    usedRules.push({
      ruleName: 'too_many_candidates',
      condition: `candidateCount (${candidateCount}) > maxCandidates (${policy.maxCandidates})`,
      result: true,
      impact: 'reject',
    });
    
    status = 'REJECTED';
    primaryReason = 'multiple_candidates';
    message = `Too many matching candidates (${candidateCount}), ambiguous match`;
    recommendedAction = 'require_manual_review';
  }
  
  // === Compute Final Confidence ===
  const scoreBreakdown = computeScoreBreakdown(params, policy);
  const confidence = Math.round(scoreBreakdown.finalConfidence);
  
  return {
    status,
    primaryReason,
    message,
    usedRules,
    recommendedAction,
    scoreBreakdown,
    confidence,
    policyApplied: policy,
  };
}

/**
 * Compute weighted score breakdown
 * 
 * Final confidence = weighted sum of available biometric scores.
 * Weights are normalized so available scores sum to 1.0.
 */
export function computeScoreBreakdown(
  params: DecisionParams,
  policy: PolicyConfig
): ScoreBreakdown {
  const { faceScore, livenessScore, fingerprintScore } = params;
  
  // Base weights from policy
  let faceWeight = 1.0 - policy.livenessWeight - policy.fingerprintWeight;
  let livenessWeight = policy.livenessWeight;
  let fingerprintWeight = policy.fingerprintWeight;
  
  // Normalize weights based on available scores
  const availableWeights: number[] = [];
  const availableScores: number[] = [];
  
  if (faceScore !== undefined) {
    availableWeights.push(faceWeight);
    availableScores.push(faceScore);
  }
  
  if (livenessScore !== undefined) {
    availableWeights.push(livenessWeight);
    availableScores.push(livenessScore);
  }
  
  if (fingerprintScore !== undefined) {
    availableWeights.push(fingerprintWeight);
    availableScores.push(fingerprintScore);
  }
  
  // Normalize weights to sum to 1.0
  const totalWeight = availableWeights.reduce((sum, w) => sum + w, 0);
  if (totalWeight > 0) {
    for (let i = 0; i < availableWeights.length; i++) {
      availableWeights[i] /= totalWeight;
    }
  }
  
  // Compute weighted confidence (0-100 scale)
  let finalConfidence = 0;
  for (let i = 0; i < availableScores.length; i++) {
    finalConfidence += availableScores[i] * availableWeights[i];
  }
  finalConfidence *= 100; // Convert to 0-100
  
  return {
    faceScore,
    livenessScore,
    fingerprintScore,
    finalConfidence,
    weights: {
      face: faceWeight,
      liveness: livenessWeight,
      fingerprint: fingerprintWeight,
    },
  };
}

/**
 * Quick decision check: will these scores be accepted?
 * 
 * Useful for pre-filtering candidates before full evaluation.
 * 
 * @param faceScore Face match score
 * @param policy Policy config
 * @returns true if likely to be accepted
 */
export function wouldAccept(faceScore: number, policy: PolicyConfig = DEFAULT_POLICY): boolean {
  return faceScore >= policy.globalFaceThreshold;
}

/**
 * Create a per-employee policy override
 * 
 * Example:
 * ```typescript
 * const highSecurityPolicy = createEmployeeOverride('EMP123', {
 *   globalFaceThreshold: 0.70,  // Stricter
 *   biometricMode: 'requireBoth',
 * });
 * ```
 */
export function createEmployeeOverride(
  employeeId: string,
  overrides: Partial<PolicyConfig>
): { employeeId: string; overrides: Partial<PolicyConfig> } {
  return { employeeId, overrides };
}

/**
 * Create a per-role policy override
 * 
 * Example:
 * ```typescript
 * const managerPolicy = createRoleOverride('MANAGER', {
 *   globalFaceThreshold: 0.60,
 *   requireLiveness: true,
 * });
 * ```
 */
export function createRoleOverride(
  role: string,
  overrides: Partial<PolicyConfig>
): { role: string; overrides: Partial<PolicyConfig> } {
  return { role, overrides };
}
