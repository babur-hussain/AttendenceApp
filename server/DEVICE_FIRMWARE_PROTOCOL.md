# Device Firmware & Protocol Specification (TOON-Native)

**Version:** 1.0.0  
**Date:** December 2, 2025  
**Protocol:** 100% TOON (NO JSON)

---

## 1. Overview & Goals

### Primary Objectives
- **Secure Device Management**: Registration, heartbeat, OTA firmware updates, commands, logs, and health monitoring
- **Offline Support**: Queue and resume operations for intermittent network connectivity
- **Authenticity**: Device key pairs (Ed25519/ECDSA) and server-signed firmware bundles
- **Protection**: Replay protection, rate limiting, and full auditability (raw_toon preserved)
- **Hardware Agnostic**: Works for Raspberry Pi, Android kiosks, ESP32, and any embedded device

### Architecture Principles
1. **Zero Trust**: Every request must be signed and verified
2. **Immutability**: All device interactions logged with raw_toon
3. **Resilience**: Automatic rollback on firmware failure
4. **Throttling**: Server-controlled backoff policies
5. **Auditability**: Append-only logs with signature verification status

---

## 2. Cryptography & Signing

### Device Key Pair
- **Algorithm**: Ed25519 (recommended) or ECDSA P-256
- **Generation**: At first boot, device generates keypair
- **Storage**: Private key in secure element/keystore (TPM, Android Keystore, etc.)
- **Public Key**: Uploaded during registration as token `PK1`

### Server Key Pair
- **Purpose**: Sign firmware bundles and critical server commands
- **Storage**: HSM or secure vault (AWS KMS, Azure Key Vault)
- **Distribution**: Server public key embedded in device firmware or fetched via PKI chain

### Signature Format
```
Canonical TOON → UTF-8 bytes → Ed25519 signature → Base64 → SIG1 token
```

### Canonicalization Rules
1. Sort tokens alphabetically by key (e.g., D1, HB1, HB2, NONCE, TS)
2. Concatenate as: `key1:value1|key2:value2|key3:value3`
3. Encode to UTF-8 bytes
4. Sign with Ed25519
5. Base64-encode signature → SIG1

**Example:**
```
Input tokens: {D1: "dev_123", HB1: "hb_456", TS: "2025-12-02T10:00:00Z", NONCE: "n_789"}
Canonical: "D1:dev_123|HB1:hb_456|NONCE:n_789|TS:2025-12-02T10:00:00Z"
UTF-8 bytes: [0x44, 0x31, 0x3A, ...]
Signature: Ed25519(privateKey, bytes)
SIG1: base64(signature)
```

---

## 3. TOON Token Dictionary

### Device Identity Tokens
- `D1` = deviceId (uuid)
- `D2` = deviceType (MOBILE_KIOSK | RPI_TERMINAL | ESP32_READER | FINGERPRINT_TERMINAL)
- `D3` = devicePublicKey (PEM or base64-encoded)
- `D4` = deviceManufacturer
- `D5` = deviceModel

### Firmware Tokens
- `FW1` = firmwareId (uuid)
- `FW2` = firmwareVersion (semver, e.g., "1.2.3")
- `FW3` = firmwareBundleUrl (signed short-lived tokenized URL)
- `FW4` = firmwareChecksum (SHA256 hex)
- `FW5` = firmwareSize (bytes)
- `FW_SIG` = serverSignature (base64, signs FW1|FW2|FW4|FW5)
- `FW_MANIFEST` = TOON-encoded firmware manifest (includes dependencies, install script tokens)

### Heartbeat Tokens
- `HB1` = heartbeatId (uuid)
- `HB2` = uptimeSeconds (integer)
- `HB3` = memoryUsageMB (integer)
- `HB4` = cpuTempC (float, e.g., "45.2")
- `HB5` = lastBootTimestamp (ISO8601)
- `HB6` = networkStatus (ONLINE | OFFLINE | FLAPPING)
- `HB7` = batteryPercent (optional, for battery-powered devices)

### Command Tokens
- `CMD1` = commandId (uuid)
- `CMD2` = commandName (RESTART | FETCH_LOGS | APPLY_CONFIG | WIPE | REVOKE)
- `CMD3` = commandPayload (TOON-encoded parameters)
- `CMD4` = commandPriority (HIGH | NORMAL | LOW)
- `CMD5` = commandExpiresAt (ISO8601)

### Acknowledgement Tokens
- `ACK1` = ackStatus (OK | ERROR | PARTIAL)
- `ACK2` = ackMessage (human-readable description)
- `ACK3` = executionTimeMs (milliseconds taken)
- `ACK4` = logs (TOON-encoded log tokens or reference to uploaded logs)

