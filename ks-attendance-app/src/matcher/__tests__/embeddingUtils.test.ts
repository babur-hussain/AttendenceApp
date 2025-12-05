/**
 * Embedding Utils Tests
 * 
 * Tests for quantization, TOON packing, and accuracy validation.
 */

import {
  quantizeEmbedding,
  dequantizeEmbedding,
  packEmbeddingToToon,
  unpackEmbeddingFromToon,
  computeEmbeddingChecksum,
  estimateQuantizationError,
  testQuantizationAccuracy,
  QuantizationParams,
} from '../embeddingUtils';

import { cosineSimilarity } from '../faceMatcher';

describe('Embedding Utils', () => {
  describe('quantization round-trip', () => {
    it('should quantize and dequantize with minimal loss (8-bit)', () => {
      const original = new Float32Array(512);
      for (let i = 0; i < original.length; i++) {
        original[i] = Math.random() * 2 - 1; // [-1, 1]
      }
      
      const { buffer, params } = quantizeEmbedding(original, 8);
      const reconstructed = dequantizeEmbedding(buffer, params);
      
      expect(reconstructed.length).toBe(original.length);
      
      // Check similarity
      const similarity = cosineSimilarity(original, reconstructed, true);
      expect(similarity).toBeGreaterThan(0.99); // <1% loss
    });
    
    it('should handle 16-bit quantization', () => {
      const original = new Float32Array(256);
      for (let i = 0; i < original.length; i++) {
        original[i] = Math.random() * 10 - 5; // [-5, 5]
      }
      
      const { buffer, params } = quantizeEmbedding(original, 16);
      const reconstructed = dequantizeEmbedding(buffer, params);
      
      const similarity = cosineSimilarity(original, reconstructed, true);
      expect(similarity).toBeGreaterThan(0.999); // <0.1% loss
    });
    
    it('should achieve size reduction', () => {
      const original = new Float32Array(512);
      for (let i = 0; i < original.length; i++) {
        original[i] = Math.random();
      }
      
      const { buffer } = quantizeEmbedding(original, 8);
      
      const originalSize = original.length * 4; // 4 bytes per float
      const quantizedSize = buffer.length;
      
      expect(quantizedSize).toBeLessThan(originalSize);
      expect(quantizedSize).toBe(original.length); // 1 byte per value
    });
    
    it('should preserve scale and zeroPoint', () => {
      const original = new Float32Array([1, 2, 3, 4, 5]);
      const { params } = quantizeEmbedding(original, 8);
      
      expect(params.scale).toBeGreaterThan(0);
      expect(params.zeroPoint).toBeGreaterThanOrEqual(0);
      expect(params.zeroPoint).toBeLessThanOrEqual(255);
      expect(params.bits).toBe(8);
      expect(params.dimensions).toBe(5);
    });
  });
  
  describe('packEmbeddingToToon', () => {
    it('should produce valid TOON tokens', () => {
      const embedding = new Float32Array(512);
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = Math.random();
      }
      
      const tokens = packEmbeddingToToon(embedding, 8);
      
      expect(tokens.F2_DATA).toBeDefined();
      expect(typeof tokens.F2_DATA).toBe('string');
      expect(tokens.F2_DATA.length).toBeGreaterThan(0);
      
      expect(tokens.F2_META).toBeDefined();
      expect(tokens.F2_META).toMatch(/^\d+\|\d+\|[\d.]+\|[\d.]+$/);
      
      expect(tokens.F2_DIM).toBe(512);
    });
    
    it('should parse F2_META correctly', () => {
      const embedding = new Float32Array(128);
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = Math.random();
      }
      
      const tokens = packEmbeddingToToon(embedding, 8);
      const parts = tokens.F2_META.split('|');
      
      expect(parts).toHaveLength(4);
      expect(parseInt(parts[0])).toBe(128); // dimensions
      expect(parseInt(parts[1])).toBe(8); // bits
      expect(parseFloat(parts[2])).toBeGreaterThan(0); // scale
      expect(parseFloat(parts[3])).toBeGreaterThanOrEqual(0); // zeroPoint
    });
  });
  
  describe('unpackEmbeddingFromToon', () => {
    it('should unpack packed embedding', () => {
      const original = new Float32Array(256);
      for (let i = 0; i < original.length; i++) {
        original[i] = Math.random() * 2 - 1;
      }
      
      const tokens = packEmbeddingToToon(original, 8);
      const unpacked = unpackEmbeddingFromToon(tokens);
      
      expect(unpacked.length).toBe(original.length);
      
      const similarity = cosineSimilarity(original, unpacked, true);
      expect(similarity).toBeGreaterThan(0.99);
    });
    
    it('should handle different bit depths', () => {
      const original = new Float32Array(64);
      for (let i = 0; i < original.length; i++) {
        original[i] = Math.random();
      }
      
      for (const bits of [8, 16]) {
        const tokens = packEmbeddingToToon(original, bits);
        const unpacked = unpackEmbeddingFromToon(tokens);
        
        expect(unpacked.length).toBe(original.length);
      }
    });
    
    it('should throw on invalid tokens', () => {
      const invalidTokens = {
        F2_DATA: 'invalid_base64!!!',
        F2_META: '512|8|0.1|128',
        F2_DIM: 512,
      };
      
      expect(() => unpackEmbeddingFromToon(invalidTokens)).toThrow();
    });
  });
  
  describe('computeEmbeddingChecksum', () => {
    it('should produce consistent checksum', () => {
      const embedding = new Float32Array([1, 2, 3, 4, 5]);
      const { buffer: buffer1 } = quantizeEmbedding(embedding);
      const { buffer: buffer2 } = quantizeEmbedding(embedding);
      
      const checksum1 = computeEmbeddingChecksum(buffer1);
      const checksum2 = computeEmbeddingChecksum(buffer2);
      
      expect(checksum1).toBe(checksum2);
    });
    
    it('should differ for different embeddings', () => {
      const emb1 = new Float32Array([1, 2, 3, 4, 5]);
      const emb2 = new Float32Array([1, 2, 3, 4, 6]);
      
      const { buffer: buffer1 } = quantizeEmbedding(emb1);
      const { buffer: buffer2 } = quantizeEmbedding(emb2);
      
      const checksum1 = computeEmbeddingChecksum(buffer1);
      const checksum2 = computeEmbeddingChecksum(buffer2);
      
      expect(checksum1).not.toBe(checksum2);
    });
    
    it('should be case-sensitive', () => {
      const embedding = new Float32Array([1.5, 2.5, 3.5]);
      const { buffer } = quantizeEmbedding(embedding);
      const checksum = computeEmbeddingChecksum(buffer);
      
      expect(typeof checksum).toBe('string');
      expect(checksum.length).toBeGreaterThan(0);
    });
  });
  
  describe('estimateQuantizationError', () => {
    it('should compute RMSE', () => {
      const original = new Float32Array([1, 2, 3, 4, 5]);
      
      const rmse = estimateQuantizationError(original, 8);
      
      expect(rmse).toBeGreaterThanOrEqual(0);
      expect(rmse).toBeLessThan(1); // Should be small for 8-bit
    });
    
    it('should be small for normalized embeddings', () => {
      const original = new Float32Array([1, 2, 3, 4, 5]);
      
      const rmse = estimateQuantizationError(original, 8);
      
      expect(rmse).toBe(0);
    });
    
    it('should be smaller with more bits', () => {
      const original = new Float32Array([1, 2, 3, 4, 5]);
      
      const rmse8 = estimateQuantizationError(original, 8);
      const rmse16 = estimateQuantizationError(original, 16);
      
      expect(rmse16).toBeLessThanOrEqual(rmse8);
    });
  });
  
  describe('testQuantizationAccuracy', () => {
    it('should report high accuracy for 8-bit', () => {
      const embedding = new Float32Array(512);
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = Math.random() * 2 - 1;
      }
      
      const accuracy = testQuantizationAccuracy(embedding, 8);
      
      expect(accuracy).toBeGreaterThan(99); // >99%
    });
    
    it('should show 16-bit is more accurate than 8-bit', () => {
      const embedding = new Float32Array(256);
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = Math.random() * 10 - 5;
      }
      
      const accuracy8 = testQuantizationAccuracy(embedding, 8);
      const accuracy16 = testQuantizationAccuracy(embedding, 16);
      
      expect(accuracy16).toBeGreaterThanOrEqual(accuracy8);
    });
    
    it('should handle edge cases', () => {
      // All zeros
      const zeros = new Float32Array(128).fill(0);
      const accZeros = testQuantizationAccuracy(zeros, 8);
      expect(accZeros).toBeGreaterThan(95);
      
      // All same value
      const same = new Float32Array(128).fill(5.5);
      const accSame = testQuantizationAccuracy(same, 8);
      expect(accSame).toBeGreaterThan(95);
    });
  });
  
  describe('base64 encoding', () => {
    it('should encode and decode correctly', () => {
      const embedding = new Float32Array(128);
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = Math.random();
      }
      
      const tokens = packEmbeddingToToon(embedding, 8);
      const unpacked = unpackEmbeddingFromToon(tokens);
      
      // Should match original dimensions
      expect(unpacked.length).toBe(embedding.length);
      
      // Should be numerically close
      for (let i = 0; i < embedding.length; i++) {
        expect(Math.abs(unpacked[i] - embedding[i])).toBeLessThan(0.1);
      }
    });
  });
  
  describe('performance', () => {
    it('should quantize quickly', () => {
      const embedding = new Float32Array(512);
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = Math.random();
      }
      
      const iterations = 1000;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        quantizeEmbedding(embedding, 8);
      }
      
      const elapsed = Date.now() - start;
      const perOp = elapsed / iterations;
      
      expect(perOp).toBeLessThan(1); // <1ms per quantization
    });
    
    it('should pack to TOON quickly', () => {
      const embedding = new Float32Array(512);
      for (let i = 0; i < embedding.length; i++) {
        embedding[i] = Math.random();
      }
      
      const iterations = 1000;
      const start = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        packEmbeddingToToon(embedding, 8);
      }
      
      const elapsed = Date.now() - start;
      const perOp = elapsed / iterations;
      
      expect(perOp).toBeLessThan(2); // <2ms per pack
    });
  });
});
