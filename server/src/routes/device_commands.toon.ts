/**
 * Device Commands Routes (TOON Protocol)
 * Handles command queueing, polling, and acknowledgement
 */

import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../db/DatabaseManager';
import { NonceStore } from '../utils/nonceStore';
import { SignatureUtils } from '../utils/signature';
import { Canonicalize } from '../utils/canonicalize';
import { EventHooksManager } from '../utils/EventHooks';

const router = Router();
const db = DatabaseManager.getInstance();
const nonceStore = NonceStore.getInstance();
const hooks = EventHooksManager.getInstance();

// Server private key for signing commands (in production, load from secure vault)
const SERVER_PRIVATE_KEY = process.env.SERVER_PRIVATE_KEY || '';

/**
 * GET /api/devices/commands
 * Device polls for pending commands
 */
router.get('/commands', async (req: Request, res: Response) => {
  try {
    const toonQuery = req.query.toon as string;
    
    if (!toonQuery) {
      return res.status(400).set('Content-Type', 'text/plain').send('ERR1:missing_toon_query');
    }

    const tokens = Canonicalize.parseTokens(toonQuery);
    const { D1: deviceId, NONCE: nonce, SIG1: signature, TS: timestamp } = tokens;

    if (!deviceId || !nonce || !signature) {
      return res.status(400).set('Content-Type', 'text/plain').send('ERR1:missing_tokens');
    }

    // Verify nonce
    const nonceValid = await nonceStore.checkAndMarkNonce(deviceId, nonce);
    if (!nonceValid) {
      return res.status(403).set('Content-Type', 'text/plain').send('ERR1:NONCE_REUSE');
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
      return res.status(403).set('Content-Type', 'text/plain').send('ERR1:SIG_INVALID');
    }

    // Query pending commands
    const commands = await db.all<{
      command_id: string;
      command_name: string;
      command_payload: string | null;
      command_priority: string;
      expires_at: string | null;
      issued_at: string;
      server_signature: string;
    }>(
      `SELECT command_id, command_name, command_payload, command_priority, expires_at, issued_at, server_signature
       FROM device_commands
       WHERE device_id = ? AND status = ? AND (expires_at IS NULL OR expires_at > ?)
       ORDER BY command_priority DESC, issued_at ASC`,
      [deviceId, 'pending', new Date().toISOString()]
    );

    if (commands.length === 0) {
      return res.status(200).set('Content-Type', 'text/plain').send(`S1:no_commands|TS:${new Date().toISOString()}`);
    }

    // Build command array tokens
    const arrayTokens: Record<string, string> = {
      CMD_COUNT: commands.length.toString(),
    };

    commands.forEach((cmd, index) => {
      arrayTokens[`CMD[${index}].CMD1`] = cmd.command_id;
      arrayTokens[`CMD[${index}].CMD2`] = cmd.command_name;
      if (cmd.command_payload) {
        arrayTokens[`CMD[${index}].CMD3`] = cmd.command_payload;
      }
      arrayTokens[`CMD[${index}].CMD4`] = cmd.command_priority;
      if (cmd.expires_at) {
        arrayTokens[`CMD[${index}].CMD5`] = cmd.expires_at;
      }
      arrayTokens[`CMD[${index}].TS`] = cmd.issued_at;
      arrayTokens[`CMD[${index}].SIG_SERV`] = cmd.server_signature;
    });

    const responseToon = Canonicalize.buildPayload(arrayTokens);
    res.status(200).set('Content-Type', 'text/plain').send(responseToon);

  } catch (error) {
    console.error('[DeviceCommands] GET Error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('ERR1:internal_error');
  }
});

/**
 * POST /api/devices/command-ack
 * Device acknowledges command execution
 */
router.post('/command-ack', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;
    if (!rawPayload) {
      return res.status(400).set('Content-Type', 'text/plain').send('ERR1:empty_payload');
    }

    const tokens = Canonicalize.parseTokens(rawPayload);
    const required = ['D1', 'CMD1', 'ACK1', 'TS', 'NONCE', 'SIG1'];
    const validation = Canonicalize.validateRequiredTokens(tokens, required);
    
    if (!validation.valid) {
      return res.status(400).set('Content-Type', 'text/plain').send(`ERR1:missing_tokens|ERR2:${validation.missing.join(',')}`);
    }

    const { D1: deviceId, CMD1: commandId, ACK1: ackStatus, ACK2: ackMessage, ACK3: executionTimeMs, NONCE: nonce, SIG1: signature } = tokens;

    // Verify nonce
    const nonceValid = await nonceStore.checkAndMarkNonce(deviceId, nonce);
    if (!nonceValid) {
      return res.status(403).set('Content-Type', 'text/plain').send('ERR1:NONCE_REUSE');
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
      return res.status(403).set('Content-Type', 'text/plain').send('ERR1:SIG_INVALID');
    }

    // Update command status
    await db.run(
      `UPDATE device_commands SET
        status = ?,
        completed_at = ?,
        ack_status = ?,
        ack_message = ?,
        execution_time_ms = ?,
        raw_toon_ack = ?
       WHERE command_id = ? AND device_id = ?`,
      [
        'completed',
        new Date().toISOString(),
        ackStatus,
        ackMessage || null,
        executionTimeMs ? parseInt(executionTimeMs, 10) : null,
        rawPayload,
        commandId,
        deviceId
      ]
    );

    // Emit event hook
    await hooks.emit('onCommandAcknowledged', {
      deviceId,
      commandId,
      ackStatus,
      ackMessage,
      executionTimeMs: executionTimeMs ? parseInt(executionTimeMs, 10) : null,
    });

    res.status(200).set('Content-Type', 'text/plain').send(`S1:ok|TS:${new Date().toISOString()}`);

  } catch (error) {
    console.error('[DeviceCommands] POST Error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('ERR1:internal_error');
  }
});

/**
 * POST /api/devices/commands/issue (Admin endpoint)
 * Create a new command for a device
 */
router.post('/commands/issue', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;
    const tokens = Canonicalize.parseTokens(rawPayload);
    
    const { D1: deviceId, CMD2: commandName, CMD3: commandPayload, CMD4: commandPriority, CMD5: expiresAt } = tokens;

    if (!deviceId || !commandName) {
      return res.status(400).set('Content-Type', 'text/plain').send('ERR1:missing_required_tokens');
    }

    const commandId = `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const issuedAt = new Date().toISOString();

    // Sign command with server private key
    const commandTokens = {
      CMD1: commandId,
      CMD2: commandName,
      CMD3: commandPayload || '',
      CMD4: commandPriority || 'NORMAL',
      CMD5: expiresAt || '',
      TS: issuedAt,
    };
    const commandCanonical = Canonicalize.toCanonicalString(commandTokens);
    const serverSignature = SignatureUtils.sign(commandCanonical, SERVER_PRIVATE_KEY);

    // Insert command
    await db.run(
      `INSERT INTO device_commands (
        command_id, device_id, command_name, command_payload, command_priority, expires_at, issued_at, server_signature, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        commandId,
        deviceId,
        commandName,
        commandPayload || null,
        commandPriority || 'NORMAL',
        expiresAt || null,
        issuedAt,
        serverSignature,
        'pending'
      ]
    );

    res.status(200).set('Content-Type', 'text/plain').send(`S1:ok|CMD1:${commandId}|TS:${issuedAt}`);

  } catch (error) {
    console.error('[DeviceCommands] Issue Error:', error);
    res.status(500).set('Content-Type', 'text/plain').send('ERR1:internal_error');
  }
});

export default router;