### Security Tokens
- `NONCE` = nonceToken (uuid or random base64, single-use)
- `SIG1` = signature (base64 Ed25519 signature by device)
- `SIG_SERV` = serverSignature (base64 Ed25519 signature by server)
- `PK1` = publicKey (PEM or base64-encoded Ed25519/ECDSA public key)
- `TS` = timestamp (ISO8601)

### Policy & Control Tokens
- `O1` = otaPolicyId (uuid, links device to OTA rollout policy)
- `O2` = otaPolicyName (e.g., "production_gradual_rollout")
- `RTO` = recommendedTimeout (seconds, server tells device next action interval)
- `RTY` = retryAfter (seconds, used in rate-limit responses)

### Status Tokens
- `S1` = status (ok | registered | accepted | no_update | pending)
- `ERR1` = errorCode (SIG_INVALID | NONCE_REUSE | RATE_LIMIT | UNAUTHORIZED | etc.)
- `ERR2` = errorMessage (human-readable)
- `ERR3` = errorDetails (TOON-encoded additional context)

### Logging Tokens
- `LOG1` = logId (uuid)
- `LOG2` = logLevel (DEBUG | INFO | WARN | ERROR | FATAL)
- `LOG3` = logMessage
- `LOG4` = logTimestamp (ISO8601)
- `LOG5` = logContext (TOON-encoded key-value pairs)

---

## 4. API Endpoint Contracts

### A) POST /api/devices/register
**Purpose:** Initial device registration with server

**Request TOON:**
```
D1:device_uuid_generated_by_device
D2:RPI_TERMINAL
D3:base64_encoded_public_key_PEM
D4:Raspberry_Pi_Foundation
D5:Pi_4_Model_B
M1:device_initial_metadata_tokens
TS:2025-12-02T10:00:00.000Z
NONCE:nonce_abc123
SIG1:base64_device_signature
```

**Response TOON (Success):**
```
S1:registered
D1:device_uuid_confirmed
TS:2025-12-02T10:00:01.234Z
O1:ota_policy_uuid
RTO:60
SIG_SERV:base64_server_signature
```

**Response TOON (Error):**
```
ERR1:DEVICE_ALREADY_REGISTERED
ERR2:Device with this ID already exists
TS:2025-12-02T10:00:01.234Z
```

**Server Behavior:**
1. Verify signature `SIG1` (if device already has temp credentials)
2. Check `NONCE` not reused
3. Store `D3` (public key) in database
4. Generate `O1` (OTA policy assignment)
5. Return server-signed response
6. Log raw_toon to audit table

---

### B) POST /api/devices/heartbeat
**Purpose:** Device health check and status update

**Request TOON:**
```
D1:device_uuid
HB1:heartbeat_uuid
HB2:3600
HB3:512
HB4:48.5
HB5:2025-12-02T06:00:00.000Z
HB6:ONLINE
FW2:1.2.3
TS:2025-12-02T10:00:00.000Z
NONCE:nonce_def456
SIG1:base64_device_signature
```

**Canonical String for Signature:**
```
D1:device_uuid|FW2:1.2.3|HB1:heartbeat_uuid|HB2:3600|HB3:512|HB4:48.5|HB5:2025-12-02T06:00:00.000Z|HB6:ONLINE|NONCE:nonce_def456|TS:2025-12-02T10:00:00.000Z
```

**Response TOON (Normal):**
```
S1:ok
RTO:60
TS:2025-12-02T10:00:01.000Z
PENDING_CMDS:0
```

**Response TOON (Commands Pending):**
```
S1:ok
RTO:60
TS:2025-12-02T10:00:01.000Z
PENDING_CMDS:2
CMD_IDS:cmd_123|cmd_456
```

**Response TOON (Firmware Available):**
```
S1:ok
RTO:60
TS:2025-12-02T10:00:01.000Z
FW_AVAILABLE:true
FW2:1.3.0
```

**Response TOON (Rate Limited):**
```
ERR1:RATE_LIMIT
ERR2:Too many heartbeats, slow down
RTO:300
RTY:300
TS:2025-12-02T10:00:01.000Z
```

**Server Behavior:**
1. Verify `SIG1` using stored `PK1`
2. Check `NONCE` not in recent nonce cache (last 1000 per device)
3. Validate `TS` within 5-minute clock skew
4. Update `devices.last_seen`, `devices.uptime`, `devices.memory_usage`, etc.
5. Store raw_toon in `device_heartbeats` table
6. Check for pending commands → return `CMD_IDS` if any
7. Check for firmware updates → return `FW_AVAILABLE:true` if newer version
8. Emit `onDeviceHeartbeat` event hook
9. Apply rate limiting (max 100 heartbeats/device/hour)

