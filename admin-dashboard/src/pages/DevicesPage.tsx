import { useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { DeviceTable, DeviceDetailsModal, RegisterDeviceModal } from '../components/devices';
import { useDevices } from '../hooks/useDevices';
import { useDeviceCommands } from '../hooks/useDeviceCommands';
import type { Device } from '../types/device';

export const DevicesPage: React.FC = () => {
  const {
    devices,
    healthSummary,
    alerts,
    loading,
    error,
    fetchDevices,
    registerDevice,
    bulkRevoke,
    exportDevices,
    startPolling,
    stopPolling,
    subscribeToUpdates,
  } = useDevices();

  const { revokeDevice, requestConfirmation, pendingCommand, confirmCommand, cancelCommand } =
    useDeviceCommands();

  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchDevices();
    startPolling();
    subscribeToUpdates();

    return () => {
      stopPolling();
    };
  }, [fetchDevices, startPolling, stopPolling, subscribeToUpdates]);

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleSelectDevice = (deviceId: string) => {
    setSelectedDevices((prev) =>
      prev.includes(deviceId) ? prev.filter((id) => id !== deviceId) : [...prev, deviceId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDevices.length === devices.length) {
      setSelectedDevices([]);
    } else {
      setSelectedDevices(devices.map((d) => d.D1));
    }
  };

  const handleRevoke = (device: Device) => {
    requestConfirmation(device.D1, 'restart', async () => {
      const result = await revokeDevice(device.D1);
      if (result.success) {
        setToast({ message: `Device ${device.D1} revoked`, type: 'success' });
        fetchDevices();
      } else {
        setToast({ message: result.error || 'Revoke failed', type: 'error' });
      }
    });
  };

  const handleBulkRevoke = async () => {
    if (selectedDevices.length === 0) return;
    if (!confirm(`Revoke ${selectedDevices.length} device(s)?`)) return;

    const result = await bulkRevoke(selectedDevices);
    if (result.success) {
      setToast({
        message: `${result.revokedCount} device(s) revoked successfully`,
        type: 'success',
      });
      setSelectedDevices([]);
    } else {
      setToast({ message: result.error || 'Bulk revoke failed', type: 'error' });
    }
  };

  const handleExport = async (format: 'XLSX' | 'CSV') => {
    const result = await exportDevices(format);
    if (result.success) {
      setToast({ message: 'Export started', type: 'success' });
    } else {
      setToast({ message: result.error || 'Export failed', type: 'error' });
    }
  };

  const handleRegister = async (registration: any) => {
    const result = await registerDevice(registration);
    if (result.success) {
      setToast({ message: `Device ${result.deviceId} registered`, type: 'success' });
      return { success: true };
    } else {
      return { success: false, error: result.error };
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Device Monitoring</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage biometric devices and monitor their status in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Register Device
          </button>
          <button
            onClick={() => fetchDevices()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {toast.message}
        </div>
      )}

      {/* Health Summary */}
      {healthSummary && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-sm font-medium text-green-900">Online</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{healthSummary.ONLINE}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm font-medium text-gray-900">Offline</div>
            <div className="mt-2 text-3xl font-bold text-gray-600">{healthSummary.OFFLINE}</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm font-medium text-red-900">Error</div>
            <div className="mt-2 text-3xl font-bold text-red-600">{healthSummary.ERROR}</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm font-medium text-blue-900">Total</div>
            <div className="mt-2 text-3xl font-bold text-blue-600">{healthSummary.TOTAL}</div>
          </div>
        </div>
      )}

      {/* Recent Alerts */}
      {alerts.length > 0 && (
        <Card title="Recent Device Alerts">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.slice(0, 10).map((alert, idx) => (
              <div
                key={idx}
                className={`p-3 rounded border ${
                  alert.AL1 === 'CRITICAL'
                    ? 'bg-red-50 border-red-200'
                    : alert.AL1 === 'ERROR'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-yellow-50 border-yellow-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-sm">{alert.D1}</span>
                    <span className="ml-2 text-xs text-gray-600">{alert.AL1}</span>
                  </div>
                  <span className="text-xs text-gray-500">{alert.TS}</span>
                </div>
                <p className="mt-1 text-sm text-gray-700">{alert.AL2}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Bulk Actions */}
      {selectedDevices.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex justify-between items-center">
          <span className="text-sm font-medium text-blue-900">
            {selectedDevices.length} device(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkRevoke}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
            >
              Bulk Revoke
            </button>
            <button
              onClick={() => setSelectedDevices([])}
              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Devices Table */}
      <Card title="Registered Devices">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="mb-4 flex justify-end gap-2">
          <button
            onClick={() => handleExport('XLSX')}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export XLSX
          </button>
          <button
            onClick={() => handleExport('CSV')}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
        <DeviceTable
          devices={devices}
          selectedDevices={selectedDevices}
          onSelectDevice={handleSelectDevice}
          onSelectAll={handleSelectAll}
          onViewDetails={setSelectedDevice}
          onRevoke={handleRevoke}
          loading={loading}
        />
      </Card>

      {/* Modals */}
      {selectedDevice && (
        <DeviceDetailsModal
          device={selectedDevice}
          onClose={() => setSelectedDevice(null)}
          onRefresh={fetchDevices}
        />
      )}

      <RegisterDeviceModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onRegister={handleRegister}
      />

      {/* Confirmation Modal for Destructive Commands */}
      {pendingCommand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Confirm Action</h3>
            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to execute <strong>{pendingCommand.command}</strong> on device{' '}
              <strong>{pendingCommand.deviceId}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelCommand}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmCommand}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
