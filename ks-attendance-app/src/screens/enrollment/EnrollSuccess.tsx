/**
 * EnrollSuccess
 * Enrollment completion screen with employee ID and QR pairing token
 * 
 * INTEGRATION POINTS:
 * - QR code library: react-native-qrcode-svg or expo equivalent
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useEnrollment } from '../../hooks/useEnrollment';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AdminStackParamList } from '../../navigation/AdminNavigator';

export const EnrollSuccess: React.FC = () => {
  const { state, regeneratePairingToken, reset } = useEnrollment();
  const navigation = useNavigation<StackNavigationProp<AdminStackParamList>>();

  /**
   * Handle regenerate pairing token
   */
  const handleRegenerateToken = () => {
    regeneratePairingToken();
  };

  /**
   * Handle enroll another
   */
  const handleEnrollAnother = () => {
    reset();
  };

  /**
   * Handle done
   */
  const handleDone = () => {
    reset();
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Success Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.successIcon}>✅</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Enrollment Complete!</Text>
        <Text style={styles.subtitle}>
          {state.isOffline
            ? 'Your enrollment has been queued and will be synced when online'
            : 'Employee has been successfully enrolled'}
        </Text>
      </View>

      {/* Employee ID Section */}
      {state.employeeId && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee ID</Text>
          <View style={styles.idBox}>
            <Text style={styles.idText}>{state.employeeId}</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Save this ID for record-keeping
          </Text>
        </View>
      )}

      {/* QR Code Section */}
      {state.pairingToken && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kiosk Pairing Token</Text>
          <View style={styles.qrBox}>
            {/* TODO: Replace with react-native-qrcode-svg */}
            <View style={styles.mockQR}>
              <Text style={styles.mockQRIcon}>📱</Text>
              <Text style={styles.mockQRText}>QR Code</Text>
              <Text style={styles.mockQRSubtext}>{state.pairingToken.substring(0, 20)}...</Text>
            </View>
          </View>
          <Text style={styles.sectionSubtitle}>
            Scan this QR code at any kiosk to pair the device with this employee
          </Text>
          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={handleRegenerateToken}
          >
            <Text style={styles.regenerateButtonText}>🔄 Regenerate Token</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Offline Sync Status */}
      {state.isOffline && state.queuedPayload && (
        <View style={styles.offlineBox}>
          <Text style={styles.offlineIcon}>📶</Text>
          <View style={styles.offlineContent}>
            <Text style={styles.offlineTitle}>Queued for Sync</Text>
            <Text style={styles.offlineText}>
              This enrollment is saved locally and will be automatically submitted when an
              internet connection is available.
            </Text>
          </View>
        </View>
      )}

      {/* Next Steps */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next Steps</Text>
        <View style={styles.stepsBox}>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>
              Employee can now use their enrolled face/fingerprint at any kiosk
            </Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>
              {state.pairingToken
                ? 'Optionally scan the QR code to pair this employee with a specific kiosk'
                : 'Biometric authentication is immediately available'}
            </Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>
              Employee credentials have been sent to {state.formData?.email || 'the registered email'}
            </Text>
          </View>
        </View>
      </View>

      {/* Privacy Notice */}
      <View style={styles.privacyBox}>
        <Text style={styles.privacyIcon}>🔒</Text>
        <View style={styles.privacyContent}>
          <Text style={styles.privacyTitle}>Privacy Protected</Text>
          <Text style={styles.privacyText}>
            All biometric data is encrypted and stored securely. Employee consent has been
            recorded with digital signature and timestamp.
          </Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleEnrollAnother}
        >
          <Text style={styles.primaryButtonText}>Enroll Another Employee</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleDone}
        >
          <Text style={styles.secondaryButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  
  // Icon
  iconContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  successIcon: {
    fontSize: 80,
  },
  
  // Header
  header: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  
  // Employee ID
  idBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  idText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
    letterSpacing: 2,
  },
  
  // QR Code
  qrBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  mockQR: {
    width: 200,
    height: 200,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  mockQRIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  mockQRText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  mockQRSubtext: {
    fontSize: 10,
    color: '#999',
  },
  regenerateButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignSelf: 'center',
  },
  regenerateButtonText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
  },
  
  // Offline
  offlineBox: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: '#FFF5E6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  offlineIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  offlineContent: {
    flex: 1,
  },
  offlineTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B87300',
    marginBottom: 4,
  },
  offlineText: {
    fontSize: 12,
    color: '#B87300',
    lineHeight: 18,
  },
  
  // Steps
  stepsBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 28,
    marginRight: 12,
  },
  stepText: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 20,
  },
  
  // Privacy
  privacyBox: {
    marginHorizontal: 24,
    marginTop: 24,
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    borderLeftWidth: 3,
    borderLeftColor: '#34c759',
  },
  privacyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  privacyContent: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 4,
  },
  privacyText: {
    fontSize: 12,
    color: '#2E7D32',
    lineHeight: 18,
  },
  
  // Actions
  actions: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  primaryButton: {
    height: 52,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  secondaryButton: {
    height: 52,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
