/**
 * Liveness Adapter Module
 * 
 * Provides interface for liveness detection results and score fusion.
 * Supports multiple liveness methods (motion-based, ML-based, hybrid).
 * 
 * LIVENESS DETECTION METHODS:
 * 
 * 1. Motion-based (simple, on-device):
 *    - Challenge-response: "turn head left", "blink", etc.
 *    - Optical flow analysis
 *    - Pros: Fast, works offline, no ML required
 *    - Cons: Less robust against sophisticated attacks
 * 
 * 2. ML-based (advanced, requires ONNX):
 *    - CNN-based liveness classifier (real vs printed/video)
 *    - Texture analysis, reflectance, depth cues
 *    - Pros: More robust against spoofs
 *    - Cons: Requires ML model, slower
 * 
 * 3. Hybrid (recommended):
 *    - Combines motion + ML scores
 *    - Configurable weighting
 *    - Best balance of speed and security
 * 
 * INTEGRATION POINTS:
 * - Plug native liveness SDK (FaceTec, iProov, etc.)
 * - Plug ONNX-based liveness classifier
 * - Plug remote liveness API via ToonClient
 */

export type LivenessMethod = 'motion' | 'ml' | 'hybrid' | 'remote';

/**
 * Liveness detection result
 */
export interface LivenessResult {
  score: number;           // 0-1 confidence (1 = real person)
  method: LivenessMethod;  // Detection method used
  details?: {
    motionScore?: number;     // If hybrid, individual motion score
    mlScore?: number;         // If hybrid, individual ML score
    challengesPassed?: number; // Number of challenges passed
    challengesTotal?: number;  // Total challenges attempted
    spoofProbability?: number; // 0-1 probability of spoof (inverse of score)
    detectionTime?: number;    // Milliseconds taken
    deviceInfo?: string;       // Device/SDK version for debugging
  };
  timestamp: number;      // When liveness was checked
}

/**
 * Liveness configuration
 */
export interface LivenessConfig {
  method: LivenessMethod;
  motionWeight: number;        // Weight for motion score in hybrid (0-1)
  mlWeight: number;            // Weight for ML score in hybrid (0-1)
  minScore: number;            // Minimum acceptable score
  timeoutMs: number;           // Max time for liveness check
  enableRemoteFallback: boolean; // Use remote API if local fails
}

/**
 * Default liveness configuration
 */
export const DEFAULT_LIVENESS_CONFIG: LivenessConfig = {
  method: 'hybrid',
  motionWeight: 0.4,
  mlWeight: 0.6,
  minScore: 0.70,
  timeoutMs: 5000,
  enableRemoteFallback: false,
};

/**
 * Combine motion and ML liveness scores using weighted average
 * 
 * Used in hybrid mode to fuse multiple liveness signals.
 * 
 * @param motionScore Motion-based liveness score (0-1)
 * @param mlScore ML-based liveness score (0-1, optional)
 * @param config Liveness configuration (default uses global config)
 * @returns Combined liveness score (0-1)
 */
export function combineLivenessScores(
  motionScore: number,
  mlScore?: number,
  config: LivenessConfig = DEFAULT_LIVENESS_CONFIG
): number {
  // If only motion score available
  if (mlScore === undefined) {
    return motionScore;
  }
  
  // Weighted combination
  const { motionWeight, mlWeight } = config;
  const totalWeight = motionWeight + mlWeight;
  
  // Normalize weights to sum to 1.0
  const normalizedMotionWeight = motionWeight / totalWeight;
  const normalizedMlWeight = mlWeight / totalWeight;
  
  return motionScore * normalizedMotionWeight + mlScore * normalizedMlWeight;
}

/**
 * Compute liveness score from challenge-response motion test
 * 
 * Simple motion-based liveness using head movement or blink detection.
 * 
 * @param challengesPassed Number of challenges successfully completed
 * @param challengesTotal Total number of challenges attempted
 * @returns Motion liveness score (0-1)
 */
export function computeMotionLivenessScore(
  challengesPassed: number,
  challengesTotal: number
): number {
  if (challengesTotal === 0) {
    return 0;
  }
  
  const passRate = challengesPassed / challengesTotal;
  
  // Apply non-linear curve to emphasize high pass rates
  // e.g., 3/3 = 1.0, 2/3 = 0.67, 1/3 = 0.22
  return Math.pow(passRate, 1.5);
}

/**
 * TODO: ONNX INTEGRATION POINT
 * 
 * Call ONNX runtime to compute ML-based liveness score.
 * 
 * INTEGRATION STEPS:
 * 1. Load ONNX liveness model (e.g., MobileFaceNet-Liveness, Silent-Face-Anti-Spoofing)
 * 2. Preprocess face crop to model input shape (e.g., 3x224x224)
 * 3. Run inference: onnxRuntime.compute(livenessModel, preprocessedTensor)
 * 4. Extract liveness score from output (typically single float or [real_prob, spoof_prob])
 * 
 * EXAMPLE MODEL:
 * - Input: RGB face crop, 224x224, normalized to [-1, 1]
 * - Output: [real_prob, spoof_prob] where real_prob is liveness score
 * 
 * @param faceCrop Face image tensor (placeholder)
 * @returns ML liveness score (0-1)
 */
