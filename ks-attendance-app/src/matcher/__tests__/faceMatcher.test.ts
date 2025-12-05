/**
 * Face Matcher Tests
 * 
 * Tests for similarity computation, embedding matching,
 * and candidate selection.
 */

import {
  cosineSimilarity,
  euclideanDistance,
  matchEmbedding,
  normalizeVector,
  createCachedEmbedding,
  fastCosineSimilarity,
  findBestMatch,
  findTopKMatches,
  assertEmbeddingShape,
} from '../faceMatcher';

describe('Face Matcher', () => {
  describe('cosineSimilarity', () => {
    it('should return 1.0 for identical vectors', () => {
      const a = new Float32Array([1, 2, 3, 4]);
      const b = new Float32Array([1, 2, 3, 4]);
      
      const similarity = cosineSimilarity(a, b, true);
      expect(similarity).toBeCloseTo(1.0, 4);
    });
    
    it('should return 0.0 for orthogonal vectors', () => {
      const a = new Float32Array([1, 0, 0]);
      const b = new Float32Array([0, 1, 0]);
      
      const similarity = cosineSimilarity(a, b, true);
      expect(similarity).toBeCloseTo(0.0, 4);
    });
    
    it('should return -1.0 for opposite vectors', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([-1, -2, -3]);
      
      const similarity = cosineSimilarity(a, b, true);
      expect(similarity).toBeCloseTo(-1.0, 4);
    });
    
    it('should handle zero-norm vectors', () => {
      const a = new Float32Array([0, 0, 0]);
      const b = new Float32Array([1, 2, 3]);
      
      const similarity = cosineSimilarity(a, b, true);
      expect(similarity).toBe(0);
    });
    
    it('should normalize vectors when normalize=true', () => {
      const a = new Float32Array([2, 4, 6]);
      const b = new Float32Array([1, 2, 3]);
      
      const similarity = cosineSimilarity(a, b, true);
      expect(similarity).toBeCloseTo(1.0, 4); // Same direction
    });
    
    it('should not normalize when normalize=false', () => {
      const a = new Float32Array([1, 0]);
      const b = new Float32Array([2, 0]);
      
      const simNormalized = cosineSimilarity(a, b, true);
      const simRaw = cosineSimilarity(a, b, false);
      
      expect(simNormalized).toBeCloseTo(1.0, 4);
      expect(simRaw).not.toBeCloseTo(1.0, 4);
    });
  });
  
  describe('euclideanDistance', () => {
    it('should return 0 for identical vectors', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([1, 2, 3]);
      
      const distance = euclideanDistance(a, b);
      expect(distance).toBe(0);
    });
    
    it('should compute correct distance', () => {
      const a = new Float32Array([0, 0]);
      const b = new Float32Array([3, 4]);
      
      const distance = euclideanDistance(a, b);
      expect(distance).toBe(5); // 3-4-5 triangle
    });
    
    it('should be symmetric', () => {
      const a = new Float32Array([1, 2, 3]);
      const b = new Float32Array([4, 5, 6]);
      
      const distAB = euclideanDistance(a, b);
      const distBA = euclideanDistance(b, a);
      
      expect(distAB).toBe(distBA);
    });
  });
  
  describe('normalizeVector', () => {
    it('should produce unit vector', () => {
      const vec = new Float32Array([3, 4]);
      const normalized = normalizeVector(vec);
      
      const norm = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
      expect(norm).toBeCloseTo(1.0, 4);
    });
    
    it('should handle zero vector', () => {
      const vec = new Float32Array([0, 0, 0]);
      const normalized = normalizeVector(vec);
      
      expect(normalized[0]).toBe(0);
      expect(normalized[1]).toBe(0);
      expect(normalized[2]).toBe(0);
    });
    
    it('should preserve direction', () => {
      const vec = new Float32Array([2, 4, 6]);
      const normalized = normalizeVector(vec);
      
      // Should maintain ratios
      expect(normalized[1] / normalized[0]).toBeCloseTo(2, 4);
      expect(normalized[2] / normalized[0]).toBeCloseTo(3, 4);
    });
  });
  
  describe('matchEmbedding', () => {
    it('should return high score for similar embeddings', () => {
      const live = new Float32Array([1, 2, 3, 4, 5]);
      const stored = new Float32Array([1.1, 2.1, 3.1, 4.1, 5.1]);
      
      const result = matchEmbedding(live, stored, 'cosine', true);
      
      expect(result.matchScore).toBeGreaterThan(0.95);
      expect(result.method).toBe('cosine');
      expect(result.normalized).toBe(true);
    });
    
    it('should return low score for dissimilar embeddings', () => {
      const live = new Float32Array([1, 2, 3, 4, 5]);
      const stored = new Float32Array([-1, -2, -3, -4, -5]);
      
      const result = matchEmbedding(live, stored, 'cosine', true);
      
      expect(result.matchScore).toBeLessThan(0.2);
    });
    
    it('should support euclidean method', () => {
      const live = new Float32Array([1, 2, 3]);
      const stored = new Float32Array([1, 2, 3]);
      
      const result = matchEmbedding(live, stored, 'euclidean', false);
      
      expect(result.method).toBe('euclidean');
      expect(result.distance).toBe(0);
    });
  });
  
  describe('createCachedEmbedding', () => {
    it('should cache normalized embedding', () => {
      const embedding = new Float32Array([3, 4]);
      const cached = createCachedEmbedding(embedding);
      
      expect(cached.normalized).toBeDefined();
      expect(cached.originalNorm).toBeCloseTo(5, 4); // sqrt(9 + 16)
      expect(cached.dimensions).toBe(2);
    });
    
    it('should normalize to unit vector', () => {
      const embedding = new Float32Array([3, 4]);
      const cached = createCachedEmbedding(embedding);
      
      const norm = Math.sqrt(
        cached.normalized[0] ** 2 + cached.normalized[1] ** 2
      );
      expect(norm).toBeCloseTo(1.0, 4);
    });
  });
  
  describe('fastCosineSimilarity', () => {
    it('should match cosineSimilarity result', () => {
      const a = new Float32Array([1, 2, 3, 4, 5]);
      const b = new Float32Array([2, 3, 4, 5, 6]);
      
      const cachedA = createCachedEmbedding(a);
      const cachedB = createCachedEmbedding(b);
      
      const fast = fastCosineSimilarity(a, cachedB);
      const regular = cosineSimilarity(a, b, true);
      
      expect(fast).toBeCloseTo(regular, 4);
    });
    
    it('should be faster than regular computation', () => {
      const dim = 512;
      const a = new Float32Array(dim).map(() => Math.random());
      const b = new Float32Array(dim).map(() => Math.random());
      
      const cachedA = createCachedEmbedding(a);
      const cachedB = createCachedEmbedding(b);
      
      // Warm up
      fastCosineSimilarity(a, cachedB);
      cosineSimilarity(a, b, true);
      
      const iterations = 1000;
      
      const startFast = Date.now();
      for (let i = 0; i < iterations; i++) {
        fastCosineSimilarity(a, cachedB);
      }
      const fastTime = Date.now() - startFast;
      
      const startRegular = Date.now();
      for (let i = 0; i < iterations; i++) {
        cosineSimilarity(a, b, true);
      }
      const regularTime = Date.now() - startRegular;
      
      expect(fastTime).toBeLessThan(regularTime);
    });
  });
  
  describe('findBestMatch', () => {
    it('should find best matching candidate', () => {
      const live = new Float32Array([1, 2, 3, 4]);
      
      const candidates = [
        { employeeId: 'A', embedding: new Float32Array([5, 6, 7, 8]) },
        { employeeId: 'B', embedding: new Float32Array([1, 2, 3, 4]) }, // Exact match
        { employeeId: 'C', embedding: new Float32Array([9, 10, 11, 12]) },
      ];
      
      const result = findBestMatch(live, candidates, 'cosine');
      
      expect(result).toBeDefined();
      expect(result!.employeeId).toBe('B');
      expect(result!.matchScore).toBeCloseTo(1.0, 4);
    });
    
    it('should return null if no match above threshold', () => {
      const live = new Float32Array([1, 2, 3, 4]);
      
      const candidates = [
        { employeeId: 'A', embedding: new Float32Array([10, 20, 30, 40]) },
      ];
      
      const result = findBestMatch(live, candidates, 'cosine', 0.99);
      
      expect(result).toBeNull();
    });
    
    it('should handle empty candidate list', () => {
      const live = new Float32Array([1, 2, 3]);
      const result = findBestMatch(live, [], 'cosine');
      
      expect(result).toBeNull();
    });
  });
  
  describe('findTopKMatches', () => {
    it('should return top K candidates', () => {
      const live = new Float32Array([1, 2, 3]);
      
      const candidates = [
        { employeeId: 'A', embedding: new Float32Array([1, 2, 3]) }, // Best
        { employeeId: 'B', embedding: new Float32Array([1.1, 2.1, 3.1]) }, // 2nd
        { employeeId: 'C', embedding: new Float32Array([5, 6, 7]) },
        { employeeId: 'D', embedding: new Float32Array([1.2, 2.2, 3.2]) }, // 3rd
        { employeeId: 'E', embedding: new Float32Array([10, 20, 30]) },
      ];
      
      const results = findTopKMatches(live, candidates, 3, 'cosine');
      
      expect(results).toHaveLength(3);
      expect(results[0].employeeId).toBe('A');
      expect(results[1].employeeId).toBe('B');
      expect(results[2].employeeId).toBe('D');
    });
    
    it('should return all if K > candidates', () => {
      const live = new Float32Array([1, 2, 3]);
      
      const candidates = [
        { employeeId: 'A', embedding: new Float32Array([1, 2, 3]) },
        { employeeId: 'B', embedding: new Float32Array([4, 5, 6]) },
      ];
      
      const results = findTopKMatches(live, candidates, 10, 'cosine');
      
      expect(results).toHaveLength(2);
    });
  });
  
  describe('assertEmbeddingShape', () => {
    it('should accept correct shape', () => {
      const embedding = new Float32Array(512);
      
      expect(() => assertEmbeddingShape(embedding, 512)).not.toThrow();
    });
    
    it('should throw on wrong dimension', () => {
      const embedding = new Float32Array(256);
      
      expect(() => assertEmbeddingShape(embedding, 512)).toThrow();
    });
    
    it('should throw on non-Float32Array', () => {
      const embedding = new Float64Array(512);
      
      expect(() => assertEmbeddingShape(embedding as any, 512)).toThrow();
    });
  });
});
