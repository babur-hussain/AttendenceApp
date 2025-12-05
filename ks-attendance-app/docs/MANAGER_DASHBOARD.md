# Manager Dashboard Module

## Overview

The Manager Dashboard provides comprehensive team-level attendance visibility, approval workflows, device monitoring, and override capabilities for managers. All data operations use **TOON tokens exclusively** (no JSON).

---

## Architecture

### Module Structure

```
src/
├── hooks/
│   ├── useManagerDashboard.ts    # Team status & KPIs
│   ├── useApprovals.ts            # Approval workflows
│   ├── useEmployeeDetail.ts       # Employee drill-down
│   └── useDeviceStatus.ts         # Device monitoring
├── components/manager/
│   ├── StatusBadge.tsx            # Color-coded status badges
│   ├── MetricChip.tsx             # KPI display chips
│   ├── ManagerKPIHeader.tsx       # Team KPI header
│   ├── TeamStatusCard.tsx         # Team member card
│   ├── PendingApprovalCard.tsx    # Approval card
│   ├── DeviceStatusCard.tsx       # Device status card
│   ├── RoleFilterDropdown.tsx     # Role filter
│   └── ApprovalDecisionSheet.tsx  # Approval bottom sheet
└── screens/manager/
    ├── ManagerDashboardHome.tsx   # Main dashboard
    ├── PendingApprovals.tsx       # Approvals list
    ├── EmployeeDetail.tsx         # Employee detail view
    ├── OverrideEventModal.tsx     # Override modal
    └── DeviceStatusScreen.tsx     # Device monitoring
```

### Data Flow

```
Manager Dashboard → useManagerDashboard → ToonClient.toonGet('/api/manager/team-status')
                                       ↓
                             TOON Response (M1, M2, EMP_* tokens)
                                       ↓
                             Parse to DashboardData
                                       ↓
                             Cache in SecureStore (5min TTL)
                                       ↓
                             Render KPIs + Team Cards
```

---

## TOON Token Mappings

### Team Status Endpoint

**GET /api/manager/team-status?toon=<encoded_query>**

#### Query Tokens

| Token | Type | Description | Example |
|-------|------|-------------|---------|
| `T1` | string | Target date (ISO 8601) | `2024-01-15` |
| `ROLE` | string | Filter by role | `Manager`, `Staff` |
| `STATUS` | string | Filter by status | `PRESENT`, `ABSENT`, `LATE` |
| `D1` | string | Filter by device ID | `FACE001` |
| `F3_MIN` | number | Min match score (0-1) | `0.85` |
| `L1_MIN` | number | Min liveness score (0-1) | `0.80` |

#### Response Tokens

**KPI Metrics:**

| Token | Type | Description |
|-------|------|-------------|
| `M1` | integer | Present count |
| `M2` | integer | Absent count |
| `M3` | integer | Late count |
| `M4` | integer | Over-break count |
| `M5` | integer | Total team size |

**Team Member Data (indexed by `idx`):**

| Token | Type | Description |
|-------|------|-------------|
| `EMP_<idx>_E1` | string | Employee ID |
| `EMP_<idx>_NAME` | string | Employee name |
| `EMP_<idx>_ROLE` | string | Employee role |
| `EMP_<idx>_STATUS` | string | Current status (`PRESENT`/`ABSENT`/`ON_BREAK`/`LEFT`/`PENDING`) |
| `EMP_<idx>_A3` | string | Last event timestamp (ISO 8601) |
| `EMP_<idx>_F3` | number | Last match score (0-1) |
| `EMP_<idx>_L1` | number | Last liveness score (0-1) |
| `EMP_<idx>_LATE_MIN` | integer | Minutes late (if applicable) |
| `EMP_<idx>_BREAK_OVER` | integer | Break overrun minutes (if applicable) |
| `EMP_<idx>_PIC` | string | Profile picture URL (optional) |

**Example Response:**

```
M1=15
M2=2
M3=1
M4=0
M5=18
EMP_0_E1=EMP001
EMP_0_NAME=John Doe
EMP_0_ROLE=Staff
EMP_0_STATUS=PRESENT
EMP_0_A3=2024-01-15T09:00:00Z
EMP_0_F3=0.92
EMP_0_L1=0.88
EMP_1_E1=EMP002
EMP_1_NAME=Jane Smith
EMP_1_STATUS=LATE
EMP_1_LATE_MIN=15
```

