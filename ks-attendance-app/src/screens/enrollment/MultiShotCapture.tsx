import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import type { FaceFeature } from 'expo-face-detector';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useEnrollment } from '../../hooks/useEnrollment';
import {
  FaceFrame,
  QualityAssessment,
  buildMetadataFromDetection,
} from '../../biometric/FacePipeline';
import { EmbeddingQualityMeter } from '../../components/enrollment/EmbeddingQualityMeter';
import {
  faceDetector,
  faceDetectorAvailable,
  faceDetectorLoadError,
} from '../../utils/faceDetector';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAMERA_SIZE = SCREEN_WIDTH - 48;
const REQUIRED_FACE_SAMPLES = 30; // Collect 30 face samples instead of 5 photos
const MIN_QUALITY_SAMPLES = 20;
const MIN_QUALITY = 65;
const SAMPLE_INTERVAL = 300; // Collect samples every 300ms
const REGISTRATION_DURATION = 10000; // 10 seconds total registration time
const DETECTION_POLL_INTERVAL = 350;

const detectorModule = faceDetector;
const DETECTOR_OPTIONS = detectorModule
  ? {
      mode: detectorModule.FaceDetectorMode.accurate,
      detectLandmarks: detectorModule.FaceDetectorLandmarks.none,
      runClassifications: detectorModule.FaceDetectorClassifications.none,
      tracking: true,
      minDetectionInterval: 150,
    }
  : null;

const POSE_GUIDES = [
  { id: 1, name: 'Front', icon: '😊', instruction: 'Look straight at the camera', duration: 3000 },
  { id: 2, name: 'Left', icon: '😏', instruction: 'Slowly turn left', duration: 2000 },
  { id: 3, name: 'Right', icon: '😌', instruction: 'Slowly turn right', duration: 2000 },
  { id: 4, name: 'Up', icon: '😇', instruction: 'Slowly tilt up', duration: 1500 },
  { id: 5, name: 'Down', icon: '🙂', instruction: 'Slowly tilt down', duration: 1500 },
];

type PoseGuide = typeof POSE_GUIDES[number];
type FaceStatus = 'searching' | 'locked' | 'unstable' | 'multiple';

