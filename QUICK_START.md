# KS Attendance System - Quick Start Guide

This workspace contains three main projects:

## 📱 Mobile App (`ks-attendance-app/`)
React Native + Expo attendance tracking app

```bash
npm run start:app
# or
cd ks-attendance-app && npx expo start
```

## 🖥️ Server (`server/`)
TOON-based attendance server with SQLite database

```bash
npm run dev:server        # Development with auto-reload
npm run start:server      # Production mode
# or
cd server && npm run dev
```

## 🌐 Admin Dashboard (`admin-dashboard/`)
React + TypeScript web dashboard for attendance management

```bash
npm run start:dashboard
# or
cd admin-dashboard && npm run dev
```

## 📦 Install All Dependencies

```bash
npm run install:all
```

This will install dependencies for all three projects.

## 🚀 Typical Development Workflow

1. **Start the server** (in one terminal):
   ```bash
   npm run dev:server
   ```
   Server runs on `http://localhost:8080`

2. **Start the admin dashboard** (in another terminal):
   ```bash
   npm run start:dashboard
   ```
   Dashboard runs on `http://localhost:3000`
   API calls proxy to server automatically

3. **Start the mobile app** (optional, in another terminal):
   ```bash
   npm run start:app
   ```
   Scan QR code with Expo Go app

## 📊 Project Status

| Project | Status | Port |
|---------|--------|------|
| Server | ✅ Ready | 8080 |
| Admin Dashboard | ✅ Ready | 3000 |
| Mobile App | ✅ Ready | Expo |

## 🔗 Key Integrations

- **Admin Dashboard → Server**: TOON protocol over HTTP (`/api/*`)
- **Mobile App → Server**: TOON protocol over HTTP (configure baseURL in app)
- All communication uses TOON format (NO JSON)

## 📖 Documentation

- Server: `server/README.md`, `server/STATUS.md`
- Admin Dashboard: `admin-dashboard/README.md`, `ADMIN_DASHBOARD_SUMMARY.md`
- Mobile-Server Integration: `MOBILE_SERVER_INTEGRATION.md`
