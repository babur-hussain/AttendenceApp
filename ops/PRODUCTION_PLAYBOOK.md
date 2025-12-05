# KS Attendance – Production Deployment Playbook

This playbook covers CI/CD pipelines, secure device provisioning, secrets and key rotation, monitoring and alerting, and rollback runbooks for the whole system:
- Expo Mobile Apps (EAS builds)
- Backend Server (TypeScript/Express + SQLite) with Docker-based deploy
- Admin Web (Vercel or static hosting)
- Device provisioning and lifecycle (TOON-only)

All data-plane requests between devices and backend are TOON-encoded (no JSON).

---

## 1) Environment Variables (reference)
Define as secrets in CI/CD and environments; never commit real values.

- Backend
  - `PORT` – default `3000`
  - `SERVER_PRIVATE_KEY` – PEM (PKCS8) Ed25519 private key used for `SIG_SERV` and `FW_SIG`
  - `DATABASE_URL` – e.g., `file:./data/prod.sqlite` (SQLite path) or DSN for managed DB
  - `RATE_LIMIT_*` – optional overrides (see `server/src/middleware/rateLimit.ts`)
  - `SENTRY_DSN` – optional error reporting

- Mobile (Expo EAS secrets)
  - `API_BASE_URL` – e.g., `https://api.example.com`
  - `SERVER_PUBLIC_KEY_BASE64` – base64 of raw 32-byte Ed25519 server public key
  - `SENTRY_DSN` – optional

- Admin Web (Vercel)
  - `NEXT_PUBLIC_API_BASE_URL` – base URL to backend
  - `SERVER_PUBLIC_KEY_BASE64` – optional (if admin needs to verify signatures)
  - Any auth provider secrets as required

- CI/CD
  - `GHCR_TOKEN` / `CR_PAT` – container registry access (GitHub Container Registry/other)
  - `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` – for target VPS deploy via SSH
  - `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` – for Vercel deploy

---

## 2) Mobile CI/CD – EAS (Expo)

### 2.1 Project config
Add `eas.json` (staging/production profiles) and configure app config to read secrets.

Example `eas.json`:
```json
{
  "cli": { "version": ">= 3.13.0" },
  "build": {
    "staging": {
      "channel": "staging",
      "developmentClient": false,
      "env": {
        "APP_ENV": "staging"
      }
    },
    "production": {
      "channel": "production",
      "developmentClient": false,
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

App config injection (recommended): create `ks-attendance-app/app.config.ts`:
```ts
import 'dotenv/config';
export default ({ config }) => ({
  ...config,
  extra: {
    API_BASE_URL: process.env.API_BASE_URL,
    SERVER_PUBLIC_KEY_BASE64: process.env.SERVER_PUBLIC_KEY_BASE64,
    SENTRY_DSN: process.env.SENTRY_DSN
  }
});
```
In the app code, read via `import Constants from 'expo-constants'; const { API_BASE_URL } = Constants.expoConfig?.extra as any;`.

### 2.2 Secrets
Use EAS secrets to inject at build-time:
```bash
# set once per project
EAS_NO_VCS=1 eas secret:create --name API_BASE_URL --value https://api.example.com --type string
EAS_NO_VCS=1 eas secret:create --name SERVER_PUBLIC_KEY_BASE64 --value <base64-32-byte> --type string
EAS_NO_VCS=1 eas secret:create --name SENTRY_DSN --value <dsn> --type string
```

### 2.3 Build & Release
- Staging: `eas build --platform ios --profile staging` (and android)
- Production: `eas build --platform ios --profile production`
- Configure `eas submit` for store uploads or use manual store upload.

### 2.4 OTA updates (Expo updates)
- Optional: use Expo Updates channels `staging` and `production` if desired.

---

## 3) Backend CI/CD – GitHub Actions + Docker + SSH deploy

### 3.1 Pipeline Overview
- Lint/typecheck and run tests
- Build TypeScript
- Build Docker image and push to registry (GHCR example)
- SSH to VPS and deploy using docker-compose; run DB migrations

See `.github/workflows/backend-ci.yml` in this repo for a working example.

### 3.2 Docker Compose (VPS)
Create `ops/deploy/docker-compose.yml`:
```yaml
version: '3.8'
services:
  server:
    image: ghcr.io/<owner>/<repo>-server:${TAG:-latest}
    container_name: ks-server
    restart: always
    env_file: .env
    ports: ["3000:3000"]
    volumes:
      - ./data:/app/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health" ]
      interval: 30s
      timeout: 5s
      retries: 5
```
Remote dir layout on VPS:
```
/opt/ks-attendance/
  docker-compose.yml
  .env   # backend envs (SERVER_PRIVATE_KEY, DATABASE_URL, ...)
  data/
```

### 3.3 Migrations
- On deploy, run a migration script or invoke a Node script that ensures tables exist. If using SQLite with our schema initializer, starting the container is sufficient. For other DBs, add migration CLI.

---

## 4) Admin Web CI/CD – Vercel or static host

### 4.1 Vercel
- Configure `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets in GitHub.
- Add workflow `.github/workflows/admin-web-ci.yml`.
- Configure project envs in Vercel dashboard: `NEXT_PUBLIC_API_BASE_URL`, etc.

### 4.2 Static host alternative
- Build the admin app and deploy artifacts to S3/CloudFront or a static VPS directory.

---

## 5) Device Provisioning Flow (secure factory)

