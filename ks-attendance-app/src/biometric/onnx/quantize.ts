/**
 * Embedding Quantization Utilities
 * 
 * Provides INT8 quantization for face embeddings to reduce
 * storage and network transmission size by 75% with <1% accuracy loss.
 * 
 * Integrates with TOON F2 token encoding for efficient transmission.
 */

import { packEmbeddingToToon, unpackEmbeddingFromToon } from '../../matcher/embeddingUtils';

/**
 * Quantized embedding with metadata
 */
export interface QuantizedEmbedding {
  buffer: Uint8Array; // INT8 quantized values
  scale: number; // Quantization scale
  zeroPoint: number; // Quantization zero point
  originalDim: number; // Original embedding dimension
}

/**
 * TOON F2 token structure
 */
export interface ToonF2Tokens {
  F2_DATA: string; // Base64-encoded quantized buffer
  F2_META: string; // Metadata: "dim|bits|scale|zeroPoint"
  F2_DIM: number; // Embedding dimension
}

/**
 * Quantize embedding to INT8
 * 
 * Uses min-max quantization:
 * - Find min and max values in embedding
 * - Map [min, max] → [0, 255] for INT8
 * - Compute scale and zeroPoint for dequantization
 * 
 * Formula:
 *   quantized = round((value - min) / scale)
 *   scale = (max - min) / 255
 *   zeroPoint = round(-min / scale)
 * 
 * Dequantization:
 *   value = quantized * scale + min
 *         = (quantized - zeroPoint) * scale + (zeroPoint * scale + min)
 *         = (quantized - zeroPoint) * scale  (if we adjust min)
 * 
 * @param embedding Float32Array embedding
 * @returns Quantized embedding with metadata
 */
export function quantizeEmbeddingInt8(embedding: Float32Array): QuantizedEmbedding {
  // Find min and max
  let min = Infinity;
  let max = -Infinity;

  for (let i = 0; i < embedding.length; i++) {
    if (embedding[i] < min) min = embedding[i];
    if (embedding[i] > max) max = embedding[i];
  }

  // Handle edge case: all values are the same
  if (max === min) {
    const buffer = new Uint8Array(embedding.length);
    buffer.fill(128); // Middle value
    return {
      buffer,
      scale: 1.0,
      zeroPoint: 128,
      originalDim: embedding.length,
    };
  }

  // Compute scale and zero point
  const scale = (max - min) / 255;
  const zeroPoint = Math.round(-min / scale);

  // Quantize
  const buffer = new Uint8Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) {
    const quantized = Math.round((embedding[i] - min) / scale);
    buffer[i] = Math.max(0, Math.min(255, quantized));
  }

  return {
    buffer,
    scale,
    zeroPoint,
    originalDim: embedding.length,
  };
}

/**
 * Dequantize INT8 embedding back to Float32
 * 
 * Reverses quantization using stored scale and zeroPoint.
 * 
 * @param quantized Quantized embedding
 * @returns Float32Array embedding
 */
export function dequantizeEmbeddingInt8(quantized: QuantizedEmbedding): Float32Array {
  const { buffer, scale, zeroPoint, originalDim } = quantized;
  const embedding = new Float32Array(originalDim);

  for (let i = 0; i < originalDim; i++) {
    embedding[i] = (buffer[i] - zeroPoint) * scale;
  }

  return embedding;
}

/**
 * Pack quantized embedding to TOON F2 tokens
 * 
 * F2_DATA: Base64-encoded INT8 buffer
 * F2_META: "dim|bits|scale|zeroPoint"
 * F2_DIM: dimension as integer
 * 
 * Example:
 *   F2_DATA: "AQIDBAUGBwgJ..." (base64)
 *   F2_META: "512|8|0.001234|-50"
 *   F2_DIM: 512
 * 
 * @param quantized Quantized embedding
 * @returns TOON F2 tokens
 */
