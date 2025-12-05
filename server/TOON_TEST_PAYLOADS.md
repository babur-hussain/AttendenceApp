# TOON Protocol Test Payloads
Sample TOON payloads for testing Device Firmware & Protocol endpoints

## 1. Device Registration

### Request
```
POST /api/devices/register
Content-Type: text/plain

D1:dev_rpi_001|D2:RPI_TERMINAL|D3:LS0tLS1CRUdJTiBQVUJMSUMgS0VZLS0tLS0KTUNvd0JRWURLMlZ3QXlFQW5IdDRhRzFWMnpYUjJHZzBRVGI3a0h6TDJwN3N6YnJVWUJPTzdGNHdVRUk9Ci0tLS0tRU5EIFBVQkxJQyBLRVktLS0tLQ==|D4:Raspberry_Pi_Foundation|D5:Pi_4_Model_B|M1:location:warehouse_a|TS:2025-12-02T10:00:00.000Z|NONCE:550e8400-e29b-41d4-a716-446655440000|SIG1:base64_signature_here
```

### Response (Success)
```
S1:registered|D1:dev_rpi_001|TS:2025-12-02T10:00:01.234Z|O1:ota_policy_production|RTO:60|SIG_SERV:base64_server_signature
```

## 2. Heartbeat (Normal)

### Request
```
POST /api/devices/heartbeat
Content-Type: text/plain

D1:dev_rpi_001|HB1:hb_202512021000_abc123|HB2:3600|HB3:512|HB4:45.2|HB5:2025-12-02T06:00:00.000Z|HB6:ONLINE|FW2:1.0.0|TS:2025-12-02T10:00:00.000Z|NONCE:650e8400-e29b-41d4-a716-446655440001|SIG1:MEUCIQDz5Y8vKxH2VXN+7mZJKqJ9wX3rP2fLkT8zQ1hN6vR2wgIgEqK4mHt7bS2cF9pLwVjN8xR4yT3aQ5hM2kP6wZgL1Qs=
```

### Response (No Commands, No Firmware)
```
S1:ok|RTO:60|TS:2025-12-02T10:00:01.000Z|PENDING_CMDS:0
```

### Response (Commands Pending)
```
S1:ok|RTO:60|TS:2025-12-02T10:00:01.000Z|PENDING_CMDS:2|CMD_IDS:cmd_001|cmd_002
```

### Response (Firmware Available)
```
S1:ok|RTO:60|TS:2025-12-02T10:00:01.000Z|PENDING_CMDS:0|FW_AVAILABLE:true|FW2:1.1.0
```

## 3. Heartbeat (Rate Limited)

### Request (101st heartbeat in 1 hour)
```
POST /api/devices/heartbeat
Content-Type: text/plain

D1:dev_rpi_001|HB1:hb_202512021100_zzz999|HB2:7200|HB3:512|HB4:46.1|HB5:2025-12-02T06:00:00.000Z|HB6:ONLINE|FW2:1.0.0|TS:2025-12-02T11:00:00.000Z|NONCE:750e8400-e29b-41d4-a716-446655440101|SIG1:base64_signature
```

### Response (Throttled)
```
ERR1:RATE_LIMIT|ERR2:Too many heartbeats, slow down|RTO:300|RTY:300|TS:2025-12-02T11:00:01.000Z
```

## 4. Command Polling

### Request
```
GET /api/devices/commands?toon=D1:dev_rpi_001|TS:2025-12-02T10:01:00.000Z|NONCE:850e8400-e29b-41d4-a716-446655440002|SIG1:base64_signature
```

### Response (Commands Available)
```
CMD_COUNT:2|CMD[0].CMD1:cmd_restart_123|CMD[0].CMD2:RESTART|CMD[0].CMD4:HIGH|CMD[0].CMD5:2025-12-02T12:00:00.000Z|CMD[0].TS:2025-12-02T09:50:00.000Z|CMD[0].SIG_SERV:MEQCIF8pLwVjN+4mR7xK2tQ9bP5hS6wY3zN1mH8vL4rK2sQgAiAx7vM9cR2pT5nB8qW4fH6yS3lG7oP4xK9dV2jU6wCnA==|CMD[1].CMD1:cmd_logs_456|CMD[1].CMD2:FETCH_LOGS|CMD[1].CMD3:LEVEL:ERROR|SINCE:2025-12-01T00:00:00.000Z|CMD[1].CMD4:NORMAL|CMD[1].TS:2025-12-02T09:55:00.000Z|CMD[1].SIG_SERV:MEYCIQCz8pK4vN+7mR2xH5nS9bW3fY6wT4oL2sU8kR6vM9cH2AIhAKx4fH7yS9lG2pN5qW8bT6oP3xK4dV9jU2wCnR7vM8c=
```

