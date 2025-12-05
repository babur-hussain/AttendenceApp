/**
 * useEnrollment Hook
 * Orchestrates enrollment flow, local persistence, and TOON submission
 */

import { useState, useCallback, useRef, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { toonClient } from '../services/api/ToonClient';
import { API_ENDPOINTS } from '../services/api/config';
import {
  FaceFrame,
  FaceEmbedding,
  QualityAssessment,
  EnrolledEmbedding,
  ToonFaceToken,
  computeEmbedding,
  assessQuality,
  aggregateEmbeddings,
  packEmbeddingForToon,
  validateFrame,
} from '../biometric/FacePipeline';

// ==================== TYPES ====================

export interface EnrollmentFormData {
  name: string;
  email: string;
  phone: string;
  role: 'EMP' | 'MANAGER' | 'ADMIN';
  allowedBreakMinutes: number;
  policyProfile: string;
}

export interface CapturedShot {
  embedding: FaceEmbedding;
  quality: QualityAssessment;
  capturedAt: number;
  angles?: {
    yaw?: number;
    pitch?: number;
    roll?: number;
  };
}

const MIN_SAMPLES_FOR_AGGREGATION = 6;
const MAX_BUFFERED_SHOTS = 24;

function trimShots(shots: CapturedShot[]): CapturedShot[] {
  if (shots.length <= MAX_BUFFERED_SHOTS) {
    return shots;
  }
  return shots.slice(shots.length - MAX_BUFFERED_SHOTS);
}

export interface EnrollmentState {
  step: 'form' | 'capture' | 'fingerprint' | 'review' | 'submitting' | 'success' | 'error';
  formData: EnrollmentFormData | null;
  shots: CapturedShot[];
  enrolledEmbedding: EnrolledEmbedding | null;
  fingerprintTemplate: string | null;
  consentToken: string | null;
  employeeId: string | null;
  pairingToken: string | null;
  error: string | null;
  isOffline: boolean;
  queuedPayload: any | null;
}

export interface EnrollmentPayload {
  E2: string;  // name
  E3: string;  // email
  E4: string;  // phone
  E5: string;  // role
  M1: string;  // metadata (allowedBreakMinutes, policyProfile)
  F2: string;  // face embedding tokens
  F3: string;  // face metadata
  FP1?: string; // fingerprint template (optional)
  C1: string;  // consent token
  CT1: number; // consent timestamp
  SN1: string; // signed name
}

export interface EnrollmentResponse {
  success: boolean;
  E1: string;      // employeeId
  PAIR1: string;   // pairing token
  message: string;
}

// ==================== HOOK ====================

function useEnrollmentController() {
  const [state, setState] = useState<EnrollmentState>({
    step: 'form',
    formData: null,
    shots: [],
    enrolledEmbedding: null,
    fingerprintTemplate: null,
    consentToken: null,
    employeeId: null,
    pairingToken: null,
    error: null,
    isOffline: false,
    queuedPayload: null,
  });

  const consentCheckbox = useRef<boolean>(false);

  // ==================== FORM SUBMISSION ====================

  /**
   * Submit enrollment form and advance to capture
   */
  const submitForm = useCallback((formData: EnrollmentFormData) => {
    setState(prev => ({
      ...prev,
      step: 'capture',
      formData,
      error: null,
    }));
  }, []);

  // ==================== SHOT CAPTURE ====================

  /**
   * Capture and process a single shot
   */
  const captureShot = useCallback(async (
    frame: FaceFrame,
    _thumbnailUri?: string
  ): Promise<{ success: boolean; quality?: QualityAssessment; error?: string }> => {
    try {
      // Validate frame
      const validation = validateFrame(frame);
      if (!validation.valid) {
        return { success: false, error: validation.reason };
      }

      // Compute embedding
      const embedding = await computeEmbedding(frame);

      // Assess quality
      const quality = assessQuality(embedding, frame);

      if (!quality.passesThreshold) {
        return {
          success: false,
          quality,
          error: 'Frame quality below threshold',
        };
      }

      // Add to shots
      const shot: CapturedShot = {
        embedding,
        quality,
        capturedAt: Date.now(),
        angles: frame.metadata.angle
          ? {
              yaw: frame.metadata.angle.yaw,
              pitch: frame.metadata.angle.pitch,
              roll: frame.metadata.angle.roll,
            }
          : undefined,
      };

      setState(prev => ({
        ...prev,
        shots: trimShots([...prev.shots, shot]),
      }));

      return { success: true, quality };
    } catch (error) {
      console.error('Shot capture error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process shot',
      };
    }
  }, []);

  /**
   * Remove a shot by index
   */
  const removeShot = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      shots: prev.shots.filter((_, i) => i !== index),
    }));
  }, []);

  /**
   * Complete capture and aggregate embeddings
   */
  const completeCapture = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const passedShots = state.shots.filter(s => s.quality.passesThreshold);
      if (passedShots.length < MIN_SAMPLES_FOR_AGGREGATION) {
        return { success: false, error: `Need at least ${MIN_SAMPLES_FOR_AGGREGATION} high-quality samples` };
      }

      // Aggregate embeddings
      const embeddings = passedShots.map(s => s.embedding);
      const qualities = passedShots.map(s => s.quality);
      const enrolled = aggregateEmbeddings(embeddings, qualities);

      setState(prev => ({
        ...prev,
        enrolledEmbedding: enrolled,
        step: 'review',
      }));

      return { success: true };
    } catch (error) {
      console.error('Complete capture error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to aggregate embeddings',
      };
    }
  }, [state.shots]);

  // ==================== FINGERPRINT ENROLLMENT ====================

  /**
   * Enroll fingerprint (optional)
   */
  const enrollFingerprint = useCallback(async (template: string) => {
    setState(prev => ({
      ...prev,
      fingerprintTemplate: template,
    }));
  }, []);

  /**
   * Skip fingerprint enrollment
   */
  const skipFingerprint = useCallback(() => {
    setState(prev => ({
      ...prev,
      step: 'review',
    }));
  }, []);

  // ==================== CONSENT ====================

  /**
   * Generate consent token
   */
  const generateConsentToken = useCallback((signedName: string): string => {
    const timestamp = Date.now();
    const data = `consent|${signedName}|${timestamp}`;
    // Simple hash (in production, use crypto)
    const token = btoa(data);
    return token;
  }, []);

  /**
   * Set consent
   */
  const setConsent = useCallback((accepted: boolean, signedName?: string) => {
    if (accepted && signedName) {
      const token = generateConsentToken(signedName);
      setState(prev => ({
        ...prev,
        consentToken: token,
      }));
      consentCheckbox.current = true;
    } else {
      setState(prev => ({
        ...prev,
        consentToken: null,
      }));
      consentCheckbox.current = false;
    }
  }, [generateConsentToken]);

  // ==================== ENROLLMENT SUBMISSION ====================

  /**
   * Build TOON enrollment payload
   */
  const buildEnrollmentPayload = useCallback((): EnrollmentPayload | null => {
    const { formData, enrolledEmbedding, fingerprintTemplate, consentToken } = state;

    if (!formData || !enrolledEmbedding || !consentToken) {
      return null;
    }

    // Pack embedding for TOON
    const faceTokens = packEmbeddingForToon(enrolledEmbedding);

    // Build metadata
    const metadata = `break=${formData.allowedBreakMinutes}|policy=${formData.policyProfile}`;

    const payload: EnrollmentPayload = {
      E2: formData.name,
      E3: formData.email,
      E4: formData.phone,
      E5: formData.role,
      M1: metadata,
      F2: faceTokens.F2,
      F3: faceTokens.F3,
      C1: consentToken,
      CT1: Date.now(),
      SN1: formData.name, // Signed name (from consent)
    };

    // Add fingerprint if available
    if (fingerprintTemplate) {
      payload.FP1 = fingerprintTemplate;
    }

    return payload;
  }, [state]);

  /**
   * Submit enrollment to server
   */
  const submitEnrollment = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      setState(prev => ({ ...prev, step: 'submitting', error: null }));

      const payload = buildEnrollmentPayload();
      if (!payload) {
        setState(prev => ({ ...prev, step: 'error', error: 'Invalid enrollment data' }));
        return { success: false, error: 'Invalid enrollment data' };
      }

      const response = await toonClient.toonPost<EnrollmentResponse>('/api/v1/employees', payload);
      if (!response.success) {
        throw new Error(response.message || 'Enrollment failed');
      }

      await SecureStore.setItemAsync(`consent_${response.E1}`, payload.C1);

      setState(prev => ({
        ...prev,
        step: 'success',
        employeeId: response.E1,
        pairingToken: response.PAIR1,
        isOffline: false,
        queuedPayload: null,
        error: null,
      }));

      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to submit enrollment';
      console.error('[Enrollment] Submission error:', errorMsg);

      setState(prev => ({
        ...prev,
        step: 'error',
        isOffline: false,
        queuedPayload: null,
        error: 'Live enrollment failed – check your connection and try again.',
      }));

      return { success: false, error: errorMsg };
    }
  }, [buildEnrollmentPayload]);

  // ==================== PAIRING TOKEN ====================

  /**
   * Regenerate pairing token
   */
  const regeneratePairingToken = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!state.employeeId) {
        return { success: false, error: 'No employee ID' };
      }

      const response = await toonClient.toonPost<{ success: boolean; PAIR1: string }>(
        '/api/v1/devices/pair-token',
        {
          operation: 'generate_pair',
          E1: state.employeeId,
        }
      );

      if (!response.success) {
        throw new Error('Failed to generate pairing token');
      }

      setState(prev => ({
        ...prev,
        pairingToken: response.PAIR1,
      }));

      return { success: true };
    } catch (error) {
      console.error('[Enrollment] Pairing token error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate pairing token',
      };
    }
  }, [state.employeeId]);

  // ==================== RESET ====================

  /**
   * Reset enrollment flow
   */
  const reset = useCallback(() => {
    setState({
      step: 'form',
      formData: null,
      shots: [],
      enrolledEmbedding: null,
      fingerprintTemplate: null,
      consentToken: null,
      employeeId: null,
      pairingToken: null,
      error: null,
      isOffline: false,
      queuedPayload: null,
    });
    consentCheckbox.current = false;
  }, []);

  /**
   * Retry from current step
   */
  const retry = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null,
    }));
  }, []);

  // ==================== RETURN ====================

  return {
    // State
    state,
    
    // Form
    submitForm,
    
    // Capture
    captureShot,
    removeShot,
    completeCapture,
    
    // Fingerprint
    enrollFingerprint,
    skipFingerprint,
    
    // Consent
    setConsent,
    consentAccepted: consentCheckbox.current,
    
    // Submission
    submitEnrollment,
    
    // Pairing
    regeneratePairingToken,
    
    // Control
    reset,
    retry,
  };
}

type EnrollmentController = ReturnType<typeof useEnrollmentController>;

const EnrollmentContext = createContext<EnrollmentController | null>(null);

export const EnrollmentProvider = ({ children }: { children: ReactNode }) => {
  const controller = useEnrollmentController();
  return (
    <EnrollmentContext.Provider value={controller}>
      {children}
    </EnrollmentContext.Provider>
  );
};

export function useEnrollment(): EnrollmentController {
  const context = useContext(EnrollmentContext);
  if (!context) {
    throw new Error('useEnrollment must be used within an EnrollmentProvider');
  }
  return context;
}
