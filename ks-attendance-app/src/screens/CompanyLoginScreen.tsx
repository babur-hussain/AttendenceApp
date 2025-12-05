/**
 * CompanyLoginScreen
 * First-launch authentication for company admin/manager
 */

import React, { useEffect, useState } from 'react';
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
import { useCompanyLogin, useAdminSession } from '../hooks';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Navigation = StackNavigationProp<RootStackParamList, 'CompanyLogin'>;

export default function CompanyLoginScreen() {
  const navigation = useNavigation<Navigation>();
  const { login, loading, error, resetError } = useCompanyLogin();
  const { hasCompanySession, isBootstrapping } = useAdminSession();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!isBootstrapping && hasCompanySession) {
      navigation.reset({ index: 0, routes: [{ name: 'FaceScannerHome' }] });
    }
  }, [hasCompanySession, isBootstrapping, navigation]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Enter email and password');
      return;
    }

    const result = await login({ email, password });
    if (!result.success) {
      Alert.alert('Login Failed', result.error || 'Unable to sign in');
      return;
    }

    navigation.reset({ index: 0, routes: [{ name: 'FaceScannerHome' }] });
  };

  const renderContent = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={["#051937", "#002F65"]} style={styles.header}>
        <Text style={styles.title}>Company Login</Text>
        <Text style={styles.subtitle}>Secure access for admins and managers</Text>
      </LinearGradient>

      <View style={styles.content}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="#94A3B8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="admin@company.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (error) resetError();
              }}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="#94A3B8" style={styles.icon} />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              secureTextEntry
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (error) resetError();
              }}
            />
          </View>
        </View>

        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color="#F87171" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.helperText}>
          First-time login loads employees, devices, policies for this company.
        </Text>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerCopy}>New to KS Attendance?</Text>
          <View style={styles.dividerLine} />
        </View>

        <View style={styles.ctaCard}>
          <View style={styles.ctaTextGroup}>
            <Text style={styles.ctaTitle}>Create Company Account</Text>
            <Text style={styles.ctaSubtitle}>
              Request onboarding to spin up a secure workspace for your teams.
            </Text>
          </View>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('CreateCompany')}
          >
            <Ionicons name="arrow-forward-circle" size={22} color="#fff" />
            <Text style={styles.ctaButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  if (isBootstrapping) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingCopy}>Preparing secure session...</Text>
      </View>
    );
  }

  return renderContent();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingTop: 80,
    paddingBottom: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#E2E8F0',
    marginTop: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#0F172A',
  },
  loginButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  helperText: {
    fontSize: 13,
    color: '#475569',
    marginTop: 16,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerCopy: {
    fontSize: 12,
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 16,
    padding: 16,
    backgroundColor: '#F8FAFC',
    gap: 16,
  },
  ctaTextGroup: {
    flex: 1,
    gap: 4,
  },
  ctaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  ctaSubtitle: {
    fontSize: 13,
    color: '#475569',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    flex: 1,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingCopy: {
    marginTop: 16,
    fontSize: 16,
    color: '#475569',
  },
});
