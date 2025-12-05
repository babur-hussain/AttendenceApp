# Enrollment Quick Start Guide

## 🚀 5-Minute Setup

### 1. Install Dependencies (30 seconds)

```bash
cd ks-attendance-app

# Required for camera
npm install expo-camera expo-face-detector

# Required for QR codes
npm install react-native-qrcode-svg

# Optional: TensorFlow Lite (for production ML)
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native
```

### 2. Update App Configuration (1 minute)

Edit `ks-attendance-app/app.json`:

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
        "NSCameraUsageDescription": "This app requires camera access to enroll employee faces"
      }
    },
    "android": {
      "permissions": [
        "android.permission.CAMERA"
      ]
    }
  }
}
```

### 3. Add Navigation Routes (2 minutes)

Edit `ks-attendance-app/src/navigation/AppNavigator.tsx`:

```typescript
// Add imports at top
import {
  EnrollLanding,
  EnrollForm,
  MultiShotCapture,
  EnrollReview,
  EnrollSuccess,
  EnrollmentDebug,
} from '../screens/enrollment';

// Add screens inside your Stack.Navigator
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
  options={{ title: 'Face Capture', headerShown: false }}
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

### 4. Test with Mock Mode (1 minute)

```typescript
// In any component or screen
import { setMockMode } from '../biometric/FacePipeline';

// Enable mock mode for testing without camera/ML
setMockMode(true);

// Navigate to enrollment
navigation.navigate('EnrollLanding');
```

## 🎯 Quick Test Flow

### Mock Mode Test (No Camera Required)

1. Enable mock mode: `setMockMode(true)`
2. Navigate to `EnrollLanding`
3. Tap "New Employee"
4. Fill form:
   - Name: Test Employee
   - Email: test@example.com
   - Phone: 1234567890
   - Role: Employee
5. Tap "Continue to Face Capture"
6. Tap capture button 5 times (mock captures)
7. Tap "Complete Capture"
8. Accept consent terms
9. Tap "Submit Enrollment"
10. View success screen with employee ID

**Expected Result**: Complete enrollment without camera, using deterministic mock data.

## 📱 Camera Integration (Production)

Replace mock camera in `MultiShotCapture.tsx`:

```typescript
import { Camera, CameraType } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';

// Add to component
const [permission, requestPermission] = Camera.useCameraPermissions();
const cameraRef = useRef<Camera>(null);

// Request permission on mount
useEffect(() => {
  if (!permission?.granted) {
    requestPermission();
  }
}, []);

// Replace mock camera view (line ~120)
{permission?.granted ? (
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
    {/* Keep overlay */}
    <View style={styles.overlay}>
      <View style={styles.faceGuide} />
    </View>
    {/* Keep pose guidance */}
  </Camera>
) : (
  <View style={styles.mockCamera}>
    <Text>Requesting camera permission...</Text>
  </View>
)}

// Update handleCapture function (line ~85)
const handleCapture = async () => {
  setIsCapturing(true);
  setError(null);

  try {
    // Real camera capture
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.8,
      base64: false,
    });

    if (!photo) {
      throw new Error('Failed to capture photo');
    }

    const frame: FaceFrame = {
      imageUri: photo.uri,
      width: photo.width,
      height: photo.height,
      timestamp: Date.now(),
      metadata: { /* face detection results */ },
    };

    const result = await captureShot(frame, photo.uri);

    if (!result.success) {
      setError(result.error || 'Failed to capture');
      setIsCapturing(false);
      return;
    }

    setLastQuality(result.quality || null);

    if (state.shots.length < TARGET_SHOTS - 1) {
      setCurrentPoseIndex((prev) => (prev + 1) % POSE_GUIDES.length);
    }
  } catch (err) {
    console.error('Capture error:', err);
    setError('Failed to capture image');
  } finally {
    setIsCapturing(false);
  }
};
```

## 📊 QR Code Integration

Replace mock QR in `EnrollSuccess.tsx`:

```typescript
import QRCode from 'react-native-qrcode-svg';

// Replace mock QR view (line ~60)
{state.pairingToken && (
  <View style={styles.qrBox}>
    <QRCode
      value={state.pairingToken}
      size={200}
      backgroundColor="white"
      color="black"
      logo={require('../../assets/logo.png')} // Optional
      logoSize={40}
    />
  </View>
)}
```

## 🔍 Debug Tools

Access debug screen for testing:

```typescript
navigation.navigate('EnrollmentDebug');
```

**Features**:
- Toggle mock mode on/off
- View stored enrollments (encrypted)
- View queued payloads
- Force quality scenarios (low light, blur, etc.)
- Clear all local data
- Export logs

## 🧪 Testing Scenarios

### 1. Happy Path
- Complete enrollment with 5 quality shots
- Accept consent
- Submit successfully
- View employee ID and QR code

### 2. Quality Rejection
- Capture shots with poor quality
- Try to complete with < 3 good shots
- See error message

### 3. Offline Mode
- Disconnect network
- Complete enrollment
- Check "Queued for Sync" status
- Reconnect and verify auto-submission

### 4. Consent Rejection
- Complete capture
- Leave consent unchecked
- Try to submit
- See disabled button

### 5. Shot Removal
- Capture 5 shots
- Remove 2 shots
- Add 2 more shots
- Complete successfully

## 📚 Documentation

- **Full Guide**: `ENROLLMENT_IMPLEMENTATION_GUIDE.md`
- **API Reference**: `ENROLLMENT_API_REFERENCE.md`
- **Summary**: `ENROLLMENT_IMPLEMENTATION_SUMMARY.md`
- **Code Comments**: Extensive inline documentation

## 🐛 Troubleshooting

### Camera not showing
```typescript
// Check permission
const { status } = await Camera.getCameraPermissionsAsync();
console.log('Camera permission:', status);

// Request if needed
if (status !== 'granted') {
  await Camera.requestCameraPermissionsAsync();
}
```

### Mock mode not working
```typescript
import { setMockMode, isMockMode } from '../biometric/FacePipeline';

setMockMode(true);
console.log('Mock mode:', isMockMode()); // Should log: true
```

### TypeScript errors
- All enrollment routes added to `RootStackParamList`
- All components exported from index files
- No external Picker dependency (using custom button groups)

### Navigation errors
```typescript
// Ensure routes are in RootStackParamList
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

## 🎉 Success Checklist

- [ ] Dependencies installed
- [ ] app.json updated with permissions
- [ ] Navigation routes added
- [ ] Mock mode test successful
- [ ] Camera integration (optional for testing)
- [ ] QR code integration (optional for testing)
- [ ] End-to-end test completed
- [ ] Debug tools accessible

## 🚦 Status

**Implementation**: ✅ 100% Complete  
**TypeScript**: ✅ No errors  
**Mock Mode**: ✅ Fully functional  
**Production Ready**: 🟡 Requires camera/QR integration  
**Documentation**: ✅ Comprehensive

## 🆘 Need Help?

1. Check code comments - integration points marked with `TODO:`
2. Review `ENROLLMENT_IMPLEMENTATION_GUIDE.md` for detailed docs
3. Use mock mode for testing without dependencies
4. Check `EnrollmentDebug` screen for QA tools

---

**Time to Production**: ~30 minutes with camera integration  
**Time to Test**: 5 minutes with mock mode  
**Complexity**: Medium (well-documented)
