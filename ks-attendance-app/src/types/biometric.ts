/**
 * Biometric Type Definitions
 * Standardized types for face and fingerprint biometric data
 * Supports TOON encoding for hardware interoperability
 */

/**
 * BiometricDeviceType
 * Types of biometric capture devices
 */
export type BiometricDeviceType = 
  | 'mobile_camera' 
  | 'external_face_device' 
  | 'external_fingerprint_device'
  | 'integrated_multi_biometric'
  | 'unknown';

/**
 * BiometricCapability
 * What biometric operations a device supports
 */
export interface BiometricCapability {
  canCaptureFace: boolean;
  canCaptureFingerprint: boolean;
  canExtractFaceEmbedding: boolean;
  canExtractFingerprintTemplate: boolean;
  canMatchFace: boolean;
  canMatchFingerprint: boolean;
  supportsLivenessDetection: boolean;
  supportsQualityAssessment: boolean;
}

/**
 * BiometricDeviceInfo
 * Metadata about a biometric capture device
 * TOON tokens: D1=deviceType, D2=capabilities, D3=firmwareVersion
 */
export interface BiometricDeviceInfo {
  deviceId: string;
  deviceType: BiometricDeviceType;
  deviceName: string;
  manufacturer?: string;
  firmwareVersion?: string;
  capabilities: BiometricCapability;
  isConnected: boolean;
  lastSeen?: string; // ISO timestamp
  metadata?: Record<string, any>;
}

/**
 * FaceData
 * Raw face capture data from biometric device
 * TOON tokens: F1=rawFrame, F4=captureTimestamp, F5=quality
 */
export interface FaceData {
  rawFrame: Uint8Array | string; // Image data (base64 or binary)
  format: 'base64' | 'binary' | 'url';
  width: number;
  height: number;
  quality?: number; // 0-1 quality score
  livenessScore?: number; // 0-1 liveness detection score
  capturedAt: string; // ISO timestamp
  deviceId?: string;
  metadata?: {
    exposure?: number;
    brightness?: number;
    faceDetected?: boolean;
    faceCount?: number;
    [key: string]: any;
  };
}

/**
 * FaceEmbedding
 * Facial recognition embedding vector (extracted from FaceData)
 * TOON tokens: F2=embeddingVector, F3=matchScore (during comparison)
 */
export interface FaceEmbedding {
  vector: number[]; // Embedding dimensions (128, 256, 512, etc.)
  algorithm: string; // 'facenet', 'arcface', 'dlib', 'custom', etc.
  version: string; // Model version
  quality?: number; // 0-1 embedding quality
  livenessScore?: number; // 0-1 liveness score
  capturedAt?: string; // ISO timestamp
  sourceDeviceId?: string;
  metadata?: Record<string, any>;
}

/**
 * FingerprintData
 * Raw fingerprint capture data
 * TOON tokens: FP1=fingerprintTemplate, FP3=captureQuality
 */
export interface FingerprintData {
  template: Uint8Array | string; // ISO/ANSI template or proprietary format
  format: 'iso' | 'ansi' | 'proprietary' | 'base64';
  fingerPosition: 'left_thumb' | 'left_index' | 'right_thumb' | 'right_index' | 'unknown';
  quality?: number; // 0-1 quality score
  capturedAt: string; // ISO timestamp
  deviceId?: string;
  metadata?: {
    dpi?: number; // Dots per inch
    imageWidth?: number;
    imageHeight?: number;
    minutiaeCount?: number;
    [key: string]: any;
  };
}

/**
 * BiometricMatchResult
 * Result of biometric comparison
 * TOON tokens: F3=faceMatchScore, FP2=fingerprintMatchScore
 */
export interface BiometricMatchResult {
  isMatch: boolean;
  score: number; // 0-1 match confidence
  threshold: number; // Threshold used for match decision
  algorithm: string;
  comparisonTime: number; // milliseconds
  metadata?: Record<string, any>;
}

/**
 * BiometricCaptureOptions
 * Options for biometric capture operations
 */
export interface BiometricCaptureOptions {
  timeout?: number; // milliseconds
  requireLiveness?: boolean;
  minQuality?: number; // 0-1 minimum quality threshold
  maxAttempts?: number;
  returnRawData?: boolean;
  metadata?: Record<string, any>;
}

/**
 * BiometricAdapter
 * Standard interface that ALL biometric adapters must implement
 * This allows seamless swapping of hardware without changing app code
 */
export interface BiometricAdapter {
  /**
   * Capture face image from device
   */
  captureFace(options?: BiometricCaptureOptions): Promise<FaceData>;

  /**
   * Capture fingerprint from device
   */
  captureFingerprint(options?: BiometricCaptureOptions): Promise<FingerprintData>;

  /**
   * Extract face embedding from image data
   */
  extractFaceEmbedding(faceData: FaceData): Promise<FaceEmbedding>;

  /**
   * Compare two face embeddings
   * @returns Match score (0-1)
   */
  matchFaceEmbedding(embeddingA: FaceEmbedding, embeddingB: FaceEmbedding): Promise<number>;

  /**
   * Compare two fingerprint templates
   * @returns Match score (0-1)
   */
  matchFingerprint(templateA: FingerprintData, templateB: FingerprintData): Promise<number>;

  /**
   * Get device information and capabilities
   */
  getDeviceInfo(): Promise<BiometricDeviceInfo>;

  /**
   * Check if device is available and connected
   */
  isAvailable(): Promise<boolean>;

  /**
   * Initialize device connection
   */
  initialize(): Promise<void>;

  /**
   * Cleanup and disconnect
   */
  dispose(): Promise<void>;
}

/**
 * BiometricToonTokens
 * TOON token structure definitions for biometric data
 */
export interface BiometricToonTokens {
  // Face tokens
  F1?: string | Uint8Array; // Raw face frame (base64 or binary)
  F2?: number[]; // Face embedding vector
  F3?: number; // Face match score
  F4?: string; // Capture timestamp
  F5?: number; // Face quality score
  F6?: number; // Liveness score

  // Fingerprint tokens
  FP1?: string | Uint8Array; // Fingerprint template
  FP2?: number; // Fingerprint match score
  FP3?: number; // Fingerprint quality score
  FP4?: string; // Finger position
  FP5?: string; // Capture timestamp

  // Device tokens
  D1?: BiometricDeviceType; // Device type
  D2?: BiometricCapability; // Device capabilities
  D3?: string; // Firmware version
  D4?: string; // Device ID
  D5?: boolean; // Connection status

  // Metadata tokens
  M1?: Record<string, any>; // General metadata
}

/**
 * BiometricError
 * Standardized error types for biometric operations
 */
export class BiometricError extends Error {
  constructor(
    message: string,
    public code: BiometricErrorCode,
    public deviceId?: string,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'BiometricError';
  }
}

export enum BiometricErrorCode {
  DEVICE_NOT_FOUND = 'DEVICE_NOT_FOUND',
  DEVICE_NOT_CONNECTED = 'DEVICE_NOT_CONNECTED',
  CAPTURE_FAILED = 'CAPTURE_FAILED',
  QUALITY_TOO_LOW = 'QUALITY_TOO_LOW',
  LIVENESS_CHECK_FAILED = 'LIVENESS_CHECK_FAILED',
  TIMEOUT = 'TIMEOUT',
  UNSUPPORTED_OPERATION = 'UNSUPPORTED_OPERATION',
  EXTRACTION_FAILED = 'EXTRACTION_FAILED',
  MATCH_FAILED = 'MATCH_FAILED',
  INVALID_DATA = 'INVALID_DATA',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
