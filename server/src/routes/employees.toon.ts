/**
 * Employees TOON Router
 * Employee management endpoints using 100% TOON protocol
 */

import { Router, Request, Response } from 'express';
import { DatabaseManager } from '../db/DatabaseManager';
import { ToonCodec } from '../utils/ToonCodec';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const db = DatabaseManager.getInstance();

/**
 * POST /api/employees/list
 * List all employees with authentication
 * Request: TOON with COMP1, SESSION1, PIN1
 * Response: TOON with employees array
 */
router.post('/list', async (req: Request, res: Response) => {
  try {
    const toonData = (req as any).toonBody || ToonCodec.decode(req.body);
    console.log('[/employees/list] Received payload:', toonData);
    const companyId = toonData.COMP1 || toonData.companyId;

    if (!companyId) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'missing_company_id', MSG: 'Company ID required' }));
    }

    // Get company UUID from company_code
    const company = await db.get<{ id: string }>(
      'SELECT id FROM companies WHERE company_code = ?',
      [companyId]
    );

    if (!company) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'company_not_found', MSG: 'Company not found' }));
    }

    const rows = await db.query<any>(
      'SELECT * FROM employees WHERE company_id = ? ORDER BY created_at DESC',
      [company.id]
    );

    const employees = rows.map((row: any) => ({
      E1: row.employee_id,
      id: row.employee_id,
      E2: row.name,
      name: row.name,
      E3: row.email || '',
      email: row.email || '',
      E6: row.role || 'General',
      department: row.role || 'General',
      ENR: row.has_face_embeddings || false,
      hasFaceEnrolled: row.has_face_embeddings || false,
      CREATED_AT: row.created_at,
      createdAt: row.created_at,
      S1: row.status,
    }));

    const response = ToonCodec.encode(
      {
        success: true,
        employees,
        total: employees.length,
      },
      { mode: 'typed' }
    );

    console.log('[/employees/list] Sending response, length:', response.length, 'employees:', employees.length);
    console.log('[/employees/list] Response payload:', response);
    res.status(200).set('Content-Type', 'text/plain').send(response);
  } catch (error: any) {
    console.error('Error listing employees:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'failed_to_list_employees', MSG: error.message }));
  }
});

/**
 * GET /api/employees
 * List all employees with pagination and search
 * Query params: PAGE, PAGE_SIZE, SEARCH
 * Response: TOON with EMPLOYEES (batch), TOTAL, PAGE, PAGE_SIZE
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.PAGE as string) || 1;
    const pageSize = parseInt(req.query.PAGE_SIZE as string) || 20;
    const search = (req.query.SEARCH as string) || '';
    const offset = (page - 1) * pageSize;

    let sql = 'SELECT * FROM employees';
    let countSql = 'SELECT COUNT(*) as total FROM employees';
    const params: any[] = [];
    const countParams: any[] = [];

    if (search) {
      sql += ' WHERE name LIKE ? OR email LIKE ? OR employee_id LIKE ?';
      countSql += ' WHERE name LIKE ? OR email LIKE ? OR employee_id LIKE ?';
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const rows = await db.query<any>(sql, params);
    const countResult = await db.get<any>(countSql, countParams);
    const total = (countResult as any)?.total || 0;

    // Convert employees to TOON batch format
    const employeeToons = rows.map((row: any) => employeeRowToToon(row));
    const employeesBatch = employeeToons.map((emp: any) => ToonCodec.encode(emp)).join('||');

    const response = ToonCodec.encode({
      EMPLOYEES: employeesBatch,
      TOTAL: total,
      PAGE: page,
      PAGE_SIZE: pageSize,
    });

    res.status(200).set('Content-Type', 'text/plain').send(response);
  } catch (error: any) {
    console.error('Error listing employees:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'failed_to_list_employees', MSG: error.message }));
  }
});

/**
 * POST /api/employees/enroll
 * Create new employee (enrollment)
 * Request: TOON with COMP1, E2 (name), E3 (email), E6 (department)
 * Response: TOON with E1 (employee_id)
 */
