/**
 * Attendance Type Definitions
 * Standardized types for attendance events and TOON encoding
 */

import type { FaceEmbedding } from './biometric';

/**
 * AttendanceEventType
 * Types of attendance events
 * TOON token: A2
 */
export enum AttendanceEventType {
  CHECK_IN = 'IN',
  CHECK_OUT = 'OUT',
  BREAK_START = 'BREAK_START',
  BREAK_END = 'BREAK_END',
  OVERTIME_IN = 'OVERTIME_IN',
  OVERTIME_OUT = 'OVERTIME_OUT',
}

/**
 * AttendanceEventStatus
 * Status of an attendance event
 * TOON token: S1
 */
export enum AttendanceEventStatus {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  PENDING = 'PENDING',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
}

/**
 * BreakType
 * Types of breaks
 */
export enum BreakType {
  LUNCH = 'LUNCH',
  TEA = 'TEA',
  PRAYER = 'PRAYER',
  PERSONAL = 'PERSONAL',
  MEDICAL = 'MEDICAL',
  EMERGENCY = 'EMERGENCY',
}

/**
 * BiometricVerificationMode
 * Policy for biometric verification
 */
export enum BiometricVerificationMode {
  FACE_ONLY = 'FACE_ONLY',
  FINGERPRINT_ONLY = 'FINGERPRINT_ONLY',
  EITHER = 'EITHER',
  BOTH = 'BOTH',
  FALLBACK_PIN = 'FALLBACK_PIN',
  DEVICE_TRUST = 'DEVICE_TRUST',
}

/**
 * AttendanceLocation
 * Geographic location of event
 * TOON token: L1
 */
export interface AttendanceLocation {
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
  altitude?: number;
  address?: string;
  geofenceId?: string;
}

/**
 * BiometricVerificationData
 * Biometric data for attendance verification
 */
export interface BiometricVerificationData {
  faceEmbedding?: FaceEmbedding;
  faceMatchScore?: number; // 0-1
  fingerprintTemplate?: Uint8Array | string;
  fingerprintMatchScore?: number; // 0-1
  livenessScore?: number; // 0-1
  qualityScore?: number; // 0-1
  deviceSignature?: string; // For hardware-signed tokens
}

/**
 * AttendanceEvent
 * Core attendance event record
 */
export interface AttendanceEvent {
  eventId: string; // A1
  employeeId: string; // E1
  eventType: AttendanceEventType; // A2
  timestamp: string; // A3 - ISO timestamp
  status: AttendanceEventStatus; // S1
  deviceId: string; // D1
  location?: AttendanceLocation; // L1
  biometricData?: BiometricVerificationData;
  breakType?: BreakType;
  breakDuration?: number; // minutes
  isOverBreak?: boolean;
  rejectionReason?: string; // R1
  consentToken?: string; // C1
  metadata?: Record<string, any>;
  createdAt: string;
  syncedAt?: string;
  serverResponseToon?: string;
}

/**
 * AttendanceEventToonTokens
 * TOON token structure for attendance events
 */
export interface AttendanceEventToonTokens {
  // Employee token
  E1: string; // employeeId

  // Event tokens
  A1: string; // eventId
  A2: AttendanceEventType; // eventType
  A3: string; // timestamp (ISO)

  // Location token
  L1?: {
    lat: number;
    lng: number;
    accuracy?: number;
  };

  // Device token
  D1: string; // deviceId

  // Face biometric tokens
  F2?: number[]; // faceEmbedding vector
  F3?: number; // faceMatchScore

  // Fingerprint tokens
  FP1?: string | Uint8Array; // fingerprintTemplate
  FP2?: number; // fingerprintMatchScore

  // Status tokens
  S1: AttendanceEventStatus; // eventStatus
  S2?: number; // livenessScore
  S3?: number; // qualityScore

  // Rejection token
  R1?: string; // rejectionReason

  // Consent token
  C1?: string; // consentToken

  // Break tokens
  B1?: BreakType; // breakType
  B2?: number; // breakDuration (minutes)
  B3?: boolean; // isOverBreak

  // Device signature token
  DS1?: string; // deviceSignature

  // Metadata token
  M1?: Record<string, any>;
}

/**
 * RecordCheckinOptions
 * Options for check-in/check-out operations
 */
export interface RecordCheckinOptions {
  eventType?: AttendanceEventType;
  location?: AttendanceLocation;
  biometricData?: BiometricVerificationData;
  deviceId?: string;
  forceOffline?: boolean;
  metadata?: Record<string, any>;
}

/**
 * HybridEventInput
 * Input for hybrid biometric events (from any device)
 */
