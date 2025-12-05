/**
 * Embedding Utilities Module
 * 
 * Provides quantization, dequantization, and TOON token packing for face embeddings.
 * 
 * QUANTIZATION STRATEGY:
 * - Default: 8-bit per dimension (uint8) with scale + zero-point
 * - Reduces storage from 512*4 = 2048 bytes to 512*1 = 512 bytes (75% reduction)
 * - Typical accuracy loss: < 1% on match scores
 * - For extreme compression, can use 4-bit or binary (future)
 * 
 * PRECISION TRADEOFFS:
 * - 8-bit: Best balance of size vs accuracy for production
 * - 16-bit (float16): Better precision, less compression (not implemented here)
 * - 4-bit: Aggressive compression, ~2-3% accuracy loss
 * - 1-bit (binary): 32x compression, only for very large-scale retrieval
 * 
 * TOON ENCODING:
 * - F2 tokens encode quantized embeddings as base64 or hex strings
 * - Include metadata (dimensions, quantization bits, scale, zero-point)
 * - Ready for ToonClient.toonPost() transmission
 */

/**
 * Quantization parameters for embeddings
 */
export interface QuantizationParams {
  scale: number;      // Scaling factor for quantization
  zeroPoint: number;  // Zero-point offset (typically 0 for symmetric)
  bits: number;       // Bits per dimension (8, 16, etc.)
  dimensions: number; // Original embedding dimensions
}

/**
 * Quantize a Float32Array embedding to uint8 or uint16
 * 
 * Uses min-max quantization:
 * quantized = round((value - min) / (max - min) * (2^bits - 1))
 * 
 * For 8-bit: maps [min, max] → [0, 255]
 * 
 * @param embedding Original Float32Array embedding
 * @param bits Bits per dimension (8 or 16, default 8)
 * @returns Quantized buffer (Uint8Array or Uint16Array) + params
 */
export function quantizeEmbedding(
  embedding: Float32Array,
  bits: number = 8
): { buffer: Uint8Array; params: QuantizationParams } {
  if (bits !== 8 && bits !== 16) {
    throw new Error(`Unsupported quantization bits: ${bits}. Use 8 or 16.`);
  }
  
  const dimensions = embedding.length;
  
  // Find min/max for range
  let min = Infinity;
  let max = -Infinity;
  
  for (let i = 0; i < dimensions; i++) {
    const val = embedding[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }
  
  // Handle edge case: all values identical
  if (max === min) {
    console.warn('[embeddingUtils] Constant embedding detected (all values identical)');
    const buffer = new Uint8Array(dimensions);
    buffer.fill(Math.round((2 ** bits - 1) / 2)); // Use midpoint
    
    return {
      buffer,
      params: {
        scale: 1.0,
        zeroPoint: min,
        bits,
        dimensions,
      },
    };
  }
  
  // Compute scale and zero-point
  const range = max - min;
  const maxQuantized = 2 ** bits - 1;
  const scale = range / maxQuantized;
  const zeroPoint = min;
  
  // Quantize
  const buffer = new Uint8Array(dimensions);
  
  for (let i = 0; i < dimensions; i++) {
    const normalized = (embedding[i] - zeroPoint) / scale;
    const quantized = Math.round(normalized);
    
    // Clamp to valid range
    buffer[i] = Math.max(0, Math.min(maxQuantized, quantized));
  }
  
  return {
    buffer,
    params: {
      scale,
      zeroPoint,
      bits,
      dimensions,
    },
  };
}

/**
 * Dequantize a uint8/uint16 buffer back to Float32Array
 * 
 * Inverse of quantization:
 * value = quantized * scale + zeroPoint
 * 
 * @param buffer Quantized buffer
 * @param params Quantization parameters from original quantization
 * @returns Reconstructed Float32Array embedding (approximate)
 */
export function dequantizeEmbedding(
  buffer: Uint8Array,
  params: QuantizationParams
): Float32Array {
  const { scale, zeroPoint, dimensions } = params;
  
  if (buffer.length !== dimensions) {
    throw new Error(
      `Buffer length mismatch: expected ${dimensions}, got ${buffer.length}`
    );
  }
  
  const embedding = new Float32Array(dimensions);
  
  for (let i = 0; i < dimensions; i++) {
    embedding[i] = buffer[i] * scale + zeroPoint;
  }
  
  return embedding;
}

/**
 * TOON token set for face embeddings
 * 
 * F2_DATA = base64-encoded quantized embedding buffer
 * F2_META = metadata string: "dimensions|bits|scale|zeroPoint"
 */
export interface ToonEmbeddingTokens {
  F2_DATA: string;     // Base64-encoded quantized embedding
  F2_META: string;     // Quantization metadata
  F2_DIM: number;      // Dimensions (for quick validation)
  F2_CHECKSUM?: string; // Optional: CRC32 or hash for integrity
}

/**
 * Pack a Float32Array embedding into TOON F2 tokens
 * 
 * Quantizes and encodes for network transmission via ToonClient.
 * 
 * Example usage:
 * ```typescript
 * const embedding = new Float32Array(512); // from ONNX
 * const tokens = packEmbeddingToToon(embedding);
 * 
 * await toonClient.toonPost('/api/v1/embeddings', {
 *   E1: employeeId,
 *   ...tokens,
 * });
 * ```
 * 
 * @param embedding Float32Array embedding
 * @param bits Quantization bits (default 8)
 * @returns TOON token set ready for transmission
 */
export function packEmbeddingToToon(
  embedding: Float32Array,
  bits: number = 8
): ToonEmbeddingTokens {
  // Quantize
  const { buffer, params } = quantizeEmbedding(embedding, bits);
  
  // Encode to base64 (compact and URL-safe)
  const base64Data = bufferToBase64(buffer);
  
  // Create metadata string
  const metadata = `${params.dimensions}|${params.bits}|${params.scale}|${params.zeroPoint}`;
  
  return {
    F2_DATA: base64Data,
    F2_META: metadata,
    F2_DIM: params.dimensions,
  };
}

/**
 * Unpack TOON F2 tokens back to Float32Array embedding
 * 
 * Inverse of packEmbeddingToToon. Use this to reconstruct embeddings
 * received from server or loaded from local storage.
 * 
 * @param tokens TOON token set from packEmbeddingToToon
 * @returns Reconstructed Float32Array embedding
 */
export function unpackEmbeddingFromToon(tokens: ToonEmbeddingTokens): Float32Array {
  // Parse metadata
  const [dimStr, bitsStr, scaleStr, zeroPointStr] = tokens.F2_META.split('|');
  
  const params: QuantizationParams = {
    dimensions: parseInt(dimStr, 10),
    bits: parseInt(bitsStr, 10),
    scale: parseFloat(scaleStr),
    zeroPoint: parseFloat(zeroPointStr),
  };
  
  // Validate dimensions
  if (params.dimensions !== tokens.F2_DIM) {
    throw new Error(
      `Dimension mismatch: metadata=${params.dimensions}, token=${tokens.F2_DIM}`
    );
  }
  
  // Decode base64 to buffer
  const buffer = base64ToBuffer(tokens.F2_DATA);
  
  // Dequantize
  return dequantizeEmbedding(buffer, params);
}

/**
 * Convert Uint8Array to base64 string
 * 
 * Uses Buffer (Node.js) or btoa (browser).
 * React Native provides btoa via polyfill.
 * 
 * @param buffer Uint8Array buffer
 * @returns Base64-encoded string
 */
function bufferToBase64(buffer: Uint8Array): string {
  // Check environment
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return Buffer.from(buffer).toString('base64');
  } else if (typeof btoa !== 'undefined') {
    // Browser/React Native environment
    const binary = String.fromCharCode(...Array.from(buffer));
    return btoa(binary);
  } else {
    throw new Error('No base64 encoding method available');
  }
}

