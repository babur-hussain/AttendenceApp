/**
 * OverrideEventModal - Override Attendance Event Modal
 * 
 * Allows managers to manually override check-in/out times and breaks
 * Sends TOON payload with override event type
 */

import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { ToonClient } from '../../services/api/ToonClient';
import { encodeToToonPayload } from '../../utils/toon';
import { useAuth } from '../../context/AuthContext';

interface OverrideEventModalProps {
  route: { params: { employeeId: string } };
  navigation: any;
}

type OverrideType = 'CHECK_IN' | 'CHECK_OUT' | 'BREAK_START' | 'BREAK_END' | 'MANUAL_ATTENDANCE';

export const OverrideEventModal: React.FC<OverrideEventModalProps> = ({ route, navigation }) => {
  const { employeeId } = route.params;
  const { user } = useAuth();
  
  const [overrideType, setOverrideType] = useState<OverrideType>('CHECK_IN');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toonClient = new ToonClient();

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Missing Reason', 'Please provide a reason for the override.');
      return;
    }

    setSubmitting(true);

    try {
      // Build override payload
      const timestamp = `${date}T${time}:00Z`;
      const payload: Record<string, string> = {
        A1: `OVERRIDE_${Date.now()}`, // Event ID
        E1: employeeId, // Employee ID
        A2: overrideType, // Event type
        A3: timestamp, // Timestamp
        R2: reason, // Override reason
        MGR_ID: user?.id || 'MGR_UNKNOWN', // Manager ID
        OVERRIDE: '1', // Override flag
        TS: new Date().toISOString(), // Override timestamp
        SIG1: `MGR_OVERRIDE_${Date.now()}`, // Signature
      };

      const toonPayload = encodeToToonPayload(payload);
      
      // Send override to backend
      await toonClient.toonPost('/api/attendance/override', toonPayload);
      
      Alert.alert(
        'Success',
        'Attendance override submitted successfully.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (err) {
      console.error('Failed to submit override:', err);
      Alert.alert('Error', 'Failed to submit override. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide">
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Override Attendance</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.content}>
              <Text style={styles.subtitle}>Employee ID: {employeeId}</Text>

              {/* Override Type */}
              <Text style={styles.label}>Event Type</Text>
              <View style={styles.buttonGroup}>
                {(['CHECK_IN', 'CHECK_OUT', 'BREAK_START', 'BREAK_END', 'MANUAL_ATTENDANCE'] as OverrideType[]).map(
                  (type) => (
                    <TouchableOpacity
                      key={type}
                      style={[styles.typeButton, overrideType === type && styles.typeButtonActive]}
                      onPress={() => setOverrideType(type)}
                    >
                      <Text
                        style={[
                          styles.typeButtonText,
                          overrideType === type && styles.typeButtonTextActive,
                        ]}
                      >
                        {type.replace(/_/g, ' ')}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {/* Date */}
              <Text style={styles.label}>Date</Text>
              <TextInput
                style={styles.input}
                value={date}
                onChangeText={setDate}
                placeholder="YYYY-MM-DD"
              />

              {/* Time */}
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                value={time}
                onChangeText={setTime}
                placeholder="HH:MM"
              />

              {/* Reason */}
              <Text style={styles.label}>Reason *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={reason}
                onChangeText={setReason}
                placeholder="Enter reason for override..."
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Override</Text>
                )}
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  closeButton: {
    fontSize: 24,
    color: '#757575',
  },
  content: {
    padding: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#212121',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  buttonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  typeButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#1976D2',
  },
  typeButtonText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
  },
  typeButtonTextActive: {
    color: '#1976D2',
  },
  submitButton: {
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#757575',
    fontSize: 15,
    fontWeight: '600',
  },
});
