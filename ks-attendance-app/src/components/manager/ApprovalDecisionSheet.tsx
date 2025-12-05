/**
 * ApprovalDecisionSheet - Approval Decision Bottom Sheet
 * 
 * Bottom sheet for approving/rejecting attendance with reason input
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

interface ApprovalDecisionSheetProps {
  visible: boolean;
  employeeName: string;
  eventType: string;
  onClose: () => void;
  onApprove: (reason: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

export const ApprovalDecisionSheet: React.FC<ApprovalDecisionSheetProps> = ({
  visible,
  employeeName,
  eventType,
  onClose,
  onApprove,
  onReject,
}) => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async () => {
    setLoading(true);
    try {
      await onApprove(reason || 'Approved by manager');
      setReason('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await onReject(reason || 'Rejected by manager');
      setReason('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.container}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheet}>
              <View style={styles.handle} />

              <Text style={styles.title}>Approval Decision</Text>
              <Text style={styles.subtitle}>
                {employeeName} • {eventType}
              </Text>

              <TextInput
                style={styles.input}
                placeholder="Enter reason (optional)"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton]}
                  onPress={handleReject}
                  disabled={loading}
                >
                  <Text style={styles.rejectText}>✗ Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.approveButton]}
                  onPress={handleApprove}
                  disabled={loading}
                >
                  <Text style={styles.approveText}>✓ Approve</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#212121',
    minHeight: 80,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  approveText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  rejectText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#757575',
    fontSize: 15,
    fontWeight: '600',
  },
});
