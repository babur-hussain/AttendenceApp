/**
 * companySessionStorage
 * Secure persistence for company-level sessions and PIN unlock state
 */

import * as SecureStore from 'expo-secure-store';

const COMPANY_SESSION_KEY = 'ks_company_session_v1';
const PIN_SESSION_KEY = 'ks_pin_session_v1';
const RESOURCE_SNAPSHOT_KEY = 'ks_company_resources_v1';

export interface StoredCompanySession {
  companyId: string; // COMP1
  companyName: string;
  managerId: string; // U1
  managerName: string; // U2
  managerEmail: string;
  managerRole: string;
  sessionToken: string; // SESSION1
  status: string; // S1
  expiresAt: number;
  lastSyncedAt?: number;
  managementPin?: string; // Optional local mPIN for offline verification
}

export interface StoredPinSession {
  companyId: string;
  managerId: string;
  pinSessionToken: string; // PIN1 or SESSION1 from PIN verify
  grantedAt: number;
  expiresAt: number;
}

export interface StoredResourcesSnapshot {
  employeesCount: number;
  devicesCount: number;
  policiesCount: number;
  lastSyncedAt: number;
}

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(key);
    const result = raw ? (JSON.parse(raw) as T) : null;
    console.log(`📖 SecureStore.read(${key}):`, { found: !!result });
    return result;
  } catch (error) {
    console.warn(`❌ Failed to read ${key} from SecureStore`, error);
    return null;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, JSON.stringify(value));
    console.log(`✏️ SecureStore.write(${key}):`, { success: true });
  } catch (error) {
    console.warn(`❌ Failed to write ${key} to SecureStore`, error);
    throw error;
  }
}

export async function saveCompanySession(session: StoredCompanySession): Promise<void> {
  console.log('💾 saveCompanySession:', { companyId: session.companyId, managerId: session.managerId });
  await writeJson(COMPANY_SESSION_KEY, session);
}

export async function loadCompanySession(): Promise<StoredCompanySession | null> {
  console.log('🔓 loadCompanySession: attempting to read from SecureStore');
  const session = await readJson<StoredCompanySession>(COMPANY_SESSION_KEY);
  if (session) {
    console.log('🔓 loadCompanySession: session found', { companyId: session.companyId, managerId: session.managerId });
  } else {
    console.log('🔓 loadCompanySession: no session found');
  }
  return session;
}

export async function clearCompanySessionStorage(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(COMPANY_SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear company session', error);
  }
}

export async function savePinSession(session: StoredPinSession): Promise<void> {
  await writeJson(PIN_SESSION_KEY, session);
}

export async function loadPinSession(): Promise<StoredPinSession | null> {
  return readJson<StoredPinSession>(PIN_SESSION_KEY);
}

export async function clearPinSessionStorage(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(PIN_SESSION_KEY);
  } catch (error) {
    console.warn('Unable to clear pin session', error);
  }
}

export async function saveResourcesSnapshot(snapshot: StoredResourcesSnapshot): Promise<void> {
  await writeJson(RESOURCE_SNAPSHOT_KEY, snapshot);
}

export async function loadResourcesSnapshot(): Promise<StoredResourcesSnapshot | null> {
  return readJson<StoredResourcesSnapshot>(RESOURCE_SNAPSHOT_KEY);
}

export async function clearResourcesSnapshot(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(RESOURCE_SNAPSHOT_KEY);
  } catch (error) {
    console.warn('Unable to clear resources snapshot', error);
  }
}
