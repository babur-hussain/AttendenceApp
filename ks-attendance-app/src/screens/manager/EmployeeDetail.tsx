/**
 * EmployeeDetail - Employee Detail Screen
 * 
 * Shows detailed employee attendance data, timeline, and override tools
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useEmployeeDetail } from '../../hooks/useEmployeeDetail';
import { MetricChip, StatusBadge } from '../../components/manager';
import { RawToonViewer } from '../../components/history/RawToonViewer';

interface EmployeeDetailProps {
  route: { params: { employeeId: string } };
  navigation: any;
}

export const EmployeeDetail: React.FC<EmployeeDetailProps> = ({ route, navigation }) => {
  const { employeeId } = route.params;
  const { detail, timeline, loading, error, refresh } = useEmployeeDetail(employeeId);
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showToonViewer, setShowToonViewer] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  useEffect(() => {
    refresh();
  }, [employeeId]);

  const formatDate = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventTypeLabel = (eventType: string): string => {
    const labels: Record<string, string> = {
      IN: '→ Check-in',
      OUT: '← Check-out',
      BREAK_START: '☕ Break Start',
      BREAK_END: '↩ Break End',
    };
    return labels[eventType] || eventType;
  };

  const handleEventPress = (event: any) => {
    setSelectedEvent(event);
    setShowToonViewer(true);
  };

  const handleOverride = () => {
    navigation.navigate('OverrideEventModal', { employeeId });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Employee Detail</Text>
        <TouchableOpacity onPress={handleOverride}>
          <Text style={styles.overrideButton}>✏️</Text>
        </TouchableOpacity>
      </View>

      {loading && !detail ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      ) : error && !detail ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refresh()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : detail ? (
        <ScrollView
          style={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
        >
          {/* Profile Section */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.initials}>
                {detail.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
            <Text style={styles.name}>{detail.name}</Text>
            <Text style={styles.role}>{detail.role}</Text>
            <Text style={styles.employeeId}>ID: {detail.employeeId}</Text>
          </View>

          {/* Metrics */}
          <View style={styles.metricsSection}>
            <Text style={styles.sectionTitle}>Last 7 Days Summary</Text>
            <View style={styles.metricsGrid}>
              <MetricChip
                icon="📅"
                value={detail.metrics.totalDaysPresent}
                label="Days Present"
                color="#2E7D32"
                backgroundColor="#C8E6C9"
              />
              <MetricChip
                icon="⏰"
                value={`${detail.metrics.totalHours.toFixed(1)}h`}
                label="Total Hours"
                color="#1976D2"
                backgroundColor="#E3F2FD"
              />
              <MetricChip
                icon="⏱️"
                value={`${detail.metrics.overtimeMinutes}m`}
                label="Overtime"
                color="#F57C00"
                backgroundColor="#FFE0B2"
              />
              <MetricChip
                icon="☕"
                value={`${detail.metrics.breakUsagePercent.toFixed(0)}%`}
                label="Break Usage"
                color="#7B1FA2"
                backgroundColor="#E1BEE7"
              />
              <MetricChip
                icon="✅"
                value={`${detail.metrics.punctualityPercent.toFixed(0)}%`}
                label="Punctuality"
                color={detail.metrics.punctualityPercent >= 90 ? '#2E7D32' : '#F57C00'}
                backgroundColor={detail.metrics.punctualityPercent >= 90 ? '#C8E6C9' : '#FFE0B2'}
              />
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Recent Events</Text>
            {timeline.length === 0 ? (
              <Text style={styles.emptyText}>No recent events</Text>
            ) : (
              timeline.map((event, index) => (
                <TouchableOpacity
                  key={`${event.eventId}-${index}`}
                  style={styles.eventCard}
                  onPress={() => handleEventPress(event)}
                >
                  <View style={styles.eventHeader}>
                    <Text style={styles.eventType}>{getEventTypeLabel(event.eventType)}</Text>
                    <StatusBadge
                      status={event.status === 'APPROVED' ? 'PRESENT' : 'PENDING'}
                      size="small"
                    />
                  </View>
                  <Text style={styles.eventTime}>{formatDate(event.timestamp)}</Text>
                  
                  <View style={styles.eventDetails}>
                    {event.matchScore !== null && (
                      <View style={styles.eventDetail}>
                        <Text style={styles.eventDetailLabel}>Match:</Text>
                        <Text style={styles.eventDetailValue}>
                          {(event.matchScore * 100).toFixed(0)}%
                        </Text>
                      </View>
                    )}
                    {event.livenessScore !== null && (
                      <View style={styles.eventDetail}>
                        <Text style={styles.eventDetailLabel}>Liveness:</Text>
                        <Text style={styles.eventDetailValue}>
                          {(event.livenessScore * 100).toFixed(0)}%
                        </Text>
                      </View>
                    )}
                    {event.deviceId && (
                      <View style={styles.eventDetail}>
                        <Text style={styles.eventDetailLabel}>Device:</Text>
                        <Text style={styles.eventDetailValue}>{event.deviceId}</Text>
                      </View>
                    )}
                  </View>
                  
                  <Text style={styles.viewToonText}>Tap to view raw TOON</Text>
                </TouchableOpacity>
              ))
            )}
          </View>

          <View style={styles.footer} />
        </ScrollView>
      ) : null}

      {/* Raw TOON Viewer */}
      <RawToonViewer
        visible={showToonViewer}
        rawToon={selectedEvent?.rawToon || ''}
        onClose={() => setShowToonViewer(false)}
      />
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
  overrideButton: {
    fontSize: 20,
  },
  content: {
    flex: 1,
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
  profileCard: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 24,
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1976D2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  initials: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  role: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 8,
  },
  employeeId: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  metricsSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 16,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  timelineSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#9E9E9E',
    textAlign: 'center',
    paddingVertical: 20,
  },
  eventCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  eventTime: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 12,
  },
  eventDetails: {
    gap: 6,
    marginBottom: 8,
  },
  eventDetail: {
    flexDirection: 'row',
    gap: 8,
  },
  eventDetailLabel: {
    fontSize: 13,
    color: '#757575',
    width: 70,
  },
  eventDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
  },
  viewToonText: {
    fontSize: 12,
    color: '#1976D2',
    fontStyle: 'italic',
    marginTop: 4,
  },
  footer: {
    height: 20,
  },
});
