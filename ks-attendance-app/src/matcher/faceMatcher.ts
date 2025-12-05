/**
 * Face Matcher Module
 * 
 * Provides cosine similarity and Euclidean distance computations for
 * face embedding matching. Includes numeric stability handling and
 * vector normalization for production use.
 * 
 * PERFORMANCE NOTES:
 * - Uses Float32Array for CPU-optimized operations
 * - Normalizes embeddings once and caches for repeated comparisons
 * - Handles zero-norm edge cases to prevent NaN/Inf
 */

export interface MatchResult {
  matchScore: number;    // 0-1, where 1 = perfect match (cosine similarity)
  distance: number;      // Raw distance metric used
  normalized: boolean;   // Whether embeddings were normalized
  method: 'cosine' | 'euclidean';
}

/**
 * Compute L2 norm (magnitude) of a vector
 * @param vec Float32Array vector
 * @returns L2 norm value
 */
function computeNorm(vec: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  return Math.sqrt(sum);
}

/**
 * Normalize a vector to unit length (L2 normalization)
 * @param vec Input vector (will be modified in place)
 * @param epsilon Minimum norm to prevent division by zero
 * @returns The normalized vector (same reference)
 */
export function normalizeVector(vec: Float32Array, epsilon: number = 1e-10): Float32Array {
  const norm = computeNorm(vec);
  
  // Handle zero-norm case (all zeros or near-zero)
  if (norm < epsilon) {
    console.warn('[faceMatcher] Zero-norm vector detected, returning as-is');
    return vec;
  }
  
  // Normalize in place
  for (let i = 0; i < vec.length; i++) {
    vec[i] /= norm;
  }
  
  return vec;
}

/**
 * Compute cosine similarity between two embeddings
 * 
 * Cosine similarity = dot(a, b) / (||a|| * ||b||)
 * Returns value in [-1, 1], where 1 = identical direction
 * 
 * For face recognition, typically normalize vectors first, then
 * cosine similarity becomes simple dot product.
 * 
 * @param a First embedding (512-d typically)
 * @param b Second embedding
 * @param normalize Whether to normalize vectors (default true)
 * @returns Similarity score in [0, 1] (shifted from [-1,1] for convenience)
 */
export function cosineSimilarity(
  a: Float32Array,
  b: Float32Array,
  normalize: boolean = true
): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  
  if (a.length === 0) {
    throw new Error('Cannot compute similarity of empty vectors');
  }
  
  // Create copies if normalizing to avoid mutating originals
  const vecA = normalize ? normalizeVector(new Float32Array(a)) : a;
  const vecB = normalize ? normalizeVector(new Float32Array(b)) : b;
  
  // Compute dot product
  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
  }
  
  // If vectors are already normalized, dot product IS the cosine similarity
  if (normalize) {
    // Shift from [-1, 1] to [0, 1] for consistency with match scores
    // where 0 = no match, 1 = perfect match
    return (dotProduct + 1) / 2;
  }
  
  // If not normalized, compute full cosine formula
  const normA = computeNorm(vecA);
  const normB = computeNorm(vecB);
  
  if (normA < 1e-10 || normB < 1e-10) {
    console.warn('[faceMatcher] Zero-norm vector in similarity computation');
    return 0; // No similarity if either vector is zero
  }
  
  const cosineSim = dotProduct / (normA * normB);
  
  // Shift to [0, 1] range
  return (cosineSim + 1) / 2;
}

/**
 * Compute Euclidean distance between two embeddings
 * 
 * L2 distance = sqrt(sum((a[i] - b[i])^2))
 * 
 * Returns raw distance (not normalized). Lower = more similar.
 * For face matching, typically use after L2-normalizing embeddings.
 * 
 * @param a First embedding
 * @param b Second embedding
 * @returns Euclidean distance (0 = identical, higher = more different)
 */
export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  
  let sumSquares = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sumSquares += diff * diff;
  }
  
  return Math.sqrt(sumSquares);
}

/**
 * Match a live embedding against a stored embedding
 * 
 * Primary matching function that computes similarity and returns
 * structured result ready for threshold evaluation.
 * 
 * @param liveEmbedding Embedding from current capture
 * @param storedEmbedding Embedding from enrollment database
 * @param method Similarity metric to use (default: cosine)
 * @returns MatchResult with score, distance, and metadata
 */
export function matchEmbedding(
  liveEmbedding: Float32Array,
  storedEmbedding: Float32Array,
  method: 'cosine' | 'euclidean' = 'cosine',
  normalize: boolean = true
): MatchResult {
  if (liveEmbedding.length !== storedEmbedding.length) {
    throw new Error(
      `Embedding dimension mismatch: live=${liveEmbedding.length}, stored=${storedEmbedding.length}`
    );
  }
  
  if (method === 'cosine') {
    // Cosine similarity (normalized)
    const similarity = cosineSimilarity(liveEmbedding, storedEmbedding, normalize);
    
    return {
      matchScore: similarity,
      distance: 1 - similarity, // Convert similarity to distance
      normalized: normalize,
      method: 'cosine',
    };
  } else {
    // Euclidean distance (lower = better match)
    const distance = euclideanDistance(liveEmbedding, storedEmbedding);
    
    // Convert distance to similarity score (0-1)
    // For normalized embeddings, max distance is typically ~2
    // Use exponential decay to map distance to similarity
    const maxExpectedDistance = 2.0;
    const similarity = Math.exp(-distance / maxExpectedDistance);
    
    return {
      matchScore: similarity,
      distance,
      normalized: false,
      method: 'euclidean',
    };
  }
}

