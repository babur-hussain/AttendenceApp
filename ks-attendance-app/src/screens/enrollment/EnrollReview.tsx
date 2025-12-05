/**
 * EnrollReview
 * Review captured shots, form data, and provide consent before submission
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useEnrollment } from '../../hooks/useEnrollment';
import { EmbeddingQualityMeter } from '../../components/enrollment/EmbeddingQualityMeter';
import { QualityAssessment } from '../../biometric/FacePipeline';

export const EnrollReview: React.FC = () => {
  const { state, setConsent, submitEnrollment } = useEnrollment();

  const [consentAccepted, setConsentAccepted] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /**
   * Handle consent checkbox
   */
  const toggleConsent = () => {
    const newValue = !consentAccepted;
    setConsentAccepted(newValue);
    
    if (newValue && state.formData) {
      // Generate signed name from form data
      const fullName = `${state.formData.name || 'Unknown'}`;
      setSignedName(fullName);
      setConsent(true, fullName);
    } else {
      setConsent(false, '');
      setSignedName('');
    }
  };

  /**
   * Handle submit
   */
  const handleSubmit = async () => {
    if (!consentAccepted) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await submitEnrollment();
      if (!result.success) {
        console.error('Submission failed:', result.error);
      }
      // State change to 'success' or 'error' will be handled by hook
    } catch (err) {
      console.error('Unexpected submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate aggregate quality
  const aggregateQuality: QualityAssessment | null = state.enrolledEmbedding?.qualityScore
    ? {
        score: state.enrolledEmbedding.qualityScore,
        passesThreshold: state.enrolledEmbedding.qualityScore >= 65,
        factors: {
          lighting: { score: state.enrolledEmbedding.qualityScore, status: 'good' as const },
          sharpness: { score: state.enrolledEmbedding.qualityScore, status: 'good' as const },
          pose: { score: state.enrolledEmbedding.qualityScore, status: 'good' as const },
          occlusion: { score: state.enrolledEmbedding.qualityScore, status: 'good' as const },
        },
        tips: [],
      }
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Review Enrollment</Text>
        <Text style={styles.subtitle}>
          Please review your information before submitting
        </Text>
      </View>

      {/* Captured Shots Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📸 Captured Shots ({state.shots.length})</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shotsScroll}>
          {state.shots.map((shot, index) => (
            <View key={index} style={styles.shotThumbnail}>
              <View style={styles.shotImage}>
                <Text style={styles.shotIcon}>📷</Text>
                <Text style={styles.shotNumber}>#{index + 1}</Text>
              </View>
              <View
                style={[
                  styles.shotQualityBadge,
                  {
                    backgroundColor: shot.quality.passesThreshold
                      ? '#34c75920'
                      : '#FF950020',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.shotQualityText,
                    {
                      color: shot.quality.passesThreshold ? '#34c759' : '#FF9500',
                    },
                  ]}
                >
                  Quality: {shot.quality.score}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Aggregate Quality Section */}
      {aggregateQuality && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✨ Overall Quality</Text>
          <EmbeddingQualityMeter quality={aggregateQuality} showDetails={true} />
        </View>
      )}

      {/* Fingerprint Section */}
      {state.fingerprintTemplate && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👆 Fingerprint Enrolled</Text>
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>✓ Fingerprint template captured successfully</Text>
          </View>
        </View>
      )}

      {/* Form Data Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Employee Information</Text>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>
              {state.formData?.name || 'N/A'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{state.formData?.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone:</Text>
            <Text style={styles.infoValue}>{state.formData?.phone || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role:</Text>
            <Text style={styles.infoValue}>{state.formData?.role || 'N/A'}</Text>
          </View>
          {state.formData?.allowedBreakMinutes && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Break Minutes:</Text>
              <Text style={styles.infoValue}>{state.formData.allowedBreakMinutes}</Text>
            </View>
          )}
          {state.formData?.policyProfile && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Policy Profile:</Text>
              <Text style={styles.infoValue}>{state.formData.policyProfile}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Consent Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📜 Privacy & Consent</Text>
        <View style={styles.consentBox}>
          <Text style={styles.consentText}>
            I consent to the collection and processing of my biometric data (facial embeddings
            {state.fingerprintTemplate ? ' and fingerprint template' : ''}) for the purpose of
            employee enrollment and attendance tracking.
          </Text>
          <Text style={styles.consentText}>
            I understand that:
          </Text>
          <Text style={styles.consentBullet}>
            • My biometric data will be encrypted and stored securely
          </Text>
          <Text style={styles.consentBullet}>
            • Data will only be used for attendance and identity verification
          </Text>
          <Text style={styles.consentBullet}>
            • I can request deletion of my data at any time
          </Text>
          <Text style={styles.consentBullet}>
            • Data will not be shared with third parties without my consent
          </Text>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={toggleConsent}
          >
            <View style={[styles.checkbox, consentAccepted && styles.checkboxChecked]}>
              {consentAccepted && <Text style={styles.checkboxIcon}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              I agree to the terms above and consent to biometric data collection
            </Text>
          </TouchableOpacity>

          {consentAccepted && (
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Digital Signature:</Text>
              <Text style={styles.signatureText}>{signedName}</Text>
              <Text style={styles.signatureDate}>
                {new Date().toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Offline Queue Indicator */}
      {state.isOffline && (
        <View style={styles.offlineBox}>
          <Text style={styles.offlineIcon}>📶</Text>
          <Text style={styles.offlineText}>
            No internet connection. Your enrollment will be queued and submitted automatically
            when connection is restored.
          </Text>
        </View>
      )}

      {/* Submit Button */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!consentAccepted || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!consentAccepted || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>
              {state.isOffline ? 'Queue Enrollment' : 'Submit Enrollment'}
            </Text>
          )}
        </TouchableOpacity>

        {!consentAccepted && (
          <Text style={styles.disabledHint}>
            Please accept the consent terms to continue
          </Text>
        )}
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
  
  // Header
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  
  // Section
  section: {
    marginTop: 16,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  
  // Shots
  shotsScroll: {
    marginTop: 8,
  },
  shotThumbnail: {
    marginRight: 12,
  },
  shotImage: {
    width: 90,
    height: 110,
    backgroundColor: '#ddd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  shotIcon: {
    fontSize: 36,
  },
  shotNumber: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  shotQualityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'center',
  },
  shotQualityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  
  // Info Box
  infoBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 120,
  },
  infoValue: {
    fontSize: 14,
    color: '#1a1a1a',
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    color: '#34c759',
  },
  
  // Consent
  consentBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  consentText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
    marginBottom: 12,
  },
  consentBullet: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginBottom: 6,
    paddingLeft: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  checkboxIcon: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 13,
    color: '#333',
    flex: 1,
    lineHeight: 18,
  },
  signatureBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  signatureLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  signatureText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  signatureDate: {
    fontSize: 11,
    color: '#999',
  },
  
  // Offline
  offlineBox: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: '#FFF5E6',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9500',
  },
  offlineIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  offlineText: {
    fontSize: 12,
    color: '#B87300',
    flex: 1,
    lineHeight: 18,
  },
  
  // Actions
  actions: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  submitButton: {
    height: 52,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  disabledHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 8,
  },
});
