/**
 * devices.toon.ts - Device Management and Event Ingestion Endpoints
 * ALL requests and responses use TOON encoding - NO JSON
 */

import { Router, Request, Response } from 'express';
import { ToonCodec, ToonValidator, ToonResponseBuilder } from '../utils/ToonCodec';
import { DatabaseManager } from '../db/DatabaseManager';
import { DbHelper, AttendanceEventRecord, DeviceRecord } from '../db/schema';
import { EventHooksManager } from '../utils/EventHooks';
import { checkRateLimit } from '../middleware/rateLimit';

const router = Router();
const db = DatabaseManager.getInstance();
const hooks = EventHooksManager.getInstance();

/**
 * POST /api/devices/events
 * Ingest TOON Attendance Events
 * 
 * Request: Raw TOON payload (binary/text) with event tokens
 * Response: TOON-encoded per-event status
 */
router.post('/events', checkRateLimit, async (req: Request, res: Response) => {
  try {
    // Read raw body (configured in middleware to accept binary/text)
    const rawPayload = req.body;
    
    // Check if body exists
    if (!rawPayload) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'empty_payload' }));
    }

    // Decode TOON batch payload
    const events = ToonCodec.decodeBatch(rawPayload);
    
    if (events.length === 0) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR2: 'no_events_decoded' }));
    }

    // Process each event
    const results: Array<{ eventId: string; status: string; reason?: string }> = [];

    for (const event of events) {
      // Validate event schema
      const validation = ToonValidator.validateAttendanceEvent(event);
      
      if (!validation.valid) {
        results.push({
          eventId: event.A1 || 'unknown',
          status: 'rejected',
          reason: ToonCodec.encode(validation.errors),
        });

        // Emit invalid event hook
        await hooks.emit('onInvalidEvent', { event, errors: validation.errors });
        continue;
      }

      // Check for duplicate event_id
      const existingEvent = await db.get<{ event_id: string }>(
        'SELECT event_id FROM attendance_events WHERE event_id = ?',
        [event.A1]
      );

      if (existingEvent) {
        results.push({
          eventId: event.A1,
          status: 'duplicate',
        });

        // Emit duplicate event hook
        await hooks.emit('onDuplicateEvent', { event });

        // Log audit
        await logAudit({
          event_id: event.A1,
          device_id: event.D1,
          raw_toon_payload: ToonCodec.encode(event),
          server_response_toon: 'S1:duplicate',
          status: 'duplicate',
        });

        continue;
      }

      // Convert TOON to database record
      const rawToon = ToonCodec.encode(event);
      const record = DbHelper.toonToEventRecord(event, rawToon);

      // Insert into database
      try {
        await db.run(
          `
          INSERT INTO attendance_events (
            event_id, employee_id, event_type, timestamp, device_id,
            location_lat, location_lng, location_accuracy,
            face_match_score, fingerprint_match_score,
            liveness_score, quality_score, consent_token,
            break_type, break_duration, is_over_break,
            device_signature, metadata, raw_toon, status
          ) VALUES (
            ?, ?, ?, ?, ?,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?, ?,
            ?, ?, ?, ?
          )
        `,
          [
            record.event_id,
            record.employee_id,
            record.event_type,
            record.timestamp,
            record.device_id,
            record.location_lat ?? null,
            record.location_lng ?? null,
            record.location_accuracy ?? null,
            record.face_match_score ?? null,
            record.fingerprint_match_score ?? null,
            record.liveness_score ?? null,
            record.quality_score ?? null,
            record.consent_token ?? null,
            record.break_type ?? null,
            record.break_duration ?? null,
            record.is_over_break ?? false,
            record.device_signature ?? null,
            record.metadata ?? null,
            record.raw_toon,
            record.status ?? 'processed',
          ]
        );

        results.push({
          eventId: event.A1,
          status: 'accepted',
        });

        // Update device last_seen_at
        await db.run(
          'UPDATE devices SET last_seen_at = NOW() WHERE device_id = ?',
          [event.D1]
        );

        // Emit ingestion hook
        await hooks.emit('onEventIngested', { event, record });

        // Log audit
        await logAudit({
          event_id: event.A1,
          device_id: event.D1,
          raw_toon_payload: rawToon,
          server_response_toon: 'S1:accepted',
          status: 'accepted',
        });
      } catch (dbError) {
        results.push({
          eventId: event.A1,
          status: 'rejected',
          reason: `db_error:${(dbError as Error).message}`,
        });

        // Log audit
        await logAudit({
          event_id: event.A1,
          device_id: event.D1,
          raw_toon_payload: ToonCodec.encode(event),
          server_response_toon: `S1:rejected|R1:${(dbError as Error).message}`,
          status: 'rejected',
          error_tokens: ToonCodec.encode({ ERR1: (dbError as Error).message }),
        });
      }
    }

    // Build TOON batch response
    const responseToon = ToonResponseBuilder.batchEventStatus(results);

    return res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(responseToon);
  } catch (error) {
    console.error('Error ingesting events:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(
        ToonResponseBuilder.error({
          ERR1: 'internal_server_error',
          ERR2: (error as Error).message,
        })
      );
  }
});

