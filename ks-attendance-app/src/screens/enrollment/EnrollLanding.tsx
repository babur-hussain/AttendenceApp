/**
 * EnrollLanding
 * Entry point for enrollment flow
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';

export const EnrollLanding: React.FC = () => {
  const navigation = useNavigation();

  const handleNewEmployee = () => {
    navigation.navigate('EnrollForm');
  };

  const handleExistingEmployee = () => {
    // TODO: Implement existing employee enrollment flow
    console.log('Navigate to EnrollForm (existing) - future feature');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Employee Enrollment</Text>
        <Text style={styles.subtitle}>
          Register new employee or update existing profile
        </Text>
      </View>

      {/* Illustration Placeholder */}
      <View style={styles.illustration}>
        <Text style={styles.illustrationEmoji}>👤</Text>
        <Text style={styles.illustrationText}>Secure Biometric Enrollment</Text>
      </View>

      {/* Options */}
      <View style={styles.options}>
        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleNewEmployee}
          activeOpacity={0.7}
        >
          <View style={styles.optionIcon}>
            <Text style={styles.optionIconText}>➕</Text>
          </View>
          <Text style={styles.optionTitle}>New Employee</Text>
          <Text style={styles.optionDescription}>
            Enroll a new employee with face & fingerprint
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={handleExistingEmployee}
          activeOpacity={0.7}
        >
          <View style={styles.optionIcon}>
            <Text style={styles.optionIconText}>🔄</Text>
          </View>
          <Text style={styles.optionTitle}>Enroll Existing</Text>
          <Text style={styles.optionDescription}>
            Update biometric data for existing employee
          </Text>
        </TouchableOpacity>
      </View>

      {/* Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>Privacy & Security</Text>
        <Text style={styles.infoText}>
          • All biometric data is encrypted at rest{'\n'}
          • Face embeddings are stored securely{'\n'}
          • Consent is required before enrollment{'\n'}
          • Data can be deleted at any time
        </Text>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>
        Powered by TOON Protocol • Biometric Enrollment v1.0
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: '#f5f5f5',
  },
  
  // Header
  header: {
    marginBottom: 32,
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
  
  // Illustration
  illustration: {
    alignItems: 'center',
    marginBottom: 32,
  },
  illustrationEmoji: {
    fontSize: 80,
    marginBottom: 12,
  },
  illustrationText: {
    fontSize: 13,
    color: '#999',
  },
  
  // Options
  options: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Shadow for Android
    elevation: 3,
  },
  optionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionIconText: {
    fontSize: 32,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    lineHeight: 18,
  },
  
  // Info
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    marginBottom: 24,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
  
  // Footer
  footer: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
    marginTop: 16,
  },
});