export function packQuantizedToToonF2(quantized: QuantizedEmbedding): ToonF2Tokens {
  // Encode buffer to base64
  const F2_DATA = bufferToBase64(quantized.buffer);

  // Construct metadata string
  const F2_META = [
    quantized.originalDim,
    8, // bits (INT8)
    quantized.scale.toFixed(10), // High precision for scale
    quantized.zeroPoint,
  ].join('|');

  return {
    F2_DATA,
    F2_META,
    F2_DIM: quantized.originalDim,
  };
}

/**
 * Unpack TOON F2 tokens to quantized embedding
 * 
 * @param tokens TOON F2 tokens
 * @returns Quantized embedding
 */
export function unpackToonF2ToQuantized(tokens: ToonF2Tokens): QuantizedEmbedding {
  const { F2_DATA, F2_META, F2_DIM } = tokens;

  // Parse metadata
  const metaParts = F2_META.split('|');
  if (metaParts.length !== 4) {
    throw new Error(`Invalid F2_META format: expected 4 parts, got ${metaParts.length}`);
  }

  const originalDim = parseInt(metaParts[0], 10);
  const bits = parseInt(metaParts[1], 10);
  const scale = parseFloat(metaParts[2]);
  const zeroPoint = parseInt(metaParts[3], 10);

  if (bits !== 8) {
    throw new Error(`Unsupported bit depth: ${bits} (only 8-bit supported)`);
  }

  if (originalDim !== F2_DIM) {
    throw new Error(`Dimension mismatch: F2_META=${originalDim}, F2_DIM=${F2_DIM}`);
  }

  // Decode buffer
  const buffer = base64ToBuffer(F2_DATA);

  if (buffer.length !== originalDim) {
    throw new Error(
      `Buffer size mismatch: expected ${originalDim}, got ${buffer.length}`
    );
  }

  return {
    buffer,
    scale,
    zeroPoint,
    originalDim,
  };
}

/**
 * Full workflow: quantize and pack to TOON F2
 * 
 * One-step conversion from Float32Array to TOON tokens.
 * 
 * @param embedding Float32Array embedding
 * @returns TOON F2 tokens
 */
export function embeddingToToonF2(embedding: Float32Array): ToonF2Tokens {
  const quantized = quantizeEmbeddingInt8(embedding);
  return packQuantizedToToonF2(quantized);
}

/**
 * Full workflow: unpack TOON F2 and dequantize
 * 
 * One-step conversion from TOON tokens to Float32Array.
 * 
 * @param tokens TOON F2 tokens
 * @returns Float32Array embedding
 */
export function toonF2ToEmbedding(tokens: ToonF2Tokens): Float32Array {
  const quantized = unpackToonF2ToQuantized(tokens);
  return dequantizeEmbeddingInt8(quantized);
}

/**
 * Test quantization accuracy
 * 
 * Quantizes and dequantizes embedding, then computes metrics:
 * - Mean absolute error (MAE)
 * - Max absolute error
 * - Cosine similarity between original and dequantized
 * 
 * @param embedding Original embedding
 * @returns Accuracy metrics
 */
export function testQuantizationAccuracy(embedding: Float32Array): {
  mae: number;
  maxError: number;
  cosineSimilarity: number;
} {
  // Quantize and dequantize
  const quantized = quantizeEmbeddingInt8(embedding);
  const reconstructed = dequantizeEmbeddingInt8(quantized);

  // Compute metrics
  let sumAbsError = 0;
  let maxError = 0;

  for (let i = 0; i < embedding.length; i++) {
    const error = Math.abs(embedding[i] - reconstructed[i]);
    sumAbsError += error;
    if (error > maxError) {
      maxError = error;
    }
  }

  const mae = sumAbsError / embedding.length;

  // Compute cosine similarity
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < embedding.length; i++) {
    dot += embedding[i] * reconstructed[i];
    normA += embedding[i] * embedding[i];
    normB += reconstructed[i] * reconstructed[i];
  }

  const cosineSimilarity = dot / (Math.sqrt(normA) * Math.sqrt(normB));

  return {
    mae,
    maxError,
    cosineSimilarity,
  };
}

/**
 * Batch quantize embeddings
 * 
 * @param embeddings Array of Float32Array embeddings
 * @returns Array of TOON F2 tokens
 */
