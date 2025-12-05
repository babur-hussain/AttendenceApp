/**
 * BiometricManager
 * Central manager for all biometric operations
 * Automatically selects and manages the appropriate adapter
 * Provides unified API for face and fingerprint biometrics
 */

import {
  BiometricAdapter,
  FaceData,
  FingerprintData,
  FaceEmbedding,
  BiometricDeviceInfo,
  BiometricCaptureOptions,
  BiometricMatchResult,
  BiometricError,
  BiometricErrorCode,
  BiometricDeviceType,
} from '../../types/biometric';
import type {
  FaceFrame,
  FacePipelineResult,
  FacePipelineConfig,
  ExternalFacePipelineInput,
} from '../../types/face-pipeline';
import { FacePipeline } from './FacePipeline';

/**
 * BiometricManagerConfig
 * Configuration for BiometricManager
 */
export interface BiometricManagerConfig {
  preferredFaceAdapter?: 'mobile' | 'external_face' | 'auto';
  preferredFingerprintAdapter?: 'external_fingerprint' | 'auto';
  faceMatchThreshold?: number; // 0-1 threshold for face matching
  fingerprintMatchThreshold?: number; // 0-1 threshold for fingerprint matching
  autoSelectBestDevice?: boolean;
  fallbackToMobile?: boolean;
}

/**
 * BiometricManager
 * Orchestrates biometric operations across multiple adapters
 */
export class BiometricManager {
  private adapters: Map<string, BiometricAdapter> = new Map();
  private config: BiometricManagerConfig;
  private activeFaceAdapter?: BiometricAdapter;
  private activeFingerprintAdapter?: BiometricAdapter;
  private facePipeline: FacePipeline;

  constructor(config: BiometricManagerConfig = {}) {
    this.config = {
      preferredFaceAdapter: config.preferredFaceAdapter || 'auto',
      preferredFingerprintAdapter: config.preferredFingerprintAdapter || 'auto',
      faceMatchThreshold: config.faceMatchThreshold || 0.7,
      fingerprintMatchThreshold: config.fingerprintMatchThreshold || 0.8,
      autoSelectBestDevice: config.autoSelectBestDevice ?? true,
      fallbackToMobile: config.fallbackToMobile ?? true,
    };

    // Initialize face pipeline
    this.facePipeline = new FacePipeline({
      enableLivenessDetection: true,
      enableQualityAssessment: true,
      enablePoseEstimation: true,
      minQualityScore: 0.6,
      minLivenessScore: 0.7,
      embeddingModel: 'facenet',
      embeddingDimensions: 128,
    });
  }

  /**
   * Register a biometric adapter
   */
  registerAdapter(id: string, adapter: BiometricAdapter): void {
    console.log(`[BiometricManager] Registering adapter: ${id}`);
    this.adapters.set(id, adapter);
  }

  /**
   * Unregister an adapter
   */
  unregisterAdapter(id: string): void {
    console.log(`[BiometricManager] Unregistering adapter: ${id}`);
    const adapter = this.adapters.get(id);
    if (adapter) {
      adapter.dispose();
      this.adapters.delete(id);
    }
  }

  /**
   * Initialize all registered adapters
   */
  async initializeAdapters(): Promise<void> {
    console.log('[BiometricManager] Initializing all adapters...');

    const initPromises = Array.from(this.adapters.values()).map(async (adapter) => {
      try {
        await adapter.initialize();
      } catch (error) {
        console.warn('[BiometricManager] Failed to initialize adapter:', error);
      }
    });

    await Promise.all(initPromises);

    // Auto-select adapters
    await this.autoSelectAdapters();
  }

  /**
   * Automatically select the best available adapters
   */
  private async autoSelectAdapters(): Promise<void> {
    if (!this.config.autoSelectBestDevice) {
      return;
    }

    console.log('[BiometricManager] Auto-selecting best adapters...');

    // Select face adapter
    for (const [id, adapter] of this.adapters.entries()) {
      const isAvailable = await adapter.isAvailable();
      if (!isAvailable) continue;

      const deviceInfo = await adapter.getDeviceInfo();

      if (deviceInfo.capabilities.canCaptureFace && !this.activeFaceAdapter) {
        console.log(`[BiometricManager] Selected face adapter: ${id}`);
        this.activeFaceAdapter = adapter;
      }

      if (deviceInfo.capabilities.canCaptureFingerprint && !this.activeFingerprintAdapter) {
        console.log(`[BiometricManager] Selected fingerprint adapter: ${id}`);
        this.activeFingerprintAdapter = adapter;
      }
    }

    if (!this.activeFaceAdapter) {
      console.warn('[BiometricManager] No face adapter available');
    }

    if (!this.activeFingerprintAdapter) {
      console.warn('[BiometricManager] No fingerprint adapter available');
    }
  }

