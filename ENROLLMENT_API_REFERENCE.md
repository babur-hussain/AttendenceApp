# Enrollment API Reference

## Quick Reference for Employee Enrollment Flow

### Flow State Machine

```
form → capture → fingerprint → review → submitting → success
                     ↓              ↓
                   (skip)         error
```

### useEnrollment Hook API

```typescript
import { useEnrollment } from '../hooks/useEnrollment';

const {
  state,              // Current enrollment state
  submitForm,         // Submit employee form data
  captureShot,        // Capture face shot
  removeShot,         // Remove shot by index
  completeCapture,    // Finish capture step
  enrollFingerprint,  // Add fingerprint
  setConsent,         // Accept consent terms
  submitEnrollment,   // Submit to server
  regeneratePairingToken, // Create new pairing token
  reset,              // Start over
} = useEnrollment();
```

### State Object

```typescript
interface EnrollmentState {
  step: 'form' | 'capture' | 'fingerprint' | 'review' | 'submitting' | 'success' | 'error';
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
    allowedBreakMinutes?: number;
    policyProfile?: string;
  };
  shots: Array<{
    thumbnailUri: string;
    quality: QualityAssessment;
    timestamp: number;
  }>;
  enrolledEmbedding: EnrolledEmbedding | null;
  fingerprintTemplate: string | null;
  consentToken: { timestamp: number; signedName: string; dataTypes: string } | null;
  employeeId: string | null;
  pairingToken: string | null;
  isOffline: boolean;
  queuedPayload: EnrollmentPayload | null;
  error: string | null;
}
```

### Method Details

#### submitForm(formData)

```typescript
const result = await submitForm({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phone: '1234567890',
  role: 'EMPLOYEE',
  allowedBreakMinutes: 30,
  policyProfile: 'standard',
});

// Returns: { success: boolean, error?: string }
// On success: advances to 'capture' step
```

#### captureShot(frame, thumbnailUri)

```typescript
const frame: FaceFrame = {
  imageUri: 'file:///...',
  width: 640,
  height: 480,
  timestamp: Date.now(),
  metadata: { /* face detection results */ }
};

const result = await captureShot(frame, 'file:///thumb.jpg');

// Returns: { 
//   success: boolean, 
//   quality?: QualityAssessment, 
//   error?: string 
// }
```

#### removeShot(index)

```typescript
removeShot(2); // Remove 3rd shot (0-indexed)
```

#### completeCapture()

```typescript
const result = await completeCapture();

// Returns: { success: boolean, error?: string }
// Requires: min 3 shots, min 3 quality shots ≥65
// On success: advances to 'review' step (or 'fingerprint' if configured)
```

#### enrollFingerprint(template)

```typescript
await enrollFingerprint('<fingerprint-template-base64>');
// Advances to 'review' step
```

#### setConsent(accepted, signedName)

```typescript
setConsent(true, 'John Doe');
// Generates C1 consent token
```

#### submitEnrollment()

```typescript
const result = await submitEnrollment();

// Returns: { success: boolean, error?: string }
// On success: advances to 'success' step with employeeId and pairingToken
// On network failure: queues payload and sets isOffline=true
```

#### regeneratePairingToken()

```typescript
regeneratePairingToken();
// Generates new PAIR1 token for QR code
```

#### reset()

```typescript
reset();
// Clears all state, returns to 'form' step
```

### TOON Token Format

#### Face Embedding (F2)

```
F2=<base64-encoded-int8-array>

Example:
F2=AQIDBAUGBwgJCgsMDQ4P...
```

#### Face Metadata (F3)

```
F3=version|quality|shotCount|method|scale

Example:
F3=1.0|85|5|arcface|0.125
```

#### Fingerprint (FP1)

```
FP1=<base64-fingerprint-template>

Example:
FP1=AAECAwQFBgcICQoLDA0O...
```

#### Consent (C1)

```
C1=timestamp|signedName|dataTypes

Example:
C1=1234567890123|John Doe|face,fingerprint
```

#### Employee Fields

```
E2=firstName
E3=lastName
E4=email
E5=role
E6=phone (optional)
E7=allowedBreakMinutes (optional)
E8=policyProfile (optional)
```

#### Pairing Token (PAIR1)

```
PAIR1=uuid|employeeId|timestamp|expiryMinutes

Example:
PAIR1=550e8400-e29b-41d4-a716-446655440000|E123|1234567890123|60
```

### Complete Request Example

```
POST /api/v1/employees

Body:
F2=AQIDBAUGBwgJCgsMDQ4P...&
F3=1.0|85|5|arcface|0.125&
E2=John&
E3=Doe&
E4=john@example.com&
E5=EMPLOYEE&
E6=1234567890&
E7=30&
E8=standard&
C1=1234567890123|John Doe|face
```

### Quality Assessment

```typescript
interface QualityAssessment {
  score: number;              // 0-100 overall score
  passesThreshold: boolean;   // score >= 65
  factors: {
    lighting: number;         // 0-100
    sharpness: number;        // 0-100
    pose: number;             // 0-100 (based on yaw/pitch/roll)
    occlusion: number;        // 0-100
  };
  tips: string[];            // User-friendly suggestions
}
```

**Thresholds:**
- Overall: ≥ 65 (good), ≥ 80 (excellent)
- Lighting: ≥ 60
- Sharpness: ≥ 65
- Pose: yaw/pitch < 30°, roll < 15°
- Occlusion: < 20% face coverage

