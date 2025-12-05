/**
 * useCompanyLogin
 * Handles company login via Toon API with optional Supabase fallback.
 */

import { useCallback, useMemo, useState } from 'react';
import { API_ENDPOINTS } from '../services/api/config';
import { toonClient } from '../services';
import { getSupabaseClient } from '../services/supabaseClient';
import { useAdminSession } from './useAdminSession';
import type { StoredCompanySession } from '../utils/companySessionStorage';

interface CompanyLoginParams {
  email: string;
  password: string;
  companyId?: string;
}

interface CompanyLoginResult {
  success: boolean;
  error?: string;
}

interface UseCompanyLoginReturn {
  loading: boolean;
  error: string | null;
  login: (params: CompanyLoginParams) => Promise<CompanyLoginResult>;
  resetError: () => void;
}

export function useCompanyLogin(): UseCompanyLoginReturn {
  const { setCompanySession, setResourcesSnapshot } = useAdminSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabaseAvailable = useMemo(() => {
    return Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL)
      && Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  }, []);

  const syncResourcesSnapshot = useCallback(async (companyId: string, sessionToken: string) => {
    try {
      const [employees, devices, policies] = await Promise.all([
        toonClient.toonPost(
          API_ENDPOINTS.EMPLOYEE_LIST,
          { T1: 'EMPLOYEE_LIST', COMP1: companyId, SESSION1: sessionToken },
          { requireAuth: false }
        ),
        toonClient.toonPost(
          API_ENDPOINTS.DEVICES.LIST,
          { T1: 'DEVICE_LIST', COMP1: companyId, SESSION1: sessionToken },
          { requireAuth: false }
        ),
        toonClient.toonPost(
          API_ENDPOINTS.POLICIES.LIST,
          { T1: 'POLICY_LIST', COMP1: companyId, SESSION1: sessionToken },
          { requireAuth: false }
        ),
      ]);

      await setResourcesSnapshot({
        employeesCount: Array.isArray(employees?.employees)
          ? employees.employees.length
          : Number(employees?.total) || 0,
        devicesCount: Array.isArray(devices?.devices)
          ? devices.devices.length
          : Number(devices?.total) || 0,
        policiesCount: Array.isArray(policies?.policies)
          ? policies.policies.length
          : Number(policies?.total) || 0,
        lastSyncedAt: Date.now(),
      });
    } catch (resourceError) {
      console.warn('Resource sync failed, default snapshot applied', resourceError);
      await setResourcesSnapshot({
        employeesCount: 0,
        devicesCount: 0,
        policiesCount: 0,
        lastSyncedAt: Date.now(),
      });
    }
  }, [setResourcesSnapshot]);

  const loginWithSupabase = useCallback(async ({ companyId, email, password }: CompanyLoginParams) => {
    const supabase = getSupabaseClient();
    const normalizedEmail = email.trim().toLowerCase();
    const preferredCompanyId = companyId?.trim().toUpperCase();

    const { data, error: supabaseError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (supabaseError || !data.session) {
      throw new Error(supabaseError?.message || 'Supabase authentication failed');
    }

    const metadata = (data.user?.user_metadata || {}) as Record<string, any>;
    const resolvedCompanyId = preferredCompanyId
      || (metadata.companyCode ? String(metadata.companyCode).toUpperCase() : '')
      || (metadata.COMP1 ? String(metadata.COMP1).toUpperCase() : '');

    if (!resolvedCompanyId) {
      throw new Error('Company ID missing. Provide the company code or add companyCode metadata in Supabase.');
    }

    const expiresInSeconds = data.session.expires_in ?? 3600;
    const session: StoredCompanySession = {
      companyId: resolvedCompanyId,
      companyName: metadata.companyName || metadata.company || resolvedCompanyId,
      managerId: data.user?.id || normalizedEmail,
      managerName: metadata.name || metadata.managerName || normalizedEmail,
      managerEmail: normalizedEmail,
      managerRole: metadata.role || 'manager',
      sessionToken: data.session.access_token,
      status: 'OK',
      expiresAt: Date.now() + expiresInSeconds * 1000,
      lastSyncedAt: Date.now(),
    };

    await setCompanySession(session);
    await syncResourcesSnapshot(resolvedCompanyId, data.session.access_token);
  }, [setCompanySession, syncResourcesSnapshot]);

  const login = useCallback(async (params: CompanyLoginParams): Promise<CompanyLoginResult> => {
    console.log('🔐 useCompanyLogin.login: starting', { email: params.email });
    setIsLoading(true);
    setError(null);

    try {
      if (!supabaseAvailable) {
        throw new Error('Supabase credentials missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
      }

      console.log('🔐 useCompanyLogin.login: attempting Supabase login');
      await loginWithSupabase(params);
      console.log('✅ useCompanyLogin.login: Supabase login successful');
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error during login';
      console.error('❌ useCompanyLogin.login: failed', { error: message });
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  }, [
    supabaseAvailable,
    loginWithSupabase,
  ]);

  return {
    loading: isLoading,
    error,
    login,
    resetError: () => setError(null),
  };
}
