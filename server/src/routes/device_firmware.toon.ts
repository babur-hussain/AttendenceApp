/**
 * Device Firmware Routes (TOON Protocol)
 * Handles firmware checks, downloads, and acknowledgements
 */

import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../db/DatabaseManager';
import { NonceStore } from '../utils/nonceStore';
import { SignatureUtils } from '../utils/signature';
import { Canonicalize } from '../utils/canonicalize';
import { EventHooksManager } from '../utils/EventHooks';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const router = Router();
const db = DatabaseManager.getInstance();
const nonceStore = NonceStore.getInstance();
const hooks = EventHooksManager.getInstance();

const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY || '';
const FIRMWARE_DIR = process.env.FIRMWARE_DIR || path.join(__dirname, '../../firmware');

/**
 * POST /api/devices/firmware/check
 * Device checks if firmware update available
 */
router.post('/firmware/check', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;
    if (!rawPayload) {
      return res.status(400).set('Content-Type', 'text/plain').send('ERR1:empty_payload');
    }

    const tokens = Canonicalize.parseTokens(rawPayload);
    const required = ['D1', 'FW2', 'TS', 'NONCE', 'SIG1'];
    const validation = Canonicalize.validateRequiredTokens(tokens, required);
    
    if (!validation.valid) {
      return res.status(400).set('Content-Type', 'text/plain').send(`ERR1:missing_tokens`);
    }

    const { D1: deviceId, FW2: currentVersion, NONCE: nonce, SIG1: signature } = tokens;

    // Verify nonce
    const nonceValid = await nonceStore.checkAndMarkNonce(deviceId, nonce);
    if (!nonceValid) {
      return res.status(403).set('Content-Type', 'text/plain').send('ERR1:NONCE_REUSE');
    }

    // Get device
    const device = await db.get<{ device_public_key: string; device_type: string; ota_policy_id: string | null }>(
      'SELECT device_public_key, device_type, ota_policy_id FROM devices WHERE device_id = ?',
      [deviceId]
    );

    if (!device) {
      return res.status(404).set('Content-Type', 'text/plain').send('ERR1:device_not_found');
    }

    // Verify signature
    const canonicalString = Canonicalize.toCanonicalString(tokens);
    if (!SignatureUtils.verify(canonicalString, signature, device.device_public_key)) {
      return res.status(403).set('Content-Type', 'text/plain').send('ERR1:SIG_INVALID');
    }

    // Query latest firmware
    const latestFirmware = await db.get<{
      firmware_id: string;
      firmware_version: string;
      bundle_url: string;
      checksum: string;
      size_bytes: number;
      server_signature: string;
    }>(
      `SELECT firmware_id, firmware_version, bundle_url, checksum, size_bytes, server_signature
       FROM firmware_releases
       WHERE device_type = ? AND deprecated_at IS NULL
       AND (ota_policy_id = ? OR ota_policy_id IS NULL)
       ORDER BY created_at DESC LIMIT 1`,
      [device.device_type, device.ota_policy_id]
    );

    // Log check
    await db.run(
      `INSERT INTO device_firmware_status (device_id, firmware_id, firmware_version, check_timestamp, status, raw_toon)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [deviceId, latestFirmware?.firmware_id || null, currentVersion, new Date().toISOString(), 'checking', rawPayload]
    );

    if (!latestFirmware || latestFirmware.firmware_version === currentVersion) {
      return res.status(200).set('Content-Type', 'text/plain').send(`S1:no_update|RTO:3600|TS:${new Date().toISOString()}`);
    }

    // Generate signed short-lived URL token
    const urlToken = SignatureUtils.sign(
      `${latestFirmware.firmware_id}|${deviceId}|${Date.now() + 3600000}`,
      SERVER_PRIVATE_KEY
    );
    const signedUrl = `/api/devices/firmware/download?token=${encodeURIComponent(urlToken)}`;

    const responseTokens = {
      S1: 'update_available',
      FW1: latestFirmware.firmware_id,
      FW2: latestFirmware.firmware_version,
      FW3: signedUrl,
      FW4: latestFirmware.checksum,
      FW5: latestFirmware.size_bytes.toString(),
      FW_SIG: latestFirmware.server_signature,
      O1: device.ota_policy_id || 'default',
      TS: new Date().toISOString(),
    };

    const responseToon = Canonicalize.buildPayload(responseTokens);
    res.status(200).set('Content-Type', 'text/plain').send(responseToon);

  } catch (error) {
    console.error('[DeviceFirmware] Check Error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('ERR1:internal_error');
  }
});

/**
 * POST /api/devices/firmware/ack
 * Device reports firmware application result
 */
router.post('/firmware/ack', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;
    if (!rawPayload) {
      return res.status(400).set('Content-Type', 'text/plain').send('ERR1:empty_payload');
    }

    const tokens = Canonicalize.parseTokens(rawPayload);
    const required = ['D1', 'FW1', 'FW2', 'ACK1', 'TS', 'NONCE', 'SIG1'];
    const validation = Canonicalize.validateRequiredTokens(tokens, required);
    
    if (!validation.valid) {
      return res.status(400).set('Content-Type', 'text/plain').send(`ERR1:missing_tokens`);
    }

    const { D1: deviceId, FW1: firmwareId, FW2: firmwareVersion, ACK1: ackStatus, ACK2: ackMessage, LOG1: logsReference, NONCE: nonce, SIG1: signature } = tokens;

    // Verify nonce
    const nonceValid = await nonceStore.checkAndMarkNonce(deviceId, nonce);
    if (!nonceValid) {
      return res.status(403).set('Content-Type', 'text/plain').send('ERR1:NONCE_REUSE');
    }

    // Get device
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
      return res.status(403).set('Content-Type', 'text/plain').send('ERR1:SIG_INVALID');
    }

    // Update firmware status
    await db.run(
      `UPDATE device_firmware_status SET
        applied_at = ?,
        status = ?,
        ack_status = ?,
        ack_message = ?,
        logs_reference = ?,
        signature_valid = ?
       WHERE device_id = ? AND firmware_id = ?`,
      [
        new Date().toISOString(),
        ackStatus === 'OK' ? 'applied' : 'failed',
        ackStatus,
        ackMessage || null,
        logsReference || null,
        1,
        deviceId,
        firmwareId
      ]
    );

    // Update device firmware version if successful
    if (ackStatus === 'OK') {
      await db.run(
        'UPDATE devices SET firmware_version = ?, updated_at = ? WHERE device_id = ?',
        [firmwareVersion, new Date().toISOString(), deviceId]
      );
    } else {
      // Emit failure alert
      await hooks.emit('onFirmwareFailure', {
        deviceId,
        firmwareId,
        firmwareVersion,
        ackMessage,
        logsReference,
      });
    }

    res.status(200).set('Content-Type', 'text/plain').send(`S1:ok|TS:${new Date().toISOString()}`);

  } catch (error) {
    console.error('[DeviceFirmware] ACK Error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('ERR1:internal_error');
  }
});

/**
 * GET /api/devices/firmware/download
 * Secure firmware bundle download
 */
router.get('/firmware/download', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      return res.status(400).set('Content-Type', 'text/plain').send('ERR1:missing_token');
    }

    // Verify token (contains firmwareId|deviceId|expiry)
    // In production, implement proper token verification
    
    // For demo, extract firmware ID from token
    // In real implementation, decrypt/verify signed token
    
    const firmwarePath = path.join(FIRMWARE_DIR, 'sample_firmware.bin');
    
    if (!fs.existsSync(firmwarePath)) {
      return res.status(404).set('Content-Type', 'text/plain').send('ERR1:firmware_not_found');
    }

    const firmwareBuffer = fs.readFileSync(firmwarePath);
    const checksum = crypto.createHash('sha256').update(firmwareBuffer).digest('hex');

    res
      .status(200)
      .set('Content-Type', 'application/octet-stream')
      .set('Content-Disposition', 'attachment; filename="firmware.bin"')
      .set('X-Firmware-Checksum', checksum)
      .send(firmwareBuffer);

  } catch (error) {
    console.error('[DeviceFirmware] Download Error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('ERR1:internal_error');
  }
});

export default router;
