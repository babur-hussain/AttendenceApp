/**
 * ExternalFingerprintAdapter
 * Biometric adapter for external fingerprint scanner hardware
 * Communicates over network using TOON protocol
 * Supports custom fingerprint terminals (USB, Serial, Network-connected)
 */

import {
  BiometricAdapter,
  FaceData,
  FingerprintData,
  FaceEmbedding,
  BiometricDeviceInfo,
  BiometricCaptureOptions,
  BiometricError,
  BiometricErrorCode,
  BiometricDeviceType,
  BiometricToonTokens,
} from '../../types/biometric';
import { encodeToToonPayload, decodeFromToonPayload } from '../../utils/toon';

/**
 * ExternalFingerprintDeviceConfig
 * Configuration for connecting to external fingerprint device
 */
export interface ExternalFingerprintDeviceConfig {
  deviceId: string;
  connectionType: 'network' | 'usb' | 'serial' | 'bluetooth';
  ipAddress?: string;
  port?: number;
  serialPort?: string;
  baudRate?: number;
  protocol: 'http' | 'https' | 'tcp' | 'udp' | 'serial';
  timeout?: number;
  apiKey?: string;
  useToonProtocol: boolean;
}

/**
 * ExternalFingerprintAdapter
 * Connects to custom fingerprint hardware terminal
 * Receives fingerprint templates via network (TOON encoded)
 */
export class ExternalFingerprintAdapter implements BiometricAdapter {
  private config: ExternalFingerprintDeviceConfig;
  private isInitialized: boolean = false;
  private baseUrl?: string;

  constructor(config: ExternalFingerprintDeviceConfig) {
    this.config = config;

    if (config.connectionType === 'network' && config.ipAddress && config.port) {
      this.baseUrl = `${config.protocol}://${config.ipAddress}:${config.port}`;
    }
  }

  /**
   * Initialize connection to fingerprint device
   */
  async initialize(): Promise<void> {
    console.log(`[ExternalFingerprintAdapter] Connecting to fingerprint device...`);

    // TODO: Establish connection based on connectionType
    // TODO: For network: HTTP/TCP handshake
    // TODO: For USB/Serial: Open port and initialize device
    // TODO: Verify TOON protocol support

    try {
      if (this.config.connectionType === 'network') {
        // Network-based device
        const deviceInfo = await this.sendToonRequest('/device/info', {
          operation: 'handshake',
          protocol_version: '1.0',
        });

        console.log('[ExternalFingerprintAdapter] Device connected:', deviceInfo);
      } else if (this.config.connectionType === 'serial') {
        // Serial-based device (future: use react-native-serial-port or similar)
        console.log('[ExternalFingerprintAdapter] Opening serial port:', this.config.serialPort);
        // TODO: Initialize serial connection
      }

      this.isInitialized = true;
    } catch (error) {
      throw new BiometricError(
        `Failed to connect to fingerprint device: ${error}`,
        BiometricErrorCode.DEVICE_NOT_CONNECTED,
        this.config.deviceId
      );
    }
  }

  /**
   * Capture face (not supported on fingerprint device)
   */
  async captureFace(options?: BiometricCaptureOptions): Promise<FaceData> {
    throw new BiometricError(
      'Face capture not supported on fingerprint-only device',
      BiometricErrorCode.UNSUPPORTED_OPERATION,
      this.config.deviceId
    );
  }

  /**
   * Capture fingerprint from external device
   * Device returns TOON-encoded fingerprint data (FP1=template, FP3=quality, FP4=position)
   */
  async captureFingerprint(options?: BiometricCaptureOptions): Promise<FingerprintData> {
    if (!this.isInitialized) {
      throw new BiometricError(
        'Device not initialized',
        BiometricErrorCode.DEVICE_NOT_CONNECTED,
        this.config.deviceId
      );
    }

    console.log('[ExternalFingerprintAdapter] Requesting fingerprint capture from device...');

    // Build TOON request
    const request = {
      operation: 'capture_fingerprint',
      timeout: options?.timeout || 10000,
      min_quality: options?.minQuality || 0.6,
      max_attempts: options?.maxAttempts || 3,
    };

    try {
      // Send TOON request to device
      const toonResponse = await this.sendToonRequest('/biometric/fingerprint/capture', request);

      // Decode TOON response tokens
      const fingerprintData: FingerprintData = {
        template: toonResponse.FP1 as string | Uint8Array, // Fingerprint template
        format: toonResponse.format || 'iso',
        fingerPosition: toonResponse.FP4 || 'unknown',
        quality: toonResponse.FP3 as number, // Quality score
        capturedAt: toonResponse.FP5 as string, // Timestamp
        deviceId: this.config.deviceId,
        metadata: {
          dpi: toonResponse.dpi || 500,
          imageWidth: toonResponse.width,
          imageHeight: toonResponse.height,
          minutiaeCount: toonResponse.minutiae_count,
        },
      };

      // Validate quality
      if (options?.minQuality && fingerprintData.quality! < options.minQuality) {
        throw new BiometricError(
          'Fingerprint quality below threshold',
          BiometricErrorCode.QUALITY_TOO_LOW,
          this.config.deviceId,
          { quality: fingerprintData.quality, threshold: options.minQuality }
        );
      }

      return fingerprintData;
    } catch (error) {
      throw new BiometricError(
        `Fingerprint capture failed: ${error}`,
        BiometricErrorCode.CAPTURE_FAILED,
        this.config.deviceId
      );
    }
  }

