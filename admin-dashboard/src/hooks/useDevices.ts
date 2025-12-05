import { useState, useCallback, useEffect, useRef } from 'react';
import { ToonClient, ToonCodec } from '../toon';
import type {
  Device,
  DeviceHealthSummary,
  DeviceRegistration,
  DeviceHealth,
  DeviceEvent,
  DeviceAlert,
} from '../types/device';

const toonClient = new ToonClient({ baseURL: '/api' });

/**
 * Hook for device list management with polling and websocket support
 */
export function useDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [healthSummary, setHealthSummary] = useState<DeviceHealthSummary | null>(null);
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch devices list
  const fetchDevices = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await toonClient.toonGet('/devices');

      if (response.DEVICES) {
        // Parse batch of devices separated by ||
        const deviceStrings = response.DEVICES.split('||');
        const parsedDevices: Device[] = deviceStrings.map((deviceStr: string) => {
          const decoded = ToonCodec.decode(deviceStr);
          return {
            ...decoded,
            RAW_TOON: deviceStr,
          } as Device;
        });
        setDevices(parsedDevices);
      } else {
        setDevices([]);
      }

      setLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch devices';
      setError(errorMsg);
      setLoading(false);
    }
  }, []);

  // Fetch health summary
  const fetchHealthSummary = useCallback(async () => {
    try {
      const response = await toonClient.toonGet('/devices/events/health');
      setHealthSummary(response as DeviceHealthSummary);
    } catch (err) {
      console.error('Failed to fetch health summary:', err);
    }
  }, []);

  // Register new device
  const registerDevice = useCallback(async (registration: DeviceRegistration) => {
    setLoading(true);
    setError('');

    try {
      const response = await toonClient.toonPost('/devices/register', registration);

      if (response.S1 === 'ok') {
        await fetchDevices();
        return { success: true, deviceId: response.D1 };
      } else {
        return { success: false, error: response.ERR1 || 'Registration failed' };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [fetchDevices]);

  // Bulk revoke devices
  const bulkRevoke = useCallback(async (deviceIds: string[]) => {
    setLoading(true);
    setError('');

    try {
      const response = await toonClient.toonPost('/devices/bulk-revoke', {
        DEVICE_IDS: deviceIds.join(','),
      });

      if (response.S1 === 'ok') {
        await fetchDevices();
        return { success: true, revokedCount: response.REVOKED_COUNT || deviceIds.length };
      } else {
        return { success: false, error: response.ERR1 || 'Bulk revoke failed' };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Bulk revoke failed';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [fetchDevices]);

  // Export devices
  const exportDevices = useCallback(async (format: 'XLSX' | 'CSV' = 'XLSX') => {
    try {
      const blob = await toonClient.toonDownload(`/devices/export?FORMAT=${format}`);
      const filename = `devices_export_${Date.now()}.${format.toLowerCase()}`;
      ToonClient.triggerDownload(blob, filename);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Export failed' };
    }
  }, []);

  // Start polling (every 10s)
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(() => {
      fetchHealthSummary();
    }, 10000);

    // Initial fetch
    fetchHealthSummary();
  }, [fetchHealthSummary]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // WebSocket subscription (optional)
  const subscribeToUpdates = useCallback(() => {
    // Skip if websocket already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = `ws://localhost:3000/ws/devices/updates`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected to device updates');
    };

    ws.onmessage = (event) => {
      try {
        // Expect TOON payload
        const payload = ToonCodec.decode(event.data);

        if (payload.EVENT_TYPE === 'onDeviceHeartbeat') {
          // Update device in list
          setDevices((prev) =>
            prev.map((d) =>
              d.D1 === payload.D1
                ? { ...d, DS1: 'ONLINE', DS2: payload.TS, RAW_TOON: event.data }
                : d
            )
          );
        } else if (payload.EVENT_TYPE === 'onDeviceAlert') {
          // Add alert
          setAlerts((prev) => [
            {
              D1: payload.D1,
              AL1: payload.AL1,
              AL2: payload.AL2,
              TS: payload.TS,
            },
            ...prev.slice(0, 49), // Keep last 50
          ]);
        }
      } catch (err) {
        console.error('Failed to parse WebSocket TOON payload:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      // Attempt reconnect after 5s
      setTimeout(() => {
        if (wsRef.current === ws) {
          subscribeToUpdates();
        }
      }, 5000);
    };

    wsRef.current = ws;
  }, []);

  // Unsubscribe from updates
  const unsubscribeFromUpdates = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
      unsubscribeFromUpdates();
    };
  }, [stopPolling, unsubscribeFromUpdates]);

  return {
    devices,
    healthSummary,
    alerts,
    loading,
    error,
    fetchDevices,
    fetchHealthSummary,
    registerDevice,
    bulkRevoke,
    exportDevices,
    startPolling,
    stopPolling,
    subscribeToUpdates,
    unsubscribeFromUpdates,
  };
}

/**
 * Hook for individual device operations
 */
export function useDeviceDetails(deviceId: string) {
  const [device, setDevice] = useState<Device | null>(null);
  const [events, setEvents] = useState<DeviceEvent[]>([]);
  const [health, setHealth] = useState<DeviceHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchDeviceDetails = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await toonClient.toonGet(`/devices/${deviceId}`);
      setDevice({
        ...response,
        RAW_TOON: ToonCodec.encode(response),
      } as Device);
      setLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch device';
      setError(errorMsg);
      setLoading(false);
    }
  }, [deviceId]);

  const fetchDeviceEvents = useCallback(async () => {
    try {
      const response = await toonClient.toonGet(`/devices/${deviceId}/events?LIMIT=50`);

      if (response.EVENTS) {
        const eventStrings = response.EVENTS.split('||');
        const parsedEvents: DeviceEvent[] = eventStrings.map((eventStr: string) =>
          ToonCodec.decode(eventStr)
        );
        setEvents(parsedEvents);
      }
    } catch (err) {
      console.error('Failed to fetch device events:', err);
    }
  }, [deviceId]);

  const fetchDeviceHealth = useCallback(async () => {
    try {
      const response = await toonClient.toonGet(`/devices/${deviceId}/health`);
      setHealth(response as DeviceHealth);
    } catch (err) {
      console.error('Failed to fetch device health:', err);
    }
  }, [deviceId]);

  useEffect(() => {
    if (deviceId) {
      fetchDeviceDetails();
      fetchDeviceEvents();
      fetchDeviceHealth();
    }
  }, [deviceId, fetchDeviceDetails, fetchDeviceEvents, fetchDeviceHealth]);

  return {
    device,
    events,
    health,
    loading,
    error,
    refetch: fetchDeviceDetails,
  };
}
