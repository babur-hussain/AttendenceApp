import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { DatabaseManager } from '../db/DatabaseManager';
import { ToonCodec } from '../utils/ToonCodec';
import { SupabaseService } from '../services/SupabaseService';

const router = Router();
console.log('[company.toon] routes loaded');
const TOON_CONTENT_TYPE = 'application/toon';

interface CompanyRecord {
  id: string;
  company_code: string;
  name: string;
}

interface CompanyUserRecord {
  id: string;
  name: string | null;
  role: string;
  status: string;
}

interface CompanyUserWithCompany extends CompanyUserRecord {
  companyId: string;
  companyCode: string;
  companyName: string;
}

function sendToonResponse(res: Response, status: number, payload: Record<string, any>) {
  const body = ToonCodec.encode(payload, { mode: 'typed' });
  return res.status(status).set('Content-Type', TOON_CONTENT_TYPE).send(body);
}

function buildError(code: string, message: string, details?: Record<string, any>) {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

function extractString(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}

function hashValue(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function getCompanyByCode(code: string): Promise<CompanyRecord | undefined> {
  const db = DatabaseManager.getInstance();
  return db.get<CompanyRecord>('SELECT id, company_code, name FROM companies WHERE company_code = ?', [code]);
}

async function getCompanyUser(companyId: string, email: string): Promise<CompanyUserRecord | undefined> {
  const db = DatabaseManager.getInstance();
  return db.get<CompanyUserRecord>(
    `SELECT id, name, role, status
     FROM users
     WHERE company_id = ? AND LOWER(email) = LOWER(?)`,
    [companyId, email]
  );
}

async function getCompanyUserWithCompanyByEmail(email: string): Promise<CompanyUserWithCompany | undefined> {
  const db = DatabaseManager.getInstance();
  return db.get<CompanyUserWithCompany>(
    `SELECT u.id,
            u.name,
            u.role,
            u.status,
            u.company_id AS "companyId",
            c.company_code AS "companyCode",
            c.name AS "companyName"
     FROM users u
     INNER JOIN companies c ON c.id = u.company_id
     WHERE LOWER(u.email) = LOWER(?)
     ORDER BY u.updated_at DESC
     LIMIT 1`,
    [email]
  );
}

async function getCount(query: string, params: any[]): Promise<number> {
  const db = DatabaseManager.getInstance();
  const row = await db.get<{ total: number }>(query, params);
  return row?.total ?? 0;
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const toonData = ToonCodec.decode(req.body);
    const companyCode = extractString(toonData.companyId || toonData.COMP1 || '').toUpperCase();
    const email = extractString(toonData.email || toonData.U1 || '').toLowerCase();
    const password = extractString(toonData.password || toonData.P1 || toonData.U2 || '');

    if (!email || !password) {
      return sendToonResponse(
        res,
        400,
        buildError('missing_fields', 'Email and password are required')
      );
    }

    let user: CompanyUserWithCompany | undefined;

    if (companyCode) {
      const company = await getCompanyByCode(companyCode);
      if (!company) {
        return sendToonResponse(res, 404, buildError('company_not_found', 'Company not found'));
      }

      const companyUser = await getCompanyUser(company.id, email);
      if (!companyUser) {
        return sendToonResponse(res, 401, buildError('invalid_credentials', 'Invalid company login'));
      }

      user = {
        ...companyUser,
        companyId: company.id,
        companyCode: company.company_code,
        companyName: company.name,
      };
    } else {
      user = await getCompanyUserWithCompanyByEmail(email);
      if (!user) {
        return sendToonResponse(res, 401, buildError('invalid_credentials', 'Invalid company login'));
      }
    }

    if (user.status === 'locked') {
      return sendToonResponse(res, 403, buildError('account_locked', 'Account locked'));
    }

    const resolvedCompanyCode = (user.companyCode || companyCode || '').trim();
    if (!resolvedCompanyCode) {
      return sendToonResponse(
        res,
        500,
        buildError('missing_company_id', 'Company ID could not be resolved from login context')
      );
    }

    const authData = await SupabaseService.signInWithPassword(email, password);
    const session = authData.session;

    await DatabaseManager.getInstance().run(
      'UPDATE users SET last_login_at = NOW(), failed_attempts = 0 WHERE id = ?',
      [user.id]
    );

    const [employeesCount, devicesCount] = await Promise.all([
      getCount('SELECT COUNT(*)::int AS total FROM employees WHERE company_id = ?', [user.companyId]),
      getCount('SELECT COUNT(*)::int AS total FROM devices WHERE company_id = ?', [user.companyId]),
    ]);

    const expiresIn = session.expires_in ?? 3600;

    return sendToonResponse(res, 200, {
      success: true,
      S1: 'OK',
      COMP1: resolvedCompanyCode,
      COMP2: user.companyName,
      COMPANY_ID: user.companyId,
      COMPANY_CODE: resolvedCompanyCode,
      U1: email,
      U2: user.name || email,
      R1: user.role,
      SESSION1: session.access_token,
      REFRESH1: session.refresh_token ?? '',
      EX1: expiresIn,
      employeesCount,
      devicesCount,
      policiesCount: 0,
    });
  } catch (error) {
    console.error('Company login error:', error);
    return sendToonResponse(res, 500, buildError('server_error', 'Failed to process company login'));
  }
});

