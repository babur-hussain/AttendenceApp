import React, { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, type PermissionResponse } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFaceEnrollment, type FaceEnrollmentPhase } from '../../hooks/useFaceEnrollment';

const DIAL_SIZE = 260;
const DIAL_STROKE = 16;
const HALF_SIZE = DIAL_SIZE / 2;

export function FaceIdCapture() {
  const {
    cameraRef,
    permission,
    requestPermission,
    onCameraReady,
    status,
    detectorReady,
    guidance,
    detail,
    movementHint,
    qualityGate,
    progress,
    coverage,
    samplesAccepted,
    targetSamples,
    livenessScore,
    error,
    torchEnabled,
    toggleTorch,
    start,
    stop,
    reset,
  } = useFaceEnrollment();

  const isFocused = useIsFocused();
  const orbit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(orbit, {
        toValue: 1,
        duration: 4600,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spin.start();
    return () => spin.stop();
  }, [orbit]);

  useEffect(() => {
    if (permission?.granted && detectorReady && isFocused) {
      start();
    } else {
      stop();
    }
    return () => stop();
  }, [detectorReady, isFocused, permission?.granted, start, stop]);

  const motionHint = movementHint || 'Awaiting movement signal…';
  const detailMessage = detail || 'Move slowly in a small circle.';

  if (permission && !permission.granted) {
    return <PermissionPrompt requestPermission={requestPermission} />;
  }

  if (!detectorReady || error) {
    return <UnavailableCard error={error} />;
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        zoom={0}
        isActive={status !== 'complete'}
        enableTorch={torchEnabled}
        onCameraReady={onCameraReady}
      />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.topCopy}>
          <Text style={styles.guidance}>{guidance}</Text>
          <Text style={styles.detail}>{detailMessage}</Text>
        </View>

        <CoverageDial
          progress={progress}
          samplesAccepted={samplesAccepted}
          targetSamples={targetSamples}
          orbit={orbit}
          status={status}
        />

        <View style={styles.hintBubble}>
          <Text style={styles.hintLabel}>Gesture</Text>
          <Text style={styles.hintText}>{motionHint}</Text>
        </View>

        <View style={styles.axisRow}>
          <AxisMeter label="Yaw" value={coverage.yaw} />
          <AxisMeter label="Pitch" value={coverage.pitch} />
          <AxisMeter label="Roll" value={coverage.roll} />
        </View>

        <LivenessMeter score={livenessScore} />

        <View style={styles.bottomCard}>
          <View style={styles.qualityBlock}>
            <Text style={styles.qualityLabel}>Quality Gate</Text>
            <Text style={styles.qualityValue}>{qualityGate}</Text>
          </View>
          <View style={styles.actions}>
            <Pressable
              style={[styles.controlButton, torchEnabled && styles.controlButtonActive]}
              onPress={toggleTorch}
            >
              <Text style={styles.controlButtonText}>{torchEnabled ? 'Torch On' : 'Torch Off'}</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={reset}>
              <Text style={styles.secondaryButtonText}>Restart</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {status === 'aggregating' && (
        <View style={styles.blocker}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.blockerText}>Securing enrollment…</Text>
        </View>
      )}
    </View>
  );
}

function CoverageDial({
  progress,
  samplesAccepted,
  targetSamples,
  orbit,
  status,
}: {
  progress: number;
  samplesAccepted: number;
  targetSamples: number;
  orbit: Animated.Value;
  status: FaceEnrollmentPhase;
}) {
  const dialProgress = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.spring(dialProgress, {
      toValue: progress,
      useNativeDriver: false,
      damping: 18,
      stiffness: 120,
      mass: 1.1,
    }).start();
  }, [progress, dialProgress]);

  const rightRotation = useMemo(
    () =>
      dialProgress.interpolate({
        inputRange: [0, 0.5],
        outputRange: ['0deg', '180deg'],
        extrapolate: 'clamp',
      }),
    [dialProgress]
  );

  const leftRotation = useMemo(
    () =>
      dialProgress.interpolate({
        inputRange: [0.5, 1],
        outputRange: ['0deg', '180deg'],
        extrapolate: 'clamp',
      }),
    [dialProgress]
  );

  const leftOpacity = useMemo(
    () =>
      dialProgress.interpolate({
        inputRange: [0, 0.5, 0.5001, 1],
        outputRange: [0, 0, 1, 1],
      }),
    [dialProgress]
  );

  const orbitRotation = useMemo(
    () =>
      orbit.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
      }),
    [orbit]
  );

  const percent = Math.round(progress * 100);
  const gateLabel = status === 'complete' ? 'Complete' : 'Coverage';

  return (
    <View style={styles.dialWrapper}>
      <View style={styles.dialTrack} />
      <View style={[styles.dialHalfMask, styles.dialHalfRight]}>
        <Animated.View
          style={[styles.dialProgressHalf, styles.dialHalfRightInner, { transform: [{ rotateZ: rightRotation }] }]}
        />
      </View>
      <Animated.View style={[styles.dialHalfMask, styles.dialHalfLeft, { opacity: leftOpacity }]}>
        <Animated.View
          style={[styles.dialProgressHalf, styles.dialHalfLeftInner, { transform: [{ rotateZ: leftRotation }] }]}
        />
      </Animated.View>
      <Animated.View style={[styles.pointerOrbit, { transform: [{ rotateZ: orbitRotation }] }]}>
        <View style={styles.pointerDot} />
      </Animated.View>
      <View style={styles.dialCenter}>
        <Text style={styles.dialPercent}>{percent}%</Text>
        <Text style={styles.dialSamples}>
          {samplesAccepted}/{targetSamples}
        </Text>
        <Text style={styles.dialSubtext}>{gateLabel}</Text>
      </View>
    </View>
  );
}