### Response (No Commands)
```
S1:no_commands|TS:2025-12-02T10:01:01.000Z
```

## 5. Command Acknowledgement

### Request (Success)
```
POST /api/devices/command-ack
Content-Type: text/plain

D1:dev_rpi_001|CMD1:cmd_restart_123|ACK1:OK|ACK2:Restart completed successfully|ACK3:2345|TS:2025-12-02T10:02:00.000Z|NONCE:950e8400-e29b-41d4-a716-446655440003|SIG1:MEUCIQCx5vM8cR3pT6nB9qW5fH7yS4lG8oP5xK0dV3jU7wCnR8IgLwVkN+5mR8xK3tQ0bP6hS7wY4zN2mH9vL5rK3sQh
```

### Request (Error)
```
POST /api/devices/command-ack
Content-Type: text/plain

D1:dev_rpi_001|CMD1:cmd_config_789|ACK1:ERROR|ACK2:Invalid configuration file format|ACK3:156|TS:2025-12-02T10:03:00.000Z|NONCE:a50e8400-e29b-41d4-a716-446655440004|SIG1:base64_signature
```

### Response
```
S1:ok|TS:2025-12-02T10:02:01.000Z
```

## 6. Firmware Check

### Request
```
POST /api/devices/firmware/check
Content-Type: text/plain

D1:dev_rpi_001|FW2:1.0.0|TS:2025-12-02T10:00:00.000Z|NONCE:b50e8400-e29b-41d4-a716-446655440005|SIG1:MEQCIFz8pK5vN+8mR3xH6nS0bW4fY7wT5oL3sU9kR7vM0cH3AiBx4fH8yS0lG3pN6qW9bT7oP4xK5dV0jU3wCnR8vM9c
```

### Response (Update Available)
```
S1:update_available|FW1:fw_release_v110_xyz|FW2:1.1.0|FW3:/api/devices/firmware/download?token=eyJhbGciOiJFZERTQSJ9.eyJmd19pZCI6ImZ3X3JlbGVhc2VfdjExMF94eXoiLCJkZXZpY2VfaWQiOiJkZXZfcnBpXzAwMSIsImV4cCI6MTczMzE0ODAwMH0.signature_here|FW4:a3f5c8e2b1d4f6a9c7e8b2d5f1a3c6e9b4d7f2a5c8e1b4d6f9a2c5e8b1d4f7a|FW5:52428800|FW_SIG:MEYCIQDz9pK6vN+9mR4xH7nS1bW5fY8wT6oL4sU0kR8vM1cH4AIhAx5fH9yS1lG4pN7qW0bT8oP5xK6dV1jU4wCnR9vM0d|O1:ota_policy_production|TS:2025-12-02T10:00:01.000Z
```

### Response (No Update)
```
S1:no_update|RTO:3600|TS:2025-12-02T10:00:01.000Z
```

## 7. Firmware Download

### Request
```
GET /api/devices/firmware/download?token=eyJhbGciOiJFZERTQSJ9.eyJmd19pZCI6ImZ3X3JlbGVhc2VfdjExMF94eXoiLCJkZXZpY2VfaWQiOiJkZXZfcnBpXzAwMSIsImV4cCI6MTczMzE0ODAwMH0.signature_here
```

### Response
```
HTTP/1.1 200 OK
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="firmware_1.1.0.bin"
X-Firmware-Checksum: a3f5c8e2b1d4f6a9c7e8b2d5f1a3c6e9b4d7f2a5c8e1b4d6f9a2c5e8b1d4f7a

<binary firmware data>
```

## 8. Firmware Acknowledgement

### Request (Success)
```
POST /api/devices/firmware/ack
Content-Type: text/plain

D1:dev_rpi_001|FW1:fw_release_v110_xyz|FW2:1.1.0|ACK1:OK|ACK2:Firmware applied successfully after reboot|ACK3:45234|TS:2025-12-02T10:05:00.000Z|NONCE:c50e8400-e29b-41d4-a716-446655440006|SIG1:MEUCIQCz0pK7vN+0mR5xH8nS2bW6fY9wT7oL5sU1kR9vM2cH5AIgx6fH0yS2lG5pN8qW1bT9oP6xK7dV2jU5wCnR0vM1e
```

