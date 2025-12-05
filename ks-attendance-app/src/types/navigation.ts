import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import type { EventStatus } from './checkin';

/**
 * Root Stack Parameter List
 * Define all routes and their params here
 */
export type RootStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  ForgotPin: undefined;
  ResetPin: { resetToken: string };
  AuthLoading: undefined;
  Home: undefined;
  Checkin: undefined;
  CheckinResult: {
    eventId: string;
    status: EventStatus;
    reason?: string;
  };
  OfflineQueue: undefined;
  // Enrollment Flow
  EnrollLanding: undefined;
  EnrollForm: undefined;
  MultiShotCapture: undefined;
  EnrollReview: undefined;
  EnrollSuccess: undefined;
  EnrollmentDebug: undefined;
};

/**
 * Navigation prop type for type-safe navigation
 */
export type RootStackNavigationProp<T extends keyof RootStackParamList> = 
  NativeStackNavigationProp<RootStackParamList, T>;

/**
 * Route prop type for type-safe route params
 */
export type RootStackRouteProp<T extends keyof RootStackParamList> = 
  RouteProp<RootStackParamList, T>;

/**
 * Screen props helper type
 */
export type ScreenProps<T extends keyof RootStackParamList> = {
  navigation: RootStackNavigationProp<T>;
  route: RootStackRouteProp<T>;
};

/**
 * Declare global types for useNavigation and useRoute hooks
 */
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
