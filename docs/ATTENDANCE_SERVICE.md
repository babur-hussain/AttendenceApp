# Attendance Service - Complete Documentation

## Overview
Production-ready offline-first attendance recording with TOON-only communication.

## Architecture

### Core Components
- **AttendanceService**: Singleton service managing event recording and sync
- **BreakCalculator**: Break accounting with over-break detection
- **useAttendanceQueue**: React hook for queue state management
- **UI Screens**: CheckinCapture, OfflineQueue

### TOON Token System

#### Event Recording (Mobile → Server)
```
E1=EmployeeID
A1=EventID (UUID)
A2=EventType (IN/OUT/BREAK_START/BREAK_END/OVERTIME_IN/OVERTIME_OUT)
A3=Timestamp (ISO 8601)
D1=DeviceID
L1=Location (lat|lng|accuracy)
F2=FaceEmbedding (quantized, base64)
F3=MatchScore (0.0-1.0)
FP1=FingerprintTemplate (base64)
FP2=FingerprintScore (0.0-1.0)
S2=LivenessScore (0.0-1.0)
S3=QualityScore (0.0-1.0)
B1=BreakType (LUNCH/PERSONAL/SMOKE/OTHER)
C1=ConsentToken
R2=UserReason (string)
SIG1=DeviceSignature (SHA256-HMAC)
```

#### Server Response
```
S1=Status (ok/duplicate/pending/rejected)
R1=RejectionReason (string)
RTO=RetryTimeout (seconds)
B2=BreakDuration (minutes)
B3=IsOverBreak (0/1)
```

## Usage Examples

### Basic Check-In
```typescript
const service = AttendanceService.getInstance();

const eventId = await service.recordCheckin({
  employeeId: 'EMP001',
  eventType: 'IN',
  embedding: faceEmbedding,
  deviceId: 'MOBILE_001',
  matchScore: 0.92,
  livenessScore: 0.88,
  qualityScore: 0.85,
});
```

### Break Management
```typescript
// Start break
await service.startBreak('EMP001', 'LUNCH', 'MOBILE_001');

// End break (auto-calculates duration and over-break)
await service.endBreak('EMP001', 'LUNCH', 'MOBILE_001');
```

### Queue Management
```typescript
const queue = service.getLocalQueue();
await service.reconcilePendingEvents();
await service.retryEvent(eventId);
await service.deleteEvent(eventId);
```

### Event Listeners
```typescript
const listener = (event: QueuedEvent) => {
  console.log(`Event ${event.eventId} status: ${event.status}`);
};

service.addEventListener(listener);
// ... later
service.removeEventListener(listener);
```

## Offline-First Reconciliation

### Algorithm
1. **Enqueue**: Events encrypted and stored locally
2. **Batch Sync**: Every 30s, send up to 10 ready events
3. **Exponential Backoff**: `delay = min(5s * 2^(attempts-1) + jitter, 300s)`
4. **RTO Honor**: Server can override retry delay via `RTO` token
5. **Status Tracking**: Per-event state (queued/sending/sent/duplicate/pending/rejected/failed)

### Security
- Queue encrypted with SecureStore (AES-256-GCM planned)
- Device signatures via SIG1 token (SHA256-HMAC)
- Location requires foreground permissions

## Testing

### Manual Tests
1. **Offline Mode**: Disable network, record events, verify queue growth
2. **Reconnection**: Re-enable network, verify auto-sync
3. **Break Overflow**: Take 70min lunch, verify over-break flagging
4. **Duplicate Detection**: Record same event twice, verify duplicate status

### Mock Mode
Set `MOCK_MODE=true` in AttendanceService for:
- Hardcoded embeddings
- Mock signatures
- Simulated match scores

## Configuration

### Break Policies
Edit `BreakCalculator.DEFAULT_BREAK_POLICIES`:
```typescript
LUNCH: { allowed: 60, grace: 10 },
PERSONAL: { allowed: 15, grace: 5 },
SMOKE: { allowed: 10, grace: 3 },
OTHER: { allowed: 15, grace: 5 },
```

### Reconciliation Tuning
- `MAX_BATCH_SIZE`: Events per sync batch (default: 10)
- `BASE_RETRY_DELAY`: Initial backoff delay (default: 5s)
- `MAX_RETRY_DELAY`: Max backoff cap (default: 300s)
- `MAX_ATTEMPTS`: Give-up threshold (default: 10)

## Production Readiness

### TODO for Production
1. Replace `mockPackEmbedding()` with real `packEmbeddingToToon()` from matcher/embeddingUtils
2. Replace `mockSign()` with SHA256-HMAC using device keystore
3. Implement AES-256-GCM encryption/decryption
4. Add Sentry/crashlytics for error tracking
5. Implement ONNX runtime for face detection
6. Add fingerprint scanner integration
7. Load break policies from server

### Monitoring
- Track `attempts` field for network health
- Monitor `overBreakMinutes` for policy violations
- Alert on high `failed` event counts

## API Reference

See inline JSDoc comments in:
- `src/services/AttendanceService.ts`
- `src/services/BreakCalculator.ts`
- `src/hooks/useAttendanceQueue.ts`