### Request (Failure with Rollback)
```
POST /api/devices/firmware/ack
Content-Type: text/plain

D1:dev_rpi_001|FW1:fw_release_v110_xyz|FW2:1.1.0|ACK1:ERROR|ACK2:Checksum verification failed, rolled back to 1.0.0|LOG1:log_fw_fail_001|TS:2025-12-02T10:05:00.000Z|NONCE:d50e8400-e29b-41d4-a716-446655440007|SIG1:base64_signature
```

### Response
```
S1:ok|TS:2025-12-02T10:05:01.000Z
```

## 9. Log Upload

### Request
```
POST /api/devices/logs
Content-Type: text/plain

D1:dev_rpi_001|LOG1:log_202512021000_abc|LOG2:ERROR|LOG4:2025-12-02T10:00:00.000Z|LOG_COUNT:3|LOG[0].LOG3:Failed to connect to server|LOG[0].LOG4:2025-12-02T09:58:00.000Z|LOG[1].LOG3:Retrying with exponential backoff|LOG[1].LOG4:2025-12-02T09:58:30.000Z|LOG[2].LOG3:Connection established|LOG[2].LOG4:2025-12-02T09:59:00.000Z|FW1:fw_release_v110_xyz|TS:2025-12-02T10:00:30.000Z|NONCE:e50e8400-e29b-41d4-a716-446655440008|SIG1:MEYCIQDz1pK8vN+1mR6xH9nS3bW7fY0wT8oL6sU2kR0vM3cH6AIhAx7fH1yS3lG6pN9qW2bT0oP7xK8dV3jU6wCnR1vM2f
```

### Response
```
S1:ok|LOG1:log_202512021000_abc|TS:2025-12-02T10:00:31.000Z
```

## 10. Replay Attack (NONCE Reused)

### Request (Same NONCE as earlier request)
```
POST /api/devices/heartbeat
Content-Type: text/plain

D1:dev_rpi_001|HB1:hb_202512021030_replay|HB2:5400|HB3:512|HB4:45.8|HB5:2025-12-02T06:00:00.000Z|HB6:ONLINE|FW2:1.0.0|TS:2025-12-02T10:30:00.000Z|NONCE:650e8400-e29b-41d4-a716-446655440001|SIG1:MEUCIQDz5Y8vKxH2VXN+7mZJKqJ9wX3rP2fLkT8zQ1hN6vR2wgIgEqK4mHt7bS2cF9pLwVjN8xR4yT3aQ5hM2kP6wZgL1Qs=
```

### Response (Rejected)
```
ERR1:NONCE_REUSE|ERR2:This nonce has already been used|TS:2025-12-02T10:30:01.000Z
```

## 11. Signature Tamper (Invalid SIG1)

### Request (Modified payload, original signature)
```
POST /api/devices/heartbeat
Content-Type: text/plain

D1:dev_rpi_001|HB1:hb_202512021040_tamper|HB2:9999|HB3:512|HB4:45.2|HB5:2025-12-02T06:00:00.000Z|HB6:ONLINE|FW2:1.0.0|TS:2025-12-02T10:40:00.000Z|NONCE:f50e8400-e29b-41d4-a716-446655440009|SIG1:MEUCIQDz5Y8vKxH2VXN+7mZJKqJ9wX3rP2fLkT8zQ1hN6vR2wgIgEqK4mHt7bS2cF9pLwVjN8xR4yT3aQ5hM2kP6wZgL1Qs=
```

### Response (Rejected)
```
ERR1:SIG_INVALID|ERR2:Signature verification failed|TS:2025-12-02T10:40:01.000Z
```

## 12. Timestamp Too Old

### Request (Timestamp 10 minutes old)
```
POST /api/devices/heartbeat
Content-Type: text/plain

D1:dev_rpi_001|HB1:hb_202512020950_old|HB2:3600|HB3:512|HB4:45.2|HB5:2025-12-02T06:00:00.000Z|HB6:ONLINE|FW2:1.0.0|TS:2025-12-02T09:50:00.000Z|NONCE:g50e8400-e29b-41d4-a716-446655440010|SIG1:base64_signature
```

### Response (Rejected)
```
ERR1:timestamp_invalid|ERR2:Timestamp outside acceptable range (600000ms difference)|RTO:60
```

