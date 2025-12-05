/**
 * DeviceStatusCard - Device Status Card Component
 * 
 * Displays biometric device status with actions
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { DeviceStatus } from '../../hooks/useDeviceStatus';

interface DeviceStatusCardProps {
  device: DeviceStatus;
  onCommand: (deviceId: string, command: string) => void;
}

export const DeviceStatusCard: React.FC<DeviceStatusCardProps> = ({ device, onCommand }) => {
  const getDeviceIcon = (type: DeviceStatus['type']): string => {
    const icons = { FACE: '👤', FINGERPRINT: '👆', MOBILE: '📱' };
    return icons[type] || '📱';
  };

  const getStatusColor = (isOnline: boolean): string => (isOnline ? '#4CAF50' : '#F44336');

  const formatLastSeen = (timestamp: string | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <View style={[styles.card, { borderLeftColor: getStatusColor(device.isOnline) }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>{getDeviceIcon(device.type)}</Text>
        <View style={styles.info}>
          <Text style={styles.name}>{device.name}</Text>
          <Text style={styles.type}>{device.type}</Text>
        </View>
        <View style={[styles.statusDot, { backgroundColor: getStatusColor(device.isOnline) }]} />
      </View>

      <View style={styles.details}>
        <View style={styles.row}>
          <Text style={styles.label}>Last Seen:</Text>
          <Text style={styles.value}>{formatLastSeen(device.lastHeartbeat)}</Text>
        </View>

        {device.batteryPercent !== null && (
          <View style={styles.row}>
            <Text style={styles.label}>Battery:</Text>
            <Text style={[styles.value, device.batteryPercent < 20 && styles.warningText]}>
              {device.batteryPercent}%
            </Text>
          </View>
        )}

        {device.firmwareVersion && (
          <View style={styles.row}>
            <Text style={styles.label}>Firmware:</Text>
            <Text style={styles.value}>{device.firmwareVersion}</Text>
          </View>
        )}

        {device.pendingCommandsCount > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Pending Cmds:</Text>
            <Text style={[styles.value, styles.warningText]}>{device.pendingCommandsCount}</Text>
          </View>
        )}

        {device.location && (
          <View style={styles.row}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{device.location}</Text>
          </View>
        )}
      </View>

      {device.isOnline && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onCommand(device.deviceId, 'SYNC')}
          >
            <Text style={styles.actionText}>🔄 Sync</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onCommand(device.deviceId, 'REBOOT')}
          >
            <Text style={styles.actionText}>⚡ Reboot</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  icon: {
    fontSize: 32,
    marginRight: 12,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  type: {
    fontSize: 13,
    color: '#757575',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  details: {
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    fontSize: 13,
    color: '#757575',
  },
  value: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
  },
  warningText: {
    color: '#F57C00',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#E3F2FD',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionText: {
    color: '#1976D2',
    fontWeight: '600',
    fontSize: 12,
  },
});
