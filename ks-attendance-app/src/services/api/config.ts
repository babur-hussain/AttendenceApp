/**
 * API Configuration
 * Centralized configuration for API endpoints and settings
 * Auto-discovers server on local network or uses production URL
 */

import { Platform, NativeModules } from 'react-native';
import Constants from 'expo-constants';

function parseHost(candidate?: string | null): string | null {
  if (!candidate) {
    return null;
  }

  try {
    const uri = candidate.includes('://') ? candidate : `http://${candidate}`;
    const { hostname } = new URL(uri);

    if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') {
      return null;
    }

    return hostname;
  } catch {
    return null;
  }
}

function resolveScriptHost(): string | null {
  const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
  return parseHost(scriptURL);
}

function resolvePlatformHost(): string | null {
  const platformConstants = NativeModules?.PlatformConstants as
    | { serverHost?: string; bundleURL?: string }
    | undefined;

  if (!platformConstants) {
    return null;
  }

  return (
    parseHost(platformConstants.serverHost)
    || parseHost(platformConstants.bundleURL)
  );
}

function resolveConstantsHost(): string | null {
  const manifest = (Constants as any).manifest;
  const manifest2 = (Constants as any).manifest2;
  const expoConfig = (Constants as any).expoConfig;

  return (
    parseHost(expoConfig?.hostUri)
    || parseHost(expoConfig?.extra?.expoGo?.developer?.host)
    || parseHost(expoConfig?.extra?.expoGo?.developer?.hostname)
    || parseHost(manifest?.debuggerHost)
    || parseHost(manifest?.hostUri)
    || parseHost(manifest2?.extra?.expoGo?.developer?.host)
    || parseHost(manifest2?.extra?.expoGo?.developer?.hostname)
  );
}

function getDevBaseUrl(): string | null {
  const apiPort = Number(process.env.EXPO_PUBLIC_API_PORT || 3000);
  const derivedHost = resolveScriptHost() || resolvePlatformHost() || resolveConstantsHost();

  if (derivedHost) {
    const url = `http://${derivedHost}:${apiPort}/api`;
    console.log(`📡 Derived API URL from Metro host: ${url}`);
    return url;
  }

  return null;
}

/**
 * Get base URL with automatic discovery
 * - Development: Auto-discovers local server or uses simulator/emulator defaults
 * - Production: Uses EXPO_PUBLIC_PROD_API_URL or default production URL
 */
function getBaseUrl(): string {
  // Explicit environment variable takes precedence
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    console.log(`📡 Using EXPO_PUBLIC_API_URL override: ${envUrl}`);
    return envUrl;
  }
  
  // Development mode: Use platform-specific defaults
  if (__DEV__) {
    const devBaseUrl = getDevBaseUrl();
    if (devBaseUrl) {
      return devBaseUrl;
    }

    if (Platform.OS === 'ios') {
      // iOS Simulator
      return 'http://localhost:3000/api';
    } else if (Platform.OS === 'android') {
      // Android Emulator (10.0.2.2 maps to host machine's localhost)
      return 'http://10.0.2.2:3000/api';
    } else if (Platform.OS === 'web') {
      return 'http://localhost:3000/api';
    }
  }
  
  // Production mode: Use production URL
  const prodUrl = process.env.EXPO_PUBLIC_PROD_API_URL;
  if (prodUrl) {
    return prodUrl;
  }
  
  // Default fallback (CHANGE THIS TO YOUR PRODUCTION SERVER)
  console.warn('⚠️ No production URL configured! Set EXPO_PUBLIC_PROD_API_URL in .env');
  return 'https://your-production-server.com/api';
}

export const API_CONFIG = {
  // Base URL - automatically configured for dev/prod
  BASE_URL: getBaseUrl(),
  
  // Request timeout in milliseconds
  TIMEOUT: 30000,
  
  // Use mock data for development
  USE_MOCK: process.env.EXPO_PUBLIC_USE_MOCK === 'true' || false,
  
  // API version
  VERSION: 'v1',
};

// Log configuration on startup
console.log('📡 API Configuration:');
console.log(`   Base URL: ${API_CONFIG.BASE_URL}`);
console.log(`   Platform: ${Platform.OS}`);
console.log(`   Dev Mode: ${__DEV__}`);
console.log(`   Mock: ${API_CONFIG.USE_MOCK}`);

/**
 * API Endpoints
 * All backend endpoints organized by resource
 */
export const API_ENDPOINTS = {
  // Employee endpoints
  EMPLOYEES: {
    CREATE: '/employees',
    LIST: '/employees',
    GET: (id: string) => `/employees/${id}`,
    UPDATE: (id: string) => `/employees/${id}`,
    DELETE: (id: string) => `/employees/${id}`,
  },
  
  // Attendance endpoints
  ATTENDANCE: {
    RECORD: '/attendance',
    LIST: '/attendance',
    GET: (id: string) => `/attendance/${id}`,
    BY_EMPLOYEE: (employeeId: string) => `/attendance/employee/${employeeId}`,
    BY_DATE_RANGE: '/attendance/range',
  },
  
  // Auth endpoints (for future use)
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    FORGOT: '/auth/forgot',
    RESET: '/auth/reset',
    PIN_LOGIN: '/auth/pin-login',
  },
  
  // Admin endpoints
  ADMIN: {
    STATS: '/admin/stats',
    ACTIVITIES: '/admin/activities',
    HEALTH: '/admin/health',
  },
  
  // Company/User management endpoints
  COMPANY: {
    USERS: '/company/users',
    USER_DETAIL: '/company/user',
    CREATE_USER: '/company/user/create',
    UPDATE_USER: '/company/user/update',
    DELETE_USER: '/company/user/delete',
    SETTINGS: '/company/settings',
    AUTH: '/company/login',
    CREATE_REQUEST: '/company/create-request',
  },
  
  // Device management endpoints
  DEVICES: {
    LIST: '/devices',
    DETAIL: '/devices/detail',
    REGISTER: '/devices/register',
    UPDATE: '/devices/update',
    DELETE: '/devices/delete',
    PING: '/devices/ping',
    LOGS: '/devices/logs',
  },
  
  // Policy management endpoints
  POLICIES: {
    LIST: '/policies',
    DETAIL: '/policies/detail',
    CREATE: '/policies/create',
    UPDATE: '/policies/update',
    DELETE: '/policies/delete',
    TOGGLE: '/policies/toggle',
  },
  
  // Employee enrollment endpoints (TOON-based)
  EMPLOYEE_ENROLL: '/employees/enroll',
  EMPLOYEE_GET: '/employees/get',
  EMPLOYEE_LIST: '/employees/list',
  EMPLOYEE_UPDATE: '/employees/update',
};

/**
 * Build full URL for an endpoint
 * 
 * @param endpoint - Endpoint path
 * @returns Full URL
 */
export function buildUrl(endpoint: string): string {
  const base = API_CONFIG.BASE_URL.endsWith('/') 
    ? API_CONFIG.BASE_URL.slice(0, -1) 
    : API_CONFIG.BASE_URL;
  
  const path = endpoint.startsWith('/') 
    ? endpoint 
    : `/${endpoint}`;
  
  // BASE_URL already includes /api, just append the endpoint
  const fullUrl = `${base}${path}`;
  
  if (__DEV__) {
    console.log(`🔗 Building URL: ${endpoint} → ${fullUrl}`);
  }
  
  return fullUrl;
}

/**
 * Request headers builder
 * 
 * @param authToken - Optional authentication token
 * @returns Headers object
 */
export function buildHeaders(authToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/toon',
    'Accept': 'application/toon',
  };
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }
  
  return headers;
}
