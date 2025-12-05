/**
 * EnrollForm
 * Collects employee information
 * 
 * DEPENDENCY NOTE:
 * Install Picker component:
 * npm install @react-native-picker/picker
 * 
 * Or replace with native select or custom picker component
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
// TODO: Install @react-native-picker/picker
// import { Picker } from '@react-native-picker/picker';
import { useEnrollment, EnrollmentFormData } from '../../hooks/useEnrollment';

interface EnrollFormProps {
  mode?: 'new' | 'existing';
}

export const EnrollForm: React.FC<EnrollFormProps> = ({ mode = 'new' }) => {
  const { submitForm } = useEnrollment();

  const [formData, setFormData] = useState<EnrollmentFormData>({
    name: '',
    email: '',
    phone: '',
    role: 'EMP',
    allowedBreakMinutes: 30,
    policyProfile: 'standard',
  });

  const [errors, setErrors] = useState<Partial<Record<keyof EnrollmentFormData, string>>>({});

  /**
   * Validate form
   */
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof EnrollmentFormData, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle submit
   */
  const handleSubmit = () => {
    if (validate()) {
      submitForm(formData);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'new' ? 'New Employee' : 'Update Employee'}
          </Text>
          <Text style={styles.subtitle}>
            Enter employee information to continue
          </Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              placeholder="John Doe"
              value={formData.name}
              onChangeText={(text) => {
                setFormData({ ...formData, name: text });
                setErrors({ ...errors, name: undefined });
              }}
              autoCapitalize="words"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email *</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="john.doe@company.com"
              value={formData.email}
              onChangeText={(text) => {
                setFormData({ ...formData, email: text });
                setErrors({ ...errors, email: undefined });
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Phone */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Phone *</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              placeholder="+1 234 567 8900"
              value={formData.phone}
              onChangeText={(text) => {
                setFormData({ ...formData, phone: text });
                setErrors({ ...errors, phone: undefined });
              }}
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          {/* Role */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Role</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'EMP' && styles.roleButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, role: 'EMP' })}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.role === 'EMP' && styles.roleButtonTextActive,
                  ]}
                >
                  Employee
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'MANAGER' && styles.roleButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, role: 'MANAGER' })}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.role === 'MANAGER' && styles.roleButtonTextActive,
                  ]}
                >
                  Manager
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.role === 'ADMIN' && styles.roleButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, role: 'ADMIN' })}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.role === 'ADMIN' && styles.roleButtonTextActive,
                  ]}
                >
                  Admin
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Break Minutes */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Allowed Break Minutes</Text>
            <TextInput
              style={styles.input}
              placeholder="30"
              value={String(formData.allowedBreakMinutes)}
              onChangeText={(text) => {
                const num = parseInt(text) || 0;
                setFormData({ ...formData, allowedBreakMinutes: num });
              }}
              keyboardType="number-pad"
            />
            <Text style={styles.helperText}>
              Daily break allowance in minutes
            </Text>
          </View>

          {/* Policy Profile */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Policy Profile</Text>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.policyProfile === 'standard' && styles.roleButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, policyProfile: 'standard' })}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.policyProfile === 'standard' && styles.roleButtonTextActive,
                  ]}
                >
                  Standard
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.policyProfile === 'flexible' && styles.roleButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, policyProfile: 'flexible' })}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.policyProfile === 'flexible' && styles.roleButtonTextActive,
                  ]}
                >
                  Flexible
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  formData.policyProfile === 'strict' && styles.roleButtonActive,
                ]}
                onPress={() => setFormData({ ...formData, policyProfile: 'strict' })}
              >
                <Text
                  style={[
                    styles.roleButtonText,
                    formData.policyProfile === 'strict' && styles.roleButtonTextActive,
                  ]}
                >
                  Strict
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Info Note */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ After submitting, you'll be guided through face capture for biometric enrollment
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Continue to Face Capture</Text>
        </TouchableOpacity>
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
    padding: 24,
  },
  
  // Header
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  
  // Form
  form: {
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 15,
    backgroundColor: '#f9f9f9',
  },
  inputError: {
    borderColor: '#ff3b30',
    backgroundColor: '#fff5f5',
  },
  errorText: {
    fontSize: 12,
    color: '#ff3b30',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    overflow: 'hidden',
  },
  picker: {
    height: 48,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  roleButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  roleButtonTextActive: {
    color: '#fff',
  },
  
  // Info
  infoBox: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  
  // Submit
  submitButton: {
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
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});
