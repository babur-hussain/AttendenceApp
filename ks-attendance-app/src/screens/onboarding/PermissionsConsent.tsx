import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Switch, TextInput, Linking, Platform } from 'react-native';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { OnboardCard } from '../../components/OnboardCard';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';

export type PermissionStatus = 'not_requested' | 'granted' | 'denied';

function badgeStyle(status: PermissionStatus) {
  switch (status) {
    case 'granted': return [styles.badge, styles.badgeOk];
    case 'denied': return [styles.badge, styles.badgeErr];
    default: return [styles.badge, styles.badgeWarn];
  }
}

export const PermissionsConsent: React.FC<{
  onConsentSaved: (opts: { consentTokenC1: string; analyticsOptIn: boolean }) => void;
}> = ({ onConsentSaved }) => {
  const [camStatus, setCamStatus] = useState<PermissionStatus>('not_requested');
  const [locStatus, setLocStatus] = useState<PermissionStatus>('not_requested');
  const [analyticsOptIn, setAnalyticsOptIn] = useState(false);
  const [fullName, setFullName] = useState('');
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const cam = await Camera.getCameraPermissionsAsync();
      setCamStatus(cam.granted ? 'granted' : cam.status === 'denied' ? 'denied' : 'not_requested');
      const loc = await Location.getForegroundPermissionsAsync();
      setLocStatus(loc.granted ? 'granted' : loc.status === 'denied' ? 'denied' : 'not_requested');
    })();
  }, []);

  const explainText = useMemo(() => (
    'We use your camera to capture a one-time face embedding for attendance, and location for site compliance. Images are not stored persistently.'
  ), []);

  const requestPermissions = async () => {
    // Friendly pre-prompt explanation shown above by UI
    const cam = await Camera.requestCameraPermissionsAsync();
    setCamStatus(cam.granted ? 'granted' : 'denied');
    const loc = await Location.requestForegroundPermissionsAsync();
    setLocStatus(loc.granted ? 'granted' : 'denied');
  };

  const openSettings = () => {
    if (Platform.OS === 'ios') Linking.openURL('app-settings:');
    else Linking.openSettings();
  };

  const saveConsent = () => {
    if (!checked || !fullName.trim()) return;
    const ts = new Date().toISOString();
    // Generate TOON consent token. Replace or extend tokens as needed.
    const token = `C1:consent_v1|C2:${encodeURIComponent(fullName.trim())}|C3:${ts}|C4:embeddings_only|C5:right_to_delete|AN1:${analyticsOptIn ? 'opt_in' : 'opt_out'}`;
    onConsentSaved({ consentTokenC1: token, analyticsOptIn });
  };

  return (
    <OnboardCard
      title="Permissions & Consent"
      subtitle="Enable required access and consent to proceed"
    >
      <Text style={styles.explain}>{explainText}</Text>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Camera</Text>
        <View style={badgeStyle(camStatus)} accessibilityLabel={`Camera ${camStatus}`}>
          <Text style={styles.badgeText}>{camStatus === 'granted' ? 'Allowed' : camStatus === 'denied' ? 'Denied' : 'Not Requested'}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Location</Text>
        <View style={badgeStyle(locStatus)} accessibilityLabel={`Location ${locStatus}`}>
          <Text style={styles.badgeText}>{locStatus === 'granted' ? 'Allowed' : locStatus === 'denied' ? 'Denied' : 'Not Requested'}</Text>
        </View>
      </View>

      { (camStatus !== 'granted' || locStatus !== 'granted') ? (
        <View style={styles.helpBox}>
          <Text style={styles.helpTitle}>We need your permission</Text>
          <Text style={styles.helpText}>
            Tap "Request Permissions" to see the system prompt. If you previously denied access, open Settings to enable Camera and Location.
          </Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
            <PrimaryButton title="Request Permissions" onPress={requestPermissions} accessibilityLabel="Request permissions" />
            <SecondaryButton title="Open Settings" onPress={openSettings} accessibilityLabel="Open device settings" />
          </View>
        </View>
      ) : null }

      <View style={styles.consentBox}>
        <Text style={styles.consentTitle}>Biometric Consent</Text>
        <Text style={styles.consentText}>
          • We collect face embeddings only (no persistent raw images){'\n'}
          • Embeddings stored for 24 months or HR policy duration{'\n'}
          • You may request deletion via HR at any time{'\n'}
          • Used solely for attendance and security purposes
        </Text>
        <View style={{ marginTop: 10 }}>
          <Text style={styles.label}>Your full name (digital signature)</Text>
          <TextInput
            accessibilityLabel="Full name input"
            placeholder="Type your full name"
            style={styles.input}
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            returnKeyType="done"
          />
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>I agree to biometric processing</Text>
          <Switch accessibilityLabel="Biometric consent" value={checked} onValueChange={setChecked} />
        </View>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Analytics (optional)</Text>
          <Switch accessibilityLabel="Analytics opt-in" value={analyticsOptIn} onValueChange={setAnalyticsOptIn} />
        </View>
        <PrimaryButton
          title="Save & Continue"
          onPress={saveConsent}
          disabled={!checked || !fullName.trim()}
          accessibilityLabel="Save consent and continue"
          style={{ marginTop: 12 }}
        />
      </View>

      {/* Comments: Use moti/reanimated for slide transitions and progress indicator in parent */}
    </OnboardCard>
  );
};

const styles = StyleSheet.create({
  explain: { color: '#374151', fontSize: 14, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  rowLabel: { color: '#111827', fontWeight: '600' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeOk: { backgroundColor: '#D1FAE5' },
  badgeErr: { backgroundColor: '#FECACA' },
  badgeWarn: { backgroundColor: '#FDE68A' },
  badgeText: { color: '#111827', fontSize: 12, fontWeight: '600' },
  helpBox: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginTop: 8 },
  helpTitle: { fontWeight: '700', color: '#111827', marginBottom: 6 },
  helpText: { color: '#4B5563' },
  consentBox: { marginTop: 16 },
  consentTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  consentText: { color: '#4B5563' },
  label: { color: '#111827' },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 12, marginTop: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
});

export default PermissionsConsent;
