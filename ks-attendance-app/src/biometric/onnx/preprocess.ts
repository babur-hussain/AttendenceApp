/**
 * Face Preprocessing Pipeline
 * 
 * Provides utilities for detecting, aligning, cropping, and normalizing
 * face images for ONNX model inference.
 * 
 * CANONICAL PIPELINE FOR ARCFACE/INSIGHTFACE:
 * 1. Detect face bounding box + 5 landmarks (eyes, nose, mouth corners)
 * 2. Align face to canonical pose using similarity transform
 * 3. Crop to face region with margin
 * 4. Resize to model input size (typically 112×112)
 * 5. Convert to RGB float32, normalize to [-1, 1] or [0, 1]
 * 6. Arrange to NCHW or NHWC layout as model expects
 */

/**
 * Face detection result
 */
export interface FaceDetection {
  bbox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  landmarks?: FaceLandmarks;
}

/**
 * 5-point facial landmarks
 * (left eye, right eye, nose, left mouth, right mouth)
 */
export interface FaceLandmarks {
  leftEye: { x: number; y: number };
  rightEye: { x: number; y: number };
  nose: { x: number; y: number };
  leftMouth: { x: number; y: number };
  rightMouth: { x: number; y: number };
}

/**
 * Image data structure (compatible with RN Image)
 */
export interface ImageData {
  width: number;
  height: number;
  data: Uint8ClampedArray | Uint8Array | number[]; // RGBA or RGB
  channels: 3 | 4; // RGB or RGBA
}

/**
 * Preprocessed face tensor ready for model inference
 */
export interface PreprocessedFace {
  tensor: Float32Array;
  shape: number[]; // e.g., [1, 3, 112, 112] or [1, 112, 112, 3]
  originalSize: { width: number; height: number };
  landmarks?: FaceLandmarks;
}

/**
 * Detect face in image
 * 
 * TODO: FACE DETECTOR INTEGRATION
 * 
 * Recommended detectors:
 * - MTCNN: Multi-task CNN, good accuracy, outputs 5 landmarks
 * - RetinaFace: State-of-art, very accurate, outputs 5 landmarks
 * - BlazeFace: Fast, mobile-optimized, TensorFlow.js compatible
 * - MediaPipe Face Detection: Google's mobile solution
 * 
 * INTEGRATION OPTIONS:
 * 1. Use separate ONNX model for detection (RetinaFace ONNX)
 * 2. Use TensorFlow.js model (BlazeFace via tfjs)
 * 3. Use native detector (Vision Framework on iOS, ML Kit on Android)
 * 4. Call server-side detection API via TOON tokens
 * 
 * EXAMPLE WITH BLAZEFACE (TFJS):
 * ```typescript
 * import * as blazeface from '@tensorflow-models/blazeface';
 * 
 * const model = await blazeface.load();
 * const predictions = await model.estimateFaces(imageTensor, false);
 * 
 * if (predictions.length > 0) {
 *   const face = predictions[0];
 *   return {
 *     bbox: {
 *       x: face.topLeft[0],
 *       y: face.topLeft[1],
 *       width: face.bottomRight[0] - face.topLeft[0],
 *       height: face.bottomRight[1] - face.topLeft[1],
 *     },
 *     confidence: face.probability[0],
 *     landmarks: extractLandmarks(face.landmarks),
 *   };
 * }
 * ```
 * 
 * @param image Input image
 * @returns Face detection result or null if no face found
 */
export async function detectFace(image: ImageData): Promise<FaceDetection | null> {
  console.log('[Preprocess] Detecting face...');

  // TODO: Integrate actual face detector
  // For now, return a placeholder that assumes centered face
  
  // Estimate face region (centered, 70% of image)
  const faceWidth = image.width * 0.7;
  const faceHeight = image.height * 0.7;
  const x = (image.width - faceWidth) / 2;
  const y = (image.height - faceHeight) / 2;

  // Estimate 5-point landmarks (rough approximation for testing)
  const landmarks: FaceLandmarks = {
    leftEye: { x: x + faceWidth * 0.35, y: y + faceHeight * 0.35 },
    rightEye: { x: x + faceWidth * 0.65, y: y + faceHeight * 0.35 },
    nose: { x: x + faceWidth * 0.5, y: y + faceHeight * 0.5 },
    leftMouth: { x: x + faceWidth * 0.4, y: y + faceHeight * 0.7 },
    rightMouth: { x: x + faceWidth * 0.6, y: y + faceHeight * 0.7 },
  };

  return {
    bbox: { x, y, width: faceWidth, height: faceHeight },
    confidence: 0.95,
    landmarks,
  };
}

