/**
 * Server Entry Point
 * Express server for TOON-based Attendance System
 * NO JSON parsing or responses - 100% TOON protocol
 */

import 'dotenv/config';
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { toonBodyParser } from './middleware/toonBodyParser';
import { DatabaseManager } from './db/DatabaseManager';
import { EventHooksManager } from './utils/EventHooks';
import authRouter from './routes/auth.toon';
import companyRouter from './routes/company.toon';
import devicesRouter from './routes/devices.toon';
import reportsRouter from './routes/reports.toon';
import employeesRouter from './routes/employees.toon';
import deviceHeartbeatRouter from './routes/device_heartbeat.toon';
import deviceCommandsRouter from './routes/device_commands.toon';
import deviceFirmwareRouter from './routes/device_firmware.toon';
import deviceLogsRouter from './routes/device_logs.toon';

const app: Application = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize database
const db = DatabaseManager.getInstance();
console.log('✅ Database initialized');

// Initialize event hooks
EventHooksManager.getInstance();
console.log('✅ Event hooks system ready');

// Middleware
app.use(cors());

// Custom TOON body parser (NO express.json() or express.text())
app.use(toonBodyParser);

// Health check endpoint (returns TOON)
app.get('/health', (_req: Request, res: Response) => {
  res
    .status(200)
    .set('Content-Type', 'text/plain')
    .send('S1:ok|SYS:healthy|TS:' + new Date().toISOString());
});

// Root endpoint for info
app.get('/', (_req: Request, res: Response) => {
  res
    .status(200)
    .set('Content-Type', 'text/plain')
    .send('S1:ks_attendance_server|V:1.0.0|PROTOCOL:TOON|STATUS:running');
});

// Register routes
app.use('/api/auth', authRouter);
app.use('/api/company', companyRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/devices', deviceHeartbeatRouter);
app.use('/api/devices', deviceCommandsRouter);
app.use('/api/devices', deviceFirmwareRouter);
app.use('/api/devices', deviceLogsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/employees', employeesRouter);

// 404 handler (TOON response)
app.use((req: Request, res: Response) => {
  res
    .status(404)
    .set('Content-Type', 'text/plain')
    .send('ERR1:endpoint_not_found|PATH:' + req.path);
});

// Error handler (TOON response)
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error('Server error:', err);
  res
    .status(500)
    .set('Content-Type', 'text/plain')
    .send('ERR1:internal_server_error|MSG:' + err.message);
});

// Start server on all network interfaces (0.0.0.0) for local network access
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 KS Attendance Server (TOON Protocol)');
  console.log(`📡 Server running on port ${PORT}`);
  console.log('🌐 Accessible on all network interfaces (0.0.0.0)');
  console.log('🔒 Rate limiting enabled');
  console.log('📊 Event hooks active');
  console.log('💾 Database: Supabase/PostgreSQL');
  console.log('🎯 Protocol: 100% TOON (NO JSON)');
  console.log('\nEndpoints:');
  console.log('  POST   /api/auth/login           - User authentication (Supabase)');
  console.log('  POST   /api/auth/forgot          - Request Supabase reset email');
  console.log('  POST   /api/auth/reset           - Complete PIN reset (Supabase admin)');
  console.log('  POST   /api/auth/logout          - Sign out');
  console.log('  POST   /api/company/login        - Company scoped authentication');
  console.log('  POST   /api/company/create-request - Bootstrap company workspace');
  console.log('  POST   /api/devices/events       - Ingest attendance events');
  console.log('  POST   /api/devices/register     - Register device');
  console.log('  GET    /api/devices/events       - List events (paginated)');
  console.log('  GET    /api/employees            - List employees');
  console.log('  GET    /api/employees/:id        - Get employee details');
  console.log('  POST   /api/employees            - Create employee');
  console.log('  PUT    /api/employees/:id        - Update employee');
  console.log('  POST   /api/employees/:id/delete - Delete employee');
  console.log('  POST   /api/reports/attendance   - Generate Excel report');
  console.log('  GET    /api/reports/summary      - Get analytics summary');
  console.log('  GET    /api/reports/:id/download - Download report');
  console.log('  GET    /health                   - Health check\n');
});

// Graceful shutdown
const shutdown = async (signal: NodeJS.Signals) => {
  console.log(`${signal} signal received: closing HTTP server`);
  try {
    await db.close();
    console.log('🧹 Database pool closed');
  } catch (err) {
    console.error('Error while closing database:', err);
  } finally {
    process.exit(0);
  }
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

export default app;
