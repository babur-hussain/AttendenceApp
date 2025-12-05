# Liveness Detection System

**Version:** 1.0.0  
**Status:** Production-Ready  
**Platform:** React Native (Expo), Raspberry Pi

---

## Overview

The Liveness Detection System provides **spoof-resistant face liveness verification** for the Kapoor & Sons Attendance System. It combines **motion-based detection**, **ML models**, and **quality heuristics** to determine if a presented face is from a live person (not a photo, video, mask, or deepfake).

### Key Features

- ✅ **Multi-Signal Fusion**: Combines motion (blink, head-turn), ML models, frame quality, device trust
- ✅ **Configurable Policies**: Default, strict, lenient, fast — optimized for different scenarios
- ✅ **Privacy-Conscious**: Encrypted evidence storage, explicit consent (C1 tokens), GDPR-compliant deletion
- ✅ **Mobile & Raspberry Pi**: Runs on Expo (iOS/Android) and Raspberry Pi with camera
- ✅ **TOON Protocol**: All network interactions via ToonClient with TOON tokens (no JSON)
- ✅ **Guided UI**: 3-7 second flows with visual feedback, accessibility support
- ✅ **Auditable**: Evidence tokens (LVID) with 24h TTL, admin review with audit trails (AUD1)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Liveness Detection Flow                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Capture Frames (3-7 sec)                                │
│     └─> Camera → MediaPipe/BlazeFace → Landmarks            │
│                                                               │
│  2. Motion Detection                                         │
│     ├─> Blink Detector (EAR algorithm)                      │
│     ├─> Head Turn Detector (yaw estimation)                 │
│     ├─> Mouth Movement (MAR, optional)                      │
│     └─> Frame Stability (anti-replay)                       │
│                                                               │
│  3. ML Liveness (Hybrid)                                     │
│     ├─> Local ONNX Model (minivision/fasnet)                │
│     └─> Server Fallback (via ToonClient)                    │
│                                                               │
│  4. Fusion Engine                                            │
│     └─> Weighted Average → L1 Score (0-1)                   │
│         w_motion=0.6, w_ml=0.3, w_quality=0.1               │
│                                                               │
│  5. Evidence Storage (Optional)                              │
│     └─> Encrypted LVID → 24h TTL → SecureStore              │
│                                                               │
│  6. Result                                                    │
│     └─> L1, isLive, components, evidenceId, reasons         │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Algorithms

### 1. Blink Detection (EAR)

**Eye Aspect Ratio (EAR)** — Soukupová & Čech (2016)

```
EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)

p1 = left corner, p4 = right corner
p2, p3 = top points, p5, p6 = bottom points
```

**Thresholds:**
- Open: EAR > 0.25
- Closed: EAR < 0.22
- Blink duration: 100-400ms
- Target: 2 blinks in 3-7 seconds

**Scoring:**
```
score = blinkCount / targetCount
score += 0.1 if blinks evenly spaced (anti-replay bonus)
```

---

### 2. Head Turn Detection (Yaw Estimation)

**Yaw Estimation** — Nose-to-eye-center ratio

```
yaw ≈ (noseX - eyeCenterX) / interEyeDistance * 90°

eyeCenterX = (leftEyeX + rightEyeX) / 2
interEyeDistance = ||leftEye - rightEye||
```

**Thresholds:**
- Turn detected: |yaw| > 15°
- Target: 1 left + 1 right turn
- Minimum yaw range: 30° total

**Scoring:**
```
score = min(turnCount / 2, 1.0)
score += 0.2 if yawRange > 40°
```

---

### 3. Mouth Movement (MAR)

**Mouth Aspect Ratio (MAR)** — Similar to EAR for 8-point mouth

```
MAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
```

**Thresholds:**
- Open: MAR > 0.3
- Optional check (neutral score if not required)

---

### 4. Frame Stability (Anti-Replay)

**Three Methods:**

1. **Hash-based**: Detect identical frames (photo attack)
2. **Pixel Variance**: Check variance across frames (min: 100)
3. **Temporal Consistency**: Smooth frame intervals (detect loops)

**Loop Detection:**
```
If frame[i] ≈ frame[i-10] AND frame[i+1] ≈ frame[i-9]:
  → Replay loop detected
```

---

### 5. ML Liveness Models

**Frame-Level Model**: `minivision_liveness_frame`
- Input: `[1, 3, 112, 112]` (RGB 112x112)
- Output: Binary (0 = fake, 1 = live)
- Threshold: 0.5

