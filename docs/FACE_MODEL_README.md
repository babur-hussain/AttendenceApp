# Face Recognition Model Guide

Complete guide to selecting, configuring, and validating ONNX face recognition models for the Kapoor & Sons Attendance System.

---

## Table of Contents

1. [Recommended Models](#recommended-models)
2. [Model Selection Criteria](#model-selection-criteria)
3. [Input Specifications](#input-specifications)
4. [Performance Expectations](#performance-expectations)
5. [Model Validation](#model-validation)
6. [Troubleshooting](#troubleshooting)

---

## Recommended Models

### 1. **InsightFace ArcFace ResNet50** (Default - High Accuracy)

**Best for:** Production deployment where accuracy is critical

- **Model:** `arcface_r50.onnx`
- **Embedding Dimension:** 512
- **Input Size:** 112×112 RGB
- **Accuracy:** State-of-the-art (99.8% on LFW)
- **Speed:** ~80-150ms on mobile GPU
- **Size:** ~166 MB
- **Download:** [InsightFace Model Zoo](https://github.com/deepinsight/insightface/tree/master/model_zoo)

```typescript
const model = await createFaceModel('arcface_r50', {
  version: '1.0',
  url: 'https://your-cdn.com/models/arcface_r50.onnx',
  checksum: 'sha256-hash-here',
});
```

**Preprocessing:**
- Input: [1, 3, 112, 112] NCHW
- Color: RGB
- Normalization: [-1, 1] (mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5])

---

### 2. **MobileFaceNet** (Fast - Mobile Optimized)

**Best for:** Resource-constrained devices, real-time applications

- **Model:** `mobilefacenet.onnx`
- **Embedding Dimension:** 128
- **Input Size:** 112×112 RGB
- **Accuracy:** Good (99.2% on LFW)
- **Speed:** ~30-50ms on mobile CPU
- **Size:** ~4 MB
- **Download:** [InsightFace Model Zoo](https://github.com/deepinsight/insightface/tree/master/model_zoo)

```typescript
const model = await createFaceModel('mobilefacenet', {
  version: '1.0',
  url: 'https://your-cdn.com/models/mobilefacenet.onnx',
  checksum: 'sha256-hash-here',
});
```

**Preprocessing:**
- Input: [1, 3, 112, 112] NCHW
- Color: RGB
- Normalization: [-1, 1]

---

### 3. **ArcFace ResNet50 INT8** (Edge Deployment)

**Best for:** Raspberry Pi and edge devices with limited resources

- **Model:** `arcface_r50_int8.onnx`
- **Embedding Dimension:** 512
- **Input Size:** 112×112 RGB
- **Accuracy:** Very good (99.6% on LFW, <0.5% drop from FP32)
- **Speed:** ~200-300ms on Pi 4, ~600-800ms on Pi Zero
- **Size:** ~42 MB (75% smaller than FP32)
- **Download:** [Quantized from ArcFace R50 using ONNX tools]

```typescript
const model = await createFaceModel('arcface_r50_int8', {
  version: '1.0',
  url: 'https://your-cdn.com/models/arcface_r50_int8.onnx',
  checksum: 'sha256-hash-here',
  quantized: true,
});
```

**Preprocessing:** Same as ArcFace R50

---

## Model Selection Criteria

### Accuracy vs Speed Tradeoffs

| Model | Accuracy (LFW) | Mobile Speed | Pi Speed | Size | Recommendation |
|-------|---------------|--------------|----------|------|----------------|
| ArcFace R50 | 99.8% | 80-150ms | 500-800ms | 166MB | Production default |
| ArcFace R50 INT8 | 99.6% | 100-180ms | 200-300ms | 42MB | Edge deployment |
| MobileFaceNet | 99.2% | 30-50ms | 150-250ms | 4MB | Real-time apps |

### Decision Matrix

**Choose ArcFace ResNet50 if:**
- Accuracy is paramount
- Deploying to modern mobile devices (2020+)
- GPU acceleration available
- Network bandwidth not a constraint

**Choose MobileFaceNet if:**
- Real-time recognition needed (<50ms)
- Deploying to older devices
- CPU-only inference
- Low memory footprint required

**Choose ArcFace R50 INT8 if:**
- Deploying to Raspberry Pi or edge devices
- Limited storage available
- Accuracy still important
- Can tolerate slight speed reduction

---

## Input Specifications

### Standard Input Format

All recommended models use the following input format:

```typescript
{
  shape: [1, 3, 112, 112],  // [batch, channels, height, width]
  layout: 'NCHW',
  colorOrder: 'RGB',
  pixelFormat: 'float32',
  normalization: {
    mean: [0.5, 0.5, 0.5],
    std: [0.5, 0.5, 0.5],
  },
}
```

### Preprocessing Pipeline

```typescript
import { preprocessFace } from './biometric/onnx/preprocess';

const image = /* ImageData from camera */;

const preprocessed = await preprocessFace(image, {
  targetWidth: 112,
  targetHeight: 112,
  layout: 'NCHW',
  colorOrder: 'RGB',
  normalization: {
    mean: [0.5, 0.5, 0.5],
    std: [0.5, 0.5, 0.5],
  },
});

// preprocessed.tensor is ready for model inference
```

### Alternative Models (Non-Standard Input)

Some models may use different input specifications:

**FaceNet (Inception ResNet V1):**
- Input: [1, 3, 160, 160] NCHW
- Normalization: ImageNet (mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
- Output: 128-d embedding

**VGGFace2:**
- Input: [1, 3, 224, 224] NCHW
- Normalization: ImageNet
- Output: 512-d embedding

---

## Performance Expectations

### Mobile Devices (Expo/EAS)

**Android (NNAPI Delegate):**
- ArcFace R50: 80-120ms
- MobileFaceNet: 30-40ms
- Expected on: Snapdragon 845+ or equivalent

**iOS (CoreML Delegate):**
- ArcFace R50: 90-150ms
- MobileFaceNet: 35-50ms
- Expected on: iPhone X+ or A11 Bionic+

**Fallback (CPU Only):**
- ArcFace R50: 300-600ms
- MobileFaceNet: 100-200ms

### Raspberry Pi

**Pi 4 (4GB RAM, Cortex-A72):**
- ArcFace R50: 500-800ms (FP32)
- ArcFace R50 INT8: 200-300ms (with NEON/BLAS)
- MobileFaceNet: 150-250ms

**Pi Zero W (512MB RAM, ARM11):**
- ArcFace R50 INT8: 600-800ms
- MobileFaceNet: 400-600ms

**Optimization Tips:**
- Enable OpenBLAS: `sudo apt-get install libopenblas-dev`
- Use NEON intrinsics: Enable during ONNX Runtime build
- Disable GPU UI: Saves ~50-100ms by reducing context switches
- Use quantized models: 2-3x speedup with minimal accuracy loss

### Memory Requirements

| Model | FP32 Size | INT8 Size | Runtime Memory (Inference) |
|-------|-----------|-----------|----------------------------|
| ArcFace R50 | 166 MB | 42 MB | ~250 MB |
| MobileFaceNet | 4 MB | 1 MB | ~50 MB |

---

## Model Validation

### Step 1: Check Model Metadata

```typescript
import { createFaceModel } from './biometric/onnx/OnnxFaceModel';

const model = await createFaceModel('arcface_r50');
await model.loadModel();

const info = model.modelInfo();

console.log('Model loaded:', info);
// Expected:
// {
//   name: 'arcface_r50',
//   version: '1.0',
//   inputShape: [1, 3, 112, 112],
//   outputDim: 512,
//   quantized: false,
//   backend: 'onnx-native'
// }
```

### Step 2: Run Sample Inference

```typescript
import { preprocessFace } from './biometric/onnx/preprocess';
import { l2Normalize, validateEmbedding } from './biometric/onnx/postprocess';

// Load test image (known face)
const testImage = /* ImageData */;

// Preprocess
const preprocessed = await preprocessFace(testImage);

// Inference
const embedding = await model.computeEmbedding(preprocessed.tensor);

// Validate
validateEmbedding(embedding, 512); // Should not throw

// Normalize
const normalized = l2Normalize(embedding);

console.log('Embedding dimension:', embedding.length);
console.log('L2 norm:', Math.sqrt(embedding.reduce((sum, v) => sum + v*v, 0)));
```

### Step 3: Compare to Reference Embeddings

InsightFace provides reference embeddings for validation:

```typescript
// Reference embedding for test image (from official model)
const referenceEmbedding = /* Float32Array from model zoo */;

const similarity = computeMatchScore(normalized, referenceEmbedding);

console.log('Similarity to reference:', similarity);
// Expected: > 0.99 for exact same model, > 0.95 for quantized
```

### Step 4: Test Quantization Accuracy

```typescript
import { testQuantizationAccuracy } from './biometric/onnx/quantize';

const metrics = testQuantizationAccuracy(embedding);

console.log('Quantization accuracy:', metrics);
// Expected:
// {
//   mae: 0.001-0.005,        // Mean absolute error
//   maxError: 0.01-0.02,     // Max error
//   cosineSimilarity: > 0.99 // Should be very high
// }
```

---

## Troubleshooting

### Issue: Model inference returns all zeros

**Possible causes:**
- Incorrect input normalization
- Wrong input shape (NHWC vs NCHW)
- Model file corrupted

**Solutions:**
1. Verify preprocessing:
   ```typescript
   const preprocessed = await preprocessFace(image);
   console.log('Tensor stats:', {
     min: Math.min(...preprocessed.tensor),
     max: Math.max(...preprocessed.tensor),
     mean: preprocessed.tensor.reduce((a, b) => a + b) / preprocessed.tensor.length,
   });
   // Should be in [-1, 1] range with mean ~0
   ```

2. Check model checksum:
   ```typescript
   // Re-download model with verification
   await modelManager.getModel(metadata, true);
   ```

---

### Issue: Low match scores (<0.3 for same person)

**Possible causes:**
- Face alignment issues
- Incorrect color order (RGB vs BGR)
- Poor image quality

**Solutions:**
1. Enable alignment:
   ```typescript
   const preprocessed = await preprocessFace(image, {
     skipAlignment: false, // Enable alignment
   });
   ```

2. Check color order:
   ```typescript
   // Try both RGB and BGR
   const configRGB = { colorOrder: 'RGB' };
   const configBGR = { colorOrder: 'BGR' };
   ```

3. Capture higher quality images:
   - Ensure good lighting
   - Face should be frontal
   - Image resolution at least 640×480

---

### Issue: Slow inference (>1 second on mobile)

**Possible causes:**
- No hardware acceleration
- CPU fallback
- Wrong execution provider

**Solutions:**
1. Verify execution provider:
   ```typescript
   const model = await createFaceModel('arcface_r50', {
     runtime: {
       useGPU: true,
       useNNAPI: true, // Android
       useCoreML: true, // iOS
     },
   });
   ```

2. Use MobileFaceNet for CPU inference:
   ```typescript
   const model = await createFaceModel('mobilefacenet');
   ```

3. Profile inference time:
   ```typescript
   const start = Date.now();
   const embedding = await model.computeEmbedding(tensor);
   console.log('Inference time:', Date.now() - start, 'ms');
   ```

---

### Issue: Model fails to load on Raspberry Pi

**Possible causes:**
- Insufficient memory
- Missing dependencies (OpenBLAS, etc.)
- ARM architecture incompatibility

**Solutions:**
1. Use quantized model:
   ```typescript
   const model = await createFaceModel('arcface_r50_int8');
   ```

2. Install dependencies:
   ```bash
   sudo apt-get update
   sudo apt-get install -y libopenblas-dev libomp-dev
   ```

3. Increase swap:
   ```bash
   sudo dphys-swapfile swapoff
   sudo nano /etc/dphys-swapfile  # Set CONF_SWAPSIZE=2048
   sudo dphys-swapfile setup
   sudo dphys-swapfile swapon
   ```

---

## Liveness Detection Integration

If using a separate liveness detection model:

```typescript
import { performHybridLiveness } from './matcher/livenessAdapter';

// Run face embedding model
const faceEmbedding = await faceModel.computeEmbedding(preprocessed.tensor);

// Run liveness model (if available)
const livenessResult = await livenessModel.computeLiveness(preprocessed.tensor);

// Fuse scores
const finalScore = performHybridLiveness(
  [livenessResult],
  { minLivenessScore: 0.7 }
);
```

---

## Additional Resources

- **InsightFace Model Zoo:** https://github.com/deepinsight/insightface/tree/master/model_zoo
- **ONNX Model Zoo:** https://github.com/onnx/models
- **Model Quantization Guide:** See `docs/QUANTIZATION_GUIDE.md`
- **EAS Integration:** See `docs/EAS_INTEGRATION.md`
- **Pi Deployment:** See `docs/PI_RUNTIME.md`

---

## Support

For model-related issues:
1. Check this guide first
2. Verify model metadata and checksums
3. Test with reference embeddings
4. Check `src/biometric/onnx/onnxExamples.test.ts` for examples
