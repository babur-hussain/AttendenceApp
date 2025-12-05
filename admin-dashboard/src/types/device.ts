/**
 * Device domain types with TOON token mappings
 */

export type DeviceType = 'MOBILE' | 'KIOSK' | 'RPI' | 'FINGERPRINT_TERMINAL';
export type DeviceStatus = 'ONLINE' | 'OFFLINE' | 'ERROR';
export type DeviceCapability = 'FACE' | 'FINGERPRINT' | 'LIVENESS';
export type DeviceCommandType = 'restart' | 'fetch-logs' | 'sync' | 'update-firmware';

export interface Device {
  D1: string;                    // deviceId
  D2: DeviceType;                // deviceType
  DS1: DeviceStatus;             // deviceStatus
  DS2: string;                   // lastSeen (timestamp)
  D3: string;                    // capabilities (comma-separated)
  D4: string;                    // firmwareVersion
  D5: string;                    // publicKeyFingerprint
  M1?: string;                   // assignedPolicyId
  M2?: string;                   // publishedAt
  RAW_TOON?: string;             // Original TOON payload
}

export interface DeviceHealth {
  D1: string;                    // deviceId
  H1: number;                    // uptime (seconds)
  H2: number;                    // memory usage (MB)
  H3: number;                    // cpu temperature (C)
  TS: string;                    // timestamp
}

export interface DeviceEvent {
  E1: string;                    // eventId
  D1: string;                    // deviceId
  ET1: string;                   // eventType
  TS: string;                    // timestamp
  PL1?: string;                  // payload (TOON encoded)
  S1?: string;                   // status
}

export interface DeviceCommand {
  D1: string;                    // deviceId
  CMD1: string;                  // command name
  C1?: string;                   // consent/authorization token
  SIG1?: string;                 // signature token for destructive ops
}

export interface DeviceRegistration {
  D1: string;                    // deviceId
  D2: DeviceType;                // deviceType
  PK1: string;                   // publicKey (PEM)
  D3: string;                    // capabilities
  M1?: string;                   // default policy
}

export interface DeviceListResponse {
  DEVICES?: string;              // Batch of devices separated by ||
  TOTAL?: number;                // Total count
}

export interface DeviceHealthSummary {
  ONLINE: number;
  OFFLINE: number;
  ERROR: number;
  TOTAL: number;
  UPDATED_AT: string;
}

export interface DeviceAlert {
  D1: string;                    // deviceId
  AL1: string;                   // alert level (INFO/WARNING/ERROR/CRITICAL)
  AL2: string;                   // alert message
  TS: string;                    // timestamp
}

export interface FirmwareUpdate {
  FW1: string;                   // firmware version
  FW2: string;                   // download URL
  POL1?: string;                 // rollout policy
  CHECKSUM?: string;             // file checksum
}

export const DEVICE_TYPE_OPTIONS = [
  { value: 'MOBILE', label: 'Mobile Kiosk' },
  { value: 'KIOSK', label: 'Fixed Kiosk' },
  { value: 'RPI', label: 'Raspberry Pi Terminal' },
  { value: 'FINGERPRINT_TERMINAL', label: 'Fingerprint Terminal' },
];

export const DEVICE_CAPABILITY_OPTIONS = [
  { value: 'FACE', label: 'Face Recognition' },
  { value: 'FINGERPRINT', label: 'Fingerprint' },
  { value: 'LIVENESS', label: 'Liveness Detection' },
];

export const DEVICE_COMMAND_OPTIONS = [
  { value: 'restart', label: 'Restart Device', destructive: true },
  { value: 'fetch-logs', label: 'Fetch Logs', destructive: false },
  { value: 'sync', label: 'Force Sync', destructive: false },
  { value: 'update-firmware', label: 'Update Firmware', destructive: true },
];

export const DEVICE_ERROR_MESSAGES: Record<string, string> = {
  'device_not_found': 'Device not found',
  'device_offline': 'Device is offline',
  'invalid_command': 'Invalid command',
  'unauthorized': 'Unauthorized to execute this command',
  'command_failed': 'Command execution failed',
  'registration_failed': 'Device registration failed',
  'invalid_public_key': 'Invalid public key format',
  'duplicate_device': 'Device ID already exists',
  'bulk_operation_failed': 'Bulk operation failed',
};
