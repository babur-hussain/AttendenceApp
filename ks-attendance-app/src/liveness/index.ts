/**
 * Liveness Detection System
 * 
 * Main orchestrator for running liveness detection sessions.
 * Combines motion detection, ML models, and fusion engine.
 */

export * from './motionDetector';
export * from './onnxLiveness';
export * from './fusionEngine';
export * from './evidenceStore';
export * from './policies';

import type { Point3D, FaceLandmarks } from './motionDetector';
import { blinkDetector, headTurnDetector, mouthMovementDetector, frameStabilityChecker } from './motionDetector';
import { predictLivenessHybrid } from './onnxLiveness';
import { fuseLivenessSignals, type LivenessDecision } from './fusionEngine';
import { storeEvidence, type EvidenceType } from './evidenceStore';
import { getPolicy, type LivenessPolicy } from './policies';

/**
 * Frame with landmarks
 */
export interface LivenessFrame {
  imageData: ImageData;           // Raw image data
  landmarks: FaceLandmarks;       // Detected face landmarks
  timestamp: number;              // Frame timestamp
  quality?: number;               // Frame quality score (0-1)
}

/**
 * Liveness session options
 */
export interface LivenessSessionOptions {
  policy?: string | LivenessPolicy;      // Policy name or custom policy
  sessionId: string;                     // Session ID (SID1)
  deviceId: string;                      // Device ID (DID1)
  employeeId?: string;                   // Employee ID if known
  consentToken?: string;                 // C1 consent token
  mlModelKey?: string;                   // ML model key (default: 'minivision_frame')
  storeEvidence?: boolean;               // Override policy evidence storage
  onProgress?: (progress: number) => void; // Progress callback (0-1)
}

/**
 * Liveness result
 */
export interface LivenessResult {
  decision: LivenessDecision;     // Final liveness decision
  evidenceId?: string;            // LVID token if evidence stored
  duration: number;               // Session duration in ms
  attemptCount: number;           // Number of attempts
}

/**
 * Liveness inputs (for pre-computed data)
 */
export interface LivenessInputs {
  frames: LivenessFrame[];
  sessionId: string;
  deviceId: string;
  employeeId?: string;
  consentToken?: string;
}

/**
 * Run liveness detection session
 * 
 * Captures frames, detects motion, runs ML, fuses scores, stores evidence.
 * 
 * @param frames Array of frames with landmarks
 * @param options Session options
 * @returns Liveness result
 */
export async function runLivenessSession(
  frames: LivenessFrame[],
  options: LivenessSessionOptions
): Promise<LivenessResult> {
  const startTime = Date.now();
  
  console.log('[Liveness] Starting session:', options.sessionId, 'Frames:', frames.length);
  
  // Get policy
  const policy = typeof options.policy === 'string' 
    ? getPolicy(options.policy) 
    : (options.policy ?? getPolicy('default'));
  
  console.log('[Liveness] Using policy:', policy.name);
  
  // Validate frames
  if (frames.length < 3) {
    throw new Error('Insufficient frames for liveness detection (minimum 3)');
  }
  
  // Extract landmarks sequence
  const landmarkSequence = frames.map(f => f.landmarks);
  
  // 1. Run motion detectors
  console.log('[Liveness] Running motion detectors...');
  
  const blinkResult = policy.behavior.requireBlink 
    ? blinkDetector(landmarkSequence)
    : undefined;
  
  const headTurnResult = policy.behavior.requireHeadTurn
    ? headTurnDetector(landmarkSequence)
    : undefined;
  
  const mouthResult = policy.behavior.requireMouthMovement
    ? mouthMovementDetector(landmarkSequence)
    : undefined;
  
  // 2. Run stability check
  console.log('[Liveness] Checking frame stability...');
  
  const stabilityResult = frameStabilityChecker(
    frames.map(f => ({ 
      data: f.imageData.data, 
      timestamp: f.timestamp,
      width: f.imageData.width,
      height: f.imageData.height 
    })),
    { minVariance: 100, maxStaticFrames: 3 }
  );
  
  // 3. Run ML liveness (hybrid)
  console.log('[Liveness] Running ML liveness...');
  
  const frameHashes = frames.map(f => 
    `FH_${f.timestamp}_${Math.random().toString(36).slice(2, 10)}`
  );
  
  // TODO: Convert ImageData to Float32Array for ML prediction
  const mlResult: import('./onnxLiveness').MLLivenessResult = {
    score: 0.5,
    confidence: 50,
    modelUsed: 'pending_integration',
    isLive: false,
    processingTime: 0,
  };
  // const mlResult = await predictLivenessHybrid(
  //   frames.map(f => convertImageDataToTensor(f.imageData)),
  //   frameHashes,
  //   {
  //     sessionId: options.sessionId,
  //     deviceId: options.deviceId,
  //     employeeId: options.employeeId,
  //   },
  //   {
  //     modelKey: options.mlModelKey ?? 'minivision_frame',
  //     confidenceThreshold: 70,
  //     fallbackToRemote: true,
  //   }
  // );
  
  // 4. Compute quality score
  const qualityScore = frames.reduce((sum, f) => sum + (f.quality ?? 0.8), 0) / frames.length;
  
  // TODO: Compute device trust score from device attestation
  const deviceTrustScore = 0.9;
  
  // 5. Fuse scores
  console.log('[Liveness] Fusing scores...');
  
  const decision = fuseLivenessSignals(
    {
      motionScores: {
        blink: blinkResult,
        headTurn: headTurnResult,
        mouthMovement: mouthResult,
      },
      mlScores: mlResult,
      qualityScore,
      deviceTrustScore,
      stabilityResult,
    },
    policy.weights,
    {
      livenessThreshold: policy.thresholds.liveness,
    }
  );
  
  // 6. Store evidence (if required and consented)
  let evidenceId: string | undefined;
  
  const shouldStoreEvidence = options.storeEvidence ?? policy.evidenceConfig.storeEvidence;
  
  if (shouldStoreEvidence && options.consentToken) {
    console.log('[Liveness] Storing evidence...');
    
    try {
      // Create evidence blob (frame hashes + landmark summary)
      const evidenceBlob = createEvidenceBlob(frames, decision);
      
      evidenceId = await storeEvidence(
        evidenceBlob,
        {
          type: 'frame_hashes',
          sessionId: options.sessionId,
          deviceId: options.deviceId,
          employeeId: options.employeeId,
          consentToken: options.consentToken,
        },
        policy.evidenceConfig
      );
      
      console.log('[Liveness] Evidence stored:', evidenceId);
      
      // Add to decision
      decision.evidenceTokens.push(evidenceId);
    } catch (error) {
      console.error('[Liveness] Failed to store evidence:', error);
    }
  } else if (shouldStoreEvidence && !options.consentToken) {
    console.warn('[Liveness] Evidence storage skipped - no consent token');
  }
  
  const duration = Date.now() - startTime;
  
  console.log('[Liveness] Session complete:', decision.isLive ? 'LIVE' : 'NOT LIVE', 'L1:', decision.L1.toFixed(3), 'Duration:', duration, 'ms');
  
  return {
    decision,
    evidenceId,
    duration,
    attemptCount: 1,
  };
}