---

### C) GET /api/devices/commands
**Purpose:** Device polls for pending commands

**Query TOON (URL-encoded):**
```
?toon=D1:device_uuid|TS:2025-12-02T10:00:00.000Z|NONCE:nonce_ghi789|SIG1:base64_device_signature
```

**Response TOON (Commands Available):**
```
CMD_COUNT:2
CMD[0].CMD1:cmd_uuid_123
CMD[0].CMD2:RESTART
CMD[0].CMD4:HIGH
CMD[0].CMD5:2025-12-02T12:00:00.000Z
CMD[0].TS:2025-12-02T09:50:00.000Z
CMD[0].SIG_SERV:base64_server_signature
CMD[1].CMD1:cmd_uuid_456
CMD[1].CMD2:FETCH_LOGS
CMD[1].CMD3:LEVEL:ERROR|SINCE:2025-12-01T00:00:00.000Z
CMD[1].CMD4:NORMAL
CMD[1].TS:2025-12-02T09:55:00.000Z
CMD[1].SIG_SERV:base64_server_signature
```

**Response TOON (No Commands):**
```
S1:no_commands
TS:2025-12-02T10:00:01.000Z
```

**Server Behavior:**
1. Verify `SIG1`
2. Check `NONCE`
3. Query `device_commands` table for `device_id` WHERE `status='pending'`
4. Sign each command with `SIG_SERV`
5. Return TOON array

---

### D) POST /api/devices/command-ack
**Purpose:** Device acknowledges command execution

**Request TOON:**
```
D1:device_uuid
CMD1:cmd_uuid_123
ACK1:OK
ACK2:Restart completed successfully
ACK3:1234
TS:2025-12-02T10:01:00.000Z
NONCE:nonce_jkl012
SIG1:base64_device_signature
```

**Response TOON:**
```
S1:ok
TS:2025-12-02T10:01:01.000Z
```

**Server Behavior:**
1. Verify `SIG1`
2. Check `NONCE`
3. Update `device_commands` SET `status='completed'`, `completed_at=NOW()`, `ack_status=ACK1`, `ack_message=ACK2`
4. Store raw_toon
5. Emit `onCommandAcknowledged` event hook

---

### E) POST /api/devices/firmware/check
**Purpose:** Device checks if firmware update available

**Request TOON:**
```
D1:device_uuid
FW2:1.2.3
TS:2025-12-02T10:00:00.000Z
NONCE:nonce_mno345
SIG1:base64_device_signature
```

**Response TOON (Update Available):**
```
S1:update_available
FW1:firmware_uuid_789
FW2:1.3.0
FW3:https://cdn.example.com/firmware/signed_url_token_xyz
FW4:sha256_checksum_hex
FW5:52428800
FW_SIG:base64_server_signature_over_fw_manifest
O1:ota_policy_uuid
TS:2025-12-02T10:00:01.000Z
SIG_SERV:base64_server_signature
```

**Response TOON (No Update):**
```
S1:no_update
RTO:3600
TS:2025-12-02T10:00:01.000Z
```

**Server Behavior:**
1. Verify `SIG1`
2. Check `NONCE`
3. Query `firmware_releases` for device's `O1` policy
4. Compare `FW2` (current) with latest available
5. If newer exists:
   - Generate short-lived signed URL (`FW3`) valid for 1 hour
   - Sign firmware manifest (FW1|FW2|FW4|FW5) → `FW_SIG`
   - Return update details
6. Log check in `device_firmware_checks` table

---

### F) POST /api/devices/firmware/ack
**Purpose:** Device reports firmware application result

**Request TOON (Success):**
```
D1:device_uuid
FW1:firmware_uuid_789
FW2:1.3.0
ACK1:OK
ACK2:Firmware applied successfully after reboot
ACK3:45000
TS:2025-12-02T10:05:00.000Z
NONCE:nonce_pqr678
SIG1:base64_device_signature
```

**Request TOON (Failure):**
```
D1:device_uuid
FW1:firmware_uuid_789
FW2:1.3.0
ACK1:ERROR
ACK2:Checksum verification failed, rolled back to 1.2.3
LOG1:log_upload_uuid
TS:2025-12-02T10:05:00.000Z
NONCE:nonce_stu901
SIG1:base64_device_signature
```

**Response TOON:**
```
S1:ok
TS:2025-12-02T10:05:01.000Z
```

