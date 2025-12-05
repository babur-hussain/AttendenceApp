/**
 * PinLoginScreen
 * Management PIN unlock modal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { usePinLogin, useAdminSession } from '../hooks';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Navigation = StackNavigationProp<RootStackParamList, 'PinLogin'>;
const PIN_LENGTH = 6;

export default function PinLoginScreen() {
  const navigation = useNavigation<Navigation>();
  const { verifyPin, loading, error, resetError } = usePinLogin();
  const { companySession } = useAdminSession();
  const [pin, setPin] = useState('');

  const handleVerify = async () => {
    if (pin.length !== PIN_LENGTH) {
      Alert.alert('Invalid PIN', `Enter the ${PIN_LENGTH}-digit PIN`);
      return;
    }

    const result = await verifyPin(pin);
    if (!result.success) {
      return;
    }

    navigation.replace('AdminDashboard');
  };

  const handleClose = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('FaceScannerHome');
    }
  };

  const maskedCompany = companySession?.companyName || 'Company';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={["#0F172A", "#1E293B"]} style={styles.header}>
        <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
          <Ionicons name="close" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Management PIN</Text>
        <Text style={styles.subtitle}>{maskedCompany}</Text>
        <Text style={styles.helper}>Enter {PIN_LENGTH}-digit PIN assigned to this manager</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.pinWrapper}>
          <TextInput
            value={pin}
            onChangeText={(text) => {
              const digits = text.replace(/[^0-9]/g, '').slice(0, PIN_LENGTH);
              setPin(digits);
              if (error) resetError();
            }}
            keyboardType="number-pad"
            secureTextEntry
            style={styles.pinInput}
            maxLength={PIN_LENGTH}
            placeholder={Array(PIN_LENGTH).fill('•').join('')}
            placeholderTextColor="#94A3B8"
          />
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#F87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.verifyButtonDisabled]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.verifyText}>Unlock Dashboard</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    marginTop: 4,
  },
  helper: {
    fontSize: 14,
    color: '#CBD5F5',
    marginTop: 16,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  pinWrapper: {
    marginTop: 40,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  pinInput: {
    fontSize: 28,
    letterSpacing: 12,
    textAlign: 'center',
    color: '#0F172A',
  },
  verifyButton: {
    marginTop: 32,
    backgroundColor: '#22C55E',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  verifyButtonDisabled: {
    opacity: 0.6,
  },
  verifyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    flex: 1,
  },
});
