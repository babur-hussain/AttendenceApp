import type { Device } from '../../types/device';

interface DeviceTableProps {
  devices: Device[];
  selectedDevices: string[];
  onSelectDevice: (deviceId: string) => void;
  onSelectAll: () => void;
  onViewDetails: (device: Device) => void;
  onRevoke: (device: Device) => void;
  loading?: boolean;
}

export function DeviceTable({
  devices,
  selectedDevices,
  onSelectDevice,
  onSelectAll,
  onViewDetails,
  onRevoke,
  loading = false,
}: DeviceTableProps) {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ONLINE: 'bg-green-100 text-green-800',
      OFFLINE: 'bg-gray-100 text-gray-800',
      ERROR: 'bg-red-100 text-red-800',
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
        }`}
      >
        {status}
      </span>
    );
  };

  const getDeviceTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      MOBILE: 'Mobile Kiosk',
      KIOSK: 'Fixed Kiosk',
      RPI: 'Raspberry Pi',
      FINGERPRINT_TERMINAL: 'Fingerprint',
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No devices registered</p>
      </div>
    );
  }

  const allSelected = devices.length > 0 && selectedDevices.length === devices.length;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Device ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Last Seen
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Capabilities
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Firmware
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {devices.map((device) => (
            <tr key={device.D1} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={selectedDevices.includes(device.D1)}
                  onChange={() => onSelectDevice(device.D1)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{device.D1}</div>
                <div className="text-xs text-gray-500 font-mono truncate max-w-xs">
                  {device.D5}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{getDeviceTypeLabel(device.D2)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(device.DS1)}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{formatDate(device.DS2)}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-wrap gap-1">
                  {device.D3.split(',').map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-0.5 text-xs bg-blue-50 text-blue-700 rounded"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{device.D4}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <div className="flex gap-2">
                  <button
                    onClick={() => onViewDetails(device)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Details
                  </button>
                  <button
                    onClick={() => onRevoke(device)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Revoke
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
