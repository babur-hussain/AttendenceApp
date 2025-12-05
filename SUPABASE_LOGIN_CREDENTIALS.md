# Supabase Real Authentication - Login Credentials

All users are now authenticated via **Supabase** (no dummy/test credentials).

## ✅ Real Supabase Users Created

| Email | Password | Role | Company |
|-------|----------|------|---------|
| admin@ksfashion.com | Admin@123456 | ADMIN | KSFASHION |
| manager@ksfashion.com | Manager@123456 | MANAGER | KSFASHION |
| employee@ksfashion.com | Employee@123456 | EMP | KSFASHION |

## 🔧 App Configuration

- **Login Mode**: `hybrid` (Supabase primary, Toon fallback)
- **Supabase URL**: https://qjxqyjqstsihatrhmhaq.supabase.co
- **Supabase Anon Key**: sb_publishable_2iBItsYajjbvaHob9Cl1bQ_Ect255NF

## 🚀 Testing on Real Device

1. Ensure app is connected to same WiFi as server
2. Server is running on http://192.168.29.240:3000/api
3. Use any of the above credentials to login
4. App will authenticate via Supabase directly
5. Falls back to Toon API if Supabase unavailable

## 📝 Notes

- Credentials are synced to local PostgreSQL database
- Supabase is the source of truth for authentication
- PIN hash (1234) also stored locally for PIN-based login fallback
- All passwords must follow Supabase security requirements
