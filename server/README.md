# KS Attendance Server - TOON Protocol

## Overview
Complete server-side implementation for the KS Attendance System using **TOON (Token-Oriented Object Notation)** exclusively. **NO JSON** parsing or responses anywhere.

## Architecture

### Core Components
- **ToonCodec** - Encoding/decoding TOON payloads
- **ToonValidator** - Schema validation with TOON error tokens
- **DatabaseManager** - Supabase/PostgreSQL pool with migration runner
- **EventHooksManager** - Internal event subscription system
- **Rate Limiting** - Replay attack prevention with TOON backoff tokens

### Database Schema
All tables include `raw_toon` column for full auditability:
- `attendance_events` - Event storage with TOON tokens (E1, A1-A3, L1, D1, F3, FP2, S1-S3, etc.)
- `devices` - Device registry (D1-D4 tokens)
- `reports` - Generated report metadata
- `audit_logs` - Full request/response TOON audit trail
- `rate_limits` - Rate limiting state

## API Endpoints

### Device Management

#### POST `/api/devices/events`
**Ingest TOON Attendance Events**

**Request:** Raw TOON payload (text or binary)
```
E1:EMP001|A1:EVT_123|A2:IN|A3:2025-12-02T08:00:00Z|D1:DEVICE_001|L1:lat=40.7128,lng=-74.0060|F3:0.95|C1:consent_token_xyz||E1:EMP002|A1:EVT_124|A2:OUT|A3:2025-12-02T17:00:00Z|D1:DEVICE_001|FP2:0.98|C1:consent_token_abc
```

**Response:** TOON batch status
```
A1:EVT_123|S1:accepted||A1:EVT_124|S1:accepted
```

**Duplicate Detection:**
```
A1:EVT_123|S1:duplicate
```

**Validation Errors:**
```
A1:unknown|S1:rejected|R1:ERR1:missing_token:E1|ERR2:missing_token:A1
```

**Features:**
- Batch event ingestion (events separated by `||`)
- Schema validation with TOON error tokens
- Duplicate event detection
- Device last_seen_at tracking
- Full audit logging
- Event hooks emission (`onEventIngested`, `onDuplicateEvent`, `onInvalidEvent`)
- Rate limiting (100 requests/min per device)

---

#### POST `/api/devices/register`
**Register or Update Device**

**Request TOON:**
```
D1:DEVICE_RPI_001|D2:RPI|D3:MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...|D4:FACE,LIVENESS
```

**Response TOON (new device):**
```
S1:registered|D1:DEVICE_RPI_001|D2:RPI|D4:FACE,LIVENESS|REG:2025-12-02T10:00:00Z
```

**Response TOON (existing device):**
```
S1:updated|D1:DEVICE_RPI_001|D2:RPI|D4:FACE,FINGERPRINT,LIVENESS|REG:2025-12-01T14:00:00Z|LAST:2025-12-02T10:00:00Z
```

**Device Types:** `MOBILE`, `KIOSK`, `RPI`, `FINGERPRINT_TERMINAL`

---

#### GET `/api/devices/events`
**Paginated Event Listing**

**Query:** `?q=<toon-encoded-filters>`

Example: `?q=E1:EMP001|T1:2025-12-01T00:00:00Z|T2:2025-12-02T23:59:59Z|P1:0|P2:50`

**Response:** TOON event batch with pagination header
```
X-TOON-PAGINATION: P1:50|P2:50|COUNT:50

E1:EMP001|A1:EVT_001|A2:IN|A3:2025-12-01T08:00:00Z|...||E1:EMP001|A1:EVT_002|A2:OUT|A3:2025-12-01T17:00:00Z|...
```

**Filter Tokens:**
- `E1` - Employee ID
- `D1` - Device ID
- `T1` - From timestamp
- `T2` - To timestamp
- `P1` - Offset (cursor)
- `P2` - Limit (default 50)

---

### Reports

#### POST `/api/reports/attendance`
**Generate Excel Report**

**Request TOON:**
```
R1:RPT_2025_Q4|E1:EMP001|T1:2025-10-01T00:00:00Z|T2:2025-12-31T23:59:59Z|F1:eventType=IN,deviceId=DEVICE_001|O1:XLSX
```

**Response:** Binary XLSX file + TOON header
```
X-TOON-RESP: S1:ok|R1:RPT_2025_Q4|COUNT:523|SIZE:45670

Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="RPT_2025_Q4.xlsx"

<binary xlsx data>
```

**Excel Sheets:**
1. **Raw Events** - All attendance events with TOON token headers (E1, A1-A3, L1, D1, F3, FP2, S1-S3, B1-B3)
2. **Daily Summary** - Check-ins, check-outs, breaks per day
3. **Employee Summary** - Total check-ins, break minutes, late count per employee
4. **Breaks Report** - Break type, duration, over-break status
5. **Exceptions** - Rejected events, over-breaks, late arrivals
6. **TOON Meta** (hidden) - Original request TOON tokens for auditability

**Request Tokens:**
- `R1` - Report ID (generated if not provided)
- `E1` - Employee ID filter (optional)
- `T1` - From timestamp (required)
- `T2` - To timestamp (required)
- `F1` - Additional filters (TOON-encoded: `eventType=IN,deviceId=DEVICE_001`)
- `O1` - Output format (`XLSX` or `CSV`, default `XLSX`)

---

#### GET `/api/reports/summary`
**Quick Analytics Summary**

**Query:** `?q=<toon-encoded-filters>` (empty = last 30 days)

Example: `?q=E1:EMP001|T1:2025-12-01T00:00:00Z|T2:2025-12-02T23:59:59Z`

