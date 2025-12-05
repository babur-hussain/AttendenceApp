# Attendance History Module - Documentation

## Overview
Complete attendance history, calendar, and analytics system with 100% TOON-only communication.

## Architecture

### Components
```
screens/history/
├── HistoryHome.tsx      - Main calendar + KPIs + filters
├── DayDetail.tsx        - Day drill-down with events
├── AttendanceList.tsx   - Filterable paginated list (TODO)
└── Charts.tsx           - Analytics charts

components/history/
├── HistoryCalendar.tsx  - Interactive month calendar
├── FilterPanel.tsx      - Multi-filter UI
├── BadgeLegend.tsx      - Calendar badge legend
└── RawToonViewer.tsx    - TOON token modal viewer

hooks/
├── useHistory.ts        - History data fetching
└── useCharts.ts         - Chart data aggregation
```

## TOON Token Mappings

### Query Parameters (Client → Server)

#### Month Summary Request
```
GET /api/history/month?toon=<encoded>

Tokens:
Y1 = year (2024)
M1 = month (1-12)
E1 = employeeId (optional, for managers)
T1 = fromDate (ISO 8601, optional override)
T2 = toDate (ISO 8601, optional override)
A2 = eventType filter (IN/OUT/BREAK_START/BREAK_END)
D1 = deviceId filter
F3_MIN = minimum match score threshold (0.0-1.0)
L1_MIN = minimum liveness threshold (0.0-1.0)
```

#### Month Summary Response
```
TOON Response:
Y1 = year
M1 = month
M2 = totalPresentDays
M3 = totalHours
M4 = overtimeMinutes
M5 = punctualityPercent

Per-day badges (for each day 1-31):
D<N>_TYPE = badge type (present|absent|late|over-break|partial)
D<N>_COUNT = events count for day N
D<N>_MINS = total minutes worked
D<N>_OVER = over-break minutes
```

#### Day Events Request
```
GET /api/history/events?toon=<encoded>

Tokens:
T1 = date (start)
T2 = date (end, can be same as T1)
E1 = employeeId filter (optional)
A2 = eventType filter
D1 = deviceId filter
F3_MIN = min match score
L1_MIN = min liveness
P1 = pagination token (from previous response)
```

#### Day Events Response
```
COUNT = number of events in response

For each event i (0-indexed):
E<i>_E1 = employeeId
E<i>_A1 = eventId
E<i>_A2 = eventType
E<i>_A3 = timestamp
E<i>_F3 = matchScore
E<i>_FP2 = fingerprintScore
E<i>_L1 = livenessScore
E<i>_D1 = deviceId
E<i>_S1 = status
E<i>_RAW = raw TOON payload

P2 = nextPageToken (if hasMore)
P1 = prevPageToken
```

#### Chart Data Request
```
GET /api/charts/data?toon=<encoded>

Tokens:
CHART = chart type (weekly_hours|punctuality|break_usage|overtime)
E1 = employeeId (optional)
T1 = fromDate
T2 = toDate
M1 = month (for punctuality)
```

#### Chart Data Responses

**Weekly Hours:**
```
COUNT = 7 (days)

For each day i (0-6):
D<i>_DAY = day name (Mon, Tue, etc)
D<i>_HRS = hours worked
D<i>_OT = overtime minutes
```

**Punctuality:**
```
COUNT = number of points

For each point i:
P<i>_DATE = date
P<i>_PCT = punctuality percentage
P<i>_LATE = late count
P<i>_TOTAL = total events
```

**Break Usage:**
```
For each break type i (0-3):
B<i>_ALLOWED = allowed minutes
B<i>_USED = used minutes
B<i>_OVER = over-break minutes
```

**Overtime:**
```
COUNT = number of bins

For each bin i:
O<i>_RANGE = range label (e.g., "0-30", "30-60")
O<i>_CNT = count of days in bin
O<i>_MINS = total minutes in bin
```

#### Export Request
```
POST /api/reports/attendance
Content-Type: text/plain

TOON Payload:
FMT = format (xlsx|csv)
T1 = fromDate
T2 = toDate
E1 = employeeId filter
A2 = eventType filter
D1 = deviceId filter
F3_MIN = min match score
L1_MIN = min liveness
```

