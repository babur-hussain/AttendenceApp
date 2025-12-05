/**
 * useDeviceStatus - Device Status Monitoring Hook
 * 
 * Tracks biometric device status (face/fingerprint kiosks).
 * Monitors health, battery, connectivity, and pending commands.
 * 
 * TOON Endpoints:
 * - GET /api/devices/status
 * - POST /api/devices/:id/command
 * 
 * Response Tokens:
 * - COUNT: Number of devices
 * - DEV_<idx>_D1: Device ID
 * - DEV_<idx>_NAME: Device name
 * - DEV_<idx>_TYPE: Device type (FACE/FINGERPRINT/MOBILE)
 * - DEV_<idx>_ONLINE: Online status (0/1)
 * - DEV_<idx>_H1: Last heartbeat timestamp
 * - DEV_<idx>_BAT: Battery % (if available)
 * - DEV_<idx>_FW1: Firmware version
 * - DEV_<idx>_CMD1: Pending commands count
 * - DEV_<idx>_LOC: Location/description
 * 
 * Command Payload Tokens:
 * - D1: Device ID
 * - CMD: Command type (REBOOT/SYNC/LOCK/UNLOCK/UPDATE)
 * - MGR_ID: Manager ID
 * - TS: Command timestamp
 * - SIG1: Signature
 */

import { useState, useCallback, useEffect } from 'react';
import { ToonClient } from '../services/api/ToonClient';
import { decodeFromToonPayload, encodeToToonPayload } from '../utils/toon';

export interface DeviceStatus {
  deviceId: string;
  name: string;
  type: 'FACE' | 'FINGERPRINT' | 'MOBILE';
  isOnline: boolean;
  lastHeartbeat: string | null;
  batteryPercent: number | null;
  firmwareVersion: string | null;
  pendingCommandsCount: number;
  location: string | null;
}

export type DeviceCommand = 'REBOOT' | 'SYNC' | 'LOCK' | 'UNLOCK' | 'UPDATE';

export const useDeviceStatus = () => {
  const [devices, setDevices] = useState<DeviceStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commandInProgress, setCommandInProgress] = useState(false);

  const toonClient = new ToonClient();

  /**
   * Parse device status response
   */
  const parseDevicesResponse = useCallback((toonData: Record<string, string>): DeviceStatus[] => {
    const count = parseInt(toonData.COUNT || '0', 10);
    const deviceList: DeviceStatus[] = [];

    for (let i = 0; i < count; i++) {
      deviceList.push({
        deviceId: toonData[`DEV_${i}_D1`] || '',
        name: toonData[`DEV_${i}_NAME`] || 'Unknown Device',
        type: (toonData[`DEV_${i}_TYPE`] || 'MOBILE') as DeviceStatus['type'],
        isOnline: toonData[`DEV_${i}_ONLINE`] === '1',
        lastHeartbeat: toonData[`DEV_${i}_H1`] || null,
        batteryPercent: toonData[`DEV_${i}_BAT`] ? parseInt(toonData[`DEV_${i}_BAT`], 10) : null,
        firmwareVersion: toonData[`DEV_${i}_FW1`] || null,
        pendingCommandsCount: parseInt(toonData[`DEV_${i}_CMD1`] || '0', 10),
        location: toonData[`DEV_${i}_LOC`] || null,
      });
    }

    return deviceList;
  }, []);

  /**
   * Fetch device status list
   */
  const fetchDeviceStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const toonResponse = await toonClient.toonGet('/api/devices/status');
      const decoded = decodeFromToonPayload(toonResponse);
      const parsed = parseDevicesResponse(decoded);
      
      setDevices(parsed);
    } catch (err) {
      console.error('Failed to fetch device status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch device status');
    } finally {
      setLoading(false);
    }
  }, [parseDevicesResponse, toonClient]);

  /**
   * Send command to device
   */
  const sendCommand = useCallback(
    async (deviceId: string, command: DeviceCommand, managerId: string): Promise<boolean> => {
      setCommandInProgress(true);
      setError(null);

      try {
        const payload: Record<string, string> = {
          D1: deviceId,
          CMD: command,
          MGR_ID: managerId,
          TS: new Date().toISOString(),
          SIG1: `CMD_${managerId}_${Date.now()}`,
        };

        const toonPayload = encodeToToonPayload(payload);
        await toonClient.toonPost(`/api/devices/${deviceId}/command`, toonPayload);

        // Refresh device status after command
        await fetchDeviceStatus();

        return true;
      } catch (err) {
        console.error('Failed to send device command:', err);
        setError(err instanceof Error ? err.message : 'Failed to send command');
        return false;
      } finally {
        setCommandInProgress(false);
      }
    },
    [fetchDeviceStatus, toonClient]
  );

  /**
   * Reboot device
   */
  const rebootDevice = useCallback(
    (deviceId: string, managerId: string) => sendCommand(deviceId, 'REBOOT', managerId),
    [sendCommand]
  );

  /**
   * Sync device
   */
  const syncDevice = useCallback(
    (deviceId: string, managerId: string) => sendCommand(deviceId, 'SYNC', managerId),
    [sendCommand]
  );

  /**
   * Lock device
   */
  const lockDevice = useCallback(
    (deviceId: string, managerId: string) => sendCommand(deviceId, 'LOCK', managerId),
    [sendCommand]
  );

  /**
   * Unlock device
   */
  const unlockDevice = useCallback(
    (deviceId: string, managerId: string) => sendCommand(deviceId, 'UNLOCK', managerId),
    [sendCommand]
  );

  /**
   * Get device by ID
   */
  const getDeviceById = useCallback(
    (deviceId: string): DeviceStatus | null => {
      return devices.find((d) => d.deviceId === deviceId) || null;
    },
    [devices]
  );

  /**
   * Get online devices count
   */
  const getOnlineCount = useCallback((): number => {
    return devices.filter((d) => d.isOnline).length;
  }, [devices]);

  /**
   * Get offline devices count
   */
  const getOfflineCount = useCallback((): number => {
    return devices.filter((d) => !d.isOnline).length;
  }, [devices]);

  /**
   * Get devices by type
   */
  const getDevicesByType = useCallback(
    (type: DeviceStatus['type']): DeviceStatus[] => {
      return devices.filter((d) => d.type === type);
    },
    [devices]
  );

  // Auto-load on mount and refresh every 30 seconds
  useEffect(() => {
    fetchDeviceStatus();
    
    const interval = setInterval(() => {
      fetchDeviceStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchDeviceStatus]);

  return {
    devices,
    loading,
    error,
    commandInProgress,
    fetchDeviceStatus,
    sendCommand,
    rebootDevice,
    syncDevice,
    lockDevice,
    unlockDevice,
    getDeviceById,
    getOnlineCount,
    getOfflineCount,
    getDevicesByType,
  };
};