/**
 * POST /api/devices/register
 * Register or Update Device
 * 
 * Request TOON tokens: D1, D2, D3, D4
 * Response: TOON device record with status
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;

    if (!rawPayload) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'empty_payload' }));
    }

    // Decode TOON payload
    const device = ToonCodec.decode(rawPayload);

    // Validate device schema
    const validation = ToonValidator.validateDeviceRegistration(device);

    if (!validation.valid) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error(validation.errors));
    }

    // Check if device already exists
    const existingDevice = await db.get<DeviceRecord>(
      'SELECT * FROM devices WHERE device_id = ?',
      [device.D1]
    );

    if (existingDevice) {
      // Update existing device
      await db.run(
        `
        UPDATE devices
        SET device_type = ?,
            device_public_key = ?,
            public_key = ?,
            capabilities = ?,
            last_seen_at = NOW(),
            status = 'active'
        WHERE device_id = ?
      `,
        [device.D2, device.D3 || null, device.D3 || null, device.D4, device.D1]
      );

      const updatedDevice = await db.get<DeviceRecord>(
        'SELECT * FROM devices WHERE device_id = ?',
        [device.D1]
      );

      if (!updatedDevice) {
        const errorToon = ToonResponseBuilder.error({ DATABASE_ERROR: 'Failed to retrieve updated device' });
        return res.status(500).set('Content-Type', 'text/plain').send(errorToon);
      }


      // Emit device registered hook
      await hooks.emit('onDeviceRegistered', { device: updatedDevice, isNew: false });

      // Build response
      const responseToon = ToonCodec.encode({
        S1: 'updated',
        D1: updatedDevice.device_id,
        D2: updatedDevice.device_type,
        D4: updatedDevice.capabilities,
        REG: updatedDevice.registered_at,
        LAST: updatedDevice.last_seen_at,
      });

      return res
        .status(200)
        .set('Content-Type', 'text/plain')
        .send(responseToon);
    }

    // Insert new device
    await db.run(
      'INSERT INTO devices (device_id, device_type, device_public_key, public_key, capabilities) VALUES (?, ?, ?, ?, ?)',
      [device.D1, device.D2, device.D3 || null, device.D3 || null, device.D4]
    );

    const newDevice = await db.get<DeviceRecord>(
      'SELECT * FROM devices WHERE device_id = ?',
      [device.D1]
    );

    if (!newDevice) {
      const errorToon = ToonResponseBuilder.error({ DATABASE_ERROR: 'Failed to retrieve new device' });
      return res.status(500).set('Content-Type', 'text/plain').send(errorToon);
    }


    // Emit device registered hook
    await hooks.emit('onDeviceRegistered', { device: newDevice, isNew: true });

    // Build response
    const responseToon = ToonCodec.encode({
      S1: 'registered',
      D1: newDevice.device_id,
      D2: newDevice.device_type,
      D4: newDevice.capabilities,
      REG: newDevice.registered_at,
    });

    return res
      .status(201)
      .set('Content-Type', 'text/plain')
      .send(responseToon);
  } catch (error) {
    console.error('Error registering device:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(
        ToonResponseBuilder.error({
          ERR1: 'internal_server_error',
          ERR2: (error as Error).message,
        })
      );
  }
});

/**
 * GET /api/devices/events
 * Paginated event listing with TOON query params
 * 
 * Query: ?q=<toon-encoded-filters>
 * Response: TOON-encoded event batch with pagination tokens
 */
