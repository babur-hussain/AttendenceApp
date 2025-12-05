import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { Device } from '../../types/device';
import { useDeviceDetails } from '../../hooks/useDevices';
import { useDeviceCommands } from '../../hooks/useDeviceCommands';
import { DEVICE_COMMAND_OPTIONS } from '../../types/device';

interface DeviceDetailsModalProps {
  device: Device;
  onClose: () => void;
  onRefresh: () => void;
}

export function DeviceDetailsModal({ device, onClose, onRefresh }: DeviceDetailsModalProps) {
  const { events, health, loading } = useDeviceDetails(device.D1);
  const { executeCommand, executing } = useDeviceCommands();
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'health' | 'raw'>('overview');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleCommand = async (command: string) => {
    const result = await executeCommand(device.D1, command as any);
    if (result.success) {
      setToast({ message: result.message || 'Command executed', type: 'success' });
      setTimeout(() => {
        onRefresh();
        setToast(null);
      }, 2000);
    } else {
      setToast({ message: result.error || 'Command failed', type: 'error' });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setToast({ message: 'Copied to clipboard', type: 'success' });
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <Modal title={`Device: ${device.D1}`} onClose={onClose} isOpen={true}>
      {toast && (
        <div
          className={`mb-4 px-4 py-2 rounded ${
            toast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'events', 'health', 'raw'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Device Type</label>
                <p className="mt-1 text-sm text-gray-900">{device.D2}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1 text-sm text-gray-900">{device.DS1}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Firmware Version</label>
                <p className="mt-1 text-sm text-gray-900">{device.D4}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Capabilities</label>
                <p className="mt-1 text-sm text-gray-900">{device.D3}</p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-700">Public Key Fingerprint</label>
                <p className="mt-1 text-sm text-gray-900 font-mono break-all">{device.D5}</p>
              </div>
              {device.M1 && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Policy ID</label>
                  <p className="mt-1 text-sm text-gray-900">{device.M1}</p>
                </div>
              )}
            </div>

            {/* Commands */}
            <div className="border-t pt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Device Commands</h3>
              <div className="flex flex-wrap gap-2">
                {DEVICE_COMMAND_OPTIONS.map((cmd) => (
                  <button
                    key={cmd.value}
                    onClick={() => handleCommand(cmd.value)}
                    disabled={executing}
                    className={`px-3 py-2 text-sm rounded ${
                      cmd.destructive
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    } disabled:bg-gray-300 disabled:cursor-not-allowed`}
                  >
                    {cmd.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Last 50 Events</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : events.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">No events found</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {events.map((event) => (
                  <div
                    key={event.E1}
                    className="p-3 bg-gray-50 rounded border border-gray-200 text-sm"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium">{event.ET1}</span>
                        <span className="ml-2 text-gray-500">{event.E1}</span>
                      </div>
                      <span className="text-xs text-gray-500">{event.TS}</span>
                    </div>
                    {event.PL1 && (
                      <div className="mt-2 text-xs text-gray-600 font-mono break-all">
                        {event.PL1}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'health' && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">Health Metrics</h3>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : health ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded">
                  <div className="text-sm font-medium text-blue-900">Uptime</div>
                  <div className="mt-2 text-2xl font-bold text-blue-600">
                    {Math.floor(health.H1 / 3600)}h
                  </div>
                  <div className="text-xs text-blue-700">{health.H1} seconds</div>
                </div>
                <div className="p-4 bg-green-50 rounded">
                  <div className="text-sm font-medium text-green-900">Memory</div>
                  <div className="mt-2 text-2xl font-bold text-green-600">{health.H2} MB</div>
                </div>
                <div className="p-4 bg-orange-50 rounded">
                  <div className="text-sm font-medium text-orange-900">CPU Temp</div>
                  <div className="mt-2 text-2xl font-bold text-orange-600">{health.H3}°C</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">No health data available</p>
            )}
          </div>
        )}

        {activeTab === 'raw' && (
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">Raw TOON Payload</h3>
              <button
                onClick={() => copyToClipboard(device.RAW_TOON || '')}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Copy
              </button>
            </div>
            <div className="bg-gray-900 text-gray-100 p-4 rounded font-mono text-xs overflow-x-auto">
              <pre className="whitespace-pre-wrap break-all">{device.RAW_TOON}</pre>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
