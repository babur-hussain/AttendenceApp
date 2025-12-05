import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { toonClient } from '../services';
import { API_ENDPOINTS } from '../services/api/config';
import { useAdminSession } from './useAdminSession';

interface Device {
  id: string;
  name: string;
  type: 'face' | 'fingerprint';
  status: 'online' | 'offline';
  location: string;
  lastSeen: string;
}

interface UseDeviceRegistryReturn {
  devices: Device[];
  loading: boolean;
  addDevice: (device: Omit<Device, 'id' | 'status' | 'lastSeen'>) => Promise<void>;
  removeDevice: (deviceId: string) => Promise<void>;
  updateDevice: (deviceId: string, updates: Partial<Device>) => Promise<void>;
}

export function useDeviceRegistry(): UseDeviceRegistryReturn {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const { companySession, pinSession } = useAdminSession();

  const buildAuthPayload = useCallback(() => {
    if (!companySession) {
      throw new Error('Company session missing');
    }
    if (!pinSession) {
      throw new Error('PIN session expired');
    }

    return {
      COMP1: companySession.companyId,
      SESSION1: companySession.sessionToken,
      PIN1: pinSession.pinSessionToken,
      U1: companySession.managerId,
    };
  }, [companySession, pinSession]);

  const loadDevices = useCallback(async () => {
    try {
      if (!companySession || !pinSession) {
        return;
      }
      setLoading(true);

      const response: any = await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.LIST,
        {
          ...buildAuthPayload(),
          T1: 'DEVICE_LIST',
        },
        { requireAuth: false }
      );

      const mapped: Device[] = Array.isArray(response?.devices)
        ? response.devices.map((device: any) => ({
            id: device.D1 || device.id,
            name: device.D2 || device.name,
            type: (device.DT || device.type || 'face').toLowerCase() === 'fingerprint' ? 'fingerprint' : 'face',
            status: (device.STATUS || device.status || 'offline').toLowerCase() === 'online' ? 'online' : 'offline',
            location: device.LOC || device.location || 'Unknown',
            lastSeen: device.LS || device.lastSeen || '—',
          }))
        : [];

      setDevices(mapped);
    } catch (error) {
      console.error('Failed to load devices', error);
      Alert.alert('Error', 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  }, [buildAuthPayload, companySession, pinSession]);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const addDevice = async (deviceData: Omit<Device, 'id' | 'status' | 'lastSeen'>) => {
    try {
      await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.REGISTER,
        {
          ...buildAuthPayload(),
          T1: 'DEVICE_REGISTER',
          D2: deviceData.name,
          DT: deviceData.type,
          LOC: deviceData.location,
        },
        { requireAuth: false }
      );
      await loadDevices();
      Alert.alert('Success', 'Device added successfully');
    } catch (error) {
      console.error('Failed to add device', error);
      Alert.alert('Error', 'Failed to add device');
    }
  };

  const removeDevice = async (deviceId: string) => {
    try {
      await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.DELETE,
        {
          ...buildAuthPayload(),
          T1: 'DEVICE_DELETE',
          D1: deviceId,
        },
        { requireAuth: false }
      );
      await loadDevices();
      Alert.alert('Success', 'Device removed successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to remove device');
    }
  };

  const updateDevice = async (deviceId: string, updates: Partial<Device>) => {
    try {
      await toonClient.toonPost(
        API_ENDPOINTS.DEVICES.UPDATE,
        {
          ...buildAuthPayload(),
          T1: 'DEVICE_UPDATE',
          D1: deviceId,
          ...updates,
        },
        { requireAuth: false }
      );
      await loadDevices();
      Alert.alert('Success', 'Device updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update device');
    }
  };

  return {
    devices,
    loading,
    addDevice,
    removeDevice,
    updateDevice,
  };
}
