export interface PostgresMigration {
  id: string;
  sql: string;
}

export const POSTGRES_MIGRATIONS: PostgresMigration[] = [
  {
    id: '0001_core_schema',
    sql: `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    CREATE EXTENSION IF NOT EXISTS "vector";

    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      company_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      settings JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'EMP')),
      pin_hash TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'locked', 'inactive')),
      failed_attempts INTEGER NOT NULL DEFAULT 0,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      phone TEXT,
      department TEXT
    );

    CREATE TABLE IF NOT EXISTS devices (
      id BIGSERIAL PRIMARY KEY,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL UNIQUE,
      device_type TEXT NOT NULL,
      device_public_key TEXT,
      manufacturer TEXT,
      model TEXT,
      firmware_version TEXT,
      ota_policy_id TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      last_seen TIMESTAMPTZ,
      uptime_seconds INTEGER,
      memory_usage_mb INTEGER,
      cpu_temp_c DOUBLE PRECISION,
      last_boot_timestamp TIMESTAMPTZ,
      network_status TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw_toon_registration TEXT,
      public_key TEXT,
      capabilities TEXT NOT NULL,
      registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      policy_tokens TEXT
    );

    CREATE TABLE IF NOT EXISTS employees (
      id BIGSERIAL PRIMARY KEY,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      employee_id TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      role TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      has_face_embeddings BOOLEAN DEFAULT FALSE,
      has_fingerprint_data BOOLEAN DEFAULT FALSE,
      enrolled_device_id TEXT,
      enrolled_device_type TEXT,
      total_events INTEGER DEFAULT 0,
      last_event_type TEXT,
      last_attendance_timestamp TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS face_embeddings (
      employee_id TEXT PRIMARY KEY REFERENCES employees(employee_id) ON DELETE CASCADE,
      embedding VECTOR(512),
      quality_score DOUBLE PRECISION,
      source_device TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS attendance_events (
      id BIGSERIAL PRIMARY KEY,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      event_id TEXT NOT NULL UNIQUE,
      employee_id TEXT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
      event_type TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL,
      device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
      location_lat DOUBLE PRECISION,
      location_lng DOUBLE PRECISION,
      location_accuracy DOUBLE PRECISION,
      face_match_score DOUBLE PRECISION,
      fingerprint_match_score DOUBLE PRECISION,
      liveness_score DOUBLE PRECISION,
      quality_score DOUBLE PRECISION,
      consent_token TEXT,
      break_type TEXT,
      break_duration INTEGER,
      is_over_break BOOLEAN DEFAULT FALSE,
      device_signature TEXT,
      metadata TEXT,
      raw_toon TEXT NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      status TEXT NOT NULL DEFAULT 'processed',
      rejection_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS reports (
      id BIGSERIAL PRIMARY KEY,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      report_id TEXT NOT NULL UNIQUE,
      request_toon TEXT NOT NULL,
      employee_id TEXT,
      from_timestamp TIMESTAMPTZ NOT NULL,
      to_timestamp TIMESTAMPTZ NOT NULL,
      output_format TEXT NOT NULL,
      filters TEXT,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      file_path TEXT NOT NULL,
      file_size BIGINT DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'generating'
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id BIGSERIAL PRIMARY KEY,
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      event_id TEXT,
      device_id TEXT NOT NULL,
      raw_toon_payload TEXT NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      server_response_toon TEXT NOT NULL,
      status TEXT NOT NULL,
      error_tokens TEXT
    );

    CREATE TABLE IF NOT EXISTS rate_limits (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 1,
      window_start TIMESTAMPTZ NOT NULL,
      UNIQUE (device_id, endpoint, window_start)
    );

    CREATE TABLE IF NOT EXISTS device_heartbeats (
      heartbeat_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
      uptime_seconds INTEGER,
      memory_usage_mb INTEGER,
      cpu_temp_c DOUBLE PRECISION,
      last_boot_timestamp TIMESTAMPTZ,
      network_status TEXT,
      firmware_version TEXT,
      signature_valid BOOLEAN DEFAULT FALSE,
      raw_toon TEXT NOT NULL,
      received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS device_commands (
      command_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
      command_name TEXT NOT NULL,
      command_payload TEXT,
      command_priority TEXT DEFAULT 'NORMAL',
      expires_at TIMESTAMPTZ,
      status TEXT DEFAULT 'pending',
      issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      ack_status TEXT,
      ack_message TEXT,
      execution_time_ms INTEGER,
      raw_toon_ack TEXT,
      server_signature TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS firmware_releases (
      firmware_id TEXT PRIMARY KEY,
      firmware_version TEXT NOT NULL,
      device_type TEXT NOT NULL,
      bundle_url TEXT NOT NULL,
      checksum TEXT NOT NULL,
      size_bytes BIGINT NOT NULL,
      ota_policy_id TEXT,
      release_notes TEXT,
      server_signature TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deprecated_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS device_firmware_status (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
      firmware_id TEXT REFERENCES firmware_releases(firmware_id) ON DELETE SET NULL,
      firmware_version TEXT NOT NULL,
      check_timestamp TIMESTAMPTZ,
      download_started_at TIMESTAMPTZ,
      download_completed_at TIMESTAMPTZ,
      applied_at TIMESTAMPTZ,
      status TEXT DEFAULT 'checking',
      ack_status TEXT,
      ack_message TEXT,
      logs_reference TEXT,
      raw_toon TEXT,
      signature_valid BOOLEAN DEFAULT FALSE
    );

    CREATE TABLE IF NOT EXISTS device_nonces (
      nonce_hash TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
      used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL
    );

    CREATE TABLE IF NOT EXISTS device_logs (
      log_id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
      log_level TEXT NOT NULL,
      log_timestamp TIMESTAMPTZ NOT NULL,
      command_id TEXT REFERENCES device_commands(command_id) ON DELETE SET NULL,
      firmware_id TEXT REFERENCES firmware_releases(firmware_id) ON DELETE SET NULL,
      log_entries TEXT NOT NULL,
      raw_toon TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id, employee_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_employee_timestamp ON attendance_events(employee_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_attendance_device_timestamp ON attendance_events(device_id, received_at);
    CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
    CREATE INDEX IF NOT EXISTS idx_audit_device_time ON audit_logs(device_id, received_at);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_device ON rate_limits(device_id, endpoint, window_start);
    CREATE INDEX IF NOT EXISTS idx_device_commands_status ON device_commands(device_id, status);
    CREATE INDEX IF NOT EXISTS idx_device_logs_device ON device_logs(device_id, log_timestamp);
  `,
  },
];
