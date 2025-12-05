# Mobile Check-in Workflow Implementation

## Overview
Complete end-to-end mobile check-in/check-out workflow using biometric capture, TOON protocol encoding, local persistence, and server synchronization.

## Architecture

### Service Layer
1. **CheckinFlowCoordinator** (`src/services/CheckinFlowCoordinator.ts`)
   - Main orchestrator for the entire workflow
   - Flow: Capture → Process → Match → Build TOON → Persist → Sync
   - Methods:
     - `startCheckin(eventType, employeeId)` - Main entry point
     - `captureBiometrics()` - Interface with BiometricManager
     - `matchBiometrics()` - Policy-based matching (face/fingerprint)
     - `buildToonEvent()` - Construct AttendanceToonEvent with all tokens
     - `syncEvent()` - Send to server with retry logic
     - `reconcilePendingEvents()` - Background sync every 5 minutes
     - `subscribe(listener)` - Event listener registration

2. **LocalEventQueue** (`src/services/LocalEventQueue.ts`)
   - Encrypted local storage for offline TOON events
   - Methods:
     - `enqueue(event)` - Add event to queue
     - `markSent(eventId)` - Mark as successfully sent
     - `markFailed(eventId, error)` - Mark as failed with error
     - `getEventsReadyForRetry()` - Exponential backoff logic
     - `getStats()` - Queue statistics (queued, failed, sent, total)
     - `getAllEvents()` - All events for UI display
     - `deleteEvent(eventId)` - Remove event

3. **BiometricManager** (`src/services/biometric/BiometricManager.ts`)
   - Abstraction layer for biometric capture
   - Supports face recognition and fingerprint
   - Interfaces with mobile device sensors or external hardware

4. **FacePipeline** (`src/services/biometric/FacePipeline.ts`)
   - Face processing pipeline: Liveness → Quality → Embedding
   - Liveness detection (blink, turn head)
   - Quality scoring (blur, lighting, alignment)
   - Face embedding generation

### UI Layer

1. **HomeScreen** (`src/screens/HomeScreen.tsx`)
   - Main hub with navigation buttons
   - Quick actions: Check-in, Check-out
   - Queue status badge (shows pending/failed count)
   - Auto-refreshes queue stats every 10 seconds

2. **CheckinScreen** (`src/screens/CheckinScreen.tsx`)
   - Camera preview with face outline
   - Liveness prompts (blink, turn head)
   - Action buttons: Check In, Check Out, Start Break, End Break
   - Real-time status updates during processing
   - Match score visualization
   - Progress indicator through flow states

3. **CheckinResultScreen** (`src/screens/CheckinResultScreen.tsx`)
   - Status display: Accepted, Queued, Pending, Rejected
   - Event details: eventId, status, timestamp
   - Reason for rejection (if applicable)
   - Actions: Done (return home), View Queue (if queued)

4. **OfflineQueueScreen** (`src/screens/OfflineQueueScreen.tsx`)
   - List all queued/failed events
   - Statistics header: Queued, Failed, Sent, Total
   - Per-event actions: Resend, Delete
   - Pull-to-refresh
   - Shows attempt count and error messages

## TOON Protocol Integration

### AttendanceToonEvent Structure
```
E1:<envelope_version>|
A1:<event_id>|
A2:<event_type>|       # IN, OUT, BREAK_START, BREAK_END
A3:<timestamp>|
L1:<latitude>,<longitude>|
D1:<device_id>|
F2:<face_embedding>|
F3:<face_match_score>|
F4:<liveness_score>|
F5:<face_quality>|
FP1:<fingerprint_template>|
FP2:<fingerprint_match_score>|
S1:<signature>|
R1:<reason>|           # Optional rejection reason
SIG1:<hmac_signature>
```

### Policy-Based Matching
```typescript
interface PolicyConfig {
  face_match_threshold: number;       // 0.85 default
  fingerprint_match_threshold: number; // 0.90 default
  liveness_threshold: number;         // 0.75 default
  quality_threshold: number;          // 0.70 default
  require_both_modalities: boolean;   // false default
  allow_offline_queue: boolean;       // true default
}
```

## Flow States

### CheckinFlowState
1. **idle** - Ready for new check-in
2. **capturing** - Capturing biometric data
3. **processing** - Processing captured data
4. **awaiting_match** - Matching against enrolled data
5. **confirm** - Match confirmed, preparing to send
6. **sending** - Sending to server
7. **sent** - Successfully sent
8. **queued** - Saved offline for later sync
9. **error** - Error occurred

### EventStatus
- **ACCEPTED** - Server accepted the event
- **PENDING** - Awaiting manual review (low match score)
- **REJECTED** - Server rejected the event
- **QUEUED** - Saved locally, awaiting sync
- **SENT** - Successfully sent to server
- **FAILED** - Failed to send after retries

## Network Handling

### Online Mode
1. Capture biometrics
2. Process and match
3. Build TOON event
4. Send to server immediately
5. Show result screen

### Offline Mode
1. Capture biometrics
2. Process and match
3. Build TOON event
4. Enqueue locally
5. Show "Queued" result
6. Background sync when network returns

### Retry Logic
- Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s, 60s (max)
- Max 5 retry attempts
- Failed events shown in queue with error message
- Manual resend option

## Server Integration

### Endpoint
`POST /api/devices/events`

### Request
- Content-Type: `text/plain`
- Body: TOON-encoded batch payload

### Response
```
E1:v1|
A1:<event_id>|
S1:accepted|
TS:<timestamp>
```

### Error Response
```
ERR1:<error_code>|
ERR2:<error_message>|
A1:<event_id>
```

## Event Listeners

### Subscribe Pattern
```typescript
const unsubscribe = CheckinFlowCoordinator.subscribe((event) => {
  if (event.type === 'result') {
    // Handle server result
  } else if (event.type === 'queued') {
    // Handle offline queue
  } else if (event.type === 'error') {
    // Handle error
  }
});
```

### Event Types
- **result** - Server response received
- **queued** - Event saved offline
- **error** - Error occurred
- **stateChange** - Flow state changed

## Testing Checklist

- [ ] Check-in with face recognition
- [ ] Check-in with fingerprint
- [ ] Check-in with both modalities
- [ ] Check-out flow
- [ ] Break start/end
- [ ] Offline queueing
- [ ] Background sync when network returns
- [ ] Manual resend from queue
- [ ] Delete from queue
- [ ] Low match score (pending)
- [ ] Rejected event
- [ ] Duplicate detection
- [ ] Policy threshold enforcement
- [ ] Liveness detection
- [ ] Quality checks

## Dependencies

### Mobile
- `expo-location` - GPS coordinates
- `@react-native-community/netinfo` - Network status
- `uuid` - Event ID generation
- `react-navigation` - Screen navigation

### Server
- Express with TOON middleware
- SQLite/Turso database
- Event hooks system
- Rate limiting

## Future Enhancements

1. **PIN Fallback** - Alternative auth method when biometrics fail
2. **Bulk Sync** - Batch multiple queued events
3. **Conflict Resolution** - Handle duplicate timestamps
4. **Geofencing** - Enforce location-based check-in
5. **NFC Support** - Badge tap for additional verification
6. **Photo Capture** - Store face image for audit
7. **Voice Commands** - Hands-free operation
8. **Bluetooth Beacons** - Auto check-in when near terminal
