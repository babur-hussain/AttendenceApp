import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import type { FaceFeature } from 'expo-face-detector';
import {
  CameraView,
  useCameraPermissions,
  type CameraCapturedPicture,
  type PermissionResponse,
} from 'expo-camera';
import * as FileSystem from 'expo-file-system';

import { useEnrollment } from './useEnrollment';
import { buildMetadataFromDetection, type FaceFrame } from '../biometric/FacePipeline';
import { faceDetector, faceDetectorAvailable, faceDetectorLoadError } from '../utils/faceDetector';

const COVERAGE_CONFIG = {
  yaw: { min: -70, max: 70, step: 18 },
  pitch: { min: -35, max: 35, step: 14 },
  roll: { min: -35, max: 35, step: 14 },
} as const;

type AxisKey = keyof typeof COVERAGE_CONFIG;

type CoverageSets = Record<AxisKey, Set<number>>;

type FaceAngles = {
  yaw: number;
  pitch: number;
  roll: number;
};

type CoverageState = {
  yaw: number;
  pitch: number;
  roll: number;
  total: number;
};

type CoveragePreview = {
  changed: boolean;
  metrics: CoverageState;
  sets: CoverageSets;
};

type MotionSample = FaceAngles & { timestamp: number };

const COVERAGE_BUCKETS: Record<AxisKey, number> = {
  yaw: getBucketCount('yaw'),
  pitch: getBucketCount('pitch'),
  roll: getBucketCount('roll'),
};

const COVERAGE_COMPLETION_TARGET = 0.85;
const MIN_SAMPLE_INTERVAL_MS = 250;
const DETECTION_INTERVAL_MS = 160;
const QUALITY_THRESHOLDS = {
  lighting: 42,
  sharpness: 40,
  faceArea: 0.28,
};
const QUALITY_TOLERANCE = {
  lighting: 12,
  sharpness: 14,
  faceArea: 0.12,
};
const LIVENESS_THRESHOLDS = {
  minMotion: 0.8,
  maxMotion: 38,
  minInterval: 240,
};
const MAX_HISTORY = 14;
const TARGET_SAMPLE_COUNT = 8;
const DEFAULT_FRAME_SIZE = 720;
const RECOVERABLE_CAMERA_ERRORS = ['camera unmounted', 'image could not be captured', 'camera is not running'];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const detectorModule = faceDetector;

// Use numeric constants to avoid undefined enum bridging issues on iOS
const DETECTOR_OPTIONS = detectorModule
  ? {
      mode: 1, // accurate
      detectLandmarks: 1, // none
      runClassifications: 1, // none
    }
  : null;

export type FaceEnrollmentPhase = 'idle' | 'scanning' | 'collecting' | 'aggregating' | 'complete' | 'error';

