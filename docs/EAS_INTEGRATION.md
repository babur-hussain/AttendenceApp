# EAS (Expo Application Services) Integration Guide

Complete guide to integrating ONNX Runtime with Expo managed workflow using EAS custom development builds.

---

## Table of Contents

1. [Why EAS Custom Dev Client?](#why-eas-custom-dev-client)
2. [Prerequisites](#prerequisites)
3. [Setup Steps](#setup-steps)
4. [Build Configuration](#build-configuration)
5. [Native Module Integration](#native-module-integration)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)

---

## Why EAS Custom Dev Client?

### The Challenge

Expo's managed workflow provides a great developer experience, but **native modules** like `onnxruntime-react-native` require native code compilation that isn't available in standard Expo Go.

### The Solution

**EAS Custom Development Client** allows you to:
- Use native modules in Expo managed workflow
- Maintain most benefits of managed workflow
- Build custom development clients with native dependencies
- Deploy to TestFlight/Play Store with full native support

### Alternatives

If EAS is not feasible, you have two options:

1. **Use TensorFlow.js** (Pure JavaScript)
   - No native build required
   - Works with standard Expo Go
   - 2-5x slower than native ONNX
   - See `OnnxFaceModel.ts` for TFJS fallback implementation

2. **Eject to Bare Workflow**
   - Full control over native code
   - More manual configuration
   - Loses some managed workflow benefits

---

## Prerequisites

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo Account

```bash
eas login
```

### 3. Initialize EAS in Project

```bash
cd ks-attendance-app
eas build:configure
```

This creates `eas.json` in your project root.

---

## Setup Steps

### Step 1: Install ONNX Runtime Package

Currently, there's no official `onnxruntime-react-native` package. You have two options:

#### Option A: Use Community Package (Recommended)

```bash
npm install react-native-onnxruntime
# or
yarn add react-native-onnxruntime
```

Check availability:
- https://www.npmjs.com/search?q=react-native-onnx
- https://github.com/search?q=react-native+onnx+runtime

#### Option B: Create Custom Native Module

If no suitable package exists, create a custom native module:

```typescript
// src/biometric/onnx/NativeOnnxModule.ts
import { NativeModules } from 'react-native';

interface OnnxModule {
  loadModel(path: string, options: any): Promise<string>; // Returns session ID
  runInference(sessionId: string, input: number[]): Promise<number[]>;
  unloadModel(sessionId: string): Promise<void>;
}

const { OnnxRuntime } = NativeModules;

export default OnnxRuntime as OnnxModule;
```

Native implementation would go in:
- **Android:** `android/app/src/main/java/com/yourapp/OnnxRuntimeModule.java`
- **iOS:** `ios/YourApp/OnnxRuntimeModule.m`

---

### Step 2: Configure Native Dependencies

#### For Android

Create or modify `android/app/build.gradle`:

```gradle
dependencies {
    // ... existing dependencies
    
    // ONNX Runtime for Android
    implementation 'com.microsoft.onnxruntime:onnxruntime-android:1.15.1'
    
    // Optional: GPU support
    // implementation 'com.microsoft.onnxruntime:onnxruntime-android-gpu:1.15.1'
}
```

#### For iOS

Add to `ios/Podfile`:

```ruby
# Podfile

target 'YourApp' do
  # ... existing pods
  
  # ONNX Runtime for iOS
  pod 'onnxruntime-objc', '~> 1.15.1'
  
  # Optional: CoreML support
  # pod 'onnxruntime-objc-coreml', '~> 1.15.1'
end
```

Then install:

```bash
cd ios
pod install
cd ..
```

---

### Step 3: Configure app.json / app.config.js

Add plugins if needed:

```json
{
  "expo": {
    "name": "KS Attendance",
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera for face recognition."
        }
      ]
    ]
  }
}
```

---

## Build Configuration

### eas.json Configuration

Create or modify `eas.json`:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk",
        "gradleCommand": ":app:assembleDebug"
      },
      "ios": {
        "buildConfiguration": "Debug"
      },
      "env": {
        "MODEL_BASE_URL": "https://your-cdn.com/models",
        "ENABLE_ONNX_GPU": "true",
        "ENABLE_ONNX_NNAPI": "true"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "MODEL_BASE_URL": "https://your-cdn.com/models",
        "ENABLE_ONNX_GPU": "true"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "env": {
        "MODEL_BASE_URL": "https://cdn.kapoorandsons.com/models",
        "ENABLE_ONNX_GPU": "true",
        "ENABLE_ONNX_NNAPI": "true",
        "ENABLE_ONNX_COREML": "true"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json"
      },
      "ios": {
        "appleId": "your-apple-id@example.com",
        "ascAppId": "1234567890",
        "appleTeamId": "ABC123XYZ"
      }
    }
  }
}
```

### Environment Variables

Access in code:

```typescript
import Constants from 'expo-constants';

const MODEL_BASE_URL = Constants.expoConfig?.extra?.MODEL_BASE_URL || 'https://default-cdn.com';
const ENABLE_GPU = Constants.expoConfig?.extra?.ENABLE_ONNX_GPU === 'true';
```

Add to `app.config.js`:

```javascript
export default {
  expo: {
    // ... other config
    extra: {
      MODEL_BASE_URL: process.env.MODEL_BASE_URL,
      ENABLE_ONNX_GPU: process.env.ENABLE_ONNX_GPU,
      eas: {
        projectId: "your-project-id"
      }
    }
  }
};
```

---

## Native Module Integration

### Update OnnxFaceModel.ts

Complete the TODOs in `OnnxFaceModel.ts`:

```typescript
import OnnxRuntime from './NativeOnnxModule'; // Your native module

class OnnxFaceModel {
  private async loadWithOnnxNative(): Promise<void> {
    console.log('[OnnxFaceModel] Loading with ONNX Runtime Native...');

    try {
      // Resolve model path
      const modelPath = await this.resolveModelPath();

      // Configure execution providers
      const options = {
        executionProviders: [] as string[],
        graphOptimizationLevel: 'all',
        enableCpuMemArena: true,
        enableMemPattern: true,
      };

      if (Platform.OS === 'android') {
        if (this.config.runtime?.useNNAPI) {
          options.executionProviders.push('NNAPI');
        }
        if (this.config.runtime?.useGPU) {
          options.executionProviders.push('GPU');
        }
        options.executionProviders.push('CPU');
      } else if (Platform.OS === 'ios') {
        if (this.config.runtime?.useCoreML) {
          options.executionProviders.push('CoreML');
        }
        options.executionProviders.push('CPU');
      }

      // Load model
      this.sessionId = await OnnxRuntime.loadModel(modelPath, options);

      // Validate input/output shapes
      // (Implementation depends on your native module API)

      this.currentBackend = 'onnx-native';
      console.log('[OnnxFaceModel] Model loaded with native ONNX Runtime');
    } catch (error) {
      console.error('[OnnxFaceModel] Failed to load with native runtime:', error);
      throw error;
    }
  }

  private async runOnnxInference(imageTensor: Float32Array): Promise<Float32Array> {
    if (!this.sessionId) {
      throw new Error('Model not loaded');
    }

    try {
      // Run inference via native module
      const outputArray = await OnnxRuntime.runInference(
        this.sessionId,
        Array.from(imageTensor)
      );

      return new Float32Array(outputArray);
    } catch (error) {
      console.error('[OnnxFaceModel] Inference failed:', error);
      throw error;
    }
  }
}
```

---

## Testing

### Step 1: Build Development Client

#### Android

```bash
eas build --profile development --platform android
```

This will:
1. Install dependencies
2. Compile native code (including ONNX Runtime)
3. Create a debug APK
4. Provide download link

#### iOS

```bash
eas build --profile development --platform ios
```

This will:
1. Install dependencies and pods
2. Compile native code
3. Create IPA file
4. Upload to TestFlight (if configured) or provide download link

### Step 2: Install Development Build

#### Android

```bash
# Download APK from EAS dashboard or use link
# Install on device
adb install ks-attendance-dev.apk
```

#### iOS

```bash
# Use TestFlight or download IPA
# Install via Xcode or TestFlight
```

### Step 3: Start Development Server

```bash
npx expo start --dev-client
```

### Step 4: Test ONNX Integration

```typescript
import { createFaceModel } from './biometric/onnx/OnnxFaceModel';
import { preprocessFace } from './biometric/onnx/preprocess';

async function testOnnx() {
  console.log('Testing ONNX integration...');

  try {
    // Load model
    const model = await createFaceModel('arcface_r50');
    await model.loadModel();

    console.log('Model info:', model.modelInfo());

    // Test inference
    const testImage = /* capture from camera */;
    const preprocessed = await preprocessFace(testImage);
    
    const start = Date.now();
    const embedding = await model.computeEmbedding(preprocessed.tensor);
    const elapsed = Date.now() - start;

    console.log('Inference time:', elapsed, 'ms');
    console.log('Embedding dimension:', embedding.length);
    console.log('First 5 values:', Array.from(embedding.slice(0, 5)));

    // Success!
    return true;
  } catch (error) {
    console.error('ONNX test failed:', error);
    return false;
  }
}
```

---

## Troubleshooting

### Issue: "Module not found: NativeModules.OnnxRuntime"

**Cause:** Native module not linked or development client not rebuilt.

**Solution:**
1. Rebuild development client:
   ```bash
   eas build --profile development --platform android --clear-cache
   ```
2. Verify `package.json` includes ONNX package
3. Check native code is properly configured

---

### Issue: "Execution provider 'NNAPI' not available"

**Cause:** NNAPI not supported on device or ONNX Runtime not built with NNAPI.

**Solution:**
1. Check device Android version (NNAPI requires Android 8.1+)
2. Fall back to CPU:
   ```typescript
   const options = {
     executionProviders: ['CPU'], // Remove NNAPI
   };
   ```
3. Verify ONNX Runtime build includes NNAPI support

---

### Issue: Build fails with "Execution failed for task ':app:mergeDebugNativeLibs'"

**Cause:** Conflicting native libraries or missing architecture support.

**Solution:**
1. Check `android/app/build.gradle`:
   ```gradle
   android {
       defaultConfig {
           ndk {
               abiFilters 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
           }
       }
   }
   ```
2. Clean build:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

---

### Issue: iOS build fails with "framework not found onnxruntime"

**Cause:** CocoaPods not properly installed.

**Solution:**
1. Install pods:
   ```bash
   cd ios
   pod install --repo-update
   cd ..
   ```
2. Verify Podfile includes ONNX Runtime
3. Rebuild:
   ```bash
   eas build --profile development --platform ios --clear-cache
   ```

---

### Issue: Slow inference on device (<500ms expected, getting >1s)

**Cause:** Not using hardware acceleration.

**Solution:**
1. Verify execution provider:
   ```typescript
   console.log('Using providers:', this.config.runtime);
   ```
2. Enable GPU/NNAPI in `eas.json` env vars
3. Profile execution:
   ```typescript
   const start = Date.now();
   const embedding = await model.computeEmbedding(tensor);
   console.log('Inference time:', Date.now() - start);
   ```

---

## TensorFlow.js Fallback

If ONNX native integration proves too complex, use TensorFlow.js:

### Step 1: Install TFJS

```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native
```

### Step 2: Convert Model

```bash
# Convert ONNX → TensorFlow → TFJS
pip install onnx-tf tensorflowjs

onnx-tf convert -i arcface_r50.onnx -o arcface_r50_tf

tensorflowjs_converter \
  --input_format=tf_saved_model \
  --output_format=tfjs_graph_model \
  arcface_r50_tf \
  arcface_r50_tfjs
```

### Step 3: Load in App

```typescript
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

await tf.ready();

const model = await tf.loadGraphModel('https://your-cdn.com/models/arcface_r50_tfjs/model.json');

const input = tf.tensor4d(preprocessed.tensor, [1, 3, 112, 112]);
const output = model.predict(input) as tf.Tensor;
const embedding = await output.data();
```

**Pros:**
- No native build required
- Works with standard Expo Go
- Easier to debug

**Cons:**
- 2-5x slower than native ONNX
- Larger model files (JSON format)
- Higher memory usage

---

## Production Deployment

### Step 1: Build Production Bundle

#### Android (App Bundle for Play Store)

```bash
eas build --profile production --platform android
```

#### iOS (IPA for App Store)

```bash
eas build --profile production --platform ios
```

### Step 2: Submit to Stores

```bash
eas submit --platform android
eas submit --platform ios
```

---

## Additional Resources

- **EAS Build Documentation:** https://docs.expo.dev/build/introduction/
- **Custom Native Code:** https://docs.expo.dev/workflow/customizing/
- **ONNX Runtime Mobile:** https://onnxruntime.ai/docs/tutorials/mobile/
- **TensorFlow.js React Native:** https://github.com/tensorflow/tfjs/tree/master/tfjs-react-native

---

## Support

For EAS integration issues:
1. Check EAS build logs in dashboard
2. Verify native dependencies in `package.json`
3. Test locally with `expo run:android` or `expo run:ios`
4. Join Expo Discord for community help
