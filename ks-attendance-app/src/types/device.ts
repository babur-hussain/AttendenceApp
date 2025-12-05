/**
 * Device Types
 * Type definitions for biometric devices, registry, and device management
 */

export type DeviceType = 'face' | 'fingerprint' | 'card' | 'mobile';
export type DeviceStatus = 'online' | 'offline' | 'maintenance' | 'error';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  location: string;
  ipAddress?: string;
  macAddress?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  companyId: string;
  departmentId?: string;
  departmentName?: string;
  capabilities: DeviceCapabilities;
  config: DeviceConfig;
  lastSeen: string;
  lastHeartbeat: string;
  registeredAt: string;
  updatedAt: string;
}

export interface DeviceCapabilities {
  faceRecognition: boolean;
  livenessDetection: boolean;
  fingerprintScanning: boolean;
  cardReading: boolean;
  camera: boolean;
  display: boolean;
  speaker: boolean;
  networkConnected: boolean;
}

export interface DeviceConfig {
  recognitionThreshold: number; // 0-100
  livenessThreshold: number; // 0-100
  timeout: number; // seconds
  retryAttempts: number;
  autoReboot: boolean;
  offlineMode: boolean;
  syncInterval: number; // minutes
}

export interface DeviceLog {
  id: string;
  deviceId: string;
  timestamp: string;
  type: 'heartbeat' | 'recognition' | 'error' | 'config' | 'reboot';
  level: 'info' | 'warning' | 'error';
  message: string;
  metadata?: Record<string, any>;
}

export interface DeviceRecognitionEvent {
  id: string;
  deviceId: string;
  employeeId?: string;
  timestamp: string;
  type: DeviceType;
  success: boolean;
  confidence?: number;
  livenessScore?: number;
  failureReason?: string;
  imageUrl?: string;
}

export interface RegisterDeviceRequest {
  name: string;
  type: DeviceType;
  location: string;
  ipAddress?: string;
  macAddress?: string;
  serialNumber?: string;
  departmentId?: string;
  capabilities: Partial<DeviceCapabilities>;
  config?: Partial<DeviceConfig>;
}

export interface UpdateDeviceRequest {
  name?: string;
  location?: string;
  status?: DeviceStatus;
  departmentId?: string;
  capabilities?: Partial<DeviceCapabilities>;
  config?: Partial<DeviceConfig>;
}

export interface DeviceHealthCheck {
  deviceId: string;
  timestamp: string;
  online: boolean;
  latency: number; // milliseconds
  cpuUsage?: number; // percentage
  memoryUsage?: number; // percentage
  diskUsage?: number; // percentage
  temperature?: number; // celsius
  errors: string[];
  warnings: string[];
}

export interface DeviceStats {
  deviceId: string;
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  successRate: number;
  averageConfidence: number;
  averageLivenessScore: number;
  uptime: number; // hours
  lastReboot: string;
  period: {
    start: string;
    end: string;
  };
}

export interface BulkDeviceAction {
  deviceIds: string[];
  action: 'reboot' | 'update_config' | 'sync' | 'maintenance' | 'activate' | 'deactivate';
  config?: Partial<DeviceConfig>;
}
