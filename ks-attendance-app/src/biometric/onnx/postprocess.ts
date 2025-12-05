/**
 * Face Embedding Postprocessing Utilities
 * 
 * Handles normalization and score computation for face embeddings
 * after ONNX model inference.
 */

/**
 * L2 normalize an embedding vector
 * 
 * Converts embedding to unit vector for cosine similarity matching.
 * Essential for ArcFace/InsightFace models.
 * 
 * Formula: normalized = embedding / ||embedding||₂
 * where ||embedding||₂ = sqrt(sum(embedding[i]²))
 * 
 * @param embedding Input embedding
 * @returns L2-normalized embedding (unit vector)
 */
export function l2Normalize(embedding: Float32Array): Float32Array {
  // Compute L2 norm
  let sumSquares = 0;
  for (let i = 0; i < embedding.length; i++) {
    sumSquares += embedding[i] * embedding[i];
  }
  
  const norm = Math.sqrt(sumSquares);
  
  // Avoid division by zero
  if (norm < 1e-10) {
    console.warn('[Postprocess] Embedding has near-zero norm, returning as-is');
    return embedding;
  }

  // Normalize
  const normalized = new Float32Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    normalized[i] = embedding[i] / norm;
  }

  return normalized;
}

/**
 * Ensure embedding is Float32Array
 * 
 * ONNX runtimes may return different typed arrays depending on
 * configuration. This ensures consistent Float32Array output.
 * 
 * @param embedding Input embedding (any typed array or regular array)
 * @returns Float32Array embedding
 */
export function ensureFloat32(embedding: ArrayLike<number>): Float32Array {
  if (embedding instanceof Float32Array) {
    return embedding;
  }

  return Float32Array.from(embedding);
}

/**
 * Compute cosine similarity between two embeddings
 * 
 * For L2-normalized embeddings, this is simply the dot product.
 * Returns value in [0, 1] where 1 = identical, 0 = completely different.
 * 
 * Formula: similarity = sum(a[i] * b[i]) for i in [0, dim)
 * 
 * @param embeddingA First embedding (should be L2-normalized)
 * @param embeddingB Second embedding (should be L2-normalized)
 * @returns Cosine similarity score [0, 1]
 */
export function computeCosineSimilarity(
  embeddingA: Float32Array,
  embeddingB: Float32Array
): number {
  if (embeddingA.length !== embeddingB.length) {
    throw new Error(
      `Embedding dimension mismatch: ${embeddingA.length} vs ${embeddingB.length}`
    );
  }

  let dotProduct = 0;
  for (let i = 0; i < embeddingA.length; i++) {
    dotProduct += embeddingA[i] * embeddingB[i];
  }

  // Clamp to [0, 1] to handle floating-point errors
  return Math.max(0, Math.min(1, (dotProduct + 1) / 2));
}

/**
 * Compute match score between two embeddings
 * 
 * Wrapper around cosine similarity with additional validation.
 * Returns score suitable for threshold comparison in matcher.
 * 
 * @param embeddingA First embedding
 * @param embeddingB Second embedding
 * @param normalize Whether to L2-normalize before comparison (default: true)
 * @returns Match score [0, 1]
 */
export function computeMatchScore(
  embeddingA: Float32Array,
  embeddingB: Float32Array,
  normalize: boolean = true
): number {
  let normA = embeddingA;
  let normB = embeddingB;

  if (normalize) {
    normA = l2Normalize(embeddingA);
    normB = l2Normalize(embeddingB);
  }

  return computeCosineSimilarity(normA, normB);
}

/**
 * Validate embedding dimensions
 * 
 * Checks that embedding has expected dimensionality and contains
 * valid (non-NaN, non-infinite) values.
 * 
 * @param embedding Embedding to validate
 * @param expectedDim Expected dimension (e.g., 512 for ArcFace)
 * @throws Error if validation fails
 */
export function validateEmbedding(
  embedding: Float32Array,
  expectedDim?: number
): void {
  if (expectedDim !== undefined && embedding.length !== expectedDim) {
    throw new Error(
      `Invalid embedding dimension: expected ${expectedDim}, got ${embedding.length}`
    );
  }

  // Check for NaN or infinite values
  for (let i = 0; i < embedding.length; i++) {
    if (!isFinite(embedding[i])) {
      throw new Error(
        `Invalid embedding value at index ${i}: ${embedding[i]}`
      );
    }
  }
}

/**
 * Compute embedding quality score
 * 
 * Heuristic measure of embedding quality based on:
 * - Magnitude (should be near 1.0 for L2-normalized)
 * - Distribution (shouldn't be all zeros or highly concentrated)
 * 
 * Returns score in [0, 1] where 1 = high quality.
 * 
 * @param embedding Input embedding
 * @returns Quality score [0, 1]
 */
