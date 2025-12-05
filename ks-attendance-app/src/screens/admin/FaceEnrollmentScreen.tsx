import React, { Fragment, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';

import { EnrollmentProvider, useEnrollment } from '../../hooks/useEnrollment';
import type { EnrollmentState } from '../../hooks/useEnrollment';
import { EnrollForm, FaceIdCapture, EnrollReview, EnrollSuccess } from '../enrollment';
import type { AdminStackParamList } from '../../navigation/AdminNavigator';

type AdminNav = StackNavigationProp<AdminStackParamList>;

type FlowStepKey = 'form' | 'capture' | 'review' | 'success';

const FLOW_STEPS: Array<{ key: FlowStepKey; label: string }> = [
  { key: 'form', label: 'Employee' },
  { key: 'capture', label: 'Face Capture' },
  { key: 'review', label: 'Review' },
  { key: 'success', label: 'Complete' },
];

export default function FaceEnrollmentScreen() {
  return (
    <EnrollmentProvider>
      <EnrollmentFlow />
    </EnrollmentProvider>
  );
}

const EnrollmentFlow: React.FC = () => {
  const navigation = useNavigation<AdminNav>();
  const { state, reset, retry } = useEnrollment();

  const visualStep = useMemo(() => mapVisualStep(state), [state]);
  const showInlineError = Boolean(state.error) && state.step !== 'error' && state.step !== 'success';

  const renderStep = () => {
    switch (state.step) {
      case 'form':
        return <EnrollForm />;
      case 'capture':
        return <FaceIdCapture />;
      case 'fingerprint':
      case 'review':
      case 'submitting':
        return <EnrollReview />;
      case 'success':
        return <EnrollSuccess />;
      case 'error':
        return (
          <EnrollmentErrorView
            message={state.error}
            onRetry={retry}
            onReset={reset}
          />
        );
      default:
        return <EnrollForm />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => {
              reset();
              navigation.goBack();
            }}
          >
            <Text style={styles.headerButtonText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Face Enrollment</Text>
          <TouchableOpacity style={styles.headerButton} onPress={reset}>
            <Text style={styles.headerButtonText}>Restart</Text>
          </TouchableOpacity>
        </View>

        <FlowStepIndicator currentStep={visualStep} />

        {showInlineError && (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorText}>{state.error}</Text>
            <TouchableOpacity onPress={retry}>
              <Text style={styles.inlineErrorAction}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[
            styles.stageContainer,
            state.step === 'capture' && styles.captureStage,
          ]}
        >
          {renderStep()}
        </View>

        {state.step === 'submitting' && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Uploading encrypted enrollment…</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const FlowStepIndicator: React.FC<{ currentStep: FlowStepKey }> = ({ currentStep }) => {
  const currentIndex = FLOW_STEPS.findIndex((step) => step.key === currentStep);

  return (
    <View style={styles.stepper}>
      {FLOW_STEPS.map((step, index) => {
        const reached = index <= currentIndex;
        return (
          <Fragment key={step.key}>
            <View style={styles.stepperItem}>
              <View
                style={[
                  styles.stepperCircle,
                  reached && styles.stepperCircleActive,
                ]}
              >
                <Text
                  style={[
                    styles.stepperCircleText,
                    reached && styles.stepperCircleTextActive,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <Text
                style={[
                  styles.stepperLabel,
                  reached && styles.stepperLabelActive,
                ]}
              >
                {step.label}
              </Text>
            </View>
            {index < FLOW_STEPS.length - 1 && (
              <View
                style={[
                  styles.stepperConnector,
                  index < currentIndex && styles.stepperConnectorActive,
                ]}
              />
            )}
          </Fragment>
        );
      })}
    </View>
  );
};

const EnrollmentErrorView: React.FC<{
  message?: string | null;
  onRetry: () => void;
  onReset: () => void;
}> = ({ message, onRetry, onReset }) => (
  <View style={styles.errorState}>
    <Text style={styles.errorIcon}>⚠️</Text>
    <Text style={styles.errorTitle}>We hit a snag</Text>
    <Text style={styles.errorMessage}>{message || 'Unable to continue enrollment. Try again.'}</Text>
    <View style={styles.errorActions}>
      <TouchableOpacity style={styles.primaryAction} onPress={onRetry}>
        <Text style={styles.primaryActionText}>Retry Step</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryAction} onPress={onReset}>
        <Text style={styles.secondaryActionText}>Restart Flow</Text>
      </TouchableOpacity>
    </View>
  </View>
);

function mapVisualStep(state: EnrollmentState): FlowStepKey {
  const { step, shots, enrolledEmbedding } = state;
  switch (step) {
    case 'form':
      return 'form';
    case 'capture':
    case 'fingerprint':
      return 'capture';
    case 'review':
    case 'submitting':
    case 'error':
      if (enrolledEmbedding || shots.length >= 3) {
        return 'review';
      }
      return shots.length > 0 ? 'capture' : 'form';
    case 'success':
      return 'success';
    default:
      return 'form';
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f2f2f2',
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headerButtonText: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  stepperItem: {
    alignItems: 'center',
  },
  stepperCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#D0D5DD',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  stepperCircleActive: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  stepperCircleText: {
    fontWeight: '600',
    color: '#94A3B8',
  },
  stepperCircleTextActive: {
    color: '#fff',
  },
  stepperLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#94A3B8',
  },
  stepperLabelActive: {
    color: '#0f172a',
    fontWeight: '600',
  },
  stepperConnector: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  stepperConnectorActive: {
    backgroundColor: '#007AFF',
  },
  inlineError: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  inlineErrorText: {
    flex: 1,
    color: '#B91C1C',
    fontSize: 13,
  },
  inlineErrorAction: {
    color: '#B91C1C',
    fontWeight: '600',
  },
  stageContainer: {
    flex: 1,
    marginTop: 12,
  },
  captureStage: {
    marginTop: 0,
    backgroundColor: '#000',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#fff',
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    marginHorizontal: 24,
    marginVertical: 32,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#991B1B',
    textAlign: 'center',
  },
  errorActions: {
    marginTop: 24,
    width: '100%',
    gap: 12,
  },
  primaryAction: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryAction: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5F5',
  },
  secondaryActionText: {
    color: '#1d4ed8',
    fontWeight: '600',
    fontSize: 15,
  },
});