**Server Behavior:**
1. Verify `SIG1`
2. Check `NONCE`
3. Update `device_firmware_status` SET `status=ACK1`, `applied_at=NOW()`
4. If `ACK1:ERROR`, emit alert to admins via `onFirmwareFailure` hook
5. Store raw_toon and logs reference

---

### G) GET /api/devices/firmware/download
**Purpose:** Secure firmware bundle download

**Query TOON:**
```
?toon=FW1:firmware_uuid_789|D1:device_uuid|TS:2025-12-02T10:02:00.000Z|NONCE:nonce_vwx234|SIG1:base64_device_signature
```

**Response:** Binary firmware bundle stream with headers:
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="firmware_1.3.0.bin"
X-Firmware-Signature: base64_fw_sig
X-Firmware-Checksum: sha256_hex
```

**Server Behavior:**
1. Verify `SIG1`
2. Check `NONCE`
3. Validate `FW1` exists and device authorized
4. Stream firmware binary
5. Log download in audit table

---

### H) POST /api/devices/logs
**Purpose:** Device uploads diagnostic logs

**Request TOON:**
```
D1:device_uuid
LOG1:log_upload_uuid
LOG2:ERROR
LOG4:2025-12-02T10:00:00.000Z
LOG_COUNT:3
LOG[0].LOG3:Failed to connect to server
LOG[0].LOG4:2025-12-02T09:58:00.000Z
LOG[1].LOG3:Retrying with backoff
LOG[1].LOG4:2025-12-02T09:58:30.000Z
LOG[2].LOG3:Connection established
LOG[2].LOG4:2025-12-02T09:59:00.000Z
TS:2025-12-02T10:00:30.000Z
NONCE:nonce_yz012
SIG1:base64_device_signature
```

**Response TOON:**
```
S1:ok
LOG1:log_upload_uuid
TS:2025-12-02T10:00:31.000Z
```

**Server Behavior:**
1. Verify `SIG1`
2. Store logs in `device_logs` table (encrypted at rest)
3. Associate with `CMD1` or `FW1` if referenced
4. Return confirmation

---

## 5. Device Lifecycle Flows

### 5.1 Device Registration Flow
```
┌────────┐                          ┌────────┐
│ Device │                          │ Server │
└───┬────┘                          └───┬────┘
    │                                   │
    │ Generate Ed25519 keypair          │
    ├─────────────────────────────────> │
    │                                   │
    │ POST /api/devices/register        │
    │ (D1, D2, PK1, SIG1, NONCE, TS)   │
    ├──────────────────────────────────>│
    │                                   │
    │                Verify SIG1        │
    │                Store PK1          │
    │                Assign O1 policy   │
    │                                   │
    │ S1:registered, O1, RTO            │
    │<──────────────────────────────────┤
    │                                   │
    │ Start heartbeat timer (RTO=60s)   │
    │                                   │
```

### 5.2 Heartbeat Flow
```
┌────────┐                          ┌────────┐
│ Device │                          │ Server │
└───┬────┘                          └───┬────┘
    │                                   │
    │ Every RTO seconds                 │
    │                                   │
    │ POST /api/devices/heartbeat       │
    │ (D1, HB1-HB6, FW2, SIG1, NONCE)  │
    ├──────────────────────────────────>│
    │                                   │
    │                Verify SIG1        │
    │                Check NONCE        │
    │                Update last_seen   │
    │                Check commands     │
    │                Check firmware     │
    │                                   │
    │ S1:ok, RTO, PENDING_CMDS, FW_AVAIL│
    │<──────────────────────────────────┤
    │                                   │
    │ Schedule next heartbeat (RTO)     │
    │                                   │
```

### 5.3 OTA Firmware Update Flow
```
┌────────┐                          ┌────────┐
│ Device │                          │ Server │
└───┬────┘                          └───┬────┘
    │                                   │
    │ POST /api/devices/firmware/check  │
    │ (D1, FW2:current, SIG1, NONCE)   │
    ├──────────────────────────────────>│
    │                                   │
    │           Compare versions        │
    │           Generate signed URL     │
    │           Sign manifest           │
    │                                   │
    │ S1:update_available, FW1-FW5,     │
    │ FW3:signed_url, FW_SIG            │
    │<──────────────────────────────────┤
    │                                   │
    │ GET FW3 (download firmware)       │
    ├──────────────────────────────────>│
    │                                   │
    │ <stream firmware binary>          │
    │<──────────────────────────────────┤
    │                                   │
    │ Verify FW4 checksum               │
    │ Verify FW_SIG (server signature)  │
    │ Stage firmware (no apply yet)     │
    │ Create backup snapshot            │
    │ Run integrity checks              │
    │                                   │
    │ Apply firmware (reboot)           │
    │                                   │
    │ POST /api/devices/firmware/ack    │
    │ (D1, FW1, ACK1:OK, SIG1)         │
    ├──────────────────────────────────>│
    │                                   │
    │           Update status           │
    │           Log success             │
    │                                   │
    │ S1:ok                             │
    │<──────────────────────────────────┤
    │                                   │
