# 🔗 Mobile-Server Integration Guide

## Overview
This guide explains how to integrate the React Native mobile app with the TOON-based server endpoints.

---

## 1. Configure ToonClient Base URL

Update `ks-attendance-app/src/services/api/config.ts`:

```typescript
export const API_CONFIG = {
  // Development
  baseURL: 'http://localhost:3000/api',
  
  // Production (replace with your server domain)
  // baseURL: 'https://attendance.yourcompany.com/api',
  
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};
```

For local testing on physical device:
```typescript
// Replace localhost with your computer's local IP
baseURL: 'http://192.168.1.100:3000/api',
```

---

## 2. Device Registration Flow

When the app first launches, register the device:

```typescript
// In App.tsx or a setup service
import { ToonClient } from './src/services/api/ToonClient';
import { ToonCodec } from './src/utils/toon';
import * as Device from 'expo-device';

async function registerDevice() {
  const deviceId = await AsyncStorage.getItem('deviceId') || 
                   `MOBILE_${Device.modelName}_${Date.now()}`;
  
  await AsyncStorage.setItem('deviceId', deviceId);
  
  const registrationToon = ToonCodec.encode({
    D1: deviceId,
    D2: 'MOBILE',
    D4: 'FACE,LIVENESS', // Capabilities
  });
  
  const responseToon = await ToonClient.toonPost('/devices/register', registrationToon);
  const response = ToonCodec.decode(responseToon);
  
  if (response.S1 === 'registered' || response.S1 === 'updated') {
    console.log('✅ Device registered with server');
  }
}
```

---

## 3. Event Ingestion Integration

Update `AttendanceService.reconcilePendingEvents()` to send to server:

```typescript
// In src/services/AttendanceService.ts
async reconcilePendingEvents(): Promise<ReconciliationResult> {
  const pending = await this.loadPendingEvents();
  
  if (pending.length === 0) {
    return { successCount: 0, failureCount: 0, remainingCount: 0 };
  }
  
  // Batch events that are ready for retry
  const readyEvents = pending.filter(p => 
    new Date().getTime() >= p.nextRetryAt.getTime()
  );
  
  if (readyEvents.length === 0) {
    return { successCount: 0, failureCount: 0, remainingCount: pending.length };
  }
  
  // Convert to TOON batch
  const toonBatch = readyEvents
    .map(p => this.eventToToon(p.event))
    .join('||');
  
  let successCount = 0;
  let failureCount = 0;
  
  try {
    // Send to server
    const responseToon = await this.toonClient.toonPost('/devices/events', toonBatch);
    
    // Parse batch response
    const responses = responseToon.split('||').map(r => ToonCodec.decode(r));
    
    for (let i = 0; i < responses.length; i++) {
      const response = responses[i];
      const pendingEvent = readyEvents[i];
      
      if (response.S1 === 'accepted' || response.S1 === 'duplicate') {
        // Success - remove from queue
        await this.removePendingEvent(pendingEvent.event.eventId);
        successCount++;
        
        // Update event status
        pendingEvent.event.status = AttendanceEventStatus.SYNCED;
        await this.saveLastEvent(pendingEvent.event);
        
        // Log audit
        await this.logAudit({
          eventId: pendingEvent.event.eventId,
          deviceId: pendingEvent.event.deviceId,
          rawToonPayload: this.eventToToon(pendingEvent.event),
          sentAt: new Date().toISOString(),
          serverResponseToon: responseToon,
          status: 'synced',
        });
      } else {
        // Failure - update retry count
        pendingEvent.retryCount++;
        pendingEvent.nextRetryAt = this.calculateNextRetry(pendingEvent.retryCount);
        
        if (pendingEvent.retryCount >= 10) {
          // Max retries reached - mark as failed
          pendingEvent.event.status = AttendanceEventStatus.FAILED;
          await this.saveLastEvent(pendingEvent.event);
          failureCount++;
        }
      }
    }
    
    // Save updated pending queue
    const updatedPending = pending.filter(p => 
      !readyEvents.find(r => r.event.eventId === p.event.eventId) ||
      p.retryCount < 10
    );
    await this.savePendingEvents(updatedPending);
    
  } catch (error) {
    // Network error - keep events in queue
    failureCount = readyEvents.length;
    
    // Update retry times
    readyEvents.forEach(p => {
      p.retryCount++;
      p.nextRetryAt = this.calculateNextRetry(p.retryCount);
    });
    await this.savePendingEvents(pending);
  }
  
  return {
    successCount,
    failureCount,
    remainingCount: pending.length - successCount,
  };
}
```

