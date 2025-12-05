import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { RootStackParamList } from '../types/navigation';
import { 
  LoginScreen, 
  ForgotPinScreen,
  ResetPinScreen,
  CheckinScreen, 
  CheckinResultScreen, 
  OfflineQueueScreen 
} from '../screens';
import OnboardingScreen from '../screens/onboarding/OnboardingScreen';
import { RoleBasedHome } from '../components/RoleBasedHome';
import { useOnboarding } from '../hooks/useOnboarding';
import { useAuth } from '../context/AuthContext';

const RootStack = createNativeStackNavigator<RootStackParamList>();

/**
 * Root Stack Navigator
 * Contains all screen definitions with type-safe params
 */
const RootStackNavigator: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { completed: onboardingCompleted, loading: onboardingLoading } = useOnboarding();

  // Show loading screen while checking authentication
  if (isLoading || onboardingLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <RootStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#007AFF',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      {!onboardingCompleted ? (
        <RootStack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
      ) : !user ? (
        <>
          <RootStack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="ForgotPin"
            component={ForgotPinScreen}
            options={{ 
              title: 'Forgot PIN',
              headerBackTitle: 'Back'
            }}
          />
          <RootStack.Screen
            name="ResetPin"
            component={ResetPinScreen}
            options={{ 
              title: 'Reset PIN',
              headerBackTitle: 'Back'
            }}
          />
        </>
      ) : (
        <>
          <RootStack.Screen
            name="Home"
            component={RoleBasedHome}
            options={{ headerShown: false }}
          />
          <RootStack.Screen
            name="Checkin"
            component={CheckinScreen}
            options={{ title: 'Check In' }}
          />
          <RootStack.Screen
            name="CheckinResult"
            component={CheckinResultScreen}
            options={{ title: 'Check-in Result' }}
          />
          <RootStack.Screen
            name="OfflineQueue"
            component={OfflineQueueScreen}
            options={{ title: 'Offline Queue' }}
          />
        </>
      )}
    </RootStack.Navigator>
  );
};

/**
 * App Navigator
 * Wraps the root stack with NavigationContainer
 */
export const AppNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <RootStackNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
