/**
 * RootNavigator - Dual Flow Navigation
 * - CompanyLogin → initial bootstrap
 * - FaceScannerHome → employee flow
 * - PinLogin → management unlock
 * - AdminDashboard → protected stack after PIN verification
 */

import React from 'react';
import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { createStackNavigator } from '@react-navigation/stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import CompanyLoginScreen from '../screens/CompanyLoginScreen';
import CreateCompanyScreen from '../screens/CreateCompanyScreen';
import FaceScannerHome from '../screens/FaceScannerHome';
import PinLoginScreen from '../screens/PinLoginScreen';
import EmployeeProfileScreen from '../screens/EmployeeProfileScreen';
import AdminNavigator from './AdminNavigator';
import { useAdminSession } from '../hooks';

export type RootStackParamList = {
  CompanyLogin: undefined;
  CreateCompany: undefined;
  FaceScannerHome: undefined;
  EmployeeProfile: { employeeId: string };
  PinLogin: undefined;
  AdminDashboard: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function AdminDashboardGateway() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { hasPinSession } = useAdminSession();

  useFocusEffect(
    React.useCallback(() => {
      if (!hasPinSession) {
        navigation.replace('FaceScannerHome');
      }
    }, [hasPinSession, navigation])
  );

  if (!hasPinSession) {
    return (
      <View style={styles.lockedContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.lockedText}>Awaiting PIN unlock...</Text>
      </View>
    );
  }

  return <AdminNavigator />;
}

export default function RootNavigator() {
  const { isBootstrapping, hasCompanySession } = useAdminSession();

  if (isBootstrapping) {
    return (
      <View style={styles.lockedContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.lockedText}>Initializing secure session...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={hasCompanySession ? 'FaceScannerHome' : 'CompanyLogin'}
      screenOptions={{ headerShown: false, gestureEnabled: false }}
    >
      <Stack.Screen name="CompanyLogin" component={CompanyLoginScreen} />
      <Stack.Screen
        name="CreateCompany"
        component={CreateCompanyScreen}
        options={{ headerShown: false, gestureEnabled: true }}
      />
      <Stack.Screen name="FaceScannerHome" component={FaceScannerHome} />
      <Stack.Screen name="EmployeeProfile" component={EmployeeProfileScreen} />
      <Stack.Screen
        name="PinLogin"
        component={PinLoginScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="AdminDashboard" component={AdminDashboardGateway} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  lockedContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockedText: {
    marginTop: 16,
    color: '#E2E8F0',
  },
});