export async function computeMLLivenessScore(
  faceCrop: any // TODO: Replace with actual tensor type from ONNX
): Promise<number> {
  // TODO: Replace with actual ONNX runtime call
  // const livenessModel = await loadONNXModel('liveness_model.onnx');
  // const preprocessed = preprocessFaceForLiveness(faceCrop);
  // const output = await onnxRuntime.compute(livenessModel, preprocessed);
  // const [realProb, spoofProb] = output.data(); // or output[0]
  // return realProb;
  
  console.warn('[livenessAdapter] ML liveness not implemented, using placeholder');
  
  // Placeholder: return high score for testing
  return 0.85;
}

/**
 * TODO: REMOTE LIVENESS API INTEGRATION
 * 
 * Call remote liveness verification service via ToonClient.
 * 
 * INTEGRATION STEPS:
 * 1. Capture face frame + motion video
 * 2. Encode to TOON tokens (F2 for frame, V1 for video metadata)
 * 3. POST to /api/v1/liveness via ToonClient.toonPost()
 * 4. Parse TOON response (L1 = liveness score, L2 = method)
 * 
 * EXAMPLE TOON REQUEST:
 * ```
 * F2_DATA=<base64-face-frame>
 * V1_DURATION=2.5
 * V1_FRAMES=75
 * ```
 * 
 * EXAMPLE TOON RESPONSE:
 * ```
 * L1=0.92
 * L2=hybrid
 * L3=motion:0.88|ml:0.95
 * ```
 * 
 * @param faceFrame Face frame for liveness check
 * @param motionVideoUri Optional motion video URI
 * @returns Remote liveness result
 */
export async function checkRemoteLiveness(
  faceFrame: any, // TODO: Define frame type
  motionVideoUri?: string
): Promise<LivenessResult> {
  // TODO: Implement ToonClient integration
  // const toonClient = getToonClient();
  // 
  // const tokens = {
  //   F2_DATA: encodeFrame(faceFrame),
  //   V1_URI: motionVideoUri,
  //   V1_DURATION: getVideoDuration(motionVideoUri),
  // };
  // 
  // const response = await toonClient.toonPost('/api/v1/liveness', tokens);
  // 
  // return {
  //   score: parseFloat(response.L1),
  //   method: response.L2 as LivenessMethod,
  //   details: parseL3Details(response.L3),
  //   timestamp: Date.now(),
  // };
  
  console.warn('[livenessAdapter] Remote liveness not implemented, using placeholder');
  
  return {
    score: 0.90,
    method: 'remote',
    details: {
      motionScore: 0.88,
      mlScore: 0.95,
      spoofProbability: 0.10,
    },
    timestamp: Date.now(),
  };
}

/**
 * Perform hybrid liveness check (motion + ML)
 * 
 * Orchestrates both motion and ML-based checks and combines scores.
 * 
 * @param motionChallengeResult Result from motion challenge
 * @param faceCrop Face crop for ML check
 * @param config Liveness configuration
 * @returns Hybrid liveness result
 */
export async function performHybridLiveness(
  motionChallengeResult: { passed: number; total: number },
  faceCrop: any,
  config: LivenessConfig = DEFAULT_LIVENESS_CONFIG
): Promise<LivenessResult> {
  const startTime = Date.now();
  
  // Compute motion score
  const motionScore = computeMotionLivenessScore(
    motionChallengeResult.passed,
    motionChallengeResult.total
  );
  
  // Compute ML score (with timeout)
  let mlScore: number | undefined;
  try {
    const mlPromise = computeMLLivenessScore(faceCrop);
    const timeoutPromise = new Promise<number>((_, reject) =>
      setTimeout(() => reject(new Error('ML liveness timeout')), config.timeoutMs)
    );
    
    mlScore = await Promise.race([mlPromise, timeoutPromise]);
  } catch (error) {
    console.warn('[livenessAdapter] ML liveness failed:', error);
    mlScore = undefined;
  }
  
  // Combine scores
  const combinedScore = combineLivenessScores(motionScore, mlScore, config);
  
  const detectionTime = Date.now() - startTime;
  
  return {
    score: combinedScore,
    method: 'hybrid',
    details: {
      motionScore,
      mlScore,
      challengesPassed: motionChallengeResult.passed,
      challengesTotal: motionChallengeResult.total,
      spoofProbability: 1 - combinedScore,
      detectionTime,
    },
    timestamp: Date.now(),
  };
}

/**
 * Validate liveness result against policy
 * 
 * @param result Liveness result to validate
 * @param minScore Minimum acceptable score (from policy)
 * @returns true if liveness passes, false otherwise
 */
export function validateLiveness(result: LivenessResult, minScore: number): boolean {
  return result.score >= minScore;
}

/**
 * Create mock liveness result for testing
 * 
 * @param score Liveness score (0-1)
 * @param method Liveness method
 * @returns Mock liveness result
 */
export function createMockLiveness(
  score: number = 0.85,
  method: LivenessMethod = 'hybrid'
): LivenessResult {
  return {
    score,
    method,
    details: {
      motionScore: score * 0.9,
      mlScore: score * 1.1,
      challengesPassed: 3,
      challengesTotal: 3,
      spoofProbability: 1 - score,
      detectionTime: 1500,
    },
    timestamp: Date.now(),
  };
}
