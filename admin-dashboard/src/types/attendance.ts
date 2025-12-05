/**
 * Attendance domain types with TOON token mappings
 */

export interface AttendanceEvent {
  A1: string;           // Event ID
  E1: string;           // Employee ID
  A2: string;           // Event Type (IN/OUT/BREAK_START/BREAK_END/OVERTIME_IN/OVERTIME_OUT)
  A3: string;           // Timestamp (ISO)
  D1: string;           // Device ID
  D2?: string;          // Device Type
  L1?: string;          // Location (lat,lng format or token)
  F3?: number;          // Face match score
  FP2?: number;         // Fingerprint match score
  F4?: number;          // Face embedding quality
  L2?: number;          // Liveness score
  S1?: string;          // Status (processed/duplicate/rejected)
  S2?: number;          // Quality score
  B1?: string;          // Break type
  B2?: number;          // Break duration
  B3?: boolean;         // Is over break
  M1?: string;          // Metadata (TOON-encoded)
  RAW_TOON?: string;    // Raw TOON payload for audit
}

export interface AttendanceFilters {
  E1?: string;          // Employee ID filter
  T1?: string;          // From date
  T2?: string;          // To date
  A2?: string;          // Event type filter
  D1?: string;          // Device ID filter
  D2?: string;          // Device type filter
  F3_MIN?: number;      // Min face match score
  L1?: string;          // Liveness filter (passed/failed)
}

export interface PaginationTokens {
  P1?: string;          // Cursor
  P2: number;           // Limit/Page size
  P3?: string;          // Next cursor
  TOTAL?: number;       // Total count
}

export interface AttendanceListResponse extends PaginationTokens {
  EVENTS?: string;      // Batch of events separated by ||
}

export type EventType = 'IN' | 'OUT' | 'BREAK_START' | 'BREAK_END' | 'OVERTIME_IN' | 'OVERTIME_OUT';

export const EVENT_TYPE_OPTIONS: { value: EventType | ''; label: string }[] = [
  { value: '', label: 'All Events' },
  { value: 'IN', label: 'Check In' },
  { value: 'OUT', label: 'Check Out' },
  { value: 'BREAK_START', label: 'Break Start' },
  { value: 'BREAK_END', label: 'Break End' },
  { value: 'OVERTIME_IN', label: 'Overtime In' },
  { value: 'OVERTIME_OUT', label: 'Overtime Out' },
];

export const TOON_ERROR_MESSAGES: Record<string, string> = {
  'missing_token:E1': 'Employee ID is required',
  'invalid_range:T1': 'Invalid date range - start date must be before end date',
  'invalid_range:T2': 'Invalid date range - end date is invalid',
  'unauthorized': 'You are not authorized to view this data',
  'invalid_cursor': 'Invalid pagination cursor',
  'invalid_event_type': 'Invalid event type specified',
  'device_not_found': 'Device not found',
  'employee_not_found': 'Employee not found',
};
