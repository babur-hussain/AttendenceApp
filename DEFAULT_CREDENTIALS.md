# 🔑 Default Login Credentials

## Quick Start

### 1. Seed Database with Default Users

```bash
cd server
npm run seed
```

This creates 3 default users with role-based access.

---

## 📋 Default Credentials

### 🔴 **ADMIN Account**
```
Email: admin@ksfashion.com
PIN:   1234
```
**Access:** Full system access, reports, user management, device management

### 🟡 **MANAGER Account**
```
Email: manager@ksfashion.com
PIN:   1234
```
**Access:** Team reports, attendance monitoring, employee management

### 🟢 **EMPLOYEE Account**
```
Email: employee@ksfashion.com
PIN:   1234
```
**Access:** Personal attendance, check-in/out, view own records

---

## 🚀 Usage

### Mobile App (React Native)
1. Start the mobile app: `npm start`
2. Navigate to Login screen
3. Enter email and PIN from above
4. App will route to role-specific home screen

### Admin Dashboard (React)
1. Start admin dashboard: `npm run dev`
2. Open http://localhost:5173
3. Login with admin credentials
4. Access full admin panel

---

## 🔒 Security Notes

### For Development
- ✅ These credentials are for **development/testing only**
- ✅ PIN is hashed using SHA-256 before storage
- ✅ Failed login attempts tracked (10 attempts = account lock)
- ✅ TOON protocol used for all auth requests

### For Production
- ⚠️ **Change default PINs immediately**
- ⚠️ Use environment variables for secrets
- ⚠️ Enable HTTPS/TLS
- ⚠️ Implement proper JWT with secret keys
- ⚠️ Add rate limiting per IP
- ⚠️ Enable audit logging
- ⚠️ Use stronger password hashing (bcrypt/argon2)

---

## 🛠️ Customization

### Create Additional Users

Edit `server/src/db/seed.ts` and add:

```typescript
{
  id: 'emp_002',
  email: 'john.doe@ksfashion.com',
  name: 'John Doe',
  role: 'EMP',
  pin_hash: hashPin('5678'),
  status: 'active',
}
```

Then run: `npm run seed`

### Change Default PINs

In `seed.ts`, change the PIN in `hashPin()` calls:

```typescript
pin_hash: hashPin('5678'), // Change from 1234
```

---

## 🧪 Testing Different Roles

### Test Admin Features
```
Email: admin@ksfashion.com
PIN:   1234
```
Should route to: `AdminHomeScreen`
Features: User management, system settings, all reports

### Test Manager Features
```
Email: manager@ksfashion.com
PIN:   1234
```
Should route to: `ManagerHomeScreen`
Features: Team reports, attendance oversight

### Test Employee Features
```
Email: employee@ksfashion.com
PIN:   1234
```
Should route to: `EmployeeHomeScreen`
Features: Check-in/out, personal attendance view

---

## 🔍 Verify Users Created

```bash
# From server directory
sqlite3 data/attendance.db "SELECT id, email, name, role, status FROM users;"
```

Expected output:
```
admin_001|admin@ksfashion.com|Admin User|ADMIN|active
manager_001|manager@ksfashion.com|Manager User|MANAGER|active
emp_001|employee@ksfashion.com|Employee User|EMP|active
```

---

## 🐛 Troubleshooting

### "Invalid email or PIN" error
- ✅ Verify you ran `npm run seed` in server directory
- ✅ Check email/PIN are typed correctly (case-sensitive)
- ✅ Ensure server is running on port 3000

### Account locked
- Run seed script again to reset failed attempts
- Or manually update: `UPDATE users SET status='active', failed_attempts=0 WHERE email='...'`

### Server not responding
```bash
# Check server logs
cd server
npm run dev

# Verify endpoint
curl http://localhost:3000/health
# Should return: S1:ok|SYS:healthy|TS:...
```

### Database not found
```bash
# Create data directory
mkdir -p server/data

# Run seed script
cd server
npm run seed
```

---

## 📊 Login Flow

```
1. User enters email + PIN
   ↓
2. Mobile app → POST /api/auth/login (TOON-encoded)
   ↓
3. Server validates credentials
   ↓
4. Server returns TOON response:
   - Success: Tokens + User object
   - Error: ERR1/ERR2/ERR3 code
   ↓
5. App routes to role-based home screen
```

---

## 🎯 Next Steps

1. ✅ Run seed script: `npm run seed`
2. ✅ Start server: `npm run dev`
3. ✅ Start mobile app: `npm start` (in ks-attendance-app)
4. ✅ Test login with credentials above
5. ✅ Verify role-based routing works
6. ✅ Change PINs for production deployment

---

**Need help?** Check `docs/INTEGRATION_GUIDE.md` for full setup instructions.
