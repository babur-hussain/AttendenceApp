# ONNX Model Quantization Guide

Complete guide to quantizing ONNX face recognition models for reduced size and faster inference with minimal accuracy loss.

---

## Table of Contents

1. [What is Quantization?](#what-is-quantization)
2. [Quantization Methods](#quantization-methods)
3. [Tools and Setup](#tools-and-setup)
4. [Dynamic Quantization](#dynamic-quantization)
5. [Static Quantization](#static-quantization)
6. [Accuracy Validation](#accuracy-validation)
7. [Packing Strategy](#packing-strategy)
8. [Best Practices](#best-practices)

---

## What is Quantization?

### Overview

**Quantization** converts high-precision floating-point numbers (FP32) to lower-precision integers (INT8), reducing:
- **Model size:** 75% reduction (166 MB → 42 MB)
- **Inference time:** 2-3x speedup on CPU
- **Memory usage:** 75% reduction in RAM
- **Accuracy loss:** < 1% with proper calibration

### When to Quantize

**Quantize the model if:**
- Deploying to edge devices (Raspberry Pi, mobile)
- Limited storage or bandwidth
- CPU-only inference (no GPU)
- Need faster inference without accuracy sacrifice

**Quantize embeddings if:**
- Transmitting over network (attendance data)
- Storing large employee databases
- Want 75% reduction in storage with <0.5% matching loss

---

## Quantization Methods

### 1. Dynamic Quantization (Easiest)

- Weights quantized to INT8 at model conversion time
- Activations remain FP32 during inference
- No calibration data required
- 50-75% model size reduction
- 1.5-2x speedup

**Use for:** Quick deployment, when no calibration data available

### 2. Static Quantization (Best Performance)

- Weights AND activations quantized to INT8
- Requires calibration dataset (100-1000 images)
- Maximum performance improvement
- 75% model size reduction
- 2-3x speedup

**Use for:** Production deployment, maximum performance

### 3. QDQ (Quantize-Dequantize) Format

- Inserts Q/DQ ops in model graph
- More flexible quantization
- Better accuracy preservation
- Supported by ONNX Runtime

**Use for:** Advanced users, custom quantization schemes

---

## Tools and Setup

### Step 1: Install ONNX Runtime Quantization Tools

```bash
pip install onnx onnxruntime onnxruntime-tools
```

### Step 2: Verify ONNX Model

```python
import onnx

# Load and check model
model = onnx.load("arcface_r50.onnx")
onnx.checker.check_model(model)
print(f"Model is valid. Opset version: {model.opset_import[0].version}")
```

### Step 3: Prepare Calibration Dataset (for static quantization)

```python
import numpy as np
from pathlib import Path

def prepare_calibration_data(image_dir: str, num_samples: int = 100):
    """
    Prepare calibration dataset
    
    Args:
        image_dir: Directory with face images
        num_samples: Number of samples to use (100-1000 recommended)
    
    Returns:
        List of preprocessed image tensors
    """
    calibration_data = []
    
    image_files = list(Path(image_dir).glob("*.jpg"))[:num_samples]
    
    for img_file in image_files:
        # Load image
        img = cv2.imread(str(img_file))
        
        # Preprocess (same as inference pipeline)
        img = cv2.resize(img, (112, 112))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = (img.astype(np.float32) / 255.0 - 0.5) / 0.5
        img = np.transpose(img, (2, 0, 1))
        img = np.expand_dims(img, axis=0)
        
        calibration_data.append(img)
    
    return calibration_data
```

---

## Dynamic Quantization

### Python Example

```python
from onnxruntime.quantization import quantize_dynamic, QuantType

def quantize_model_dynamic(
    input_model: str,
    output_model: str,
    weight_type: QuantType = QuantType.QInt8
):
    """
    Perform dynamic quantization
    
    Args:
        input_model: Path to FP32 ONNX model
        output_model: Path to save quantized model
        weight_type: QInt8 (recommended) or QUInt8
    """
    print(f"Quantizing {input_model} → {output_model}")
    
    quantize_dynamic(
        model_input=input_model,
        model_output=output_model,
        weight_type=weight_type,
        optimize_model=True,  # Enable graph optimizations
    )
    
    print("Quantization complete!")
    
    # Check model sizes
    import os
    original_size = os.path.getsize(input_model) / (1024 ** 2)  # MB
    quantized_size = os.path.getsize(output_model) / (1024 ** 2)  # MB
    reduction = (1 - quantized_size / original_size) * 100
    
    print(f"Original size: {original_size:.1f} MB")
    print(f"Quantized size: {quantized_size:.1f} MB")
    print(f"Size reduction: {reduction:.1f}%")

# Usage
quantize_model_dynamic(
    input_model="arcface_r50.onnx",
    output_model="arcface_r50_int8_dynamic.onnx"
)
```

### Expected Results

```
Original size: 166.2 MB
Quantized size: 41.8 MB
Size reduction: 74.9%
```

---

## Static Quantization

### Step 1: Create Calibration Data Reader

```python
from onnxruntime.quantization import CalibrationDataReader

class FaceCalibrationDataReader(CalibrationDataReader):
    def __init__(self, calibration_data):
        self.data = calibration_data
        self.index = 0
    
    def get_next(self):
        """Get next calibration sample"""
        if self.index >= len(self.data):
            return None
        
        sample = self.data[self.index]
        self.index += 1
        
        # Return as dictionary with input name
        return {"input": sample}
    
    def rewind(self):
        """Reset to beginning"""
        self.index = 0
```

### Step 2: Perform Static Quantization

```python
from onnxruntime.quantization import quantize_static, QuantFormat, QuantType

def quantize_model_static(
    input_model: str,
    output_model: str,
    calibration_data_reader: CalibrationDataReader,
    quant_format: QuantFormat = QuantFormat.QDQ
):
    """
    Perform static quantization with calibration
    
    Args:
        input_model: Path to FP32 ONNX model
        output_model: Path to save quantized model
        calibration_data_reader: Calibration data reader
        quant_format: QDQ (recommended) or QOperator
    """
    print(f"Static quantization: {input_model} → {output_model}")
    
    quantize_static(
        model_input=input_model,
        model_output=output_model,
        calibration_data_reader=calibration_data_reader,
        quant_format=quant_format,
        weight_type=QuantType.QInt8,
        activation_type=QuantType.QInt8,
        optimize_model=True,
    )
    
    print("Static quantization complete!")

# Usage
calibration_images = prepare_calibration_data("path/to/face/images", num_samples=200)
calibration_reader = FaceCalibrationDataReader(calibration_images)

quantize_model_static(
    input_model="arcface_r50.onnx",
    output_model="arcface_r50_int8_static.onnx",
    calibration_data_reader=calibration_reader
)
```

---

## Accuracy Validation

### Step 1: Compare Embeddings

```python
import onnxruntime as ort
import numpy as np

def compare_models(fp32_model: str, int8_model: str, test_images):
    """
    Compare FP32 and INT8 model outputs
    
    Returns:
        Dictionary with accuracy metrics
    """
    # Load both models
    fp32_session = ort.InferenceSession(fp32_model)
    int8_session = ort.InferenceSession(int8_model)
    
    input_name = fp32_session.get_inputs()[0].name
    
    similarities = []
    mae_values = []
    
    for img in test_images:
        # Run both models
        fp32_output = fp32_session.run(None, {input_name: img})[0][0]
        int8_output = int8_session.run(None, {input_name: img})[0][0]
        
        # L2 normalize
        fp32_emb = fp32_output / np.linalg.norm(fp32_output)
        int8_emb = int8_output / np.linalg.norm(int8_output)
        
        # Cosine similarity
        similarity = np.dot(fp32_emb, int8_emb)
        similarities.append(similarity)
        
        # Mean absolute error
        mae = np.mean(np.abs(fp32_emb - int8_emb))
        mae_values.append(mae)
    
    return {
        'mean_similarity': np.mean(similarities),
        'min_similarity': np.min(similarities),
        'mean_mae': np.mean(mae_values),
        'max_mae': np.max(mae_values),
    }

# Usage
test_images = prepare_calibration_data("test_set/", num_samples=500)

metrics = compare_models(
    "arcface_r50.onnx",
    "arcface_r50_int8_static.onnx",
    test_images
)

print("Quantization Accuracy:")
print(f"  Mean similarity: {metrics['mean_similarity']:.4f}")
print(f"  Min similarity: {metrics['min_similarity']:.4f}")
print(f"  Mean MAE: {metrics['mean_mae']:.6f}")
print(f"  Max MAE: {metrics['max_mae']:.6f}")

# Expected:
# Mean similarity: > 0.995 (very high)
# Min similarity: > 0.98
# Mean MAE: < 0.005
```

### Step 2: ROC Curve Comparison

```python
from matcher.rocGenerator import generateROCReport

def validate_with_roc(
    fp32_model: str,
    int8_model: str,
    test_pairs: list  # List of (img1, img2, is_same_person)
):
    """
    Generate ROC curves for FP32 vs INT8 models
    """
    # Generate scores for both models
    fp32_scores = []
    int8_scores = []
    labels = []
    
    fp32_session = ort.InferenceSession(fp32_model)
    int8_session = ort.InferenceSession(int8_model)
    
    for img1, img2, is_same in test_pairs:
        # Get embeddings
        fp32_emb1 = get_embedding(fp32_session, img1)
        fp32_emb2 = get_embedding(fp32_session, img2)
        
        int8_emb1 = get_embedding(int8_session, img1)
        int8_emb2 = get_embedding(int8_session, img2)
        
        # Compute scores
        fp32_score = np.dot(fp32_emb1, fp32_emb2)
        int8_score = np.dot(int8_emb1, int8_emb2)
        
        fp32_scores.append(fp32_score)
        int8_scores.append(int8_score)
        labels.append(is_same)
    
    # Generate ROC reports
    fp32_roc = generateROCReport(fp32_scores, labels)
    int8_roc = generateROCReport(int8_scores, labels)
    
    print(f"FP32 Model AUC: {fp32_roc['auc']:.4f}")
    print(f"INT8 Model AUC: {int8_roc['auc']:.4f}")
    print(f"AUC Difference: {abs(fp32_roc['auc'] - int8_roc['auc']):.4f}")
    
    # Acceptable if AUC difference < 0.01
    assert abs(fp32_roc['auc'] - int8_roc['auc']) < 0.01, "Quantization degraded accuracy too much"

# Usage
test_pairs = load_verification_pairs("lfw_test_pairs.txt")
validate_with_roc("arcface_r50.onnx", "arcface_r50_int8_static.onnx", test_pairs)
```

---

## Packing Strategy

### When to Quantize

1. **Quantize Model (Recommended)**
   - Reduces inference time AND model size
   - Use for Pi deployment
   - Use INT8 ONNX model

2. **Quantize Embeddings (Network Transmission)**
   - Reduces network bandwidth by 75%
   - Use for attendance submission
   - Use TOON F2 token encoding

3. **Both (Maximum Efficiency)**
   - Quantized model for inference
   - Quantized embeddings for transmission
   - Best for production deployment

### Embedding Quantization Example

```typescript
import { quantizeEmbeddingInt8, embeddingToToonF2 } from './biometric/onnx/quantize';

async function submitAttendance(embedding: Float32Array, employeeId: string) {
  // Quantize embedding to TOON F2 tokens
  const tokens = embeddingToToonF2(embedding);
  
  // Build TOON message
  const toonMessage = {
    E1: employeeId,
    S1: 'PRESENT',
    ...tokens,  // F2_DATA, F2_META, F2_DIM
    TS1: new Date().toISOString(),
  };
  
  // Send to server (75% smaller than sending Float32Array)
  await fetch('/toon/attendance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toonMessage),
  });
}
```

### Server-Side Dequantization

```typescript
import { toonF2ToEmbedding } from './biometric/onnx/quantize';

function handleAttendance(toonMessage: any) {
  // Extract TOON F2 tokens
  const tokens = {
    F2_DATA: toonMessage.F2_DATA,
    F2_META: toonMessage.F2_META,
    F2_DIM: toonMessage.F2_DIM,
  };
  
  // Dequantize to Float32Array
  const embedding = toonF2ToEmbedding(tokens);
  
  // Match against database
  const match = matchEmbedding(embedding, database);
  
  // Record attendance if match found
  if (match.score > 0.55) {
    recordAttendance(match.employeeId, toonMessage.TS1);
  }
}
```

---

## Best Practices

### 1. Choose Right Calibration Data

**Good calibration dataset:**
- Representative of actual deployment (same lighting, angles, etc.)
- Diverse (different people, ages, ethnicities)
- 100-1000 images minimum
- Preprocessed the same way as inference

**Bad calibration dataset:**
- Too small (<50 images)
- Not representative (studio photos when deploying for selfies)
- Different preprocessing

### 2. Validate Thoroughly

**Always test quantized models with:**
1. **Embedding similarity:** > 0.995 mean similarity
2. **ROC curves:** AUC drop < 0.01
3. **Real-world test:** Deploy to staging and measure accuracy

### 3. Profile Performance

```python
import time

def profile_inference(model_path: str, test_images):
    """Profile inference time"""
    session = ort.InferenceSession(model_path)
    input_name = session.get_inputs()[0].name
    
    times = []
    for img in test_images:
        start = time.time()
        session.run(None, {input_name: img})
        elapsed = (time.time() - start) * 1000
        times.append(elapsed)
    
    print(f"Model: {model_path}")
    print(f"  Mean: {np.mean(times):.1f}ms")
    print(f"  Median: {np.median(times):.1f}ms")
    print(f"  P95: {np.percentile(times, 95):.1f}ms")

# Compare
profile_inference("arcface_r50.onnx", test_images)
profile_inference("arcface_r50_int8_static.onnx", test_images)
```

### 4. Document Quantization Settings

Keep a record of quantization parameters:

```yaml
# quantization_config.yaml

model: arcface_r50.onnx
quantized_model: arcface_r50_int8_static.onnx

quantization:
  method: static
  format: QDQ
  weight_type: INT8
  activation_type: INT8
  
calibration:
  num_samples: 200
  dataset: lfw_calibration_set
  
validation:
  test_samples: 500
  mean_similarity: 0.9972
  auc_fp32: 0.9986
  auc_int8: 0.9981
  auc_difference: 0.0005

performance:
  inference_time_fp32: 487ms
  inference_time_int8: 213ms
  speedup: 2.3x
  model_size_reduction: 74.9%
```

### 5. Fallback Strategy

Always have a fallback:

```typescript
async function loadModel() {
  try {
    // Try quantized model first
    await model.loadModel('arcface_r50_int8.onnx');
  } catch (error) {
    console.warn('Quantized model failed, falling back to FP32');
    await model.loadModel('arcface_r50.onnx');
  }
}
```

---

## Troubleshooting

### Issue: Accuracy drop >2%

**Cause:** Poor calibration data or aggressive quantization.

**Solution:**
1. Use more calibration samples (500-1000)
2. Ensure calibration data matches deployment distribution
3. Try QDQ format instead of QOperator
4. Use per-channel quantization (if supported)

---

### Issue: Quantized model slower than FP32

**Cause:** Hardware doesn't support INT8 acceleration.

**Solution:**
1. Check if ONNX Runtime was built with INT8 support
2. Verify CPU supports INT8 instructions (AVX512, AVX2)
3. On ARM, ensure NEON is enabled
4. Profile to identify bottleneck:
   ```python
   sess_options.enable_profiling = True
   ```

---

### Issue: "Quantization failed for node XYZ"

**Cause:** Some ops don't support quantization.

**Solution:**
1. Use `op_types_to_quantize` to skip problematic ops:
   ```python
   quantize_static(
       model_input=input_model,
       model_output=output_model,
       calibration_data_reader=reader,
       op_types_to_quantize=['Conv', 'Gemm', 'MatMul'],  # Only quantize these
   )
   ```

---

## Summary Comparison

| Aspect | FP32 | INT8 Dynamic | INT8 Static |
|--------|------|--------------|-------------|
| Model Size | 166 MB | 42 MB (75% ↓) | 42 MB (75% ↓) |
| Inference Time | 487ms | 310ms (1.6x ↑) | 213ms (2.3x ↑) |
| Accuracy (LFW) | 99.83% | 99.79% | 99.78% |
| Calibration Needed | No | No | Yes |
| Complexity | Low | Low | Medium |
| **Recommendation** | Baseline | Quick deployment | Production |

---

## Additional Resources

- **ONNX Runtime Quantization:** https://onnxruntime.ai/docs/performance/quantization.html
- **ONNX Quantization Tools:** https://github.com/microsoft/onnxruntime/tree/main/onnxruntime/python/tools/quantization
- **Quantization White Paper:** https://arxiv.org/abs/1910.06188
- **Matcher ROC Generator:** `src/matcher/rocGenerator.ts`

---

## Support

For quantization issues:
1. Verify model with `onnx.checker.check_model()`
2. Test with reference embeddings
3. Compare ROC curves (AUC drop should be <0.01)
4. Profile inference time to confirm speedup
