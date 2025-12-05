/**
 * OfflineQueueScreen - View and manage queued offline events
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import CheckinFlowCoordinator from '../services/CheckinFlowCoordinator';
import type { LocalEventQueueItem } from '../types/checkin';

type Props = {
  navigation: any;
};

export function OfflineQueueScreen({ navigation }: Props) {
  const [events, setEvents] = useState<LocalEventQueueItem[]>([]);
  const [stats, setStats] = useState({ total: 0, queued: 0, sent: 0, failed: 0, duplicate: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const loadEvents = async () => {
    const coordinator = CheckinFlowCoordinator;
    const allEvents = await coordinator.getAllEvents();
    const queueStats = await coordinator.getQueueStats();
    setEvents(allEvents);
    setStats(queueStats);
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleResend = async (eventId: string) => {
    const coordinator = CheckinFlowCoordinator;
    const result = await coordinator.resendEvent(eventId);
    
    if (result.success) {
      Alert.alert('Success', 'Event sent successfully');
    } else {
      Alert.alert('Error', result.error || 'Failed to send event');
    }
    
    loadEvents();
  };

  const handleDelete = async (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const coordinator = CheckinFlowCoordinator;
            await coordinator.deleteEvent(eventId);
            loadEvents();
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return '#34C759';
      case 'queued':
        return '#FF9500';
      case 'failed':
        return '#FF3B30';
      case 'duplicate':
        return '#666';
      default:
        return '#007AFF';
    }
  };

  const renderEvent = ({ item }: { item: LocalEventQueueItem }) => (
    <View style={styles.eventCard}>
      <View style={styles.eventHeader}>
        <Text style={styles.eventId} numberOfLines={1}>{item.eventId}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>

      <Text style={styles.eventDate}>{new Date(item.created_at).toLocaleString()}</Text>
      
      {item.attempts > 0 && (
        <Text style={styles.attempts}>Attempts: {item.attempts}</Text>
      )}

      {item.error_message && (
        <Text style={styles.error}>{item.error_message}</Text>
      )}

      <View style={styles.buttonRow}>
        {(item.status === 'queued' || item.status === 'failed') && (
          <TouchableOpacity
            style={[styles.actionButton, styles.resendButton]}
            onPress={() => handleResend(item.eventId)}
          >
            <Text style={styles.actionButtonText}>Resend</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDelete(item.eventId)}
        >
          <Text style={styles.actionButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Stats Header */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.queued}</Text>
          <Text style={styles.statLabel}>Queued</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.failed}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.sent}</Text>
          <Text style={styles.statLabel}>Sent</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Event List */}
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.eventId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No events in queue</Text>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  eventCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventId: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  eventDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  attempts: {
    fontSize: 12,
    color: '#FF9500',
    marginBottom: 4,
  },
  error: {
    fontSize: 12,
    color: '#FF3B30',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    marginRight: 8,
  },
  resendButton: {
    backgroundColor: '#007AFF',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
