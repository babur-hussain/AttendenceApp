/**
 * RoleBasedHome
 * Routes to appropriate home screen based on user role
 * Uses TOON-decoded role field (R1) from user object
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useRole } from '../hooks/useRole';
import { EmployeeHomeScreen, ManagerHomeScreen, AdminHomeScreen } from '../screens/home';

export const RoleBasedHome: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { role } = useRole();

  // Show loading if still determining role
  if (isLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // Route to appropriate home screen based on role
  switch (role) {
    case 'ADMIN':
      return <AdminHomeScreen />;
    case 'MANAGER':
      return <ManagerHomeScreen />;
    case 'EMP':
    default:
      return <EmployeeHomeScreen />;
  }
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