router.get('/events', async (req: Request, res: Response) => {
  try {
    const queryToon = req.query.q as string || '';
    
    let filters: Record<string, any> = {};
    let limit = 50;
    let offset = 0;

    if (queryToon) {
      filters = ToonCodec.decode(queryToon);
      limit = filters.P2 || 50;
      offset = filters.P1 || 0;
    }

    // Build SQL query
    let sql = 'SELECT * FROM attendance_events WHERE 1=1';
    const params: any[] = [];

    if (filters.E1) {
      sql += ' AND employee_id = ?';
      params.push(filters.E1);
    }

    if (filters.D1) {
      sql += ' AND device_id = ?';
      params.push(filters.D1);
    }

    if (filters.T1) {
      sql += ' AND timestamp >= ?';
      params.push(filters.T1);
    }

    if (filters.T2) {
      sql += ' AND timestamp <= ?';
      params.push(filters.T2);
    }

    sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const events = await db.query<AttendanceEventRecord>(sql, params);

    // Convert to TOON batch
    const toonEvents = events.map(event => DbHelper.eventRecordToToon(event));
    const responseToon = ToonCodec.encodeBatch(toonEvents);

    // Add pagination tokens
    const paginationToon = ToonCodec.encode({
      P1: offset + events.length,
      P2: limit,
      COUNT: events.length,
    });

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .set('X-TOON-PAGINATION', paginationToon)
      .send(responseToon);
  } catch (error) {
    console.error('Error fetching events:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(
        ToonResponseBuilder.error({
          ERR1: 'internal_server_error',
          ERR2: (error as Error).message,
        })
      );
  }
});

/**
 * GET /api/devices
 * List all registered devices with TOON encoding
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const devices = await db.query<DeviceRecord>(
      'SELECT * FROM devices ORDER BY registered_at DESC',
      []
    );

    if (devices.length === 0) {
      return res
        .status(200)
        .set('Content-Type', 'text/plain')
        .send('DEVICES:|TOTAL:0');
    }

    // Encode each device and join with ||
    const deviceStrings = devices.map(device => {
      return ToonCodec.encode({
        D1: device.device_id,
        D2: device.device_type,
        DS1: device.status || 'OFFLINE',
        DS2: device.last_seen_at || device.registered_at,
        D3: device.capabilities || '',
        D4: 'unknown', // firmware_version not in schema
        D5: '', // public_key_fingerprint not in schema
        M1: undefined, // policy_id not in schema
        M2: device.registered_at,
      });
    });

    const response = ToonCodec.encode({
      DEVICES: deviceStrings.join('||'),
      TOTAL: devices.length,
    });

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(response);
  } catch (error) {
    console.error('Error fetching devices:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonResponseBuilder.error({
        ERR1: 'fetch_devices_failed',
        ERR2: (error as Error).message,
      }));
  }
});

/**
 * GET /api/devices/:deviceId
 * Get single device details
 */
router.get('/:deviceId', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const device = await db.get<DeviceRecord>(
      'SELECT * FROM devices WHERE device_id = ?',
      [deviceId]
    );

    if (!device) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'device_not_found' }));
    }

    const response = ToonCodec.encode({
      D1: device.device_id,
      D2: device.device_type,
      DS1: device.status || 'OFFLINE',
      DS2: device.last_seen_at || device.registered_at,
      D3: device.capabilities || '',
      D4: 'unknown', // firmware_version not in schema
      D5: '', // public_key_fingerprint not in schema
      M1: undefined, // policy_id not in schema,
      M2: device.registered_at,
      PK1: device.public_key,
    });

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(response);
  } catch (error) {
    console.error('Error fetching device:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonResponseBuilder.error({
        ERR1: 'fetch_device_failed',
        ERR2: (error as Error).message,
      }));
  }
});