export interface HybridEventInput {
  employeeId: string;
  eventType: AttendanceEventType;
  deviceId: string;
  location?: AttendanceLocation;
  faceEmbedding?: FaceEmbedding;
  faceMatchScore?: number;
  fingerprintTemplate?: Uint8Array | string;
  fingerprintMatchScore?: number;
  livenessScore?: number;
  qualityScore?: number;
  deviceSignature?: string;
  breakType?: BreakType;
  consentToken?: string;
  metadata?: Record<string, any>;
}

/**
 * AttendanceSummary
 * Aggregated attendance data for reporting
 */
export interface AttendanceSummary {
  employeeId: string;
  periodStart: string;
  periodEnd: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyDepartures: number;
  totalWorkMinutes: number;
  totalBreakMinutes: number;
  totalOverBreakMinutes: number;
  overtimeMinutes: number;
  events: AttendanceEvent[];
  metadata?: Record<string, any>;
}

/**
 * AttendancePolicy
 * Configurable attendance rules
 */
export interface AttendancePolicy {
  verificationMode: BiometricVerificationMode;
  faceMatchThreshold: number; // 0-1
  fingerprintMatchThreshold: number; // 0-1
  requireLiveness: boolean;
  minLivenessScore: number; // 0-1
  minQualityScore: number; // 0-1
  allowedBreakMinutes: number;
  graceMinutesLate: number;
  graceMinutesEarly: number;
  requireGeofence: boolean;
  allowOfflineEvents: boolean;
  maxOfflineEventAge: number; // hours
}

/**
 * PendingEvent
 * Event waiting to be synced to server
 */
export interface PendingEvent {
  event: AttendanceEvent;
  toonPayload: string | Uint8Array;
  attempts: number;
  lastAttemptAt?: string;
  nextRetryAt: string;
  error?: string;
}

/**
 * AuditLogEntry
 * Audit trail for attendance events
 */
export interface AuditLogEntry {
  auditId: string;
  eventId: string;
  employeeId: string;
  deviceId: string;
  action: string;
  rawToonPayload: string | Uint8Array;
  sentAt?: string;
  serverResponseToon?: string | Uint8Array;
  status: 'success' | 'failure' | 'pending';
  error?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

/**
 * AttendanceEventHook
 * Event hooks for extensibility
 */
export type AttendanceEventHook = (event: AttendanceEvent) => void | Promise<void>;

/**
 * DeviceValidator
 * Custom validator for device-specific logic
 */
export type DeviceValidator = (
  event: HybridEventInput
) => Promise<{ valid: boolean; reason?: string }>;

/**
 * AttendanceError
 * Standardized error for attendance operations
 */
export class AttendanceError extends Error {
  constructor(
    message: string,
    public code: AttendanceErrorCode,
    public metadata?: Record<string, any>
  ) {
    super(message);
    this.name = 'AttendanceError';
  }
}

export enum AttendanceErrorCode {
  EMPLOYEE_NOT_FOUND = 'EMPLOYEE_NOT_FOUND',
  INVALID_BIOMETRIC = 'INVALID_BIOMETRIC',
  BIOMETRIC_MATCH_FAILED = 'BIOMETRIC_MATCH_FAILED',
  LIVENESS_CHECK_FAILED = 'LIVENESS_CHECK_FAILED',
  QUALITY_TOO_LOW = 'QUALITY_TOO_LOW',
  OUTSIDE_GEOFENCE = 'OUTSIDE_GEOFENCE',
  ALREADY_CHECKED_IN = 'ALREADY_CHECKED_IN',
  ALREADY_CHECKED_OUT = 'ALREADY_CHECKED_OUT',
  BREAK_NOT_ALLOWED = 'BREAK_NOT_ALLOWED',
  OVER_BREAK_LIMIT = 'OVER_BREAK_LIMIT',
  DUPLICATE_EVENT = 'DUPLICATE_EVENT',
  OFFLINE_LIMIT_EXCEEDED = 'OFFLINE_LIMIT_EXCEEDED',
  SYNC_FAILED = 'SYNC_FAILED',
  INVALID_EVENT_TYPE = 'INVALID_EVENT_TYPE',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  DEVICE_NOT_TRUSTED = 'DEVICE_NOT_TRUSTED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * ReconciliationResult
 * Result of pending event reconciliation
 */
export interface ReconciliationResult {
  totalEvents: number;
  successCount: number;
  failureCount: number;
  pendingCount: number;
  results: Array<{
    eventId: string;
    status: 'success' | 'failure';
    error?: string;
  }>;
}
