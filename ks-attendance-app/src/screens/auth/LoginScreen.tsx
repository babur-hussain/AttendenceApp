/**
 * LoginScreen
 * TOON-based authentication with email/PIN
 * Handles error mapping from TOON tokens and navigation
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { RootStackNavigationProp } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';
import { ToonAuthError } from '../../errors/ToonError';

/**
 * Map TOON error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  ERR1: 'Invalid email or PIN. Please try again.',
  ERR2: 'Your account has been locked. Please contact support.',
  ERR3: 'Missing required information. Please check your credentials.',
  invalid_credentials: 'Invalid email or PIN. Please try again.',
  account_locked: 'Your account has been locked. Please contact support.',
  network_error: 'Network error. Please check your connection and try again.',
  server_error: 'Server error. Please try again later.',
  default: 'Login failed. Please try again.',
};

export const LoginScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'Login'>>();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Handle login submission
   * Calls AuthService via context, maps TOON errors to friendly messages
   */
  const handleLogin = async () => {
    // Validate inputs
    if (!email.trim()) {
      setErrorMessage('Please enter your email');
      return;
    }

    if (!pin.trim()) {
      setErrorMessage('Please enter your PIN');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Call TOON-based sign in (AuthService handles encoding/decoding)
      await signIn(email.trim(), pin.trim());
      
      // Navigation is handled by AppNavigator based on auth state
      // No need to navigate manually
    } catch (error) {
      console.error('Login error:', error);

      // Map TOON error codes to user-friendly messages
      let message = ERROR_MESSAGES.default;

      if (error instanceof ToonAuthError) {
        const code = (error as any).code || '';
        message = ERROR_MESSAGES[code] || ERROR_MESSAGES.default;
      } else if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('Network')) {
          message = ERROR_MESSAGES.network_error;
        } else if (error.message.includes('server') || error.message.includes('Server')) {
          message = ERROR_MESSAGES.server_error;
        } else {
          message = error.message || ERROR_MESSAGES.default;
        }
      }

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate to Forgot PIN screen
   */
  const handleForgotPin = () => {
    navigation.navigate('ForgotPin');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errorMessage && styles.inputError]}
              placeholder="your.email@company.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setErrorMessage(null);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* PIN Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>PIN</Text>
            <TextInput
              style={[styles.input, errorMessage && styles.inputError]}
              placeholder="Enter your PIN"
              placeholderTextColor="#999"
              value={pin}
              onChangeText={(text) => {
                setPin(text);
                setErrorMessage(null);
              }}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="off"
              editable={!isLoading}
            />
          </View>

          {/* Error Message */}
          {errorMessage && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Forgot PIN Link */}
          <TouchableOpacity
            onPress={handleForgotPin}
            disabled={isLoading}
            style={styles.forgotButton}
          >
            <Text style={styles.forgotText}>Forgot PIN?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Secured with TOON Protocol
          </Text>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Signing in...</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  form: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },
  errorContainer: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#ff3b30',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 14,
    fontWeight: '500',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: 24,
    padding: 4,
  },
  forgotText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  loginButton: {
    height: 52,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 4,
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