/**
 * GET /api/devices/:deviceId/events
 * Get device events
 */
router.get('/:deviceId/events', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const limit = parseInt(req.query.LIMIT as string) || 50;

    const events = await db.query<AttendanceEventRecord>(
      'SELECT * FROM attendance_events WHERE device_id = ? ORDER BY timestamp DESC LIMIT ?',
      [deviceId, limit]
    );

    if (events.length === 0) {
      return res
        .status(200)
        .set('Content-Type', 'text/plain')
        .send('EVENTS:|TOTAL:0');
    }

    const eventStrings = events.map(event => {
      return ToonCodec.encode({
        E1: event.event_id,
        D1: event.device_id,
        ET1: event.event_type,
        TS: event.timestamp,
        PL1: event.raw_toon,
        S1: event.status,
      });
    });

    const response = ToonCodec.encode({
      EVENTS: eventStrings.join('||'),
      TOTAL: events.length,
    });

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(response);
  } catch (error) {
    console.error('Error fetching device events:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonResponseBuilder.error({
        ERR1: 'fetch_events_failed',
        ERR2: (error as Error).message,
      }));
  }
});

/**
 * GET /api/devices/:deviceId/health
 * Get device health metrics
 */
router.get('/:deviceId/health', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    // Mock health data - in production, this would come from device heartbeats
    const response = ToonCodec.encode({
      D1: deviceId,
      H1: Math.floor(Math.random() * 86400), // uptime in seconds
      H2: Math.floor(Math.random() * 1024), // memory MB
      H3: Math.floor(Math.random() * 40) + 30, // temp C
      TS: new Date().toISOString(),
    });

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(response);
  } catch (error) {
    console.error('Error fetching device health:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonResponseBuilder.error({
        ERR1: 'fetch_health_failed',
        ERR2: (error as Error).message,
      }));
  }
});

/**
 * GET /api/devices/events/health
 * Get overall health summary
 */
router.get('/events/health', async (req: Request, res: Response) => {
  try {
    const devices = await db.query<DeviceRecord>(
      'SELECT status FROM devices',
      []
    );

    const online = devices.filter(d => d.status === 'ONLINE').length;
    const offline = devices.filter(d => d.status === 'OFFLINE').length;
    const error = devices.filter(d => d.status === 'ERROR').length;

    const response = ToonCodec.encode({
      ONLINE: online,
      OFFLINE: offline,
      ERROR: error,
      TOTAL: devices.length,
      UPDATED_AT: new Date().toISOString(),
    });

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(response);
  } catch (error) {
    console.error('Error fetching health summary:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonResponseBuilder.error({
        ERR1: 'fetch_health_summary_failed',
        ERR2: (error as Error).message,
      }));
  }
});

/**
 * POST /api/devices/command
 * Execute device command
 */
router.post('/command', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;

    if (!rawPayload) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'empty_payload' }));
    }

    const command = ToonCodec.decode(rawPayload);

    // Validate command
    if (!command.D1 || !command.CMD1) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'missing_required_fields' }));
    }

    // Check device exists
    const device = await db.get<DeviceRecord>(
      'SELECT * FROM devices WHERE device_id = ?',
      [command.D1]
    );

    if (!device) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'device_not_found' }));
    }

    // Log command (in production, would send to device)
    console.log(`Executing command ${command.CMD1} on device ${command.D1}`);

    // Emit hook
    await hooks.emit('onDeviceCommand', {
      deviceId: command.D1,
      command: command.CMD1,
      signature: command.SIG1,
    });

    const response = ToonCodec.encode({
      S1: 'ok',
      D1: command.D1,
      CMD1: command.CMD1,
      MSG: `Command ${command.CMD1} queued for execution`,
    });

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(response);
  } catch (error) {
    console.error('Error executing command:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonResponseBuilder.error({
        ERR1: 'command_failed',
        ERR2: (error as Error).message,
      }));
  }
});