**Sequence-Level Model**: `fasnet_liveness_sequence`
- Input: `[1, 10, 3, 112, 112]` (10 frames)
- Output: Binary (0 = fake, 1 = live)
- Threshold: 0.6

**Hybrid Prediction:**
1. Try local ONNX model
2. If confidence < 70% OR error → fallback to server
3. Server API: `POST /api/liveness/verify` with TOON tokens

---

### 6. Fusion Engine

**Weighted Average:**

```
L1 = w_motion × motionScore + 
     w_ml × mlScore + 
     w_quality × qualityScore + 
     w_device × deviceTrustScore + 
     w_stability × stabilityScore

motionScore = (blink × 1.0 + headTurn × 0.9 + mouth × 0.5) / totalWeight
```

**Default Weights:**
- `w_motion = 0.6` (primary signal)
- `w_ml = 0.3` (ML backup)
- `w_quality = 0.05` (frame quality)
- `w_device = 0.03` (device trust)
- `w_stability = 0.02` (anti-replay)

**Binary Verdict:**
```
isLive = L1 ≥ threshold
threshold = 0.7 (default), 0.85 (strict), 0.6 (lenient)
```

---

## TOON Token Formats

### L1 — Liveness Score
```
L1=0.8234
```

### LVID — Evidence ID
```
LVID=LVID_a3f8c92d4b16e5a7_9f2e1c0a
```

### Components (Optional)
```
L_MOT=0.850  # Motion score
L_ML=0.780   # ML score
L_QUAL=0.750 # Quality score
L_DEV=0.900  # Device trust
L_STAB=0.820 # Stability score
```

### Reasons (If not live)
```
L_REASON=low_motion|insufficient_blinks
```

### Server API Payload
```
{
  SID1: "session_abc123",
  DID1: "device_xyz789",
  TS1: "2025-12-03T10:30:00Z",
  FH1: "hash1|hash2|hash3",  # Frame hashes (pipe-separated)
  FC1: "10",                 # Frame count
  E1: "employee_12345"       # Employee ID (optional)
}
```

### Server Response
```
{
  L1: "0.8234",
  CONF1: "85",       # Confidence (0-100)
  S1: "signature"    # Server signature
}
```

---

## Policies

### Default Policy (Balanced)
```typescript
{
  weights: { motion: 0.6, ml: 0.3, quality: 0.05, device: 0.03, stability: 0.02 },
  thresholds: { liveness: 0.7, minMotion: 0.4, minML: 0.4 },
  behavior: { requireBlink: true, requireHeadTurn: true, timeout: 10 },
  evidenceConfig: { storeEvidence: true, ttlHours: 24 }
}
```

**Use Case:** General attendance, good lighting, medium-security

---

### Strict Policy (High Security)
```typescript
{
  weights: { motion: 0.4, ml: 0.5, quality: 0.05, device: 0.03, stability: 0.02 },
  thresholds: { liveness: 0.85, minMotion: 0.6, minML: 0.7 },
  behavior: { requireBlink: true, requireHeadTurn: true, requireMouthMovement: true, timeout: 15 },
  evidenceConfig: { storeEvidence: true, ttlHours: 48, encryptionLevel: 'high' }
}
```

**Use Case:** Admin access, guest verification, critical operations

---

### Lenient Policy (Challenging Conditions)
```typescript
{
  weights: { motion: 0.7, ml: 0.15, quality: 0.1, device: 0.03, stability: 0.02 },
  thresholds: { liveness: 0.6, minMotion: 0.3, minML: 0.3 },
  behavior: { requireBlink: true, requireHeadTurn: false, timeout: 12 },
  evidenceConfig: { storeEvidence: true, ttlHours: 24 }
}
```

**Use Case:** Poor lighting, low-end devices, outdoor attendance

---

### Fast Policy (Quick Checks)
```typescript
{
  weights: { motion: 0.8, ml: 0.1, quality: 0.05, device: 0.03, stability: 0.02 },
  thresholds: { liveness: 0.65, minMotion: 0.5 },
  behavior: { requireBlink: true, requireHeadTurn: false, timeout: 5 },
  evidenceConfig: { storeEvidence: false }
}
```

**Use Case:** Frequent attendance (multiple times per day), known employees

---

## Usage

### Basic Usage

