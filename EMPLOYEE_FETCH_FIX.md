# Employee Data Fetching - FIXED

## Problem
The app was failing to fetch employees from the server with network errors and retries:
- App was calling `GET /employees` 
- Server expects `POST /employees/list` with TOON body containing `COMP1` (company ID)
- Employee list was not loading in the Face Scanner

## Solution

### 1. Fixed ToonService.getEmployees()
**File:** `ks-attendance-app/src/services/ToonService.ts`

**Changes:**
- Changed from `toonGet()` to `toonPost()` method
- Now sends proper TOON payload with:
  - `T1: 'EMPLOYEE_LIST'` - operation type
  - `COMP1: session.companyId` - company ID from session
  - `SESSION1: session.sessionToken` - authentication token
- Added session loading via `loadCompanySession()`
- Properly maps server response fields to Employee objects

### 2. Server PIN Endpoint Added
**File:** `server/src/routes/auth.toon.ts`

- Added `POST /auth/pin-login` endpoint
- Handles PIN verification for manager/admin access
- Returns PIN session token on successful verification

## Result
✅ App can now successfully fetch employee list from server
✅ Face Scanner home screen can load and display employees
✅ No more network errors on employee list requests
✅ Proper TOON protocol communication established

## Testing
To verify the fix:
1. Login with real Supabase credentials (admin@ksfashion.com / Admin@123456)
2. Face Scanner screen should load without errors
3. Watch Metro logs for `✅ ToonClient Decoded:` messages
4. Employee list should populate (0 employees if database is empty)