**Response TOON:**
```
S1:ok|M1:25|M2:94|M3:45|M4:3|M5:RPT_2025_Q4
```

**Analytics Tokens:**
- `M1` - Total employees
- `M2` - Average punctuality percentage
- `M3` - Total over-break minutes
- `M4` - Total late check-in count
- `M5` - Most recent report ID

---

#### GET `/api/reports/:reportId/download`
**Download Previously Generated Report**

**Example:** `/api/reports/RPT_2025_Q4/download`

**Response:** Binary XLSX file

---

## Rate Limiting

**Configuration:**
- `/api/devices/events` - 100 requests/min per device
- `/api/devices/register` - 10 requests/hour per device
- `/api/reports/attendance` - 5 requests/5min

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2025-12-02T10:05:00Z
```

**Rate Limit Exceeded Response:**
```
HTTP 429 Too Many Requests
Retry-After: 30
Content-Type: text/plain

ERR1:rate_limit_exceeded|RETRY:30|LIMIT:100|WINDOW:60
```

---

## Event Hooks

Internal server events for reporting pipelines:
- `onEventIngested` - Fired when event successfully stored
- `onDeviceRegistered` - Fired on device registration/update
- `onReportGenerated` - Fired when Excel report completes
- `onDuplicateEvent` - Fired on duplicate event_id detection
- `onInvalidEvent` - Fired on validation failure

**Example Usage:**
```typescript
import { EventHooksManager } from './utils/EventHooks';

const hooks = EventHooksManager.getInstance();

hooks.register('onEventIngested', async (data) => {
  console.log('Event ingested:', data.event.A1);
  // Trigger analytics update, push notification, etc.
});
```

---

## Installation

```bash
cd server
npm install
```

---

## Development

```bash
npm run dev
```

---

## Production Build

```bash
npm run build
npm start
```

---

## Environment Variables

```env
PORT=3000
SUPABASE_DB_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=public-anon-key
SUPABASE_SERVICE_ROLE_KEY=service-role-key
SUPABASE_RESET_REDIRECT_URL=https://your-frontend/reset
REPORTS_DIR=./reports
DB_POOL_MAX=10
DB_POOL_IDLE=30000
DB_POOL_CONNECT_TIMEOUT=5000
```

- `SUPABASE_DB_URL` (or `DATABASE_URL`) is required. The server auto-enables SSL for Supabase-style hosts.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are required for Supabase Auth (password login + admin provisioning).
- `SUPABASE_RESET_REDIRECT_URL` is optional; when set the `/api/auth/forgot` route asks Supabase to use this redirect in recovery emails.
- Optional pool knobs let you tune concurrency; defaults match the example above.

---

## Database Initialization

Database schema migrations are applied automatically on startup (idempotent `schema_migrations` table). The Supabase/PostgreSQL schema creates:
- `companies`, `users` (SaaS tenancy + auth metadata)
- `employees`, `face_embeddings`
- `devices`, `device_heartbeats`, `device_commands`, `device_logs`, `device_firmware_status`, `device_nonces`
- `firmware_releases` and OTA support tables
- `attendance_events` (indexed on employee/device/timestamp)
- `reports`
- `audit_logs`
- `rate_limits`

---

## TOON Protocol Compliance

✅ **NO JSON** anywhere in codebase
✅ All requests decoded with `ToonCodec.decode()`
✅ All responses encoded with `ToonCodec.encode()`
✅ Custom body parser for TOON payloads (text/binary)
✅ TOON error tokens for validation failures
✅ TOON headers for metadata (`X-TOON-RESP`, `X-TOON-PAGINATION`)
✅ Database `raw_toon` columns for full audit trail
✅ Excel reports include `toon_meta` sheet with original request tokens

---

## Testing

### Ingest Events
```bash
curl -X POST http://localhost:3000/api/devices/events \
  -H "Content-Type: text/plain" \
  -d "E1:EMP001|A1:EVT_001|A2:IN|A3:2025-12-02T08:00:00Z|D1:DEVICE_001|L1:lat=40.7128,lng=-74.0060|F3:0.95|C1:consent_xyz"
```

### Register Device
```bash
curl -X POST http://localhost:3000/api/devices/register \
  -H "Content-Type: text/plain" \
  -d "D1:DEVICE_001|D2:MOBILE|D3:public_key_base64|D4:FACE,LIVENESS"
```

### Get Summary
```bash
curl "http://localhost:3000/api/reports/summary?q=T1:2025-12-01T00:00:00Z|T2:2025-12-02T23:59:59Z"
```

### Generate Report
```bash
curl -X POST http://localhost:3000/api/reports/attendance \
  -H "Content-Type: text/plain" \
  -d "R1:TEST_REPORT|T1:2025-12-01T00:00:00Z|T2:2025-12-02T23:59:59Z|O1:XLSX" \
  --output report.xlsx
```

---

## Security Features

- Rate limiting with exponential backoff tokens
- Device public key storage for signature verification
- Audit logging of all requests/responses with TOON payloads
- Request replay detection via event_id uniqueness
- CORS configuration for web clients
- Graceful shutdown handlers

---

## Performance Considerations

- Tuned Postgres connection pool (configurable via env)
- Indexed queries on employee_id, event_id, timestamp
- Pagination support for large datasets
- Background rate limit cleanup
- Streaming Excel generation for large reports

---

## Monitoring

Health check endpoint:
```bash
curl http://localhost:3000/health
```

Response:
```
S1:ok|SYS:healthy|TS:2025-12-02T10:00:00Z
```

---

## License

MIT
