/**
 * Face Pipeline Type Definitions
 * Standardized types for face processing pipeline
 * Supports mobile and external hardware with TOON encoding
 */

import type { FaceEmbedding } from './biometric';

/**
 * FaceFrame
 * Raw camera frame or external device frame
 * TOON token: F1=rawFrame
 */
export interface FaceFrame {
  data: Uint8Array | string; // Image data (binary or base64)
  format: 'rgb' | 'rgba' | 'base64' | 'jpeg' | 'png';
  width: number;
  height: number;
  timestamp: string; // ISO timestamp
  source: 'mobile_camera' | 'external_device' | 'file';
  deviceId?: string;
  metadata?: {
    exposure?: number;
    brightness?: number;
    contrast?: number;
    colorSpace?: string;
    [key: string]: any;
  };
}

/**
 * FaceBoundingBox
 * Detected face location in frame
 */
export interface FaceBoundingBox {
  x: number; // Top-left x coordinate
  y: number; // Top-left y coordinate
  width: number;
  height: number;
  confidence: number; // 0-1 detection confidence
  landmarks?: FaceLandmarks;
}

/**
 * FaceLandmarks
 * Key facial feature points
 */
export interface FaceLandmarks {
  leftEye?: { x: number; y: number };
  rightEye?: { x: number; y: number };
  nose?: { x: number; y: number };
  leftMouth?: { x: number; y: number };
  rightMouth?: { x: number; y: number };
  landmarks?: Array<{ x: number; y: number }>; // Additional points
}

/**
 * FacePose
 * Head pose estimation
 * TOON token: F5=poseMetadata
 */
export interface FacePose {
  yaw: number; // Rotation around Y-axis (-180 to 180 degrees)
  pitch: number; // Rotation around X-axis (-90 to 90 degrees)
  roll: number; // Rotation around Z-axis (-180 to 180 degrees)
  confidence: number; // 0-1 pose estimation confidence
}

/**
 * LivenessResult
 * Liveness detection result
 * TOON token: F3=livenessScore
 */
export interface LivenessResult {
  isLive: boolean; // True if real person detected
  score: number; // 0-1 liveness confidence
  method: 'passive' | 'active' | 'external' | 'none';
  checks: {
    blinkDetected?: boolean;
    movementDetected?: boolean;
    depthAnalysis?: boolean;
    textureAnalysis?: boolean;
    [key: string]: any;
  };
  timestamp: string;
  metadata?: Record<string, any>;
}

/**
 * FaceQuality
 * Face quality assessment
 * TOON token: F4=qualityScore
 */
export interface FaceQuality {
  overallScore: number; // 0-1 composite quality score
  sharpness?: number; // 0-1 image sharpness
  brightness?: number; // 0-1 brightness level
  contrast?: number; // 0-1 contrast level
  symmetry?: number; // 0-1 face symmetry
  frontalness?: number; // 0-1 frontal face score
  occlusion?: number; // 0-1 occlusion level (lower is better)
  issues: string[]; // Array of quality issues detected
  metadata?: Record<string, any>;
}

/**
 * FacePipelineResult
 * Complete result from face processing pipeline
 */
export interface FacePipelineResult {
  success: boolean;
  faceDetected: boolean;
  boundingBox?: FaceBoundingBox;
  embedding?: FaceEmbedding;
  liveness?: LivenessResult;
  quality?: FaceQuality;
  pose?: FacePose;
  processingTime: number; // milliseconds
  pipelineStage: FacePipelineStage;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * FacePipelineStage
 * Current stage of pipeline execution
 * TOON token: S1=pipelineStatus
 */
export enum FacePipelineStage {
  INITIALIZED = 'initialized',
  DETECTING = 'detecting',
  DETECTED = 'detected',
  COMPUTING_EMBEDDING = 'computing_embedding',
  CHECKING_LIVENESS = 'checking_liveness',
  EVALUATING_QUALITY = 'evaluating_quality',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

/**
 * FacePipelineToonTokens
 * TOON token structure for face pipeline data
 */
export interface FacePipelineToonTokens {
  // Frame token
  F1?: string | Uint8Array; // Raw face frame

  // Embedding token
  F2?: number[]; // Face embedding vector

  // Liveness token
  F3?: number; // Liveness score (0-1)

  // Quality token
  F4?: number; // Face quality score (0-1)

  // Pose metadata token
  F5?: {
    yaw: number;
    pitch: number;
    roll: number;
    confidence: number;
  };

  // Pipeline status token
  S1?: FacePipelineStage; // Current pipeline stage

  // Confidence score token
  S2?: number; // Overall confidence (0-1)

  // Bounding box token
  BB1?: {
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  };

  // Metadata token
  M1?: Record<string, any>;
}

/**
 * FacePipelineConfig
 * Configuration for face pipeline
 */
export interface FacePipelineConfig {
  enableLivenessDetection: boolean;
  enableQualityAssessment: boolean;
  enablePoseEstimation: boolean;
  minQualityScore?: number; // 0-1 minimum quality threshold
  minLivenessScore?: number; // 0-1 minimum liveness threshold
  maxPoseDeviation?: number; // Maximum degrees from frontal
  embeddingModel: 'facenet' | 'arcface' | 'dlib' | 'custom' | 'external';
  embeddingDimensions: 128 | 256 | 512 | 1024;
  timeout?: number; // milliseconds
  allowExternalPrecomputed?: boolean; // Accept embeddings from external devices
  metadata?: Record<string, any>;
}

/**
 * ExternalFacePipelineInput
 * Input from external hardware device (TOON-encoded)
 */
export interface ExternalFacePipelineInput {
  deviceId: string;
  tokens: FacePipelineToonTokens;
  precomputedEmbedding?: boolean;
  precomputedLiveness?: boolean;
  timestamp: string;
}

/**
 * FacePipelineError
 * Standardized error for face pipeline operations
 */
export class FacePipelineError extends Error {
  constructor(
    message: string,
    public code: FacePipelineErrorCode,
    public stage: FacePipelineStage,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'FacePipelineError';
  }
}

export enum FacePipelineErrorCode {
  NO_FACE_DETECTED = 'NO_FACE_DETECTED',
  MULTIPLE_FACES = 'MULTIPLE_FACES',
  QUALITY_TOO_LOW = 'QUALITY_TOO_LOW',
  LIVENESS_FAILED = 'LIVENESS_FAILED',
  POSE_INVALID = 'POSE_INVALID',
  EMBEDDING_FAILED = 'EMBEDDING_FAILED',
  TIMEOUT = 'TIMEOUT',
  INVALID_FRAME = 'INVALID_FRAME',
  EXTERNAL_DEVICE_ERROR = 'EXTERNAL_DEVICE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
