import { NativeModulesProxy } from 'expo-modules-core';

// Dynamically require expo-face-detector so the app can still boot even if the native
// module is missing (e.g., when running inside Expo Go).
type FaceDetectorModule = typeof import('expo-face-detector');

let faceDetectorModule: FaceDetectorModule | null = null;
let loadError: Error | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  faceDetectorModule = require('expo-face-detector');
} catch (err) {
  loadError = err instanceof Error ? err : new Error(String(err));
  console.warn('[FaceDetector] Native module unavailable:', loadError.message);
}

const hasNativeBinding = Boolean(
  NativeModulesProxy && (NativeModulesProxy as Record<string, unknown>).ExpoFaceDetector
);

export const faceDetector = faceDetectorModule;
export const faceDetectorAvailable = Boolean(faceDetectorModule && hasNativeBinding);
export const faceDetectorLoadError = loadError;