  /**
   * Extract face embedding (not supported)
   */
  async extractFaceEmbedding(faceData: FaceData): Promise<FaceEmbedding> {
    throw new BiometricError(
      'Face embedding extraction not supported on fingerprint-only device',
      BiometricErrorCode.UNSUPPORTED_OPERATION,
      this.config.deviceId
    );
  }

  /**
   * Match face embeddings (not supported)
   */
  async matchFaceEmbedding(embeddingA: FaceEmbedding, embeddingB: FaceEmbedding): Promise<number> {
    throw new BiometricError(
      'Face matching not supported on fingerprint-only device',
      BiometricErrorCode.UNSUPPORTED_OPERATION,
      this.config.deviceId
    );
  }

  /**
   * Match fingerprint templates on external device
   * Sends both templates to device for matching (returns FP2 token)
   */
  async matchFingerprint(templateA: FingerprintData, templateB: FingerprintData): Promise<number> {
    if (!this.isInitialized) {
      throw new BiometricError(
        'Device not initialized',
        BiometricErrorCode.DEVICE_NOT_CONNECTED,
        this.config.deviceId
      );
    }

    console.log('[ExternalFingerprintAdapter] Requesting fingerprint matching from device...');

    // Build TOON request with both templates
    const request = {
      operation: 'match_fingerprint',
      FP1_A: templateA.template, // First template
      FP1_B: templateB.template, // Second template
      format: templateA.format,
    };

    try {
      // Send TOON request to device
      const toonResponse = await this.sendToonRequest('/biometric/fingerprint/match', request);

      // Extract FP2 token (match score)
      const matchScore = toonResponse.FP2 as number;

      console.log(`[ExternalFingerprintAdapter] Fingerprint match score: ${matchScore.toFixed(4)}`);

      return matchScore;
    } catch (error) {
      throw new BiometricError(
        `Fingerprint matching failed: ${error}`,
        BiometricErrorCode.MATCH_FAILED,
        this.config.deviceId
      );
    }
  }

  /**
   * Get device information from external device
   * Queries D1, D2, D3 tokens (device type, capabilities, firmware)
   */
  async getDeviceInfo(): Promise<BiometricDeviceInfo> {
    const request = {
      operation: 'get_device_info',
    };

    try {
      const toonResponse = await this.sendToonRequest('/device/info', request);

      return {
        deviceId: this.config.deviceId,
        deviceType: (toonResponse.D1 as BiometricDeviceType) || 'external_fingerprint_device',
        deviceName: toonResponse.device_name || 'Custom Fingerprint Scanner',
        manufacturer: toonResponse.manufacturer || 'Custom',
        firmwareVersion: toonResponse.D3 as string | undefined,
        capabilities: (toonResponse.D2 as any) || {
          canCaptureFace: false,
          canCaptureFingerprint: true,
          canExtractFaceEmbedding: false,
          canExtractFingerprintTemplate: true,
          canMatchFace: false,
          canMatchFingerprint: true,
          supportsLivenessDetection: false,
          supportsQualityAssessment: true,
        },
        isConnected: this.isInitialized,
        lastSeen: new Date().toISOString(),
      };
    } catch (error) {
      // Return cached info if device unreachable
      return {
        deviceId: this.config.deviceId,
        deviceType: 'external_fingerprint_device',
        deviceName: 'Custom Fingerprint Scanner (Offline)',
        capabilities: {
          canCaptureFace: false,
          canCaptureFingerprint: false,
          canExtractFaceEmbedding: false,
          canExtractFingerprintTemplate: false,
          canMatchFace: false,
          canMatchFingerprint: false,
          supportsLivenessDetection: false,
          supportsQualityAssessment: false,
        },
        isConnected: false,
      };
    }
  }

  /**
   * Check if device is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      if (this.config.connectionType === 'network') {
        // Ping network device
        const response = await this.sendToonRequest('/health', { operation: 'ping' });
        return response.status === 'ok';
      } else if (this.config.connectionType === 'serial') {
        // TODO: Check serial port availability
        return true; // Placeholder
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup connection
   */
  async dispose(): Promise<void> {
    console.log('[ExternalFingerprintAdapter] Disconnecting from device...');
    
    // TODO: Close serial port if applicable
    // TODO: Send disconnect command to network device
    
    this.isInitialized = false;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Send TOON-encoded request to external device
   */
  private async sendToonRequest(endpoint: string, payload: any): Promise<any> {
    if (this.config.connectionType === 'network' && this.baseUrl) {
      const url = `${this.baseUrl}${endpoint}`;
      const timeout = this.config.timeout || 10000;

      console.log(`[ExternalFingerprintAdapter] Sending TOON request to ${url}...`);

      // TODO: Encode payload to TOON format
      const toonPayload = this.config.useToonProtocol
        ? encodeToToonPayload(payload)
        : payload;

      // TODO: Send HTTP/TCP request with timeout
      // TODO: Decode TOON response
      // TODO: Handle network errors

      // Placeholder: Simulate network request
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          // Mock response
          resolve({
            status: 'ok',
            ...payload, // Echo back for placeholder
          });
        }, 100);
      });
    } else if (this.config.connectionType === 'serial') {
      // TODO: Implement serial communication
      // TODO: Encode TOON payload as binary/ASCII
      // TODO: Send via serial port
      // TODO: Read response and decode TOON

      console.log('[ExternalFingerprintAdapter] Sending TOON request via serial...');

      // Placeholder
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ status: 'ok', ...payload });
        }, 100);
      });
    }

    throw new BiometricError(
      'Unsupported connection type',
      BiometricErrorCode.UNSUPPORTED_OPERATION,
      this.config.deviceId
    );
  }
}