  /**
   * Capture face from active face adapter
   */
  async captureFace(options?: BiometricCaptureOptions): Promise<FaceData> {
    if (!this.activeFaceAdapter) {
      throw new BiometricError(
        'No face adapter available',
        BiometricErrorCode.DEVICE_NOT_FOUND
      );
    }

    console.log('[BiometricManager] Capturing face...');
    return await this.activeFaceAdapter.captureFace(options);
  }

  /**
   * Capture fingerprint from active fingerprint adapter
   */
  async captureFingerprint(options?: BiometricCaptureOptions): Promise<FingerprintData> {
    if (!this.activeFingerprintAdapter) {
      throw new BiometricError(
        'No fingerprint adapter available',
        BiometricErrorCode.DEVICE_NOT_FOUND
      );
    }

    console.log('[BiometricManager] Capturing fingerprint...');
    return await this.activeFingerprintAdapter.captureFingerprint(options);
  }

  /**
   * Extract face embedding from captured face data
   */
  async getFaceEmbedding(faceData: FaceData): Promise<FaceEmbedding> {
    if (!this.activeFaceAdapter) {
      throw new BiometricError(
        'No face adapter available',
        BiometricErrorCode.DEVICE_NOT_FOUND
      );
    }

    console.log('[BiometricManager] Extracting face embedding...');
    return await this.activeFaceAdapter.extractFaceEmbedding(faceData);
  }

  /**
   * Capture face and extract embedding in one operation
   */
  async captureFaceWithEmbedding(options?: BiometricCaptureOptions): Promise<{
    faceData: FaceData;
    embedding: FaceEmbedding;
  }> {
    const faceData = await this.captureFace(options);
    const embedding = await this.getFaceEmbedding(faceData);

    return { faceData, embedding };
  }

  /**
   * Verify face biometric against stored embedding
   * @returns Match result with score and decision
   */
  async verifyFace(
    capturedFace: FaceData,
    storedEmbedding: FaceEmbedding,
    options?: BiometricCaptureOptions
  ): Promise<BiometricMatchResult> {
    if (!this.activeFaceAdapter) {
      throw new BiometricError(
        'No face adapter available',
        BiometricErrorCode.DEVICE_NOT_FOUND
      );
    }

    console.log('[BiometricManager] Verifying face...');

    const startTime = Date.now();

    // Extract embedding from captured face
    const capturedEmbedding = await this.activeFaceAdapter.extractFaceEmbedding(capturedFace);

    // Match embeddings
    const matchScore = await this.activeFaceAdapter.matchFaceEmbedding(
      capturedEmbedding,
      storedEmbedding
    );

    const comparisonTime = Date.now() - startTime;
    const threshold = this.config.faceMatchThreshold!;
    const isMatch = matchScore >= threshold;

    console.log(
      `[BiometricManager] Face verification: ${isMatch ? 'MATCH' : 'NO MATCH'} (score: ${matchScore.toFixed(4)})`
    );

    return {
      isMatch,
      score: matchScore,
      threshold,
      algorithm: capturedEmbedding.algorithm,
      comparisonTime,
      metadata: {
        capturedQuality: capturedFace.quality,
        capturedLiveness: capturedFace.livenessScore,
        storedQuality: storedEmbedding.quality,
      },
    };
  }

  /**
   * Verify fingerprint biometric against stored template
   * @returns Match result with score and decision
   */
  async verifyFingerprint(
    capturedFingerprint: FingerprintData,
    storedTemplate: FingerprintData
  ): Promise<BiometricMatchResult> {
    if (!this.activeFingerprintAdapter) {
      throw new BiometricError(
        'No fingerprint adapter available',
        BiometricErrorCode.DEVICE_NOT_FOUND
      );
    }

    console.log('[BiometricManager] Verifying fingerprint...');

    const startTime = Date.now();

    // Match fingerprints
    const matchScore = await this.activeFingerprintAdapter.matchFingerprint(
      capturedFingerprint,
      storedTemplate
    );

    const comparisonTime = Date.now() - startTime;
    const threshold = this.config.fingerprintMatchThreshold!;
    const isMatch = matchScore >= threshold;

    console.log(
      `[BiometricManager] Fingerprint verification: ${isMatch ? 'MATCH' : 'NO MATCH'} (score: ${matchScore.toFixed(4)})`
    );

    return {
      isMatch,
      score: matchScore,
      threshold,
      algorithm: 'fingerprint_matcher',
      comparisonTime,
      metadata: {
        capturedQuality: capturedFingerprint.quality,
        storedQuality: storedTemplate.quality,
      },
    };
  }