router.post('/create-request', async (req: Request, res: Response) => {
  const db = DatabaseManager.getInstance();
  let createdSupabaseUserId: string | null = null;

  try {
    const toonData = ToonCodec.decode(req.body);
    const companyName = extractString(toonData.companyName || toonData.COMP2 || '');
    const companyCode = extractString(toonData.companyId || toonData.COMP1 || '').toUpperCase();
    const industry = extractString(toonData.IND1 || toonData.industry || '');
    const teamSizeRaw = extractString(toonData.teamSize || toonData.TEAM_SIZE || '0');
    const adminName = extractString(toonData.adminName || toonData.U2 || toonData.managerName || '');
    const workEmail = extractString(toonData.workEmail || toonData.U1 || '').toLowerCase();
    const phoneNumber = extractString(toonData.phoneNumber || toonData.PH1 || '');
    const password = extractString(toonData.password || toonData.P1 || toonData.PW1 || '');
    const managementPin = extractString(toonData.managementPin || toonData.PIN1 || toonData.MPIN1 || '');

    if (!companyName || !companyCode || !workEmail || !password || !managementPin) {
      return sendToonResponse(
        res,
        400,
        buildError('missing_fields', 'Company details, admin email, password, and mPIN are required')
      );
    }

    const existingCompany = await getCompanyByCode(companyCode);
    if (existingCompany) {
      return sendToonResponse(res, 409, buildError('company_exists', 'Company code already exists'));
    }

    const supabaseUser = await SupabaseService.createAuthUser({
      email: workEmail,
      password,
      metadata: {
        companyCode,
        role: 'ADMIN',
        name: adminName,
      },
    });

    createdSupabaseUserId = supabaseUser.id;

    const managementPinHash = hashValue(managementPin);
    const passwordHash = hashValue(password);
    const settings = {
      industry,
      teamSize: Number.parseInt(teamSizeRaw, 10) || 0,
      phoneNumber,
      managementPinHash,
    };

    const result = await db.withClient(async (client) => {
      try {
        await client.query('BEGIN');

        const companyInsert = await client.query<CompanyRecord>(
          `INSERT INTO companies (company_code, name, status, settings)
           VALUES ($1, $2, 'active', $3::jsonb)
           RETURNING id, company_code, name`,
          [companyCode, companyName, JSON.stringify(settings)]
        );

        const companyRow = companyInsert.rows[0];

        await client.query(
          `INSERT INTO users (id, company_id, email, name, role, status, pin_hash, phone)
           VALUES ($1, $2, $3, $4, 'ADMIN', 'active', $5, $6)
           ON CONFLICT (id) DO UPDATE SET
             company_id = EXCLUDED.company_id,
             name = EXCLUDED.name,
             role = EXCLUDED.role,
             status = EXCLUDED.status,
             updated_at = NOW()`,
          [supabaseUser.id, companyRow.id, workEmail, adminName || workEmail, passwordHash, phoneNumber]
        );

        await client.query('COMMIT');
        return companyRow;
      } catch (txError) {
        await client.query('ROLLBACK');
        throw txError;
      }
    });

    const authSession = await SupabaseService.signInWithPassword(workEmail, password);
    const session = authSession.session;
    const expiresIn = session.expires_in ?? 3600;

    return sendToonResponse(res, 201, {
      success: true,
      S1: 'OK',
      message: 'Company provisioning complete',
      COMP1: result.company_code,
      COMP2: result.name,
      U1: workEmail,
      U2: adminName || workEmail,
      R1: 'ADMIN',
      SESSION1: session.access_token,
      REFRESH1: session.refresh_token ?? '',
      EX1: expiresIn,
      PIN_SESSION: `PIN_SESSION_${Date.now()}`,
      employeesCount: 0,
      devicesCount: 0,
      policiesCount: 0,
    });
  } catch (error) {
    console.error('Company creation error:', error);
    if (createdSupabaseUserId) {
      try {
        await SupabaseService.deleteAuthUser(createdSupabaseUserId);
      } catch (cleanupError) {
        console.error('Failed to cleanup Supabase user:', cleanupError);
      }
    }
    return sendToonResponse(res, 500, buildError('server_error', 'Failed to create company')); 
  }
});

export default router;
