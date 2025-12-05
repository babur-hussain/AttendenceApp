/**
 * ONNX Face Recognition Module
 * 
 * Complete ONNX integration for face recognition with preprocessing,
 * postprocessing, quantization, and model management.
 * 
 * @example
 * ```typescript
 * import { createFaceModel, preprocessFace, l2Normalize, embeddingToToonF2 } from './biometric/onnx';
 * 
 * // Load model
 * const model = await createFaceModel('arcface_r50');
 * await model.loadModel();
 * 
 * // Preprocess image
 * const preprocessed = await preprocessFace(image);
 * 
 * // Compute embedding
 * const embedding = await model.computeEmbedding(preprocessed.tensor);
 * 
 * // Postprocess
 * const normalized = l2Normalize(embedding);
 * 
 * // Quantize for transmission
 * const tokens = embeddingToToonF2(normalized);
 * ```
 */

// Model Management
export {
  OnnxFaceModel,
  createFaceModel,
  ModelConfig,
  ModelInfo,
  TensorLike,
  DEFAULT_MODELS,
} from './OnnxFaceModel';

export {
  ModelManager,
  getModelManager,
  ModelMetadata,
  ModelManagerConfig,
} from './modelManager';

// Preprocessing
export {
  detectFace,
  alignFace,
  cropAndResize,
  toInputTensor,
  normalizeTensor,
  preprocessFace,
  batchPreprocessFaces,
  FaceDetection,
  FaceLandmarks,
  ImageData,
  PreprocessedFace,
} from './preprocess';

// Postprocessing
export {
  l2Normalize,
  ensureFloat32,
  computeCosineSimilarity,
  computeMatchScore,
  validateEmbedding,
  computeEmbeddingQuality,
  batchL2Normalize,
  computePairwiseSimilarity,
  selectBestEmbedding,
  averageEmbeddings,
  detectOutliers,
} from './postprocess';

// Quantization
export {
  quantizeEmbeddingInt8,
  dequantizeEmbeddingInt8,
  packQuantizedToToonF2,
  unpackToonF2ToQuantized,
  embeddingToToonF2,
  toonF2ToEmbedding,
  testQuantizationAccuracy,
  batchQuantizeToToonF2,
  batchDequantizeFromToonF2,
  packForMatcher,
  unpackFromMatcher,
  QuantizedEmbedding,
  ToonF2Tokens,
} from './quantize';
