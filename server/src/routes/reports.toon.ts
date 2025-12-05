/**
 * reports.toon.ts - Analytics and Excel Report Generation Endpoints
 * ALL requests and responses use TOON encoding - NO JSON
 */

import { Router, Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { ToonCodec, ToonValidator, ToonResponseBuilder } from '../utils/ToonCodec';
import { DatabaseManager } from '../db/DatabaseManager';
import { AttendanceEventRecord } from '../db/schema';
import { EventHooksManager } from '../utils/EventHooks';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const db = DatabaseManager.getInstance();
const hooks = EventHooksManager.getInstance();

// Reports directory
const REPORTS_DIR = path.join(__dirname, '../../reports');
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

/**
 * GET /api/reports
 * List all reports with TOON encoding
 * 
 * Response: REPORTS batch separated by ||
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const reports = await db.query<{
      report_id: string;
      from_timestamp: string;
      to_timestamp: string;
      employee_id: string | null;
      status: string;
      created_at: string;
      file_size: number;
      output_format: string;
    }>(
      'SELECT report_id, from_timestamp, to_timestamp, employee_id, status, created_at, file_size, output_format FROM reports ORDER BY created_at DESC LIMIT 50',
      []
    );

    if (reports.length === 0) {
      return res
        .status(200)
        .set('Content-Type', 'text/plain')
        .send('REPORTS:|TOTAL:0');
    }

    // Encode each report and join with ||
    const reportStrings = reports.map(report => {
      return ToonCodec.encode({
        R1: report.report_id,
        T1: report.from_timestamp,
        T2: report.to_timestamp,
        E1: report.employee_id || undefined,
        S1: report.status,
        GENERATED_AT: report.created_at,
        FILE_SIZE: report.file_size,
        DOWNLOAD_TOKEN: report.output_format === 'XLSX' ? 'xlsx' : 'csv',
      });
    });

    const response = ToonCodec.encode({
      REPORTS: reportStrings.join('||'),
      TOTAL: reports.length,
    });

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(response);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(
        ToonResponseBuilder.error({
          ERR1: 'fetch_reports_failed',
          ERR2: (error as Error).message,
        })
      );
  }
});

/**
 * POST /api/reports/attendance
 * Generate Excel Report with TOON request
 * 
 * Request TOON tokens: R1, E1?, T1, T2, F1?, O1?
 * Response: Binary XLSX + X-TOON-RESP header
 */
router.post('/attendance', async (req: Request, res: Response) => {
  try {
    const rawPayload = req.body;

    if (!rawPayload) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'empty_payload' }));
    }

    // Decode TOON request
    const request = ToonCodec.decode(rawPayload);

    // Validate request
    const validation = ToonValidator.validateReportRequest(request);

    if (!validation.valid) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error(validation.errors));
    }

    // Generate report ID
    const reportId = request.R1 || `RPT_${Date.now()}_${uuidv4().slice(0, 8)}`;
    const outputFormat = request.O1 || 'XLSX';

    // Query attendance events
    let sql = `
      SELECT * FROM attendance_events
      WHERE timestamp >= ? AND timestamp <= ?
    `;
    const params: any[] = [request.T1, request.T2];

    if (request.E1) {
      sql += ' AND employee_id = ?';
      params.push(request.E1);
    }

    // Parse filters if present
    if (request.F1) {
      const filters = typeof request.F1 === 'object' ? request.F1 : ToonCodec.decode(request.F1);
      
      if (filters.eventType) {
        sql += ' AND event_type = ?';
        params.push(filters.eventType);
      }
      if (filters.deviceId) {
        sql += ' AND device_id = ?';
        params.push(filters.deviceId);
      }
    }

    sql += ' ORDER BY timestamp ASC';

    const events = await db.query<AttendanceEventRecord>(sql, params);

    // Generate analytics
    const analytics = generateAnalytics(events);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'KS Attendance System';
    workbook.created = new Date();

    // Sheet 1: Raw Events
    await addRawEventsSheet(workbook, events);

    // Sheet 2: Daily Summary
    await addDailySummarySheet(workbook, events);

    // Sheet 3: Employee Summary
    await addEmployeeSummarySheet(workbook, events);

    // Sheet 4: Breaks Report
    await addBreaksReportSheet(workbook, events);

    // Sheet 5: Exceptions
    await addExceptionsSheet(workbook, events);

    // Sheet 6: TOON Meta (hidden)
    await addToonMetaSheet(workbook, request, reportId);

    // Save to file
    const filename = `${reportId}.xlsx`;
    const filepath = path.join(REPORTS_DIR, filename);
    await workbook.xlsx.writeFile(filepath);

    const fileSize = fs.statSync(filepath).size;

    // Store report record in database
    await db.run(
      `
      INSERT INTO reports (
        report_id, request_toon, employee_id, from_timestamp, to_timestamp,
        output_format, filters, file_path, file_size, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready')
    `,
      [
        reportId,
        ToonCodec.encode(request),
        request.E1 || null,
        request.T1,
        request.T2,
        outputFormat,
        request.F1 ? ToonCodec.encode(request.F1) : null,
        filepath,
        fileSize,
      ]
    );

    // Emit report generated hook
    await hooks.emit('onReportGenerated', { reportId, analytics, eventCount: events.length });

    // Build TOON response header
    const responseToonHeader = ToonCodec.encode({
      S1: 'ok',
      R1: reportId,
      COUNT: events.length,
      SIZE: fileSize,
    });

    // Send binary XLSX
    res
      .status(200)
      .set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .set('Content-Disposition', `attachment; filename="${filename}"`)
      .set('X-TOON-RESP', responseToonHeader)
      .sendFile(filepath);
  } catch (error) {
    console.error('Error generating report:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(
        ToonResponseBuilder.error({
          ERR1: 'report_generation_failed',
          ERR2: (error as Error).message,
        })
      );
  }
});