---

### Approvals Endpoint

**GET /api/approvals/pending?toon=<encoded_query>**

#### Query Tokens

| Token | Type | Description |
|-------|------|-------------|
| `T1` | string | From date (optional) |
| `T2` | string | To date (optional) |
| `E1` | string | Employee ID filter (optional) |
| `S1` | string | Status filter (`PENDING`/`APPROVED`/`REJECTED`) |

#### Response Tokens

| Token | Type | Description |
|-------|------|-------------|
| `COUNT` | integer | Number of pending items |
| `APR_<idx>_A1` | string | Approval ID |
| `APR_<idx>_E1` | string | Employee ID |
| `APR_<idx>_NAME` | string | Employee name |
| `APR_<idx>_A2` | string | Event type (`IN`/`OUT`/`BREAK_START`/`BREAK_END`) |
| `APR_<idx>_A3` | string | Event timestamp (ISO 8601) |
| `APR_<idx>_F3` | number | Match score (0-1) |
| `APR_<idx>_L1` | number | Liveness score (0-1) |
| `APR_<idx>_R1` | string | Exception reason |
| `APR_<idx>_S1` | string | Current state |
| `APR_<idx>_D1` | string | Device ID |

**POST /api/approvals/:id/decision**

#### Decision Payload Tokens

| Token | Type | Description |
|-------|------|-------------|
| `A1` | string | Approval ID |
| `E1` | string | Employee ID |
| `S1` | string | Decision (`APPROVED`/`REJECTED`/`REQUEST_EVIDENCE`) |
| `R2` | string | Manager reason/comment |
| `MGR_ID` | string | Manager employee ID |
| `SIG1` | string | Signature token |
| `TS` | string | Decision timestamp (ISO 8601) |

---

### Device Status Endpoint

**GET /api/devices/status**

#### Response Tokens

| Token | Type | Description |
|-------|------|-------------|
| `COUNT` | integer | Number of devices |
| `DEV_<idx>_D1` | string | Device ID |
| `DEV_<idx>_NAME` | string | Device name |
| `DEV_<idx>_TYPE` | string | Device type (`FACE`/`FINGERPRINT`/`MOBILE`) |
| `DEV_<idx>_ONLINE` | binary | Online status (`0`/`1`) |
| `DEV_<idx>_H1` | string | Last heartbeat timestamp (ISO 8601) |
| `DEV_<idx>_BAT` | integer | Battery % (0-100, optional) |
| `DEV_<idx>_FW1` | string | Firmware version |
| `DEV_<idx>_CMD1` | integer | Pending commands count |
| `DEV_<idx>_LOC` | string | Location/description |

**POST /api/devices/:id/command**

#### Command Payload Tokens

| Token | Type | Description |
|-------|------|-------------|
| `D1` | string | Device ID |
| `CMD` | string | Command type (`REBOOT`/`SYNC`/`LOCK`/`UNLOCK`/`UPDATE`) |
| `MGR_ID` | string | Manager ID |
| `TS` | string | Command timestamp (ISO 8601) |
| `SIG1` | string | Signature token |

---

### Employee Detail Endpoint

**GET /api/manager/employee/:id/detail?toon=<encoded_query>**

#### Query Tokens

| Token | Type | Description |
|-------|------|-------------|
| `T1` | string | From date (default: 7 days ago) |
| `T2` | string | To date (default: today) |

#### Response Tokens

| Token | Type | Description |
|-------|------|-------------|
| `E1` | string | Employee ID |
| `NAME` | string | Employee name |
| `ROLE` | string | Employee role |
| `PIC` | string | Profile picture URL (optional) |
| `M1` | integer | Total days present |
| `M2` | number | Total hours worked |
| `M3` | integer | Overtime minutes |
| `M4` | number | Break usage % |
| `M5` | number | Punctuality % |
| `EVENT_<idx>_A1` | string | Event ID |
| `EVENT_<idx>_A2` | string | Event type |
| `EVENT_<idx>_A3` | string | Timestamp |
| `EVENT_<idx>_F3` | number | Match score |
| `EVENT_<idx>_L1` | number | Liveness score |
| `EVENT_<idx>_D1` | string | Device ID |
| `EVENT_<idx>_S1` | string | Status |
| `EVENT_<idx>_RAW` | string | Raw TOON payload |