### Option A: On-device key generation (recommended)
1. Device boots in factory jig and generates Ed25519 keypair.
2. Device prints/shares `DEVICE_ID` and `publicKeyBase64` over USB/UART.
3. Factory tool calls admin API or directly inserts into DB to whitelist device: `(device_id, device_public_key, manufacturer, model)`.
4. Factory tool optionally generates a one-time registration token (OTRT) with TTL and stores server-side; device can present `OTRT` during `/register` to gate.
5. Device packaged; first in-field boot uses `/register` to finalize activation.

### Option B: Pre-provision keys
1. Factory generates keypair per device.
2. Private key injected into device secure storage; public key whitelisted server-side as in Option A.

Notes
- Physical security: isolate factory network from internet; rotate OTRT signing keys regularly.
- Inventory: maintain CSV or DB of `(serial, device_id, public_key)`.

---

## 6) Secrets & Key Rotation Policy

### Server signing key rotation (Ed25519)
- Maintain two active keys during rotation window: `K_old`, `K_new`.
- Steps:
  1. Generate `K_new`. Export `SERVER_PUBLIC_KEY_BASE64` using `npm run export:pubkey`.
  2. Distribute `K_new.public` to devices:
     - Mobile: update EAS secrets and release.
     - Devices: push command/config to add `K_new.public` alongside `K_old.public` (clients verify against either key during window).
  3. Flip server to sign with `K_new` (`SERVER_PRIVATE_KEY=K_new.private`). Keep `K_old` public still accepted by clients.
  4. After 2–4 weeks, remove `K_old` from client trust stores.

### Device key rotation
- For compromised device keys:
  1. Mark device record as `revoked` and block by ID in the server.
  2. If physical device recovered, generate new keypair and re-provision.
  3. Maintain audit of revocations.

---

## 7) Monitoring & Alerting

### Mobile (Sentry)
- Add Sentry SDK; set `SENTRY_DSN` via EAS secret. Track crash/error rates by release channel.

### Backend
- Error tracking: Sentry SDK with `SENTRY_DSN`.
- Metrics: add Prometheus endpoint (`/metrics`) using `prom-client` (Node). Dashboards via Grafana: request rate, error rate, latency, heartbeats/min, rate-limit rejections.
- Logs: centralize with journald or Loki.

### Device Health Dashboard
- Use `device_heartbeats` table: last_seen per device, uptime, cpu_temp, firmware_version.
- Grafana panel examples:
  - Online devices by model
  - Devices missing heartbeat > 2× RTO
  - Firmware distribution pie chart

Alerting examples:
- Page on N devices missing heartbeats > 15 minutes.
- Alert on firmware apply failure (`device_firmware_status` with ERROR).

---

## 8) Rollback & Emergency Playbooks

### Firmware rollback
1. Mark latest firmware release as revoked in DB (or remove from `firmware_releases`).
2. Issue command to affected devices to halt updates.
3. Prepare hotfix firmware; sign `FW_SIG` and stage as canary.

### Revoke device keys / cut off devices
1. Add device to a `revoked_devices` list or flag in `devices` table.
2. Block their `/heartbeat` (return `ERR1:REVOKED`).
3. Investigate logs via `/api/devices/logs`.

### Server key compromise
1. Immediately rotate to `K_new` (see rotation steps); redistribute public key to all clients.
2. Invalidate old tokens/artifacts; audit.

---

## 9) Staging Checklist & Canary Rollout

### Staging Checklist (every release)
- Backend
  - [ ] Lint, typecheck, tests green
  - [ ] DB migrations applied on staging
  - [ ] Rate limits validated
  - [ ] Sentry DSN and environment set
- Mobile
  - [ ] EAS staging build succeeded (iOS/Android)
  - [ ] `API_BASE_URL` and `SERVER_PUBLIC_KEY_BASE64` set
- Devices
  - [ ] Test device registered on staging
  - [ ] Heartbeats and command ACKs verified
  - [ ] OTA test (success + forced failure)

### Canary Rollout Plan
- Firmware: deploy to 1–5% devices (by model/site) for 24–48h, watch failure rate < 0.5%.
- Mobile: release to internal testers/TestFlight/closed track first; monitor crash-free sessions > 99.5%.
- Backend: blue/green or one-instance canary behind load balancer; promote when error rate stable.

---

## 10) Operational Runbooks (Quick Reference)

### Deploy Backend (manual)
1. Build/push image: GitHub Actions on `main` → GHCR image `:sha` and `:latest`.
2. SSH to VPS:
   ```bash
   ssh -i ~/.ssh/ks_deploy $SSH_USER@$SSH_HOST
   cd /opt/ks-attendance
   export TAG=latest
   docker compose pull && docker compose up -d
   ```
3. Verify health: `curl http://localhost:3000/health`.

### Rotate Server Key
1. Generate new keypair (Ed25519). Set `SERVER_PRIVATE_KEY` (K_new) in staging → deploy → validate.
2. Export `SERVER_PUBLIC_KEY_BASE64` and distribute to clients (mobile EAS secret + device config).
3. Switch production to `K_new`. Keep `K_old` accepted for grace period.
4. After grace period, remove `K_old` from clients.

### Provision Device
1. First boot → generate Ed25519 keys.
2. Whitelist device on server (via admin tool/SQL).
3. Provide OTRT if required.
4. Ship.

### Investigate Device Offline
1. Check last heartbeat in DB; compare with RTO.
2. Query logs via device logs endpoint; check network status reported.
3. Use command queue to fetch recent logs; escalate if repeated failures.

---

## 11) References
- EAS build docs: https://docs.expo.dev/build/introduction/
- GitHub Actions: https://docs.github.com/en/actions
- Vercel CI/CD: https://vercel.com/docs/deployments/overview
- Prometheus + Grafana: https://prometheus.io/ https://grafana.com/
