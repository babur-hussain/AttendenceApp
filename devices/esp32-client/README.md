# ESP32 TOON Client (Arduino)

Minimal TOON-native client for ESP32 demonstrating:
- Ed25519 keypair (generate on first boot using libsodium, or provide constants)
- Device registration (`/api/devices/register`)
- Periodic signed heartbeat with NONCE + TS
- Command polling + server signature verification (`SIG_SERV`)
- OTA stub: downloads tiny payload and verifies `FW_SIG` (apply step stubbed)

All networking uses `text/plain` TOON messages — no JSON.

## Requirements
- Arduino IDE or PlatformIO
- ESP32 board support installed
- Libraries:
  - `arduino-libsodium` (Sodium/NaCl for Ed25519)
  - `WiFi` (from ESP32 core)
  - `HTTPClient` (from ESP32 core)

## Configure
In `esp32_toon_client.ino`, edit constants:
- `WIFI_SSID`, `WIFI_PASS`
- `SERVER_URL`
- `DEVICE_ID`
- `SERVER_PUBLIC_KEY_BASE64` (for verifying server `SIG_SERV` and `FW_SIG`)
- Optional: pre-provision `DEVICE_PRIVATE_KEY_BASE64`/`DEVICE_PUBLIC_KEY_BASE64`.

If no device keys are provisioned, a keypair is generated and stored in NVS.

## Build & Flash
- Arduino IDE: open `esp32_toon_client.ino`, select your ESP32 board, and Upload.
- PlatformIO: create a new project, add this `.ino` file, include libsodium.

## Notes
- OTA apply step is stubbed — payload is downloaded and verified but not flashed.
- This client keeps a small in-memory set of recent NONCEs to avoid reuse in the same boot.

## Getting the server public key (base64)
Devices must verify server signatures. Export the server Ed25519 public key as base64 (raw 32 bytes):

```bash
cd server
# If your private key is in a PEM file:
SERVER_PRIVATE_KEY="$(cat /path/to/server_private_key.pem)" npm run export:pubkey

# Or if it's already in an env var:
npm run export:pubkey
```

Copy the printed `SERVER_PUBLIC_KEY_BASE64` into `esp32_toon_client.ino` as `SERVER_PUBLIC_KEY_BASE64`.
