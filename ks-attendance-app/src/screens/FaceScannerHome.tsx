/**
 * FaceScannerHome
 * Default employee-facing experience after company login
 */

import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import * as ExpoCamera from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useFaceScanner, useAdminSession } from '../hooks';
import type { RootStackParamList } from '../navigation/RootNavigator';

const { width, height } = Dimensions.get('window');
const CameraComponent = ((ExpoCamera as any).CameraView || (ExpoCamera as any).Camera || null) as React.ComponentType<any> | null;
const FACE_LOCK_THRESHOLD = 35;
const MIN_CONFIDENCE_FOR_NAV = 92;
const MIN_LIVENESS_FOR_NAV = 80;

type Navigation = StackNavigationProp<RootStackParamList, 'FaceScannerHome'>;

export default function FaceScannerHome() {
  const navigation = useNavigation<Navigation>();
  const isFocused = useIsFocused();
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const hasNavigatedRef = useRef(false);
  const { hasCompanySession, companySession } = useAdminSession();

  const {
    hasPermission,
    isScanning,
    scanResult,
    matchScore,
    livenessScore,
    startScanning,
    stopScanning,
    resetScan,
  } = useFaceScanner();

  useEffect(() => {
    if (!hasCompanySession) {
      navigation.reset({ index: 0, routes: [{ name: 'CompanyLogin' }] });
    }
  }, [hasCompanySession, navigation]);

  const handleManagementLogin = () => navigation.navigate('PinLogin');

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnimation, {
          toValue: 8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: -8,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shakeAnimation, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shakeAnimation]);

  useEffect(() => {
    if (isFocused) {
      hasNavigatedRef.current = false;
      resetScan();
      return;
    }
    stopScanning();
  }, [isFocused, resetScan, stopScanning]);

  useEffect(() => {
    if (!isFocused || hasPermission !== true || isScanning || scanResult) {
      return;
    }
    const timer = setTimeout(() => startScanning(), 450);
    return () => clearTimeout(timer);
  }, [hasPermission, isScanning, scanResult, startScanning, isFocused]);

  if (!hasCompanySession) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Waiting for company login...</Text>
      </View>
    );
  }

  const companyName = companySession?.companyName ?? 'Face Scanner';

  const isFaceDetected = useMemo(
    () => isScanning && (livenessScore >= FACE_LOCK_THRESHOLD || matchScore >= FACE_LOCK_THRESHOLD),
    [isScanning, livenessScore, matchScore]
  );

  const safeMatch = useMemo(() => {
    if (!scanResult?.matched || !scanResult.match?.employeeId) {
      return false;
    }
    const confidence = scanResult.match.confidence ?? matchScore;
    return confidence >= MIN_CONFIDENCE_FOR_NAV && scanResult.livenessScore >= MIN_LIVENESS_FOR_NAV;
  }, [scanResult, matchScore]);

  const isNoMatch = useMemo(() => {
    if (!scanResult) {
      return false;
    }
    if (!scanResult.matched || !scanResult.match?.employeeId) {
      return true;
    }
    const confidence = scanResult.match.confidence ?? matchScore;
    return confidence < MIN_CONFIDENCE_FOR_NAV || scanResult.livenessScore < MIN_LIVENESS_FOR_NAV;
  }, [scanResult, matchScore]);

  useEffect(() => {
    if (!isFocused || !isNoMatch || hasPermission !== true) {
      return;
    }

    const retryTimer = setTimeout(() => {
      resetScan();
      startScanning();
    }, 1800);

    return () => clearTimeout(retryTimer);
  }, [hasPermission, isFocused, isNoMatch, resetScan, startScanning]);

  const statusMessage = useMemo(() => {
    if (safeMatch) {
      return 'Match confirmed';
    }
    if (isNoMatch) {
      return 'No match — keep steady';
    }
    if (isFaceDetected) {
      return 'Face detected — hold still';
    }
    if (isScanning) {
      return 'Scanning...';
    }
    return 'Align your face in the frame';
  }, [safeMatch, isNoMatch, isFaceDetected, isScanning]);

  const frameColor = useMemo(() => {
    if (safeMatch) {
      return '#22C55E';
    }
    if (isNoMatch) {
      return '#F87171';
    }
    if (isFaceDetected) {
      return '#22C55E';
    }
    return '#0EA5E9';
  }, [safeMatch, isNoMatch, isFaceDetected]);

  useEffect(() => {
    if (!safeMatch || !scanResult?.match?.employeeId) {
      return;
    }

    if (!hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      navigation.navigate('EmployeeProfile', {
        employeeId: scanResult.match.employeeId,
      });
    }
  }, [safeMatch, scanResult, navigation]);

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }] }>
        <Text style={styles.permissionText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: '#000' }] }>
        <Text style={styles.permissionText}>Camera permission denied</Text>
        <Text style={styles.permissionSubtext}>Enable camera access in system settings</Text>
      </View>
    );
  }

  if (!CameraComponent) {
    return (
      <View style={[styles.container, { backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.permissionText}>Camera module unavailable</Text>
        <Text style={styles.permissionSubtext}>Check expo-camera installation</Text>
      </View>
    );
  }

  const ActiveCamera = CameraComponent as React.ComponentType<any>;

  return (
    <View style={styles.container}>
      <View style={styles.cameraWrapper}>
        <ActiveCamera style={styles.camera} facing="front" />
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'transparent', 'rgba(0,0,0,0.95)']}
          style={styles.gradientOverlay}
        >
          <View style={styles.topSection}>
            <Text style={styles.companyName}>{companyName}</Text>
            <Text style={styles.title}>Face Recognition Attendance</Text>
            <Text style={styles.subtitle}>{statusMessage}</Text>
          </View>

          <Animated.View
            style={[styles.faceFrame, { transform: [{ translateX: shakeAnimation }] }]}
          >
            <View style={[styles.frameCorner, { borderColor: frameColor }]} />
            <View style={[styles.frameCorner, styles.frameCornerTopRight, { borderColor: frameColor }]} />
            <View style={[styles.frameCorner, styles.frameCornerBottomLeft, { borderColor: frameColor }]} />
            <View style={[styles.frameCorner, styles.frameCornerBottomRight, { borderColor: frameColor }]} />
          </Animated.View>

          {(isScanning || scanResult) && (
            <View style={styles.statusSection}>
              <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Liveness</Text>
                <Text style={styles.statusValue}>{Math.round(livenessScore)}%</Text>
              </View>
              <View style={styles.statusCard}>
                <Text style={styles.statusLabel}>Match</Text>
                <Text style={styles.statusValue}>{Math.round(matchScore)}%</Text>
              </View>
            </View>
          )}

          {scanResult && (
            <View style={styles.matchBanner}>
              <Text style={[styles.matchStatus, safeMatch ? styles.matchSuccess : styles.matchFail]}>
                {safeMatch ? 'Match Found' : 'No Match'}
              </Text>
              {safeMatch && scanResult.match && (
                <Text style={styles.matchName}>{scanResult.match.employeeName}</Text>
              )}
              {!safeMatch && (
                <Text style={styles.matchName}>Keep your face centered to retry</Text>
              )}
            </View>
          )}

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.managementButton}
              onPress={handleManagementLogin}
            >
              <Text style={styles.managementButtonText}>Management Login</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  cameraWrapper: { flex: 1 },
  camera: { ...StyleSheet.absoluteFillObject },
  gradientOverlay: { ...StyleSheet.absoluteFillObject },
  topSection: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  companyName: {
    fontSize: 14,
    color: '#CBD5F5',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#fff',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    marginTop: 4,
  },
  faceFrame: {
    position: 'absolute',
    top: height * 0.25,
    left: width * 0.15,
    width: width * 0.7,
    height: width * 0.9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 48,
    height: 48,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#0EA5E9',
    borderRadius: 6,
  },
  frameCornerTopRight: {
    left: undefined,
    right: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
  },
  frameCornerBottomLeft: {
    top: undefined,
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
  },
  frameCornerBottomRight: {
    left: undefined,
    right: 0,
    top: undefined,
    bottom: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  statusSection: {
    position: 'absolute',
    bottom: 140,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  statusCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#38BDF8',
  },
  matchBanner: {
    position: 'absolute',
    bottom: 220,
    left: 24,
    right: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  matchStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  matchSuccess: {
    color: '#4ADE80',
  },
  matchFail: {
    color: '#F87171',
  },
  matchName: {
    color: '#E2E8F0',
    marginTop: 6,
    fontSize: 18,
    fontWeight: '700',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  managementButton: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)',
  },
  managementButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    letterSpacing: 0.5,
  },
  permissionText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#E2E8F0',
    textAlign: 'center',
    marginBottom: 8,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#E2E8F0',
  },
});
