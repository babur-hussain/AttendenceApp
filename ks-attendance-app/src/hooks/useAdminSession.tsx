/**
 * useAdminSession
 * Global session state for company + PIN unlock flows
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  saveCompanySession,
  loadCompanySession,
  clearCompanySessionStorage,
  savePinSession,
  loadPinSession,
  clearPinSessionStorage,
  saveResourcesSnapshot,
  loadResourcesSnapshot,
  clearResourcesSnapshot,
  type StoredCompanySession,
  type StoredPinSession,
  type StoredResourcesSnapshot,
} from '../utils/companySessionStorage';

interface AdminSessionContextValue {
  isBootstrapping: boolean;
  companySession: StoredCompanySession | null;
  resourcesSnapshot: StoredResourcesSnapshot | null;
  pinSession: StoredPinSession | null;
  hasCompanySession: boolean;
  hasPinSession: boolean;
  setCompanySession: (session: StoredCompanySession) => Promise<void>;
  clearCompanySession: () => Promise<void>;
  setResourcesSnapshot: (snapshot: StoredResourcesSnapshot | null) => Promise<void>;
  setPinSession: (session: StoredPinSession | null) => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionContextValue | undefined>(undefined);

interface AdminSessionProviderProps {
  children: ReactNode;
}

export function AdminSessionProvider({ children }: AdminSessionProviderProps) {
  const [companySession, setCompanySessionState] = useState<StoredCompanySession | null>(null);
  const [resourcesSnapshot, setResourcesSnapshotState] = useState<StoredResourcesSnapshot | null>(null);
  const [pinSession, setPinSessionState] = useState<StoredPinSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        console.log('🚀 AdminSessionProvider: bootstrapping from storage');
        const [storedCompany, storedResources, storedPin] = await Promise.all([
          loadCompanySession(),
          loadResourcesSnapshot(),
          loadPinSession(),
        ]);

        // If the cached company is from an old build, drop it to avoid invalid PIN sessions
        const isStaleCompany = storedCompany && storedCompany.companyId !== 'KS001';
        const sanitizedCompany = isStaleCompany ? null : storedCompany;
        const sanitizedResources = isStaleCompany ? null : storedResources;
        const sanitizedPin = isStaleCompany ? null : storedPin;

        if (!isMounted) {
          return;
        }

        console.log('🚀 AdminSessionProvider: bootstrap complete', {
          hasCompanySession: !!sanitizedCompany,
          hasResources: !!sanitizedResources,
          hasPin: !!sanitizedPin,
        });

        setCompanySessionState(sanitizedCompany);
        setResourcesSnapshotState(sanitizedResources);
        if (sanitizedPin && sanitizedPin.expiresAt > Date.now()) {
          setPinSessionState(sanitizedPin);
        }

        if (isStaleCompany) {
          console.log('🧹 Cleared stale cached company session');
          await Promise.all([
            clearCompanySessionStorage(),
            clearResourcesSnapshot(),
            clearPinSessionStorage(),
          ]);
        }
      } finally {
        if (isMounted) {
          setIsBootstrapping(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const setCompanySession = useCallback(async (session: StoredCompanySession) => {
    console.log('🔐 AdminSessionProvider.setCompanySession:', { companyId: session.companyId });
    setCompanySessionState(session);
    await saveCompanySession(session);
    console.log('✅ AdminSessionProvider.setCompanySession: saved');
  }, []);

  const clearCompanySession = useCallback(async () => {
    console.log('🔓 AdminSessionProvider.clearCompanySession');
    setCompanySessionState(null);
    setResourcesSnapshotState(null);
    setPinSessionState(null);
    await Promise.all([
      clearCompanySessionStorage(),
      clearResourcesSnapshot(),
      clearPinSessionStorage(),
    ]);
    console.log('✅ AdminSessionProvider.clearCompanySession: complete');
  }, []);

  const setResourcesSnapshot = useCallback(async (snapshot: StoredResourcesSnapshot | null) => {
    setResourcesSnapshotState(snapshot);
    if (snapshot) {
      await saveResourcesSnapshot(snapshot);
    } else {
      await clearResourcesSnapshot();
    }
  }, []);

  const setPinSession = useCallback(async (session: StoredPinSession | null) => {
    if (!session) {
      setPinSessionState(null);
      await clearPinSessionStorage();
      return;
    }

    setPinSessionState(session);
    await savePinSession(session);
  }, []);

  const value = useMemo<AdminSessionContextValue>(() => ({
    isBootstrapping,
    companySession,
    resourcesSnapshot,
    pinSession,
    hasCompanySession: Boolean(companySession && companySession.expiresAt > Date.now()),
    hasPinSession: Boolean(pinSession && pinSession.expiresAt > Date.now()),
    setCompanySession,
    clearCompanySession,
    setResourcesSnapshot,
    setPinSession,
  }), [
    companySession,
    isBootstrapping,
    pinSession,
    resourcesSnapshot,
    setCompanySession,
    clearCompanySession,
    setResourcesSnapshot,
    setPinSession,
  ]);

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSessionContextValue {
  const context = useContext(AdminSessionContext);
  if (!context) {
    throw new Error('useAdminSession must be used within an AdminSessionProvider');
  }
  return context;
}
