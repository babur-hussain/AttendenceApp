/**
 * EmployeeHomeScreen
 * TOON-based home screen for regular employees
 * Features: Check-in/out, attendance history, today's status
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { WelcomeHeader, HomeCard, ActionTile, SummaryTile } from '../../components/HomeComponents';

export const EmployeeHomeScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Home'>>();
  const { user, signOut } = useAuth();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [todayStatus, setTodayStatus] = useState<'checked-in' | 'checked-out' | 'not-checked'>('not-checked');
  const [checkInTime, setCheckInTime] = useState<string | null>(null);

  // Mock data - replace with TOON service calls
  const [stats, setStats] = useState({
    thisMonth: 18,
    thisWeek: 4,
    onTime: '95%',
  });

  useEffect(() => {
    loadTodayStatus();
  }, []);

  /**
   * Load today's attendance status
   * TODO: Replace with TOON-based AttendanceService call
   */
  const loadTodayStatus = async () => {
    try {
      // Mock implementation
      // In real app: const status = await attendanceService.getTodayStatus();
      console.log('Loading today status...');
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTodayStatus();
    setIsRefreshing(false);
  };

  /**
   * Navigate to check-in screen
   */
  const handleCheckIn = () => {
    navigation.navigate('Checkin');
  };

  /**
   * View attendance history
   */
  const handleViewHistory = () => {
    Alert.alert('History', 'Attendance history coming soon!');
  };

  /**
   * View profile
   */
  const handleViewProfile = () => {
    Alert.alert('Profile', 'Profile screen coming soon!');
  };

  /**
   * Handle logout with confirmation
   */
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
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
        <View style={styles.headerContent}>
          <WelcomeHeader 
            userName={user?.name || 'Employee'} 
            subtitle={new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric' 
            })}
          />
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutIcon}>⏏</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Today's Status Card */}
        <HomeCard title="Today's Status">
          <View style={styles.statusContainer}>
            {todayStatus === 'checked-in' && checkInTime ? (
              <>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeText}>✓ Checked In</Text>
                </View>
                <Text style={styles.statusTime}>at {checkInTime}</Text>
              </>
            ) : todayStatus === 'checked-out' ? (
              <>
                <View style={[styles.statusBadge, styles.statusBadgeSecondary]}>
                  <Text style={styles.statusBadgeText}>Checked Out</Text>
                </View>
                <Text style={styles.statusTime}>See you tomorrow!</Text>
              </>
            ) : (
              <>
                <View style={[styles.statusBadge, styles.statusBadgeWarning]}>
                  <Text style={styles.statusBadgeText}>Not Checked In</Text>
                </View>
                <Text style={styles.statusTime}>Tap Check In below</Text>
              </>
            )}
          </View>
        </HomeCard>

        {/* Quick Actions */}
        <HomeCard title="Quick Actions">
          <View style={styles.actionsGrid}>
            <ActionTile
              icon="📍"
              label="Check In"
              onPress={handleCheckIn}
              color="#34c759"
            />
            <ActionTile
              icon="📊"
              label="History"
              onPress={handleViewHistory}
              color="#007AFF"
            />
            <ActionTile
              icon="👤"
              label="Profile"
              onPress={handleViewProfile}
              color="#FF9500"
            />
            <ActionTile
              icon="⚙️"
              label="Settings"
              onPress={() => Alert.alert('Settings', 'Coming soon!')}
              color="#8E8E93"
            />
          </View>
        </HomeCard>

        {/* This Month Summary */}
        <HomeCard title="This Month">
          <View style={styles.summaryGrid}>
            <SummaryTile
              label="Days Present"
              value={stats.thisMonth}
              color="#34c759"
            />
            <SummaryTile
              label="This Week"
              value={stats.thisWeek}
              color="#007AFF"
            />
            <SummaryTile
              label="On Time"
              value={stats.onTime}
              color="#FF9500"
            />
          </View>
        </HomeCard>

        {/* Info Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>TOON Protocol • Secure & Private</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Shadow for Android
    elevation: 4,
  },
  headerContent: {
    flex: 1,
  },
  logoutButton: {
    padding: 8,
  },
  logoutIcon: {
    fontSize: 24,
    color: '#ff3b30',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  statusBadge: {
    backgroundColor: '#34c75920',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusBadgeSecondary: {
    backgroundColor: '#007AFF20',
  },
  statusBadgeWarning: {
    backgroundColor: '#FF950020',
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  statusTime: {
    fontSize: 14,
    color: '#666',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -6,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -6,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
