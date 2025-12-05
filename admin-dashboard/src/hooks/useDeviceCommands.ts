import { useState, useCallback } from 'react';
import { ToonClient } from '../toon';
import type { DeviceCommand, DeviceCommandType } from '../types/device';

const toonClient = new ToonClient({ baseURL: '/api' });

/**
 * Hook for device command execution with confirmation
 */
export function useDeviceCommands() {
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState<string>('');
  const [pendingCommand, setPendingCommand] = useState<{
    deviceId: string;
    command: DeviceCommandType;
    onConfirm: () => void;
  } | null>(null);

  // Execute command
  const executeCommand = useCallback(
    async (deviceId: string, command: DeviceCommandType, consentToken?: string) => {
      setExecuting(true);
      setError('');

      try {
        const payload: DeviceCommand = {
          D1: deviceId,
          CMD1: command,
        };

        if (consentToken) {
          payload.C1 = consentToken;
        }

        // For destructive commands, add signature token
        if (['restart', 'update-firmware'].includes(command)) {
          payload.SIG1 = `SIG_${Date.now()}_${deviceId}`;
        }

        const response = await toonClient.toonPost('/devices/command', payload);

        setExecuting(false);

        if (response.S1 === 'ok') {
          return { success: true, message: response.MSG || 'Command executed successfully' };
        } else {
          const errorMsg = response.ERR1 || 'Command execution failed';
          setError(errorMsg);
          return { success: false, error: errorMsg };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Command execution failed';
        setError(errorMsg);
        setExecuting(false);
        return { success: false, error: errorMsg };
      }
    },
    []
  );

  // Revoke device
  const revokeDevice = useCallback(async (deviceId: string) => {
    setExecuting(true);
    setError('');

    try {
      const response = await toonClient.toonPost('/devices/revoke', {
        D1: deviceId,
        SIG1: `SIG_REVOKE_${Date.now()}_${deviceId}`,
      });

      setExecuting(false);

      if (response.S1 === 'ok') {
        return { success: true, message: 'Device revoked successfully' };
      } else {
        const errorMsg = response.ERR1 || 'Revoke failed';
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Revoke failed';
      setError(errorMsg);
      setExecuting(false);
      return { success: false, error: errorMsg };
    }
  }, []);

  // Request command confirmation (for destructive ops)
  const requestConfirmation = useCallback(
    (deviceId: string, command: DeviceCommandType, onConfirm: () => void) => {
      setPendingCommand({ deviceId, command, onConfirm });
    },
    []
  );

  // Confirm pending command
  const confirmCommand = useCallback(() => {
    if (pendingCommand) {
      pendingCommand.onConfirm();
      setPendingCommand(null);
    }
  }, [pendingCommand]);

  // Cancel pending command
  const cancelCommand = useCallback(() => {
    setPendingCommand(null);
  }, []);

  return {
    executing,
    error,
    pendingCommand,
    executeCommand,
    revokeDevice,
    requestConfirmation,
    confirmCommand,
    cancelCommand,
  };
}
