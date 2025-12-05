/**
 * ExternalFaceDeviceAdapter
 * Biometric adapter for external Raspberry Pi face recognition terminal
 * Communicates over WiFi/local network using TOON protocol
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
 * ExternalFaceDeviceConfig
 * Configuration for connecting to external face device
 */
export interface ExternalFaceDeviceConfig {
  deviceId: string;
  ipAddress: string;
  port: number;
  protocol: 'http' | 'https' | 'tcp' | 'udp';
  timeout?: number;
  apiKey?: string;
  useToonProtocol: boolean;
}

/**
 * ExternalFaceDeviceAdapter
 * Connects to Raspberry Pi or custom hardware face terminal
 * Receives face images and embeddings via network (TOON encoded)
 */
export class ExternalFaceDeviceAdapter implements BiometricAdapter {
  private config: ExternalFaceDeviceConfig;
  private isInitialized: boolean = false;
  private baseUrl: string;

  constructor(config: ExternalFaceDeviceConfig) {
    this.config = config;
    this.baseUrl = `${config.protocol}://${config.ipAddress}:${config.port}`;
  }

  /**
   * Initialize connection to external device
   */
  async initialize(): Promise<void> {
    console.log(`[ExternalFaceDeviceAdapter] Connecting to ${this.baseUrl}...`);

    // TODO: Send handshake request to device
    // TODO: Verify TOON protocol support
    // TODO: Check device capabilities

    try {
      // Placeholder: Simulate network handshake
      const deviceInfo = await this.sendToonRequest('/device/info', {
        operation: 'handshake',
        protocol_version: '1.0',
      });

      console.log('[ExternalFaceDeviceAdapter] Device connected:', deviceInfo);
      this.isInitialized = true;
    } catch (error) {
      throw new BiometricError(
        `Failed to connect to external device: ${error}`,
        BiometricErrorCode.DEVICE_NOT_CONNECTED,
        this.config.deviceId
      );
    }
  }

  /**
   * Capture face from external device
   * Device returns TOON-encoded face data (F1=rawFrame, F4=timestamp, F5=quality)
   */
  async captureFace(options?: BiometricCaptureOptions): Promise<FaceData> {
    if (!this.isInitialized) {
      throw new BiometricError(
        'Device not initialized',
        BiometricErrorCode.DEVICE_NOT_CONNECTED,
        this.config.deviceId
      );
    }

    console.log('[ExternalFaceDeviceAdapter] Requesting face capture from device...');

    // Build TOON request
    const request = {
      operation: 'capture_face',
      timeout: options?.timeout || 5000,
      require_liveness: options?.requireLiveness || false,
      min_quality: options?.minQuality || 0.6,
    };

    try {
      // Send TOON request to device
      const toonResponse = await this.sendToonRequest('/biometric/face/capture', request);

      // Decode TOON response tokens
      const faceData: FaceData = {
        rawFrame: toonResponse.F1 as string | Uint8Array, // Raw frame from device
        format: typeof toonResponse.F1 === 'string' ? 'base64' : 'binary',
        width: toonResponse.width || 1280,
        height: toonResponse.height || 720,
        quality: toonResponse.F5 as number, // Quality score
        livenessScore: toonResponse.F6 as number | undefined, // Liveness score
        capturedAt: toonResponse.F4 as string, // Timestamp
        deviceId: this.config.deviceId,
        metadata: {
          faceDetected: toonResponse.face_detected || true,
          faceCount: toonResponse.face_count || 1,
        },
      };

      // Validate quality
      if (options?.minQuality && faceData.quality! < options.minQuality) {
        throw new BiometricError(
          'Face quality below threshold',
          BiometricErrorCode.QUALITY_TOO_LOW,
          this.config.deviceId,
          { quality: faceData.quality, threshold: options.minQuality }
        );
      }

      return faceData;
    } catch (error) {
      throw new BiometricError(
        `Face capture failed: ${error}`,
        BiometricErrorCode.CAPTURE_FAILED,
        this.config.deviceId
      );
    }
  }

  /**
   * Capture fingerprint (not supported on face-only device)
   */
  async captureFingerprint(options?: BiometricCaptureOptions): Promise<FingerprintData> {
    throw new BiometricError(
      'Fingerprint capture not supported on face-only device',
      BiometricErrorCode.UNSUPPORTED_OPERATION,
      this.config.deviceId
    );
  }