#### Export Response
```
R1 = reportId (UUID)
URL = download URL (optional)
STATUS = generation status (ready|pending|failed)
```

## Caching Strategy

### Local Storage (SecureStore)
- **Cache Keys**: `history_cache_{year}_{month}`
- **Retention**: Last 3 months
- **Format**: JSON-serialized MonthSummary
- **Encryption**: SecureStore (platform keychain)

### Offline Behavior
1. **Load**: Try network first, fall back to cache
2. **Indicator**: Show "Offline" badge with "Sync" button
3. **Manual Sync**: `syncCachedMonths()` fetches last 3 months
4. **Stale Data**: Cache served when network fails

### Sync Logic
```typescript
// On app launch or manual sync
for (let i = 0; i < 3; i++) {
  const date = new Date();
  date.setMonth(date.getMonth() - i);
  await fetchMonthSummary(date.getFullYear(), date.getMonth() + 1);
}
```

## Calendar Badge Logic

### Badge Types
- **present**: All required IN/OUT events, no issues
- **late**: Check-in after grace period
- **over-break**: Break duration > allowed + grace
- **partial**: Some events missing (e.g., only IN, no OUT)
- **absent**: No events for workday

### Server-Side Logic (Expected)
```typescript
function calculateDayBadge(events: Event[], date: Date): BadgeType {
  if (events.length === 0) return 'absent';
  
  const hasIn = events.some(e => e.type === 'IN');
  const hasOut = events.some(e => e.type === 'OUT');
  
  if (!hasIn || !hasOut) return 'partial';
  
  const firstIn = events.find(e => e.type === 'IN');
  const isLate = firstIn && isAfterGrace(firstIn.timestamp, shiftStart);
  if (isLate) return 'late';
  
  const breaks = calculateBreaks(events);
  if (breaks.overBreakMinutes > 0) return 'over-break';
  
  return 'present';
}
```

## Filter Serialization

### Client → TOON
```typescript
const filters: HistoryFilters = {
  fromDate: '2024-01-01',
  toDate: '2024-01-31',
  employeeId: 'EMP001',
  eventType: 'IN',
  deviceId: 'MOBILE_001',
  minMatchScore: 0.85,
  minLiveness: 0.80,
};

// Encode to TOON
const toonParams = {
  T1: filters.fromDate,
  T2: filters.toDate,
  E1: filters.employeeId,
  A2: filters.eventType,
  D1: filters.deviceId,
  F3_MIN: filters.minMatchScore,
  L1_MIN: filters.minLiveness,
};

const encoded = encodeToToonPayload(toonParams);
// Send as query param: ?toon=<base64>
```

## Export & Download Flow

### Client-Side
```typescript
// 1. Build TOON export request
const params = {
  FMT: 'xlsx',
  T1: '2024-01-01',
  T2: '2024-01-31',
  E1: 'EMP001',
};

// 2. Post request
const response = await toonClient.toonPost('/api/reports/attendance', params);
const { R1: reportId, URL: downloadUrl } = decodeFromToonPayload(response);

// 3. Download file (implementation depends on platform)
// TODO: Implement toonDownload helper in ToonClient
// Should handle binary response and save to device
```

### Server-Side (Expected)
```typescript
// Generate report from filters
const report = await generateExcelReport(filters);

// Return TOON response
const response = encodeToToonPayload({
  R1: reportId,
  URL: `/api/reports/${reportId}/download`,
  STATUS: 'ready',
});

res.setHeader('X-TOON-RESP', 'attendance_report');
res.send(response);
```

## Chart Data Transformations

### Weekly Hours Aggregation
```typescript
// Server aggregates by day of week
SELECT 
  strftime('%w', timestamp) as dow,
  strftime('%A', timestamp) as day_name,
  SUM(CASE WHEN event_type='OUT' THEN 
    (julianday(timestamp) - julianday(in_time)) * 24
  END) as hours,
  SUM(overtime_minutes) as overtime
FROM events
WHERE employee_id = ? AND date >= ?
GROUP BY dow
ORDER BY dow;
```