/**
 * GET /api/reports/summary
 * Quick TOON Analytics for Admin UI
 * 
 * Query: ?q=<toon-encoded-filters>
 * Response: TOON-encoded summary (M1-M5)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const queryToon = req.query.q as string || '';
    
    let filters: Record<string, any> = {};
    let fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - 30); // Default last 30 days
    let toDate = new Date();

    if (queryToon) {
      filters = ToonCodec.decode(queryToon);
      if (filters.T1) fromDate = new Date(filters.T1);
      if (filters.T2) toDate = new Date(filters.T2);
    }

    // Query events
    let sql = 'SELECT * FROM attendance_events WHERE timestamp >= ? AND timestamp <= ?';
    const params: any[] = [fromDate.toISOString(), toDate.toISOString()];

    if (filters.E1) {
      sql += ' AND employee_id = ?';
      params.push(filters.E1);
    }

    const events = await db.query<AttendanceEventRecord>(sql, params);

    // Calculate summary metrics
    const uniqueEmployees = new Set(events.map(e => e.employee_id)).size;

    // Calculate punctuality (events with no late flag or within grace period)
    const checkInEvents = events.filter(e => e.event_type === 'IN');
    const punctualEvents = checkInEvents.filter(e => {
      // Assume punctual if no rejection_reason contains "late"
      return !e.rejection_reason?.includes('late');
    });
    const avgPunctuality = checkInEvents.length > 0
      ? Math.round((punctualEvents.length / checkInEvents.length) * 100)
      : 100;

    // Calculate total over-break minutes
    const totalOverBreakMinutes = events
      .filter(e => e.is_over_break)
      .reduce((sum, e) => sum + (e.break_duration || 0), 0);

    // Count late check-ins
    const totalLateInCount = events.filter(e => 
      e.event_type === 'IN' && e.rejection_reason?.includes('late')
    ).length;

    // Get most recent report ID
    const latestReport = await db.get<{ report_id: string }>(
      'SELECT report_id FROM reports ORDER BY generated_at DESC LIMIT 1',
      []
    );

    // Build TOON response
    const responseToon = ToonResponseBuilder.analyticsSummary({
      totalEmployees: uniqueEmployees,
      avgPunctuality,
      totalOverBreakMinutes,
      totalLateInCount,
      reportId: latestReport?.report_id,
    });

    return res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(responseToon);
  } catch (error) {
    console.error('Error fetching summary:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(
        ToonResponseBuilder.error({
          ERR1: 'summary_fetch_failed',
          ERR2: (error as Error).message,
        })
      );
  }
});

/**
 * DELETE /api/reports/:reportId
 * Delete a report and its file
 */