  /**
   * Extract face embedding from external device
   * Device processes image and returns F2 token (embedding vector)
   */
  async extractFaceEmbedding(faceData: FaceData): Promise<FaceEmbedding> {
    if (!this.isInitialized) {
      throw new BiometricError(
        'Device not initialized',
        BiometricErrorCode.DEVICE_NOT_CONNECTED,
        this.config.deviceId
      );
    }

    console.log('[ExternalFaceDeviceAdapter] Requesting embedding extraction from device...');

    // Build TOON request with face image
    const request = {
      operation: 'extract_embedding',
      F1: faceData.rawFrame, // Send raw frame to device
      format: faceData.format,
    };

    try {
      // Send TOON request to device
      const toonResponse = await this.sendToonRequest('/biometric/face/extract', request);

      // Decode F2 token (embedding vector)
      const faceEmbedding: FaceEmbedding = {
        vector: toonResponse.F2 as number[], // Embedding vector from device
        algorithm: toonResponse.algorithm || 'device_native',
        version: toonResponse.version || '1.0.0',
        quality: faceData.quality,
        livenessScore: faceData.livenessScore,
        capturedAt: faceData.capturedAt,
        sourceDeviceId: this.config.deviceId,
        metadata: {
          model: toonResponse.model || 'unknown',
          dimensions: (toonResponse.F2 as number[]).length,
        },
      };

      return faceEmbedding;
    } catch (error) {
      throw new BiometricError(
        `Embedding extraction failed: ${error}`,
        BiometricErrorCode.EXTRACTION_FAILED,
        this.config.deviceId
      );
    }
  }

  /**
   * Match face embeddings on external device
   * Sends both embeddings to device for matching (returns F3 token)
   */
  async matchFaceEmbedding(embeddingA: FaceEmbedding, embeddingB: FaceEmbedding): Promise<number> {
    if (!this.isInitialized) {
      throw new BiometricError(
        'Device not initialized',
        BiometricErrorCode.DEVICE_NOT_CONNECTED,
        this.config.deviceId
      );
    }

    console.log('[ExternalFaceDeviceAdapter] Requesting face matching from device...');

    // Build TOON request with both embeddings
    const request = {
      operation: 'match_face',
      F2_A: embeddingA.vector, // First embedding
      F2_B: embeddingB.vector, // Second embedding
    };

    try {
      // Send TOON request to device
      const toonResponse = await this.sendToonRequest('/biometric/face/match', request);

      // Extract F3 token (match score)
      const matchScore = toonResponse.F3 as number;

      console.log(`[ExternalFaceDeviceAdapter] Face match score: ${matchScore.toFixed(4)}`);

      return matchScore;
    } catch (error) {
      throw new BiometricError(
        `Face matching failed: ${error}`,
        BiometricErrorCode.MATCH_FAILED,
        this.config.deviceId
      );
    }
  }

  /**
   * Match fingerprints (not supported)
   */
  async matchFingerprint(templateA: FingerprintData, templateB: FingerprintData): Promise<number> {
    throw new BiometricError(
      'Fingerprint matching not supported on face-only device',
      BiometricErrorCode.UNSUPPORTED_OPERATION,
      this.config.deviceId
    );
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
        deviceType: (toonResponse.D1 as BiometricDeviceType) || 'external_face_device',
        deviceName: toonResponse.device_name || 'Raspberry Pi Face Terminal',
        manufacturer: toonResponse.manufacturer || 'Custom',
        firmwareVersion: toonResponse.D3 as string | undefined,
        capabilities: (toonResponse.D2 as any) || {
          canCaptureFace: true,
          canCaptureFingerprint: false,
          canExtractFaceEmbedding: true,
          canExtractFingerprintTemplate: false,
          canMatchFace: true,
          canMatchFingerprint: false,
          supportsLivenessDetection: true,
          supportsQualityAssessment: true,
        },
        isConnected: this.isInitialized,
        lastSeen: new Date().toISOString(),
      };
    } catch (error) {
      // Return cached info if device unreachable
      return {
        deviceId: this.config.deviceId,
        deviceType: 'external_face_device',
        deviceName: 'Raspberry Pi Face Terminal (Offline)',
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
      // Ping device
      const response = await this.sendToonRequest('/health', { operation: 'ping' });
      return response.status === 'ok';
    } catch (error) {
      return false;
    }
  }

  /**
   * Cleanup connection
   */
  async dispose(): Promise<void> {
    console.log('[ExternalFaceDeviceAdapter] Disconnecting from device...');
    this.isInitialized = false;
  }

  // ==================== HELPER METHODS ====================

  /**
   * Send TOON-encoded request to external device
   */
  private async sendToonRequest(endpoint: string, payload: any): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const timeout = this.config.timeout || 10000;

    console.log(`[ExternalFaceDeviceAdapter] Sending TOON request to ${url}...`);

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
  }
}
