/**
 * RawToonViewer - Modal to display TOON tokens in readable format
 */

import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { decodeFromToonPayload } from '../../utils/toon';

interface RawToonViewerProps {
  visible: boolean;
  rawToon: string;
  onClose: () => void;
}

const TOKEN_LABELS: Record<string, string> = {
  E1: 'Employee ID', A1: 'Event ID', A2: 'Event Type', A3: 'Timestamp',
  D1: 'Device ID', L1: 'Location', F2: 'Face Embedding', F3: 'Match Score',
  FP1: 'Fingerprint', FP2: 'FP Score', S1: 'Status', S2: 'Liveness',
  S3: 'Quality', B1: 'Break Type', B2: 'Break Duration', B3: 'Over Break',
  C1: 'Consent', R1: 'Rejection', R2: 'Comment', SIG1: 'Signature',
};

export const RawToonViewer: React.FC<RawToonViewerProps> = ({ visible, rawToon, onClose }) => {
  const tokens = rawToon ? decodeFromToonPayload(rawToon) : {};

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Raw TOON Tokens</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.close}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {Object.entries(tokens).map(([key, value]) => (
              <View key={key} style={styles.row}>
                <Text style={styles.key}>{TOKEN_LABELS[key] || key}</Text>
                <Text style={styles.value} numberOfLines={2}>
                  {String(value)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  close: { fontSize: 24, color: '#666' },
  content: { padding: 20 },
  row: { marginBottom: 16 },
  key: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  value: { fontSize: 14, color: '#333', fontFamily: 'monospace' },
});
