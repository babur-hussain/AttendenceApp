/**
 * ONNX Face Model Interface
 * 
 * Provides a unified interface for loading and running face embedding models
 * using ONNX Runtime. Supports both native ONNX runtime and tfjs-react-native
 * fallback for maximum compatibility.
 * 
 * RECOMMENDED MODELS:
 * - ArcFace ResNet50 (512-d): High accuracy, ~100ms on mobile GPU
 * - MobileFaceNet (128-d): Fast, ~30ms on mobile, good for Pi
 * - InsightFace MS1MV2 (512-d): Balanced accuracy/speed
 * 
 * CANONICAL INPUT:
 * - Shape: [1, 3, 112, 112] (NCHW) or [1, 112, 112, 3] (NHWC)
 * - Type: float32
 * - Range: [-1, 1] or [0, 1] (check model metadata)
 * - Color: RGB (some models expect BGR - check!)
 */

import * as FileSystem from 'expo-file-system/legacy';

/**
 * Model configuration options
 */
export interface ModelConfig {
  modelName: string;
  modelPath?: string; // Local path or bundled asset
  modelUrl?: string; // Remote URL for download
  version: string;
  checksum?: string; // SHA256 checksum for verification
  
  // Model specifications
  inputShape: [number, number, number, number]; // e.g., [1, 3, 112, 112]
  outputDim: number; // Embedding dimension (e.g., 512)
  inputLayout: 'NCHW' | 'NHWC';
  colorOrder: 'RGB' | 'BGR';
  normalization: {
    range: [-1, 1] | [0, 1];
    mean?: [number, number, number];
    std?: [number, number, number];
  };
  
  // Runtime options
  useGPU?: boolean;
  useNNAPI?: boolean; // Android
  useMetal?: boolean; // iOS
  quantized?: boolean;
}

/**
 * Model metadata
 */
export interface ModelInfo {
  name: string;
  version: string;
  inputShape: number[];
  outputDim: number;
  quantized: boolean;
  backend: 'onnx-native' | 'tfjs' | 'unloaded';
}

/**
 * Tensor-like input for embedding computation
 */
export interface TensorLike {
  data: Float32Array;
  shape: number[];
  dtype: 'float32';
}

/**
 * ONNX Face Model wrapper
 * 
 * Handles model loading, inference, and runtime selection.
 */
export class OnnxFaceModel {
  private config: ModelConfig;
  private session: any; // ONNX InferenceSession or tfjs model
  private backend: 'onnx-native' | 'tfjs' | 'unloaded' = 'unloaded';
  private isLoaded: boolean = false;

  constructor(config: ModelConfig) {
    this.config = config;
  }

  /**
   * Load the ONNX model
   * 
   * INTEGRATION STEPS:
   * 1. Try to load with onnxruntime-react-native (native)
   * 2. Fall back to tfjs-react-native if native unavailable
   * 3. Validate model inputs/outputs match expected config
   * 
   * @param options Load options
   */
  async loadModel(options?: {
    forceBackend?: 'onnx-native' | 'tfjs';
    enableGPU?: boolean;
  }): Promise<void> {
    console.log(`[OnnxFaceModel] Loading model: ${this.config.modelName} v${this.config.version}`);

    // Determine model path (local or download)
    const modelPath = await this.resolveModelPath();

    try {
      // === OPTION 1: Native ONNX Runtime (RECOMMENDED) ===
      if (!options?.forceBackend || options.forceBackend === 'onnx-native') {
        try {
          await this.loadWithOnnxNative(modelPath, options);
          return;
        } catch (error) {
          console.warn('[OnnxFaceModel] Native ONNX runtime not available:', error);
        }
      }

      // === OPTION 2: TensorFlow.js Fallback ===
      console.log('[OnnxFaceModel] Falling back to tfjs-react-native...');
      await this.loadWithTfjs(modelPath, options);
      
    } catch (error) {
      console.error('[OnnxFaceModel] Failed to load model:', error);
      throw new Error(`Failed to load face model: ${error}`);
    }
  }

