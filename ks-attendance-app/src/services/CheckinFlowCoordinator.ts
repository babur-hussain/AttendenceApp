/**
 * CheckinFlowCoordinator - Main service orchestrating the check-in/check-out workflow
 * Handles: Capture → Process → Match → Build TOON → Persist → Sync
 */

import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { BiometricManager } from '../services/biometric/BiometricManager';
import { FacePipeline } from '../services/biometric/FacePipeline';
import { toonService } from '../services/ToonService';
import LocalEventQueue from '../services/LocalEventQueue';
import type {
  AttendanceEventType,
  AttendanceToonEvent,
  BiometricMatchResult,
  CaptureResult,
  CheckinFlowState,
  CheckinEvent,
  PolicyConfig,
  EventStatus,
  RejectionReason,
} from '../types/checkin';
import { DEFAULT_POLICY } from '../types/checkin';

type CheckinListener = (event: CheckinEvent) => void;

export class CheckinFlowCoordinator {
  private static instance: CheckinFlowCoordinator;
  private biometricManager: BiometricManager;
  private facePipeline: FacePipeline;
  private eventQueue = LocalEventQueue;
  private policy: PolicyConfig = DEFAULT_POLICY;
  private listeners: CheckinListener[] = [];
  private currentState: CheckinFlowState = 'idle';
  private syncInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.biometricManager = new BiometricManager();
    this.facePipeline = new FacePipeline();
    
    // Start background sync
    this.startBackgroundSync();
    
