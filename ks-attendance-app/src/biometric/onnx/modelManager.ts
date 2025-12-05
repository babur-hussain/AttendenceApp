/**
 * ONNX Model Manager
 * 
 * Handles versioned model downloads, checksum verification,
 * atomic updates, and fallback strategies for ONNX face models.
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';

/**
 * Model metadata
 */
export interface ModelMetadata {
  name: string;
  version: string;
  url: string;
  checksum: string; // SHA256 hex
  size: number; // bytes
  format: 'onnx' | 'tfjs';
  quantized: boolean;
  outputDim: number; // embedding dimension
  updatedAt: string; // ISO timestamp
}

/**
 * Model cache entry
 */
interface CachedModel {
  metadata: ModelMetadata;
  localPath: string;
  downloadedAt: string;
  verified: boolean;
}

/**
 * Model manager configuration
 */
export interface ModelManagerConfig {
  cacheDir?: string; // Default: FileSystem.cacheDirectory + 'models/'
  maxCacheSize?: number; // Max cache size in bytes (default: 500MB)
  retryAttempts?: number; // Download retry attempts (default: 3)
  fallbackVersions?: number; // Keep N previous versions (default: 2)
}

/**
 * ONNX Model Manager
 * 
 * Singleton service for managing ONNX face recognition models.
 */
export class ModelManager {
  private static instance: ModelManager;
  private config: Required<ModelManagerConfig>;
  private cache: Map<string, CachedModel> = new Map();
  private cacheFile: string;

  private constructor(config: ModelManagerConfig = {}) {
    this.config = {
      cacheDir: config.cacheDir || `${FileSystem.cacheDirectory}models/`,
      maxCacheSize: config.maxCacheSize || 500 * 1024 * 1024, // 500 MB
      retryAttempts: config.retryAttempts || 3,
      fallbackVersions: config.fallbackVersions || 2,
    };

    this.cacheFile = `${this.config.cacheDir}cache.json`;
  }