  /**
   * Load model using native ONNX Runtime
   * 
   * TODO: NATIVE ONNX RUNTIME INTEGRATION
   * 
   * STEPS:
   * 1. Install: npm install onnxruntime-react-native
   * 2. Configure native modules in EAS build (see docs/EAS_INTEGRATION.md)
   * 3. Import and use InferenceSession
   * 
   * EXAMPLE:
   * ```typescript
   * import { InferenceSession, Tensor } from 'onnxruntime-react-native';
   * 
   * const session = await InferenceSession.create(modelPath, {
   *   executionProviders: ['nnapi', 'cpu'], // Android
   *   // executionProviders: ['coreml', 'cpu'], // iOS
   * });
   * 
   * this.session = session;
   * this.backend = 'onnx-native';
   * this.isLoaded = true;
   * ```
   */
  private async loadWithOnnxNative(
    modelPath: string,
    options?: { enableGPU?: boolean }
  ): Promise<void> {
    // TODO: Uncomment when onnxruntime-react-native is installed
    // const ort = await import('onnxruntime-react-native');
    // 
    // // Configure execution providers (delegates)
    // const executionProviders: string[] = [];
    // 
    // if (Platform.OS === 'android') {
    //   if (this.config.useNNAPI !== false) {
    //     executionProviders.push('nnapi'); // Neural Networks API
    //   }
    //   if (options?.enableGPU && this.config.useGPU !== false) {
    //     executionProviders.push('gpu'); // OpenCL
    //   }
    // } else if (Platform.OS === 'ios') {
    //   if (this.config.useMetal !== false) {
    //     executionProviders.push('coreml'); // Core ML / Metal
    //   }
    // }
    // 
    // // Always include CPU as fallback
    // executionProviders.push('cpu');
    // 
    // console.log('[OnnxFaceModel] Using execution providers:', executionProviders);
    // 
    // // Create inference session
    // this.session = await ort.InferenceSession.create(modelPath, {
    //   executionProviders,
    //   graphOptimizationLevel: 'all',
    // });
    // 
    // // Validate input/output shapes
    // const inputNames = this.session.inputNames;
    // const outputNames = this.session.outputNames;
    // 
    // console.log('[OnnxFaceModel] Input names:', inputNames);
    // console.log('[OnnxFaceModel] Output names:', outputNames);
    // 
    // // TODO: Validate against this.config.inputShape and this.config.outputDim
    // 
    // this.backend = 'onnx-native';
    // this.isLoaded = true;
    // 
    // console.log('[OnnxFaceModel] Model loaded successfully with ONNX native runtime');

    throw new Error('Native ONNX runtime not configured - see TODO comments');
  }

  /**
   * Load model using TensorFlow.js (fallback)
   * 
   * TODO: TFJS INTEGRATION
   * 
   * STEPS:
   * 1. Install: npm install @tensorflow/tfjs @tensorflow/tfjs-react-native
   * 2. Convert ONNX model to TensorFlow.js format using onnx-tf + tensorflowjs_converter
   * 3. Bundle converted model or download on-demand
   * 
   * EXAMPLE:
   * ```typescript
   * import * as tf from '@tensorflow/tfjs';
   * import '@tensorflow/tfjs-react-native';
   * 
   * await tf.ready();
   * 
   * const model = await tf.loadGraphModel(modelPath);
   * this.session = model;
   * this.backend = 'tfjs';
   * this.isLoaded = true;
   * ```
   * 
   * NOTE: TensorFlow.js is slower than native ONNX runtime but provides
   * better compatibility for pure-JS deployment.
   */
  private async loadWithTfjs(
    modelPath: string,
    options?: { enableGPU?: boolean }
  ): Promise<void> {
    // TODO: Uncomment when tfjs-react-native is installed
    // const tf = await import('@tensorflow/tfjs');
    // await import('@tensorflow/tfjs-react-native');
    // 
    // await tf.ready();
    // 
    // console.log('[OnnxFaceModel] TensorFlow.js backend:', tf.getBackend());
    // 
    // // Load TensorFlow.js model (must be converted from ONNX first)
    // const tfjsModelPath = modelPath.replace('.onnx', '/model.json');
    // 
    // this.session = await tf.loadGraphModel(tfjsModelPath);
    // this.backend = 'tfjs';
    // this.isLoaded = true;
    // 
    // console.log('[OnnxFaceModel] Model loaded successfully with TensorFlow.js');

    throw new Error('TensorFlow.js fallback not configured - see TODO comments');
  }