interface UseFaceEnrollmentReturn {
  cameraRef: RefObject<CameraView | null>;
  permission: PermissionResponse | null;
  requestPermission: () => Promise<PermissionResponse>;
  onCameraReady: () => void;
  status: FaceEnrollmentPhase;
  detectorReady: boolean;
  guidance: string;
  detail: string;
  movementHint: string;
  qualityGate: string;
  progress: number;
  coverage: CoverageState;
  samplesAccepted: number;
  targetSamples: number;
  livenessScore: number;
  error: string | null;
  torchEnabled: boolean;
  toggleTorch: () => void;
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export function useFaceEnrollment(): UseFaceEnrollmentReturn {
  const { captureShot, completeCapture, state } = useEnrollment();
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraView | null>(null);
  const detectionLoopRef = useRef<NodeJS.Timeout | null>(null);
  const detectionActiveRef = useRef(false);
  const samplingBusyRef = useRef(false);
  const lastSampleTimestampRef = useRef(0);
  const coverageSetsRef = useRef<CoverageSets>({
    yaw: new Set(),
    pitch: new Set(),
    roll: new Set(),
  });
  const movementHistoryRef = useRef<MotionSample[]>([]);

  const [status, setStatus] = useState<FaceEnrollmentPhase>('idle');
  const [guidance, setGuidance] = useState('Center your face to begin');
  const [detail, setDetail] = useState('Move your head slowly in a circle until enrollment completes.');
  const [movementHint, setMovementHint] = useState('Begin slow circular movement.');
  const [qualityGate, setQualityGate] = useState('Calibrating sensors…');
  const [progress, setProgress] = useState(0);
  const [coverage, setCoverage] = useState<CoverageState>({ yaw: 0, pitch: 0, roll: 0, total: 0 });
  const [samplesAccepted, setSamplesAccepted] = useState(0);
  const [livenessScore, setLivenessScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const cameraReadyRef = useRef(false);

  const resumePreview = useCallback(async () => {
    const camera = cameraRef.current as (CameraView & { resumePreview?: () => Promise<void> }) | null;
    if (!camera || typeof camera.resumePreview !== 'function') {
      cameraReadyRef.current = true;
      return;
    }

    try {
      await camera.resumePreview();
    } catch (resumeError) {
      console.warn('[FaceEnrollment] resume preview failed:', resumeError);
    } finally {
      cameraReadyRef.current = true;
    }
  }, []);

  const detectorReady = useMemo(() => faceDetectorAvailable && Boolean(DETECTOR_OPTIONS), []);

  useEffect(() => {
    if (!permission) {
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const stop = useCallback(() => {
    if (detectionLoopRef.current) {
      clearTimeout(detectionLoopRef.current);
      detectionLoopRef.current = null;
    }
    detectionActiveRef.current = false;
    samplingBusyRef.current = false;
    cameraReadyRef.current = false;
  }, []);

  useEffect(() => {
    if (state.step !== 'capture') {
      stop();
    }
  }, [state.step, stop]);

  useEffect(() => () => stop(), [stop]);

  useEffect(() => {
    if (!detectorReady) {
      setError(
        faceDetectorLoadError?.message ||
          'Install a development build with expo-face-detector to enable Face ID enrollment.'
      );
    } else {
      setError(null);
    }
  }, [detectorReady]);

  const toggleTorch = useCallback(() => {
    setTorchEnabled(prev => !prev);
  }, []);

  const reset = useCallback(() => {
    stop();
    coverageSetsRef.current = {
      yaw: new Set(),
      pitch: new Set(),
      roll: new Set(),
    };
    movementHistoryRef.current = [];
    lastSampleTimestampRef.current = 0;
    cameraReadyRef.current = false;
    setStatus('idle');
    setGuidance('Center your face to begin');
    setDetail('Move your head slowly in a circle until enrollment completes.');
    setMovementHint('Begin slow circular movement.');
    setQualityGate('Calibrating sensors…');
    setProgress(0);
    setCoverage({ yaw: 0, pitch: 0, roll: 0, total: 0 });
    setSamplesAccepted(0);
    setLivenessScore(0);
    setError(detectorReady ? null : error);
  }, [detectorReady, error, stop]);

  const cleanupPhoto = useCallback(async (uri: string) => {
    try {
      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch (cleanupError) {
      console.warn('[FaceEnrollment] cleanup warning:', cleanupError);
    }
  }, []);

  const finalizeCapture = useCallback(async () => {
    setStatus('aggregating');
    stop();

    const result = await completeCapture();
    if (!result.success) {
      setError(result.error || 'Unable to finalize enrollment');
      setMovementHint('');
      setStatus('error');
      return;
    }

    setStatus('complete');
  }, [completeCapture, stop]);

  const previewCoverage = useCallback((angles: FaceAngles): CoveragePreview => {
    const nextSets: CoverageSets = {
      yaw: new Set(coverageSetsRef.current.yaw),
      pitch: new Set(coverageSetsRef.current.pitch),
      roll: new Set(coverageSetsRef.current.roll),
    };

    let changed = false;
    (Object.keys(COVERAGE_CONFIG) as AxisKey[]).forEach(axis => {
      const key = bucketize(angles[axis], axis);
      if (!nextSets[axis].has(key)) {
        nextSets[axis].add(key);
        changed = true;
      }
    });

    return {
      changed,
      metrics: computeCoverageMetrics(nextSets),
      sets: nextSets,
    };
  }, []);

  const handleSingleFace = useCallback(
    async (face: FaceFeature, photo: CameraCapturedPicture) => {
      const now = Date.now();
      if (now - lastSampleTimestampRef.current < MIN_SAMPLE_INTERVAL_MS) {
        return;
      }

      const metadata = buildMetadataFromDetection({
        detection: summarizeFace(face),
        frame: {
          width: photo.width ?? DEFAULT_FRAME_SIZE,
          height: photo.height ?? DEFAULT_FRAME_SIZE,
        },
        exif: photo.exif ?? undefined,
        faceCount: 1,
      });

      const frame: FaceFrame = {
        imageUri: photo.uri,
        width: photo.width ?? DEFAULT_FRAME_SIZE,
        height: photo.height ?? DEFAULT_FRAME_SIZE,
        timestamp: now,
        metadata: {
          ...metadata,
          faceDetected: true,
          faceCount: 1,
        },
      };

      const angles: FaceAngles = {
        yaw: metadata.angle?.yaw ?? face.yawAngle ?? 0,
        pitch: metadata.angle?.pitch ?? 0,
        roll: metadata.angle?.roll ?? face.rollAngle ?? 0,
      };

      const quality = evaluateQuality(metadata, frame.width, frame.height);
      setQualityGate(formatQualityLabel(quality));
      if (!quality.passes) {
        setGuidance(
          quality.nearPass ? 'Almost there – keep steady for a moment' : 'Adjust conditions for better quality'
        );
        setDetail(quality.detail);
        setMovementHint('');
        if (!quality.nearPass) {
          return;
        }
      }

      setDetail('Keep the orbit smooth until the dial closes.');

      const liveness = evaluateLiveness(angles, now, movementHistoryRef.current);
      setLivenessScore(liveness.score);
      setMovementHint(liveness.message);
      if (!liveness.passes) {
        setGuidance('We need natural micro-movements');
        return;
      }

      const coveragePreview = previewCoverage(angles);
      const coverageEnforcementThreshold = Math.max(2, Math.floor(TARGET_SAMPLE_COUNT / 2));
      const requiresNewCoverage = samplesAccepted >= coverageEnforcementThreshold;
      if (!coveragePreview.changed && requiresNewCoverage) {
        setGuidance('Point into the gray areas of the ring');
        setDetail('Tilt or rotate into uncovered directions to continue.');
        return;
      }

      lastSampleTimestampRef.current = now;
      setStatus('collecting');

      const result = await captureShot(frame, frame.imageUri);
      if (!result.success) {
        setDetail(result.error || 'Frame rejected - try again.');
        return;
      }

      movementHistoryRef.current = trimHistory([
        ...movementHistoryRef.current,
        { ...angles, timestamp: now },
      ]);

      coverageSetsRef.current = coveragePreview.sets;
      setCoverage(coveragePreview.metrics);
      const nextSamples = Math.min(samplesAccepted + 1, TARGET_SAMPLE_COUNT);
      const sampleRatio = nextSamples / TARGET_SAMPLE_COUNT;
      setProgress(Math.max(coveragePreview.metrics.total, sampleRatio));
      setSamplesAccepted(nextSamples);
      setGuidance(
        coveragePreview.metrics.total >= 0.9
          ? 'Almost done – tiny tilt circle'
          : 'Great! Keep rotating slowly'
      );
      setDetail('Keep the orbit smooth until the dial closes.');

      if (
        coveragePreview.metrics.total >= COVERAGE_COMPLETION_TARGET ||
        nextSamples >= TARGET_SAMPLE_COUNT
      ) {
        await finalizeCapture();
      } else {
        setStatus('scanning');
      }
    },
    [captureShot, finalizeCapture, previewCoverage, samplesAccepted]
  );

  const runDetection = useCallback(async () => {
    if (
      !permission?.granted ||
      !detectorReady ||
      !cameraRef.current ||
      !cameraReadyRef.current ||
      samplingBusyRef.current ||
      state.step !== 'capture' ||
      status === 'aggregating' ||
      status === 'complete'
    ) {
      return;
    }

    samplingBusyRef.current = true;
    try {
      cameraReadyRef.current = false;
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.45,
        skipProcessing: true,
        base64: false,
      });

      if (!photo || !photo.uri) {
        console.warn('[FaceEnrollment] Camera returned invalid photo payload');
        return;
      }

      if (!detectorModule || !DETECTOR_OPTIONS) {
        setGuidance('Face detector unavailable');
        setDetail('Install expo-face-detector development build.');
        return;
      }

      const detection = await detectorModule.detectFacesAsync(photo.uri, DETECTOR_OPTIONS);
      if (!detection) {
        setGuidance('Face detector unavailable');
        setDetail('Restart with expo-face-detector bundled.');
        await cleanupPhoto(photo.uri);
        return;
      }

      if (detection.faces.length === 1) {
        await handleSingleFace(detection.faces[0], photo);
      } else if (detection.faces.length > 1) {
        setGuidance('Only one face at a time');
        setDetail('Ask others to step out of frame.');
      } else {
        setGuidance('Center your face to begin');
        setDetail('Fill the circle and start rotating.');
      }

      await cleanupPhoto(photo.uri);
      await resumePreview();
      await delay(120);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();
      if (RECOVERABLE_CAMERA_ERRORS.some(token => lower.includes(token))) {
        cameraReadyRef.current = false;
        await delay(200);
      } else if (!lower.includes('already capturing')) {
        console.warn('[FaceEnrollment] detection error:', message);
      }
      await resumePreview();
    } finally {
      samplingBusyRef.current = false;
    }
  }, [cleanupPhoto, detectorReady, handleSingleFace, permission?.granted, resumePreview, state.step, status]);

  const scheduleNextDetection = useCallback(() => {
    if (!detectionActiveRef.current) {
      return;
    }

    detectionLoopRef.current = setTimeout(async () => {
      await runDetection();
      scheduleNextDetection();
    }, DETECTION_INTERVAL_MS);
  }, [runDetection]);

  const start = useCallback(() => {
    if (!permission?.granted || !detectorReady) {
      return;
    }

    if (detectionActiveRef.current) {
      return;
    }

    setStatus('scanning');
    detectionActiveRef.current = true;
    const initiateDetection = async () => {
      await runDetection();
      scheduleNextDetection();
    };
    void initiateDetection();
  }, [detectorReady, permission?.granted, runDetection, scheduleNextDetection]);

  const onCameraReady = useCallback(() => {
    cameraReadyRef.current = true;
    void resumePreview();
  }, [resumePreview]);

  return {
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
    targetSamples: TARGET_SAMPLE_COUNT,
    livenessScore,
    error,
    torchEnabled,
    toggleTorch,
    start,
    stop,
    reset,
  };
}

function bucketize(angle: number, axis: AxisKey): number {
  const config = COVERAGE_CONFIG[axis];
  const clamped = clamp(angle, config.min, config.max);
  const normalized = clamped - config.min;
  return Math.floor(normalized / config.step);
}

function getBucketCount(axis: AxisKey): number {
  const config = COVERAGE_CONFIG[axis];
  return Math.ceil((config.max - config.min) / config.step);
}

function computeCoverageMetrics(sets: CoverageSets): CoverageState {
  const yaw = clamp(sets.yaw.size / COVERAGE_BUCKETS.yaw, 0, 1);
  const pitch = clamp(sets.pitch.size / COVERAGE_BUCKETS.pitch, 0, 1);
  const roll = clamp(sets.roll.size / COVERAGE_BUCKETS.roll, 0, 1);
  return {
    yaw,
    pitch,
    roll,
    total: clamp((yaw + pitch + roll) / 3, 0, 1),
  };
}

function evaluateQuality(metadata: FaceFrame['metadata'], frameWidth: number, frameHeight: number) {
  const lighting = metadata.lighting ?? 0;
  const sharpness = metadata.blur ?? 0;
  const faceAreaRatio = metadata.faceBounds
    ? (metadata.faceBounds.width * metadata.faceBounds.height) / (frameWidth * frameHeight)
    : 0;
  const passesLighting = lighting >= QUALITY_THRESHOLDS.lighting;
  const passesSharpness = sharpness >= QUALITY_THRESHOLDS.sharpness;
  const passesArea = faceAreaRatio >= QUALITY_THRESHOLDS.faceArea;

  const nearLighting = lighting >= QUALITY_THRESHOLDS.lighting - QUALITY_TOLERANCE.lighting;
  const nearSharpness = sharpness >= QUALITY_THRESHOLDS.sharpness - QUALITY_TOLERANCE.sharpness;
  const nearArea = faceAreaRatio >= QUALITY_THRESHOLDS.faceArea - QUALITY_TOLERANCE.faceArea;
  const nearPass = nearLighting && nearSharpness && nearArea;

  let detail = 'Lighting, distance, and focus look good!';
  if (!passesLighting) detail = 'Add more light (avoid backlight).';
  else if (!passesSharpness) detail = 'Hold steady to reduce blur.';
  else if (!passesArea) detail = 'Move closer so your face fills the frame.';

  return {
    passes: passesLighting && passesSharpness && passesArea,
    nearPass,
    detail,
    metrics: { lighting, sharpness, faceAreaRatio },
  };
}

function formatQualityLabel(quality: ReturnType<typeof evaluateQuality>): string {
  const lighting = Math.round(quality.metrics.lighting ?? 0);
  const sharpness = Math.round(quality.metrics.sharpness ?? 0);
  const fill = Math.round((quality.metrics.faceAreaRatio ?? 0) * 100);
  return `Lighting ${lighting} • Sharpness ${sharpness} • Fill ${fill}%`;
}

function evaluateLiveness(angles: FaceAngles, now: number, history: MotionSample[]) {
  const last = history[history.length - 1];
  if (!last) {
    return {
      passes: true,
      score: 0.5,
      message: 'Slow, steady orbit detected.',
      sample: { ...angles, timestamp: now },
    };
  }

  const deltaYaw = Math.abs(angles.yaw - last.yaw);
  const deltaPitch = Math.abs(angles.pitch - last.pitch);
  const deltaRoll = Math.abs(angles.roll - last.roll);
  const movementMagnitude = Math.sqrt(deltaYaw ** 2 + deltaPitch ** 2 + deltaRoll ** 2);
  const interval = now - last.timestamp;

  const motionOk =
    movementMagnitude >= LIVENESS_THRESHOLDS.minMotion &&
    movementMagnitude <= LIVENESS_THRESHOLDS.maxMotion;
  const intervalOk = interval >= LIVENESS_THRESHOLDS.minInterval;

  const score = clamp(
    (movementMagnitude / LIVENESS_THRESHOLDS.maxMotion) * 0.65 +
      Math.min(interval / 1200, 1) * 0.35,
    0,
    1
  );

  let message = 'Great! Keep rotating smoothly.';
  if (!motionOk && movementMagnitude < LIVENESS_THRESHOLDS.minMotion) {
    message = 'Add gentle movement to prove liveness.';
  } else if (!motionOk) {
    message = 'Slow down – fast swings reduce accuracy.';
  } else if (!intervalOk) {
    message = 'Hold for a beat between movements.';
  }

  return {
    passes: motionOk && intervalOk,
    score,
    message,
    sample: { ...angles, timestamp: now },
  };
}

function trimHistory(history: MotionSample[]): MotionSample[] {
  if (history.length <= MAX_HISTORY) {
    return history;
  }
  return history.slice(history.length - MAX_HISTORY);
}

function summarizeFace(face: FaceFeature) {
  return {
    yawAngle: face.yawAngle,
    pitchAngle: face.pitchAngle,
    rollAngle: face.rollAngle,
    bounds: {
      x: face.bounds.origin.x,
      y: face.bounds.origin.y,
      width: face.bounds.size.width,
      height: face.bounds.size.height,
    },
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}