### Mock Mode

```typescript
import { setMockMode, getMockMode } from '../biometric/FacePipeline';

// Enable for testing
setMockMode(true);

// Check current mode
const isMock = getMockMode();

// Mock mode generates:
// - Deterministic Float32Array embeddings
// - Predictable quality scores
// - No ML models required
```

### Secure Storage

```typescript
import * as SecureStore from 'expo-secure-store';

// Store embedding (encrypted)
await SecureStore.setItemAsync(
  `embedding_${employeeId}`,
  JSON.stringify(embedding)
);

// Retrieve embedding
const embeddingJson = await SecureStore.getItemAsync(`embedding_${employeeId}`);
const embedding = JSON.parse(embeddingJson);

// Delete embedding
await SecureStore.deleteItemAsync(`embedding_${employeeId}`);
```

### Offline Queue

```typescript
// Check if payload is queued
if (state.isOffline && state.queuedPayload) {
  console.log('Enrollment queued for sync');
}

// Queue stored in SecureStore
const queueJson = await SecureStore.getItemAsync('enrollment_queue');
const queue = JSON.parse(queueJson);

// Retry logic (automatic in background)
// Exponential backoff: 1s, 2s, 5s, 10s
```

### Navigation Integration

```typescript
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();

// Start enrollment
navigation.navigate('EnrollLanding');

// Manual navigation (useEnrollment handles automatically)
navigation.navigate('EnrollForm');
navigation.navigate('MultiShotCapture');
navigation.navigate('EnrollReview');
navigation.navigate('EnrollSuccess');
```

### Common Patterns

#### Start Enrollment

```typescript
const { submitForm } = useEnrollment();

const handleSubmit = async () => {
  const result = await submitForm(formData);
  if (result.success) {
    navigation.navigate('MultiShotCapture');
  }
};
```

#### Capture Shot

```typescript
const { captureShot, state } = useEnrollment();

const handleCapture = async () => {
  const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
  
  const frame: FaceFrame = {
    imageUri: photo.uri,
    width: photo.width,
    height: photo.height,
    timestamp: Date.now(),
    metadata: { /* from face detector */ }
  };
  
  const result = await captureShot(frame, photo.uri);
  
  if (result.success) {
    console.log('Quality:', result.quality?.score);
    
    if (state.shots.length >= 5) {
      // Optional: auto-complete
      await completeCapture();
    }
  }
};
```

#### Review and Submit

```typescript
const { setConsent, submitEnrollment } = useEnrollment();

const handleSubmit = async () => {
  // Accept consent
  setConsent(true, 'John Doe');
  
  // Submit
  const result = await submitEnrollment();
  
  if (result.success) {
    navigation.navigate('EnrollSuccess');
  } else {
    Alert.alert('Error', result.error);
  }
};
```

#### Handle Success

```typescript
const { state, regeneratePairingToken, reset } = useEnrollment();

// Display employee ID
<Text>{state.employeeId}</Text>

// Display QR code
<QRCode value={state.pairingToken || ''} size={200} />

// Regenerate token
<Button onPress={regeneratePairingToken} title="Regenerate" />

// Enroll another
<Button onPress={() => {
  reset();
  navigation.navigate('EnrollLanding');
}} title="Enroll Another" />
```

### Error Handling

```typescript
// Check for errors
if (state.error) {
  Alert.alert('Enrollment Error', state.error);
}

// Common errors:
// - "Minimum 3 shots required"
// - "At least 3 shots must have quality score ≥ 65"
// - "Failed to capture frame"
// - "Network error"
// - "Invalid form data"

// Reset after error
if (state.step === 'error') {
  reset(); // or retry specific step
}
```

### Testing Checklist

```typescript
// 1. Mock mode
setMockMode(true);

// 2. Force quality scenarios (in EnrollmentDebug)
// - Low Light
// - Blur
// - Bad Pose
// - Occlusion
// - Perfect

// 3. Test offline mode
// - Disconnect network
// - Submit enrollment
// - Check queue in SecureStore
// - Reconnect and verify sync

// 4. Test pairing token
// - Generate QR code
// - Scan with kiosk
// - Verify employee pairing

// 5. Test consent flow
// - Accept consent
// - Verify C1 token
// - Check timestamp and signature
```

### Performance Benchmarks

- **Face Detection**: < 100ms per frame
- **Embedding Computation**: 200-500ms (TF Lite)
- **Quality Assessment**: < 50ms
- **TOON Encoding**: < 100ms
- **Total Capture Time**: 5-10 seconds (5 shots)
- **Submission**: < 2 seconds (online)

### Integration Checklist

- [ ] Install dependencies (expo-camera, expo-face-detector, react-native-qrcode-svg)
- [ ] Configure camera permissions in app.json
- [ ] Add enrollment routes to AppNavigator
- [ ] Replace mock camera with expo-camera
- [ ] Load TensorFlow Lite model
- [ ] Implement fingerprint adapter
- [ ] Test offline queueing
- [ ] Test QR code scanning
- [ ] Verify TOON encoding/decoding
- [ ] Test on iOS and Android

### Support

For implementation help:
1. Check `ENROLLMENT_IMPLEMENTATION_GUIDE.md` for detailed docs
2. Review code comments for integration points
3. Use `EnrollmentDebug` screen for testing
4. Enable mock mode for development

---

**Quick Reference Version**: 1.0  
**Compatible with**: React Native + Expo
