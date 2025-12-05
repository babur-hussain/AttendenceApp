/**
 * CheckinScreen - Main check-in/check-out screen with biometric capture
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import CheckinFlowCoordinator from '../services/CheckinFlowCoordinator';
import type { AttendanceEventType, CheckinFlowState } from '../types/checkin';

type Props = {
  navigation: any;
};

export function CheckinScreen({ navigation }: Props) {
  const [flowState, setFlowState] = useState<CheckinFlowState>('idle');
  const [eventType, setEventType] = useState<AttendanceEventType>('IN');
  const [matchScore, setMatchScore] = useState<number>(0);
  const [liveness, setLiveness] = useState<number>(0);

  useEffect(() => {
    const coordinator = CheckinFlowCoordinator;
    
    // Subscribe to flow updates
    const unsubscribe = coordinator.subscribe((event) => {
      console.log('[CheckinScreen] Event:', event);
      
      if (event.type === 'result') {
        navigation.navigate('CheckinResult', {
          eventId: event.eventId,
          status: event.status,
          reason: event.reason,
        });
      } else if (event.type === 'queued') {
        navigation.navigate('CheckinResult', {
          eventId: event.eventId,
          status: 'QUEUED',
          reason: 'Saved offline, will sync when connected',
        });
      } else if (event.type === 'error') {
        Alert.alert('Error', event.reason || 'Check-in failed');
        setFlowState('idle');
      }
    });

    return unsubscribe;
  }, [navigation]);

  const handleCheckin = async (type: AttendanceEventType) => {
    setEventType(type);
    setFlowState('capturing');

    const coordinator = CheckinFlowCoordinator;
    
    try {
      // Simulate progress updates
      setTimeout(() => setFlowState('processing'), 1000);
      setTimeout(() => setFlowState('awaiting_match'), 2000);
      setTimeout(() => {
        setMatchScore(0.92);
        setLiveness(0.88);
      }, 2500);
      setTimeout(() => setFlowState('confirm'), 3000);

      const result = await coordinator.startCheckin(type, 'EMP_001');
      
      if (!result.success) {
        Alert.alert('Check-in Failed', result.reason || 'Unknown error');
        setFlowState('idle');
      }
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Unknown error');
      setFlowState('idle');
    }
  };

  const getStateMessage = () => {
    switch (flowState) {
      case 'capturing':
        return 'Position your face in the camera...';
      case 'processing':
        return 'Processing biometric data...';
      case 'awaiting_match':
        return 'Matching against enrolled data...';
      case 'confirm':
        return 'Match confirmed! Sending...';
      case 'sending':
        return 'Sending to server...';
      case 'sent':
        return 'Success!';
      case 'queued':
        return 'Queued for sync';
      case 'error':
        return 'Error occurred';
      default:
        return 'Ready to check in';
    }
  };

  const isProcessing = flowState !== 'idle' && flowState !== 'error';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance Check-in</Text>
      
      {/* State Indicator */}
      <View style={styles.statusCard}>
        <Text style={styles.statusText}>{getStateMessage()}</Text>
        {isProcessing && <ActivityIndicator size="large" color="#007AFF" style={styles.spinner} />}
      </View>

      {/* Camera Preview Area (Simulated) */}
      <View style={styles.cameraPreview}>
        <View style={styles.faceOutline} />
        <Text style={styles.cameraText}>Camera Preview</Text>
        {flowState === 'capturing' && (
          <Text style={styles.livenessPrompt}>Please blink your eyes</Text>
        )}
      </View>

      {/* Match Scores (shown after processing) */}
      {(flowState === 'awaiting_match' || flowState === 'confirm') && (
        <View style={styles.scoresCard}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Match Score:</Text>
            <Text style={styles.scoreValue}>{(matchScore * 100).toFixed(0)}%</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Liveness:</Text>
            <Text style={styles.scoreValue}>{(liveness * 100).toFixed(0)}%</Text>
          </View>
          <View style={[styles.scoreBar, { width: `${matchScore * 100}%` }]} />
        </View>
      )}

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.checkInButton, isProcessing && styles.buttonDisabled]}
          onPress={() => handleCheckin('IN')}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Check In</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.checkOutButton, isProcessing && styles.buttonDisabled]}
          onPress={() => handleCheckin('OUT')}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Check Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.breakButton, isProcessing && styles.buttonDisabled]}
          onPress={() => handleCheckin('BREAK_START')}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>Start Break</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.breakButton, isProcessing && styles.buttonDisabled]}
          onPress={() => handleCheckin('BREAK_END')}
          disabled={isProcessing}
        >
          <Text style={styles.buttonText}>End Break</Text>
        </TouchableOpacity>
      </View>

      {/* Queue Status */}
      <TouchableOpacity
        style={styles.queueButton}
        onPress={() => navigation.navigate('OfflineQueue')}
      >
        <Text style={styles.queueButtonText}>View Offline Queue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F5F5F5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: '#333',
  },
  spinner: {
    marginTop: 10,
  },
  cameraPreview: {
    height: 300,
    backgroundColor: '#000',
    borderRadius: 8,
    marginBottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  faceOutline: {
    width: 200,
    height: 250,
    borderWidth: 2,
    borderColor: '#00FF00',
    borderRadius: 100,
  },
  cameraText: {
    color: 'white',
    marginTop: 10,
  },
  livenessPrompt: {
    position: 'absolute',
    bottom: 20,
    color: 'yellow',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoresCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 14,
    color: '#666',
  },
  scoreValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  scoreBar: {
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
    marginTop: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  checkInButton: {
    backgroundColor: '#34C759',
  },
  checkOutButton: {
    backgroundColor: '#FF3B30',
  },
  breakButton: {
    backgroundColor: '#FF9500',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  queueButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    marginTop: 8,
  },
  queueButtonText: {
    color: 'white',
    fontSize: 14,
  },
});