  /**
   * Get singleton instance
   */
  public static getInstance(config?: ModelManagerConfig): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager(config);
    }
    return ModelManager.instance;
  }

  /**
   * Initialize model manager
   * 
   * Creates cache directory and loads cache index.
   */
  public async initialize(): Promise<void> {
    console.log('[ModelManager] Initializing...');

    // Create cache directory
    const dirInfo = await FileSystem.getInfoAsync(this.config.cacheDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(this.config.cacheDir, {
        intermediates: true,
      });
    }

    // Load cache index
    await this.loadCacheIndex();

    console.log(`[ModelManager] Initialized with ${this.cache.size} cached models`);
  }

  /**
   * Download or retrieve model
   * 
   * If model is already cached and verified, returns local path.
   * Otherwise, downloads from URL with checksum verification.
   * 
   * @param metadata Model metadata
   * @param forceDownload Force re-download even if cached
   * @returns Local file path
   */
  public async getModel(
    metadata: ModelMetadata,
    forceDownload: boolean = false
  ): Promise<string> {
    const cacheKey = this.getCacheKey(metadata);

    // Check cache
    if (!forceDownload && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey)!;

      // Verify file still exists
      const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
      if (fileInfo.exists && cached.verified) {
        console.log(`[ModelManager] Using cached model: ${cached.localPath}`);
        return cached.localPath;
      } else {
        console.warn(`[ModelManager] Cached model missing or unverified, re-downloading`);
        this.cache.delete(cacheKey);
      }
    }

    // Download model
    console.log(`[ModelManager] Downloading model: ${metadata.name} v${metadata.version}`);
    const localPath = await this.downloadModel(metadata);

    // Update cache
    const cached: CachedModel = {
      metadata,
      localPath,
      downloadedAt: new Date().toISOString(),
      verified: true,
    };
    this.cache.set(cacheKey, cached);
    await this.saveCacheIndex();

    // Cleanup old models
    await this.cleanupCache();

    return localPath;
  }

  /**
   * Download model with retry and checksum verification
   * 
   * @param metadata Model metadata
   * @returns Local file path
   */
  private async downloadModel(metadata: ModelMetadata): Promise<string> {
    const tempPath = `${this.config.cacheDir}temp_${metadata.name}_${metadata.version}.${metadata.format}`;
    const finalPath = `${this.config.cacheDir}${metadata.name}_${metadata.version}.${metadata.format}`;

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.config.retryAttempts) {
      attempt++;

      try {
        console.log(`[ModelManager] Download attempt ${attempt}/${this.config.retryAttempts}`);

        // Download to temp file
        const downloadResult = await FileSystem.downloadAsync(
          metadata.url,
          tempPath
        );

        if (downloadResult.status !== 200) {
          throw new Error(`Download failed with status ${downloadResult.status}`);
        }

        // Verify checksum
        console.log('[ModelManager] Verifying checksum...');
        const isValid = await this.verifyChecksum(tempPath, metadata.checksum);

        if (!isValid) {
          throw new Error('Checksum verification failed');
        }

        // Atomic move: temp → final
        await FileSystem.moveAsync({
          from: tempPath,
          to: finalPath,
        });

        console.log(`[ModelManager] Model downloaded successfully: ${finalPath}`);
        return finalPath;

      } catch (error) {
        console.error(`[ModelManager] Download attempt ${attempt} failed:`, error);
        lastError = error as Error;

        // Clean up temp file
        try {
          await FileSystem.deleteAsync(tempPath, { idempotent: true });
        } catch {}

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`[ModelManager] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(
      `Failed to download model after ${this.config.retryAttempts} attempts: ${lastError?.message}`
    );
  }

  /**
   * Verify file checksum
   * 
   * @param filePath Local file path
   * @param expectedChecksum Expected SHA256 hex
   * @returns True if checksum matches
   */
  private async verifyChecksum(
    filePath: string,
    expectedChecksum: string
  ): Promise<boolean> {
    try {
      const fileChecksum = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        await FileSystem.readAsStringAsync(filePath, {
          encoding: FileSystem.EncodingType.Base64,
        })
      );

      return fileChecksum.toLowerCase() === expectedChecksum.toLowerCase();
    } catch (error) {
      console.error('[ModelManager] Checksum verification error:', error);
      return false;
    }
  }

  /**
   * Get list of cached models
   * 
   * @returns Array of cached model metadata
   */
  public getCachedModels(): ModelMetadata[] {
    return Array.from(this.cache.values()).map(c => c.metadata);
  }

  /**
   * Delete specific model from cache
   * 
   * @param name Model name
   * @param version Model version
   */
  public async deleteModel(name: string, version: string): Promise<void> {
    const cacheKey = `${name}_${version}`;
    const cached = this.cache.get(cacheKey);

    if (cached) {
      // Delete file
      try {
        await FileSystem.deleteAsync(cached.localPath, { idempotent: true });
      } catch (error) {
        console.error('[ModelManager] Error deleting model file:', error);
      }

      // Remove from cache
      this.cache.delete(cacheKey);
      await this.saveCacheIndex();
    }
  }

  /**
   * Clear all cached models
   */
  public async clearCache(): Promise<void> {
    console.log('[ModelManager] Clearing cache...');

    // Delete all model files
    for (const cached of this.cache.values()) {
      try {
        await FileSystem.deleteAsync(cached.localPath, { idempotent: true });
      } catch {}
    }

    // Clear cache
    this.cache.clear();
    await this.saveCacheIndex();
  }

  /**
   * Cleanup old models based on cache size and fallback policy
   */
  private async cleanupCache(): Promise<void> {
    // Get cache size
    const cacheSize = await this.getCacheSize();

    if (cacheSize <= this.config.maxCacheSize) {
      return; // No cleanup needed
    }

    console.log(
      `[ModelManager] Cache size (${cacheSize} bytes) exceeds limit (${this.config.maxCacheSize} bytes), cleaning up...`
    );

    // Group models by name
    const modelGroups = new Map<string, CachedModel[]>();
    for (const cached of this.cache.values()) {
      const name = cached.metadata.name;
      if (!modelGroups.has(name)) {
        modelGroups.set(name, []);
      }
      modelGroups.get(name)!.push(cached);
    }

    // For each model, keep only latest N versions
    for (const [name, models] of modelGroups.entries()) {
      if (models.length <= this.config.fallbackVersions) {
        continue;
      }

      // Sort by download date (newest first)
      models.sort(
        (a, b) =>
          new Date(b.downloadedAt).getTime() - new Date(a.downloadedAt).getTime()
      );

      // Delete old versions
      const toDelete = models.slice(this.config.fallbackVersions);
      for (const cached of toDelete) {
        console.log(
          `[ModelManager] Deleting old version: ${cached.metadata.name} v${cached.metadata.version}`
        );
        await this.deleteModel(cached.metadata.name, cached.metadata.version);
      }
    }
  }

  /**
   * Get total cache size
   * 
   * @returns Cache size in bytes
   */
  private async getCacheSize(): Promise<number> {
    let totalSize = 0;

    for (const cached of this.cache.values()) {
      try {
        const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
        if (fileInfo.exists && 'size' in fileInfo) {
          totalSize += fileInfo.size;
        }
      } catch {}
    }

    return totalSize;
  }

  /**
   * Load cache index from disk
   */
  private async loadCacheIndex(): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(this.cacheFile);
      if (!fileInfo.exists) {
        return;
      }

      const content = await FileSystem.readAsStringAsync(this.cacheFile);
      const data = JSON.parse(content);

      this.cache.clear();
      for (const [key, value] of Object.entries(data)) {
        this.cache.set(key, value as CachedModel);
      }
    } catch (error) {
      console.error('[ModelManager] Error loading cache index:', error);
    }
  }

  /**
   * Save cache index to disk
   */
  private async saveCacheIndex(): Promise<void> {
    try {
      const data = Object.fromEntries(this.cache.entries());
      await FileSystem.writeAsStringAsync(
        this.cacheFile,
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.error('[ModelManager] Error saving cache index:', error);
    }
  }

  /**
   * Get cache key for model
   */
  private getCacheKey(metadata: ModelMetadata): string {
    return `${metadata.name}_${metadata.version}`;
  }
}

/**
 * Get default model manager instance
 */
export function getModelManager(config?: ModelManagerConfig): ModelManager {
  return ModelManager.getInstance(config);
}