router.post('/enroll', async (req: Request, res: Response) => {
  try {
    const toonData = (req as any).toonBody || ToonCodec.decode(req.body);
    const companyId = toonData.COMP1 || toonData.companyId;
    const name = toonData.E2 || toonData.name;
    const email = toonData.E3 || toonData.email;
    const department = toonData.E6 || toonData.department;

    if (!companyId || !name) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'missing_required_fields', MSG: 'Company ID and name required' }));
    }

    // Get company UUID
    const company = await db.get<{ id: string }>(
      'SELECT id FROM companies WHERE company_code = ?',
      [companyId]
    );

    if (!company) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'company_not_found', MSG: 'Company not found' }));
    }

    const employeeId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO employees (
        employee_id, company_id, name, email, role, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [employeeId, company.id, name, email || null, department || null, 'active', now, now]
    );

    const response = ToonCodec.encode(
      {
        success: true,
        E1: employeeId,
        id: employeeId,
        E2: name,
        name,
        E3: email || '',
        email: email || '',
        STATUS: 'created',
      },
      { mode: 'typed' }
    );

    res.status(201).set('Content-Type', 'text/plain').send(response);
  } catch (error: any) {
    console.error('Error enrolling employee:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'failed_to_enroll_employee', MSG: error.message }));
  }
});

/**
 * POST /api/employees/update
 * Update employee
 * Request: TOON with E1 (employee_id), E2, E3, E6
 * Response: TOON with updated employee data
 */
router.post('/update', async (req: Request, res: Response) => {
  try {
    const toonData = (req as any).toonBody || ToonCodec.decode(req.body);
    const employeeId = toonData.E1 || toonData.id;
    const companyId = toonData.COMP1 || toonData.companyId;

    if (!employeeId || !companyId) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'missing_required_fields', MSG: 'Employee ID and Company ID required' }));
    }

    // Get company UUID
    const company = await db.get<{ id: string }>(
      'SELECT id FROM companies WHERE company_code = ?',
      [companyId]
    );

    if (!company) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'company_not_found', MSG: 'Company not found' }));
    }

    // Check if employee exists
    const existing = await db.get(
      'SELECT * FROM employees WHERE employee_id = ? AND company_id = ?',
      [employeeId, company.id]
    );

    if (!existing) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'employee_not_found', E1: employeeId }));
    }

    const now = new Date().toISOString();
    const name = toonData.E2 || toonData.name || (existing as any).name;
    const email = toonData.E3 !== undefined ? toonData.E3 : toonData.email !== undefined ? toonData.email : (existing as any).email;
    const role = toonData.E6 || toonData.department || (existing as any).role;

    await db.run(
      `UPDATE employees SET name = ?, email = ?, role = ?, updated_at = ? WHERE employee_id = ?`,
      [name, email, role, now, employeeId]
    );

    const response = ToonCodec.encode(
      {
        success: true,
        E1: employeeId,
        E2: name,
        E3: email || '',
        E6: role || '',
        STATUS: 'updated',
      },
      { mode: 'typed' }
    );

    res.status(200).set('Content-Type', 'text/plain').send(response);
  } catch (error: any) {
    console.error('Error updating employee:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'failed_to_update_employee', MSG: error.message }));
  }
});

/**
 * POST /api/employees/delete
 * Delete employee
 * Request: TOON with E1 (employee_id), COMP1
 * Response: TOON with success status
 */
router.post('/delete', async (req: Request, res: Response) => {
  try {
    const toonData = (req as any).toonBody || ToonCodec.decode(req.body);
    const employeeId = toonData.E1 || toonData.id;
    const companyId = toonData.COMP1 || toonData.companyId;

    if (!employeeId || !companyId) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'missing_required_fields', MSG: 'Employee ID and Company ID required' }));
    }

    // Get company UUID
    const company = await db.get<{ id: string }>(
      'SELECT id FROM companies WHERE company_code = ?',
      [companyId]
    );

    if (!company) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'company_not_found', MSG: 'Company not found' }));
    }

    // Check if employee exists
    const existing = await db.get(
      'SELECT * FROM employees WHERE employee_id = ? AND company_id = ?',
      [employeeId, company.id]
    );

    if (!existing) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'employee_not_found', E1: employeeId }));
    }

    // Soft delete by updating status
    const now = new Date().toISOString();
    await db.run(
      `UPDATE employees SET status = ?, updated_at = ? WHERE employee_id = ?`,
      ['deleted', now, employeeId]
    );

    const response = ToonCodec.encode(
      {
        success: true,
        E1: employeeId,
        STATUS: 'deleted',
      },
      { mode: 'typed' }
    );

    res.status(200).set('Content-Type', 'text/plain').send(response);
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'failed_to_delete_employee', MSG: error.message }));
  }
});

/**
 * POST /api/employees/:id
 * Handle employee operations based on T1 field
 * DELETE: Remove employee
 * UPDATE: Update employee details
 */