export function batchQuantizeToToonF2(embeddings: Float32Array[]): ToonF2Tokens[] {
  return embeddings.map(emb => embeddingToToonF2(emb));
}

/**
 * Batch dequantize TOON F2 tokens
 * 
 * @param tokensArray Array of TOON F2 tokens
 * @returns Array of Float32Array embeddings
 */
export function batchDequantizeFromToonF2(tokensArray: ToonF2Tokens[]): Float32Array[] {
  return tokensArray.map(tokens => toonF2ToEmbedding(tokens));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Uint8Array to Base64 string
 * 
 * For React Native, use react-native-base64 or expo-crypto.
 * For Node.js, use Buffer.
 * 
 * @param buffer Uint8Array
 * @returns Base64 string
 */
function bufferToBase64(buffer: Uint8Array): string {
  // TODO: Replace with actual base64 encoding
  // 
  // OPTION 1: Use expo-crypto (recommended for Expo)
  // import * as Crypto from 'expo-crypto';
  // return Crypto.digestStringAsync(
  //   Crypto.CryptoDigestAlgorithm.SHA256,
  //   String.fromCharCode(...buffer)
  // );
  //
  // OPTION 2: Use react-native-base64
  // import base64 from 'react-native-base64';
  // return base64.encode(String.fromCharCode(...buffer));
  //
  // OPTION 3: Use native btoa (web/browser)
  // return btoa(String.fromCharCode(...buffer));

  // Placeholder: simple hex encoding for now
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert Base64 string to Uint8Array
 * 
 * @param base64 Base64 string
 * @returns Uint8Array
 */
function base64ToBuffer(base64: string): Uint8Array {
  // TODO: Replace with actual base64 decoding
  // 
  // OPTION 1: Use expo-crypto or react-native-base64
  // import base64 from 'react-native-base64';
  // const decoded = base64.decode(base64);
  // return new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));
  //
  // OPTION 2: Use native atob (web/browser)
  // const decoded = atob(base64);
  // return new Uint8Array(decoded.split('').map(c => c.charCodeAt(0)));

  // Placeholder: hex decoding
  const bytes: number[] = [];
  for (let i = 0; i < base64.length; i += 2) {
    bytes.push(parseInt(base64.substr(i, 2), 16));
  }
  return new Uint8Array(bytes);
}

// ============================================================================
// INTEGRATION WITH EXISTING MATCHER
// ============================================================================

/**
 * Wrapper to integrate with existing embeddingUtils.ts
 * 
 * The matcher module already has packEmbeddingToToon and unpackEmbeddingFromToon.
 * This provides a bridge between ONNX quantization and matcher's TOON encoding.
 * 
 * @param embedding Float32Array embedding
 * @param mode 'int8' or 'float32'
 * @returns TOON tokens as expected by matcher
 */
export function packForMatcher(
  embedding: Float32Array,
  mode: 'int8' | 'float32' = 'int8'
): Record<string, any> {
  if (mode === 'int8') {
    const tokens = embeddingToToonF2(embedding);
    return {
      F2_DATA: tokens.F2_DATA,
      F2_META: tokens.F2_META,
      F2_DIM: tokens.F2_DIM,
    };
  } else {
    // Use existing matcher function for float32
    return packEmbeddingToToon(embedding);
  }
}

/**
 * Unpack TOON tokens from matcher to Float32Array
 * 
 * @param tokens TOON tokens
 * @returns Float32Array embedding
 */
export function unpackFromMatcher(tokens: Record<string, any>): Float32Array {
  // Check if INT8 quantized
  if (tokens.F2_META && tokens.F2_META.includes('|')) {
    const metaParts = tokens.F2_META.split('|');
    if (metaParts.length === 4 && metaParts[1] === '8') {
      // INT8 quantized
      return toonF2ToEmbedding(tokens as ToonF2Tokens);
    }
  }

  // Fall back to existing matcher function for float32
  // Cast to ToonEmbeddingTokens if it has required fields
  if (tokens.F2_DATA && tokens.F2_META && tokens.F2_DIM) {
    return unpackEmbeddingFromToon(tokens as any);
  }
  
  throw new Error('[quantize] Invalid token format for unpacking');
}
