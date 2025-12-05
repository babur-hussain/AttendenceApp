# Employee Enrollment Implementation Guide

## Overview

This guide documents the complete Employee Enrollment flow implemented for the KS Attendance mobile app. The implementation includes multi-shot face capture, biometric quality assessment, fingerprint enrollment, TOON-based submission, offline queueing, and QR pairing tokens.

## Architecture

### Flow Diagram

```
EnrollLanding
    ↓
EnrollForm (collect employee data)
    ↓
MultiShotCapture (3-5 face shots with quality assessment)
    ↓
[Optional] FingerprintEnrollModal
    ↓
EnrollReview (review data + consent)
    ↓
EnrollSuccess (employee ID + QR pairing token)
```

### Key Components

#### 1. **FacePipeline** (`src/biometric/FacePipeline.ts`)
Core biometric pipeline with TensorFlow Lite integration points.

**Functions:**
- `captureFrame()` - Capture face frame (stub for expo-camera)
- `computeEmbedding()` - Generate 512-dim ArcFace embedding (stub for TF Lite)
- `assessQuality()` - Multi-factor quality scoring (lighting, sharpness, pose, occlusion)
- `aggregateEmbeddings()` - Weighted average of multiple shots
- `packEmbeddingForToon()` - Quantize to int8 and encode to TOON format
- `setMockMode()` / `getMockMode()` - Toggle deterministic test data

**Quality Assessment Factors:**
- **Lighting** (0-100): Detects under/over-exposed conditions
- **Sharpness** (0-100): Blur detection via Laplacian variance
- **Pose** (0-100): Head angle validation (yaw, pitch, roll)
- **Occlusion** (0-100): Detects glasses, masks, hands covering face

**Mock Mode:**
- Generates deterministic Float32Array embeddings for testing
- Predictable quality scores without ML models
- Enable: `setMockMode(true)`

**Integration Points:**
```typescript
// TODO: Replace with expo-camera
const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });

// TODO: Load TensorFlow Lite model
const model = await loadTFLiteModel('arcface_model.tflite');

// TODO: Run inference
const embedding = await model.predict(preprocessedTensor);
```

#### 2. **useEnrollment Hook** (`src/hooks/useEnrollment.ts`)
Orchestrates entire enrollment flow with state management.

**State Machine:**
```typescript
type EnrollmentStep = 
  | 'form'        // Collect employee data
  | 'capture'     // Multi-shot face capture
  | 'fingerprint' // Optional fingerprint
  | 'review'      // Review + consent
  | 'submitting'  // Network submission
  | 'success'     // Complete
  | 'error';      // Failed
```

**Key Methods:**
- `submitForm(formData)` - Validate and advance to capture step
- `captureShot(frame, thumbnailUri)` - Add shot and assess quality
- `removeShot(index)` - Remove specific shot
- `completeCapture()` - Validate 3+ quality shots and aggregate embeddings
- `enrollFingerprint(template)` - Add optional fingerprint
- `setConsent(accepted, signedName)` - Generate consent token (C1)
- `buildEnrollmentPayload()` - Create TOON-encoded payload
- `submitEnrollment()` - POST to `/api/v1/employees` or queue offline
- `saveLocalEnrollment()` - Encrypt and store via SecureStore
- `regeneratePairingToken()` - Create new PAIR1 token
- `reset()` - Clear state for next enrollment

**Offline Queueing:**
```typescript
// Automatic offline detection
if (!networkAvailable) {
  await SecureStore.setItemAsync('enrollment_queue', JSON.stringify(payload));
  setState({ isOffline: true, queuedPayload: payload });
}

// Retry with exponential backoff (configured in hook)
const retryDelays = [1000, 2000, 5000, 10000]; // ms
```

#### 3. **TOON Token Encoding**
All biometric data is encoded in TOON format for transmission.

**Token Types:**
- **F2**: Quantized face embedding (int8 array, base64 encoded)
- **F3**: Face metadata (`version|quality|shotCount|method|scale`)
- **FP1**: Fingerprint template (if enrolled)
- **C1**: Consent token (`timestamp|signedName|dataTypes`)
- **E2-E5**: Employee fields (firstName, lastName, email, etc.)
- **PAIR1**: Pairing token for kiosk QR code

**Example Payload:**
```
F2=<base64-int8-embedding>&F3=1.0|85|5|arcface|0.125&E2=John&E3=Doe&E4=john.doe@example.com&C1=1234567890|John Doe|face,fingerprint
```