export function computeEmbeddingQuality(embedding: Float32Array): number {
  // Compute L2 norm
  let sumSquares = 0;
  let sumAbs = 0;
  for (let i = 0; i < embedding.length; i++) {
    sumSquares += embedding[i] * embedding[i];
    sumAbs += Math.abs(embedding[i]);
  }

  const norm = Math.sqrt(sumSquares);
  const meanAbs = sumAbs / embedding.length;

  // Penalize if norm is far from 1.0 (assuming model outputs L2-normalized)
  const normScore = 1.0 - Math.abs(1.0 - norm);

  // Penalize if distribution is too concentrated (all near zero)
  const distributionScore = Math.min(1.0, meanAbs * 10);

  // Combined score
  return (normScore + distributionScore) / 2;
}

/**
 * Batch L2 normalize multiple embeddings
 * 
 * @param embeddings Array of embeddings
 * @returns Array of L2-normalized embeddings
 */
export function batchL2Normalize(embeddings: Float32Array[]): Float32Array[] {
  return embeddings.map(emb => l2Normalize(emb));
}

/**
 * Compute pairwise similarity matrix
 * 
 * Useful for analyzing a batch of embeddings (e.g., multi-shot enrollment).
 * Returns matrix where element [i][j] is similarity between embeddings i and j.
 * 
 * @param embeddings Array of embeddings
 * @param normalize Whether to L2-normalize first (default: true)
 * @returns Similarity matrix (2D array)
 */
export function computePairwiseSimilarity(
  embeddings: Float32Array[],
  normalize: boolean = true
): number[][] {
  const normalized = normalize ? batchL2Normalize(embeddings) : embeddings;
  const n = normalized.length;
  const matrix: number[][] = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1.0;
      } else {
        matrix[i][j] = computeCosineSimilarity(normalized[i], normalized[j]);
      }
    }
  }

  return matrix;
}

/**
 * Select best embedding from batch
 * 
 * Given multiple embeddings (e.g., from multi-shot enrollment),
 * select the one with highest quality or most similarity to others.
 * 
 * Strategy: Select embedding with highest average similarity to all others.
 * This tends to pick a "representative" embedding that's close to the mean.
 * 
 * @param embeddings Array of embeddings
 * @returns Index of best embedding
 */
export function selectBestEmbedding(embeddings: Float32Array[]): number {
  if (embeddings.length === 0) {
    throw new Error('Cannot select best embedding from empty array');
  }

  if (embeddings.length === 1) {
    return 0;
  }

  const similarityMatrix = computePairwiseSimilarity(embeddings);
  let bestIndex = 0;
  let bestAvgSimilarity = 0;

  for (let i = 0; i < embeddings.length; i++) {
    let avgSimilarity = 0;
    for (let j = 0; j < embeddings.length; j++) {
      if (i !== j) {
        avgSimilarity += similarityMatrix[i][j];
      }
    }
    avgSimilarity /= (embeddings.length - 1);

    if (avgSimilarity > bestAvgSimilarity) {
      bestAvgSimilarity = avgSimilarity;
      bestIndex = i;
    }
  }

  return bestIndex;
}

/**
 * Average multiple embeddings
 * 
 * Useful for creating a template from multi-shot enrollment.
 * Averages embeddings and re-normalizes.
 * 
 * @param embeddings Array of embeddings
 * @param normalize Whether to L2-normalize result (default: true)
 * @returns Averaged embedding
 */
export function averageEmbeddings(
  embeddings: Float32Array[],
  normalize: boolean = true
): Float32Array {
  if (embeddings.length === 0) {
    throw new Error('Cannot average empty embedding array');
  }

  const dim = embeddings[0].length;
  const sum = new Float32Array(dim);

  for (const emb of embeddings) {
    if (emb.length !== dim) {
      throw new Error(`Embedding dimension mismatch: expected ${dim}, got ${emb.length}`);
    }
    for (let i = 0; i < dim; i++) {
      sum[i] += emb[i];
    }
  }

  // Average
  for (let i = 0; i < dim; i++) {
    sum[i] /= embeddings.length;
  }

  // Normalize if requested
  return normalize ? l2Normalize(sum) : sum;
}

/**
 * Detect outlier embeddings in a batch
 * 
 * Identifies embeddings that are significantly different from others.
 * Useful for filtering out bad captures in multi-shot enrollment.
 * 
 * Returns indices of outliers based on similarity threshold.
 * 
 * @param embeddings Array of embeddings
 * @param threshold Minimum average similarity to others (default: 0.6)
 * @returns Indices of outlier embeddings
 */
export function detectOutliers(
  embeddings: Float32Array[],
  threshold: number = 0.6
): number[] {
  if (embeddings.length < 3) {
    // Not enough data to detect outliers
    return [];
  }

  const similarityMatrix = computePairwiseSimilarity(embeddings);
  const outliers: number[] = [];

  for (let i = 0; i < embeddings.length; i++) {
    let avgSimilarity = 0;
    for (let j = 0; j < embeddings.length; j++) {
      if (i !== j) {
        avgSimilarity += similarityMatrix[i][j];
      }
    }
    avgSimilarity /= (embeddings.length - 1);

    if (avgSimilarity < threshold) {
      outliers.push(i);
    }
  }

  return outliers;
}
