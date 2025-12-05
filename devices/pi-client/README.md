# Raspberry Pi TOON Device Client (Python, asyncio)

A reference Raspberry Pi (Linux) TOON-native device client implementing:
- Ed25519 key generation and secure storage on first boot
- Device registration (`/api/devices/register`)
- Heartbeat loop with signing, NONCE/TS, exponential backoff, RTO handling
- Command poll & ACK with verification of `SIG_SERV`
- Firmware check, signed manifest verification (`FW_SIG`), checksum validation, staging/apply, rollback, and signed ACK
- Local SQLite audit store persisting raw TOON events (heartbeats, commands, firmware, logs)
- Test harness for nonce replay, signature tamper, OTA failure, and more

All networking is TOON-only (text/plain). No JSON is used in requests.

## Requirements
- Python 3.11+
- Linux (tested on Raspberry Pi OS / Debian)
- `libsodium` system library (for pynacl) — on Debian/Ubuntu:
  ```bash
  sudo apt-get update && sudo apt-get install -y libsodium23
  ```

## Setup
```bash
cd devices/pi-client
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Configure environment variables or edit `toon_client/config.py`:
- `SERVER_URL` (default `http://localhost:3000`)
- `DEVICE_ID` (defaults to hostname)
- `SERVER_PUBLIC_KEY_BASE64` (Ed25519 public key, base64, for verifying `SIG_SERV`)

Option A — env vars:
```bash
export SERVER_URL="http://localhost:3000"
export SERVER_PUBLIC_KEY_BASE64="<base64-server-public-key>"
export DEVICE_ID="dev_rpi_001"
```

Option B — file config: edit `toon_client/config.py` constants.

## Run the client
```bash
source .venv/bin/activate
python -m toon_client.runner
```

- On first run, keys are created under `~/.toon/device_keys.json` with mode 600.
- Local audit DB: `~/.toon/toon_client.db`.

## Systemd service (optional)
```bash
sudo tee /etc/systemd/system/toon-client.service >/dev/null <<'UNIT'
[Unit]
Description=TOON Raspberry Pi Client
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=%h/ks-attendance/devices/pi-client
Environment=SERVER_URL=http://localhost:3000
Environment=SERVER_PUBLIC_KEY_BASE64=<base64-server-public-key>
Environment=DEVICE_ID=dev_rpi_001
ExecStart=%h/ks-attendance/devices/pi-client/.venv/bin/python -m toon_client.runner
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now toon-client.service
```

## Test harness
Run individual scenarios:
```bash
source .venv/bin/activate
python scripts/scenario1_happy_path.py
python scripts/scenario2_rate_limit.py
python scripts/scenario3_nonce_replay.py
python scripts/scenario4_signature_tamper.py
python scripts/scenario5_ota_check_no_update.py
python scripts/scenario6_ota_update_failure.py
python scripts/scenario7_command_ack_success.py
python scripts/scenario8_command_ack_error.py
```

Notes:
- Some scenarios assume the server has a firmware release and/or queued commands.
- Scripts avoid JSON and send raw TOON (`text/plain`).
