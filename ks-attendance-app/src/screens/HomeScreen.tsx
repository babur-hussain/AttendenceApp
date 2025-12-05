import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { RootStackNavigationProp } from '../types/navigation';
import { useAuth } from '../context/AuthContext';
import CheckinFlowCoordinator from '../services/CheckinFlowCoordinator';

/**
 * Home Screen
 * Main hub with quick access to check-in/check-out actions
 */
export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Home'>>();
  const { signOut, user } = useAuth();
  const [queueStats, setQueueStats] = useState({ queued: 0, failed: 0 });

  useEffect(() => {
    loadQueueStats();
    const interval = setInterval(loadQueueStats, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  const loadQueueStats = async () => {
    const stats = await CheckinFlowCoordinator.getQueueStats();
    setQueueStats({ queued: stats.queued, failed: stats.failed });
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  const handleCheckin = () => {
    navigation.navigate('Checkin');
  };

  const handleViewQueue = () => {
    navigation.navigate('OfflineQueue');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>KS Attendance</Text>
      
      <Text style={styles.greeting}>
        Welcome, {user?.id || 'User'}!
      </Text>

      {/* Queue Status Badge */}
      {(queueStats.queued > 0 || queueStats.failed > 0) && (
        <TouchableOpacity style={styles.queueBadge} onPress={handleViewQueue}>
          <Text style={styles.queueBadgeText}>
            {queueStats.queued} Queued • {queueStats.failed} Failed
          </Text>
        </TouchableOpacity>
      )}

      {/* Main Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.actionButton, styles.checkInButton]} onPress={handleCheckin}>
          <Text style={styles.actionButtonText}>Check In / Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.queueButton]} onPress={handleViewQueue}>
          <Text style={styles.actionButtonText}>View Queue</Text>
          {queueStats.queued > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{queueStats.queued}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 40,
    marginBottom: 12,
    textAlign: 'center',
    color: '#007AFF',
  },
  greeting: {
    fontSize: 18,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  queueBadge: {
    backgroundColor: '#FF9500',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  queueBadgeText: {
    color: 'white',
    fontWeight: '600',
  },
  actionsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  actionButton: {
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  checkInButton: {
    backgroundColor: '#007AFF',
  },
  queueButton: {
    backgroundColor: '#34C759',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#FF3B30',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  signOutButton: {
    height: 50,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signOutButtonText: {
    color: '#FF3B30',
    fontSize: 18,
    fontWeight: '600',
  },
});

