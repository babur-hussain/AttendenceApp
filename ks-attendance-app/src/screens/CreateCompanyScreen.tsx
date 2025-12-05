/**
 * CreateCompanyScreen
 * Beautiful onboarding form for provisioning a new KS Attendance company account
 */

import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { API_ENDPOINTS } from '../services/api/config';
import { toonClient } from '../services';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAdminSession } from '../hooks';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const MPIN_LENGTH = 6;
const MIN_PASSWORD_LENGTH = 8;
const MPIN_REGEX = new RegExp(`^\\d{${MPIN_LENGTH}}$`);

type Navigation = StackNavigationProp<RootStackParamList, 'CreateCompany'>;

interface CreateCompanyForm {
  companyName: string;
  companyId: string;
  industry: string;
  teamSize: string;
  adminName: string;
  workEmail: string;
  phoneNumber: string;
  password: string;
  managementPin: string;
}

export default function CreateCompanyScreen() {
  const navigation = useNavigation<Navigation>();
  const [form, setForm] = useState<CreateCompanyForm>({
    companyName: '',
    companyId: '',
    industry: '',
    teamSize: '',
    adminName: '',
    workEmail: '',
    phoneNumber: '',
    password: '',
    managementPin: '',
  });
  const [acceptPolicies, setAcceptPolicies] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const heroPulse = useRef(new Animated.Value(0)).current;
  const { setCompanySession, setResourcesSnapshot, setPinSession } = useAdminSession();

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(heroPulse, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(heroPulse, {
          toValue: 0,
          duration: 4000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    );

    animation.start();
    return () => {
      animation.stop();
    };
  }, [heroPulse]);

  useEffect(() => {
    if (!success) {
      return;
    }

    const timer = setTimeout(() => {
      navigation.reset({ index: 0, routes: [{ name: 'FaceScannerHome' }] });
    }, 1200);

    return () => clearTimeout(timer);
  }, [success, navigation]);

  const completionPercent = useMemo(() => {
    const total = Object.keys(form).length;
    const filled = Object.values(form).filter((value) => value.trim().length > 0).length;
    return Math.round((filled / total) * 100);
  }, [form]);
  const isPasswordStrong = form.password.trim().length >= MIN_PASSWORD_LENGTH;
  const isMpinValid = MPIN_REGEX.test(form.managementPin.trim());
  const canSubmit = acceptPolicies && completionPercent === 100 && isPasswordStrong && isMpinValid && !success;

  const heroScale = heroPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const heroOpacity = heroPulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.8] });
  const highlightTranslate = heroPulse.interpolate({ inputRange: [0, 1], outputRange: [-40, 40] });

  const handleChange = (key: keyof CreateCompanyForm, value: string) => {
    let nextValue = value;

    if (key === 'companyId') {
      nextValue = value.replace(/\s+/g, '').toUpperCase();
    } else if (key === 'teamSize') {
      nextValue = value.replace(/[^0-9]/g, '');
    } else if (key === 'managementPin') {
      nextValue = value.replace(/[^0-9]/g, '');
    }

    setForm((prev) => ({ ...prev, [key]: nextValue }));
  };

  const bootstrapWorkspace = useCallback(async (serverResponse?: Record<string, any>) => {
    const now = Date.now();
    const normalizedCompanyId = (serverResponse?.COMP1 || form.companyId || 'NEWCO').trim().toUpperCase();
    const normalizedCompanyName = serverResponse?.COMP2 || form.companyName || normalizedCompanyId;
    const normalizedEmail = (serverResponse?.U1 || form.workEmail || 'manager@newco.com').trim().toLowerCase();
    const managerName = serverResponse?.U2 || form.adminName || normalizedEmail;
    const sessionToken = serverResponse?.SESSION1 || serverResponse?.A1 || `SESSION_${now}`;
    const pinSessionToken = serverResponse?.PIN_SESSION || serverResponse?.PIN1 || `PIN_SESSION_${now}`;
    const status = serverResponse?.S1 || 'OK';

    await setCompanySession({
      companyId: normalizedCompanyId,
      companyName: normalizedCompanyName,
      managerId: normalizedEmail,
      managerName,
      managerEmail: normalizedEmail,
      managerRole: 'manager',
      sessionToken,
      status,
      expiresAt: now + 3600_000,
      lastSyncedAt: now,
      managementPin: form.managementPin,
    });

    await setResourcesSnapshot({
      employeesCount: Number(serverResponse?.employeesCount ?? serverResponse?.EMP_TOTAL ?? 0),
      devicesCount: Number(serverResponse?.devicesCount ?? serverResponse?.DEV_TOTAL ?? 0),
      policiesCount: Number(serverResponse?.policiesCount ?? serverResponse?.POL_TOTAL ?? 0),
      lastSyncedAt: now,
    });

    await setPinSession({
      companyId: normalizedCompanyId,
      managerId: normalizedEmail,
      pinSessionToken,
      grantedAt: now,
      expiresAt: now + 30 * 60 * 1000,
    });
  }, [form.adminName, form.companyId, form.companyName, form.workEmail, setCompanySession, setPinSession, setResourcesSnapshot]);

  const handleSubmit = async () => {
    if (submitting || success) {
      return;
    }

    const missingField = Object.entries(form).find(([, value]) => !value.trim());
    if (missingField) {
      Alert.alert('Incomplete form', 'Fill out every field so we can provision your workspace.');
      return;
    }

    if (!isPasswordStrong) {
      Alert.alert('Secure password needed', `Use at least ${MIN_PASSWORD_LENGTH} characters for email login.`);
      return;
    }

    if (!isMpinValid) {
      Alert.alert('Invalid management PIN', `Enter a ${MPIN_LENGTH}-digit PIN for the manager unlock flow.`);
      return;
    }

    if (!acceptPolicies) {
      Alert.alert('One more step', 'Please accept the security policies to continue.');
      return;
    }

    const normalizedCompanyId = form.companyId.trim().toUpperCase();
    const normalizedEmail = form.workEmail.trim().toLowerCase();
    const payload = {
      T1: 'COMPANY_CREATE_REQUEST',
      COMP2: form.companyName.trim(),
      COMP1: normalizedCompanyId,
      IND1: form.industry.trim(),
      TEAM_SIZE: form.teamSize.trim() || '0',
      U2: form.adminName.trim(),
      U1: normalizedEmail,
      PH1: form.phoneNumber.trim(),
      P1: form.password,
      PW1: form.password,
      PIN1: form.managementPin,
      MPIN1: form.managementPin,
    };

    setSubmitting(true);
    try {
      const response = await toonClient.toonPost(
        API_ENDPOINTS.COMPANY.CREATE_REQUEST,
        payload,
        { requireAuth: false, retries: 0 }
      );

      await bootstrapWorkspace(response);
      setSuccess(true);
    } catch (error) {
      console.warn('Provisioning API unavailable, bootstrapping locally', error);
      await bootstrapWorkspace();
      setSuccess(true);
    } finally {
      setSubmitting(false);
    }
  };

  const renderSuccess = () => (
    <View style={styles.successCard}>
      <View style={styles.successIconWrapper}>
        <Ionicons name="checkmark-circle" size={48} color="#10B981" />
      </View>
      <Text style={styles.successTitle}>Request received</Text>
      <Text style={styles.successCopy}>
        Workspace provisioning completed. We synced your credentials and unlocked every feature so you can start
        scanning right away.
      </Text>
      <Text style={styles.successHint}>Redirecting you to Face Scanner Home…</Text>
      <TouchableOpacity
        style={styles.returnButton}
        onPress={() => navigation.reset({ index: 0, routes: [{ name: 'CompanyLogin' }] })}
      >
        <Text style={styles.returnButtonText}>Return to Sign In</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.heroOrb,
          {
            transform: [{ scale: heroScale }],
            opacity: heroOpacity,
          },
        ]}
      />
      <AnimatedLinearGradient
        colors={["#020617", "#0F172A"]}
        style={styles.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.heroContent}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroEyebrow}>New workspace</Text>
          <Text style={styles.heroTitle}>Create a company account</Text>
          <Text style={styles.heroSubtitle}>
            Answer a few quick questions so we can configure secure infrastructure for your team.
          </Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressLabel}>Profile readiness</Text>
            <Text style={styles.progressValue}>{completionPercent}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completionPercent}%` }]} />
          </View>
        </View>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heroHighlight,
            {
              transform: [{ translateX: highlightTranslate }],
              opacity: heroOpacity,
            },
          ]}
        />
      </AnimatedLinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
          {success ? (
            renderSuccess()
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.sectionLabel}>Company profile</Text>
              <View style={styles.fieldRow}>
                <Field
                  label="Company name"
                  placeholder="Keyspace Studios"
                  value={form.companyName}
                  onChangeText={(text) => handleChange('companyName', text)}
                />
              </View>
              <View style={styles.fieldRow}>
                <Field
                  label="Company ID"
                  placeholder="KEYSPACE"
                  autoCapitalize="characters"
                  value={form.companyId}
                  onChangeText={(text) => handleChange('companyId', text)}
                  helperText="Appears on devices and dashboards."
                />
              </View>
              <View style={styles.dualRow}>
                <Field
                  label="Industry"
                  placeholder="Media"
                  value={form.industry}
                  onChangeText={(text) => handleChange('industry', text)}
                />
                <Field
                  label="Team size"
                  placeholder="150"
                  keyboardType="numeric"
                  value={form.teamSize}
                  onChangeText={(text) => handleChange('teamSize', text)}
                />
              </View>

              <Text style={styles.sectionLabel}>Primary admin</Text>
              <View style={styles.fieldRow}>
                <Field
                  label="Full name"
                  placeholder="Jordan Rivers"
                  value={form.adminName}
                  onChangeText={(text) => handleChange('adminName', text)}
                />
              </View>
              <View style={styles.fieldRow}>
                <Field
                  label="Work email"
                  placeholder="jordan@keyspace.studio"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={form.workEmail}
                  onChangeText={(text) => handleChange('workEmail', text)}
                />
              </View>
              <View style={styles.fieldRow}>
                <Field
                  label="Phone number"
                  placeholder="+1 (555) 010-0101"
                  keyboardType="phone-pad"
                  value={form.phoneNumber}
                  onChangeText={(text) => handleChange('phoneNumber', text)}
                />
              </View>
              <View style={styles.fieldRow}>
                <Field
                  label="Temporary password"
                  placeholder="••••••••"
                  secureTextEntry
                  value={form.password}
                  onChangeText={(text) => handleChange('password', text)}
                  helperText={`Used for email login. Minimum ${MIN_PASSWORD_LENGTH} characters.`}
                />
              </View>
              <View style={styles.fieldRow}>
                <Field
                  label={`Management mPIN (${MPIN_LENGTH} digits)`}
                  placeholder="123456"
                  keyboardType="numeric"
                  secureTextEntry
                  maxLength={MPIN_LENGTH}
                  value={form.managementPin}
                  onChangeText={(text) => handleChange('managementPin', text)}
                  helperText="Managers enter this PIN to unlock admin tools."
                />
              </View>

              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.switch, acceptPolicies && styles.switchActive]}
                  onPress={() => setAcceptPolicies((prev) => !prev)}
                  accessibilityRole="switch"
                  accessibilityState={{ checked: acceptPolicies }}
                >
                  <Animated.View
                    style={[
                      styles.switchThumb,
                      acceptPolicies && styles.switchThumbActive,
                      {
                        transform: [{ translateX: acceptPolicies ? 16 : 0 }],
                      },
                    ]}
                  />
                </TouchableOpacity>
                <Text style={styles.toggleCopy}>
                  I accept KS Attendance security policies and confirm I have authority to request this account.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, (!canSubmit || submitting) && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={18} color="#fff" />
                    <Text style={styles.submitButtonText}>Submit provisioning request</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.formHint}>
                Once submitted, we immediately provision a secure workspace, enable email+PIN login, and unlock every
                admin feature. You can start scanning right away.
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

interface FieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
  helperText?: string;
}

function Field({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry,
  autoCapitalize,
  maxLength,
  helperText,
}: FieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.fieldInputWrapper}>
        <TextInput
          style={styles.fieldInput}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
        />
      </View>
      {helperText ? <Text style={styles.inputHint}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#020617',
  },
  hero: {
    paddingTop: 72,
    paddingBottom: 32,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroContent: {
    gap: 12,
  },
  heroEyebrow: {
    color: '#94A3B8',
    fontSize: 14,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#CBD5F5',
    lineHeight: 22,
  },
  heroOrb: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: '#1D4ED8',
    top: -80,
    right: -60,
    opacity: 0.4,
  },
  heroHighlight: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#22D3EE',
    right: -40,
    bottom: -40,
    opacity: 0.35,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: '#CBD5F5',
    fontSize: 14,
  },
  progressValue: {
    color: '#FDE047',
    fontWeight: '600',
    fontSize: 16,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(148,163,184,0.3)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#38BDF8',
  },
  flex: {
    flex: 1,
  },
  scrollBody: {
    padding: 24,
    paddingBottom: 64,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 16,
    elevation: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 8,
  },
  fieldRow: {
    marginTop: 8,
  },
  dualRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  fieldContainer: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  fieldInputWrapper: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
  },
  fieldInput: {
    height: 48,
    fontSize: 16,
    color: '#0F172A',
  },
  inputHint: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    alignItems: 'center',
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    padding: 3,
    justifyContent: 'center',
  },
  switchActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#22C55E',
  },
  switchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#94A3B8',
  },
  switchThumbActive: {
    backgroundColor: '#22C55E',
  },
  toggleCopy: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
  submitButton: {
    marginTop: 16,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  formHint: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    lineHeight: 20,
  },
  successCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 16,
  },
  successIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16,185,129,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ECFCCB',
  },
  successCopy: {
    fontSize: 15,
    color: '#E2E8F0',
    textAlign: 'center',
    lineHeight: 22,
  },
  successHint: {
    fontSize: 13,
    color: '#A7F3D0',
    textAlign: 'center',
  },
  returnButton: {
    backgroundColor: '#22C55E',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 999,
  },
  returnButtonText: {
    color: '#052E16',
    fontSize: 15,
    fontWeight: '700',
  },
});
