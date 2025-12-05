import { useState } from 'react';
import { Modal } from '../common/Modal';
import type { DeviceRegistration, DeviceType, DeviceCapability } from '../../types/device';
import { DEVICE_TYPE_OPTIONS, DEVICE_CAPABILITY_OPTIONS } from '../../types/device';

interface RegisterDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister: (registration: DeviceRegistration) => Promise<{ success: boolean; error?: string }>;
}

export function RegisterDeviceModal({ isOpen, onClose, onRegister }: RegisterDeviceModalProps) {
  const [deviceId, setDeviceId] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('MOBILE');
  const [publicKey, setPublicKey] = useState('');
  const [capabilities, setCapabilities] = useState<DeviceCapability[]>(['FACE']);
  const [policyId, setPolicyId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const registration: DeviceRegistration = {
      D1: deviceId,
      D2: deviceType,
      PK1: publicKey,
      D3: capabilities.join(','),
    };

    if (policyId) {
      registration.M1 = policyId;
    }

    const result = await onRegister(registration);

    setSubmitting(false);

    if (result.success) {
      // Reset form
      setDeviceId('');
      setPublicKey('');
      setCapabilities(['FACE']);
      setPolicyId('');
      onClose();
    } else {
      setError(result.error || 'Registration failed');
    }
  };

  const toggleCapability = (cap: DeviceCapability) => {
    setCapabilities((prev) =>
      prev.includes(cap) ? prev.filter((c) => c !== cap) : [...prev, cap]
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register New Device">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Device ID */}
        <div>
          <label htmlFor="deviceId" className="block text-sm font-medium text-gray-700 mb-1">
            Device ID (D1) *
          </label>
          <input
            type="text"
            id="deviceId"
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="e.g., DEVICE_001"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Device Type */}
        <div>
          <label htmlFor="deviceType" className="block text-sm font-medium text-gray-700 mb-1">
            Device Type (D2) *
          </label>
          <select
            id="deviceType"
            value={deviceType}
            onChange={(e) => setDeviceType(e.target.value as DeviceType)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            {DEVICE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Capabilities */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Capabilities (D3) *
          </label>
          <div className="space-y-2">
            {DEVICE_CAPABILITY_OPTIONS.map((option) => (
              <label key={option.value} className="flex items-center">
                <input
                  type="checkbox"
                  checked={capabilities.includes(option.value as DeviceCapability)}
                  onChange={() => toggleCapability(option.value as DeviceCapability)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Public Key */}
        <div>
          <label htmlFor="publicKey" className="block text-sm font-medium text-gray-700 mb-1">
            Public Key PEM (PK1) *
          </label>
          <textarea
            id="publicKey"
            value={publicKey}
            onChange={(e) => setPublicKey(e.target.value)}
            placeholder="-----BEGIN PUBLIC KEY-----&#10;...&#10;-----END PUBLIC KEY-----"
            required
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 font-mono text-xs"
          />
        </div>

        {/* Policy ID */}
        <div>
          <label htmlFor="policyId" className="block text-sm font-medium text-gray-700 mb-1">
            Default Policy ID (M1) - Optional
          </label>
          <input
            type="text"
            id="policyId"
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            placeholder="e.g., POLICY_DEFAULT"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || capabilities.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? 'Registering...' : 'Register Device'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