/**
 * POST /api/devices/revoke
 * Revoke device
 */
router.post('/revoke', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;

    if (!rawPayload) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'empty_payload' }));
    }

    const request = ToonCodec.decode(rawPayload);

    if (!request.D1) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'missing_device_id' }));
    }

    // Update device status to revoked
    await db.run(
      'UPDATE devices SET status = ?, last_seen = ? WHERE device_id = ?',
      ['REVOKED', new Date().toISOString(), request.D1]
    );

    // Emit hook
    await hooks.emit('onDeviceRevoked', { deviceId: request.D1 });

    const response = ToonCodec.encode({
      S1: 'ok',
      D1: request.D1,
      MSG: 'Device revoked successfully',
    });

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(response);
  } catch (error) {
    console.error('Error revoking device:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonResponseBuilder.error({
        ERR1: 'revoke_failed',
        ERR2: (error as Error).message,
      }));
  }
});

/**
 * POST /api/devices/bulk-revoke
 * Bulk revoke devices
 */
router.post('/bulk-revoke', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;

    if (!rawPayload) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'empty_payload' }));
    }

    const request = ToonCodec.decode(rawPayload);

    if (!request.DEVICE_IDS) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'missing_device_ids' }));
    }

    const deviceIds = request.DEVICE_IDS.split(',');

    // Revoke each device
    let revokedCount = 0;
    for (const deviceId of deviceIds) {
      try {
        await db.run(
          'UPDATE devices SET status = ?, last_seen = ? WHERE device_id = ?',
          ['REVOKED', new Date().toISOString(), deviceId.trim()]
        );
        revokedCount++;
      } catch (err) {
        console.error(`Failed to revoke device ${deviceId}:`, err);
      }
    }

    const response = ToonCodec.encode({
      S1: 'ok',
      REVOKED_COUNT: revokedCount,
      MSG: `${revokedCount} device(s) revoked successfully`,
    });

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(response);
  } catch (error) {
    console.error('Error bulk revoking:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonResponseBuilder.error({
        ERR1: 'bulk_revoke_failed',
        ERR2: (error as Error).message,
      }));
  }
});

/**
 * GET /api/devices/export
 * Export devices list to XLSX/CSV
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const format = (req.query.FORMAT as string) || 'XLSX';

    const devices = await db.query<DeviceRecord>(
      'SELECT * FROM devices ORDER BY registered_at DESC',
      []
    );

    // For now, return TOON-encoded list (in production, would generate Excel/CSV)
    const deviceStrings = devices.map(device => {
      return ToonCodec.encode({
        D1: device.device_id,
        D2: device.device_type,
        DS1: device.status || 'OFFLINE',
        DS2: device.last_seen_at || device.registered_at,
        D3: device.capabilities || '',
        D4: 'unknown', // firmware_version not in schema
        D5: '', // public_key_fingerprint not in schema
      });
    });

    const content = deviceStrings.join('\n');

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .set('Content-Disposition', `attachment; filename="devices_export.${format.toLowerCase()}"`)
      .send(content);
  } catch (error) {
    console.error('Error exporting devices:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonResponseBuilder.error({
        ERR1: 'export_failed',
        ERR2: (error as Error).message,
      }));
  }
});

/**
 * Helper: Log audit record
 */
async function logAudit(audit: {
  event_id: string;
  device_id: string;
  raw_toon_payload: string;
  server_response_toon: string;
  status: string;
  error_tokens?: string;
}): Promise<void> {
  await db.run(
    `
    INSERT INTO audit_logs (
      event_id, device_id, raw_toon_payload,
      server_response_toon, status, error_tokens
    ) VALUES (?, ?, ?, ?, ?, ?)
  `,
    [
      audit.event_id,
      audit.device_id,
      audit.raw_toon_payload,
      audit.server_response_toon,
      audit.status,
      audit.error_tokens || null,
    ]
  );
}

export default router;
