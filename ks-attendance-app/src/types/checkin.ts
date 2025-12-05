/**
 * Policy configuration for biometric thresholds and validation rules
 */

export interface PolicyConfig {
  // Face recognition thresholds
  faceMatchThreshold: number;        // 0.0 - 1.0, typically 0.85
  livenessMin: number;                // 0.0 - 1.0, typically 0.75
  faceQualityMin: number;             // 0.0 - 1.0, typically 0.60
  
  // Fingerprint thresholds
  fingerprintThreshold: number;       // 0.0 - 1.0, typically 0.80
  
  // Match policy
  requireBoth: boolean;               // Require both face AND fingerprint
  allowFallbackPIN: boolean;          // Allow PIN fallback if biometric fails
  allowManualReview: boolean;         // Allow manual admin review for PENDING
  
  // Liveness detection
  requireLiveness: boolean;
  livenessActions: ('blink' | 'turn_head' | 'smile')[];
  
  // Location validation
  requireLocation: boolean;
  maxLocationAge: number;             // Max GPS age in seconds
  
  // Retry policy
  maxRetryAttempts: number;
  retryBackoffMs: number;             // Base backoff in milliseconds
  maxQueueSize: number;               // Max events to queue offline
  
  // Security
  signEvents: boolean;                // Sign events with device key
  encryptStorage: boolean;            // Encrypt local event storage
  imageRetentionHours: number;        // How long to keep temp images (0 = don't keep)
}

export const DEFAULT_POLICY: PolicyConfig = {
  faceMatchThreshold: 0.85,
  livenessMin: 0.75,
  faceQualityMin: 0.60,
  fingerprintThreshold: 0.80,
  requireBoth: false,
  allowFallbackPIN: true,
  allowManualReview: true,
  requireLiveness: true,
  livenessActions: ['blink'],
  requireLocation: true,
  maxLocationAge: 300,
  maxRetryAttempts: 5,
  retryBackoffMs: 2000,
  maxQueueSize: 100,
  signEvents: true,
  encryptStorage: true,
  imageRetentionHours: 0,
};

export type AttendanceEventType = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END';

export type EventStatus = 'ACCEPTED' | 'PENDING' | 'REJECTED' | 'QUEUED' | 'SENT' | 'DUPLICATE';

export type RejectionReason = 
  | 'spoof_detected'
  | 'low_liveness'
  | 'low_quality'
  | 'match_failed'
  | 'no_match'
  | 'unknown_employee'
  | 'policy_violation'
  | 'duplicate'
  | 'network_error';

/**
 * TOON Event Tokens for Attendance
 */
export interface AttendanceToonEvent {
  E1?: string;           // employeeId (if known)
  E0?: boolean;          // unknown employee flag
  A1: string;            // eventId (UUID)
  A2: AttendanceEventType; // eventType
  A3: string;            // timestamp (ISO)
  L1?: string;           // location "lat;lng"
  D1: string;            // deviceId
  
  // Face biometric tokens
  F2?: string;           // faceEmbedding (base64 compressed)
  F3?: number;           // faceMatchScore (0-1)
  F4?: number;           // faceQualityScore (0-1)
  F5?: string;           // face metadata (pose, eyes, confidence)
  
  // Fingerprint tokens
  FP1?: string;          // fingerprintTemplate (base64)
  FP2?: number;          // fingerprintMatchScore (0-1)
  
  // Status tokens
  S1: EventStatus;       // eventStatus
  C1?: string;           // consentToken
  R1?: RejectionReason;  // rejectionReason (if rejected)
  
  // Security tokens
  SIG1?: string;         // signature (device signed)
  D3?: string;           // publicKeyFingerprint
}

/**
 * Local queue item for offline persistence
 */
export interface LocalEventQueueItem {
  id: number;
  eventId: string;           // A1
  raw_toon: string;          // Encoded TOON payload
  status: 'queued' | 'sent' | 'failed' | 'duplicate';
  attempts: number;
  created_at: string;
  sent_at?: string;
  server_response_toon?: string;
  error_message?: string;
  next_retry_at?: string;
}

/**
 * Match result from biometric processing
 */
export interface BiometricMatchResult {
  faceMatchScore?: number;
  fingerprintMatchScore?: number;
  livenessScore?: number;
  qualityScore?: number;
  confidence?: number;
  decision: 'PASS' | 'FAIL' | 'PARTIAL';
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * Capture result from BiometricManager
 */
export interface CaptureResult {
  success: boolean;
  faceEmbedding?: string;
  fingerprintTemplate?: string;
  liveness?: number;
  quality?: number;
  metadata?: any;
  error?: string;
}

/**
 * Flow state for UI
 */
export type CheckinFlowState = 
  | 'idle'
  | 'capturing'
  | 'processing'
  | 'awaiting_match'
  | 'confirm'
  | 'sending'
  | 'sent'
  | 'queued'
  | 'error';

/**
 * Event for external consumption (hooks)
 */
export interface CheckinEvent {
  type: 'attempt' | 'result' | 'queued' | 'sent' | 'error';
  eventId: string;
  eventType: AttendanceEventType;
  status?: EventStatus;
  reason?: string;
  timestamp: string;
}
