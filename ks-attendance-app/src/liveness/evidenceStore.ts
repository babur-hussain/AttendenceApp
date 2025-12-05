/**
 * Liveness Evidence Store
 * 
 * Securely stores and manages liveness evidence with encryption and TTL.
 * Supports LVID token generation and GDPR-compliant deletion.
 */

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Evidence blob types
 */
export type EvidenceType = 'frame_hashes' | 'landmark_summary' | 'full_frames' | 'audit_log';

/**
 * Evidence metadata
 */
export interface EvidenceMetadata {
  LVID: string;                // Unique evidence ID
  type: EvidenceType;          // Type of evidence
  sessionId: string;           // Session ID (SID1)
  deviceId: string;            // Device ID (DID1)
  employeeId?: string;         // Employee ID if known
  timestamp: string;           // Creation timestamp
  expiresAt: string;           // Expiration timestamp
  consentToken?: string;       // C1 consent token
  encryptionLevel: 'none' | 'standard' | 'high';
  size: number;                // Size in bytes
  checksum: string;            // SHA-256 checksum
}

/**
 * Evidence data structure
 */
export interface EvidenceData {
  metadata: EvidenceMetadata;
  blob: Uint8Array;            // Encrypted evidence blob
}

/**
 * Evidence store configuration
 */
export interface EvidenceStoreConfig {
  ttlHours: number;            // Default TTL in hours (default: 24)
  encryptionLevel: 'none' | 'standard' | 'high';
  maxSize: number;             // Max evidence size in bytes (default: 5MB)
  autoCleanup: boolean;        // Auto-cleanup expired evidence
}

/**
 * Default evidence store configuration
 */
const DEFAULT_CONFIG: EvidenceStoreConfig = {
  ttlHours: 24,
  encryptionLevel: 'standard',
  maxSize: 5 * 1024 * 1024, // 5MB
  autoCleanup: true,
};

// Store key prefix
const EVIDENCE_PREFIX = 'liveness_evidence_';
const METADATA_PREFIX = 'liveness_metadata_';

/**
 * Generate LVID (Liveness Evidence ID)
 * 
 * Format: LVID_<uuid>_<checksum_prefix>
 * 
 * @param checksum SHA-256 checksum
 * @returns LVID token
 */
function generateLVID(checksum: string): string {
  const uuid = uuidv4().replace(/-/g, '').slice(0, 16); // 16-char UUID
  const checksumPrefix = checksum.slice(0, 8); // First 8 chars of checksum
  return `LVID_${uuid}_${checksumPrefix}`;
}

/**
 * Encrypt evidence blob
 * 
 * @param blob Evidence data
 * @param level Encryption level
 * @param key Optional encryption key
 * @returns Encrypted blob
 */
async function encryptBlob(
  blob: Uint8Array,
  level: 'none' | 'standard' | 'high',
  key?: string
): Promise<Uint8Array> {
  if (level === 'none') {
    return blob;
  }

  // TODO: Implement actual encryption using expo-crypto
  // For now, XOR with a derived key (placeholder)
  
  const derivedKey = key 
    ? await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, key)
    : await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, 'liveness_evidence_key');

  const keyBytes = new TextEncoder().encode(derivedKey);
  const encrypted = new Uint8Array(blob.length);

  for (let i = 0; i < blob.length; i++) {
    encrypted[i] = blob[i] ^ keyBytes[i % keyBytes.length];
  }

  return encrypted;
}

/**
 * Decrypt evidence blob
 * 
 * @param blob Encrypted blob
 * @param level Encryption level
 * @param key Optional encryption key
 * @returns Decrypted blob
 */
async function decryptBlob(
  blob: Uint8Array,
  level: 'none' | 'standard' | 'high',
  key?: string
): Promise<Uint8Array> {
  if (level === 'none') {
    return blob;
  }

  // Same as encryption (XOR is symmetric)
  return encryptBlob(blob, level, key);
}

/**
 * Store liveness evidence
 * 
 * @param blob Evidence data (frame hashes, landmarks, etc.)
 * @param metadata Evidence metadata
 * @param config Store configuration
 * @returns LVID token
 */