router.delete('/:reportId', async (req: Request, res: Response) => {
  try {
    const reportId = req.params.reportId;

    const report = await db.get<{ report_id: string; file_path: string }>(
      'SELECT report_id, file_path FROM reports WHERE report_id = ?',
      [reportId]
    );

    if (!report) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'report_not_found' }));
    }

    // Delete file if exists
    if (fs.existsSync(report.file_path)) {
      fs.unlinkSync(report.file_path);
    }

    // Delete database record
    await db.run('DELETE FROM reports WHERE report_id = ?', [reportId]);

    res
      .status(200)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ S1: 'ok', R1: reportId }));
  } catch (error) {
    console.error('Error deleting report:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(
        ToonResponseBuilder.error({
          ERR1: 'delete_failed',
          ERR2: (error as Error).message,
        })
      );
  }
});

/**
 * GET /api/reports/:reportId/download
 * Download previously generated report
 */
router.get('/:reportId/download', async (req: Request, res: Response) => {
  try {
    const reportId = req.params.reportId;

    const report = await db.get<{ report_id: string; file_path: string; file_size: number; status: string }>(
      'SELECT * FROM reports WHERE report_id = ?',
      [reportId]
    );

    if (!report) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'report_not_found' }));
    }

    if (report.status !== 'ready') {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'report_not_ready', S1: report.status }));
    }

    if (!fs.existsSync(report.file_path)) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonResponseBuilder.error({ ERR1: 'report_file_not_found' }));
    }

    const filename = path.basename(report.file_path);

    res
      .status(200)
      .set('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .set('Content-Disposition', `attachment; filename="${filename}"`)
      .sendFile(report.file_path);
  } catch (error) {
    console.error('Error downloading report:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(
        ToonResponseBuilder.error({
          ERR1: 'download_failed',
          ERR2: (error as Error).message,
        })
      );
  }
});

/**
 * Helper: Generate analytics summary
 */
function generateAnalytics(events: AttendanceEventRecord[]): any {
  const checkIns = events.filter(e => e.event_type === 'IN');

  // Calculate total days present (unique dates with check-in)
  const uniqueDates = new Set(
    checkIns.map(e => e.timestamp.split('T')[0])
  );

  // Calculate total hours worked (pair check-ins with check-outs)
  let totalHoursWorked = 0;
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let lastCheckIn: Date | null = null;
  for (const event of sortedEvents) {
    if (event.event_type === 'IN') {
      lastCheckIn = new Date(event.timestamp);
    } else if (event.event_type === 'OUT' && lastCheckIn) {
      const checkOut = new Date(event.timestamp);
      const hoursWorked = (checkOut.getTime() - lastCheckIn.getTime()) / (1000 * 60 * 60);
      totalHoursWorked += hoursWorked;
      lastCheckIn = null;
    }
  }

  // Calculate break statistics
  const totalBreakMinutes = events
    .filter(e => e.break_duration)
    .reduce((sum, e) => sum + (e.break_duration || 0), 0);

  const overBreakMinutes = events
    .filter(e => e.is_over_break)
    .reduce((sum, e) => sum + (e.break_duration || 0), 0);

  const allowedBreakMinutes = totalBreakMinutes - overBreakMinutes;

  // Overtime events
  const overtimeEvents = events.filter(e => 
    e.event_type === 'OVERTIME_IN' || e.event_type === 'OVERTIME_OUT'
  );

  // Punctuality
  const lateCheckIns = checkIns.filter(e => e.rejection_reason?.includes('late'));
  const punctualityPercent = checkIns.length > 0
    ? Math.round(((checkIns.length - lateCheckIns.length) / checkIns.length) * 100)
    : 100;

  return {
    totalDaysPresent: uniqueDates.size,
    totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
    totalAllowedBreakMinutes: allowedBreakMinutes,
    totalOverBreakMinutes: overBreakMinutes,
    totalOvertimeEvents: overtimeEvents.length,
    punctualityPercent,
    lateCheckInCount: lateCheckIns.length,
  };
}

