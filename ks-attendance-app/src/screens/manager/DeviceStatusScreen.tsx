/**
 * DeviceStatusScreen - Device Status Monitoring Screen
 * 
 * Shows biometric device status and allows command execution
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDeviceStatus } from '../../hooks/useDeviceStatus';
import { DeviceStatusCard, MetricChip } from '../../components/manager';

interface DeviceStatusScreenProps {
  navigation: any;
  managerId: string;
}

export const DeviceStatusScreen: React.FC<DeviceStatusScreenProps> = ({ navigation, managerId = 'MGR_001' }) => {
  const {
    devices,
    loading,
    error,
    commandInProgress,
    fetchDeviceStatus,
    sendCommand,
    getOnlineCount,
    getOfflineCount,
  } = useDeviceStatus();

  const handleCommand = async (deviceId: string, command: string) => {
    Alert.alert(
      'Confirm Command',
      `Send ${command} command to device?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            const success = await sendCommand(deviceId, command as any, managerId);
            if (success) {
              Alert.alert('Success', `${command} command sent successfully`);
            } else {
              Alert.alert('Error', `Failed to send ${command} command`);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Device Status</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Status Summary */}
      {devices.length > 0 && (
        <View style={styles.summary}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
            <View style={styles.chips}>
              <MetricChip
                icon="✅"
                value={getOnlineCount()}
                label="Online"
                color="#2E7D32"
                backgroundColor="#C8E6C9"
              />
              <MetricChip
                icon="❌"
                value={getOfflineCount()}
                label="Offline"
                color="#C62828"
                backgroundColor="#FFCDD2"
              />
              <MetricChip
                icon="📱"
                value={devices.length}
                label="Total"
                color="#1976D2"
                backgroundColor="#E3F2FD"
              />
            </View>
          </ScrollView>
        </View>
      )}

      {/* Device List */}
      {loading && devices.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading devices...</Text>
        </View>
      ) : error && devices.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDeviceStatus}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchDeviceStatus} />}
        >
          {devices.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No devices found</Text>
            </View>
          ) : (
            devices.map((device) => (
              <DeviceStatusCard
                key={device.deviceId}
                device={device}
                onCommand={handleCommand}
              />
            ))
          )}
          <View style={styles.listFooter} />
        </ScrollView>
      )}

      {/* Command In Progress Overlay */}
      {commandInProgress && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.overlayText}>Sending command...</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  placeholder: {
    width: 60,
  },
  summary: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  scroll: {
    paddingHorizontal: 16,
  },
  chips: {
    flexDirection: 'row',
    gap: 12,
  },
  list: {
    flex: 1,
  },
  listFooter: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    color: '#D32F2F',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: '#9E9E9E',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    alignItems: 'center',
    gap: 16,
  },
  overlayText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
