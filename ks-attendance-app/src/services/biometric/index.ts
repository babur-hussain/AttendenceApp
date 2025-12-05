/**
 * Biometric Services Barrel Export
 * Centralized export for all biometric adapters and manager
 */

export { MobileFaceAdapter } from './MobileFaceAdapter';
export { ExternalFaceDeviceAdapter } from './ExternalFaceDeviceAdapter';
export type { ExternalFaceDeviceConfig } from './ExternalFaceDeviceAdapter';
export { ExternalFingerprintAdapter } from './ExternalFingerprintAdapter';
export type { ExternalFingerprintDeviceConfig } from './ExternalFingerprintAdapter';
export { BiometricManager } from './BiometricManager';
export type { BiometricManagerConfig } from './BiometricManager';
export { FacePipeline } from './FacePipeline';