/**
 * Sheet 1: Raw Events
 */
async function addRawEventsSheet(workbook: ExcelJS.Workbook, events: AttendanceEventRecord[]): Promise<void> {
  const sheet = workbook.addWorksheet('Raw Events');

  // Define columns (map from TOON tokens)
  sheet.columns = [
    { header: 'Event ID (A1)', key: 'event_id', width: 25 },
    { header: 'Employee ID (E1)', key: 'employee_id', width: 20 },
    { header: 'Event Type (A2)', key: 'event_type', width: 15 },
    { header: 'Timestamp (A3)', key: 'timestamp', width: 25 },
    { header: 'Device ID (D1)', key: 'device_id', width: 20 },
    { header: 'Location (L1)', key: 'location', width: 30 },
    { header: 'Face Score (F3)', key: 'face_match_score', width: 12 },
    { header: 'Fingerprint Score (FP2)', key: 'fingerprint_match_score', width: 15 },
    { header: 'Liveness (S2)', key: 'liveness_score', width: 12 },
    { header: 'Quality (S3)', key: 'quality_score', width: 12 },
    { header: 'Break Type (B1)', key: 'break_type', width: 15 },
    { header: 'Break Duration (B2)', key: 'break_duration', width: 15 },
    { header: 'Over Break (B3)', key: 'is_over_break', width: 12 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Received At', key: 'received_at', width: 25 },
  ];

  // Style header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  // Add data
  events.forEach(event => {
    sheet.addRow({
      event_id: event.event_id,
      employee_id: event.employee_id,
      event_type: event.event_type,
      timestamp: event.timestamp,
      device_id: event.device_id,
      location: event.location_lat && event.location_lng
        ? `${event.location_lat},${event.location_lng}`
        : '',
      face_match_score: event.face_match_score,
      fingerprint_match_score: event.fingerprint_match_score,
      liveness_score: event.liveness_score,
      quality_score: event.quality_score,
      break_type: event.break_type,
      break_duration: event.break_duration,
      is_over_break: event.is_over_break ? 'YES' : 'NO',
      status: event.status,
      received_at: event.received_at,
    });
  });
}

/**
 * Sheet 2: Daily Summary
 */
async function addDailySummarySheet(workbook: ExcelJS.Workbook, events: AttendanceEventRecord[]): Promise<void> {
  const sheet = workbook.addWorksheet('Daily Summary');

  // Group by date
  const dailyData = new Map<string, { checkIns: number; checkOuts: number; breaks: number }>();

  events.forEach(event => {
    const date = event.timestamp.split('T')[0];
    if (!dailyData.has(date)) {
      dailyData.set(date, { checkIns: 0, checkOuts: 0, breaks: 0 });
    }

    const data = dailyData.get(date)!;
    if (event.event_type === 'IN') data.checkIns++;
    if (event.event_type === 'OUT') data.checkOuts++;
    if (event.event_type === 'BREAK_START') data.breaks++;
  });

  sheet.columns = [
    { header: 'Date', key: 'date', width: 15 },
    { header: 'Check-Ins', key: 'checkIns', width: 12 },
    { header: 'Check-Outs', key: 'checkOuts', width: 12 },
    { header: 'Breaks', key: 'breaks', width: 12 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  dailyData.forEach((data, date) => {
    sheet.addRow({
      date,
      checkIns: data.checkIns,
      checkOuts: data.checkOuts,
      breaks: data.breaks,
    });
  });
}

/**
 * Sheet 3: Employee Summary
 */
async function addEmployeeSummarySheet(workbook: ExcelJS.Workbook, events: AttendanceEventRecord[]): Promise<void> {
  const sheet = workbook.addWorksheet('Employee Summary');

  // Group by employee
  const employeeData = new Map<string, {
    checkIns: number;
    totalHours: number;
    breakMinutes: number;
    lateCount: number;
  }>();

  events.forEach(event => {
    if (!employeeData.has(event.employee_id)) {
      employeeData.set(event.employee_id, {
        checkIns: 0,
        totalHours: 0,
        breakMinutes: 0,
        lateCount: 0,
      });
    }

    const data = employeeData.get(event.employee_id)!;
    if (event.event_type === 'IN') {
      data.checkIns++;
      if (event.rejection_reason?.includes('late')) {
        data.lateCount++;
      }
    }
    if (event.break_duration) {
      data.breakMinutes += event.break_duration;
    }
  });

  sheet.columns = [
    { header: 'Employee ID (E1)', key: 'employee_id', width: 20 },
    { header: 'Total Check-Ins', key: 'checkIns', width: 15 },
    { header: 'Total Break Minutes', key: 'breakMinutes', width: 18 },
    { header: 'Late Count', key: 'lateCount', width: 12 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  employeeData.forEach((data, employeeId) => {
    sheet.addRow({
      employee_id: employeeId,
      checkIns: data.checkIns,
      breakMinutes: data.breakMinutes,
      lateCount: data.lateCount,
    });
  });
}

/**
 * Sheet 4: Breaks Report
 */
async function addBreaksReportSheet(workbook: ExcelJS.Workbook, events: AttendanceEventRecord[]): Promise<void> {
  const sheet = workbook.addWorksheet('Breaks Report');

  const breakEvents = events.filter(e => 
    e.event_type === 'BREAK_START' || e.event_type === 'BREAK_END'
  );

  sheet.columns = [
    { header: 'Employee ID (E1)', key: 'employee_id', width: 20 },
    { header: 'Break Type (B1)', key: 'break_type', width: 15 },
    { header: 'Duration (B2 mins)', key: 'break_duration', width: 18 },
    { header: 'Over Break (B3)', key: 'is_over_break', width: 15 },
    { header: 'Timestamp (A3)', key: 'timestamp', width: 25 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD3D3D3' },
  };

  breakEvents.forEach(event => {
    if (event.event_type === 'BREAK_END') {
      sheet.addRow({
        employee_id: event.employee_id,
        break_type: event.break_type,
        break_duration: event.break_duration,
        is_over_break: event.is_over_break ? 'YES' : 'NO',
        timestamp: event.timestamp,
      });
    }
  });
}

/**
 * Sheet 5: Exceptions
 */
async function addExceptionsSheet(workbook: ExcelJS.Workbook, events: AttendanceEventRecord[]): Promise<void> {
  const sheet = workbook.addWorksheet('Exceptions');

  const exceptions = events.filter(e => 
    e.status === 'rejected' || e.is_over_break || e.rejection_reason
  );

  sheet.columns = [
    { header: 'Event ID (A1)', key: 'event_id', width: 25 },
    { header: 'Employee ID (E1)', key: 'employee_id', width: 20 },
    { header: 'Event Type (A2)', key: 'event_type', width: 15 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Reason (R1)', key: 'rejection_reason', width: 40 },
    { header: 'Timestamp (A3)', key: 'timestamp', width: 25 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFC7CE' },
  };

  exceptions.forEach(event => {
    sheet.addRow({
      event_id: event.event_id,
      employee_id: event.employee_id,
      event_type: event.event_type,
      status: event.status,
      rejection_reason: event.rejection_reason || (event.is_over_break ? 'Over break limit' : ''),
      timestamp: event.timestamp,
    });
  });
}

/**
 * Sheet 6: TOON Meta (hidden)
 */
async function addToonMetaSheet(
  workbook: ExcelJS.Workbook,
  request: Record<string, any>,
  reportId: string
): Promise<void> {
  const sheet = workbook.addWorksheet('TOON Meta', { state: 'hidden' });

  sheet.columns = [
    { header: 'Token Key', key: 'key', width: 15 },
    { header: 'Token Value', key: 'value', width: 50 },
  ];

  sheet.getRow(1).font = { bold: true };

  // Add original request tokens
  sheet.addRow({ key: 'R1', value: reportId });
  Object.entries(request).forEach(([key, value]) => {
    sheet.addRow({ key, value: String(value) });
  });
}

export default router;
