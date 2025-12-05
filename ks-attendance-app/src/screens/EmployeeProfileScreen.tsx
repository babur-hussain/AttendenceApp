/**
 * EmployeeProfileScreen - Post Face Match Profile
 * Shows employee details and attendance actions
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useEmployeeProfile } from '../hooks';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { RootStackParamList } from '../navigation/RootNavigator';

type RouteParams = {
  EmployeeProfile: {
    employeeId: string;
  };
};

export default function EmployeeProfileScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RouteParams, 'EmployeeProfile'>>();
  const { employeeId } = route.params;

  const {
    employee,
    todayAttendance,
    loading,
    checkIn,
    checkOut,
    startBreak,
    endBreak,
  } = useEmployeeProfile(employeeId);

  const handleClose = () => {
    navigation.navigate('FaceScannerHome');
  };

  const timelineRecords = React.useMemo(() => {
    const events: Array<{ type: string; timestamp: string }> = [];
    if (todayAttendance?.checkIn) {
      events.push({ type: 'IN', timestamp: todayAttendance.checkIn });
    }
    todayAttendance?.breaks.forEach((segment, index) => {
      events.push({ type: `BREAK_${index + 1}_START`, timestamp: segment.start });
      if (segment.end) {
        events.push({ type: `BREAK_${index + 1}_END`, timestamp: segment.end });
      }
    });
    if (todayAttendance?.checkOut) {
      events.push({ type: 'OUT', timestamp: todayAttendance.checkOut });
    }
    return events;
  }, [todayAttendance]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!employee) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Employee not found</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Text style={styles.closeButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = employee.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={["#007AFF", "#0051D5"]}
        style={styles.header}
      >
        <TouchableOpacity style={styles.closeIconButton} onPress={handleClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.profileSection}>
          {employee.photo ? (
            <Image source={{ uri: employee.photo }} style={styles.profileImage} />
          ) : (
            <View style={styles.initialsContainer}>
              <Text style={styles.initials}>{initials}</Text>
            </View>
          )}

          <Text style={styles.employeeName}>{employee.name}</Text>
          <Text style={styles.employeeRole}>{employee.department}</Text>
          <Text style={styles.employeeId}>ID: {employee.id}</Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Today's Timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Attendance</Text>

          {timelineRecords.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No attendance records today</Text>
            </View>
          ) : (
            <View style={styles.timelineCard}>
              {timelineRecords.map((record, index) => (
                <View key={record.type + index} style={styles.timelineItem}>
                  <View style={styles.timelineIcon}>
                    <Ionicons
                      name={
                        record.type.includes('IN')
                          ? 'log-in-outline'
                          : record.type.includes('OUT')
                          ? 'log-out-outline'
                          : record.type.includes('BREAK') && record.type.includes('START')
                          ? 'pause-outline'
                          : 'play-outline'
                      }
                      size={20}
                      color="#007AFF"
                    />
                  </View>
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineType}>{record.type.replace('_', ' ')}</Text>
                    <Text style={styles.timelineTime}>
                      {record.timestamp}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonPrimary]}
              onPress={checkIn}
            >
              <Ionicons name="log-in-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Check In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={checkOut}
            >
              <Ionicons name="log-out-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Check Out</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonWarning]}
              onPress={startBreak}
            >
              <Ionicons name="pause-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Start Break</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSuccess]}
              onPress={endBreak}
            >
              <Ionicons name="play-outline" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>End Break</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Additional Actions */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="calendar-outline" size={24} color="#999" />
            <Text style={styles.menuItemText}>View History</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="person-outline" size={24} color="#999" />
            <Text style={styles.menuItemText}>My Details</Text>
            <Ionicons name="chevron-forward" size={24} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Auto-return Notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeText}>
            You will be returned to the scanner after 30 seconds of inactivity
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#fff",
  },
  loadingText: {
    fontSize: 16,
    color: "#999",
    marginTop: 16,
  },
  errorText: {
    fontSize: 24, fontWeight: "700",
    color: "#EF4444",
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 24,
  },
  closeButtonText: {
    fontSize: 16, fontWeight: "600",
    color: "#fff",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  closeIconButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
  },
  initialsContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: "#fff",
  },
  initials: {
    fontSize: 36, fontWeight: "700",
    color: "#fff",
  },
  employeeName: {
    fontSize: 32, fontWeight: "700",
    color: "#fff",
    marginTop: 16,
  },
  employeeRole: {
    fontSize: 16,
    color: "#fff",
    opacity: 0.9,
    marginTop: 8,
  },
  employeeId: {
    fontSize: 12,
    color: "#fff",
    opacity: 0.7,
    marginTop: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20, fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  emptyCard: {
    backgroundColor: "#f5f5f5",
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
  },
  timelineCard: {
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5F0FF",
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineType: {
    fontSize: 16,
    color: "#000",
    fontWeight: '600',
  },
  timelineTime: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  actionButton: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionButtonPrimary: {
    backgroundColor: "#34C759",
  },
  actionButtonSecondary: {
    backgroundColor: "#EF4444",
  },
  actionButtonWarning: {
    backgroundColor: "#FF9500",
  },
  actionButtonSuccess: {
    backgroundColor: "#007AFF",
  },
  actionButtonText: {
    fontSize: 14, fontWeight: "600",
    color: "#fff",
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#f5f5f5",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: "#000",
    flex: 1,
    marginLeft: 16,
  },
  noticeCard: {
    backgroundColor: "#E5F0FF",
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
  },
  noticeText: {
    fontSize: 12,
    color: "#0051D5",
    textAlign: 'center',
  },
});
