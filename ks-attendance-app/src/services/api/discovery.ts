/**
 * Auto Network Discovery
 * Automatically detects the server IP address on the local network
 * Works with WiFi and can fallback to production URL
 */

import { Platform } from 'react-native';
import * as Network from 'expo-network';

type FetchWithTimeoutOptions = RequestInit & { timeoutMs?: number };

async function fetchWithTimeout(input: RequestInfo | URL, options: FetchWithTimeoutOptions = {}) {
  const { timeoutMs = 5000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, { ...fetchOptions, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

interface ServerConfig {
  baseUrl: string;
  isLocal: boolean;
}

/**
 * Get the local network IP address and construct server URL
 */
async function getLocalServerUrl(): Promise<string | null> {
  try {
    // Get the device's IP address
    const ip = await Network.getIpAddressAsync();
    
    if (!ip || ip === '127.0.0.1') {
      return null;
    }
    
    // Extract network prefix (e.g., 192.168.1.x -> 192.168.1)
    const networkPrefix = ip.split('.').slice(0, 3).join('.');
    
    // Common server ports to try
    const commonPorts = [3000, 3001, 8000, 8080];
    
    // Try to reach server on common addresses
    const possibleAddresses = [
      `${networkPrefix}.1`, // Router/gateway
      ...Array.from({ length: 50 }, (_, i) => `${networkPrefix}.${i + 1}`), // Common IPs
    ];
    
    // Try each address with each port
    for (const address of possibleAddresses.slice(0, 10)) {
      for (const port of commonPorts) {
        const url = `http://${address}:${port}`;
        try {
          const response = await fetchWithTimeout(`${url}/health`, {
            method: 'GET',
            timeoutMs: 1000,
          });
          
          if (response.ok) {
            console.log(`✅ Found server at: ${url}`);
            return url;
          }
        } catch {
          // Continue trying
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting local server URL:', error);
    return null;
  }
}

/**
 * Discover server automatically
 * 1. Try local network discovery (WiFi)
 * 2. Fall back to production URL
 * 3. Fall back to localhost for simulator
 */
export async function discoverServer(): Promise<ServerConfig> {
  // Check for explicit environment variable first
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) {
    console.log(`📡 Using configured API URL: ${envUrl}`);
    return {
      baseUrl: envUrl,
      isLocal: envUrl.includes('localhost') || envUrl.includes('192.168') || envUrl.includes('10.0'),
    };
  }
  
  // Production URL (deploy your server and update this)
  const productionUrl = process.env.EXPO_PUBLIC_PROD_API_URL || 'https://your-server.com/api';
  
  // For iOS Simulator or Android Emulator
  if (__DEV__) {
    if (Platform.OS === 'ios') {
      // iOS Simulator uses localhost
      console.log('📱 iOS Simulator detected, using localhost');
      return {
        baseUrl: 'http://localhost:3000/api',
        isLocal: true,
      };
    } else if (Platform.OS === 'android') {
      // Android Emulator uses special IP
      console.log('🤖 Android Emulator detected, using 10.0.2.2');
      return {
        baseUrl: 'http://10.0.2.2:3000/api',
        isLocal: true,
      };
    }
  }
  
  // Try to discover server on local network
  console.log('🔍 Attempting to discover server on local network...');
  const localUrl = await getLocalServerUrl();
  
  if (localUrl) {
    return {
      baseUrl: `${localUrl}/api`,
      isLocal: true,
    };
  }
  
  // Fall back to production
  console.log('☁️ Using production server URL');
  return {
    baseUrl: productionUrl,
    isLocal: false,
  };
}

/**
 * Simple server health check
 */
export async function checkServerHealth(baseUrl: string): Promise<boolean> {
  try {
    const healthUrl = baseUrl.replace('/api', '') + '/health';
    const response = await fetchWithTimeout(healthUrl, {
      method: 'GET',
      timeoutMs: 5000,
    });
    return response.ok;
  } catch {
    return false;
  }
}
