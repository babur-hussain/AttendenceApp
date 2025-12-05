/**
 * ManagerHomeScreen
 * TOON-based home screen for managers
 * Features: Team overview, approvals, reports, employee management
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
  DimensionValue,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { WelcomeHeader, HomeCard, ActionTile, SummaryTile } from '../../components/HomeComponents';

export const ManagerHomeScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Home'>>();
  const { user, signOut } = useAuth();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data - replace with TOON service calls
  const [stats, setStats] = useState({
    teamSize: 12,
    presentToday: 10,
    pendingApprovals: 3,
    attendance: '83%',
  });

  useEffect(() => {
    loadTeamData();
  }, []);

  /**
   * Load team data
   * TODO: Replace with TOON-based service call
   */
  const loadTeamData = async () => {
    try {
      // Mock implementation
      console.log('Loading team data...');
    } catch (error) {
      console.error('Failed to load team data:', error);
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTeamData();
    setIsRefreshing(false);
  };

  /**
   * View team members
   */
  const handleViewTeam = () => {
    Alert.alert('Team', 'Team management coming soon!');
  };

  /**
   * Handle approvals
   */
  const handleApprovals = () => {
    Alert.alert('Approvals', `You have ${stats.pendingApprovals} pending approvals`);
  };

  /**
   * View reports
   */
  const handleViewReports = () => {
    Alert.alert('Reports', 'Reports dashboard coming soon!');
  };

  /**
   * Manage schedules
   */
  const handleSchedules = () => {
    Alert.alert('Schedules', 'Schedule management coming soon!');
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
            userName={user?.name || 'Manager'} 
            subtitle="Manager Dashboard"
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
        {/* Team Overview Card */}
        <HomeCard title="Team Overview">
          <View style={styles.summaryGrid}>
            <SummaryTile
              label="Team Size"
              value={stats.teamSize}
              subtitle="employees"
              color="#007AFF"
            />
            <SummaryTile
              label="Present Today"
              value={stats.presentToday}
              subtitle="checked in"
              color="#34c759"
            />
            <SummaryTile
              label="Pending"
              value={stats.pendingApprovals}
              subtitle="approvals"
              color="#FF9500"
            />
          </View>
        </HomeCard>

        {/* Manager Actions */}
        <HomeCard title="Manager Actions">
          <View style={styles.actionsGrid}>
            <ActionTile
              icon="👥"
              label="My Team"
              onPress={handleViewTeam}
              color="#007AFF"
            />
            <ActionTile
              icon="✓"
              label="Approvals"
              onPress={handleApprovals}
              color="#FF9500"
            />
            <ActionTile
              icon="📊"
              label="Reports"
              onPress={handleViewReports}
              color="#5856D6"
            />
            <ActionTile
              icon="📅"
              label="Schedules"
              onPress={handleSchedules}
              color="#34c759"
            />
          </View>
        </HomeCard>

        {/* Attendance Summary */}
        <HomeCard title="Attendance">
          <View style={styles.attendanceContainer}>
            <View style={styles.attendanceRow}>
              <Text style={styles.attendanceLabel}>Team Attendance Rate</Text>
              <Text style={styles.attendanceValue}>{stats.attendance}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: stats.attendance as DimensionValue }]} />
            </View>
            <Text style={styles.attendanceSubtext}>This month average</Text>
          </View>
        </HomeCard>

        {/* Quick Links */}
        <HomeCard title="Quick Links">
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>📋 Leave Requests</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>⏰ Time Off Balance</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>📈 Performance Reviews</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
        </HomeCard>

        {/* Info Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>TOON Protocol • Manager Dashboard</Text>
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -6,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -6,
  },
  attendanceContainer: {
    paddingVertical: 8,
  },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  attendanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  attendanceValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34c759',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34c759',
    borderRadius: 4,
  },
  attendanceSubtext: {
    fontSize: 12,
    color: '#999',
  },
  linkItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  linkText: {
    fontSize: 15,
    color: '#333',
  },
  linkArrow: {
    fontSize: 20,
    color: '#ccc',
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
