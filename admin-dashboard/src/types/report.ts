/**
 * Report domain types with TOON token mappings
 */

export interface ReportRequest {
  R1?: string;          // Request ID (generated client-side)
  T1: string;           // From date
  T2: string;           // To date
  E1?: string;          // Employee ID filter (optional)
  F1?: string;          // Role/Shift filters (comma-separated)
  O1: string;           // Output format (XLSX/CSV)
  O2?: boolean;         // Include raw events sheet
}

export interface ReportMetadata {
  R1: string;           // Report ID
  U1?: string;          // Requested by user
  T1: string;           // From date
  T2: string;           // To date
  E1?: string;          // Employee filter
  S1: string;           // Status (generating/ready/failed)
  GENERATED_AT?: string;// Generation timestamp
  FILE_SIZE?: number;   // File size in bytes
  DOWNLOAD_TOKEN?: string; // Server token for download
}

export interface ReportListResponse {
  REPORTS?: string;     // Batch of reports separated by ||
  TOTAL?: number;       // Total count
}

export interface ToonDownloadResponse {
  blob: Blob;
  filename?: string;
  headers?: Record<string, string>;
}

export const OUTPUT_FORMAT_OPTIONS = [
  { value: 'XLSX', label: 'Excel (XLSX)' },
  { value: 'CSV', label: 'CSV' },
];

export const REPORT_ERROR_MESSAGES: Record<string, string> = {
  'invalid_date_range': 'Invalid date range - start date must be before end date',
  'missing_required_field': 'Required field is missing',
  'report_generation_failed': 'Failed to generate report',
  'report_not_found': 'Report not found',
  'unauthorized': 'You are not authorized to access this report',
  'invalid_format': 'Invalid output format specified',
  'no_data_found': 'No data available for the specified criteria',
  'partial_success': 'Report generated with some segments missing',
};
