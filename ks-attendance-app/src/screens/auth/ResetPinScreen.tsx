/**
 * ResetPinScreen
 * TOON-based PIN reset completion screen
 * Allows user to set new PIN with reset token
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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RootStackNavigationProp, RootStackRouteProp } from '../../types/navigation';
import { authService } from '../../services/AuthService';
import { ToonAuthError } from '../../errors/ToonError';

export const ResetPinScreen: React.FC = () => {
  const navigation = useNavigation<RootStackNavigationProp<'ResetPin'>>();
  const route = useRoute<RootStackRouteProp<'ResetPin'>>();

  const { resetToken } = route.params;

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * Validate PIN format
   */
  const validatePin = (pin: string): boolean => {
    // PIN must be 4-6 digits
    return /^\d{4,6}$/.test(pin);
  };

  /**
   * Handle PIN reset submission
   * Calls AuthService.resetPin with TOON encoding
   */
  const handleResetPin = async () => {
    // Validate new PIN
    if (!newPin.trim()) {
      setErrorMessage('Please enter a new PIN');
      return;
    }

    if (!validatePin(newPin)) {
      setErrorMessage('PIN must be 4-6 digits');
      return;
    }

    // Validate confirm PIN
    if (!confirmPin.trim()) {
      setErrorMessage('Please confirm your new PIN');
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage('PINs do not match');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Call TOON-based PIN reset
      const response = await authService.resetPin(resetToken, newPin);

      if (response.success) {
        // Show success message and navigate to login
        alert(response.message);
        navigation.navigate('Login');
      }
    } catch (error) {
      console.error('PIN reset error:', error);

      let message = 'Failed to reset PIN. Please try again.';

      if (error instanceof ToonAuthError) {
        message = 'Invalid or expired reset token. Please request a new one.';
      } else if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('Network')) {
          message = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('server') || error.message.includes('Server')) {
          message = 'Server error. Please try again later.';
        }
      }

      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Navigate back to login
   */
  const handleBackToLogin = () => {
    navigation.navigate('Login');
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
          <Text style={styles.title}>Reset PIN</Text>
          <Text style={styles.subtitle}>
            Enter your new PIN below
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* New PIN Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>New PIN</Text>
            <TextInput
              style={[styles.input, errorMessage && styles.inputError]}
              placeholder="Enter new PIN (4-6 digits)"
              placeholderTextColor="#999"
              value={newPin}
              onChangeText={(text) => {
                setNewPin(text);
                setErrorMessage(null);
              }}
              secureTextEntry
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="off"
              editable={!isLoading}
            />
          </View>

          {/* Confirm PIN Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm PIN</Text>
            <TextInput
              style={[styles.input, errorMessage && styles.inputError]}
              placeholder="Re-enter new PIN"
              placeholderTextColor="#999"
              value={confirmPin}
              onChangeText={(text) => {
                setConfirmPin(text);
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

          {/* PIN Requirements */}
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>PIN Requirements:</Text>
            <Text style={styles.requirementsText}>• 4 to 6 digits</Text>
            <Text style={styles.requirementsText}>• Numbers only</Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
            onPress={handleResetPin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Reset PIN</Text>
            )}
          </TouchableOpacity>

          {/* Back to Login */}
          <TouchableOpacity
            onPress={handleBackToLogin}
            disabled={isLoading}
            style={styles.backButton}
          >
            <Text style={styles.backText}>← Back to Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
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
  requirementsBox: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  requirementsText: {
    fontSize: 13,
    color: '#666',
    marginVertical: 2,
  },
  submitButton: {
    height: 52,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    // Shadow for iOS
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    alignSelf: 'center',
    padding: 8,
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
