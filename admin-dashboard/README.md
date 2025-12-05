# KS Attendance - Admin Dashboard

Complete admin web dashboard for managing the TOON-based attendance system.

## Features

- **Dashboard Home**: Summary cards with TOON API integration
- **Employees Management**: Employee list and management interface
- **Attendance Records**: View attendance events
- **Reports**: Generate and download Excel reports
- **Devices**: Manage registered attendance devices

## Tech Stack

- React 18 + TypeScript
- React Router for navigation
- Vite for build tooling
- Custom ToonClient for TOON protocol communication

## Project Structure

```
admin-dashboard/
├── src/
│   ├── toon/                 # TOON networking layer
│   │   ├── ToonClient.ts     # Web-compatible TOON HTTP client
│   │   ├── ToonCodec.ts      # TOON encoding/decoding
│   │   └── index.ts
│   ├── pages/                # Main page components
│   │   ├── DashboardPage.tsx # Home with summary cards
│   │   ├── EmployeesPage.tsx # Employee management
│   │   ├── AttendancePage.tsx# Attendance viewer
│   │   ├── ReportsPage.tsx   # Report generator
│   │   ├── DevicesPage.tsx   # Device management
│   │   └── index.ts
│   ├── components/
│   │   └── common/           # Reusable UI components
│   │       ├── Card.tsx
│   │       ├── Table.tsx
│   │       ├── Button.tsx
│   │       ├── Sidebar.tsx
│   │       └── index.ts
│   ├── App.tsx               # Main app with routing
│   └── main.tsx              # Entry point
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Installation

```bash
cd admin-dashboard
npm install
```

## Development

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3000`

## API Integration

The dashboard uses the ToonClient to communicate with the TOON server:

- **Base URL**: Proxied to `http://localhost:8080` via Vite
- **Protocol**: TOON (text-based, pipe-delimited)
- **No JSON**: All requests/responses use TOON encoding

### Example: Fetching Summary

```typescript
const toonClient = new ToonClient({ baseURL: '/api' });
const summary = await toonClient.toonGet('/reports/summary');
// Returns: { TOTAL_EMPLOYEES: 10, PUNCTUALITY_PCT: 85, ... }
```

### Example: Downloading Report

```typescript
const blob = await toonClient.toonDownload('/reports/download?REPORT_ID=latest');
ToonClient.triggerDownload(blob, 'attendance_report.xlsx');
```

## TOON Client Features

- ✅ `toonGet(endpoint)` - GET request with TOON response decoding
- ✅ `toonPost(endpoint, data)` - POST request with TOON encoding/decoding
- ✅ `toonDownload(endpoint)` - Download binary files (XLSX)
- ✅ Auth token support (if needed)
- ✅ No JSON anywhere - pure TOON protocol

## Routes

- `/` - Dashboard home with summary cards
- `/employees` - Employee list table
- `/attendance` - Attendance records viewer
- `/reports` - Report generator and downloader
- `/devices` - Device registration and status

## Current Status

✅ Complete skeleton structure
✅ All pages with placeholders
✅ TOON networking layer
✅ Dashboard with `/api/reports/summary` integration
✅ Routing and navigation
⏳ Real data integration (pending server endpoints)
⏳ Authentication (optional)
⏳ Styling improvements (optional)

## Build

```bash
npm run build
```

Build output will be in `dist/` directory.

## Production

```bash
npm run preview
```

Preview the production build locally.
