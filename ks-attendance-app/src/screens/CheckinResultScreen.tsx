/**
 * CheckinResultScreen - Shows result of check-in attempt
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { EventStatus } from '../types/checkin';

type Props = {
  route: any;
  navigation: any;
};

export function CheckinResultScreen({ route, navigation }: Props) {
  const { eventId, status, reason } = route.params as {
    eventId: string;
    status: EventStatus;
    reason?: string;
  };

  const getStatusColor = () => {
    switch (status) {
      case 'ACCEPTED':
      case 'SENT':
        return '#34C759';
      case 'QUEUED':
        return '#FF9500';
      case 'PENDING':
        return '#007AFF';
      case 'REJECTED':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'ACCEPTED':
        return 'Check-in Accepted';
      case 'SENT':
        return 'Successfully Sent';
      case 'QUEUED':
        return 'Saved Offline';
      case 'PENDING':
        return 'Pending Review';
      case 'REJECTED':
        return 'Check-in Rejected';
      default:
        return 'Unknown Status';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'ACCEPTED':
      case 'SENT':
        return '✓';
      case 'QUEUED':
        return '⏱';
      case 'PENDING':
        return '⋯';
      case 'REJECTED':
        return '✗';
      default:
        return '?';
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: getStatusColor() }]}>
        <Text style={styles.icon}>{getStatusIcon()}</Text>
      </View>

      <Text style={styles.statusTitle}>{getStatusMessage()}</Text>

      {reason && (
        <Text style={styles.reason}>{reason}</Text>
      )}

      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Event ID:</Text>
          <Text style={styles.detailValue}>{eventId}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Status:</Text>
          <Text style={[styles.detailValue, { color: getStatusColor() }]}>{status}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Time:</Text>
          <Text style={styles.detailValue}>{new Date().toLocaleTimeString()}</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.buttonText}>Done</Text>
      </TouchableOpacity>

      {status === 'QUEUED' && (
        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={() => navigation.navigate('OfflineQueue')}
        >
          <Text style={styles.secondaryButtonText}>View Queue</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
    color: 'white',
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  reason: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  detailsCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    width: '100%',
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  secondaryButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