```

### 5.4 Command Execution Flow
```
┌────────┐                          ┌────────┐
│ Device │                          │ Server │
└───┬────┘                          └───┬────┘
    │                                   │
    │ GET /api/devices/commands         │
    │ (D1, SIG1, NONCE)                │
    ├──────────────────────────────────>│
    │                                   │
    │         Query pending commands    │
    │         Sign each with SIG_SERV   │
    │                                   │
    │ CMD_COUNT:1, CMD1, CMD2:RESTART,  │
    │ SIG_SERV                          │
    │<──────────────────────────────────┤
    │                                   │
    │ Verify SIG_SERV                   │
    │ Execute command (restart)         │
    │                                   │
    │ POST /api/devices/command-ack     │
    │ (D1, CMD1, ACK1:OK, SIG1)        │
    ├──────────────────────────────────>│
    │                                   │
    │         Update command status     │
    │         Log completion            │
    │                                   │
    │ S1:ok                             │
    │<──────────────────────────────────┤
    │                                   │
```

---

## 6. Security Mechanisms

### 6.1 Replay Protection
- Every request includes unique `NONCE` (UUID v4 or 32-byte random)
- Server maintains per-device nonce cache (last 1000 nonces, 24-hour TTL)
- Replayed nonces rejected with `ERR1:NONCE_REUSE`

### 6.2 Timestamp Validation
- Every request includes `TS` (ISO8601 UTC timestamp)
- Server rejects requests with `TS` > 5 minutes from server time
- Prevents replay attacks and ensures freshness

### 6.3 Signature Verification
- Device signs with private key → `SIG1`
- Server verifies using stored `PK1` (device public key)
- Canonical TOON string construction ensures consistent signing
- Invalid signatures rejected with `ERR1:SIG_INVALID`

### 6.4 Rate Limiting
- Per-device limits:
  - Heartbeats: 100/hour
  - Firmware checks: 10/hour
  - Command polls: 60/hour
  - Log uploads: 20/hour
- Exceeded limits → `ERR1:RATE_LIMIT` with `RTO` and `RTY`

### 6.5 Firmware Integrity
- Server signs firmware manifest with `FW_SIG`
- Device verifies `FW_SIG` before applying
- Checksum `FW4` verified after download
- Failed verification → automatic rollback

### 6.6 Admin Command Security
- Destructive commands (WIPE, REVOKE) require dual approval
- `SIG_ADMIN_A` and `SIG_ADMIN_B` both required
- Server enforces multi-signature policy

---

## 7. Backoff & Retry Policies

### 7.1 Device-Side Backoff
- **Initial Retry:** 5 seconds
- **Max Backoff:** 5 minutes (300 seconds)
- **Algorithm:** Exponential with jitter
  ```
  backoff = min(MAX_BACKOFF, INITIAL * 2^attempt) + random(0, 1000ms)
  ```
- **Server Override:** `RTO` token always takes precedence

### 7.2 Server-Controlled Throttling
- Server may increase `RTO` to throttle aggressive devices
- Example: Normal `RTO:60`, throttled `RTO:300`
- Rate-limited devices receive `RTY` (retry after) in seconds

### 7.3 Network Failure Handling
- Device detects network loss via `NetInfo`
- Pauses heartbeat timer
- On reconnect, immediate heartbeat to reconcile state
- Server tracks `HB6:FLAPPING` to identify unstable devices

---

## 8. Database Schema

### 8.1 devices
```sql
CREATE TABLE devices (
  device_id TEXT PRIMARY KEY,
  device_type TEXT NOT NULL,
  device_public_key TEXT NOT NULL,
  manufacturer TEXT,
  model TEXT,
  firmware_version TEXT,
  ota_policy_id TEXT,
  status TEXT DEFAULT 'active',
  last_seen TIMESTAMP,
  uptime_seconds INTEGER,
  memory_usage_mb INTEGER,
  cpu_temp_c REAL,
  last_boot_timestamp TIMESTAMP,
  network_status TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  raw_toon_registration TEXT
);