**Quantization:**
```typescript
// Float32Array → int8 quantization
const scale = 1 / 128; // Fixed scale factor
const quantized = new Int8Array(embedding.length);
for (let i = 0; i < embedding.length; i++) {
  quantized[i] = Math.round(embedding[i] / scale);
}
```

### Screens

#### 1. **EnrollLanding** (`src/screens/enrollment/EnrollLanding.tsx`)
Entry screen with two options:
- **New Employee**: Fresh enrollment
- **Enroll Existing**: Update existing profile (future feature)

**Features:**
- Privacy info box
- Icon illustration
- Clear CTA buttons

#### 2. **EnrollForm** (`src/screens/enrollment/EnrollForm.tsx`)
Employee data collection form.

**Fields:**
- First Name (required)
- Last Name (required)
- Email (required, validated)
- Phone (required, validated)
- Role (Picker: EMPLOYEE, MANAGER, ADMIN)
- Allowed Break Minutes (optional)
- Policy Profile (Picker: standard, flexible, strict)

**Validation:**
- Email regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Phone regex: `/^[0-9]{10,15}$/`
- Required field checks

**Integration:**
```typescript
const { submitForm, state } = useEnrollment();

const handleSubmit = async () => {
  const result = await submitForm(formData);
  if (result.success) {
    // Advances to 'capture' step
  }
};
```

#### 3. **MultiShotCapture** (`src/screens/enrollment/MultiShotCapture.tsx`)
Guided multi-shot face capture with quality feedback.

**Features:**
- Live camera preview (expo-camera integration point)
- Face guide overlay (oval border)
- Pose guidance (Front, Left, Right, Up, Natural)
- Animated capture button with pulse effect
- Thumbnail grid of captured shots
- Quality badges per shot (color-coded)
- Progress bar (N/5 shots)
- Remove shot capability
- Real-time quality meter (last shot)
- Helpful tips box

**Capture Logic:**
```typescript
const handleCapture = async () => {
  // TODO: Replace with real camera
  const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
  
  const frame: FaceFrame = {
    imageUri: photo.uri,
    width: photo.width,
    height: photo.height,
    timestamp: Date.now(),
    metadata: { /* face detection results */ }
  };
  
  const result = await captureShot(frame, photo.uri);
  if (result.success && result.quality) {
    // Show quality feedback
    setLastQuality(result.quality);
  }
};
```

**Requirements:**
- Minimum 3 shots
- At least 3 shots with quality ≥ 65
- All shots validated before completion

#### 4. **EnrollReview** (`src/screens/enrollment/EnrollReview.tsx`)
Review all data before submission.

**Sections:**
- **Captured Shots**: Thumbnail grid with quality badges
- **Overall Quality**: Aggregate quality meter with details
- **Fingerprint**: Confirmation if enrolled
- **Employee Info**: Form data summary
- **Consent**: Privacy terms with checkbox and digital signature

**Consent Terms:**
```
I consent to the collection and processing of my biometric data 
(facial embeddings and fingerprint template) for the purpose of 
employee enrollment and attendance tracking.

I understand that:
• My biometric data will be encrypted and stored securely
• Data will only be used for attendance and identity verification
• I can request deletion of my data at any time
• Data will not be shared with third parties without my consent
```

**Digital Signature:**
- Auto-filled from form (firstName + lastName)
- Timestamp added automatically
- Generates C1 token on acceptance

**Offline Handling:**
- Shows queue indicator if no network
- Button text changes to "Queue Enrollment"
- Payload stored in SecureStore for retry

#### 5. **EnrollSuccess** (`src/screens/enrollment/EnrollSuccess.tsx`)
Enrollment completion with employee ID and QR code.

**Features:**
- Large success icon ✅
- Employee ID display (E1 token value)
- QR code for pairing token (PAIR1)
- Regenerate pairing token button
- Next steps guide (numbered list)
- Offline sync status box
- Privacy protection notice
- "Enroll Another" button
- "Done" button

**QR Code Integration:**
```typescript
// TODO: Install react-native-qrcode-svg
import QRCode from 'react-native-qrcode-svg';

<QRCode
  value={state.pairingToken}
  size={200}
  backgroundColor="white"
  color="black"
/>
```

**Pairing Token Format:**
```
PAIR1=<uuid>|<employeeId>|<timestamp>|<expiryMinutes>
```

#### 6. **EnrollmentDebug** (`src/screens/enrollment/EnrollmentDebug.tsx`)
QA and developer tools screen.

