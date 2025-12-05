/**
 * TOON-based Authentication Routes (Supabase backed)
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { DatabaseManager } from '../db/DatabaseManager';
import { ToonCodec } from '../utils/ToonCodec';
import { SupabaseService } from '../services/SupabaseService';

const router = Router();
console.log('[auth.toon] routes loaded');
const TOON_CONTENT_TYPE = 'application/toon';

interface UserRecord {
  id: string;
  email: string;
  name?: string;
  role: string;
  status: string;
  company_id: string;
  company_code: string;
  company_name: string;
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

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function mapSupabaseError(error: unknown): { code: string; message: string } {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid login')) {
      return { code: 'invalid_credentials', message: 'Invalid email or PIN' };
    }
    if (msg.includes('email not confirmed')) {
      return { code: 'email_unconfirmed', message: 'Email must be confirmed before signing in' };
    }
    return { code: 'auth_error', message: error.message };
  }
  return { code: 'auth_error', message: 'Authentication failed' };
}

async function fetchUserRecord(email: string, companyCode?: string): Promise<UserRecord | undefined> {
  const db = DatabaseManager.getInstance();
  const params: (string | undefined)[] = [email];
  let companyFilter = '';

  if (companyCode) {
    companyFilter = ' AND c.company_code = ?';
    params.push(companyCode);
  }

  return db.get<UserRecord>(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.company_id, c.company_code, c.name AS company_name
     FROM users u
     INNER JOIN companies c ON c.id = u.company_id
     WHERE LOWER(u.email) = LOWER(?)${companyFilter}`,
    params.filter(Boolean) as string[]
  );
}

async function fetchUserById(userId: string): Promise<UserRecord | undefined> {
  const db = DatabaseManager.getInstance();
  return db.get<UserRecord>(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.company_id, c.company_code, c.name AS company_name
     FROM users u
     INNER JOIN companies c ON c.id = u.company_id
     WHERE u.id = ?`,
    [userId]
  );
}

/**
 * POST /auth/login
 * Supabase-backed authentication (email + PIN/password)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const toonData = ToonCodec.decode(req.body);
    const emailInput = extractString(toonData.email || toonData.U1 || '');
    const passwordInput = extractString(
      toonData.password || toonData.pin || toonData.P1 || toonData.U2 || ''
    );
    const companyCode = extractString(toonData.companyId || toonData.COMP1 || '').toUpperCase();

    const email = normalizeEmail(emailInput);

    if (!email || !passwordInput) {
      return sendToonResponse(res, 400, buildError('missing_fields', 'Email and PIN are required'));
    }

    const userRecord = await fetchUserRecord(email, companyCode || undefined);

    if (!userRecord) {
      return sendToonResponse(res, 401, buildError('invalid_credentials', 'Invalid email or PIN'));
    }

    if (userRecord.status === 'locked') {
      return sendToonResponse(
        res,
        403,
        buildError('account_locked', 'Account locked', { attempts: 'exceeded' })
      );
    }

    const authData = await SupabaseService.signInWithPassword(email, passwordInput);
    const session = authData.session;

    await DatabaseManager.getInstance().run(
      'UPDATE users SET failed_attempts = 0, last_login_at = NOW() WHERE id = ?',
      [userRecord.id]
    );

    const expiresIn = session.expires_in ?? 3600;

    return sendToonResponse(res, 200, {
      success: true,
      accessToken: session.access_token,
      refreshToken: session.refresh_token ?? '',
      expiresIn,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name || userRecord.email,
        role: userRecord.role,
        status: userRecord.status,
        companyId: userRecord.company_id,
        companyCode: userRecord.company_code,
        companyName: userRecord.company_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    const { code, message } = mapSupabaseError(error);
    return sendToonResponse(res, code === 'auth_error' ? 500 : 401, buildError(code, message));
  }
});

/**
 * POST /auth/forgot
 * Initiate Supabase password reset email
 */
router.post('/forgot', async (req: Request, res: Response) => {
  try {
    const toonData = ToonCodec.decode(req.body);
    const emailRaw = extractString(toonData.email || toonData.U1);
    const email = normalizeEmail(emailRaw);

    if (!email) {
      return sendToonResponse(res, 400, buildError('missing_email', 'Email is required'));
    }

    const redirectTo = process.env.SUPABASE_RESET_REDIRECT_URL;
    await SupabaseService.triggerPasswordReset(email, redirectTo);

    return sendToonResponse(res, 200, {
      success: true,
      message: 'If the email exists, Supabase will send reset instructions shortly.',
    });
  } catch (error) {
    console.error('Forgot PIN error:', error);
    return sendToonResponse(res, 500, buildError('server_error', 'Failed to process request'));
  }
});