  /**
   * Verify biometric (auto-detect face or fingerprint)
   */
  async verifyBiometric(
    capturedData: FaceData | FingerprintData,
    storedData: FaceEmbedding | FingerprintData
  ): Promise<BiometricMatchResult> {
    // Detect if face or fingerprint based on data structure
    if ('rawFrame' in capturedData && 'vector' in storedData) {
      // Face verification
      return await this.verifyFace(capturedData, storedData as FaceEmbedding);
    } else if ('template' in capturedData && 'template' in storedData) {
      // Fingerprint verification
      return await this.verifyFingerprint(
        capturedData as FingerprintData,
        storedData as FingerprintData
      );
    }

    throw new BiometricError(
      'Invalid biometric data types',
      BiometricErrorCode.INVALID_DATA
    );
  }

  /**
   * Get information about all registered devices
   */
  async getAllDeviceInfo(): Promise<BiometricDeviceInfo[]> {
    const deviceInfoPromises = Array.from(this.adapters.values()).map((adapter) =>
      adapter.getDeviceInfo()
    );

    return await Promise.all(deviceInfoPromises);
  }

  /**
   * Get active face adapter info
   */
  async getActiveFaceDeviceInfo(): Promise<BiometricDeviceInfo | null> {
    if (!this.activeFaceAdapter) {
      return null;
    }

    return await this.activeFaceAdapter.getDeviceInfo();
  }

  /**
   * Get active fingerprint adapter info
   */
  async getActiveFingerprintDeviceInfo(): Promise<BiometricDeviceInfo | null> {
    if (!this.activeFingerprintAdapter) {
      return null;
    }

    return await this.activeFingerprintAdapter.getDeviceInfo();
  }

  /**
   * Manually set active face adapter
   */
  setActiveFaceAdapter(adapterId: string): void {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new BiometricError(
        `Adapter not found: ${adapterId}`,
        BiometricErrorCode.DEVICE_NOT_FOUND
      );
    }

    console.log(`[BiometricManager] Setting active face adapter: ${adapterId}`);
    this.activeFaceAdapter = adapter;
  }

  /**
   * Manually set active fingerprint adapter
   */
  setActiveFingerprintAdapter(adapterId: string): void {
    const adapter = this.adapters.get(adapterId);
    if (!adapter) {
      throw new BiometricError(
        `Adapter not found: ${adapterId}`,
        BiometricErrorCode.DEVICE_NOT_FOUND
      );
    }

    console.log(`[BiometricManager] Setting active fingerprint adapter: ${adapterId}`);
    this.activeFingerprintAdapter = adapter;
  }

  /**
   * Dispose all adapters and cleanup
   */
  async dispose(): Promise<void> {
    console.log('[BiometricManager] Disposing all adapters...');

    const disposePromises = Array.from(this.adapters.values()).map((adapter) =>
      adapter.dispose()
    );

    await Promise.all(disposePromises);

    this.adapters.clear();
    this.activeFaceAdapter = undefined;
    this.activeFingerprintAdapter = undefined;
  }

  // ==================== FACE PIPELINE METHODS ====================

  /**
   * Process face through complete pipeline
   * Runs detection → embedding → liveness → quality → pose
   */
  async processFacePipeline(frame: FaceFrame): Promise<FacePipelineResult> {
    console.log('[BiometricManager] Processing face through pipeline...');
    return await this.facePipeline.process(frame);
  }

  /**
   * Process external face device input (TOON-encoded)
   * Accepts pre-computed embeddings from hardware
   */
  async processFacePipelineExternal(input: ExternalFacePipelineInput): Promise<FacePipelineResult> {
    console.log('[BiometricManager] Processing external face device input...');
    return await this.facePipeline.processExternal(input);
  }

  /**
   * Capture face and run through pipeline
   */
  async captureFaceWithPipeline(options?: BiometricCaptureOptions): Promise<{
    faceData: FaceData;
    pipelineResult: FacePipelineResult;
  }> {
    // Capture face using active adapter
    const faceData = await this.captureFace(options);

    // Convert to FaceFrame
    const frame: FaceFrame = {
      data: faceData.rawFrame,
      format: faceData.format === 'base64' ? 'base64' : 'rgb',
      width: faceData.width,
      height: faceData.height,
      timestamp: faceData.capturedAt,
      source: 'mobile_camera',
      deviceId: faceData.deviceId,
      metadata: faceData.metadata,
    };

    // Process through pipeline
    const pipelineResult = await this.facePipeline.process(frame);

    return { faceData, pipelineResult };
  }

  /**
   * Configure face pipeline
   */
  configureFacePipeline(config: Partial<FacePipelineConfig>): void {
    console.log('[BiometricManager] Reconfiguring face pipeline...');
    this.facePipeline = new FacePipeline(config);
  }

  /**
   * Get face pipeline instance
   */
  getFacePipeline(): FacePipeline {
    return this.facePipeline;
  }
}
