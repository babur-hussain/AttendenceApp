/**
 * Nonce Store
 * Tracks used nonces for replay protection
 */

import { DatabaseManager } from '../db/DatabaseManager';

export class NonceStore {
  private static instance: NonceStore;
  private db: DatabaseManager;
  
  // In-memory cache for fast lookups (LRU-like, last 1000 per device)
  private memoryCache: Map<string, Set<string>> = new Map();
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly NONCE_TTL_HOURS = 24;

  private constructor() {
    this.db = DatabaseManager.getInstance();
  }

  static getInstance(): NonceStore {
    if (!NonceStore.instance) {
      NonceStore.instance = new NonceStore();
    }
    return NonceStore.instance;
  }

  /**
   * Check if nonce has been used (and mark as used if not)
   * @param deviceId - Device ID
   * @param nonce - Nonce to check
   * @returns True if nonce is fresh (not used), false if reused
   */
  async checkAndMarkNonce(deviceId: string, nonce: string): Promise<boolean> {
    // Check memory cache first (fast path)
    const deviceNonces = this.memoryCache.get(deviceId);
    if (deviceNonces && deviceNonces.has(nonce)) {
      console.warn(`[NonceStore] Nonce reuse detected in cache: ${deviceId}, ${nonce}`);
      return false; // Nonce already used
    }

    // Check database
    const nonceHash = this.hashNonce(nonce);
    const existing = await this.db.get<{ nonce_hash: string }>(
      'SELECT nonce_hash FROM device_nonces WHERE nonce_hash = ? AND device_id = ?',
      [nonceHash, deviceId]
    );

    if (existing) {
      console.warn(`[NonceStore] Nonce reuse detected in DB: ${deviceId}, ${nonce}`);
      return false; // Nonce already used
    }

    // Mark nonce as used
    await this.markNonceUsed(deviceId, nonce);
    return true; // Nonce is fresh
  }

  /**
   * Mark nonce as used (store in DB and cache)
   * @param deviceId - Device ID
   * @param nonce - Nonce to mark
   */
  private async markNonceUsed(deviceId: string, nonce: string): Promise<void> {
    const nonceHash = this.hashNonce(nonce);
    const expiresAt = new Date(Date.now() + this.NONCE_TTL_HOURS * 60 * 60 * 1000).toISOString();

    // Store in database
    await this.db.run(
      `INSERT INTO device_nonces (nonce_hash, device_id, expires_at)
       VALUES (?, ?, ?)`,
      [nonceHash, deviceId, expiresAt]
    );

    // Store in memory cache
    let deviceNonces = this.memoryCache.get(deviceId);
    if (!deviceNonces) {
      deviceNonces = new Set<string>();
      this.memoryCache.set(deviceId, deviceNonces);
    }

    deviceNonces.add(nonce);

    // Trim cache if too large (LRU-like eviction)
    if (deviceNonces.size > this.MAX_CACHE_SIZE) {
      const noncesArray = Array.from(deviceNonces);
      const toRemove = noncesArray.slice(0, noncesArray.length - this.MAX_CACHE_SIZE);
      toRemove.forEach(n => deviceNonces!.delete(n));
    }
  }

  /**
   * Clean up expired nonces from database
   * Should be called periodically (e.g., daily cron job)
   */
  async cleanupExpiredNonces(): Promise<number> {
    const result = await this.db.run(
      'DELETE FROM device_nonces WHERE expires_at < ?',
      [new Date().toISOString()]
    );
    
    const deletedCount = result;
    console.log(`[NonceStore] Cleaned up ${deletedCount} expired nonces`);
    return deletedCount;
  }

  /**
   * Get nonce usage statistics for a device
   * @param deviceId - Device ID
   * @returns Stats object
   */
  async getDeviceNonceStats(deviceId: string): Promise<{
    totalNonces: number;
    oldestNonce: string | null;
    newestNonce: string | null;
  }> {
    const result = await this.db.get<{
      total: number;
      oldest: string | null;
      newest: string | null;
    }>(
      `SELECT 
        COUNT(*) as total,
        MIN(used_at) as oldest,
        MAX(used_at) as newest
       FROM device_nonces
       WHERE device_id = ?`,
      [deviceId]
    );

    return {
      totalNonces: result?.total || 0,
      oldestNonce: result?.oldest || null,
      newestNonce: result?.newest || null,
    };
  }

  /**
   * Hash nonce for storage (SHA256)
   * @param nonce - Original nonce
   * @returns Hex-encoded hash
   */
  private hashNonce(nonce: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(nonce).digest('hex');
  }

  /**
   * Clear memory cache (for testing or memory management)
   */
  clearCache(): void {
    this.memoryCache.clear();
    console.log('[NonceStore] Memory cache cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { devices: number; totalNonces: number } {
    let totalNonces = 0;
    for (const nonces of this.memoryCache.values()) {
      totalNonces += nonces.size;
    }
    return {
      devices: this.memoryCache.size,
      totalNonces,
    };
  }
}
