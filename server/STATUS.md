# Backend Migration Status

## Summary
- ✅ Database layer rebuilt on **Supabase/PostgreSQL** using the official `pg` pool
- ✅ Automatic migration runner with `schema_migrations` ledger (see `src/db/migrations.ts`)
- ✅ Every route/middleware now uses async helpers (`query/get/run/withClient`)
- ✅ Legacy SQLite dependencies removed; `npm run build` passes cleanly

## Environment Checklist
1. Set `SUPABASE_DB_URL` (or `DATABASE_URL`) in `server/.env`
2. Provide Supabase Auth credentials: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (needed for login + provisioning)
3. Optionally configure `SUPABASE_RESET_REDIRECT_URL` for password recovery emails
4. Tune `DB_POOL_MAX`, `DB_POOL_IDLE`, `DB_POOL_CONNECT_TIMEOUT` as needed
5. Ensure the Supabase project has the `uuid-ossp`, `pgcrypto`, and `vector` extensions enabled

## Running the Server
```bash
cd server
npm install   # installs pg + dependencies
npm run dev   # or npm start after npm run build
```

On boot the server will:
1. Connect to Supabase using SSL (auto-detected)
2. Apply any pending migrations
3. Start serving TOON endpoints at `http://localhost:3000`

## Troubleshooting
- **Migrations failing?** Check the Supabase dashboard for permissions and that required extensions are enabled.
- **Connection refused?** Verify firewall / connection string format (`postgresql://user:pass@host:5432/db?sslmode=require`).
- **High load?** Increase `DB_POOL_MAX` and make sure Supabase connection limits support it.
