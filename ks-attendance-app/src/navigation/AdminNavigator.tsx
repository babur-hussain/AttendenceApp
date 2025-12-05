/**
 * AdminNavigator - Admin Dashboard Stack
 * Accessed after management login
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import AdminDashboardHome from '../screens/admin/AdminDashboardHome';
import CompanyUsersScreen from '../screens/admin/CompanyUsersScreen';
import EmployeesManagementScreen from '../screens/admin/EmployeesManagementScreen';
import FaceEnrollmentScreen from '../screens/admin/FaceEnrollmentScreen';
import DeviceManagementScreen from '../screens/admin/DeviceManagementScreen';
import PoliciesScreen from '../screens/admin/PoliciesScreen';
import ReportsScreen from '../screens/admin/ReportsScreen';
import AttendanceHistoryScreen from '../screens/admin/AttendanceHistoryScreen';

export type AdminStackParamList = {
  AdminHome: undefined;
  CompanyUsers: undefined;
  EmployeesManagement: undefined;
  FaceEnrollment: { employeeId?: string };
  DeviceManagement: undefined;
  Policies: undefined;
  Reports: undefined;
  AttendanceHistory: { employeeId?: string };
};

const Stack = createStackNavigator<AdminStackParamList>();

export default function AdminNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AdminHome"
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="AdminHome"
        component={AdminDashboardHome}
        options={{ title: 'Admin Dashboard' }}
      />
      <Stack.Screen
        name="CompanyUsers"
        component={CompanyUsersScreen}
        options={{ title: 'Company Users' }}
      />
      <Stack.Screen
        name="EmployeesManagement"
        component={EmployeesManagementScreen}
        options={{ title: 'Employees' }}
      />
      <Stack.Screen
        name="FaceEnrollment"
        component={FaceEnrollmentScreen}
        options={{ title: 'Face Enrollment' }}
      />
      <Stack.Screen
        name="DeviceManagement"
        component={DeviceManagementScreen}
        options={{ title: 'Device Management' }}
      />
      <Stack.Screen
        name="Policies"
        component={PoliciesScreen}
        options={{ title: 'Policies' }}
      />
      <Stack.Screen
        name="Reports"
        component={ReportsScreen}
        options={{ title: 'Reports' }}
      />
      <Stack.Screen
        name="AttendanceHistory"
        component={AttendanceHistoryScreen}
        options={{ title: 'Attendance History' }}
      />
    </Stack.Navigator>
  );
}
