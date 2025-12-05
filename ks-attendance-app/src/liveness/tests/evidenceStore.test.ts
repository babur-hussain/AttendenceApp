/**
 * Evidence Store Tests
 * 
 * Tests for encrypted evidence storage with TTL.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  storeEvidence,
  getEvidence,
  deleteEvidence,
  verifyEvidence,
  initEvidenceStore,
  type EvidenceType,
} from '../evidenceStore';

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  // @ts-ignore - Jest mock return type inference issue
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  // @ts-ignore - Jest mock return type inference issue
  getItemAsync: jest.fn().mockResolvedValue(null),
  // @ts-ignore - Jest mock return type inference issue
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-crypto
jest.mock('expo-crypto', () => ({
  // @ts-ignore - Jest mock return type inference issue
  digestStringAsync: jest.fn().mockResolvedValue('mock_checksum_1234567890abcdef'),
  CryptoDigestAlgorithm: {
    SHA256: 'SHA-256',
  },
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234-5678-90ab-cdef'),
}));

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

describe('Evidence Store', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('storeEvidence', () => {
    it('should store evidence with metadata', async () => {
      const blob = new Uint8Array([1, 2, 3, 4, 5]);
      const metadata = {
        type: 'frame_hashes' as EvidenceType,
        sessionId: 'test_session',
        deviceId: 'test_device',
        consentToken: 'C1_consent',
      };

      const LVID = await storeEvidence(blob, metadata);

      expect(LVID).toMatch(/^LVID_[a-f0-9]{16}_[a-f0-9]{8}$/);
      expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2); // Blob + metadata
    });

    it('should reject evidence without consent', async () => {
      const blob = new Uint8Array([1, 2, 3]);
      const metadata = {
        type: 'frame_hashes' as EvidenceType,
        sessionId: 'test_session',
        deviceId: 'test_device',
        // No consentToken
      };

      await expect(storeEvidence(blob, metadata)).rejects.toThrow('Consent token (C1) required');
    });

    it('should reject oversized evidence', async () => {
      const blob = new Uint8Array(10 * 1024 * 1024); // 10MB
      const metadata = {
        type: 'frame_hashes' as EvidenceType,
        sessionId: 'test_session',
        deviceId: 'test_device',
        consentToken: 'C1_consent',
      };

      await expect(storeEvidence(blob, metadata)).rejects.toThrow('exceeds limit');
    });

    it('should compute checksum correctly', async () => {
      const blob = new Uint8Array([1, 2, 3, 4, 5]);
      const metadata = {
        type: 'frame_hashes' as EvidenceType,
        sessionId: 'test_session',
        deviceId: 'test_device',
        consentToken: 'C1_consent',
      };

      await storeEvidence(blob, metadata);

      expect(Crypto.digestStringAsync).toHaveBeenCalled();
    });
  });

  describe('getEvidence', () => {
    it('should retrieve evidence with valid LVID', async () => {
      const mockMetadata = {
        LVID: 'LVID_test',
        type: 'frame_hashes',
        sessionId: 'test_session',
        deviceId: 'test_device',
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(), // 24h from now
        encryptionLevel: 'standard',
        size: 5,
        checksum: 'mock_checksum_1234567890abcdef',
      };

      const mockBlob = new Uint8Array([1, 2, 3, 4, 5]);
      const mockBlobBase64 = btoa(String.fromCharCode(...mockBlob));

      const mockGet = SecureStore.getItemAsync as jest.Mock;
      // @ts-ignore - Jest mock return type inference issue
      mockGet.mockResolvedValueOnce(JSON.stringify(mockMetadata));
      // @ts-ignore - Jest mock return type inference issue
      mockGet.mockResolvedValueOnce(mockBlobBase64);

      const evidence = await getEvidence('LVID_test');

      expect(evidence).toBeDefined();
      expect(evidence?.metadata.LVID).toBe('LVID_test');
    });

    it('should return null for expired evidence', async () => {
      const mockMetadata = {
        LVID: 'LVID_test',
        type: 'frame_hashes',
        sessionId: 'test_session',
        deviceId: 'test_device',
        timestamp: new Date(Date.now() - 86400000).toISOString(), // 24h ago
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // Expired 1h ago
        encryptionLevel: 'standard',
        size: 5,
        checksum: 'test_checksum',
      };

      // @ts-ignore - Jest mock return type inference issue
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockMetadata));

      const evidence = await getEvidence('LVID_test');

      expect(evidence).toBeNull();
    });

    it('should retrieve expired evidence with includeExpired flag', async () => {
      const mockMetadata = {
        LVID: 'LVID_test',
        type: 'frame_hashes',
        sessionId: 'test_session',
        deviceId: 'test_device',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        expiresAt: new Date(Date.now() - 3600000).toISOString(), // Expired
        encryptionLevel: 'standard',
        size: 5,
        checksum: 'mock_checksum_1234567890abcdef',
      };

      const mockBlob = new Uint8Array([1, 2, 3, 4, 5]);
      const mockBlobBase64 = btoa(String.fromCharCode(...mockBlob));

      const mockGet = SecureStore.getItemAsync as jest.Mock;
      // @ts-ignore - Jest mock return type inference issue
      mockGet.mockResolvedValueOnce(JSON.stringify(mockMetadata));
      // @ts-ignore - Jest mock return type inference issue
      mockGet.mockResolvedValueOnce(mockBlobBase64);

      const evidence = await getEvidence('LVID_test', { includeExpired: true });

      expect(evidence).toBeDefined();
    });

    it('should return null for non-existent evidence', async () => {
      // @ts-ignore - Jest mock return type inference issue
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const evidence = await getEvidence('LVID_nonexistent');

      expect(evidence).toBeNull();
    });
  });

  describe('deleteEvidence', () => {
    it('should delete evidence and metadata', async () => {
      const mockMetadata = {
        LVID: 'LVID_test',
        type: 'frame_hashes',
        sessionId: 'test_session',
        deviceId: 'test_device',
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        encryptionLevel: 'standard',
        size: 5,
        checksum: 'test_checksum',
      };

      // @ts-ignore - Jest mock return type inference issue
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockMetadata));

      const result = await deleteEvidence('LVID_test');

      expect(result).toBe(true);
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(2); // Metadata + blob
    });

    it('should return false for non-existent evidence', async () => {
      // @ts-ignore - Jest mock return type inference issue
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const result = await deleteEvidence('LVID_nonexistent');

      expect(result).toBe(false);
    });
  });

  describe('verifyEvidence', () => {
    it('should verify valid evidence', async () => {
      const mockMetadata = {
        LVID: 'LVID_test',
        type: 'frame_hashes',
        sessionId: 'test_session',
        deviceId: 'test_device',
        timestamp: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        encryptionLevel: 'standard',
        size: 5,
        checksum: 'mock_checksum_1234567890abcdef',
      };

      const mockBlob = new Uint8Array([1, 2, 3, 4, 5]);
      const mockBlobBase64 = btoa(String.fromCharCode(...mockBlob));

      const mockGet = SecureStore.getItemAsync as jest.Mock;
      // @ts-ignore - Jest mock return type inference issue
      mockGet.mockResolvedValueOnce(JSON.stringify(mockMetadata));
      // @ts-ignore - Jest mock return type inference issue
      mockGet.mockResolvedValueOnce(mockBlobBase64);

      const isValid = await verifyEvidence('LVID_test');

      expect(isValid).toBe(true);
    });

    it('should return false for invalid evidence', async () => {
      // @ts-ignore - Jest mock return type inference issue
      (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

      const isValid = await verifyEvidence('LVID_invalid');

      expect(isValid).toBe(false);
    });
  });

  describe('initEvidenceStore', () => {
    it('should initialize with default config', async () => {
      await initEvidenceStore();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should initialize with custom config', async () => {
      await initEvidenceStore({
        ttlHours: 48,
        encryptionLevel: 'high',
        autoCleanup: false,
      });

      expect(true).toBe(true);
    });
  });
});