router.post('/:id', async (req: Request, res: Response) => {
  try {
    const toonData = (req as any).toonBody || ToonCodec.decode(req.body);
    const employeeId = req.params.id;
    const operationType = toonData.T1;
    const companyCode = toonData.COMP1 || toonData.companyId;

    // Get company UUID if provided
    let companyId: string | undefined;
    if (companyCode) {
      const company = await db.get<{ id: string }>(
        'SELECT id FROM companies WHERE company_code = ?',
        [companyCode]
      );
      if (company) {
        companyId = company.id;
      }
    }

    // Handle delete operation
    if (operationType === 'EMPLOYEE_DELETE') {
      // Check if employee exists
      const query = companyId
        ? 'SELECT * FROM employees WHERE employee_id = ? AND company_id = ?'
        : 'SELECT * FROM employees WHERE employee_id = ?';
      const params = companyId ? [employeeId, companyId] : [employeeId];
      
      const existing = await db.get(query, params);
      if (!existing) {
        return res
          .status(404)
          .set('Content-Type', 'text/plain')
          .send(ToonCodec.encode({ ERR: 'employee_not_found', E1: employeeId }));
      }

      // Soft delete: set status to deleted
      const now = new Date().toISOString();
      await db.run(
        'UPDATE employees SET status = ?, updated_at = ? WHERE employee_id = ?',
        ['deleted', now, employeeId]
      );

      const response = ToonCodec.encode(
        {
          success: true,
          E1: employeeId,
          S1: 'deleted',
          STATUS: 'success',
        },
        { mode: 'typed' }
      );

      return res.status(200).set('Content-Type', 'text/plain').send(response);
    }

    // Handle update operation
    if (operationType === 'EMPLOYEE_UPDATE') {
      const query = companyId
        ? 'SELECT * FROM employees WHERE employee_id = ? AND company_id = ?'
        : 'SELECT * FROM employees WHERE employee_id = ?';
      const params = companyId ? [employeeId, companyId] : [employeeId];
      
      const existing = await db.get(query, params);
      if (!existing) {
        return res
          .status(404)
          .set('Content-Type', 'text/plain')
          .send(ToonCodec.encode({ ERR: 'employee_not_found', E1: employeeId }));
      }

      const now = new Date().toISOString();
      const name = toonData.E2 || toonData.name || (existing as any).name;
      const email = toonData.E3 !== undefined ? toonData.E3 : toonData.email !== undefined ? toonData.email : (existing as any).email;
      const role = toonData.E6 || toonData.department || (existing as any).role;

      await db.run(
        `UPDATE employees SET name = ?, email = ?, role = ?, updated_at = ? WHERE employee_id = ?`,
        [name, email, role, now, employeeId]
      );

      const response = ToonCodec.encode(
        {
          success: true,
          E1: employeeId,
          E2: name,
          E3: email || '',
          E6: role || '',
          STATUS: 'updated',
        },
        { mode: 'typed' }
      );

      return res.status(200).set('Content-Type', 'text/plain').send(response);
    }

    // Unknown operation
    return res
      .status(400)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'unknown_operation', MSG: `Unknown operation type: ${operationType}` }));

  } catch (error: any) {
    console.error('Error handling employee operation:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'operation_failed', MSG: error.message }));
  }
});