## 13. Network Flapping

### Request (Device reporting flapping network)
```
POST /api/devices/heartbeat
Content-Type: text/plain

D1:dev_rpi_001|HB1:hb_202512021100_flap|HB2:7200|HB3:512|HB4:46.5|HB5:2025-12-02T06:00:00.000Z|HB6:FLAPPING|FW2:1.0.0|TS:2025-12-02T11:00:00.000Z|NONCE:h50e8400-e29b-41d4-a716-446655440011|SIG1:MEUCIQCz2pK9vN+2mR7xH0nS4bW8fY1wT9oL7sU3kR1vM4cH7AIgx8fH2yS4lG7pN0qW3bT1oP8xK9dV4jU7wCnR2vM3g
```

### Response (Server may adjust RTO for unstable device)
```
S1:ok|RTO:120|TS:2025-12-02T11:00:01.000Z|PENDING_CMDS:0
```

## Canonicalization Examples

### Example 1: Heartbeat
**Tokens:**
```javascript
{
  D1: "dev_rpi_001",
  HB1: "hb_001",
  HB2: "3600",
  HB3: "512",
  HB4: "45.2",
  HB5: "2025-12-02T06:00:00.000Z",
  HB6: "ONLINE",
  FW2: "1.0.0",
  TS: "2025-12-02T10:00:00.000Z",
  NONCE: "650e8400-e29b-41d4-a716-446655440001"
}
```

**Canonical String (sorted alphabetically):**
```
D1:dev_rpi_001|FW2:1.0.0|HB1:hb_001|HB2:3600|HB3:512|HB4:45.2|HB5:2025-12-02T06:00:00.000Z|HB6:ONLINE|NONCE:650e8400-e29b-41d4-a716-446655440001|TS:2025-12-02T10:00:00.000Z
```

**Sign with Ed25519 → Base64 → SIG1**

### Example 2: Firmware Manifest
**Tokens:**
```javascript
{
  FW1: "fw_release_v110_xyz",
  FW2: "1.1.0",
  FW4: "a3f5c8e2b1d4f6a9c7e8b2d5f1a3c6e9b4d7f2a5c8e1b4d6f9a2c5e8b1d4f7a",
  FW5: "52428800"
}
```

**Canonical String:**
```
FW1:fw_release_v110_xyz|FW2:1.1.0|FW4:a3f5c8e2b1d4f6a9c7e8b2d5f1a3c6e9b4d7f2a5c8e1b4d6f9a2c5e8b1d4f7a|FW5:52428800
```

**Sign with Server Private Key → Base64 → FW_SIG**

---

## Testing with curl

### 1. Register Device
```bash
curl -X POST http://localhost:3000/api/devices/register \
  -H "Content-Type: text/plain" \
  -d "D1:dev_test_001|D2:RPI_TERMINAL|D3:base64_public_key|D4:RaspberryPi|D5:Pi4B|M1:test|TS:$(date -u +%Y-%m-%dT%H:%M:%S.000Z)|NONCE:$(uuidgen)|SIG1:test_signature"
```

### 2. Send Heartbeat
```bash
curl -X POST http://localhost:3000/api/devices/heartbeat \
  -H "Content-Type: text/plain" \
  -d "D1:dev_test_001|HB1:hb_$(date +%s)|HB2:3600|HB3:512|HB4:45.2|HB5:$(date -u +%Y-%m-%dT%H:%M:%S.000Z)|HB6:ONLINE|FW2:1.0.0|TS:$(date -u +%Y-%m-%dT%H:%M:%S.000Z)|NONCE:$(uuidgen)|SIG1:test_signature"
```

### 3. Check Firmware
```bash
curl -X POST http://localhost:3000/api/devices/firmware/check \
  -H "Content-Type: text/plain" \
  -d "D1:dev_test_001|FW2:1.0.0|TS:$(date -u +%Y-%m-%dT%H:%M:%S.000Z)|NONCE:$(uuidgen)|SIG1:test_signature"
```

### 4. Poll Commands
```bash
curl "http://localhost:3000/api/devices/commands?toon=D1:dev_test_001%7CTS:$(date -u +%Y-%m-%dT%H:%M:%S.000Z)%7CNONCE:$(uuidgen)%7CSIG1:test_signature"
```

---

**Note:** In production, `SIG1` must be a valid Ed25519 signature. The test payloads above use placeholder signatures for demonstration. Real devices must implement proper signature generation using their private key.
