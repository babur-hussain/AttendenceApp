/**
 * AdminHomeScreen
 * TOON-based home screen for administrators
 * Features: System overview, user management, reports, device management
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

export const AdminHomeScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Home'>>();
  const { user, signOut } = useAuth();

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data - replace with TOON service calls
  const [stats, setStats] = useState({
    totalUsers: 156,
    activeToday: 142,
    devicesOnline: 8,
    systemHealth: '98%',
  });

  useEffect(() => {
    loadSystemData();
  }, []);

  /**
   * Load system data
   * TODO: Replace with TOON-based service call
   */
  const loadSystemData = async () => {
    try {
      // Mock implementation
      console.log('Loading system data...');
    } catch (error) {
      console.error('Failed to load system data:', error);
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSystemData();
    setIsRefreshing(false);
  };

  /**
   * Manage users
   */
  const handleManageUsers = () => {
    Alert.alert('Users', 'User management coming soon!');
  };

  /**
   * Manage devices
   */
  const handleManageDevices = () => {
    Alert.alert('Devices', 'Device management coming soon!');
  };

  /**
   * View system reports
   */
  const handleSystemReports = () => {
    Alert.alert('Reports', 'System reports coming soon!');
  };

  /**
   * System settings
   */
  const handleSystemSettings = () => {
    Alert.alert('Settings', 'System settings coming soon!');
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
            userName={user?.name || 'Admin'} 
            subtitle="System Administrator"
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
        {/* System Overview Card */}
        <HomeCard title="System Overview">
          <View style={styles.summaryGrid}>
            <SummaryTile
              label="Total Users"
              value={stats.totalUsers}
              subtitle="registered"
              color="#007AFF"
            />
            <SummaryTile
              label="Active Today"
              value={stats.activeToday}
              subtitle="checked in"
              color="#34c759"
            />
            <SummaryTile
              label="Devices"
              value={stats.devicesOnline}
              subtitle="online"
              color="#5856D6"
            />
          </View>
        </HomeCard>

        {/* System Health */}
        <HomeCard title="System Health">
          <View style={styles.healthContainer}>
            <View style={styles.healthRow}>
              <Text style={styles.healthLabel}>Overall Health</Text>
              <Text style={styles.healthValue}>{stats.systemHealth}</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: stats.systemHealth as DimensionValue }]} />
            </View>
            <View style={styles.healthMetrics}>
              <View style={styles.metricItem}>
                <View style={[styles.metricDot, { backgroundColor: '#34c759' }]} />
                <Text style={styles.metricText}>Server: Online</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={[styles.metricDot, { backgroundColor: '#34c759' }]} />
                <Text style={styles.metricText}>Database: Healthy</Text>
              </View>
              <View style={styles.metricItem}>
                <View style={[styles.metricDot, { backgroundColor: '#34c759' }]} />
                <Text style={styles.metricText}>TOON Protocol: Active</Text>
              </View>
            </View>
          </View>
        </HomeCard>

        {/* Admin Actions */}
        <HomeCard title="Administration">
          <View style={styles.actionsGrid}>
            <ActionTile
              icon="👥"
              label="Users"
              onPress={handleManageUsers}
              color="#007AFF"
            />
            <ActionTile
              icon="📱"
              label="Devices"
              onPress={handleManageDevices}
              color="#5856D6"
            />
            <ActionTile
              icon="📊"
              label="Reports"
              onPress={handleSystemReports}
              color="#FF9500"
            />
            <ActionTile
              icon="⚙️"
              label="Settings"
              onPress={handleSystemSettings}
              color="#8E8E93"
            />
          </View>
        </HomeCard>

        {/* Quick Access */}
        <HomeCard title="Quick Access">
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>🔐 Security Logs</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>📋 Audit Trail</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>🔄 Backup & Restore</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.linkItem}>
            <Text style={styles.linkText}>📈 Analytics</Text>
            <Text style={styles.linkArrow}>›</Text>
          </TouchableOpacity>
        </HomeCard>

        {/* Recent Activity */}
        <HomeCard title="Recent Activity">
          <View style={styles.activityList}>
            <View style={styles.activityItem}>
              <View style={[styles.activityDot, { backgroundColor: '#34c759' }]} />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>New user registered</Text>
                <Text style={styles.activityTime}>5 minutes ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={[styles.activityDot, { backgroundColor: '#007AFF' }]} />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Device connected</Text>
                <Text style={styles.activityTime}>12 minutes ago</Text>
              </View>
            </View>
            <View style={styles.activityItem}>
              <View style={[styles.activityDot, { backgroundColor: '#FF9500' }]} />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>System update completed</Text>
                <Text style={styles.activityTime}>1 hour ago</Text>
              </View>
            </View>
          </View>
        </HomeCard>

        {/* Info Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>TOON Protocol • Admin Dashboard</Text>
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
  healthContainer: {
    paddingVertical: 8,
  },
  healthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthLabel: {
    fontSize: 14,
    color: '#666',
  },
  healthValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34c759',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#34c759',
    borderRadius: 4,
  },
  healthMetrics: {
    gap: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  metricDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  metricText: {
    fontSize: 14,
    color: '#333',
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
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: '#999',
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