---

## 4. Report Generation Integration

Add method to request server-generated reports:

```typescript
// In AttendanceService or new ReportService
async requestReport(options: {
  employeeId?: string;
  fromDate: Date;
  toDate: Date;
  format?: 'XLSX' | 'CSV';
}): Promise<{ reportId: string; status: string }> {
  const reportId = `RPT_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  
  const requestToon = ToonCodec.encode({
    R1: reportId,
    E1: options.employeeId,
    T1: options.fromDate.toISOString(),
    T2: options.toDate.toISOString(),
    O1: options.format || 'XLSX',
  });
  
  // Note: This returns binary XLSX, not TOON
  const response = await fetch(`${API_CONFIG.baseURL}/reports/attendance`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
    },
    body: requestToon,
  });
  
  if (response.ok) {
    // Get TOON response header
    const toonRespHeader = response.headers.get('X-TOON-RESP');
    const toonResp = toonRespHeader ? ToonCodec.decode(toonRespHeader) : {};
    
    // Download binary XLSX
    const blob = await response.blob();
    
    // Save to device using expo-file-system
    const fileUri = `${FileSystem.documentDirectory}${reportId}.xlsx`;
    const reader = new FileReader();
    
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      await FileSystem.writeAsStringAsync(
        fileUri,
        base64.split(',')[1],
        { encoding: FileSystem.EncodingType.Base64 }
      );
      
      // Open file or share
      await Sharing.shareAsync(fileUri);
    };
    
    reader.readAsDataURL(blob);
    
    return {
      reportId: toonResp.R1 || reportId,
      status: toonResp.S1 || 'ok',
    };
  }
  
  throw new Error('Report generation failed');
}
```

---

## 5. Analytics Dashboard Integration

Add method to fetch summary for admin UI:

```typescript
async fetchAnalyticsSummary(options?: {
  employeeId?: string;
  fromDate?: Date;
  toDate?: Date;
}): Promise<{
  totalEmployees: number;
  avgPunctuality: number;
  totalOverBreakMinutes: number;
  totalLateInCount: number;
  reportId?: string;
}> {
  let queryToon = '';
  
  if (options) {
    const filters: Record<string, any> = {};
    if (options.employeeId) filters.E1 = options.employeeId;
    if (options.fromDate) filters.T1 = options.fromDate.toISOString();
    if (options.toDate) filters.T2 = options.toDate.toISOString();
    
    queryToon = ToonCodec.encode(filters);
  }
  
  const url = queryToon 
    ? `/reports/summary?q=${encodeURIComponent(queryToon)}`
    : '/reports/summary';
  
  const responseToon = await this.toonClient.toonGet(url);
  const response = ToonCodec.decode(responseToon);
  
  return {
    totalEmployees: response.M1,
    avgPunctuality: response.M2,
    totalOverBreakMinutes: response.M3,
    totalLateInCount: response.M4,
    reportId: response.M5,
  };
}
```

---

## 6. Raspberry Pi Device Integration

For external Raspberry Pi face terminals, configure device to send events directly:

```python
# On Raspberry Pi (Python example)
import requests

def send_event_to_server(employee_id, face_embedding, liveness_score, quality_score):
    device_id = "RPI_FACE_001"
    event_id = f"EVT_{int(time.time())}_{random.randint(1000, 9999)}"
    
    # Build TOON payload
    embedding_str = ';'.join(str(x) for x in face_embedding)
    toon_payload = (
        f"E1:{employee_id}|"
        f"A1:{event_id}|"
        f"A2:IN|"
        f"A3:{datetime.utcnow().isoformat()}Z|"
        f"D1:{device_id}|"
        f"F2:{embedding_str}|"
        f"F3:0.95|"  # Match score from local verification
        f"S2:{liveness_score}|"
        f"S3:{quality_score}|"
        f"C1:consent_token_xyz"
    )
    
    response = requests.post(
        "https://attendance.yourcompany.com/api/devices/events",
        headers={"Content-Type": "text/plain"},
        data=toon_payload
    )
    
    # Parse TOON response
    resp_toon = response.text
    # Format: A1:EVT_xxx|S1:accepted
    print(f"Server response: {resp_toon}")