  /**
   * Compute face embedding from preprocessed image tensor
   * 
   * INPUT REQUIREMENTS:
   * - Tensor shape must match model config (e.g., [1, 3, 112, 112])
   * - Data type: float32
   * - Value range: as specified in model config ([-1,1] or [0,1])
   * - Color order: RGB or BGR as specified in model config
   * 
   * @param imageTensor Preprocessed image tensor
   * @returns Face embedding (Float32Array)
   */
  async computeEmbedding(imageTensor: TensorLike): Promise<Float32Array> {
    if (!this.isLoaded) {
      throw new Error('Model not loaded - call loadModel() first');
    }

    // Validate input shape
    const expectedShape = this.config.inputShape;
    if (imageTensor.shape.length !== expectedShape.length) {
      throw new Error(
        `Input shape mismatch: expected ${expectedShape.length}D, got ${imageTensor.shape.length}D`
      );
    }

    console.log('[OnnxFaceModel] Computing embedding...');
    const startTime = Date.now();

    try {
      let embedding: Float32Array;

      if (this.backend === 'onnx-native') {
        embedding = await this.runOnnxInference(imageTensor);
      } else if (this.backend === 'tfjs') {
        embedding = await this.runTfjsInference(imageTensor);
      } else {
        throw new Error('Model not loaded');
      }

      const elapsedMs = Date.now() - startTime;
      console.log(`[OnnxFaceModel] Embedding computed in ${elapsedMs}ms`);

      // Validate output dimension
      if (embedding.length !== this.config.outputDim) {
        throw new Error(
          `Output dimension mismatch: expected ${this.config.outputDim}, got ${embedding.length}`
        );
      }

      return embedding;
      
    } catch (error) {
      console.error('[OnnxFaceModel] Inference failed:', error);
      throw new Error(`Failed to compute embedding: ${error}`);
    }
  }

  /**
   * Run inference using native ONNX runtime
   */
  private async runOnnxInference(imageTensor: TensorLike): Promise<Float32Array> {
    // TODO: Uncomment when onnxruntime-react-native is integrated
    // const ort = await import('onnxruntime-react-native');
    // 
    // // Create input tensor
    // const inputName = this.session.inputNames[0];
    // const inputTensor = new ort.Tensor(
    //   'float32',
    //   imageTensor.data,
    //   imageTensor.shape
    // );
    // 
    // // Run inference
    // const feeds = { [inputName]: inputTensor };
    // const outputs = await this.session.run(feeds);
    // 
    // // Extract embedding
    // const outputName = this.session.outputNames[0];
    // const outputTensor = outputs[outputName];
    // 
    // return outputTensor.data as Float32Array;

    throw new Error('ONNX inference not implemented - see TODO comments');
  }

  /**
   * Run inference using TensorFlow.js
   */
  private async runTfjsInference(imageTensor: TensorLike): Promise<Float32Array> {
    // TODO: Uncomment when tfjs is integrated
    // const tf = await import('@tensorflow/tfjs');
    // 
    // // Create tensor
    // const inputTensor = tf.tensor(
    //   imageTensor.data,
    //   imageTensor.shape,
    //   'float32'
    // );
    // 
    // // Run inference
    // const outputTensor = this.session.predict(inputTensor) as tf.Tensor;
    // 
    // // Extract data
    // const embedding = await outputTensor.data();
    // 
    // // Cleanup
    // inputTensor.dispose();
    // outputTensor.dispose();
    // 
    // return embedding as Float32Array;

    throw new Error('TensorFlow.js inference not implemented - see TODO comments');
  }

  /**
   * Get model information
   */
  modelInfo(): ModelInfo {
    return {
      name: this.config.modelName,
      version: this.config.version,
      inputShape: Array.from(this.config.inputShape),
      outputDim: this.config.outputDim,
      quantized: this.config.quantized || false,
      backend: this.backend,
    };
  }

  /**
   * Check if model is loaded
   */
  isModelLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * Unload model and free resources
   */
  async unload(): Promise<void> {
    if (this.session) {
      // TODO: Implement proper cleanup for each backend
      // if (this.backend === 'onnx-native') {
      //   await this.session.release();
      // } else if (this.backend === 'tfjs') {
      //   this.session.dispose();
      // }
      
      this.session = null;
      this.isLoaded = false;
      this.backend = 'unloaded';
      
      console.log('[OnnxFaceModel] Model unloaded');
    }
  }