/**
 * Convert base64 string to Uint8Array
 * 
 * @param base64 Base64-encoded string
 * @returns Uint8Array buffer
 */
function base64ToBuffer(base64: string): Uint8Array {
  // Check environment
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    return new Uint8Array(Buffer.from(base64, 'base64'));
  } else if (typeof atob !== 'undefined') {
    // Browser/React Native environment
    const binary = atob(base64);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      buffer[i] = binary.charCodeAt(i);
    }
    return buffer;
  } else {
    throw new Error('No base64 decoding method available');
  }
}

/**
 * Compute simple checksum for embedding integrity
 * 
 * Uses FNV-1a hash for speed. Not cryptographically secure.
 * 
 * @param buffer Uint8Array buffer
 * @returns Hex string checksum
 */
export function computeEmbeddingChecksum(buffer: Uint8Array): string {
  // FNV-1a hash
  let hash = 2166136261; // FNV offset basis
  
  for (let i = 0; i < buffer.length; i++) {
    hash ^= buffer[i];
    hash = Math.imul(hash, 16777619); // FNV prime
  }
  
  // Convert to unsigned 32-bit hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Estimate quantization error (RMSE) between original and quantized
 * 
 * Useful for validating quantization quality offline.
 * 
 * @param original Original Float32Array embedding
 * @param bits Quantization bits to test
 * @returns Root Mean Square Error
 */
export function estimateQuantizationError(
  original: Float32Array,
  bits: number = 8
): number {
  const { buffer, params } = quantizeEmbedding(original, bits);
  const reconstructed = dequantizeEmbedding(buffer, params);
  
  let sumSquaredError = 0;
  for (let i = 0; i < original.length; i++) {
    const error = original[i] - reconstructed[i];
    sumSquaredError += error * error;
  }
  
  return Math.sqrt(sumSquaredError / original.length);
}

/**
 * Test quantization round-trip accuracy
 * 
 * Returns percentage similarity after quantize → dequantize cycle.
 * Should be > 99% for 8-bit quantization on normalized embeddings.
 * 
 * @param embedding Original embedding
 * @param bits Quantization bits
 * @returns Accuracy percentage (0-100)
 */
export function testQuantizationAccuracy(
  embedding: Float32Array,
  bits: number = 8
): number {
  const { buffer, params } = quantizeEmbedding(embedding, bits);
  const reconstructed = dequantizeEmbedding(buffer, params);
  
  // Compute cosine similarity between original and reconstructed
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < embedding.length; i++) {
    dotProduct += embedding[i] * reconstructed[i];
    normA += embedding[i] * embedding[i];
    normB += reconstructed[i] * reconstructed[i];
  }
  
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  
  // Convert to percentage
  return ((similarity + 1) / 2) * 100; // Map [-1,1] to [0,100]
}
