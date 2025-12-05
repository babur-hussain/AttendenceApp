/**
 * Device Logs Routes (TOON Protocol)
 * Handles device diagnostic log uploads
 */

import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../db/DatabaseManager';
import { NonceStore } from '../utils/nonceStore';
import { SignatureUtils } from '../utils/signature';
import { Canonicalize } from '../utils/canonicalize';

const router = Router();
const db = DatabaseManager.getInstance();
const nonceStore = NonceStore.getInstance();

/**
 * POST /api/devices/logs
 * Device uploads diagnostic logs
 */
router.post('/logs', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;
    
    if (!rawPayload) {
      return res.status(400).set('Content-Type', 'text/plain').send('ERR1:empty_payload');
    }

    const tokens = Canonicalize.parseTokens(rawPayload);
    const required = ['D1', 'LOG1', 'LOG2', 'TS', 'NONCE', 'SIG1'];
    const validation = Canonicalize.validateRequiredTokens(tokens, required);
    
    if (!validation.valid) {
      return res.status(400).set('Content-Type', 'text/plain').send(`ERR1:missing_tokens|ERR2:${validation.missing.join(',')}`);
    }

    const { D1: deviceId, LOG1: logId, LOG2: logLevel, LOG4: logTimestamp, CMD1: commandId, FW1: firmwareId, NONCE: nonce, SIG1: signature } = tokens;

    // Verify nonce
    const nonceValid = await nonceStore.checkAndMarkNonce(deviceId, nonce);
    if (!nonceValid) {
      return res.status(403).set('Content-Type', 'text/plain').send('ERR1:NONCE_REUSE|TS:' + new Date().toISOString());
    }

    // Get device public key
    const device = await db.get<{ device_public_key: string }>(
      'SELECT device_public_key FROM devices WHERE device_id = ?',
      [deviceId]
    );

    if (!device) {
      return res.status(404).set('Content-Type', 'text/plain').send('ERR1:device_not_found');
    }

    // Verify signature
    const canonicalString = Canonicalize.toCanonicalString(tokens);
    if (!SignatureUtils.verify(canonicalString, signature, device.device_public_key)) {
      return res.status(403).set('Content-Type', 'text/plain').send('ERR1:SIG_INVALID|TS:' + new Date().toISOString());
    }

    // Parse log entries (array tokens)
    const logEntries = Canonicalize.parseArrayTokens(tokens, 'LOG');

    // Store logs
    await db.run(
      `INSERT INTO device_logs (
        log_id, device_id, log_level, log_timestamp, command_id, firmware_id, log_entries, raw_toon, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        logId,
        deviceId,
        logLevel,
        logTimestamp || new Date().toISOString(),
        commandId || null,
        firmwareId || null,
        JSON.stringify(logEntries), // Store as JSON internally (encrypted at rest)
        rawPayload,
        new Date().toISOString()
      ]
    );

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(`S1:ok|LOG1:${logId}|TS:${new Date().toISOString()}`);

  } catch (error) {
    console.error('[DeviceLogs] Error:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send('ERR1:internal_error|ERR2:' + (error instanceof Error ? error.message : 'Unknown'));
  }
});

/**
 * GET /api/devices/logs/:logId
 * Retrieve specific log by ID (Admin endpoint)
 */
router.get('/logs/:logId', async (req: Request, res: Response) => {
  try {
    const { logId } = req.params;

    const log = await db.get<{
      log_id: string;
      device_id: string;
      log_level: string;
      log_timestamp: string;
      log_entries: string;
      uploaded_at: string;
    }>(
      'SELECT log_id, device_id, log_level, log_timestamp, log_entries, uploaded_at FROM device_logs WHERE log_id = ?',
      [logId]
    );

    if (!log) {
      return res.status(404).set('Content-Type', 'text/plain').send('ERR1:log_not_found');
    }

    // Build TOON response
    const responseTokens: Record<string, string> = {
      LOG1: log.log_id,
      D1: log.device_id,
      LOG2: log.log_level,
      LOG4: log.log_timestamp,
      UPLOADED_AT: log.uploaded_at,
    };

    // Parse and include log entries
    const entries = JSON.parse(log.log_entries);
    entries.forEach((entry: any, index: number) => {
      Object.keys(entry).forEach(key => {
        responseTokens[`LOG[${index}].${key}`] = entry[key];
      });
    });

    const responseToon = Canonicalize.buildPayload(responseTokens);
    res.status(200).set('Content-Type', 'text/plain').send(responseToon);

  } catch (error) {
    console.error('[DeviceLogs] GET Error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('ERR1:internal_error');
  }
});

export default router;