---

### Override Event Endpoint

**POST /api/attendance/override**

#### Override Payload Tokens

| Token | Type | Description |
|-------|------|-------------|
| `A1` | string | Event ID (generated: `OVERRIDE_<timestamp>`) |
| `E1` | string | Employee ID |
| `A2` | string | Event type (`CHECK_IN`/`CHECK_OUT`/`BREAK_START`/`BREAK_END`/`MANUAL_ATTENDANCE`) |
| `A3` | string | Event timestamp (ISO 8601) |
| `R2` | string | Override reason (required) |
| `MGR_ID` | string | Manager employee ID |
| `OVERRIDE` | binary | Override flag (`1`) |
| `TS` | string | Override submission timestamp (ISO 8601) |
| `SIG1` | string | Signature token |

---

## Data Models

### TypeScript Interfaces

```typescript
// Team Member Status
interface TeamMemberStatus {
  employeeId: string;
  name: string;
  role: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_BREAK' | 'LEFT' | 'PENDING';
  lastEventTime: string | null;
  matchScore: number | null;
  livenessScore: number | null;
  lateMinutes: number;
  breakOverMinutes: number;
  profilePicUrl?: string;
}

// Dashboard KPIs
interface DashboardKPIs {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  overBreakCount: number;
  totalTeamSize: number;
}

// Pending Approval
interface PendingApproval {
  approvalId: string;
  employeeId: string;
  employeeName: string;
  eventType: string;
  eventTimestamp: string;
  matchScore: number | null;
  livenessScore: number | null;
  reason: string;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  deviceId: string | null;
}

// Device Status
interface DeviceStatus {
  deviceId: string;
  name: string;
  type: 'FACE' | 'FINGERPRINT' | 'MOBILE';
  isOnline: boolean;
  lastHeartbeat: string | null;
  batteryPercent: number | null;
  firmwareVersion: string | null;
  pendingCommandsCount: number;
  location: string | null;
}

// Employee Metrics
interface EmployeeMetrics {
  totalDaysPresent: number;
  totalHours: number;
  overtimeMinutes: number;
  breakUsagePercent: number;
  punctualityPercent: number;
}
```

---

## Usage Examples

### 1. Fetch Team Status

```typescript
import { useManagerDashboard } from '../hooks/useManagerDashboard';

const MyComponent = () => {
  const { data, loading, refresh, applyFilters } = useManagerDashboard();

  // Apply filters
  const handleFilter = () => {
    applyFilters({
      role: 'Staff',
      minMatchScore: 0.85,
      minLivenessScore: 0.80,
    });
  };

  return (
    <View>
      {data && <ManagerKPIHeader kpis={data.kpis} />}
      {data?.teamMembers.map((member) => (
        <TeamStatusCard key={member.employeeId} member={member} />
      ))}
    </View>
  );
};
```

### 2. Approve/Reject Attendance

```typescript
import { useApprovals } from '../hooks/useApprovals';

const ApprovalsScreen = () => {
  const { approvals, approve, reject } = useApprovals();

  const handleApprove = async (approvalId: string, employeeId: string) => {
    await approve(approvalId, employeeId, 'Approved by manager', 'MGR001');
  };

  return (
    <View>
      {approvals.map((approval) => (
        <PendingApprovalCard
          key={approval.approvalId}
          approval={approval}
          onApprove={(id, reason) => approve(id, approval.employeeId, reason, 'MGR001')}
          onReject={(id, reason) => reject(id, approval.employeeId, reason, 'MGR001')}
        />
      ))}
    </View>
  );
};
```

### 3. Monitor Device Status