type DetectionSummary = {
  yawAngle?: number;
  rollAngle?: number;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

export const MultiShotCapture: React.FC = () => {
  const { captureShot, completeCapture } = useEnrollment();
  const detectorReady = Boolean(detectorModule && faceDetectorAvailable && DETECTOR_OPTIONS);
  const cameraFacing: CameraType = 'front';

  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastQuality, setLastQuality] = useState<QualityAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [faceStatus, setFaceStatus] = useState<FaceStatus>('searching');
  const [poseSatisfied, setPoseSatisfied] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [registrationProgress, setRegistrationProgress] = useState(0);
  const [faceMovementGuidance, setFaceMovementGuidance] = useState('');
  const [samplesCollected, setSamplesCollected] = useState(0);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStartTime, setRegistrationStartTime] = useState<number | null>(null);
  const [faceSamples, setFaceSamples] = useState<any[]>([]);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const isProcessingRef = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cameraRef = useRef<CameraView | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const lastSampleTimestampRef = useRef(0);
  const detectionLoopRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (detectionLoopRef.current) {
        clearInterval(detectionLoopRef.current);
        detectionLoopRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  // Analyze face movement and provide guidance
  const analyzeFaceMovement = useCallback((face: FaceFeature): string => {
    const yaw = face.yawAngle ?? 0;
    const roll = face.rollAngle ?? 0;
    const currentGuide = POSE_GUIDES[currentPoseIndex];

    switch (currentGuide.name) {
      case 'Front':
        if (Math.abs(yaw) > 8) return `Turn ${yaw > 0 ? 'left' : 'right'} less`;
        if (Math.abs(roll) > 6) return 'Straighten your head';
        return '✓ Perfect position';
      
      case 'Left':
        if (yaw > -12) return 'Turn more to the left';
        if (yaw < -32) return 'Turn back slightly';
        if (Math.abs(roll) > 10) return 'Keep head level';
        return '✓ Perfect position';
      
      case 'Right':
        if (yaw < 12) return 'Turn more to the right';
        if (yaw > 32) return 'Turn back slightly';
        if (Math.abs(roll) > 10) return 'Keep head level';
        return '✓ Perfect position';
      
      case 'Up':
        if (roll > 15) return 'Lower your chin';
        if (roll < 5) return 'Lift your chin more';
        return '✓ Perfect position';
      
      case 'Natural':
        if (Math.abs(yaw) > 15) return `Turn ${yaw > 0 ? 'left' : 'right'} less`;
        if (Math.abs(roll) > 10) return 'Keep head level';
        return '✓ Relax and smile';
      
      default:
        return 'Position your face in frame';
    }
  }, [currentPoseIndex]);

  const getPoseIndexForElapsed = useCallback((elapsed: number) => {
    if (elapsed <= 0) return 0;
    let accumulated = 0;
    for (let i = 0; i < POSE_GUIDES.length; i++) {
      accumulated += POSE_GUIDES[i].duration;
      if (elapsed < accumulated) {
        return i;
      }
    }
    return POSE_GUIDES.length - 1;
  }, []);

  const recordSample = useCallback(async (
    face: FaceFeature,
    guide: PoseGuide,
  ) => {
    if (isProcessingRef.current) {
      console.log('⏭️ Skipping sample - already processing');
      return; // Skip if already processing
    }
    
    console.log('🎬 Starting sample capture for pose:', guide.name);
    isProcessingRef.current = true;
    setIsProcessing(true);
    
    try {
      const metadata = buildMetadataFromDetection({
        detection: summarizeFace(face),
        frame: {
          width: CAMERA_SIZE,
          height: CAMERA_SIZE,
        },
        exif: undefined,
        faceCount: 1,
      });

      const frame: FaceFrame = {
        imageUri: `live-face://${Date.now()}`,
        width: CAMERA_SIZE,
        height: CAMERA_SIZE,
        timestamp: Date.now(),
        metadata,
      };

      console.log('📤 Calling captureShot...');
      const result = await captureShot(frame, frame.imageUri);
      console.log('📥 captureShot result:', { success: result.success, error: result.error });
      
      if (!result.success) {
        console.warn('⚠️ Sample capture failed:', result.error);
        return; // Don't throw, just skip this sample
      }

      setLastQuality(result.quality || null);
      setFaceSamples(prev => [
        ...prev,
        {
          pose: guide.name,
          yaw: face.yawAngle,
          roll: face.rollAngle,
          timestamp: Date.now(),
          score: result.quality?.score ?? 0,
        },
      ]);

      setSamplesCollected(prev => {
        const next = Math.min(REQUIRED_FACE_SAMPLES, prev + 1);
        console.log(`✅ Sample ${next}/${REQUIRED_FACE_SAMPLES} collected successfully`);
        if (next >= REQUIRED_FACE_SAMPLES) {
          setIsRegistering(false);
          setRegistrationProgress(100);
        }
        return next;
      });
    } catch (sampleError) {
      console.error('❌ Sample recording error:', sampleError);
      setError(sampleError instanceof Error ? sampleError.message : 'Unable to record sample');
    } finally {
      // Always reset processing flag
      console.log('🏁 Resetting processing flag');
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  }, [captureShot]);

  const processFaceObservation = useCallback((face: FaceFeature) => {
    const now = Date.now();

    if (!registrationStartTime) {
      setRegistrationStartTime(now);
      setIsRegistering(true);
      setFaceDetected(true);
      console.log('👤 Live face detected – starting Face ID enrollment');
    } else if (!faceDetected) {
      setFaceDetected(true);
    }

    const elapsed = registrationStartTime ? now - registrationStartTime : 0;
    const poseIndex = getPoseIndexForElapsed(elapsed);
    if (poseIndex !== currentPoseIndex) {
      setCurrentPoseIndex(poseIndex);
    }
    const currentGuide = POSE_GUIDES[poseIndex];

    setFaceMovementGuidance(analyzeFaceMovement(face));
    const ready = evaluatePoseForGuide(face, currentGuide);
    setPoseSatisfied(ready);
    setFaceStatus(ready ? 'locked' : 'unstable');

    const timeProgress = Math.min(100, (elapsed / REGISTRATION_DURATION) * 100);
    const sampleProgress = (samplesCollected / REQUIRED_FACE_SAMPLES) * 100;
    setRegistrationProgress(Math.max(timeProgress, sampleProgress));

    if (!ready || samplesCollected >= REQUIRED_FACE_SAMPLES) {
      return;
    }

    if (now - lastSampleTimestampRef.current < SAMPLE_INTERVAL) {
      return;
    }

    if (isProcessingRef.current) {
      return;
    }

    lastSampleTimestampRef.current = now;
    void recordSample(face, currentGuide);
  }, [analyzeFaceMovement, currentPoseIndex, faceDetected, getPoseIndexForElapsed, recordSample, registrationStartTime, samplesCollected]);

  useEffect(() => {
    if (!permission?.granted || !cameraRef.current || !detectorReady || !detectorModule || !DETECTOR_OPTIONS) {
      return;
    }

    const runDetection = async () => {
      if (!cameraRef.current || isProcessingRef.current || samplesCollected >= REQUIRED_FACE_SAMPLES) {
        return;
      }

      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.35,
          base64: false,
          skipProcessing: true,
        });

        if (!photo || !photo.uri) {
          console.warn('⚠️ Photo capture returned null/invalid');
          return;
        }

        const detection = await detectorModule.detectFacesAsync(photo.uri, DETECTOR_OPTIONS);

        if (detection.faces.length === 1) {
          processFaceObservation(detection.faces[0]);
        } else if (detection.faces.length > 1) {
          setFaceStatus('multiple');
          setFaceDetected(false);
          setPoseSatisfied(false);
          setFaceMovementGuidance('Only one face should be in view');
        } else {
          setFaceStatus('searching');
          setFaceDetected(false);
          setPoseSatisfied(false);
          setFaceMovementGuidance('Position your face in frame');
        }

        try {
          const FileSystem = await import('expo-file-system');
          await FileSystem.default.deleteAsync(photo.uri, { idempotent: true });
        } catch (cleanupError) {
          console.warn('Face detection cleanup warning:', cleanupError);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          !message.includes('Camera is already capturing') &&
          !message.includes('Camera is busy') &&
          !message.includes('Camera unmounted')
        ) {
          console.error('Face detection loop error:', error);
        }
      }
    };

    runDetection();
    detectionLoopRef.current = setInterval(runDetection, DETECTION_POLL_INTERVAL);

    return () => {
      if (detectionLoopRef.current) {
        clearInterval(detectionLoopRef.current);
        detectionLoopRef.current = null;
      }
    };
  }, [DETECTOR_OPTIONS, detectorReady, permission?.granted, processFaceObservation, samplesCollected]);


  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [currentPoseIndex, fadeAnim]);

  const handleComplete = async () => {
    const result = await completeCapture();
    if (!result.success) {
      setError(result.error || 'Unable to finalize capture');
    }
  };

  const canProceed = useMemo(() => {
    const qualitySamples = faceSamples.filter(sample => sample.pose !== 'center');
    return samplesCollected >= MIN_QUALITY_SAMPLES && qualitySamples.length >= MIN_QUALITY_SAMPLES;
  }, [samplesCollected, faceSamples]);

  const currentPose = POSE_GUIDES[currentPoseIndex];
  const progress = (samplesCollected / REQUIRED_FACE_SAMPLES) * 100;
  const qualityShots = faceSamples.filter(sample => sample.pose !== 'center').length;
  const poseMessage = useMemo(() => {
    switch (faceStatus) {
      case 'locked':
        return 'Perfect – scanning face...';
      case 'multiple':
        return 'Only one face allowed in frame';
      case 'unstable':
        return currentPose.instruction;
      default:
        return currentPose.instruction;
    }
  }, [faceStatus, currentPose]);

  useEffect(() => {
    setFaceStatus('searching');
    setPoseSatisfied(false);
  }, [currentPoseIndex]);

  if (!detectorReady) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>⚠️</Text>
        <Text style={styles.permissionTitle}>Face detection unavailable</Text>
        <Text style={styles.permissionText}>
          {faceDetectorLoadError?.message ||
            'Install a development build that bundles expo-face-detector to continue enrollment.'}
        </Text>
      </View>
    );
  }

  if (!permission) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.permissionText}>Requesting camera permission…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Camera access needed</Text>
        <Text style={styles.permissionText}>
          Allow camera usage to capture secure multi-angle enrollment shots.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Face Registration</Text>
          <Text style={styles.subtitle}>
            {samplesCollected} / {REQUIRED_FACE_SAMPLES} samples • {qualityShots} quality poses
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: progress >= 100 ? '#34c759' : '#007AFF',
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.cameraPreview}
            facing={cameraFacing}
            enableTorch={torchEnabled}
            flash="off"
          />

          <View style={styles.overlay}>
            <View style={[styles.faceGuide, poseSatisfied && styles.faceGuideReady]} />
            
            {/* Face movement guidance and registration progress */}
            {faceDetected && (
              <View style={styles.registrationOverlay}>
                <View style={styles.registrationProgressBar}>
                  <Animated.View
                    style={[
                      styles.registrationProgressFill,
                      {
                        width: `${registrationProgress}%`,
                        backgroundColor: registrationProgress >= 90 ? '#34c759' : '#FF9500',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.registrationPercentage}>
                  {Math.round(registrationProgress)}%
                </Text>
              </View>
            )}
            
            {/* Live face movement guidance */}
            {faceDetected && faceMovementGuidance && (
              <View style={styles.movementGuidance}>
                <Text style={styles.movementGuidanceText}>
                  {faceMovementGuidance}
                </Text>
              </View>
            )}
            
            {samplesCollected < REQUIRED_FACE_SAMPLES && !faceDetected && (
              <Animated.View style={[styles.poseGuidance, { opacity: fadeAnim }]}
              >
                <Text style={styles.poseIcon}>{currentPose.icon}</Text>
                <Text style={styles.poseInstruction}>{poseMessage}</Text>
              </Animated.View>
            )}
          </View>

          <View style={styles.cameraBadgeRow}>
            <View
              style={[
                styles.statusChip,
                faceStatus === 'locked' ? styles.statusChipReady : styles.statusChipWarn,
              ]}
            >
              <Text style={styles.statusChipText}>{poseMessage}</Text>
            </View>
            <TouchableOpacity
              style={[styles.torchButton, torchEnabled && styles.torchButtonActive]}
              onPress={() => setTorchEnabled((prev) => !prev)}
            >
              <Text
                style={[styles.torchButtonText, torchEnabled && styles.torchButtonTextActive]}
              >
                {torchEnabled ? 'Torch On' : 'Need Light?'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

      <Animated.View style={[styles.captureButtonContainer, { transform: [{ scale: pulseAnim }] }]}> 
        {samplesCollected < REQUIRED_FACE_SAMPLES ? (
          <View style={styles.registrationIndicator}>
            {isRegistering ? (
              <Text style={styles.registrationText}>🔄 Scanning face... {Math.round(progress)}%</Text>
            ) : (
              <Text style={styles.registrationText}>👤 Position your face in frame</Text>
            )}
          </View>
        ) : (
          <View style={styles.completeIndicator}>
            <Text style={styles.completeIndicatorText}>✓ All shots captured</Text>
          </View>
        )}
      </Animated.View>

      {lastQuality && (
        <View style={styles.qualitySection}>
          <EmbeddingQualityMeter quality={lastQuality} showDetails={false} />
        </View>
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Continuous scanning - no photo thumbnails shown */}
      {samplesCollected > 0 && (
        <View style={styles.samplesInfoContainer}>
          <Text style={styles.samplesInfoText}>
            🔒 Biometric data collected: {samplesCollected} samples
          </Text>
          <Text style={styles.samplesInfoSubtext}>
            No photos stored - Face ID style registration
          </Text>
        </View>
      )}

      <View style={styles.actions}>
        {canProceed ? (
          <TouchableOpacity style={styles.completeButton} onPress={handleComplete}>
            <Text style={styles.completeButtonText}>
              Complete Capture ({qualityShots} good shots)
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.guidanceText}>
            Collecting at least {MIN_QUALITY_SAMPLES} quality samples to continue
          </Text>
        )}
      </View>

      <View style={styles.tipsBox}>
        <Text style={styles.tipsTitle}>Tips for best results</Text>
        <Text style={styles.tip}>• Use even, indirect lighting</Text>
        <Text style={styles.tip}>• Keep the phone at eye level</Text>
        <Text style={styles.tip}>• Remove glasses if they reflect light</Text>
      </View>
      </ScrollView>
    </View>
  );
};

function evaluatePoseForGuide(face: FaceFeature, guide: PoseGuide): boolean {
  const yaw = face.yawAngle ?? 0;
  const roll = face.rollAngle ?? 0;
  const aspectRatio = face.bounds.size.height / face.bounds.size.width;

  switch (guide.name) {
    case 'Front':
      return Math.abs(yaw) <= 8 && Math.abs(roll) <= 6;
    case 'Left':
      return yaw <= -12 && yaw >= -32;
    case 'Right':
      return yaw >= 12 && yaw <= 32;
    case 'Up':
      return aspectRatio <= 1.05 && Math.abs(yaw) <= 10;
    case 'Natural':
      return Math.abs(yaw) <= 15 && Math.abs(roll) <= 10;
    default:
      return true;
  }
}

function summarizeFace(face: FaceFeature): DetectionSummary {
  return {
    yawAngle: face.yawAngle,
    rollAngle: face.rollAngle,
    bounds: {
      x: face.bounds.origin.x,
      y: face.bounds.origin.y,
      width: face.bounds.size.width,
      height: face.bounds.size.height,
    },
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  permissionContainer: {
    flex: 1,
    padding: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  permissionIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  permissionText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 18,
  },
  permissionButton: {
    height: 48,
    paddingHorizontal: 32,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  progressBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  cameraContainer: {
    marginHorizontal: 24,
    marginTop: 24,
    height: CAMERA_SIZE * 1.2,
    borderRadius: 28,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cameraPreview: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceGuide: {
    width: CAMERA_SIZE * 0.65,
    height: CAMERA_SIZE * 0.9,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 180,
  },
  faceGuideReady: {
    borderColor: '#34c759',
  },
  poseGuidance: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  poseIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  poseInstruction: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    textAlign: 'center',
  },
  cameraBadgeRow: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusChipReady: {
    backgroundColor: 'rgba(52,199,89,0.9)',
  },
  statusChipWarn: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  statusChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  torchButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  torchButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: '#fff',
  },
  torchButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  torchButtonTextActive: {
    color: '#fff',
  },
  registrationOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  registrationProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  registrationProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  registrationPercentage: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  movementGuidance: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  movementGuidanceText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  captureButtonContainer: {
    alignItems: 'center',
    marginVertical: 22,
  },
  autoCaptureIndicator: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#E0F2FE',
    borderWidth: 2,
    borderColor: '#0284C7',
    alignItems: 'center',
  },
  autoCaptureText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0284C7',
  },
  completeIndicator: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
  },
  completeIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#22C55E',
  },
  captureButton: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007AFF',
  },
  qualitySection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  errorContainer: {
    marginHorizontal: 24,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
  },
  thumbnailsContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  thumbnail: {
    width: 96,
    height: 132,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#111',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailQualityBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  thumbnailQualityBadgeGood: {
    backgroundColor: '#34c759DD',
  },
  thumbnailQualityBadgeWarn: {
    backgroundColor: '#FF9500DD',
  },
  thumbnailQualityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  thumbnailRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailRemoveText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  completeButton: {
    height: 52,
    backgroundColor: '#34c759',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  guidanceText: {
    fontSize: 13,
    color: '#FF9500',
    textAlign: 'center',
    fontWeight: '600',
  },
  tipsBox: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0369A1',
    marginBottom: 8,
  },
  tip: {
    fontSize: 12,
    color: '#0369A1',
    marginBottom: 4,
  },
  registrationIndicator: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  registrationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center',
  },
  samplesInfoContainer: {
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(52, 199, 89, 0.3)',
  },
  samplesInfoText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34C759',
    textAlign: 'center',
    marginBottom: 4,
  },
  samplesInfoSubtext: {
    fontSize: 12,
    color: '#34C759',
    textAlign: 'center',
    opacity: 0.8,
  },
});