```typescript
import { runLivenessSession, LivenessFrame } from '@/liveness';

const frames: LivenessFrame[] = [
  { imageData, landmarks, timestamp, quality: 0.8 },
  // ... 10-30 frames captured over 3-7 seconds
];

const result = await runLivenessSession(frames, {
  policy: 'default',
  sessionId: 'SID_abc123',
  deviceId: 'DID_xyz789',
  employeeId: 'E_12345',
  consentToken: 'C1_consent_token',
  storeEvidence: true,
});

console.log('Live:', result.decision.isLive);
console.log('L1:', result.decision.L1);
console.log('Evidence ID:', result.evidenceId);
```

---

### With UI Components

```tsx
import { LivenessPromptOverlay, LivenessProgressRing, useLivenessGuidance } from '@/liveness/uiHelpers';

function LivenessScreen() {
  const { state, onEvent, reset } = useLivenessGuidance({ requireBlink: true, requireHeadTurn: true });

  return (
    <View>
      {/* Camera view */}
      <Camera />

      {/* Prompt overlay */}
      <LivenessPromptOverlay
        currentAction={state.currentPrompt}
        progress={state.progress}
        onComplete={() => console.log('Complete!')}
      />

      {/* Progress ring */}
      <LivenessProgressRing score={0.75} />

      {/* Hints */}
      <LivenessHint reasons={state.hints} visible={!state.isComplete} />
    </View>
  );
}
```

---

### Policy Selection

```typescript
import { getPolicyForDevice, getPolicyForRole, getRecommendedPolicy } from '@/liveness/policies';

// Device-specific
const policy1 = getPolicyForDevice('device_123', {
  platform: 'raspberry-pi',
  cameraQuality: 'medium',
  trustScore: 0.85,
});

// Role-specific
const policy2 = getPolicyForRole('admin'); // → Fast policy

// Environment-based
const policy3 = getRecommendedPolicy({
  lighting: 'poor',
  deviceQuality: 'low',
  securityLevel: 'standard',
}); // → Lenient policy
```

---

### Evidence Management

```typescript
import { storeEvidence, getEvidence, deleteEvidence, verifyEvidence } from '@/liveness/evidenceStore';

// Store evidence
const LVID = await storeEvidence(evidenceBlob, {
  type: 'frame_hashes',
  sessionId: 'SID_abc',
  deviceId: 'DID_xyz',
  consentToken: 'C1_consent',
});

// Retrieve evidence (admin only)
const evidence = await getEvidence(LVID, { auditToken: 'AUD1_admin' });

// Verify integrity
const isValid = await verifyEvidence(LVID);

// Delete (GDPR)
await deleteEvidence(LVID);
```

---

## Privacy & Legal

### Consent Requirements

**Evidence storage REQUIRES explicit consent via C1 token:**

```typescript
// User must approve before evidence storage
const consentToken = await requestUserConsent();

// Only then store evidence
const result = await runLivenessSession(frames, {
  consentToken,
  storeEvidence: true,
});
```

---

### What is Stored?

**By Default:**
- ✅ Frame hashes (SHA-256) — NOT raw images
- ✅ Landmark summaries (first/last frame)
- ✅ Decision metadata (L1, components, timestamp)

**Optional (Admin Review):**
- ❌ Full frames — ONLY if explicitly enabled
- ✅ Encrypted with device + server keys
- ✅ Auto-purged after 24-48h TTL

---

### GDPR Compliance

```typescript
// User right to deletion
await deleteEvidence(LVID);

// Auto-cleanup expired evidence
await initEvidenceStore({ autoCleanup: true });

// Evidence list (requires admin role)
const evidenceList = await listEvidence({ employeeId: 'E_12345' });
```

---

### Admin Review

**Retrieve evidence with audit trail:**

```typescript
import { verifyLivenessEvidence } from '@/liveness';

const evidence = await verifyLivenessEvidence(LVID, 'AUD1_admin_token');

if (evidence) {
  console.log('Metadata:', evidence.metadata);
  console.log('Verified:', evidence.verified);
  // Decrypt and review blob if needed
}
```

**Audit logs include:**
- Who accessed (AUD1 token)
- When accessed (timestamp)
- Why accessed (review reason)

---

## Integration

### Attendance Flow

