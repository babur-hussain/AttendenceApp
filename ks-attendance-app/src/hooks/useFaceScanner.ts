import { useState, useEffect, useCallback, useRef } from 'react';
import * as ExpoCamera from 'expo-camera';
import { toonService } from '../services';

const NAME_BLOCKLIST = [/test/i, /dummy/i, /demo/i, /sample/i];
const EMAIL_BLOCKLIST = [/test@/i, /demo@/i, /example.com$/i];

function isLiveProfile(employee: any): boolean {
  const enrolled = Boolean(employee?.enrolled ?? employee?.hasFaceEnrolled);
  if (!enrolled) {
    return false;
  }
  const name = (employee?.name || '').trim();
  const email = (employee?.email || '').trim();
  if (!name) {
    return false;
  }
  const nameIsBlocked = NAME_BLOCKLIST.some(pattern => pattern.test(name));
  const emailIsBlocked = email ? EMAIL_BLOCKLIST.some(pattern => pattern.test(email)) : false;
  return !nameIsBlocked && !emailIsBlocked;
}

interface FaceMatch {
  employeeId: string;
  confidence: number;
  employeeName: string;
  employeePhoto?: string;
}

interface FaceScanResult {
  matched: boolean;
  match?: FaceMatch;
  livenessScore: number;
}

interface UseFaceScannerReturn {
  hasPermission: boolean | null;
  isScanning: boolean;
  scanResult: FaceScanResult | null;
  livenessScore: number;
  matchScore: number;
  startScanning: () => void;
  stopScanning: () => void;
  resetScan: () => void;
}

const cameraModule: any = ExpoCamera || {};
const requestCameraPermission =
  cameraModule?.Camera?.requestCameraPermissionsAsync ||
  cameraModule?.requestCameraPermissionsAsync;

export function useFaceScanner(): UseFaceScannerReturn {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<FaceScanResult | null>(null);
  const [livenessScore, setLivenessScore] = useState(0);
  const [matchScore, setMatchScore] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const matchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const statusResponse = await requestCameraPermission?.();
        setHasPermission(statusResponse ? statusResponse.status === 'granted' : null);
      } catch (error) {
        setHasPermission(false);
      }
    })();
  }, []);

  const clearTimers = useCallback(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    if (matchTimerRef.current) {
      clearTimeout(matchTimerRef.current);
      matchTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const startScanning = useCallback(() => {
    if (isScanning) {
      return;
    }

    clearTimers();
    setIsScanning(true);
    setScanResult(null);
    setLivenessScore(0);
    setMatchScore(0);

    // Simulate face detection and matching process
    // In real implementation, this would integrate with actual face recognition SDK
    progressTimerRef.current = setInterval(() => {
      // Simulate liveness detection score increasing
      setLivenessScore((prev) => Math.min(prev + Math.random() * 15, 100));
      setMatchScore((prev) => Math.min(prev + Math.random() * 20, 100));
    }, 100);

    // Simulate matching after 2 seconds
    matchTimerRef.current = setTimeout(async () => {
      clearTimers();

      try {
        const employees = await toonService.getEmployees();
        const liveEmployees = employees.filter(isLiveProfile);
        const matchedEmployee = liveEmployees.length
          ? liveEmployees[Math.floor(Math.random() * liveEmployees.length)]
          : null;
        const confidence = Math.round(85 + Math.random() * 12);
        const liveness = Math.round(90 + Math.random() * 8);

        if (!matchedEmployee) {
          setScanResult({ matched: false, livenessScore: liveness });
          setLivenessScore(liveness);
          setMatchScore(confidence);
          return;
        }

        const mockResult: FaceScanResult = {
          matched: true,
          match: {
            employeeId: matchedEmployee.id,
            confidence,
            employeeName: matchedEmployee.name,
            employeePhoto: (matchedEmployee as any)?.photoUrl,
          },
          livenessScore: liveness,
        };

        setScanResult(mockResult);
        setLivenessScore(mockResult.livenessScore);
        setMatchScore(mockResult.match?.confidence || 0);
      } catch (error) {
        setScanResult({
          matched: false,
          livenessScore: 0,
        });
        setMatchScore(0);
      } finally {
        setIsScanning(false);
      }
    }, 2000);
  }, [clearTimers, isScanning]);

  const stopScanning = useCallback(() => {
    clearTimers();
    setIsScanning(false);
  }, [clearTimers]);

  const resetScan = useCallback(() => {
    clearTimers();
    setScanResult(null);
    setLivenessScore(0);
    setMatchScore(0);
    setIsScanning(false);
  }, [clearTimers]);

  return {
    hasPermission,
    isScanning,
    scanResult,
    livenessScore,
    matchScore,
    startScanning,
    stopScanning,
    resetScan,
  };
}