    // Listen to network changes
    NetInfo.addEventListener((state: any) => {
      if (state.isConnected) {
        console.log('[CheckinFlowCoordinator] Network connected, triggering sync');
        this.reconcilePendingEvents();
      }
    });
  }

  static getInstance(): CheckinFlowCoordinator {
    if (!CheckinFlowCoordinator.instance) {
      CheckinFlowCoordinator.instance = new CheckinFlowCoordinator();
    }
    return CheckinFlowCoordinator.instance;
  }

  /**
   * Set policy configuration
   */
  setPolicy(policy: Partial<PolicyConfig>): void {
    this.policy = { ...DEFAULT_POLICY, ...policy };
    console.log('[CheckinFlowCoordinator] Policy updated:', this.policy);
  }

  /**
   * Get current policy
   */
  getPolicy(): PolicyConfig {
    return { ...this.policy };
  }

  /**
   * Subscribe to checkin events
   */
  subscribe(listener: CheckinListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: CheckinEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[CheckinFlowCoordinator] Listener error:', error);
      }
    });
  }

  /**
   * Get current flow state
   */
  getState(): CheckinFlowState {
    return this.currentState;
  }

  /**
   * Main check-in flow
   */
  async startCheckin(
    eventType: AttendanceEventType,
    employeeId?: string
  ): Promise<{
    success: boolean;
    eventId?: string;
    status?: EventStatus;
    reason?: string;
  }> {
    try {
      this.currentState = 'capturing';
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      this.emit({
        type: 'attempt',
        eventId,
        eventType,
        timestamp: new Date().toISOString(),
      });

      // Step 1: Capture biometrics
      console.log('[CheckinFlowCoordinator] Step 1: Capturing biometrics...');
      const captureResult = await this.captureBiometrics();
      
      if (!captureResult.success) {
        this.currentState = 'error';
        return { success: false, reason: captureResult.error || 'Capture failed' };
      }

      // Step 2: Process face pipeline
      this.currentState = 'processing';
      console.log('[CheckinFlowCoordinator] Step 2: Processing face pipeline...');
      
      let livenessScore = captureResult.liveness || 0;
      let qualityScore = captureResult.quality || 0;
      
      // If we have face data, run through pipeline
      if (captureResult.faceEmbedding) {
        // Pipeline processing would happen here
        // For now, use captured scores
      }

      // Step 3: Match against policy
      this.currentState = 'awaiting_match';
      console.log('[CheckinFlowCoordinator] Step 3: Matching against policy...');
      
      const matchResult = await this.matchBiometrics({
        faceEmbedding: captureResult.faceEmbedding,
        fingerprintTemplate: captureResult.fingerprintTemplate,
        livenessScore,
        qualityScore,
      }, employeeId);

      // Step 4: Build TOON event
      console.log('[CheckinFlowCoordinator] Step 4: Building TOON event...');
      const location = await this.getLocation();
      
      const toonEvent = await this.buildToonEvent({
        eventId,
        eventType,
        employeeId,
        captureResult,
        matchResult,
        location,
      });

      // Step 5: Persist to local queue
      console.log('[CheckinFlowCoordinator] Step 5: Persisting to queue...');
      await this.eventQueue.enqueue(toonEvent);

      // Step 6: Attempt immediate sync if online
      this.currentState = 'sending';
      const syncResult = await this.syncEvent(eventId);

      if (syncResult.success) {
        this.currentState = 'sent';
        this.emit({
          type: 'sent',
          eventId,
          eventType,
          status: toonEvent.S1,
          timestamp: new Date().toISOString(),
        });
        return { success: true, eventId, status: toonEvent.S1 };
      } else {
        // Queued for later sync
        this.currentState = 'queued';
        this.emit({
          type: 'queued',
          eventId,
          eventType,
          status: toonEvent.S1,
          timestamp: new Date().toISOString(),
        });
        return { success: true, eventId, status: 'QUEUED' as EventStatus };
      }

    } catch (error) {
      console.error('[CheckinFlowCoordinator] Error in startCheckin:', error);
      this.currentState = 'error';
      this.emit({
        type: 'error',
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        eventType: 'IN',
        reason: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      });
      return { success: false, reason: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Capture biometrics (face and/or fingerprint)
   */
  private async captureBiometrics(): Promise<CaptureResult> {
    try {
      // Check if face adapter is available
      // Check device capabilities (simplified)
      const hasFace = true; // Assume face capability
      const hasFingerprint = false; // Fingerprint optional

      let faceEmbedding: string | undefined;
      let fingerprintTemplate: string | undefined;
      let liveness = 0;
      let quality = 0;

      if (hasFace) {
        // Capture face
        // Note: In real implementation, this would interface with camera
        // For now, we'll simulate
        faceEmbedding = `FACE_EMB_${Date.now()}`;
        liveness = this.policy.requireLiveness ? Math.random() * 0.3 + 0.7 : 1.0; // 0.7-1.0
        quality = Math.random() * 0.4 + 0.6; // 0.6-1.0
      }

      if (hasFingerprint && this.policy.requireBoth) {
        // Capture fingerprint
        fingerprintTemplate = `FP_TEMPLATE_${Date.now()}`;
      }

      if (!faceEmbedding && !fingerprintTemplate) {
        return {
          success: false,
          error: 'No biometric data captured',
        };
      }

      return {
        success: true,
        faceEmbedding,
        fingerprintTemplate,
        liveness,
        quality,
      };
    } catch (error) {
      console.error('[CheckinFlowCoordinator] Capture error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Capture failed',
      };
    }
  }

  /**
   * Match biometrics against policy
   */
  private async matchBiometrics(
    capture: {
      faceEmbedding?: string;
      fingerprintTemplate?: string;
      livenessScore: number;
      qualityScore: number;
    },
    employeeId?: string
  ): Promise<BiometricMatchResult> {
    // Simulate matching logic
    // In real implementation, this would compare against enrolled embeddings
    
    let faceMatchScore: number | undefined;
    let fingerprintMatchScore: number | undefined;

    if (capture.faceEmbedding) {
      // Simulate face matching
      faceMatchScore = Math.random() * 0.3 + 0.7; // 0.7-1.0
    }

    if (capture.fingerprintTemplate) {
      // Simulate fingerprint matching
      fingerprintMatchScore = Math.random() * 0.3 + 0.7; // 0.7-1.0
    }

    // Apply policy rules
    const facePass = faceMatchScore
      ? faceMatchScore >= this.policy.faceMatchThreshold &&
        capture.livenessScore >= this.policy.livenessMin &&
        capture.qualityScore >= this.policy.faceQualityMin
      : false;

    const fingerprintPass = fingerprintMatchScore
      ? fingerprintMatchScore >= this.policy.fingerprintThreshold
      : false;

    let decision: 'PASS' | 'FAIL' | 'PARTIAL';
    let reason: string | undefined;

    if (this.policy.requireBoth) {
      decision = facePass && fingerprintPass ? 'PASS' : 'FAIL';
      reason = !facePass ? 'Face match failed' : !fingerprintPass ? 'Fingerprint match failed' : undefined;
    } else {
      decision = facePass || fingerprintPass ? 'PASS' : 'FAIL';
      if (!facePass && !fingerprintPass) {
        reason = 'Both biometric matches failed';
      }
    }

    // Check for spoof
    if (capture.livenessScore < this.policy.livenessMin) {
      decision = 'FAIL';
      reason = 'Liveness check failed - possible spoof';
    }

    return {
      faceMatchScore,
      fingerprintMatchScore,
      livenessScore: capture.livenessScore,
      qualityScore: capture.qualityScore,
      decision,
      reason,
      confidence: Math.min(faceMatchScore || 0, capture.livenessScore, capture.qualityScore),
    };
  }

  /**
   * Build TOON event from capture and match results
   */
  private async buildToonEvent(params: {
    eventId: string;
    eventType: AttendanceEventType;
    employeeId?: string;
    captureResult: CaptureResult;
    matchResult: BiometricMatchResult;
    location?: { latitude: number; longitude: number };
  }): Promise<AttendanceToonEvent> {
    const { eventId, eventType, employeeId, captureResult, matchResult, location } = params;

    // Determine event status
    let status: EventStatus;
    let rejectionReason: RejectionReason | undefined;

    if (matchResult.decision === 'PASS') {
      status = 'ACCEPTED';
    } else if (matchResult.decision === 'PARTIAL' && this.policy.allowManualReview) {
      status = 'PENDING';
    } else {
      status = 'REJECTED';
      rejectionReason = this.determineRejectionReason(matchResult);
    }

    const toonEvent: AttendanceToonEvent = {
      A1: eventId,
      A2: eventType,
      A3: new Date().toISOString(),
      D1: await this.getDeviceId(),
      S1: status,
    };

    // Add employee ID
    if (employeeId) {
      toonEvent.E1 = employeeId;
    } else {
      toonEvent.E0 = true; // Unknown employee
    }

    // Add location
    if (location) {
      toonEvent.L1 = `${location.latitude};${location.longitude}`;
    }

    // Add face tokens
    if (captureResult.faceEmbedding) {
      toonEvent.F2 = captureResult.faceEmbedding;
      toonEvent.F3 = matchResult.faceMatchScore;
      toonEvent.F4 = matchResult.qualityScore;
      toonEvent.F5 = JSON.stringify({
        liveness: matchResult.livenessScore,
        confidence: matchResult.confidence,
      });
    }

    // Add fingerprint tokens
    if (captureResult.fingerprintTemplate) {
      toonEvent.FP1 = captureResult.fingerprintTemplate;
      toonEvent.FP2 = matchResult.fingerprintMatchScore;
    }

    // Add rejection reason
    if (rejectionReason) {
      toonEvent.R1 = rejectionReason;
    }

    // Add consent token (from storage)
    toonEvent.C1 = 'CONSENT_TOKEN_PLACEHOLDER';

    // Sign event if policy requires
    if (this.policy.signEvents) {
      toonEvent.SIG1 = `SIG_${eventId}_${Date.now()}`;
      toonEvent.D3 = 'PUBLIC_KEY_FINGERPRINT_PLACEHOLDER';
    }

    return toonEvent;
  }

  /**
   * Determine rejection reason from match result
   */
  private determineRejectionReason(matchResult: BiometricMatchResult): RejectionReason {
    if (matchResult.livenessScore && matchResult.livenessScore < this.policy.livenessMin) {
      return 'spoof_detected';
    }
    if (matchResult.qualityScore && matchResult.qualityScore < this.policy.faceQualityMin) {
      return 'low_quality';
    }
    if (matchResult.faceMatchScore && matchResult.faceMatchScore < this.policy.faceMatchThreshold) {
      return 'match_failed';
    }
    return 'no_match';
  }

  /**
   * Get device location
   */
  private async getLocation(): Promise<{ latitude: number; longitude: number } | undefined> {
    if (!this.policy.requireLocation) {
      return undefined;
    }

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log('[CheckinFlowCoordinator] Location permission denied');
        return undefined;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('[CheckinFlowCoordinator] Location error:', error);
      return undefined;
    }
  }

  /**
   * Get device ID
   */
  private async getDeviceId(): Promise<string> {
    // In real implementation, get from device storage or generate
    return 'MOBILE_DEVICE_001';
  }

  /**
   * Sync single event to server
   */
  private async syncEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        return { success: false, error: 'No network connection' };
      }

      const event = await this.eventQueue.getEvent(eventId);
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      // Send via ToonService
      const response = await toonService.sendToonEvent('/api/devices/events', event.raw_toon);

      // Parse response
      if (response.S1 === 'ok' || response.S1 === 'ACCEPTED') {
        await this.eventQueue.markSent(eventId, JSON.stringify(response));
        return { success: true };
      } else if (response.S1 === 'duplicate') {
        await this.eventQueue.markDuplicate(eventId);
        return { success: true }; // Treat duplicate as success
      } else {
        await this.eventQueue.markFailed(eventId, response.ERR1 || 'Unknown error', this.policy.retryBackoffMs);
        return { success: false, error: response.ERR1 };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Network error';
      await this.eventQueue.markFailed(eventId, errorMsg, this.policy.retryBackoffMs);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * Reconcile all pending events (background sync)
   */
  async reconcilePendingEvents(): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();
      if (!netInfo.isConnected) {
        console.log('[CheckinFlowCoordinator] Offline, skipping reconciliation');
        return;
      }

      const readyEvents = await this.eventQueue.getEventsReadyForRetry();
      const queuedEvents = await this.eventQueue.getQueuedEvents();
      const allPending = [...readyEvents, ...queuedEvents].filter(e => e.status !== 'sent');

      // Limit to prevent rate limiting
      const toSync = allPending.slice(0, 10);

      console.log(`[CheckinFlowCoordinator] Reconciling ${toSync.length} events`);

      for (const event of toSync) {
        if (event.attempts >= this.policy.maxRetryAttempts) {
          console.log(`[CheckinFlowCoordinator] Max attempts reached for ${event.eventId}, skipping`);
          continue;
        }

        await this.syncEvent(event.eventId);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      console.log('[CheckinFlowCoordinator] Reconciliation complete');
    } catch (error) {
      console.error('[CheckinFlowCoordinator] Reconciliation error:', error);
    }
  }

  /**
   * Start background sync (every 5 minutes)
   */
  private startBackgroundSync(): void {
    if (this.syncInterval) return;

    this.syncInterval = setInterval(() => {
      this.reconcilePendingEvents();
    }, 5 * 60 * 1000); // 5 minutes

    console.log('[CheckinFlowCoordinator] Background sync started');
  }

  /**
   * Stop background sync
   */
  stopBackgroundSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('[CheckinFlowCoordinator] Background sync stopped');
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    return await this.eventQueue.getStats();
  }

  /**
   * Manual resend of event
   */
  async resendEvent(eventId: string): Promise<{ success: boolean; error?: string }> {
    return await this.syncEvent(eventId);
  }

  /**
   * Delete event from queue
   */
  async deleteEvent(eventId: string): Promise<void> {
    await this.eventQueue.deleteEvent(eventId);
  }

  /**
   * Get all events (for UI)
   */
  async getAllEvents() {
    return await this.eventQueue.getAllEvents();
  }
}

export default CheckinFlowCoordinator.getInstance();
