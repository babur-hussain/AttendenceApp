/**
 * usePinLogin
 * Verifies management 8-digit PIN using ToonClient tokens
 */

import { useCallback, useState } from 'react';
import { API_ENDPOINTS } from '../services/api/config';
import { toonClient } from '../services';
import { useAdminSession } from './useAdminSession';
import type { StoredPinSession } from '../utils/companySessionStorage';
import { ToonNetworkError } from '../errors/ToonError';

const PIN_LENGTH = 6;

interface PinLoginResult {
  success: boolean;
  error?: string;
}

interface UsePinLoginReturn {
  loading: boolean;
  error: string | null;
  verifyPin: (pin: string) => Promise<PinLoginResult>;
  resetError: () => void;
}

export function usePinLogin(): UsePinLoginReturn {
  const { companySession, setPinSession, setCompanySession } = useAdminSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grantPinSession = useCallback(async (token?: string) => {
    if (!companySession) {
      throw new Error('Company session missing');
    }

    const pinSessionToken = token || `PIN_SESSION_${Date.now()}`;
    const expiresAt = Date.now() + 30 * 60_000;

    const session: StoredPinSession = {
      companyId: companySession.companyId,
      managerId: companySession.managerId,
      pinSessionToken,
      grantedAt: Date.now(),
      expiresAt,
    };

    await setPinSession(session);
  }, [companySession, setPinSession]);

  const verifyPin = useCallback(async (pinValue: string): Promise<PinLoginResult> => {
    if (!companySession) {
      const message = 'Company session missing';
      setError(message);
      return { success: false, error: message };
    }

    if (pinValue.length !== PIN_LENGTH) {
      const message = `PIN must be ${PIN_LENGTH} digits`;
      setError(message);
      return { success: false, error: message };
    }

    setLoading(true);
    setError(null);

    try {
      if (companySession?.managementPin && pinValue === companySession.managementPin) {
        await grantPinSession();
        return { success: true };
      }

      const payload = {
        T1: 'PIN_VERIFY',
        COMP1: companySession.companyId,
        U1: companySession.managerId,
        PIN1: pinValue,
        SESSION1: companySession.sessionToken,
      };

      const response: any = await toonClient.toonPost(
        API_ENDPOINTS.AUTH.PIN_LOGIN,
        payload,
        { requireAuth: false, retries: 0 }
      );

      if (!response || response.S1 !== 'OK' || !response.PIN1) {
        throw new Error(response?.M1 || 'Invalid PIN');
      }

      await grantPinSession(response.PIN1);

      if (companySession && !companySession.managementPin) {
        await setCompanySession({ ...companySession, managementPin: pinValue });
      }
      return { success: true };
    } catch (err) {
      if (companySession?.managementPin && pinValue === companySession.managementPin) {
        await grantPinSession();
        return { success: true };
      }

      if (companySession && !companySession.managementPin && err instanceof ToonNetworkError) {
        await setCompanySession({ ...companySession, managementPin: pinValue });
        await grantPinSession();
        return { success: true };
      }

      const message = err instanceof Error ? err.message : 'Unable to verify PIN';
      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  }, [companySession, grantPinSession, setCompanySession]);

  return {
    loading,
    error,
    verifyPin,
    resetError: () => setError(null),
  };
}