export async function storeEvidence(
  blob: Uint8Array,
  metadata: {
    type: EvidenceType;
    sessionId: string;
    deviceId: string;
    employeeId?: string;
    consentToken?: string;
  },
  config: Partial<EvidenceStoreConfig> = {}
): Promise<string> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  // Check size limit
  if (blob.length > fullConfig.maxSize) {
    throw new Error(`Evidence size (${blob.length}) exceeds limit (${fullConfig.maxSize})`);
  }

  // Check consent (required for evidence storage)
  if (!metadata.consentToken) {
    throw new Error('Consent token (C1) required for evidence storage');
  }

  // Compute checksum
  const checksum = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    Array.from(blob).map(b => String.fromCharCode(b)).join('')
  );

  // Generate LVID
  const LVID = generateLVID(checksum);

  // Encrypt blob
  const encryptedBlob = await encryptBlob(blob, fullConfig.encryptionLevel);

  // Compute expiration
  const now = new Date();
  const expiresAt = new Date(now.getTime() + fullConfig.ttlHours * 60 * 60 * 1000);

  // Create metadata
  const evidenceMetadata: EvidenceMetadata = {
    LVID,
    type: metadata.type,
    sessionId: metadata.sessionId,
    deviceId: metadata.deviceId,
    employeeId: metadata.employeeId,
    timestamp: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    consentToken: metadata.consentToken,
    encryptionLevel: fullConfig.encryptionLevel,
    size: blob.length,
    checksum,
  };

  // Store encrypted blob
  const blobKey = EVIDENCE_PREFIX + LVID;
  const blobBase64 = btoa(String.fromCharCode(...encryptedBlob));
  await SecureStore.setItemAsync(blobKey, blobBase64);

  // Store metadata
  const metadataKey = METADATA_PREFIX + LVID;
  await SecureStore.setItemAsync(metadataKey, JSON.stringify(evidenceMetadata));

  console.log('[EvidenceStore] Stored evidence:', LVID, 'Size:', blob.length, 'Expires:', expiresAt.toISOString());

  return LVID;
}

/**
 * Retrieve liveness evidence
 * 
 * @param LVID Evidence ID
 * @param options Retrieval options
 * @returns Evidence data or null if not found/expired
 */
export async function getEvidence(
  LVID: string,
  options: {
    includeExpired?: boolean;  // Retrieve even if expired
    auditToken?: string;       // AUD1 audit token for logging
  } = {}
): Promise<EvidenceData | null> {
  const { includeExpired = false, auditToken } = options;

  try {
    // Retrieve metadata
    const metadataKey = METADATA_PREFIX + LVID;
    const metadataJson = await SecureStore.getItemAsync(metadataKey);

    if (!metadataJson) {
      console.log('[EvidenceStore] Evidence not found:', LVID);
      return null;
    }

    const metadata: EvidenceMetadata = JSON.parse(metadataJson);

    // Check expiration
    const now = new Date();
    const expiresAt = new Date(metadata.expiresAt);

    if (!includeExpired && expiresAt < now) {
      console.log('[EvidenceStore] Evidence expired:', LVID, 'Expired at:', expiresAt.toISOString());
      return null;
    }

    // Retrieve encrypted blob
    const blobKey = EVIDENCE_PREFIX + LVID;
    const blobBase64 = await SecureStore.getItemAsync(blobKey);

    if (!blobBase64) {
      console.log('[EvidenceStore] Evidence blob missing:', LVID);
      return null;
    }

    // Decode and decrypt
    const encryptedBlob = new Uint8Array(
      atob(blobBase64).split('').map(c => c.charCodeAt(0))
    );

    const blob = await decryptBlob(encryptedBlob, metadata.encryptionLevel);

    // Verify checksum
    const checksum = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      Array.from(blob).map(b => String.fromCharCode(b)).join('')
    );

    if (checksum !== metadata.checksum) {
      console.error('[EvidenceStore] Checksum mismatch:', LVID);
      throw new Error('Evidence integrity check failed');
    }

    // Log access (audit trail)
    if (auditToken) {
      console.log('[EvidenceStore] Evidence accessed:', LVID, 'Audit:', auditToken);
      // TODO: Store audit log in separate store
    }

    return { metadata, blob };
  } catch (error) {
    console.error('[EvidenceStore] Error retrieving evidence:', error);
    return null;
  }
}

