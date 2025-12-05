/**
 * FacePipeline
 * On-device face embedding pipeline (stub architecture)
 * 
 * INTEGRATION POINTS:
 * - Replace stubs with TensorFlow Lite or native face recognition SDK
 * - Implement real ArcFace/FaceNet model inference
 * - Add proper quality assessment (blur, lighting, angle detection)
 */

/**
 * FaceFrame
 * Raw captured frame with metadata
 */
export interface FaceFrame {
  imageUri: string;           // Local file URI or base64
  width: number;
  height: number;
  timestamp: number;
  metadata: {
    lighting?: number;        // 0-100 (detected brightness)
    blur?: number;            // 0-100 (sharpness score)
    angle?: {                 // Detected head pose
      yaw: number;            // -90 to 90 degrees
      pitch: number;
      roll: number;
    };
    faceDetected: boolean;
    faceCount: number;        // Should be 1
    faceBounds?: {            // Bounding box
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

/**
 * FaceEmbedding
 * 512-dimensional face embedding vector
 */
export interface FaceEmbedding {
  vector: Float32Array;       // 512-dim embedding (ArcFace standard)
  confidence: number;         // 0-1 (model confidence)
  modelVersion: string;       // e.g., "arcface-mobilenet-v1"
  timestamp: number;
}

/**
 * QualityAssessment
 * Per-frame quality metrics
 */
export interface QualityAssessment {
  score: number;              // 0-100 composite score
  passesThreshold: boolean;   // true if score >= minQuality
  factors: {
    lighting: { score: number; status: 'good' | 'warning' | 'poor' };
    sharpness: { score: number; status: 'good' | 'warning' | 'poor' };
    pose: { score: number; status: 'good' | 'warning' | 'poor' };
    occlusion: { score: number; status: 'good' | 'warning' | 'poor' };
  };
  tips: string[];             // User-friendly improvement tips
}

/**
 * EnrolledEmbedding
 * Final aggregated embedding for enrollment
 */
export interface EnrolledEmbedding {
  primaryEmbedding: Float32Array;     // Aggregated vector
  auxiliaryEmbeddings: Float32Array[]; // Individual shot embeddings
  aggregationMethod: 'average' | 'weighted' | 'best';
  qualityScore: number;                // 0-100 composite
  shotCount: number;
  capturedAt: number;
}

/**
 * TOON Face Token (F2)
 * Quantized and compressed embedding for TOON transmission
 */
export interface ToonFaceToken {
  F2: string;                 // Base64-encoded quantized embedding
  F3: string;                 // Metadata: version, quality, shotCount
  method: string;             // Quantization method (e.g., "int8_scalar")
}

// ==================== CONFIGURATION ====================

const PIPELINE_CONFIG = {
  targetSize: { width: 112, height: 112 },  // ArcFace input size
  embeddingDim: 512,                         // Standard ArcFace dimension
  minQuality: 65,                            // Minimum acceptable quality
  qualityThresholds: {
    good: 80,
    warning: 65,
    poor: 0,
  },
  modelVersion: 'arcface-mobilenet-v1',      // Model identifier
};

// ==================== MOCK MODE ====================

let MOCK_MODE = __DEV__;  // Enable mock mode in development

/**
 * Set mock mode (for QA testing)
 */
export function setMockMode(enabled: boolean): void {
  MOCK_MODE = enabled;
  console.log(`[FacePipeline] Mock mode: ${enabled ? 'ENABLED' : 'DISABLED'}`);
}

/**
 * Get mock mode status
 */
export function isMockMode(): boolean {
  return MOCK_MODE;
}

// ==================== FRAME CAPTURE ====================

/**
 * Capture frame from camera
 * 
 * INTEGRATION POINT:
 * - Replace with expo-camera takePictureAsync()
 * - Add face detection pre-check using expo-face-detector or native SDK
 * - Extract metadata (lighting, blur, pose) from detector
 * 
 * @param cameraRef - Expo Camera ref
 * @returns FaceFrame with metadata
 */
export async function captureFrame(cameraRef?: any): Promise<FaceFrame> {
  if (MOCK_MODE) {
    return createMockFrame();
  }

  // TODO: Replace with real implementation
  // const photo = await cameraRef.current?.takePictureAsync({
  //   quality: 0.8,
  //   base64: false,
  //   skipProcessing: false,
  // });
  
  // TODO: Run face detection on captured photo
  // const faceDetection = await detectFaces(photo.uri);
  
  // TODO: Extract metadata from detection results
  // const metadata = extractMetadata(faceDetection);

  throw new Error('captureFrame not implemented - plug expo-camera');
}

/**
 * Create mock frame for testing
 */
function createMockFrame(): FaceFrame {
  return {
    imageUri: `mock://face-${Date.now()}.jpg`,
    width: 640,
    height: 480,
    timestamp: Date.now(),
    metadata: {
      lighting: 75 + Math.random() * 20,  // 75-95
      blur: 80 + Math.random() * 15,      // 80-95
      angle: {
        yaw: (Math.random() - 0.5) * 30,   // -15 to 15
        pitch: (Math.random() - 0.5) * 20, // -10 to 10
        roll: (Math.random() - 0.5) * 10,  // -5 to 5
      },
      faceDetected: true,
      faceCount: 1,
      faceBounds: {
        x: 100,
        y: 50,
        width: 300,
        height: 380,
      },
    },
  };
}

// ==================== METADATA HELPERS ====================

export interface DetectionMetadataInput {
  yawAngle?: number;
  rollAngle?: number;
  pitchAngle?: number;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface BuildMetadataInput {
  detection?: DetectionMetadataInput;
  frame: { width: number; height: number };
  exif?: Record<string, any>;
  faceCount: number;
}

export function buildMetadataFromDetection({
  detection,
  frame,
  exif,
  faceCount,
}: BuildMetadataInput): FaceFrame['metadata'] {
  const lighting = deriveLightingScore(exif);
  const blur = deriveSharpnessScore(exif);

  const yaw = detection?.yawAngle ?? 0;
  const roll = detection?.rollAngle ?? 0;
  const pitch = detection?.pitchAngle ?? estimatePitchFromBounds(detection?.bounds, frame.height);

  const faceBounds = detection?.bounds
    ? {
        x: detection.bounds.x,
        y: detection.bounds.y,
        width: detection.bounds.width,
        height: detection.bounds.height,
      }
    : undefined;

  return {
    lighting,
    blur,
    angle: { yaw, pitch, roll },
    faceDetected: faceCount > 0,
    faceCount,
    faceBounds,
  };
}

function deriveLightingScore(exif?: Record<string, any>): number {
  const brightness = toNumber(exif?.BrightnessValue);
  if (typeof brightness === 'number') {
    const normalized = Math.max(-3, Math.min(3, brightness));
    return clamp(Math.round(72 + normalized * 8), 30, 95);
  }

  const iso = toNumber(exif?.ISO);
  if (typeof iso === 'number') {
    if (iso >= 1600) return 45;
    if (iso >= 800) return 60;
    if (iso >= 400) return 75;
    return 85;
  }

  return 70;
}

function deriveSharpnessScore(exif?: Record<string, any>): number {
  const shutter = toNumber(exif?.ShutterSpeedValue) ?? toNumber(exif?.ExposureTime);
  if (typeof shutter === 'number') {
    if (shutter > 0.02) return 58;
    if (shutter > 0.01) return 70;
    return 85;
  }

  const focusDistance = toNumber(exif?.SubjectDistance);
  if (typeof focusDistance === 'number' && focusDistance < 0.4) {
    return 60;
  }

  return 75;
}

function estimatePitchFromBounds(
  bounds: DetectionMetadataInput['bounds'],
  frameHeight: number,
): number {
  if (!bounds || frameHeight <= 0) {
    return 0;
  }

  const centerY = bounds.y + bounds.height / 2;
  const normalized = centerY / frameHeight - 0.5;
  return clamp(-normalized * 60, -25, 25);
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ==================== EMBEDDING COMPUTATION ====================

/**
 * Compute face embedding from frame
 * 
 * INTEGRATION POINT:
 * - Load TensorFlow Lite ArcFace model (or native SDK)
 * - Preprocess image: resize to 112x112, normalize, convert to tensor
 * - Run inference: model.predict(tensor)
 * - Extract 512-dim embedding vector from output
 * 
 * Example with TF Lite:
 * ```typescript
 * import * as tf from '@tensorflow/tfjs';
 * import { bundleResourceIO } from '@tensorflow/tfjs-react-native';
 * 
 * // Load model
 * const model = await tf.loadGraphModel(bundleResourceIO('arcface.tflite'));
 * 
 * // Preprocess
 * const tensor = await preprocessImage(frame.imageUri);
 * 
 * // Inference
 * const output = model.predict(tensor) as tf.Tensor;
 * const embedding = await output.data();
 * 
 * return {
 *   vector: new Float32Array(embedding),
 *   confidence: computeConfidence(output),
 *   modelVersion: 'arcface-mobilenet-v1',
 *   timestamp: Date.now(),
 * };
 * ```
 * 
 * @param frame - Captured face frame
 * @returns Face embedding
 */
export async function computeEmbedding(frame: FaceFrame): Promise<FaceEmbedding> {
  if (MOCK_MODE) {
    return createMockEmbedding();
  }

  // TODO: Implement real embedding computation
  // 1. Load model if not already loaded (singleton)
  // 2. Preprocess frame.imageUri to 112x112 tensor
  // 3. Run inference
  // 4. Extract embedding vector
  // 5. Compute confidence score

  throw new Error('computeEmbedding not implemented - plug TF Lite / native SDK');
}

/**
 * Create mock embedding for testing
 */
function createMockEmbedding(): FaceEmbedding {
  // Generate deterministic mock embedding (for testing consistency)
  const vector = new Float32Array(PIPELINE_CONFIG.embeddingDim);
  for (let i = 0; i < PIPELINE_CONFIG.embeddingDim; i++) {
    vector[i] = Math.random() * 2 - 1;  // Range: -1 to 1
  }
  
  // Normalize vector (unit length)
  const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  for (let i = 0; i < vector.length; i++) {
    vector[i] /= norm;
  }

  return {
    vector,
    confidence: 0.85 + Math.random() * 0.1,  // 0.85-0.95
    modelVersion: PIPELINE_CONFIG.modelVersion,
    timestamp: Date.now(),
  };
}

// ==================== QUALITY ASSESSMENT ====================

/**
 * Assess embedding and frame quality
 * 
 * INTEGRATION POINT:
 * - Use frame metadata (lighting, blur, angle) for quality factors
 * - Compute embedding consistency if multiple shots available
 * - Detect occlusions (glasses, masks) using face landmarks
 * 
 * @param embedding - Computed embedding
 * @param frame - Source frame
 * @returns Quality assessment
 */
export function assessQuality(
  embedding: FaceEmbedding,
  frame: FaceFrame
): QualityAssessment {
  const { metadata } = frame;
  
  // Assess lighting
  const lighting = assessLighting(metadata.lighting || 50);
  
  // Assess sharpness
  const sharpness = assessSharpness(metadata.blur || 50);
  
  // Assess pose (head angle)
  const pose = assessPose(metadata.angle);
  
  // Assess occlusion (stub - would use face landmarks)
  const occlusion = assessOcclusion(metadata);
  
  // Compute composite score (weighted average)
  const score = Math.round(
    lighting.score * 0.3 +
    sharpness.score * 0.3 +
    pose.score * 0.25 +
    occlusion.score * 0.15
  );
  
  // Generate tips
  const tips: string[] = [];
  if (lighting.status !== 'good') {
    tips.push(lighting.status === 'poor' ? 'Move to better lighting' : 'Improve lighting');
  }
  if (sharpness.status !== 'good') {
    tips.push('Hold device steady');
  }
  if (pose.status !== 'good') {
    tips.push('Face the camera directly');
  }
  if (occlusion.status !== 'good') {
    tips.push('Remove glasses or accessories if possible');
  }
  
  return {
    score,
    passesThreshold: score >= PIPELINE_CONFIG.minQuality,
    factors: {
      lighting,
      sharpness,
      pose,
      occlusion,
    },
    tips,
  };
}

/**
 * Assess lighting quality
 */
function assessLighting(value: number): { score: number; status: 'good' | 'warning' | 'poor' } {
  // Ideal lighting: 60-90
  let score = 100;
  if (value < 40 || value > 95) {
    score = 30;
  } else if (value < 50 || value > 90) {
    score = 60;
  } else if (value < 60 || value > 85) {
    score = 80;
  }
  
  return {
    score,
    status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'poor',
  };
}

/**
 * Assess sharpness (inverse of blur)
 */
function assessSharpness(value: number): { score: number; status: 'good' | 'warning' | 'poor' } {
  // Higher blur value = sharper image
  const score = Math.min(100, value);
  
  return {
    score,
    status: score >= 75 ? 'good' : score >= 60 ? 'warning' : 'poor',
  };
}

/**
 * Assess head pose angle
 */
function assessPose(angle?: { yaw: number; pitch: number; roll: number }): {
  score: number;
  status: 'good' | 'warning' | 'poor';
} {
  if (!angle) {
    return { score: 50, status: 'warning' };
  }
  
  // Penalize large angles
  const yawPenalty = Math.abs(angle.yaw) > 20 ? 30 : Math.abs(angle.yaw) > 10 ? 10 : 0;
  const pitchPenalty = Math.abs(angle.pitch) > 15 ? 20 : Math.abs(angle.pitch) > 8 ? 8 : 0;
  const rollPenalty = Math.abs(angle.roll) > 10 ? 15 : Math.abs(angle.roll) > 5 ? 5 : 0;
  
  const score = Math.max(0, 100 - yawPenalty - pitchPenalty - rollPenalty);
  
  return {
    score,
    status: score >= 80 ? 'good' : score >= 65 ? 'warning' : 'poor',
  };
}

/**
 * Assess occlusion
 */
function assessOcclusion(metadata: FaceFrame['metadata']): {
  score: number;
  status: 'good' | 'warning' | 'poor';
} {
  // Stub - would use face landmarks to detect glasses, masks, etc.
  // For now, assume no occlusion
  return { score: 95, status: 'good' };
}

// ==================== EMBEDDING AGGREGATION ====================

/**
 * Aggregate multiple embeddings into single enrolled embedding
 * 
 * INTEGRATION POINT:
 * - Implement weighted averaging based on quality scores
 * - Consider outlier rejection (remove embeddings too far from median)
 * - Optionally use template update algorithm (maintain running average)
 * 
 * @param embeddings - Array of embeddings from multiple shots
 * @param qualities - Corresponding quality assessments
 * @returns Enrolled embedding
 */
export function aggregateEmbeddings(
  embeddings: FaceEmbedding[],
  qualities: QualityAssessment[]
): EnrolledEmbedding {
  if (embeddings.length === 0) {
    throw new Error('No embeddings to aggregate');
  }
  
  const dim = PIPELINE_CONFIG.embeddingDim;
  const aggregated = new Float32Array(dim);
  
  // Weighted average based on quality scores
  let totalWeight = 0;
  embeddings.forEach((emb, idx) => {
    const weight = qualities[idx].score / 100;
    totalWeight += weight;
    
    for (let i = 0; i < dim; i++) {
      aggregated[i] += emb.vector[i] * weight;
    }
  });
  
  // Normalize by total weight
  for (let i = 0; i < dim; i++) {
    aggregated[i] /= totalWeight;
  }
  
  // Re-normalize to unit length
  const norm = Math.sqrt(aggregated.reduce((sum, val) => sum + val * val, 0));
  for (let i = 0; i < dim; i++) {
    aggregated[i] /= norm;
  }
  
  // Compute composite quality
  const avgQuality = qualities.reduce((sum, q) => sum + q.score, 0) / qualities.length;
  
  return {
    primaryEmbedding: aggregated,
    auxiliaryEmbeddings: embeddings.map(e => e.vector),
    aggregationMethod: 'weighted',
    qualityScore: Math.round(avgQuality),
    shotCount: embeddings.length,
    capturedAt: Date.now(),
  };
}

// ==================== TOON ENCODING ====================

/**
 * Pack embedding for TOON transmission
 * 
 * INTEGRATION POINT:
 * - Implement proper quantization (int8, int16, or custom)
 * - Add compression (zlib, brotli) for F2 token
 * - Include version/metadata in F3 for compatibility
 * 
 * Quantization strategies:
 * - int8_scalar: Scale to -128 to 127 range, store scale factor
 * - int16_scalar: Higher precision, larger payload
 * - block_quantization: Quantize in blocks for better accuracy
 * 
 * @param enrolled - Enrolled embedding
 * @returns TOON face tokens
 */
export function packEmbeddingForToon(enrolled: EnrolledEmbedding): ToonFaceToken {
  // Quantize to int8 (simple scalar quantization)
  const quantized = quantizeEmbedding(enrolled.primaryEmbedding);
  
  // Convert to base64 for TOON
  const base64 = arrayBufferToBase64(quantized.buffer);
  
  // Build metadata
  const metadata = {
    version: PIPELINE_CONFIG.modelVersion,
    quality: enrolled.qualityScore,
    shots: enrolled.shotCount,
    method: 'int8_scalar',
    scale: quantized.scale,
    timestamp: enrolled.capturedAt,
  };
  
  return {
    F2: base64,
    F3: encodeMetadata(metadata),
    method: 'int8_scalar',
  };
}

/**
 * Quantize embedding to int8
 */
function quantizeEmbedding(vector: Float32Array): { buffer: ArrayBuffer; scale: number } {
  // Find min/max for scaling
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < vector.length; i++) {
    if (vector[i] < min) min = vector[i];
    if (vector[i] > max) max = vector[i];
  }
  
  // Compute scale factor
  const scale = Math.max(Math.abs(min), Math.abs(max)) / 127;
  
  // Quantize to int8
  const quantized = new Int8Array(vector.length);
  for (let i = 0; i < vector.length; i++) {
    quantized[i] = Math.round(vector[i] / scale);
  }
  
  return { buffer: quantized.buffer, scale };
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Encode metadata for F3 token
 */
function encodeMetadata(metadata: any): string {
  // Simple key=value encoding (TOON-style)
  const pairs: string[] = [];
  for (const [key, value] of Object.entries(metadata)) {
    pairs.push(`${key}=${value}`);
  }
  return pairs.join('|');
}

// ==================== UTILITIES ====================

/**
 * Get pipeline configuration
 */
export function getPipelineConfig() {
  return { ...PIPELINE_CONFIG };
}

/**
 * Compute similarity between two embeddings (cosine similarity)
 * Range: -1 (opposite) to 1 (identical)
 * 
 * @param emb1 - First embedding
 * @param emb2 - Second embedding
 * @returns Similarity score
 */
export function computeSimilarity(emb1: Float32Array, emb2: Float32Array): number {
  if (emb1.length !== emb2.length) {
    throw new Error('Embeddings must have same dimension');
  }
  
  let dotProduct = 0;
  for (let i = 0; i < emb1.length; i++) {
    dotProduct += emb1[i] * emb2[i];
  }
  
  return dotProduct;  // Assuming normalized vectors
}

/**
 * Validate frame for processing
 */
export function validateFrame(frame: FaceFrame): { valid: boolean; reason?: string } {
  if (!frame.metadata.faceDetected) {
    return { valid: false, reason: 'No face detected' };
  }
  
  if (frame.metadata.faceCount > 1) {
    return { valid: false, reason: 'Multiple faces detected' };
  }
  
  return { valid: true };
}