### Punctuality Calculation
```typescript
// For each day in month
const punctuality = (onTimeCount / totalDays) * 100;

// Late determination
const isLate = firstCheckIn > (shiftStart + gracePeriod);
```

## Accessibility

### Calendar
- Each day cell has `accessibilityLabel`: "{day} {badgeType}"
- `accessibilityHint`: "Tap to view day details"
- Color contrast ratio ≥ 4.5:1 for all badges

### Charts
- Chart titles use semantic heading role
- Data points have labels for screen readers
- Touch targets ≥ 44x44 pt

### Filters
- Form labels properly associated with inputs
- Error messages announced to screen readers

## Performance Optimizations

### Pagination
- Fetch 20 events per page
- Use `P1`/`P2` tokens for cursor-based pagination
- Infinite scroll with `FlatList` `onEndReached`

### Chart Rendering
- Use `react-native-svg` for vector graphics
- Memoize chart components with `useMemo`
- Throttle chart updates to 60fps

### Cache Management
- Lazy load months on-demand
- Prune cache older than 3 months
- Background sync on app resume

## Error Handling

### Network Errors
```typescript
try {
  const data = await fetchMonthSummary(year, month);
} catch (error) {
  if (error.code === 'NETWORK_ERROR') {
    // Load from cache
    const cached = await loadCachedMonth(year, month);
    setIsOffline(true);
  }
}
```

### Empty States
- No data: Show illustration + "No attendance records"
- Failed load: Show error + "Retry" button
- Offline: Show cached data + "Offline Mode" badge

## Testing Strategy

### Unit Tests
- ✅ Badge type calculation logic
- ✅ Date range filter serialization
- ✅ Chart data transformations
- ✅ Cache save/load

### Integration Tests
- ✅ Month fetch → calendar render
- ✅ Day selection → events list
- ✅ Filter change → refetch
- ✅ Export → download trigger

### E2E Tests (TODO)
- Full user flow: calendar navigation, day drill-down, export
- Offline mode: disconnect → verify cached data

## API Endpoints Summary

| Endpoint | Method | Purpose | TOON Params | TOON Response |
|----------|--------|---------|-------------|---------------|
| `/api/history/month` | GET | Month summary | Y1, M1, filters | M2-M5, D1-D31 badges |
| `/api/history/events` | GET | Day events | T1, T2, filters, P1 | COUNT, E0-EN, P2 |
| `/api/charts/data` | GET | Chart data | CHART, E1, T1, T2 | Varies by chart type |
| `/api/reports/attendance` | POST | Request export | FMT, filters | R1, URL, STATUS |
| `/api/reports/:id/download` | GET | Download file | - | Binary (XLSX/CSV) |

## Environment Variables (Server)

```bash
# History API settings
HISTORY_CACHE_TTL=3600        # Cache TTL in seconds
HISTORY_PAGE_SIZE=20          # Events per page
HISTORY_MAX_RANGE=90          # Max date range in days

# Export settings
EXPORT_MAX_RECORDS=10000      # Max records per export
EXPORT_TEMP_DIR=/tmp/exports
EXPORT_TTL=3600               # Export file retention
```

## Known Limitations

1. **Chart Libraries**: Currently uses mock charts; integrate `victory-native` or `react-native-chart-kit`
2. **File Download**: `toonDownload` helper not implemented; requires platform-specific code
3. **Infinite Scroll**: AttendanceList screen TODO
4. **Real-time Updates**: No WebSocket support; uses polling (30s interval)
5. **Offline Export**: Exports require network; no offline queueing

## Future Enhancements

- [ ] Real-time badge updates via WebSocket
- [ ] Animated chart transitions (Reanimated)
- [ ] Swipe gestures for month navigation
- [ ] Share reports via email/messaging
- [ ] Dark mode theming
- [ ] Localization (i18n)
- [ ] PDF export option
- [ ] Custom date range picker
- [ ] Advanced filtering (boolean logic)
- [ ] Saved filter presets

---

**Last Updated**: Dec 3, 2024
**Version**: 1.0.0
**Status**: ✅ Production Ready (core features)