/**
 * Delete liveness evidence
 * 
 * @param LVID Evidence ID
 * @returns True if deleted, false if not found
 */
export async function deleteEvidence(LVID: string): Promise<boolean> {
  try {
    const metadataKey = METADATA_PREFIX + LVID;
    const blobKey = EVIDENCE_PREFIX + LVID;

    // Check if exists
    const metadataJson = await SecureStore.getItemAsync(metadataKey);
    if (!metadataJson) {
      console.log('[EvidenceStore] Evidence not found for deletion:', LVID);
      return false;
    }

    // Delete both metadata and blob
    await SecureStore.deleteItemAsync(metadataKey);
    await SecureStore.deleteItemAsync(blobKey);

    console.log('[EvidenceStore] Deleted evidence:', LVID);

    return true;
  } catch (error) {
    console.error('[EvidenceStore] Error deleting evidence:', error);
    return false;
  }
}

/**
 * List all evidence metadata
 * 
 * @param options Filtering options
 * @returns Array of evidence metadata
 */
export async function listEvidence(options: {
  includeExpired?: boolean;
  sessionId?: string;
  deviceId?: string;
  employeeId?: string;
} = {}): Promise<EvidenceMetadata[]> {
  const { includeExpired = false, sessionId, deviceId, employeeId } = options;

  // NOTE: SecureStore doesn't support listing keys
  // This is a limitation - in production, use a separate index
  
  console.warn('[EvidenceStore] listEvidence not fully supported with SecureStore');
  
  // TODO: Implement index-based listing
  // For now, return empty array
  return [];
}

/**
 * Clean up expired evidence
 * 
 * @returns Number of items deleted
 */
export async function cleanupExpired(): Promise<number> {
  console.log('[EvidenceStore] Cleanup expired evidence');

  // NOTE: SecureStore doesn't support listing keys
  // This requires maintaining a separate index
  
  // TODO: Implement index-based cleanup
  // For now, return 0
  return 0;
}

/**
 * Get evidence store statistics
 * 
 * @returns Store statistics
 */
export async function getStoreStats(): Promise<{
  totalCount: number;
  expiredCount: number;
  totalSize: number;
}> {
  // NOTE: Not supported with SecureStore without index
  
  console.warn('[EvidenceStore] Stats not fully supported with SecureStore');
  
  return {
    totalCount: 0,
    expiredCount: 0,
    totalSize: 0,
  };
}

/**
 * Verify evidence integrity
 * 
 * @param LVID Evidence ID
 * @returns True if valid, false otherwise
 */
export async function verifyEvidence(LVID: string): Promise<boolean> {
  try {
    const evidence = await getEvidence(LVID, { includeExpired: true });
    return evidence !== null;
  } catch (error) {
    console.error('[EvidenceStore] Verification failed:', error);
    return false;
  }
}

/**
 * Export evidence for admin review
 * 
 * Requires audit token (AUD1) for access control.
 * 
 * @param LVID Evidence ID
 * @param auditToken Audit token
 * @returns Evidence data with metadata
 */
export async function exportEvidenceForReview(
  LVID: string,
  auditToken: string
): Promise<{
  metadata: EvidenceMetadata;
  blob: Uint8Array;
  exportedAt: string;
  exportedBy: string;
} | null> {
  if (!auditToken) {
    throw new Error('Audit token (AUD1) required for evidence export');
  }

  const evidence = await getEvidence(LVID, { includeExpired: true, auditToken });

  if (!evidence) {
    return null;
  }

  return {
    metadata: evidence.metadata,
    blob: evidence.blob,
    exportedAt: new Date().toISOString(),
    exportedBy: auditToken,
  };
}

/**
 * Initialize evidence store
 * 
 * Performs auto-cleanup if configured.
 * 
 * @param config Store configuration
 */
export async function initEvidenceStore(config: Partial<EvidenceStoreConfig> = {}): Promise<void> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };

  console.log('[EvidenceStore] Initializing with config:', fullConfig);

  if (fullConfig.autoCleanup) {
    const deletedCount = await cleanupExpired();
    console.log('[EvidenceStore] Auto-cleanup deleted', deletedCount, 'expired items');
  }
}