/**
 * Align face to canonical pose using similarity transform
 * 
 * Uses eye and nose landmarks to compute rotation, scale, and translation
 * to align face to standard orientation. This significantly improves
 * matching accuracy.
 * 
 * ALIGNMENT STRATEGY:
 * - Compute eye center and angle between eyes
 * - Rotate image so eyes are horizontal
 * - Scale to standard inter-eye distance
 * - Translate so eyes are at canonical positions
 * 
 * CANONICAL EYE POSITIONS (for 112×112):
 * - Left eye: (38, 45)
 * - Right eye: (74, 45)
 * - Inter-eye distance: 36 pixels
 * 
 * @param image Input image
 * @param landmarks Facial landmarks
 * @returns Aligned image
 */
export async function alignFace(
  image: ImageData,
  landmarks: FaceLandmarks
): Promise<ImageData> {
  console.log('[Preprocess] Aligning face...');

  // TODO: Implement similarity transform alignment
  // 
  // STEPS:
  // 1. Compute eye center: (leftEye + rightEye) / 2
  // 2. Compute rotation angle: atan2(dy, dx) where dy/dx = eye delta
  // 3. Compute scale: targetEyeDistance / actualEyeDistance
  // 4. Build affine transform matrix [scale*cos(θ), -scale*sin(θ), tx]
  //                                  [scale*sin(θ),  scale*cos(θ), ty]
  // 5. Apply warpAffine to image
  //
  // LIBRARIES:
  // - Use canvas API for basic transforms
  // - Or use react-native-image-manipulator for native performance
  // - Or opencv.js for advanced transforms
  //
  // EXAMPLE WITH CANVAS:
  // ```typescript
  // const canvas = createCanvas(image.width, image.height);
  // const ctx = canvas.getContext('2d');
  // 
  // // Compute transform
  // const eyeCenter = {
  //   x: (landmarks.leftEye.x + landmarks.rightEye.x) / 2,
  //   y: (landmarks.leftEye.y + landmarks.rightEye.y) / 2,
  // };
  // 
  // const dx = landmarks.rightEye.x - landmarks.leftEye.x;
  // const dy = landmarks.rightEye.y - landmarks.leftEye.y;
  // const angle = Math.atan2(dy, dx);
  // 
  // // Apply transform
  // ctx.translate(eyeCenter.x, eyeCenter.y);
  // ctx.rotate(-angle);
  // ctx.translate(-eyeCenter.x, -eyeCenter.y);
  // ctx.drawImage(imageElement, 0, 0);
  // 
  // return canvasToImageData(canvas);
  // ```

  // For now, return original image (no alignment)
  console.warn('[Preprocess] Face alignment not implemented - returning original');
  return image;
}

/**
 * Crop face region and resize to target dimensions
 * 
 * @param image Input image
 * @param bbox Face bounding box
 * @param targetWidth Target width (default: 112 for ArcFace)
 * @param targetHeight Target height (default: 112 for ArcFace)
 * @param marginRatio Extra margin around bbox (default: 0.2 = 20%)
 * @returns Cropped and resized image
 */