CREATE INDEX idx_devices_last_seen ON devices(last_seen);
CREATE INDEX idx_devices_status ON devices(status);
```

### 8.2 device_heartbeats
```sql
CREATE TABLE device_heartbeats (
  heartbeat_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id),
  uptime_seconds INTEGER,
  memory_usage_mb INTEGER,
  cpu_temp_c REAL,
  last_boot_timestamp TIMESTAMP,
  network_status TEXT,
  firmware_version TEXT,
  signature_valid BOOLEAN,
  raw_toon TEXT NOT NULL,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_heartbeats_device ON device_heartbeats(device_id, received_at DESC);
```

### 8.3 device_commands
```sql
CREATE TABLE device_commands (
  command_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id),
  command_name TEXT NOT NULL,
  command_payload TEXT,
  command_priority TEXT DEFAULT 'NORMAL',
  expires_at TIMESTAMP,
  status TEXT DEFAULT 'pending',
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  ack_status TEXT,
  ack_message TEXT,
  execution_time_ms INTEGER,
  raw_toon_ack TEXT,
  server_signature TEXT NOT NULL
);

CREATE INDEX idx_commands_device_status ON device_commands(device_id, status);
```

### 8.4 firmware_releases
```sql
CREATE TABLE firmware_releases (
  firmware_id TEXT PRIMARY KEY,
  firmware_version TEXT NOT NULL,
  device_type TEXT NOT NULL,
  bundle_url TEXT NOT NULL,
  checksum TEXT NOT NULL,
  size_bytes INTEGER,
  ota_policy_id TEXT,
  release_notes TEXT,
  server_signature TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deprecated_at TIMESTAMP
);

CREATE INDEX idx_firmware_version ON firmware_releases(firmware_version);
```

### 8.5 device_firmware_status
```sql
CREATE TABLE device_firmware_status (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id TEXT NOT NULL REFERENCES devices(device_id),
  firmware_id TEXT NOT NULL REFERENCES firmware_releases(firmware_id),
  firmware_version TEXT NOT NULL,
  check_timestamp TIMESTAMP,
  download_started_at TIMESTAMP,
  download_completed_at TIMESTAMP,
  applied_at TIMESTAMP,
  status TEXT DEFAULT 'checking',
  ack_status TEXT,
  ack_message TEXT,
  logs_reference TEXT,
  raw_toon TEXT,
  signature_valid BOOLEAN
);

CREATE INDEX idx_firmware_status_device ON device_firmware_status(device_id, check_timestamp DESC);
```

### 8.6 device_nonces
```sql
CREATE TABLE device_nonces (
  nonce_hash TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id),
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_nonces_device ON device_nonces(device_id, used_at DESC);
CREATE INDEX idx_nonces_expires ON device_nonces(expires_at);
```

### 8.7 device_logs
```sql
CREATE TABLE device_logs (
  log_id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id),
  log_level TEXT NOT NULL,
  log_timestamp TIMESTAMP NOT NULL,
  command_id TEXT REFERENCES device_commands(command_id),
  firmware_id TEXT REFERENCES firmware_releases(firmware_id),
  log_entries TEXT NOT NULL, -- TOON-encoded array
  raw_toon TEXT NOT NULL,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_logs_device ON device_logs(device_id, log_timestamp DESC);