```typescript
// 1. Run face detection
const face = await detectFace(cameraFrame);

// 2. Run liveness check
const livenessResult = await runLivenessSession(frames, {
  policy: 'default',
  sessionId: generateSessionId(),
  deviceId: getDeviceId(),
  employeeId: face.employeeId,
  consentToken: getConsentToken(),
});

// 3. Check liveness
if (!livenessResult.decision.isLive) {
  alert('Liveness check failed: ' + livenessResult.decision.reasons.join(', '));
  return;
}

// 4. Run face matching
const matchResult = await matchFace(face.embedding, face.employeeId);

// 5. Submit attendance with L1 and LVID
await submitAttendance({
  employeeId: face.employeeId,
  L1: livenessResult.decision.L1,
  LVID: livenessResult.evidenceId,
  matchScore: matchResult.score,
});
```

---

## Tuning & Optimization

### Adjusting Weights

```typescript
import { tuneWeights } from '@/liveness/fusionEngine';

// Collect test data with ground truth
const testResults = [
  { inputs: { motionScores, mlScores }, groundTruth: true },
  { inputs: { motionScores, mlScores }, groundTruth: false },
  // ... 100+ samples
];

// Optimize for 1% false positive rate
const optimizedWeights = tuneWeights(testResults, 0.01);

// Apply to custom policy
setPolicy('optimized', { ...DEFAULT_POLICY, weights: optimizedWeights });
```

---

### Model Selection

**Frame-Level (Faster):**
- ✅ Single frame inference (~50ms)
- ✅ Good for quick checks
- ❌ Less context

**Sequence-Level (More Accurate):**
- ✅ Video-level analysis (10 frames)
- ✅ Detects temporal patterns
- ❌ Slower (~200ms)

```typescript
// Use sequence model for strict policy
const result = await runLivenessSession(frames, {
  mlModelKey: 'fasnet_sequence',
  policy: 'strict',
});
```

---

## Testing

### Run Tests

```bash
# All tests
npm test src/liveness/tests/

# Specific test file
npm test src/liveness/tests/motionDetector.test.ts
```

### Test Coverage

- ✅ Motion detectors with synthetic landmarks
- ✅ Fusion decision matrix (high/low combinations)
- ✅ Evidence storage lifecycle (store → retrieve → delete → TTL)
- ✅ Policy validation and weight normalization

---

## Troubleshooting

### Low L1 Score

**Possible Reasons:**
1. **Low Motion Score** → User not following prompts (blink, turn)
2. **Low ML Score** → Photo/video attack OR poor lighting
3. **Low Quality Score** → Blurry frames, dark environment
4. **Possible Replay** → Static frames, looping video

**Solutions:**
- Use `LivenessHint` component to guide user
- Switch to lenient policy for poor lighting
- Increase timeout for slower users
- Check camera quality and lighting

---

### False Positives (Photos Pass)

**Possible Causes:**
1. Weight too low on ML (`w_ml < 0.3`)
2. Threshold too low (`livenessThreshold < 0.7`)
3. Motion detector fooled by video playback

**Solutions:**
- Use strict policy (`livenessThreshold = 0.85`)
- Increase `w_ml` to 0.5
- Enable stability check (detect loops)

---

### False Negatives (Real Users Fail)

**Possible Causes:**
1. User confused by prompts
2. Poor lighting (low quality score)
3. Fast blinks not detected

**Solutions:**
- Use lenient policy
- Improve UI guidance
- Increase timeout
- Allow retry with hints

---

## Roadmap

### v1.1 (Planned)
- [ ] 3D depth map integration (iPhone TrueDepth)
- [ ] Active liveness challenges (color flash)
- [ ] Server-side model improvements
- [ ] Multi-language UI prompts

### v1.2 (Future)
- [ ] Presentation attack detection (PAD)
- [ ] Federated learning for model personalization
- [ ] Real-time feedback during capture

---

## References

### Papers
- Soukupová & Čech (2016) — "Real-Time Eye Blink Detection using Facial Landmarks"
- FaceNet — "FaceNet: A Unified Embedding for Face Recognition and Clustering"
- FAS Datasets — CelebA-Spoof, CASIA-FASD, Replay-Attack

### Standards
- ISO/IEC 30107 — Biometric Presentation Attack Detection
- FIDO Alliance — Biometric Authentication Standards
- GDPR — General Data Protection Regulation

---

## Support

**Issues:** [GitHub Issues](https://github.com/kapoor-sons/attendance/issues)  
**Email:** dev@kapoorsons.com  
**Docs:** [Full Documentation](https://docs.kapoorsons.com/liveness)

---

**© 2025 Kapoor & Sons Attendance System**  
**License:** MIT
