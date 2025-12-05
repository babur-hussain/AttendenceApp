/**
 * OfflineQueue - Queue Management UI
 */

import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAttendanceQueue } from '../../hooks/useAttendanceQueue';
import { QueuedEvent } from '../../services/AttendanceService';

export const OfflineQueue: React.FC = () => {
  const { queue, isReconciling, reconcile, retry, deleteEvent } = useAttendanceQueue();

  const renderItem = ({ item }: { item: QueuedEvent }) => (
    <View style={styles.item}>
      <View style={styles.header}>
        <Text style={styles.type}>{item.eventType}</Text>
        <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.time}>{new Date(item.createdAt).toLocaleString()}</Text>
      <Text style={styles.attempts}>Attempts: {item.attempts}</Text>
      
      <View style={styles.actions}>
        {item.status === 'failed' && (
          <TouchableOpacity onPress={() => retry(item.id)} style={styles.btnRetry}>
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.btnDelete}>
          <Text style={styles.btnText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const confirmDelete = (id: string) => {
    Alert.alert('Delete Event', 'Remove from queue?', [
      { text: 'Cancel' },
      { text: 'Delete', onPress: () => deleteEvent(id), style: 'destructive' },
    ]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return '#4CAF50';
      case 'duplicate': return '#FF9800';
      case 'pending': return '#2196F3';
      case 'failed': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <Text style={styles.title}>Offline Queue ({queue.length})</Text>
        <TouchableOpacity onPress={reconcile} disabled={isReconciling}>
          <Text style={styles.syncBtn}>{isReconciling ? 'Syncing...' : 'Sync Now'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={queue}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.empty}>No pending events</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold' },
  syncBtn: { color: '#007AFF', fontWeight: '600' },
  item: { backgroundColor: '#fff', padding: 16, marginHorizontal: 16, marginTop: 8, borderRadius: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  type: { fontSize: 16, fontWeight: 'bold' },
  status: { fontSize: 14, fontWeight: '600' },
  time: { marginTop: 4, color: '#666' },
  attempts: { marginTop: 2, color: '#999', fontSize: 12 },
  actions: { flexDirection: 'row', marginTop: 12 },
  btnRetry: { padding: 8, backgroundColor: '#007AFF', borderRadius: 4, marginRight: 8 },
  btnDelete: { padding: 8, backgroundColor: '#F44336', borderRadius: 4 },
  btnText: { color: '#fff', fontSize: 14 },
  empty: { textAlign: 'center', marginTop: 40, color: '#999' },
});
