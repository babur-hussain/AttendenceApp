/**
 * Employee domain types with TOON token mappings
 */

export interface Employee {
  E1: string;           // Employee ID
  E2: string;           // Name
  E3?: string;          // Email
  E4?: string;          // Phone
  E5?: string;          // Role
  S1: string;           // Status (active/inactive)
  F2?: boolean;         // Has face embeddings
  FP1?: boolean;        // Has fingerprint data
  M1?: string;          // Created timestamp
  M2?: string;          // Last attendance timestamp
}

export interface EmployeeFormData {
  E2: string;           // Name (required)
  E3?: string;          // Email
  E4?: string;          // Phone
  E5?: string;          // Role
  S1: string;           // Status (active/inactive)
}

export interface EmployeeDetails extends Employee {
  D1?: string;          // Device ID (enrolled)
  D2?: string;          // Device type
  TOTAL_EVENTS?: number;// Total attendance events
  LAST_EVENT?: string;  // Last event type
}

export interface EmployeesListResponse {
  TOTAL?: number;
  PAGE?: number;
  PAGE_SIZE?: number;
  EMPLOYEES?: string;   // Semicolon-separated employee data
}
