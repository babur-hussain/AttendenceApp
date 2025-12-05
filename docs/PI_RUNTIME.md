# Raspberry Pi ONNX Runtime Deployment Guide

Complete guide to deploying face recognition models on Raspberry Pi using ONNX Runtime with Python or Node.js.

---

## Table of Contents

1. [Hardware Requirements](#hardware-requirements)
2. [System Preparation](#system-preparation)
3. [Python Deployment](#python-deployment)
4. [Node.js Deployment](#node-js-deployment)
5. [Performance Optimization](#performance-optimization)
6. [NPU/Edge TPU Support](#npuedge-tpu-support)
7. [Troubleshooting](#troubleshooting)

---

## Hardware Requirements

### Minimum Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| Model | Pi 3B+ | Pi 4B (4GB) |
| RAM | 1GB | 4GB |
| Storage | 8GB | 32GB (for model cache) |
| OS | Raspberry Pi OS Lite | Raspberry Pi OS (64-bit) |

### Performance Expectations

| Device | Model | Inference Time | Notes |
|--------|-------|----------------|-------|
| Pi Zero W | MobileFaceNet | 400-600ms | CPU only |
| Pi Zero W | ArcFace INT8 | 600-800ms | Swap required |
| Pi 3B+ | MobileFaceNet | 200-300ms | With OpenBLAS |
| Pi 3B+ | ArcFace INT8 | 300-500ms | With OpenBLAS |
| Pi 4B | MobileFaceNet | 100-150ms | With NEON/BLAS |
| Pi 4B | ArcFace INT8 | 200-300ms | With NEON/BLAS |
| Pi 4B | ArcFace FP32 | 500-800ms | With NEON/BLAS |

---

## System Preparation

### Step 1: Update System

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo reboot
```

### Step 2: Install Base Dependencies

```bash
sudo apt-get install -y \
    python3-pip \
    python3-dev \
    python3-numpy \
    libopenblas-dev \
    libomp-dev \
    libatlas-base-dev \
    cmake \
    git
```

### Step 3: Optimize System Settings

#### Increase Swap (Required for Pi Zero and 1GB models)

```bash
# Stop swap
sudo dphys-swapfile swapoff

# Edit config
sudo nano /etc/dphys-swapfile
# Set: CONF_SWAPSIZE=2048

# Restart swap
sudo dphys-swapfile setup
sudo dphys-swapfile swapon
```

#### Disable GPU Services (Optional - saves 50-100ms)

```bash
# Disable GUI if running headless
sudo systemctl disable lightdm
sudo systemctl stop lightdm
```

#### Set CPU Governor to Performance

```bash
# Install cpufrequtils
sudo apt-get install -y cpufrequtils

# Set to performance mode
echo 'GOVERNOR="performance"' | sudo tee /etc/default/cpufrequtils

# Restart service
sudo systemctl restart cpufrequtils
```

---

## Python Deployment

### Step 1: Install ONNX Runtime

```bash
# Option 1: Install from PyPI (recommended)
pip3 install onnxruntime

# Option 2: Install optimized build (if available)
# Check: https://onnxruntime.ai/docs/build/inferencing.html
```

### Step 2: Install Additional Dependencies

```bash
pip3 install \
    numpy \
    opencv-python-headless \
    pillow
```

### Step 3: Create Face Recognition Script

```python
#!/usr/bin/env python3
"""
face_recognizer.py - Raspberry Pi Face Recognition Service
"""

import onnxruntime as ort
import numpy as np
import cv2
from typing import List, Tuple
import time

class FaceRecognizer:
    def __init__(self, model_path: str, use_quantized: bool = True):
        """
        Initialize face recognizer
        
        Args:
            model_path: Path to ONNX model file
            use_quantized: Use INT8 quantized model for speed
        """
        self.model_path = model_path
        
        # Configure session options
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.intra_op_num_threads = 4  # Use all cores
        
        # Set execution providers (CPU with optimizations)
        providers = ['CPUExecutionProvider']
        
        print(f"Loading model: {model_path}")
        self.session = ort.InferenceSession(
            model_path,
            sess_options=sess_options,
            providers=providers
        )
        
        # Get input/output details
        self.input_name = self.session.get_inputs()[0].name
        self.input_shape = self.session.get_inputs()[0].shape
        self.output_name = self.session.get_outputs()[0].name
        
        print(f"Model loaded successfully")
        print(f"  Input: {self.input_name}, shape: {self.input_shape}")
        print(f"  Output: {self.output_name}")
    
    def preprocess(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for model input
        
        Args:
            image: BGR image from OpenCV
        
        Returns:
            Preprocessed tensor [1, 3, 112, 112]
        """
        # Resize to 112x112
        img = cv2.resize(image, (112, 112))
        
        # Convert BGR to RGB
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Normalize to [0, 1]
        img = img.astype(np.float32) / 255.0
        
        # Normalize to [-1, 1]
        img = (img - 0.5) / 0.5
        
        # Convert HWC to CHW
        img = np.transpose(img, (2, 0, 1))
        
        # Add batch dimension
        img = np.expand_dims(img, axis=0)
        
        return img
    
    def compute_embedding(self, image: np.ndarray) -> np.ndarray:
        """
        Compute face embedding
        
        Args:
            image: BGR image from OpenCV
        
        Returns:
            Face embedding (512-d or 128-d)
        """
        # Preprocess
        input_tensor = self.preprocess(image)
        
        # Run inference
        start = time.time()
        outputs = self.session.run(
            [self.output_name],
            {self.input_name: input_tensor}
        )
        elapsed = (time.time() - start) * 1000
        
        print(f"Inference time: {elapsed:.1f}ms")
        
        # Extract embedding
        embedding = outputs[0][0]  # Remove batch dimension
        
        # L2 normalize
        embedding = embedding / np.linalg.norm(embedding)
        
        return embedding
    
    def match(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Compute cosine similarity between embeddings
        
        Returns:
            Similarity score [0, 1]
        """
        similarity = np.dot(embedding1, embedding2)
        # Map [-1, 1] to [0, 1]
        return (similarity + 1) / 2

def main():
    """Example usage"""
    
    # Initialize recognizer
    recognizer = FaceRecognizer(
        model_path="/home/pi/models/arcface_r50_int8.onnx",
        use_quantized=True
    )
    
    # Capture from camera
    cap = cv2.VideoCapture(0)
    
    # Load reference image for enrollment
    ref_image = cv2.imread("/home/pi/faces/employee_001.jpg")
    ref_embedding = recognizer.compute_embedding(ref_image)
    print(f"Reference embedding computed: shape={ref_embedding.shape}")
    
    print("Starting recognition loop...")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        # Compute embedding
        embedding = recognizer.compute_embedding(frame)
        
        # Match against reference
        score = recognizer.match(embedding, ref_embedding)
        
        # Display result
        label = f"Score: {score:.3f}"
        if score > 0.55:
            label += " - MATCH"
            color = (0, 255, 0)
        else:
            label += " - NO MATCH"
            color = (0, 0, 255)
        
        cv2.putText(frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
        cv2.imshow('Face Recognition', frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
    
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
```

### Step 4: Run the Script

```bash
python3 face_recognizer.py
```

---

## Node.js Deployment

### Step 1: Install Node.js

```bash
# Install Node.js 16+ (required for onnxruntime-node)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Install ONNX Runtime Node

```bash
npm install onnxruntime-node
```

### Step 3: Create Face Recognition Service

```typescript
// faceRecognizer.ts

import * as ort from 'onnxruntime-node';
import * as fs from 'fs';
import * as path from 'path';

export class FaceRecognizer {
  private session: ort.InferenceSession | null = null;
  private inputName: string = '';
  private outputName: string = '';

  async loadModel(modelPath: string): Promise<void> {
    console.log(`Loading model: ${modelPath}`);

    // Configure session options
    const options: ort.InferenceSession.SessionOptions = {
      graphOptimizationLevel: 'all',
      executionProviders: ['cpu'],
      intraOpNumThreads: 4, // Use all Pi 4 cores
      enableCpuMemArena: true,
      enableMemPattern: true,
    };

    // Load model
    this.session = await ort.InferenceSession.create(modelPath, options);

    // Get input/output names
    this.inputName = this.session.inputNames[0];
    this.outputName = this.session.outputNames[0];

    console.log('Model loaded successfully');
    console.log(`  Input: ${this.inputName}`);
    console.log(`  Output: ${this.outputName}`);
  }

  preprocess(imageBuffer: Buffer, width: number, height: number): Float32Array {
    // Assume imageBuffer is RGB format, width x height x 3
    
    // Resize to 112x112 (implement using sharp or jimp)
    // For now, assume already resized
    
    const pixels = new Float32Array(3 * 112 * 112);
    
    // Normalize to [-1, 1] and convert HWC to CHW
    for (let c = 0; c < 3; c++) {
      for (let h = 0; h < 112; h++) {
        for (let w = 0; w < 112; w++) {
          const srcIdx = (h * 112 + w) * 3 + c;
          const dstIdx = c * 112 * 112 + h * 112 + w;
          
          const pixelValue = imageBuffer[srcIdx] / 255.0;
          pixels[dstIdx] = (pixelValue - 0.5) / 0.5;
        }
      }
    }
    
    return pixels;
  }

  async computeEmbedding(imageTensor: Float32Array): Promise<Float32Array> {
    if (!this.session) {
      throw new Error('Model not loaded');
    }

    // Create tensor
    const tensor = new ort.Tensor('float32', imageTensor, [1, 3, 112, 112]);

    // Run inference
    const start = Date.now();
    const outputs = await this.session.run({ [this.inputName]: tensor });
    const elapsed = Date.now() - start;

    console.log(`Inference time: ${elapsed}ms`);

    // Extract embedding
    const output = outputs[this.outputName];
    const embedding = output.data as Float32Array;

    // L2 normalize
    return this.l2Normalize(embedding);
  }

  private l2Normalize(embedding: Float32Array): Float32Array {
    let sumSquares = 0;
    for (let i = 0; i < embedding.length; i++) {
      sumSquares += embedding[i] * embedding[i];
    }
    const norm = Math.sqrt(sumSquares);
    
    const normalized = new Float32Array(embedding.length);
    for (let i = 0; i < embedding.length; i++) {
      normalized[i] = embedding[i] / norm;
    }
    
    return normalized;
  }

  computeSimilarity(emb1: Float32Array, emb2: Float32Array): number {
    let dot = 0;
    for (let i = 0; i < emb1.length; i++) {
      dot += emb1[i] * emb2[i];
    }
    // Map [-1, 1] to [0, 1]
    return (dot + 1) / 2;
  }
}

// Example usage
async function main() {
  const recognizer = new FaceRecognizer();
  
  await recognizer.loadModel('/home/pi/models/arcface_r50_int8.onnx');
  
  // Load test image (would use actual camera capture)
  const testImage = new Float32Array(3 * 112 * 112);
  // ... populate testImage from camera
  
  const embedding = await recognizer.computeEmbedding(testImage);
  
  console.log(`Embedding computed: dim=${embedding.length}`);
}

main().catch(console.error);
```

---

## Performance Optimization

### 1. Enable OpenBLAS

OpenBLAS provides optimized linear algebra operations:

```bash
# Install OpenBLAS
sudo apt-get install -y libopenblas-dev

# Verify ONNX Runtime uses it
python3 -c "import onnxruntime as ort; print(ort.get_available_providers())"
```

### 2. Use NEON Intrinsics (ARM SIMD)

NEON is ARM's SIMD architecture:

```bash
# NEON should be enabled by default on Pi 3/4
# Verify with:
cat /proc/cpuinfo | grep neon
```

If building ONNX Runtime from source:

```bash
cmake -DONNX_USE_ARM64=ON \
      -DCMAKE_C_FLAGS="-march=armv8-a+fp+simd" \
      -DCMAKE_CXX_FLAGS="-march=armv8-a+fp+simd" \
      ...
```

### 3. Use Quantized Models

INT8 quantized models are 2-3x faster on Pi:

```bash
# Use INT8 model
python3 face_recognizer.py --model arcface_r50_int8.onnx
```

See `docs/QUANTIZATION_GUIDE.md` for quantization instructions.

### 4. Optimize Model Graph

```python
import onnxruntime as ort

sess_options = ort.SessionOptions()
sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
sess_options.optimized_model_filepath = "optimized_model.onnx"

# First run will save optimized model
session = ort.InferenceSession("arcface_r50.onnx", sess_options)

# Subsequent runs can use optimized model
session = ort.InferenceSession("optimized_model.onnx")
```

### 5. Reduce IO Scheduler Latency

```bash
# Set scheduler to deadline for lower latency
echo deadline | sudo tee /sys/block/mmcblk0/queue/scheduler
```

### 6. Overclock (Pi 4 Only)

Edit `/boot/config.txt`:

```ini
# Pi 4 Overclock
arm_freq=2000  # CPU frequency (default: 1500)
gpu_freq=750   # GPU frequency (default: 500)
over_voltage=6 # Voltage boost (range: 0-8)

# Requires adequate cooling!
```

**Warning:** Overclocking requires good cooling and may void warranty.

---

## NPU/Edge TPU Support

### Google Coral USB Accelerator

The Coral USB Accelerator provides 4 TOPS of performance:

#### Step 1: Install Edge TPU Runtime

```bash
echo "deb https://packages.cloud.google.com/apt coral-edgetpu-stable main" | sudo tee /etc/apt/sources.list.d/coral-edgetpu.list

curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo apt-key add -

sudo apt-get update
sudo apt-get install -y libedgetpu1-std python3-pycoral
```

#### Step 2: Convert Model to TensorFlow Lite

```bash
# ONNX → TensorFlow → TFLite
pip3 install onnx-tf tensorflow

onnx-tf convert -i arcface_r50.onnx -o arcface_r50_tf

# Convert to TFLite
import tensorflow as tf

converter = tf.lite.TFLiteConverter.from_saved_model('arcface_r50_tf')
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.uint8
converter.inference_output_type = tf.uint8

tflite_model = converter.convert()

with open('arcface_r50_int8.tflite', 'wb') as f:
    f.write(tflite_model)

# Compile for Edge TPU
edgetpu_compiler arcface_r50_int8.tflite
```

#### Step 3: Run Inference with Coral

```python
from pycoral.utils import edgetpu
from pycoral.adapters import common
import numpy as np

# Load model
interpreter = edgetpu.make_interpreter('arcface_r50_int8_edgetpu.tflite')
interpreter.allocate_tensors()

# Run inference
common.set_input(interpreter, input_tensor)
interpreter.invoke()
output = common.output_tensor(interpreter, 0)

print(f"Inference time: ~5-10ms with Coral!")
```

**Performance:** 5-10ms inference time (10-100x speedup!)

---

## Troubleshooting

### Issue: "Illegal instruction" error

**Cause:** ONNX Runtime built for different ARM architecture.

**Solution:**
```bash
# Use pip wheel for ARMv7l
pip3 install onnxruntime==1.15.1

# Or build from source for your specific architecture
```

---

### Issue: Out of memory during model load

**Cause:** Insufficient RAM, especially on Pi Zero.

**Solution:**
1. Increase swap (see System Preparation)
2. Use smaller model (MobileFaceNet)
3. Use quantized model (INT8)

---

### Issue: Inference time >2 seconds

**Cause:** Not using optimizations.

**Solution:**
1. Enable OpenBLAS:
   ```bash
   sudo apt-get install libopenblas-dev
   ```
2. Use quantized model
3. Set CPU governor to performance
4. Check CPU throttling:
   ```bash
   vcgencmd measure_temp
   vcgencmd get_throttled
   ```

---

### Issue: Model loading fails with "Invalid protobuf"

**Cause:** Corrupted model file or incompatible ONNX version.

**Solution:**
```python
import onnx

# Validate model
model = onnx.load("arcface_r50.onnx")
onnx.checker.check_model(model)
print("Model is valid")
```

---

## Deployment Example: Attendance Kiosk

### Complete System

```python
#!/usr/bin/env python3
"""
attendance_kiosk.py - Face recognition attendance kiosk for Raspberry Pi
"""

import onnxruntime as ort
import numpy as np
import cv2
import requests
import json
from datetime import datetime

class AttendanceKiosk:
    def __init__(self, model_path: str, server_url: str):
        self.model_path = model_path
        self.server_url = server_url
        self.session = None
        self.employees_db = {}  # Local cache: {employee_id: embedding}
        
        # Load model
        self._load_model()
        
        # Sync employee database
        self._sync_database()
    
    def _load_model(self):
        """Load ONNX model"""
        sess_options = ort.SessionOptions()
        sess_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        sess_options.intra_op_num_threads = 4
        
        self.session = ort.InferenceSession(
            self.model_path,
            sess_options=sess_options,
            providers=['CPUExecutionProvider']
        )
        
        print(f"Model loaded: {self.model_path}")
    
    def _sync_database(self):
        """Download employee embeddings from server"""
        try:
            response = requests.get(f"{self.server_url}/api/employees/embeddings")
            if response.status_code == 200:
                data = response.json()
                for emp in data:
                    self.employees_db[emp['id']] = np.array(emp['embedding'])
                print(f"Synced {len(self.employees_db)} employees")
        except Exception as e:
            print(f"Database sync failed: {e}")
    
    def compute_embedding(self, image):
        """Compute face embedding"""
        # Preprocess (same as before)
        img = cv2.resize(image, (112, 112))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = (img.astype(np.float32) / 255.0 - 0.5) / 0.5
        img = np.transpose(img, (2, 0, 1))
        img = np.expand_dims(img, axis=0)
        
        # Inference
        outputs = self.session.run(None, {self.session.get_inputs()[0].name: img})
        embedding = outputs[0][0]
        
        # L2 normalize
        return embedding / np.linalg.norm(embedding)
    
    def match_employee(self, embedding):
        """Match embedding against database"""
        best_match = None
        best_score = 0.0
        
        for emp_id, emp_embedding in self.employees_db.items():
            score = (np.dot(embedding, emp_embedding) + 1) / 2
            if score > best_score:
                best_score = score
                best_match = emp_id
        
        return best_match, best_score
    
    def record_attendance(self, employee_id):
        """Send attendance to server via TOON protocol"""
        # Build TOON message (simplified)
        toon_message = {
            'E1': employee_id,
            'S1': 'PRESENT',
            'TS1': datetime.now().isoformat(),
        }
        
        try:
            response = requests.post(
                f"{self.server_url}/toon/attendance",
                json=toon_message,
                headers={'Content-Type': 'application/json'}
            )
            return response.status_code == 200
        except Exception as e:
            print(f"Failed to record attendance: {e}")
            return False
    
    def run(self):
        """Main loop"""
        cap = cv2.VideoCapture(0)
        print("Attendance kiosk ready. Press 'q' to quit.")
        
        while True:
            ret, frame = cap.read()
            if not ret:
                break
            
            # Compute embedding
            embedding = self.compute_embedding(frame)
            
            # Match employee
            emp_id, score = self.match_employee(embedding)
            
            # Display
            if score > 0.55:
                label = f"Employee: {emp_id} ({score:.2f})"
                color = (0, 255, 0)
                
                # Record attendance
                if self.record_attendance(emp_id):
                    label += " - RECORDED"
            else:
                label = "Unknown"
                color = (0, 0, 255)
            
            cv2.putText(frame, label, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
            cv2.imshow('Attendance Kiosk', frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    kiosk = AttendanceKiosk(
        model_path="/home/pi/models/arcface_r50_int8.onnx",
        server_url="http://your-server.com:3000"
    )
    kiosk.run()
```

---

## Additional Resources

- **ONNX Runtime:** https://onnxruntime.ai/docs/build/inferencing.html
- **Raspberry Pi Optimization:** https://www.raspberrypi.com/documentation/computers/config_txt.html
- **Coral Edge TPU:** https://coral.ai/docs/accelerator/get-started/
- **OpenBLAS:** https://github.com/xianyi/OpenBLAS

---

## Support

For Pi deployment issues:
1. Check system logs: `journalctl -xe`
2. Monitor resources: `htop`, `free -h`
3. Test with quantized models first
4. Join Raspberry Pi forums for hardware-specific help