/**
 * Cached normalized embedding for efficient repeated comparisons
 * 
 * Usage pattern:
 * ```
 * const cachedEmployee = createCachedEmbedding(employeeEmbedding);
 * const score1 = fastCosineSimilarity(liveEmb1, cachedEmployee);
 * const score2 = fastCosineSimilarity(liveEmb2, cachedEmployee);
 * ```
 */
export interface CachedEmbedding {
  normalized: Float32Array;
  originalNorm: number;
  dimensions: number;
}

/**
 * Create a cached normalized embedding for efficient comparisons
 * @param embedding Original embedding
 * @returns Cached embedding with pre-computed normalization
 */
export function createCachedEmbedding(embedding: Float32Array): CachedEmbedding {
  const norm = computeNorm(embedding);
  const normalized = new Float32Array(embedding);
  normalizeVector(normalized);
  
  return {
    normalized,
    originalNorm: norm,
    dimensions: embedding.length,
  };
}

/**
 * Fast cosine similarity using cached normalized embedding
 * 
 * Avoids re-normalizing stored embeddings on every comparison.
 * Useful when matching one live embedding against many stored embeddings.
 * 
 * @param liveEmbedding Live embedding (will be normalized)
 * @param cachedStored Pre-normalized stored embedding
 * @returns Similarity score in [0, 1]
 */
export function fastCosineSimilarity(
  liveEmbedding: Float32Array,
  cachedStored: CachedEmbedding
): number {
  if (liveEmbedding.length !== cachedStored.dimensions) {
    throw new Error(
      `Dimension mismatch: live=${liveEmbedding.length}, cached=${cachedStored.dimensions}`
    );
  }
  
  // Normalize live embedding
  const normalizedLive = normalizeVector(new Float32Array(liveEmbedding));
  
  // Dot product (both vectors are normalized)
  let dotProduct = 0;
  for (let i = 0; i < normalizedLive.length; i++) {
    dotProduct += normalizedLive[i] * cachedStored.normalized[i];
  }
  
  // Shift to [0, 1] range
  return (dotProduct + 1) / 2;
}

/**
 * Batch match: find best match from a list of candidates
 * 
 * Linear scan O(n*d) where n=candidates, d=dimensions.
 * For large candidate sets, consider approximate methods (FAISS, Annoy).
 * 
 * @param liveEmbedding Live embedding to match
 * @param candidates Array of candidate embeddings with IDs
 * @param threshold Minimum similarity to consider (default 0.4)
 * @returns Best match or null if no candidate exceeds threshold
 */
export interface CandidateMatch {
  employeeId: string;
  embedding: Float32Array;
  matchScore: number;
  rank: number; // 1-based rank in results
}

export function findBestMatch(
  liveEmbedding: Float32Array,
  candidates: Array<{ employeeId: string; embedding: Float32Array }>,
  method: 'cosine' | 'euclidean' = 'cosine',
  threshold: number = 0.4
): CandidateMatch | null {
  if (candidates.length === 0) {
    return null;
  }
  
  let bestMatch: CandidateMatch | null = null;
  let bestScore = threshold; // Must exceed threshold
  
  for (const candidate of candidates) {
    const result = matchEmbedding(liveEmbedding, candidate.embedding, method);
    
    if (result.matchScore > bestScore) {
      bestScore = result.matchScore;
      bestMatch = {
        employeeId: candidate.employeeId,
        embedding: candidate.embedding,
        matchScore: result.matchScore,
        rank: 1,
      };
    }
  }
  
  return bestMatch;
}

/**
 * Find top-K best matches (useful for candidate shortlisting)
 * 
 * Returns up to K candidates sorted by match score (descending).
 * 
 * TODO: For large-scale deployment, integrate approximate nearest neighbor:
 * - FAISS (Facebook AI Similarity Search) - quantization + IVF
 * - Annoy (Spotify) - tree-based ANN
 * - HNSW (Hierarchical Navigable Small World) - graph-based
 * 
 * @param liveEmbedding Live embedding
 * @param candidates Candidate pool
 * @param k Number of top matches to return
 * @param threshold Minimum similarity to consider
 * @returns Array of top K matches sorted by score
 */
export function findTopKMatches(
  liveEmbedding: Float32Array,
  candidates: Array<{ employeeId: string; embedding: Float32Array }>,
  k: number = 5,
  method: 'cosine' | 'euclidean' = 'cosine',
  threshold: number = 0.3
): CandidateMatch[] {
  if (candidates.length === 0) {
    return [];
  }
  
  // Compute all match scores
  const results: CandidateMatch[] = [];
  
  for (const candidate of candidates) {
    const matchResult = matchEmbedding(liveEmbedding, candidate.embedding, method);
    
    if (matchResult.matchScore >= threshold) {
      results.push({
        employeeId: candidate.employeeId,
        embedding: candidate.embedding,
        matchScore: matchResult.matchScore,
        rank: 0, // Will be set after sorting
      });
    }
  }
  
  // Sort descending by match score
  results.sort((a, b) => b.matchScore - a.matchScore);
  
  // Take top K and assign ranks
  const topK = results.slice(0, k);
  topK.forEach((match, idx) => {
    match.rank = idx + 1;
  });
  
  return topK;
}

/**
 * Verify embedding shape matches expected dimensions
 * 
 * Use this after ONNX runtime inference to validate output shape.
 * 
 * @param embedding Embedding vector to validate
 * @param expectedDim Expected dimension (e.g., 512 for ArcFace)
 * @throws Error if dimension mismatch
 */
export function assertEmbeddingShape(embedding: Float32Array, expectedDim: number): void {
  if (embedding.length !== expectedDim) {
    throw new Error(
      `Embedding shape mismatch: expected ${expectedDim}D, got ${embedding.length}D. ` +
      `Check ONNX model output shape.`
    );
  }
}
