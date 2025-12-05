/**
 * Device Heartbeat Routes (TOON Protocol)
 * Handles device health check and status updates
 */

import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../db/DatabaseManager';
import { NonceStore } from '../utils/nonceStore';
import { SignatureUtils } from '../utils/signature';
import { Canonicalize } from '../utils/canonicalize';
import { EventHooksManager } from '../utils/EventHooks';
import { checkRateLimit } from '../middleware/rateLimit';

const router = Router();
const db = DatabaseManager.getInstance();
const nonceStore = NonceStore.getInstance();
const hooks = EventHooksManager.getInstance();

// Rate limit: 100 heartbeats per device per hour
const HEARTBEAT_RATE_LIMIT = 100;
const HEARTBEAT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * POST /api/devices/heartbeat
 * Device health check with signature verification
 */
router.post('/heartbeat', checkRateLimit, async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;
    
    if (!rawPayload) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send('ERR1:empty_payload|ERR2:Request body is empty');
    }

    // Parse TOON tokens
    const tokens = Canonicalize.parseTokens(rawPayload);

    // Validate required tokens
    const required = ['D1', 'HB1', 'HB2', 'TS', 'NONCE', 'SIG1'];
    const validation = Canonicalize.validateRequiredTokens(tokens, required);
    
    if (!validation.valid) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(`ERR1:missing_tokens|ERR2:Required tokens missing: ${validation.missing.join(',')}`);
    }

    const { D1: deviceId, HB1: heartbeatId, NONCE: nonce, SIG1: signature, TS: timestamp } = tokens;

    // Check timestamp (must be within 5 minutes)
    const requestTime = new Date(timestamp).getTime();
    const serverTime = Date.now();
    const timeDiff = Math.abs(serverTime - requestTime);
    const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000; // 5 minutes

    if (timeDiff > MAX_CLOCK_SKEW_MS) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(`ERR1:timestamp_invalid|ERR2:Timestamp outside acceptable range (${timeDiff}ms difference)|RTO:60`);
    }

    // Check nonce (replay protection)
    const nonceValid = await nonceStore.checkAndMarkNonce(deviceId, nonce);
    if (!nonceValid) {
      return res
        .status(403)
        .set('Content-Type', 'text/plain')
        .send('ERR1:NONCE_REUSE|ERR2:This nonce has already been used|TS:' + new Date().toISOString());
    }

    // Get device public key from database
    const device = await db.get<{ device_public_key: string; status: string }>(
      'SELECT device_public_key, status FROM devices WHERE device_id = ?',
      [deviceId]
    );

    if (!device) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send('ERR1:device_not_found|ERR2:Device not registered');
    }

    if (device.status === 'revoked') {
      return res
        .status(403)
        .set('Content-Type', 'text/plain')
        .send('ERR1:device_revoked|ERR2:Device has been revoked');
    }

    // Verify signature
    const canonicalString = Canonicalize.toCanonicalString(tokens);
    const publicKeyPem = device.device_public_key;
    
    const signatureValid = SignatureUtils.verify(canonicalString, signature, publicKeyPem);
    
    if (!signatureValid) {
      // Log failed verification
      await db.run(
        `INSERT INTO device_heartbeats (
          heartbeat_id, device_id, signature_valid, raw_toon, received_at
        ) VALUES (?, ?, ?, ?, ?)`,
        [heartbeatId, deviceId, 0, rawPayload, new Date().toISOString()]
      );

      return res
        .status(403)
        .set('Content-Type', 'text/plain')
        .send('ERR1:SIG_INVALID|ERR2:Signature verification failed|TS:' + new Date().toISOString());
    }

    // Check rate limit (device-specific)
    const recentHeartbeats = await db.get<{ count: number }>(
      `SELECT COUNT(*) as count FROM device_heartbeats
       WHERE device_id = ? AND received_at > NOW() - INTERVAL '1 hour'`,
      [deviceId]
    );

    if (recentHeartbeats && recentHeartbeats.count >= HEARTBEAT_RATE_LIMIT) {
      return res
        .status(429)
        .set('Content-Type', 'text/plain')
        .send('ERR1:RATE_LIMIT|ERR2:Too many heartbeats, slow down|RTO:300|RTY:300|TS:' + new Date().toISOString());
    }

    // Extract heartbeat data
    const { HB2: uptimeSeconds, HB3: memoryUsageMb, HB4: cpuTempC, HB5: lastBootTimestamp, HB6: networkStatus, FW2: firmwareVersion } = tokens;

    // Update device record
    await db.run(
      `UPDATE devices SET
        last_seen = ?,
        uptime_seconds = ?,
        memory_usage_mb = ?,
        cpu_temp_c = ?,
        last_boot_timestamp = ?,
        network_status = ?,
        firmware_version = ?,
        updated_at = ?
       WHERE device_id = ?`,
      [
        new Date().toISOString(),
        parseInt(uptimeSeconds || '0', 10),
        parseInt(memoryUsageMb || '0', 10),
        parseFloat(cpuTempC || '0'),
        lastBootTimestamp || null,
        networkStatus || 'UNKNOWN',
        firmwareVersion || null,
        new Date().toISOString(),
        deviceId
      ]
    );

    // Store heartbeat record
    await db.run(
      `INSERT INTO device_heartbeats (
        heartbeat_id, device_id, uptime_seconds, memory_usage_mb, cpu_temp_c,
        last_boot_timestamp, network_status, firmware_version, signature_valid, raw_toon, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        heartbeatId,
        deviceId,
        parseInt(uptimeSeconds || '0', 10),
        parseInt(memoryUsageMb || '0', 10),
        parseFloat(cpuTempC || '0'),
        lastBootTimestamp || null,
        networkStatus || 'UNKNOWN',
        firmwareVersion || null,
        1,
        rawPayload,
        new Date().toISOString()
      ]
    );

    // Emit event hook
    await hooks.emit('onDeviceHeartbeat', {
      deviceId,
      heartbeatId,
      uptime: parseInt(uptimeSeconds || '0', 10),
      memoryUsage: parseInt(memoryUsageMb || '0', 10),
      cpuTemp: parseFloat(cpuTempC || '0'),
      networkStatus: networkStatus || 'UNKNOWN',
    });

    // Check for pending commands
    const pendingCommands = await db.all<{ command_id: string }>(
      'SELECT command_id FROM device_commands WHERE device_id = ? AND status = ? ORDER BY issued_at ASC',
      [deviceId, 'pending']
    );

    const commandIds = pendingCommands.map((cmd: { command_id: string }) => cmd.command_id);

    // Check for firmware updates (if current version provided)
    let firmwareAvailable = false;
    let latestFirmwareVersion = null;

    if (firmwareVersion) {
      const device_rec = await db.get<{ device_type: string; ota_policy_id: string | null }>(
        'SELECT device_type, ota_policy_id FROM devices WHERE device_id = ?',
        [deviceId]
      );

      if (device_rec) {
        const latestFirmware = await db.get<{ firmware_version: string }>(
          `SELECT firmware_version FROM firmware_releases
           WHERE device_type = ? AND deprecated_at IS NULL
           AND (ota_policy_id = ? OR ota_policy_id IS NULL)
           ORDER BY created_at DESC LIMIT 1`,
          [device_rec.device_type, device_rec.ota_policy_id]
        );

        if (latestFirmware && latestFirmware.firmware_version !== firmwareVersion) {
          firmwareAvailable = true;
          latestFirmwareVersion = latestFirmware.firmware_version;
        }
      }
    }

    // Build response
    const responseTokens: Record<string, any> = {
      S1: 'ok',
      RTO: 60, // Recommend 60 second heartbeat interval
      TS: new Date().toISOString(),
      PENDING_CMDS: commandIds.length,
    };

    if (commandIds.length > 0) {
      responseTokens.CMD_IDS = commandIds.join('|');
    }

    if (firmwareAvailable) {
      responseTokens.FW_AVAILABLE = 'true';
      responseTokens.FW2 = latestFirmwareVersion;
    }

    const responseToon = Canonicalize.buildPayload(responseTokens);

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(responseToon);

  } catch (error) {
    console.error('[DeviceHeartbeat] Error:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send('ERR1:internal_error|ERR2:' + (error instanceof Error ? error.message : 'Unknown error'));
  }
});

export default router;