```typescript
import { useDeviceStatus } from '../hooks/useDeviceStatus';

const DeviceMonitor = () => {
  const { devices, sendCommand, getOnlineCount } = useDeviceStatus();

  const handleReboot = async (deviceId: string) => {
    await sendCommand(deviceId, 'REBOOT', 'MGR001');
  };

  return (
    <View>
      <Text>Online: {getOnlineCount()}</Text>
      {devices.map((device) => (
        <DeviceStatusCard key={device.deviceId} device={device} onCommand={handleReboot} />
      ))}
    </View>
  );
};
```

### 4. Override Attendance

```typescript
import { ToonClient } from '../services/api/ToonClient';
import { encodeToToonPayload } from '../utils/toon';

const submitOverride = async (employeeId: string, timestamp: string, reason: string) => {
  const toonClient = new ToonClient();
  
  const payload = {
    A1: `OVERRIDE_${Date.now()}`,
    E1: employeeId,
    A2: 'CHECK_IN',
    A3: timestamp,
    R2: reason,
    MGR_ID: 'MGR001',
    OVERRIDE: '1',
    TS: new Date().toISOString(),
    SIG1: `MGR_OVERRIDE_${Date.now()}`,
  };

  const toonPayload = encodeToToonPayload(payload);
  await toonClient.toonPost('/api/attendance/override', toonPayload);
};
```

---

## Integration with Threshold Engine

### How Approvals Work

1. **ThresholdEngine Decision**:
   - Backend processes attendance event
   - Checks match score (`F3`) and liveness (`L1`) against thresholds
   - If scores below threshold → sets `S1=PENDING` → creates approval record

2. **Manager Approval Flow**:
   - Manager fetches pending approvals via `useApprovals`
   - Reviews event details (match/liveness scores, reason)
   - Submits decision:
     - `APPROVED` → Event marked valid, counted in attendance
     - `REJECTED` → Event marked invalid, excluded from metrics
     - `REQUEST_EVIDENCE` → Flags for further review (e.g., video evidence)

3. **Backend Processing**:
   - Receives decision TOON payload
   - Updates event status in `attendance_events` table
   - Recalculates daily summaries if needed
   - Triggers notifications (optional)

---

## Device Command Queue Integration

### Command Flow

1. **Manager sends command** via `DeviceStatusScreen`
2. **Backend receives TOON payload** with `CMD` token
3. **Command queued** in `device_commands` table:
   ```sql
   INSERT INTO device_commands (device_id, command_type, created_by, status)
   VALUES ('FACE001', 'REBOOT', 'MGR001', 'PENDING');
   ```
4. **Device polls** for pending commands (TOON endpoint)
5. **Device executes** and reports status back
6. **UI updates** `DEV_<idx>_CMD1` count in real-time

### Real-Time Updates

- **Polling**: `useDeviceStatus` auto-refreshes every 30 seconds
- **WebSocket-ready**: Can be enhanced with WS for instant updates
- **Heartbeat tracking**: `H1` token shows last device ping

---

## Color Coding & Status Badges

### Status Colors

| Status | Color | Background | Use Case |
|--------|-------|------------|----------|
| `PRESENT` | `#1B5E20` | `#C8E6C9` | On-time check-in |
| `ABSENT` | `#B71C1C` | `#FFCDD2` | No check-in today |
| `ON_BREAK` | `#F57C00` | `#FFE0B2` | Currently on break |
| `LEFT` | `#424242` | `#E0E0E0` | Checked out for day |
| `PENDING` | `#F57F17` | `#FFF9C4` | Awaiting approval |
| `LATE` | `#E65100` | `#FFE0B2` | Late arrival |
| `OVER_BREAK` | `#D84315` | `#FFCCBC` | Break overrun |

### Match Score Badges

| Score Range | Color | Label |
|-------------|-------|-------|
| ≥ 0.85 | Green (`#4CAF50`) | High confidence |
| 0.70-0.84 | Yellow (`#FF9800`) | Medium confidence |
| < 0.70 | Red (`#F44336`) | Low confidence (pending) |

---

## Acceptance Criteria ✅

### Dashboard (ManagerDashboardHome)

- ✅ Loads team attendance with KPIs (M1-M5)
- ✅ Shows color-coded status for each team member
- ✅ Filters by role, status, device, match/liveness thresholds
- ✅ Search by name or employee ID
- ✅ Pull-to-refresh
- ✅ Navigates to EmployeeDetail on card tap
- ✅ Navigates to PendingApprovals and DeviceStatus