```

---

## 7. Error Handling

Handle server TOON errors:

```typescript
try {
  const responseToon = await ToonClient.toonPost('/devices/events', eventToon);
  const response = ToonCodec.decode(responseToon);
  
  if (response.S1 === 'error') {
    // Parse error tokens
    const errorCode = response.ERR1;
    const errorDetail = response.ERR2;
    
    if (errorCode === 'rate_limit_exceeded') {
      const retryAfter = parseInt(response.RETRY || '60');
      // Show user: "Too many requests. Please wait {retryAfter} seconds"
    } else if (errorCode === 'missing_token:E1') {
      // Employee ID missing
    } else if (errorCode === 'invalid_timestamp_format') {
      // Fix timestamp format
    }
  }
} catch (error) {
  // Network error - queue for retry
}
```

---

## 8. Testing Checklist

### ✅ Device Registration
- [ ] Mobile app registers on first launch
- [ ] Raspberry Pi devices register on boot
- [ ] Fingerprint terminals register on initialization

### ✅ Event Ingestion
- [ ] Check-in events sync successfully
- [ ] Check-out events sync successfully
- [ ] Break events sync successfully
- [ ] Batch events (multiple employees) sync correctly
- [ ] Offline events queue and sync when online
- [ ] Duplicate events get `S1:duplicate` response

### ✅ Rate Limiting
- [ ] 100 events/min limit enforced
- [ ] Rate limit headers received
- [ ] Backoff tokens parsed correctly
- [ ] App shows user-friendly "Please wait" message

### ✅ Reports
- [ ] Excel report downloads successfully
- [ ] Report contains all 6 sheets
- [ ] TOON Meta sheet has original request
- [ ] Analytics summary displays in admin UI

### ✅ Error Handling
- [ ] Network errors queue events offline
- [ ] Invalid TOON tokens show validation errors
- [ ] Server errors display user-friendly messages

---

## 9. Production Deployment

### Server Deployment (Node.js)
```bash
# Build TypeScript
cd server
npm run build

# Start with PM2
pm2 start dist/server.js --name attendance-server

# Setup nginx reverse proxy
# /etc/nginx/sites-available/attendance
server {
    listen 80;
    server_name attendance.yourcompany.com;
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable SSL with Let's Encrypt
certbot --nginx -d attendance.yourcompany.com
```

### Mobile App Configuration
```typescript
// src/services/api/config.ts
export const API_CONFIG = {
  baseURL: 'https://attendance.yourcompany.com/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};
```

### Raspberry Pi Configuration
```python
# config.py
SERVER_URL = "https://attendance.yourcompany.com/api"
DEVICE_ID = "RPI_FACE_001"
DEVICE_TYPE = "RPI"
```

---

## 10. Monitoring & Logging

### Server Logs
```bash
# View real-time logs
pm2 logs attendance-server

# View error logs
tail -f /var/log/nginx/error.log
```

### Database Audit
```sql
-- Check recent events
SELECT event_id, employee_id, event_type, timestamp, status
FROM attendance_events
ORDER BY received_at DESC
LIMIT 100;

-- Check audit logs
SELECT event_id, device_id, status, received_at
FROM audit_logs
ORDER BY received_at DESC
LIMIT 100;

-- Check rate limits
SELECT device_id, endpoint, request_count, window_start
FROM rate_limits
ORDER BY window_start DESC;
```

---

## 🎉 Integration Complete

Your mobile app is now fully integrated with the TOON-based server. All attendance events sync automatically, reports generate on-demand, and the system handles offline scenarios gracefully.

**Key Benefits:**
- ✅ Offline-first architecture
- ✅ Automatic retry with exponential backoff
- ✅ Full audit trail with TOON payloads
- ✅ Hardware-agnostic (mobile, Raspberry Pi, fingerprint terminals)
- ✅ Rate limiting for security
- ✅ Excel reports with analytics
- ✅ Zero JSON protocol overhead
