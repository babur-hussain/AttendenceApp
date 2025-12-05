# Face ID-Style Continuous Scanning Implementation

## Overview
Converted Face Enrollment from **discrete photo capture** (5 shots) to **continuous face scanning** (30 samples over 10 seconds) - similar to Apple Face ID registration.

## Changes Made

### 1. Updated Constants
```typescript
// OLD - Photo capture mode
const TARGET_SHOTS = 5;
const MIN_QUALITY_SHOTS = 3;
const AUTO_CAPTURE_DELAY = 1500;

// NEW - Continuous scanning mode
const REQUIRED_FACE_SAMPLES = 30;
const MIN_QUALITY_SAMPLES = 20;
const SAMPLE_INTERVAL = 300; // ms between samples
const REGISTRATION_DURATION = 10000; // 10 seconds total
```

### 2. Updated State Variables
```typescript
// REMOVED
const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
const [detectionStartTime, setDetectionStartTime] = useState<number | null>(null);

// ADDED
const [samplesCollected, setSamplesCollected] = useState(0);
const [isRegistering, setIsRegistering] = useState(false);
const [registrationStartTime, setRegistrationStartTime] = useState<number | null>(null);
const [faceSamples, setFaceSamples] = useState<Array<{
  pose: string;
  yaw: number;
  roll: number;
  timestamp: number;
}>>([]);
```

### 3. Continuous Monitoring Loop
**Before**: Monitored face every 500ms, triggered manual capture
**After**: Continuously collects samples every 300ms without taking photos

```typescript
// Runs every SAMPLE_INTERVAL (300ms)
// - Detects face presence
// - Starts registration on first detection
// - Collects face samples when pose is good
// - Auto-advances through poses based on time
// - Updates progress: (samplesCollected / REQUIRED_FACE_SAMPLES) * 100
```

### 4. Removed Photo Capture
**Old `handleCapture()`**: Used `takePictureAsync()` to capture 5 discrete photos
**New `handleCapture()`**: No-op function (samples collected automatically)

### 5. Updated Pose Flow
**Before**: Discrete poses - capture photo → wait → next pose
**After**: Continuous flow - each pose has duration property (3s, 2s, 1.5s)
- Front: 3000ms
- Turn Left: 2000ms
- Turn Right: 2000ms
- Tilt Up: 1500ms
- Tilt Down: 1500ms

### 6. Updated UI
**Header**:
- Before: "X / 5 shots • Y high quality"
- After: "X / 30 samples • Y quality poses"

**Capture Button Area**:
- Before: Manual capture button or "Auto-capturing..." indicator
- After: Registration status - "🔄 Scanning face... X%" or "👤 Position your face in frame"

**Progress Calculation**:
- Before: (shots.length / TARGET_SHOTS) * 100
- After: (samplesCollected / REQUIRED_FACE_SAMPLES) * 100

## How It Works

1. **Face Detection**: Camera opens, monitoring loop starts
2. **Registration Start**: When face detected → `isRegistering = true`, timer starts
3. **Sample Collection**: Every 300ms, if pose is good → collect sample data (no photo)
4. **Pose Advancement**: After each pose's duration elapses → auto-advance to next
5. **Progress Tracking**: Real-time progress based on samples collected and time elapsed
6. **Completion**: When 30 samples collected → auto-complete registration

## Key Improvements

✅ **No discrete photos** - Continuous biometric scanning like Face ID
✅ **Smoother UX** - No button pressing, automatic flow
✅ **Real-time feedback** - Live guidance and progress percentage
✅ **Time-based poses** - Each pose has specific duration for balanced coverage
✅ **Quality enforcement** - Must collect 20+ quality samples from different angles

## Technical Details

### Sample Data Structure
```typescript
{
  pose: string;      // 'Front', 'Turn Left', etc.
  yaw: number;       // Face rotation angle
  roll: number;      // Face tilt angle
  timestamp: number; // When sample collected
}
```

### Registration Flow
```
1. Camera ready → monitoring starts (300ms interval)
2. Face detected → registrationStartTime set
3. Loop collects samples when:
   - Face detected
   - Current pose satisfied
   - samplesCollected < REQUIRED_FACE_SAMPLES
4. Progress = max(timeProgress, sampleProgress)
5. Auto-complete when samplesCollected >= REQUIRED_FACE_SAMPLES
```

### Quality Criteria
- Minimum 20 quality samples (non-center poses)
- Face must be properly aligned for each pose
- Yaw/roll angles must match pose requirements
- Eyes should be open (via face feature detection)

## Files Modified
- `ks-attendance-app/src/screens/enrollment/MultiShotCapture.tsx`
  - Updated constants and state
  - Refactored monitoring loop
  - Removed photo capture logic
  - Updated UI components
  - Added continuous sample collection

## Testing Notes
- Metro bundler will auto-reload with changes
- Test on iPhone 16 to verify smooth continuous scanning
- Verify all 5 poses collect samples properly
- Check progress updates in real-time
- Ensure auto-complete triggers at 30 samples