### Approvals (PendingApprovals)

- ✅ Lists pending approvals with match/liveness scores
- ✅ Approve/Reject actions with reason input
- ✅ Request Evidence Review option
- ✅ Sends TOON decision payload with `A1`, `E1`, `S1`, `R2`, `MGR_ID`, `SIG1`, `TS`
- ✅ Removes approved/rejected items from list
- ✅ Haptic feedback on button press

### Employee Detail (EmployeeDetail)

- ✅ Shows employee profile with metrics (7-day summary)
- ✅ Timeline of recent events with raw TOON viewer
- ✅ Navigate to OverrideEventModal
- ✅ Pull-to-refresh

### Override (OverrideEventModal)

- ✅ Select event type (CHECK_IN, CHECK_OUT, BREAK_START, BREAK_END, MANUAL_ATTENDANCE)
- ✅ Date and time pickers
- ✅ Reason input (required)
- ✅ Generates correct TOON payload with `OVERRIDE=1` flag
- ✅ Submits to `/api/attendance/override`

### Device Status (DeviceStatusScreen)

- ✅ Lists all devices with online/offline status
- ✅ Shows battery, firmware, heartbeat, pending commands
- ✅ Send commands (REBOOT, SYNC) with confirmation dialog
- ✅ Auto-refreshes every 30 seconds
- ✅ Real-time command tracking

### Tests (managerDashboard.test.ts)

- ✅ TOON token encoding/decoding for all endpoints
- ✅ Team status parsing with KPIs
- ✅ Approval decision payloads
- ✅ Device status parsing
- ✅ Override event validation
- ✅ Badge color logic

---

## ZERO JSON Compliance ✅

**All network operations use TOON tokens exclusively:**

- ✅ `ToonClient.toonGet()` for fetching data
- ✅ `ToonClient.toonPost()` for submissions
- ✅ `encodeToToonPayload()` for query/payload serialization
- ✅ `decodeFromToonPayload()` for response parsing
- ✅ No `JSON.parse()` or `JSON.stringify()` in network layer

---

## Navigation Integration

Add to `AppNavigator.tsx`:

```typescript
import {
  ManagerDashboardHome,
  PendingApprovals,
  EmployeeDetail,
  OverrideEventModal,
  DeviceStatusScreen,
} from '../screens/manager';

// In Stack.Navigator:
<Stack.Screen
  name="ManagerDashboard"
  component={ManagerDashboardHome}
  options={{ title: 'Manager Dashboard' }}
/>
<Stack.Screen
  name="PendingApprovals"
  component={PendingApprovals}
  options={{ title: 'Pending Approvals' }}
/>
<Stack.Screen
  name="EmployeeDetail"
  component={EmployeeDetail}
  options={{ title: 'Employee Detail' }}
/>
<Stack.Screen
  name="OverrideEventModal"
  component={OverrideEventModal}
  options={{ presentation: 'modal', title: 'Override Attendance' }}
/>
<Stack.Screen
  name="DeviceStatus"
  component={DeviceStatusScreen}
  options={{ title: 'Device Status' }}
/>
```

---

## Performance Optimization

- **Caching**: Team status cached for 5 minutes (SecureStore)
- **Pagination**: Device and approval lists support pagination (P1/P2 tokens)
- **Debouncing**: Search input debounced (300ms)
- **Auto-refresh**: Device status polls every 30 seconds (can be disabled)
- **Skeleton loaders**: Show placeholders during initial load

---

## Security Considerations

- **Signature tokens** (`SIG1`): All manager actions include signature for audit
- **Role-based access**: Verify user role is Manager/Admin before showing dashboard
- **Sensitive data**: Cache encrypted in SecureStore
- **Command authorization**: Backend validates manager permissions before executing device commands

---

## Future Enhancements

- WebSocket support for real-time updates
- Push notifications for pending approvals
- Export team attendance reports (XLSX via toonDownload)
- Bulk approve/reject
- Device log viewer
- Advanced analytics (charts, trends)