```

---

## 9. Testing Scenarios

### Scenario 1: Normal Heartbeat
**Device sends signed heartbeat → Server responds S1:ok**

**Device Request:**
```
D1:dev_001|HB1:hb_001|HB2:3600|HB3:512|HB4:45.2|HB5:2025-12-02T06:00:00Z|HB6:ONLINE|FW2:1.0.0|TS:2025-12-02T10:00:00Z|NONCE:n_abc123|SIG1:valid_signature
```

**Expected Response:**
```
S1:ok|RTO:60|TS:2025-12-02T10:00:01Z|PENDING_CMDS:0
```

**Assertions:**
- Signature verified ✓
- Nonce accepted (not reused) ✓
- Device last_seen updated ✓
- Response includes RTO ✓

---

### Scenario 2: Command Roundtrip
**Server queues restart command → Device polls → Executes → ACKs**

**Step 1 - Server creates command:**
```sql
INSERT INTO device_commands (command_id, device_id, command_name, command_priority, server_signature)
VALUES ('cmd_001', 'dev_001', 'RESTART', 'HIGH', 'server_sig_xyz');
```

**Step 2 - Device polls commands:**
```
GET /api/devices/commands?toon=D1:dev_001|TS:2025-12-02T10:01:00Z|NONCE:n_def456|SIG1:valid_sig
```

**Server Response:**
```
CMD_COUNT:1|CMD[0].CMD1:cmd_001|CMD[0].CMD2:RESTART|CMD[0].CMD4:HIGH|CMD[0].TS:2025-12-02T10:00:00Z|CMD[0].SIG_SERV:server_sig_xyz
```

**Step 3 - Device verifies SIG_SERV → Executes → ACKs:**
```
POST /api/devices/command-ack
D1:dev_001|CMD1:cmd_001|ACK1:OK|ACK2:Restart completed|ACK3:2000|TS:2025-12-02T10:02:00Z|NONCE:n_ghi789|SIG1:valid_sig
```

**Server Response:**
```
S1:ok|TS:2025-12-02T10:02:01Z
```

**Assertions:**
- Command marked pending ✓
- Device verifies server signature ✓
- Command executed ✓
- ACK recorded with status ✓

---

### Scenario 3: OTA Success
**Server issues firmware → Device downloads → Verifies → Applies → Reports success**

**Step 1 - Device checks for update:**
```
POST /api/devices/firmware/check
D1:dev_001|FW2:1.0.0|TS:2025-12-02T10:00:00Z|NONCE:n_jkl012|SIG1:valid_sig
```

**Server Response:**
```
S1:update_available|FW1:fw_123|FW2:1.1.0|FW3:https://cdn/signed_url|FW4:sha256_abc|FW5:10485760|FW_SIG:server_fw_sig|O1:policy_001|TS:2025-12-02T10:00:01Z
```

**Step 2 - Device downloads firmware:**
```
GET /api/devices/firmware/download?toon=FW1:fw_123|D1:dev_001|TS:2025-12-02T10:00:30Z|NONCE:n_mno345|SIG1:valid_sig
```

**Device verifies:**
- Checksum FW4 matches downloaded file ✓
- FW_SIG valid (server signed FW1|FW2|FW4|FW5) ✓

**Step 3 - Device stages → Tests → Applies → Reboots → ACKs:**
```
POST /api/devices/firmware/ack
D1:dev_001|FW1:fw_123|FW2:1.1.0|ACK1:OK|ACK2:Applied successfully|ACK3:45000|TS:2025-12-02T10:05:00Z|NONCE:n_pqr678|SIG1:valid_sig
```

**Server Response:**
```
S1:ok|TS:2025-12-02T10:05:01Z
```

**Assertions:**
- Firmware manifest signed ✓
- Device verified signature ✓
- Firmware applied successfully ✓
- Status updated in DB ✓

---

### Scenario 4: OTA Failure + Rollback
**Device fails checksum → Rolls back → Reports error with logs**

**Step 1-2 - Same as Scenario 3 (check + download)**

**Step 3 - Device detects checksum mismatch:**
```
Calculated checksum: sha256_xyz (doesn't match FW4:sha256_abc)
ROLLBACK to snapshot (firmware 1.0.0)
```

**Step 4 - Device reports failure:**
```
POST /api/devices/firmware/ack
D1:dev_001|FW1:fw_123|FW2:1.1.0|ACK1:ERROR|ACK2:Checksum mismatch, rolled back to 1.0.0|LOG1:log_001|TS:2025-12-02T10:05:00Z|NONCE:n_stu901|SIG1:valid_sig
```

**Server Response:**
```
S1:ok|TS:2025-12-02T10:05:01Z
```

**Server Actions:**
- Mark firmware status as 'failed' ✓
- Emit `onFirmwareFailure` alert to admins ✓
- Store logs reference ✓

**Assertions:**
- Device rolled back ✓
- Error reported ✓
- Admins notified ✓

---

### Scenario 5: Replay Attack
**Attacker replays old NONCE → Server rejects**

**Device sends valid request:**
```
D1:dev_001|HB1:hb_002|HB2:3600|NONCE:n_replay_123|TS:2025-12-02T10:00:00Z|SIG1:valid_sig
```

**Server Response:**
```
S1:ok|RTO:60|TS:2025-12-02T10:00:01Z
```

**Server stores nonce in cache.**

**Attacker replays same request 30 seconds later:**
```
D1:dev_001|HB1:hb_002|HB2:3600|NONCE:n_replay_123|TS:2025-12-02T10:00:30Z|SIG1:replayed_sig
```

**Server Response:**
```
ERR1:NONCE_REUSE|ERR2:This nonce has already been used|TS:2025-12-02T10:00:31Z
```

**Assertions:**
- Nonce detected as reused ✓
- Request rejected ✓
- Event logged for security audit ✓

---

### Scenario 6: Signature Tamper
**Attacker modifies payload → Signature invalid → Rejected**

**Valid Request:**
```
Canonical: D1:dev_001|HB1:hb_003|HB2:3600|NONCE:n_xyz789|TS:2025-12-02T10:00:00Z
SIG1: Ed25519_sign(device_private_key, canonical)
```

**Attacker modifies HB2:**
```
Canonical (tampered): D1:dev_001|HB1:hb_003|HB2:9999|NONCE:n_xyz789|TS:2025-12-02T10:00:00Z
SIG1: <original signature, now invalid>
```

**Server Response:**
```
ERR1:SIG_INVALID|ERR2:Signature verification failed|TS:2025-12-02T10:00:01Z
```

**Assertions:**
- Signature verification failed ✓
- Request rejected ✓
- Security event logged ✓

---

### Scenario 7: Network Flapping
**Device offline → Reconnects → Reconciles queued events**

**Device loses network at T+0:**
```
NetInfo: disconnected
Device pauses heartbeat timer
Queues heartbeat attempts locally
```

**Device regains network at T+180s:**
```
NetInfo: connected
Device sends immediate heartbeat (reconciliation)
```

**Request:**
```
D1:dev_001|HB1:hb_004|HB2:3780|HB3:512|HB4:46.1|HB5:2025-12-02T06:00:00Z|HB6:FLAPPING|FW2:1.0.0|TS:2025-12-02T10:03:00Z|NONCE:n_flap123|SIG1:valid_sig
```

**Server Response:**
```
S1:ok|RTO:60|TS:2025-12-02T10:03:01Z|PENDING_CMDS:0
```

**Server Actions:**
- Updates last_seen (was 180s stale) ✓
- Notes HB6:FLAPPING status ✓
- May adjust RTO for unstable device ✓

**Assertions:**
- Device reconnected ✓
- Server reconciled state ✓
- Flapping status tracked ✓

---

### Scenario 8: Rate Limit
**Device sends excessive heartbeats → Server throttles**

**Device sends 50 heartbeats in 10 minutes (should be ~10):**

**Heartbeat #50:**
```
D1:dev_001|HB1:hb_050|HB2:3600|NONCE:n_spam050|TS:2025-12-02T10:10:00Z|SIG1:valid_sig
```

**Server detects rate limit exceeded (>100/hour = 1.67/min):**

**Response:**
```
ERR1:RATE_LIMIT|ERR2:Too many heartbeats, slow down|RTO:300|RTY:300|TS:2025-12-02T10:10:01Z
```

**Device Actions:**
- Obeys RTO:300 (5 minutes) ✓
- Waits RTY:300 before next attempt ✓
- Backs off exponentially if repeated ✓

**Server Actions:**
- Tracks rate limit violations ✓
- May escalate to admins if persistent ✓

**Assertions:**
- Rate limit enforced ✓
- Device throttled ✓
- Backoff policy applied ✓

---

## 10. Implementation Checklist

### Server-Side Stubs
- ✅ `routes/device_firmware.toon.ts` - Firmware check, download, ACK
- ✅ `routes/device_heartbeat.toon.ts` - Heartbeat ingest + verification
- ✅ `routes/device_commands.toon.ts` - Command queueing, polling, ACK
- ✅ `routes/device_logs.toon.ts` - Log uploads
- ✅ `utils/signature.ts` - Sign/verify helpers (Ed25519)
- ✅ `utils/nonceStore.ts` - Nonce tracking (in-memory + DB)
- ✅ `utils/canonicalize.ts` - TOON canonicalization for signing
- ✅ `models/deviceFirmware.ts` - DB models
- ✅ `tests/device_protocol.spec.ts` - Integration tests

### Documentation
- ✅ Canonicalization rules
- ✅ Signature algorithm details
- ✅ Token dictionary
- ✅ API contracts
- ✅ Lifecycle flows
- ✅ Security mechanisms
- ✅ Testing scenarios

---

## 11. Acceptance Criteria

- [ ] All endpoints accept and return TOON tokens only
- [ ] POST /api/devices/heartbeat verifies SIG1 and NONCE
- [ ] POST /api/devices/heartbeat returns RTO and updates last_seen
- [ ] POST /api/devices/firmware/check returns FW_SIG and FW3 when update available
- [ ] Devices can download firmware using FW3
- [ ] POST /api/devices/firmware/ack updates firmware status
- [ ] Nonce replay protection works (replayed nonces rejected)
- [ ] Signature verification enforced for all critical routes
- [ ] Test harness covers 8 scenarios with sample TOON payloads
- [ ] Canonicalization documented and implemented correctly
- [ ] Device firmware implementers can verify server signatures
- [ ] Rate limiting enforced per device
- [ ] Audit logs preserve raw_toon for all requests
- [ ] Admin alerts triggered on firmware failures

---

**End of Specification**