/**
 * GET /api/employees/:id
 * Get single employee details with attendance stats
 * Response: TOON with employee data + biometric status
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.id;

    const row = await db.get('SELECT * FROM employees WHERE employee_id = ?', [employeeId]);

    if (!row) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'employee_not_found', E1: employeeId }));
    }

    const employeeToon = employeeRowToToon(row);

    // Get attendance stats
    const statsRow = await db.get(
      `SELECT 
        COUNT(*) as total_events,
        MAX(timestamp) as last_timestamp,
        (SELECT event_type FROM attendance_events WHERE employee_id = ? ORDER BY timestamp DESC LIMIT 1) as last_event
       FROM attendance_events WHERE employee_id = ?`,
      [employeeId, employeeId]
    ) as any;

    if (statsRow) {
      employeeToon.TOTAL_EVENTS = statsRow.total_events || 0;
      employeeToon.LAST_EVENT = statsRow.last_event || '';
      if (statsRow.last_timestamp) {
        employeeToon.M2 = statsRow.last_timestamp;
      }
    }

    const response = ToonCodec.encode(employeeToon);
    res.status(200).set('Content-Type', 'text/plain').send(response);
  } catch (error: any) {
    console.error('Error getting employee:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'failed_to_get_employee', MSG: error.message }));
  }
});

/**
 * POST /api/employees
 * Create new employee
 * Request: TOON with E2 (name), E3 (email), E4 (phone), E5 (role), S1 (status)
 * Response: TOON with E1 (employee_id)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const toonData = (req as any).toonBody;

    // Validate required fields
    if (!toonData.E2) {
      return res
        .status(400)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'missing_required_field', FIELD: 'E2' }));
    }

    const employeeId = uuidv4();
    const now = new Date().toISOString();

    await db.run(
      `INSERT INTO employees (
        employee_id, name, email, phone, role, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeId,
        toonData.E2,
        toonData.E3 || null,
        toonData.E4 || null,
        toonData.E5 || null,
        toonData.S1 || 'active',
        now,
        now,
      ]
    );

    const response = ToonCodec.encode({
      E1: employeeId,
      E2: toonData.E2,
      S1: toonData.S1 || 'active',
      STATUS: 'created',
    });

    res.status(201).set('Content-Type', 'text/plain').send(response);
  } catch (error: any) {
    console.error('Error creating employee:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'failed_to_create_employee', MSG: error.message }));
  }
});

/**
 * PUT /api/employees/:id
 * Update employee
 * Request: TOON with E2, E3, E4, E5, S1
 * Response: TOON with updated employee data
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.id;
    const toonData = (req as any).toonBody;

    // Check if employee exists
    const existing = await db.get('SELECT * FROM employees WHERE employee_id = ?', [employeeId]);
    if (!existing) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'employee_not_found', E1: employeeId }));
    }

    const now = new Date().toISOString();

    await db.run(
      `UPDATE employees SET
        name = ?,
        email = ?,
        phone = ?,
        role = ?,
        status = ?,
        updated_at = ?
       WHERE employee_id = ?`,
      [
        toonData.E2 || (existing as any).name,
        toonData.E3 !== undefined ? toonData.E3 : (existing as any).email,
        toonData.E4 !== undefined ? toonData.E4 : (existing as any).phone,
        toonData.E5 !== undefined ? toonData.E5 : (existing as any).role,
        toonData.S1 || (existing as any).status,
        now,
        employeeId,
      ]
    );

    // Fetch updated employee
    const updated = await db.get('SELECT * FROM employees WHERE employee_id = ?', [employeeId]);
    const response = ToonCodec.encode({
      ...employeeRowToToon(updated),
      STATUS: 'updated',
    });

    res.status(200).set('Content-Type', 'text/plain').send(response);
  } catch (error: any) {
    console.error('Error updating employee:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'failed_to_update_employee', MSG: error.message }));
  }
});

/**
 * POST /api/employees/:id/delete
 * Delete employee (soft delete by setting status to inactive)
 * Response: TOON with S1:deleted
 */
router.post('/:id/delete', async (req: Request, res: Response) => {
  try {
    const employeeId = req.params.id;

    // Check if employee exists
    const existing = await db.get('SELECT * FROM employees WHERE employee_id = ?', [employeeId]);
    if (!existing) {
      return res
        .status(404)
        .set('Content-Type', 'text/plain')
        .send(ToonCodec.encode({ ERR: 'employee_not_found', E1: employeeId }));
    }

    // Soft delete: set status to inactive
    await db.run('UPDATE employees SET status = ? WHERE employee_id = ?', ['inactive', employeeId]);

    const response = ToonCodec.encode({
      E1: employeeId,
      S1: 'deleted',
      STATUS: 'success',
    });

    res.status(200).set('Content-Type', 'text/plain').send(response);
  } catch (error: any) {
    console.error('Error deleting employee:', error);
    res
      .status(500)
      .set('Content-Type', 'text/plain')
      .send(ToonCodec.encode({ ERR: 'failed_to_delete_employee', MSG: error.message }));
  }
});

/**
 * Helper: Convert database row to TOON tokens
 */
function employeeRowToToon(row: any): Record<string, any> {
  return {
    E1: row.employee_id,
    E2: row.name,
    E3: row.email || '',
    E4: row.phone || '',
    E5: row.role || '',
    S1: row.status,
    F2: row.has_face_embeddings === 1,
    FP1: row.has_fingerprint_data === 1,
    D1: row.enrolled_device_id || '',
    D2: row.enrolled_device_type || '',
    M1: row.created_at,
    M2: row.last_attendance_timestamp || '',
  };
}

export default router;
