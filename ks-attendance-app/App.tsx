import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/context';
import RootNavigator from './src/navigation/RootNavigator';
import { AdminSessionProvider } from './src/hooks';

export default function App() {
  return (
    <AuthProvider>
      <AdminSessionProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </AdminSessionProvider>
    </AuthProvider>
  );
}
