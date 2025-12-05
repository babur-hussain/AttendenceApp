/**
 * DayDetail - Day Drill-down Screen
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useHistory } from '../../hooks/useHistory';
import { RawToonViewer } from '../../components/history/RawToonViewer';

interface DayDetailProps {
  route: { params: { date: string } };
}

export const DayDetail: React.FC<DayDetailProps> = ({ route }) => {
  const { date } = route.params;
  const { isLoading, dayEvents, fetchDayEvents } = useHistory();
  const [selectedToon, setSelectedToon] = useState<string | null>(null);

  useEffect(() => {
    fetchDayEvents(date);
  }, [date]);

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        <Text style={styles.subtitle}>{dayEvents.length} events</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 40 }} />
      ) : (
        dayEvents.map((event) => (
          <View key={event.eventId} style={styles.eventCard}>
            <View style={styles.eventHeader}>
              <Text style={styles.eventType}>{event.eventType}</Text>
              <Text style={styles.eventTime}>{formatTime(event.timestamp)}</Text>
            </View>
            <View style={styles.eventDetails}>
              <Text style={styles.detail}>Device: {event.deviceId}</Text>
              {event.matchScore && <Text style={styles.detail}>Match: {(event.matchScore * 100).toFixed(1)}%</Text>}
              {event.livenessScore && <Text style={styles.detail}>Liveness: {(event.livenessScore * 100).toFixed(1)}%</Text>}
              <Text style={[styles.status, { color: event.status === 'ok' ? '#4CAF50' : '#FF9800' }]}>{event.status.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={() => setSelectedToon(event.rawToon)} style={styles.viewToonBtn}>
              <Text style={styles.viewToonText}>View Raw TOON</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <RawToonViewer visible={!!selectedToon} rawToon={selectedToon || ''} onClose={() => setSelectedToon(null)} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  eventCard: { backgroundColor: '#fff', margin: 12, borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  eventType: { fontSize: 16, fontWeight: 'bold', color: '#007AFF' },
  eventTime: { fontSize: 14, color: '#666' },
  eventDetails: { gap: 6 },
  detail: { fontSize: 13, color: '#666' },
  status: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  viewToonBtn: { marginTop: 12, padding: 10, backgroundColor: '#F5F5F5', borderRadius: 8 },
  viewToonText: { fontSize: 13, fontWeight: '600', color: '#007AFF', textAlign: 'center' },
});
