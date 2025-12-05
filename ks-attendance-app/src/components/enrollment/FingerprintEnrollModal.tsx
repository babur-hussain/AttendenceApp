/**
 * FingerprintEnrollModal
 * Optional fingerprint enrollment modal
 * Adapts to available fingerprint hardware/SDK
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';

interface FingerprintEnrollModalProps {
  visible: boolean;
  onComplete: (template: string) => void;
  onSkip: () => void;
  onCancel: () => void;
}

export const FingerprintEnrollModal: React.FC<FingerprintEnrollModalProps> = ({
  visible,
  onComplete,
  onSkip,
  onCancel,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [quality, setQuality] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Start fingerprint capture
   * 
   * INTEGRATION POINT:
   * - Use ExternalFingerprintAdapter.startCapture()
   * - Listen for quality updates and progress
   * - Handle capture completion
   * 
   * Example:
   * ```typescript
   * import { ExternalFingerprintAdapter } from '../../biometric/ExternalFingerprintAdapter';
   * 
   * const adapter = ExternalFingerprintAdapter.getInstance();
   * await adapter.startCapture({
   *   onProgress: (p) => setProgress(p),
   *   onQuality: (q) => setQuality(q),
   *   onComplete: (template) => {
   *     setIsScanning(false);
   *     onComplete(template);
   *   },
   *   onError: (err) => {
   *     setError(err);
   *     setIsScanning(false);
   *   },
   * });
   * ```
   */
  const handleStartScan = async () => {
    setIsScanning(true);
    setError(null);
    setProgress(0);
    setQuality(null);

    // TODO: Implement real fingerprint capture
    // For now, simulate capture
    simulateCapture();
  };

  /**
   * Simulate fingerprint capture (mock)
   */
  const simulateCapture = () => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 10;
      setProgress(currentProgress);
      setQuality(60 + currentProgress / 3); // Simulate quality improving

      if (currentProgress >= 100) {
        clearInterval(interval);
        setIsScanning(false);
        // Generate mock template (base64)
        const mockTemplate = btoa(`fingerprint_${Date.now()}`);
        onComplete(mockTemplate);
      }
    }, 300);
  };

  /**
   * Reset state
   */
  const handleReset = () => {
    setIsScanning(false);
    setProgress(0);
    setQuality(null);
    setError(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Fingerprint Enrollment</Text>
            <Text style={styles.subtitle}>
              {isScanning
                ? 'Place your finger on the sensor'
                : 'Optional: Add fingerprint for faster check-in'}
            </Text>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Fingerprint Icon */}
            <View style={styles.iconContainer}>
              <Text style={styles.fingerprintIcon}>🔐</Text>
              {isScanning && (
                <View style={styles.scanningIndicator}>
                  <ActivityIndicator size="large" color="#007AFF" />
                </View>
              )}
            </View>

            {/* Progress */}
            {isScanning && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress}%`,
                        backgroundColor: progress === 100 ? '#34c759' : '#007AFF',
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{progress}% Complete</Text>
              </View>
            )}

            {/* Quality Indicator */}
            {quality !== null && (
              <View style={styles.qualityContainer}>
                <Text style={styles.qualityLabel}>Scan Quality:</Text>
                <Text
                  style={[
                    styles.qualityValue,
                    {
                      color:
                        quality >= 80
                          ? '#34c759'
                          : quality >= 60
                          ? '#FF9500'
                          : '#ff3b30',
                    },
                  ]}
                >
                  {Math.round(quality)}%
                </Text>
              </View>
            )}

            {/* Error */}
            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Instructions */}
            {!isScanning && !error && (
              <View style={styles.instructions}>
                <Text style={styles.instructionText}>
                  • Place finger flat on sensor
                </Text>
                <Text style={styles.instructionText}>
                  • Hold steady until complete
                </Text>
                <Text style={styles.instructionText}>
                  • Multiple scans may be required
                </Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {!isScanning ? (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.skipButton]}
                  onPress={onSkip}
                >
                  <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.scanButton]}
                  onPress={handleStartScan}
                >
                  <Text style={styles.scanButtonText}>Start Scan</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={() => {
                  handleReset();
                  onCancel();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Info Footer */}
          <Text style={styles.infoText}>
            Fingerprint data is encrypted and stored securely
          </Text>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    minHeight: 400,
  },
  
  // Header
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Content
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  fingerprintIcon: {
    fontSize: 80,
    textAlign: 'center',
  },
  scanningIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Progress
  progressContainer: {
    width: '100%',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  
  // Quality
  qualityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  qualityLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  qualityValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Error
  errorContainer: {
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#ff3b30',
  },
  errorText: {
    fontSize: 13,
    color: '#ff3b30',
    textAlign: 'center',
  },
  
  // Instructions
  instructions: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  instructionText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  
  // Actions
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#f0f0f0',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  scanButton: {
    backgroundColor: '#007AFF',
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  cancelButton: {
    backgroundColor: '#ff3b30',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  
  // Info
  infoText: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center',
  },
});