function AxisMeter({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  return (
    <View style={styles.axisMeter}>
      <View style={styles.axisHeader}>
        <Text style={styles.axisLabel}>{label}</Text>
        <Text style={styles.axisValue}>{pct}%</Text>
      </View>
      <View style={styles.axisTrack}>
        <View style={[styles.axisFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function LivenessMeter({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  return (
    <View style={styles.livenessCard}>
      <Text style={styles.livenessLabel}>Liveness</Text>
      <View style={styles.livenessRow}>
        <Text style={styles.livenessScore}>{pct}</Text>
        <View style={styles.livenessTrack}>
          <View style={[styles.livenessFill, { width: `${pct}%` }]} />
        </View>
      </View>
    </View>
  );
}

function PermissionPrompt({
  requestPermission,
}: {
  requestPermission: () => Promise<PermissionResponse>;
}) {
  return (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionTitle}>Camera access required</Text>
      <Text style={styles.permissionBody}>
        Enable camera permissions to continue continuous Face ID enrollment.
      </Text>
      <Pressable style={styles.primaryButton} onPress={requestPermission}>
        <Text style={styles.primaryButtonText}>Grant Access</Text>
      </Pressable>
    </View>
  );
}

function UnavailableCard({ error }: { error: string | null }) {
  return (
    <View style={styles.permissionContainer}>
      <Text style={styles.permissionTitle}>Face detector unavailable</Text>
      <Text style={styles.permissionBody}>
        {error || 'Install the expo-face-detector dev client build to enable Face ID capture.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050505',
  },
  overlay: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  topCopy: {
    marginTop: 16,
    gap: 6,
  },
  guidance: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  detail: {
    fontSize: 15,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.8)',
  },
  dialWrapper: {
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialTrack: {
    position: 'absolute',
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    borderWidth: DIAL_STROKE,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  dialHalfMask: {
    position: 'absolute',
    width: HALF_SIZE,
    height: DIAL_SIZE,
    overflow: 'hidden',
  },
  dialHalfRight: {
    right: 0,
  },
  dialHalfLeft: {
    left: 0,
  },
  dialProgressHalf: {
    position: 'absolute',
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    borderRadius: DIAL_SIZE / 2,
    borderWidth: DIAL_STROKE,
    borderColor: '#22D3EE',
  },
  dialHalfRightInner: {
    left: -HALF_SIZE,
  },
  dialHalfLeftInner: {
    left: 0,
  },
  pointerOrbit: {
    position: 'absolute',
    width: DIAL_SIZE,
    height: DIAL_SIZE,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  pointerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    marginTop: 4,
  },
  dialCenter: {
    alignItems: 'center',
    gap: 2,
  },
  dialPercent: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dialSamples: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
  },
  dialSubtext: {
    fontSize: 14,
    letterSpacing: 1.2,
    color: 'rgba(255,255,255,0.65)',
    textTransform: 'uppercase',
  },
  hintBubble: {
    backgroundColor: 'rgba(5,5,5,0.7)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 4,
  },
  hintLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.3,
    color: 'rgba(255,255,255,0.6)',
  },
  hintText: {
    fontSize: 16,
    color: '#FFFFFF',
  },
  axisRow: {
    flexDirection: 'row',
    gap: 12,
  },
  axisMeter: {
    flex: 1,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(5,5,5,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: 8,
  },
  axisHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  axisLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  axisValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
  axisTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  axisFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22D3EE',
  },
  livenessCard: {
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(5,5,5,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 12,
  },
  livenessLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  livenessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  livenessScore: {
    fontSize: 36,
    fontWeight: '600',
    color: '#4ADE80',
  },
  livenessTrack: {
    flex: 1,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  livenessFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ADE80',
  },
  bottomCard: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 16,
  },
  qualityBlock: {
    flex: 1,
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'rgba(5,5,5,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    gap: 6,
  },
  qualityLabel: {
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    fontSize: 12,
    letterSpacing: 1,
  },
  qualityValue: {
    color: '#FFFFFF',
    fontSize: 15,
  },
  actions: {
    gap: 10,
  },
  controlButton: {
    minWidth: 120,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
  },
  controlButtonActive: {
    backgroundColor: 'rgba(76,255,178,0.12)',
    borderColor: '#4ADE80',
  },
  controlButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  secondaryButton: {
    minWidth: 120,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  secondaryButtonText: {
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  permissionContainer: {
    flex: 1,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#050505',
    gap: 12,
  },
  permissionTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  permissionBody: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  primaryButton: {
    marginTop: 16,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#4ADE80',
  },
  primaryButtonText: {
    color: '#041301',
    fontWeight: '700',
  },
  blocker: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  blockerText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