export async function cropAndResize(
  image: ImageData,
  bbox: { x: number; y: number; width: number; height: number },
  targetWidth: number = 112,
  targetHeight: number = 112,
  marginRatio: number = 0.2
): Promise<ImageData> {
  console.log(`[Preprocess] Cropping and resizing to ${targetWidth}×${targetHeight}...`);

  // Add margin
  const marginX = bbox.width * marginRatio;
  const marginY = bbox.height * marginRatio;

  const cropX = Math.max(0, bbox.x - marginX);
  const cropY = Math.max(0, bbox.y - marginY);
  const cropWidth = Math.min(image.width - cropX, bbox.width + 2 * marginX);
  const cropHeight = Math.min(image.height - cropY, bbox.height + 2 * marginY);

  // TODO: Implement actual crop and resize
  // 
  // OPTION 1: Use react-native-image-manipulator (recommended for mobile)
  // ```typescript
  // import * as ImageManipulator from 'expo-image-manipulator';
  // 
  // const manipResult = await ImageManipulator.manipulateAsync(
  //   image.uri, // assuming image has URI
  //   [
  //     { crop: { originX: cropX, originY: cropY, width: cropWidth, height: cropHeight } },
  //     { resize: { width: targetWidth, height: targetHeight } },
  //   ],
  //   { format: ImageManipulator.SaveFormat.PNG }
  // );
  // 
  // // Load manipulated image data
  // return loadImageData(manipResult.uri);
  // ```
  //
  // OPTION 2: Use canvas (works but slower)
  // ```typescript
  // const canvas = createCanvas(targetWidth, targetHeight);
  // const ctx = canvas.getContext('2d');
  // 
  // ctx.drawImage(
  //   imageElement,
  //   cropX, cropY, cropWidth, cropHeight,  // source
  //   0, 0, targetWidth, targetHeight       // destination
  // );
  // 
  // return canvasToImageData(canvas);
  // ```
  //
  // OPTION 3: Manual pixel interpolation (slowest, most control)

  // For now, create a placeholder resized image
  const resizedData = new Uint8ClampedArray(targetWidth * targetHeight * image.channels);
  
  // Simple nearest-neighbor resize (placeholder)
  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const srcX = Math.floor(cropX + (x / targetWidth) * cropWidth);
      const srcY = Math.floor(cropY + (y / targetHeight) * cropHeight);
      
      const srcIdx = (srcY * image.width + srcX) * image.channels;
      const dstIdx = (y * targetWidth + x) * image.channels;
      
      for (let c = 0; c < image.channels; c++) {
        resizedData[dstIdx + c] = (image.data as any)[srcIdx + c] || 0;
      }
    }
  }

  return {
    width: targetWidth,
    height: targetHeight,
    data: resizedData,
    channels: image.channels,
  };
}

/**
 * Convert image to input tensor for model
 * 
 * Handles:
 * - RGB/BGR conversion
 * - RGBA to RGB (drop alpha channel)
 * - Uint8 to Float32
 * - Pixel value scaling (0-255 → 0-1 or -1-1)
 * - Channel layout (HWC → CHW for NCHW models)
 * 
 * @param image Input image (RGB or RGBA, uint8)
 * @param targetLayout 'NCHW' or 'NHWC'
 * @param colorOrder 'RGB' or 'BGR'
 * @returns Float32Array tensor
 */
export function toInputTensor(
  image: ImageData,
  targetLayout: 'NCHW' | 'NHWC' = 'NCHW',
  colorOrder: 'RGB' | 'BGR' = 'RGB'
): Float32Array {
  const { width, height, data, channels } = image;
  const pixelCount = width * height;
  
  // Allocate output tensor
  const tensorSize = pixelCount * 3; // Always 3 channels (RGB)
  const tensor = new Float32Array(tensorSize);

  if (targetLayout === 'NCHW') {
    // Separate channels: [R, R, R, ..., G, G, G, ..., B, B, B, ...]
    const rOffset = 0;
    const gOffset = pixelCount;
    const bOffset = pixelCount * 2;

    for (let i = 0; i < pixelCount; i++) {
      const srcIdx = i * channels;
      
      const r = (data as any)[srcIdx + 0];
      const g = (data as any)[srcIdx + 1];
      const b = (data as any)[srcIdx + 2];

      if (colorOrder === 'RGB') {
        tensor[rOffset + i] = r / 255.0;
        tensor[gOffset + i] = g / 255.0;
        tensor[bOffset + i] = b / 255.0;
      } else {
        // BGR
        tensor[rOffset + i] = b / 255.0;
        tensor[gOffset + i] = g / 255.0;
        tensor[bOffset + i] = r / 255.0;
      }
    }
  } else {
    // NHWC: Interleaved channels [R, G, B, R, G, B, ...]
    for (let i = 0; i < pixelCount; i++) {
      const srcIdx = i * channels;
      const dstIdx = i * 3;

      const r = (data as any)[srcIdx + 0];
      const g = (data as any)[srcIdx + 1];
      const b = (data as any)[srcIdx + 2];

      if (colorOrder === 'RGB') {
        tensor[dstIdx + 0] = r / 255.0;
        tensor[dstIdx + 1] = g / 255.0;
        tensor[dstIdx + 2] = b / 255.0;
      } else {
        // BGR
        tensor[dstIdx + 0] = b / 255.0;
        tensor[dstIdx + 1] = g / 255.0;
        tensor[dstIdx + 2] = r / 255.0;
      }
    }
  }

  return tensor;
}

/**
 * Normalize tensor values
 * 
 * Common normalization schemes:
 * - ImageNet: mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]
 * - ArcFace/InsightFace: mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5] → maps [0,1] to [-1,1]
 * - Some models: mean=[127.5, 127.5, 127.5], std=[128, 128, 128] (applied to [0,255])
 * 
 * Formula: normalized = (value - mean) / std
 * 
 * @param tensor Input tensor (0-1 range after toInputTensor)
 * @param mean Per-channel mean
 * @param std Per-channel standard deviation
 * @param layout 'NCHW' or 'NHWC'
 * @returns Normalized tensor (in-place modification)
 */
