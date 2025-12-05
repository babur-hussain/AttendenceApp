/**
 * CheckinCapture - Live Camera Capture with Gauges
 * NOTE: Simplified version - expo-camera types not available yet
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { AttendanceService, EventType } from '../../services/AttendanceService';
import { useNavigation } from '@react-navigation/native';

export const CheckinCapture: React.FC = () => {
  const [isCapturing, setIsCapturing] = useState(false);
  const navigation = useNavigation();

  const captureCheckIn = async (eventType: EventType) => {
    setIsCapturing(true);

    try {
      // TODO: Integrate expo-camera for real capture
      // For now: mock capture
      const mockEmbedding = new Float32Array(512).fill(0.5);
      const mockMatchScore = 0.92;
      const mockLiveness = 0.88;

      const service = AttendanceService.getInstance();
      const eventId = await service.recordCheckin({
        employeeId: 'EMP001', // TODO: Get from AuthContext
        eventType,
        embedding: mockEmbedding,
        deviceId: 'MOBILE_001',
        matchScore: mockMatchScore,
        livenessScore: mockLiveness,
        qualityScore: 0.85,
      });

      Alert.alert('Success', `Check-in recorded: ${eventId}`);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Capture failed');
    } finally {
      setIsCapturing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.camera}>
        <View style={styles.overlay}>
          <Text style={styles.title}>Mock Camera View</Text>
          <Text style={styles.subtitle}>TODO: Integrate expo-camera</Text>
          <View style={styles.gauges}>
            <Text style={styles.gaugeText}>Match: 92%</Text>
            <Text style={styles.gaugeText}>Liveness: 88%</Text>
          </View>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.btn} onPress={() => captureCheckIn('IN')} disabled={isCapturing}>
          <Text style={styles.btnText}>Check In</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btn} onPress={() => captureCheckIn('OUT')} disabled={isCapturing}>
          <Text style={styles.btnText}>Check Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, color: '#fff', fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#aaa', marginTop: 8 },
  gauges: { marginTop: 20 },
  gaugeText: { color: '#fff', fontSize: 16, marginVertical: 4 },
  controls: { flexDirection: 'row', padding: 20, backgroundColor: '#fff' },
  btn: { flex: 1, padding: 15, backgroundColor: '#007AFF', borderRadius: 8, marginHorizontal: 5 },
  btnText: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
