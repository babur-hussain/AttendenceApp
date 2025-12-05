/**
 * Database Schema typings for the TOON-based Attendance System
 * Now aligned with Supabase/PostgreSQL storage.
 */

export interface AttendanceEventRecord {
  id: number;
  event_id: string; // A1
  employee_id: string; // E1
  event_type: string; // A2: IN/OUT/BREAK_START/BREAK_END
  timestamp: string; // A3: ISO timestamp
  device_id: string; // D1
  location_lat?: number; // L1.lat
  location_lng?: number; // L1.lng
  location_accuracy?: number; // L1.accuracy
  face_match_score?: number; // F3
  fingerprint_match_score?: number; // FP2
  liveness_score?: number; // S2
  quality_score?: number; // S3
  consent_token?: string; // C1
  break_type?: string; // B1
  break_duration?: number; // B2
  is_over_break?: boolean; // B3
  device_signature?: string; // DS1
  metadata?: string; // M1 (TOON-encoded)
  raw_toon: string; // Full original TOON payload for audit
  received_at: string; // Server timestamp
  status: string; // processed/duplicate/rejected
  rejection_reason?: string; // R1
}

export interface DeviceRecord {
  id: number;
  device_id: string; // D1
  device_type: string; // D2: MOBILE/KIOSK/RPI/FINGERPRINT_TERMINAL
  public_key?: string; // D3
  capabilities: string; // D4: comma-separated FACE,FINGERPRINT,LIVENESS
  registered_at: string;
  last_seen_at: string;
  status: string; // active/inactive/blocked
  policy_tokens?: string; // TOON-encoded policy assignments
}

export interface ReportRecord {
  id: number;
  report_id: string; // R1
  request_toon: string; // Original TOON request
  employee_id?: string; // E1 (filter)
  from_timestamp: string; // T1
  to_timestamp: string; // T2
  output_format: string; // O1: XLSX/CSV
  filters?: string; // F1 TOON-encoded
  generated_at: string;
  file_path: string; // Server storage path
  file_size: number;
  status: string; // generating/ready/failed
}

export interface AuditLogRecord {
  id: number;
  event_id: string;
  device_id: string;
  raw_toon_payload: string;
  received_at: string;
  server_response_toon: string;
  status: string;
  error_tokens?: string; // TOON-encoded errors
}


/**
 * Database Helper Functions
 */
export class DbHelper {
  /**
   * Convert AttendanceEventRecord to TOON object
   */
  static eventRecordToToon(record: AttendanceEventRecord): Record<string, any> {
    const tokens: Record<string, any> = {
      E1: record.employee_id,
      A1: record.event_id,
      A2: record.event_type,
      A3: record.timestamp,
      D1: record.device_id,
      S1: record.status,
    };

    if (record.location_lat && record.location_lng) {
      tokens.L1 = {
        lat: record.location_lat,
        lng: record.location_lng,
        accuracy: record.location_accuracy || 0,
      };
    }

    if (record.face_match_score !== null && record.face_match_score !== undefined) {
      tokens.F3 = record.face_match_score;
    }

    if (record.fingerprint_match_score !== null && record.fingerprint_match_score !== undefined) {
      tokens.FP2 = record.fingerprint_match_score;
    }

    if (record.liveness_score !== null && record.liveness_score !== undefined) {
      tokens.S2 = record.liveness_score;
    }

    if (record.quality_score !== null && record.quality_score !== undefined) {
      tokens.S3 = record.quality_score;
    }

    if (record.consent_token) tokens.C1 = record.consent_token;
    if (record.break_type) tokens.B1 = record.break_type;
    if (record.break_duration) tokens.B2 = record.break_duration;
    if (record.is_over_break) tokens.B3 = record.is_over_break;
    if (record.device_signature) tokens.DS1 = record.device_signature;
    if (record.metadata) tokens.M1 = record.metadata;
    if (record.rejection_reason) tokens.R1 = record.rejection_reason;

    return tokens;
  }

  /**
   * Convert TOON object to AttendanceEventRecord (for insertion)
   */
  static toonToEventRecord(toon: Record<string, any>, rawToon: string): Partial<AttendanceEventRecord> {
    const record: Partial<AttendanceEventRecord> = {
      event_id: toon.A1,
      employee_id: toon.E1,
      event_type: toon.A2,
      timestamp: toon.A3,
      device_id: toon.D1,
      raw_toon: rawToon,
      status: 'processed',
    };

    if (toon.L1 && typeof toon.L1 === 'object') {
      record.location_lat = toon.L1.lat;
      record.location_lng = toon.L1.lng;
      record.location_accuracy = toon.L1.accuracy;
    }

    if (toon.F3 !== undefined) record.face_match_score = toon.F3;
    if (toon.FP2 !== undefined) record.fingerprint_match_score = toon.FP2;
    if (toon.S2 !== undefined) record.liveness_score = toon.S2;
    if (toon.S3 !== undefined) record.quality_score = toon.S3;
    if (toon.C1) record.consent_token = toon.C1;
    if (toon.B1) record.break_type = toon.B1;
    if (toon.B2) record.break_duration = toon.B2;
    if (toon.B3 !== undefined) record.is_over_break = toon.B3 ? true : false;
    if (toon.DS1) record.device_signature = toon.DS1;
    if (toon.M1) record.metadata = toon.M1;

    return record;
  }
}