export function normalizeTensor(
  tensor: Float32Array,
  mean: [number, number, number] = [0.5, 0.5, 0.5],
  std: [number, number, number] = [0.5, 0.5, 0.5],
  layout: 'NCHW' | 'NHWC' = 'NCHW',
  shape?: [number, number, number, number] // [batch, channel, height, width] or [batch, height, width, channel]
): Float32Array {
  if (layout === 'NCHW') {
    // Channels are separated
    const channelSize = tensor.length / 3;
    
    for (let c = 0; c < 3; c++) {
      const offset = c * channelSize;
      const channelMean = mean[c];
      const channelStd = std[c];

      for (let i = 0; i < channelSize; i++) {
        tensor[offset + i] = (tensor[offset + i] - channelMean) / channelStd;
      }
    }
  } else {
    // NHWC: Channels are interleaved
    for (let i = 0; i < tensor.length; i += 3) {
      tensor[i + 0] = (tensor[i + 0] - mean[0]) / std[0];
      tensor[i + 1] = (tensor[i + 1] - mean[1]) / std[1];
      tensor[i + 2] = (tensor[i + 2] - mean[2]) / std[2];
    }
  }

  return tensor;
}

/**
 * Complete preprocessing pipeline
 * 
 * Combines all steps: detect → align → crop → resize → normalize → tensor
 * 
 * @param image Input image
 * @param options Preprocessing options
 * @returns Preprocessed face tensor ready for model
 */
export async function preprocessFace(
  image: ImageData,
  options?: {
    targetWidth?: number;
    targetHeight?: number;
    layout?: 'NCHW' | 'NHWC';
    colorOrder?: 'RGB' | 'BGR';
    normalization?: {
      mean: [number, number, number];
      std: [number, number, number];
    };
    skipAlignment?: boolean;
    marginRatio?: number;
  }
): Promise<PreprocessedFace> {
  const {
    targetWidth = 112,
    targetHeight = 112,
    layout = 'NCHW',
    colorOrder = 'RGB',
    normalization = { mean: [0.5, 0.5, 0.5] as [number, number, number], std: [0.5, 0.5, 0.5] as [number, number, number] },
    skipAlignment = false,
    marginRatio = 0.2,
  } = options || {};

  console.log('[Preprocess] Running full preprocessing pipeline...');

  // Step 1: Detect face
  const detection = await detectFace(image);
  if (!detection) {
    throw new Error('No face detected in image');
  }

  // Step 2: Align face (optional)
  let processedImage = image;
  if (!skipAlignment && detection.landmarks) {
    processedImage = await alignFace(image, detection.landmarks);
  }

  // Step 3: Crop and resize
  const croppedImage = await cropAndResize(
    processedImage,
    detection.bbox,
    targetWidth,
    targetHeight,
    marginRatio
  );

  // Step 4: Convert to tensor
  let tensor = toInputTensor(croppedImage, layout, colorOrder);

  // Step 5: Normalize
  tensor = normalizeTensor(
    tensor,
    normalization.mean,
    normalization.std,
    layout,
    [1, 3, targetHeight, targetWidth] // shape for NCHW
  );

  // Determine output shape
  const shape = layout === 'NCHW'
    ? [1, 3, targetHeight, targetWidth]
    : [1, targetHeight, targetWidth, 3];

  return {
    tensor,
    shape,
    originalSize: { width: image.width, height: image.height },
    landmarks: detection.landmarks,
  };
}

/**
 * Batch preprocess multiple images
 * 
 * Useful for multi-shot enrollment where you capture several
 * frames and want to extract embeddings for all of them.
 * 
 * @param images Array of input images
 * @param options Preprocessing options
 * @returns Array of preprocessed faces
 */
export async function batchPreprocessFaces(
  images: ImageData[],
  options?: Parameters<typeof preprocessFace>[1]
): Promise<PreprocessedFace[]> {
  console.log(`[Preprocess] Batch preprocessing ${images.length} images...`);

  const results: PreprocessedFace[] = [];

  for (const image of images) {
    try {
      const preprocessed = await preprocessFace(image, options);
      results.push(preprocessed);
    } catch (error) {
      console.warn('[Preprocess] Failed to preprocess image:', error);
      // Continue with other images
    }
  }

  return results;
}