**Features:**
- **Mock Mode Toggle**: Enable/disable deterministic test data
- **Stored Enrollments**: View local encrypted embeddings (masked)
- **Queued Payloads**: See pending offline submissions
- **Force Quality Scenarios**: Test low light, blur, bad pose, occlusion, perfect
- **Actions**: Refresh data, export logs, clear all data

**Quality Scenarios:**
```typescript
const SCENARIOS = {
  none: 'Normal operation',
  low_light: 'Force lighting score < 50',
  blur: 'Force sharpness score < 50',
  bad_pose: 'Force pose angles > 30°',
  occlusion: 'Force occlusion detection',
  perfect: 'Force all quality factors = 100'
};
```

**Data Storage:**
- Enrollments: `stored_enrollments` key in SecureStore
- Queue: `enrollment_queue` key in SecureStore
- All data encrypted by expo-secure-store

### Components

#### 1. **EmbeddingQualityMeter** (`src/components/enrollment/EmbeddingQualityMeter.tsx`)
Visual quality assessment display.

**Props:**
```typescript
interface Props {
  quality: QualityAssessment;
  showDetails?: boolean; // Show factor breakdown
}
```

**Features:**
- Circular score display (0-100)
- Animated progress bar
- Color coding:
  - Green (≥80): Excellent
  - Orange (≥65): Good
  - Red (<65): Poor
- Factor breakdown (if showDetails):
  - Lighting mini-bar
  - Sharpness mini-bar
  - Pose mini-bar
  - Occlusion mini-bar
- User-friendly tips array

#### 2. **FingerprintEnrollModal** (`src/components/enrollment/FingerprintEnrollModal.tsx`)
Optional fingerprint capture modal.

**Props:**
```typescript
interface Props {
  visible: boolean;
  onComplete: (template: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}
```

**Features:**
- Fingerprint icon with scanning indicator
- Progress tracking (0-100%)
- Quality display
- Instructions text
- Start / Skip / Cancel buttons
- Simulated capture (stub for real hardware)

**Integration Point:**
```typescript
// TODO: Replace with real fingerprint adapter
import { ExternalFingerprintAdapter } from '../../biometric/ExternalFingerprintAdapter';

const adapter = new ExternalFingerprintAdapter();
const result = await adapter.startEnrollment();
```

## Installation Requirements

### Dependencies

```bash
# Core React Native & Expo
npm install expo expo-camera expo-secure-store

# Navigation (already installed)
# @react-navigation/native
# @react-navigation/native-stack

# QR Code (TODO)
npm install react-native-qrcode-svg

# Face Detection (TODO)
npm install expo-face-detector

# TensorFlow Lite (TODO - production requirement)
npm install @tensorflow/tfjs
npm install @tensorflow/tfjs-react-native
```

### Permissions

Update `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access your camera for face enrollment"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app requires camera access to enroll employee faces for attendance tracking",
        "NSFaceIDUsageDescription": "This app uses Face ID for secure biometric authentication"
      }
    },
    "android": {
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.USE_BIOMETRIC",
        "android.permission.USE_FINGERPRINT"
      ]
    }
  }
}
```

## Integration Steps

### 1. Add Navigation Routes

Update `src/navigation/AppNavigator.tsx`:

```typescript
import {
  EnrollLanding,
  EnrollForm,
  MultiShotCapture,
  EnrollReview,
  EnrollSuccess,
  EnrollmentDebug,
} from '../screens/enrollment';

// In your Stack.Navigator:
<Stack.Screen 
  name="EnrollLanding" 
  component={EnrollLanding}
  options={{ title: 'Employee Enrollment' }}
/>
<Stack.Screen 
  name="EnrollForm" 
  component={EnrollForm}
  options={{ title: 'Employee Information' }}
/>
<Stack.Screen 
  name="MultiShotCapture" 
  component={MultiShotCapture}
  options={{ title: 'Face Capture' }}
/>
<Stack.Screen 
  name="EnrollReview" 
  component={EnrollReview}
  options={{ title: 'Review Enrollment' }}
/>
<Stack.Screen 
  name="EnrollSuccess" 
  component={EnrollSuccess}
  options={{ headerShown: false }}
/>
<Stack.Screen 
  name="EnrollmentDebug" 
  component={EnrollmentDebug}
  options={{ title: 'Debug Tools' }}
/>
```

### 2. Camera Integration

Replace mock camera in `MultiShotCapture.tsx`:

```typescript
import { Camera, CameraType } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';

const [permission, requestPermission] = Camera.useCameraPermissions();
const cameraRef = useRef<Camera>(null);

// In render:
<Camera
  ref={cameraRef}
  style={styles.camera}
  type={CameraType.front}
  onFacesDetected={handleFacesDetected}
  faceDetectorSettings={{
    mode: FaceDetector.FaceDetectorMode.fast,
    detectLandmarks: FaceDetector.FaceDetectorLandmarks.all,
    runClassifications: FaceDetector.FaceDetectorClassifications.all,
  }}
>
  {/* Overlay */}
</Camera>

// Capture:
const photo = await cameraRef.current?.takePictureAsync({
  quality: 0.8,
  base64: false,
});
```

### 3. TensorFlow Lite Integration

Update `FacePipeline.ts` with real ML:

```typescript
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

let model: tf.GraphModel | null = null;

export async function loadModel() {
  await tf.ready();
  model = await tf.loadGraphModel('bundleResourceIO://arcface_model/model.json');
}

export async function computeEmbedding(frame: FaceFrame): Promise<FaceEmbedding> {
  if (!model) {
    throw new Error('Model not loaded');
  }
  
  // 1. Load image
  const imageTensor = await loadImageFromUri(frame.imageUri);
  
  // 2. Preprocess to 112x112
  const preprocessed = tf.image.resizeBilinear(imageTensor, [112, 112])
    .div(255.0)
    .sub(0.5)
    .mul(2.0); // Normalize to [-1, 1]
  
  // 3. Run inference
  const prediction = model.predict(preprocessed.expandDims(0)) as tf.Tensor;
  
  // 4. Extract embedding
  const embeddingArray = await prediction.data();
  const embedding = new Float32Array(embeddingArray);
  
  // 5. Cleanup
  tf.dispose([imageTensor, preprocessed, prediction]);
  
  return {
    vector: embedding,
    model: 'arcface-mobilenet',
    version: '1.0',
    dimensions: 512,
  };
}
```

### 4. QR Code Integration

Replace mock QR in `EnrollSuccess.tsx`:

```typescript
import QRCode from 'react-native-qrcode-svg';

<QRCode
  value={state.pairingToken || ''}
  size={200}
  backgroundColor="white"
  color="black"
  logo={require('../../assets/logo.png')} // Optional
  logoSize={40}
  logoBackgroundColor="white"
/>
```

### 5. Fingerprint Integration

Update `FingerprintEnrollModal.tsx` with real hardware:

```typescript
import * as LocalAuthentication from 'expo-local-authentication';

const enrollFingerprint = async () => {
  // Check hardware support
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) {
    Alert.alert('Error', 'Device does not support fingerprint');
    return;
  }
  
  // Check enrolled fingerprints
  const isEnrolled = await LocalAuthentication.isEnrolledAsync();
  if (!isEnrolled) {
    Alert.alert('Error', 'No fingerprints enrolled on device');
    return;
  }
  
  // Authenticate
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Scan your fingerprint',
    fallbackLabel: 'Use password',
  });
  
  if (result.success) {
    // Generate template (use device-specific adapter)
    const template = generateFingerprintTemplate();
    onComplete(template);
  }
};
```

### 6. Offline Queue Retry

Add background task for queue processing:

```typescript
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';

const ENROLLMENT_SYNC_TASK = 'enrollment-sync';

TaskManager.defineTask(ENROLLMENT_SYNC_TASK, async () => {
  const queueJson = await SecureStore.getItemAsync('enrollment_queue');
  if (!queueJson) {
    return BackgroundFetch.BackgroundFetchResult.NoData;
  }
  
  const queue = JSON.parse(queueJson);
  
  for (const payload of queue) {
    try {
      await EmployeeService.enroll(payload);
      // Remove from queue on success
      queue.splice(queue.indexOf(payload), 1);
    } catch (err) {
      console.error('Retry failed:', err);
    }
  }
  
  await SecureStore.setItemAsync('enrollment_queue', JSON.stringify(queue));
  
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

// Register task
BackgroundFetch.registerTaskAsync(ENROLLMENT_SYNC_TASK, {
  minimumInterval: 15 * 60, // 15 minutes
  stopOnTerminate: false,
  startOnBoot: true,
});
```

## Testing

### Mock Mode Testing

Enable mock mode in `EnrollmentDebug` screen or programmatically:

```typescript
import { setMockMode } from '../biometric/FacePipeline';

// Enable deterministic test data
setMockMode(true);

// Test enrollment flow with mock embeddings
// No real ML models or camera required
```

### Quality Scenarios

Use `EnrollmentDebug` screen to force specific quality conditions:

1. **Low Light**: Simulates poor lighting conditions
2. **Blur**: Simulates motion blur or out-of-focus
3. **Bad Pose**: Simulates extreme head angles
4. **Occlusion**: Simulates face partially covered
5. **Perfect**: Simulates ideal conditions

### Unit Tests

```typescript
// Example test for FacePipeline
import { computeEmbedding, assessQuality, setMockMode } from '../FacePipeline';

describe('FacePipeline', () => {
  beforeEach(() => {
    setMockMode(true);
  });
  
  it('should generate 512-dimensional embeddings', async () => {
    const frame = createMockFrame();
    const embedding = await computeEmbedding(frame);
    expect(embedding.vector.length).toBe(512);
  });
  
  it('should assess quality correctly', () => {
    const frame = createMockFrame({ lighting: 80, blur: 0.5 });
    const quality = assessQuality(frame);
    expect(quality.score).toBeGreaterThan(65);
    expect(quality.passesThreshold).toBe(true);
  });
});
```

## Production Checklist

- [ ] Install expo-camera and configure permissions
- [ ] Install expo-face-detector for face detection
- [ ] Install TensorFlow Lite and load ArcFace model
- [ ] Install react-native-qrcode-svg for QR codes
- [ ] Configure camera permissions in app.json
- [ ] Test enrollment flow end-to-end
- [ ] Test offline queueing and retry logic
- [ ] Test mock mode for QA
- [ ] Verify TOON encoding/decoding
- [ ] Verify SecureStore encryption
- [ ] Test pairing token QR code scanning
- [ ] Test on iOS and Android devices
- [ ] Performance testing (embedding computation time)
- [ ] Privacy audit (consent flow, data encryption)
- [ ] Accessibility testing (screen readers, color contrast)

## Security Considerations

### Data Encryption

All biometric data is encrypted using expo-secure-store:

```typescript
// Automatic encryption by SecureStore
await SecureStore.setItemAsync('embedding_E123', JSON.stringify(embedding));

// Decryption
const embeddingJson = await SecureStore.getItemAsync('embedding_E123');
```

### Consent Management

- Consent required before submission
- Digital signature with timestamp
- C1 token stored with enrollment
- User can request deletion (GDPR compliance)

### Network Security

- TOON encoding prevents JSON injection
- No plaintext biometric data in network payloads
- int8 quantization reduces bandwidth and attack surface

### Local Storage

- Never store raw embeddings unencrypted
- Use SecureStore for all biometric data
- Clear sensitive data on logout

## Troubleshooting

### Camera Not Working

```typescript
// Check permissions
const { status } = await Camera.requestCameraPermissionsAsync();
if (status !== 'granted') {
  Alert.alert('Camera permission denied');
}
```

### Embedding Quality Too Low

- Check lighting conditions
- Ensure face is centered in frame
- Remove glasses/masks
- Hold device steady
- Increase quality threshold temporarily for testing

### Offline Queue Not Syncing

- Check network connectivity
- Verify BackgroundFetch is registered
- Check SecureStore for queued payloads
- Force sync from EnrollmentDebug screen

### Navigation Type Errors

Ensure all routes are in `RootStackParamList`:

```typescript
export type RootStackParamList = {
  // ... other routes
  EnrollLanding: undefined;
  EnrollForm: undefined;
  MultiShotCapture: undefined;
  EnrollReview: undefined;
  EnrollSuccess: undefined;
  EnrollmentDebug: undefined;
};
```

## Future Enhancements

1. **Voice Guidance**: Audio instructions during capture
2. **Liveness Detection**: Blink detection, head movement
3. **Multi-language Support**: i18n for all screens
4. **Batch Enrollment**: Enroll multiple employees in sequence
5. **Analytics**: Track enrollment success rates, quality metrics
6. **Admin Dashboard**: View all enrollments, regenerate tokens
7. **Iris Recognition**: Additional biometric modality
8. **Export Functionality**: Export enrollment logs to CSV

## Support

For issues or questions:
- Check mock mode is enabled for testing
- Review integration points in code comments
- Test with EnrollmentDebug tools
- Verify network connectivity for offline queue

---

**Documentation Version**: 1.0  
**Last Updated**: 2024  
**Maintainer**: KS Attendance Team