/**
 * Evaluate liveness from pre-computed inputs
 * 
 * Simpler API for when landmarks and ML scores are already available.
 * 
 * @param inputs Liveness inputs
 * @param policy Policy name or custom policy
 * @returns Liveness decision
 */
export async function evaluateLiveness(
  inputs: LivenessInputs,
  policy: string | LivenessPolicy = 'default'
): Promise<LivenessDecision> {
  const policyConfig = typeof policy === 'string' ? getPolicy(policy) : policy;
  
  return runLivenessSession(inputs.frames, {
    policy: policyConfig,
    sessionId: inputs.sessionId,
    deviceId: inputs.deviceId,
    employeeId: inputs.employeeId,
    consentToken: inputs.consentToken,
    storeEvidence: false, // Don't store for simple evaluation
  }).then(result => result.decision);
}

/**
 * Verify liveness evidence
 * 
 * Admin helper to retrieve and verify evidence.
 * 
 * @param evidenceId LVID token
 * @param auditToken AUD1 audit token
 * @returns Evidence data or null
 */
export async function verifyLivenessEvidence(
  evidenceId: string,
  auditToken: string
): Promise<{
  metadata: any;
  blob: Uint8Array;
  verified: boolean;
} | null> {
  if (!auditToken) {
    throw new Error('Audit token (AUD1) required for evidence verification');
  }
  
  const { getEvidence, verifyEvidence } = await import('./evidenceStore');
  
  const evidence = await getEvidence(evidenceId, { auditToken, includeExpired: true });
  
  if (!evidence) {
    return null;
  }
  
  const verified = await verifyEvidence(evidenceId);
  
  return {
    metadata: evidence.metadata,
    blob: evidence.blob,
    verified,
  };
}

/**
 * Create evidence blob from frames and decision
 * 
 * @param frames Liveness frames
 * @param decision Liveness decision
 * @returns Evidence blob
 */
function createEvidenceBlob(
  frames: LivenessFrame[],
  decision: LivenessDecision
): Uint8Array {
  // Create compact evidence structure
  const evidence = {
    version: 1,
    frameCount: frames.length,
    frameHashes: frames.map(f => 
      `FH_${f.timestamp}_${Math.random().toString(36).slice(2, 10)}`
    ),
    landmarkSummary: {
      firstFrame: frames[0].landmarks,
      lastFrame: frames[frames.length - 1].landmarks,
      sampleCount: frames.length,
    },
    decision: {
      L1: decision.L1,
      isLive: decision.isLive,
      components: decision.components,
      timestamp: decision.timestamp,
    },
  };
  
  // Serialize to JSON and convert to bytes
  const json = JSON.stringify(evidence);
  return new TextEncoder().encode(json);
}

/**
 * Check if liveness is supported on device
 * 
 * @returns Support status
 */
export function isLivenessSupported(): {
  supported: boolean;
  features: {
    motion: boolean;
    ml: boolean;
    evidenceStore: boolean;
  };
  reasons?: string[];
} {
  const reasons: string[] = [];
  
  // Check motion detection support (always supported)
  const motionSupported = true;
  
  // Check ML support (requires ONNX runtime)
  let mlSupported = false;
  try {
    // TODO: Check if ONNX Runtime is available
    mlSupported = true;
  } catch {
    reasons.push('ONNX Runtime not available');
  }
  
  // Check evidence store support (requires SecureStore)
  let evidenceStoreSupported = false;
  try {
    // TODO: Check if SecureStore is available
    evidenceStoreSupported = true;
  } catch {
    reasons.push('SecureStore not available');
  }
  
  const supported = motionSupported; // At least motion detection
  
  return {
    supported,
    features: {
      motion: motionSupported,
      ml: mlSupported,
      evidenceStore: evidenceStoreSupported,
    },
    reasons: reasons.length > 0 ? reasons : undefined,
  };
}

/**
 * Get liveness subsystem version
 */
export const LIVENESS_VERSION = '1.0.0';