  /**
   * Resolve model path (local or download if needed)
   */
  private async resolveModelPath(): Promise<string> {
    // If local path provided, use it
    if (this.config.modelPath) {
      const exists = await this.fileExists(this.config.modelPath);
      if (exists) {
        return this.config.modelPath;
      }
    }

    // If URL provided, download to cache
    if (this.config.modelUrl) {
      console.log('[OnnxFaceModel] Downloading model from:', this.config.modelUrl);
      
      const cacheDir = `${FileSystem.cacheDirectory}onnx_models/`;
      await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true });
      
      const localPath = `${cacheDir}${this.config.modelName}_${this.config.version}.onnx`;
      
      // Check if already downloaded
      const exists = await this.fileExists(localPath);
      if (exists) {
        console.log('[OnnxFaceModel] Using cached model:', localPath);
        return localPath;
      }

      // Download
      const downloadResult = await FileSystem.downloadAsync(
        this.config.modelUrl,
        localPath
      );

      if (downloadResult.status !== 200) {
        throw new Error(`Failed to download model: HTTP ${downloadResult.status}`);
      }

      // Verify checksum if provided
      if (this.config.checksum) {
        await this.verifyChecksum(localPath, this.config.checksum);
      }

      console.log('[OnnxFaceModel] Model downloaded to:', localPath);
      return localPath;
    }

    throw new Error('No model path or URL provided in config');
  }

  /**
   * Check if file exists
   */
  private async fileExists(path: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  }

  /**
   * Verify file checksum
   */
  private async verifyChecksum(filePath: string, expectedChecksum: string): Promise<void> {
    // TODO: Implement SHA256 checksum verification
    // Consider using expo-crypto or react-native-quick-crypto
    
    console.warn('[OnnxFaceModel] Checksum verification not implemented');
    
    // Example:
    // const crypto = await import('expo-crypto');
    // const fileData = await FileSystem.readAsStringAsync(filePath, {
    //   encoding: FileSystem.EncodingType.Base64,
    // });
    // const actualChecksum = await crypto.digestStringAsync(
    //   crypto.CryptoDigestAlgorithm.SHA256,
    //   fileData
    // );
    // 
    // if (actualChecksum.toLowerCase() !== expectedChecksum.toLowerCase()) {
    //   throw new Error('Checksum mismatch - corrupted download');
    // }
  }
}

/**
 * Default model configurations
 */
export const DEFAULT_MODELS: Record<string, ModelConfig> = {
  // ArcFace ResNet50 (512-d) - High accuracy
  'arcface_r50': {
    modelName: 'arcface_r50',
    version: '1.0.0',
    inputShape: [1, 3, 112, 112],
    outputDim: 512,
    inputLayout: 'NCHW',
    colorOrder: 'RGB',
    normalization: {
      range: [-1, 1] as [-1, 1],
      mean: [0.5, 0.5, 0.5],
      std: [0.5, 0.5, 0.5],
    },
    quantized: false,
  },

  // MobileFaceNet (128-d) - Fast, low memory
  'mobilefacenet': {
    modelName: 'mobilefacenet',
    version: '1.0.0',
    inputShape: [1, 3, 112, 112],
    outputDim: 128,
    inputLayout: 'NCHW',
    colorOrder: 'RGB',
    normalization: {
      range: [-1, 1] as [-1, 1],
      mean: [0.5, 0.5, 0.5],
      std: [0.5, 0.5, 0.5],
    },
    quantized: false,
  },

  // ArcFace ResNet50 Quantized (INT8)
  'arcface_r50_int8': {
    modelName: 'arcface_r50_int8',
    version: '1.0.0',
    inputShape: [1, 3, 112, 112],
    outputDim: 512,
    inputLayout: 'NCHW',
    colorOrder: 'RGB',
    normalization: {
      range: [-1, 1] as [-1, 1],
      mean: [0.5, 0.5, 0.5],
      std: [0.5, 0.5, 0.5],
    },
    quantized: true,
  },
};

/**
 * Create a face model instance with default configuration
 */
export function createFaceModel(
  modelKey: keyof typeof DEFAULT_MODELS,
  overrides?: Partial<ModelConfig>
): OnnxFaceModel {
  const config = { ...DEFAULT_MODELS[modelKey], ...overrides };
  return new OnnxFaceModel(config);
}