/**
 * POST /auth/reset
 * Update Supabase password using admin privileges
 */
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const toonData = ToonCodec.decode(req.body);
    const emailRaw = extractString(toonData.email || toonData.U1 || '');
    const resetToken = extractString(toonData.resetToken || toonData.RT1 || '');
    const newPin = extractString(toonData.newPin || toonData.P1 || toonData.U2 || '');

    if (!emailRaw || !newPin) {
      return sendToonResponse(
        res,
        400,
        buildError('missing_fields', 'Email and new PIN are required for reset')
      );
    }

    // resetToken is currently used for parity with client flows (logging only)
    if (resetToken) {
      console.log('[auth.reset] Received reset token payload');
    }

    const email = normalizeEmail(emailRaw);
    const userRecord = await fetchUserRecord(email);

    if (!userRecord) {
      return sendToonResponse(res, 404, buildError('user_not_found', 'User not found'));
    }

    await SupabaseService.updateUserPassword(userRecord.id, newPin);

    return sendToonResponse(res, 200, {
      success: true,
      message: 'PIN reset successful. Please sign in with your new PIN.',
    });
  } catch (error) {
    console.error('Reset PIN error:', error);
    return sendToonResponse(res, 500, buildError('server_error', 'Failed to reset PIN'));
  }
});

/**
 * POST /auth/logout
 * Stateless logout acknowledgement (Supabase handles tokens client-side)
 */
router.post('/logout', async (_req: Request, res: Response) => {
  try {
    return sendToonResponse(res, 200, {
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    return sendToonResponse(res, 500, buildError('server_error', 'Failed to logout'));
  }
});

/**
 * POST /auth/pin-login
 * PIN-based verification for manager/admin access
 */
router.post('/pin-login', async (req: Request, res: Response) => {
  try {
    const toonData = ToonCodec.decode(req.body);
    
    // Extract fields flexibly
    const companyId = extractString(
      toonData.COMP1 || toonData.companyId || toonData.company_id || ''
    ).toUpperCase();
    const managerId = extractString(
      toonData.U1 || toonData.managerId || toonData.manager_id || ''
    );
    const pin = extractString(
      toonData.PIN1 || toonData.pin || ''
    );

    if (!companyId || !managerId || !pin) {
      return sendToonResponse(
        res,
        400,
        buildError(
          'missing_fields',
          `Missing required fields. Got COMP1=${companyId}, U1=${managerId}, PIN1=${pin}`
        )
      );
    }

    // Get company settings with PIN hash
    const company = await DatabaseManager.getInstance().get<any>(
      `SELECT id, settings FROM companies WHERE company_code = ?`,
      [companyId]
    );

    if (!company) {
      return sendToonResponse(res, 404, buildError('company_not_found', 'Company not found'));
    }

    const settings = typeof company.settings === 'string' 
      ? JSON.parse(company.settings) 
      : company.settings || {};
    
    const storedPinHash = settings.managementPinHash;
    const pinHash = crypto.createHash('sha256').update(pin).digest('hex');

    if (!storedPinHash || pinHash !== storedPinHash) {
      console.warn(`PIN verification failed: stored=${!!storedPinHash}, match=${pinHash === storedPinHash}`);
      return sendToonResponse(res, 401, buildError('invalid_pin', 'Invalid PIN'));
    }

    // Generate PIN session token
    const pinSessionToken = `PIN_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

    return sendToonResponse(res, 200, {
      success: true,
      S1: 'OK',
      PIN1: pinSessionToken,
      PIN_EXPIRES: 3600,
    });
  } catch (error) {
    console.error('PIN login error:', error);
    return sendToonResponse(res, 500, buildError('server_error', 'Failed to verify PIN'));
  }
});

/**
 * POST /auth/me
 * Restore session via Supabase access token
 */
router.post('/me', async (req: Request, res: Response) => {
  try {
    const toonData = ToonCodec.decode(req.body);
    const token =
      extractString(toonData.token || toonData.accessToken) ||
      extractString(req.headers['authorization']?.replace('Bearer ', '') || '');

    if (!token) {
      return sendToonResponse(res, 401, buildError('missing_token', 'Access token required'));
    }

    const supabaseUser = await SupabaseService.getUserFromAccessToken(token);
    const userRecord =
      (supabaseUser.id && (await fetchUserById(supabaseUser.id))) ||
      (supabaseUser.email ? await fetchUserRecord(supabaseUser.email) : undefined);

    if (!userRecord) {
      return sendToonResponse(res, 404, buildError('user_not_found', 'User not found'));
    }

    return sendToonResponse(res, 200, {
      success: true,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name || supabaseUser.email || 'User',
        role: userRecord.role,
        status: userRecord.status,
        companyId: userRecord.company_id,
        companyCode: userRecord.company_code,
        companyName: userRecord.company_name,
      },
    });
  } catch (error) {
    console.error('Session restore error:', error);
    return sendToonResponse(res, 500, buildError('server_error', 'Failed to restore session'));
  }
});

export default router;
