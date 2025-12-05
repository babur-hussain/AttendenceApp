/**
 * PendingApprovalCard - Pending Approval Card Component
 * 
 * Displays pending attendance exception with approve/reject actions
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { PendingApproval } from '../../hooks/useApprovals';

interface PendingApprovalCardProps {
  approval: PendingApproval;
  onApprove: (approvalId: string, reason: string) => Promise<void>;
  onReject: (approvalId: string, reason: string) => Promise<void>;
  onRequestEvidence: (approvalId: string, reason: string) => Promise<void>;
}

export const PendingApprovalCard: React.FC<PendingApprovalCardProps> = ({
  approval,
  onApprove,
  onReject,
  onRequestEvidence,
}) => {
  const [loading, setLoading] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getEventTypeLabel = (eventType: string): string => {
    const labels: Record<string, string> = {
      IN: 'Check-in',
      OUT: 'Check-out',
      BREAK_START: 'Break Start',
      BREAK_END: 'Break End',
    };
    return labels[eventType] || eventType;
  };

  const getScoreColor = (score: number | null): string => {
    if (score === null) return '#9E9E9E';
    if (score >= 0.85) return '#4CAF50';
    if (score >= 0.70) return '#FF9800';
    return '#F44336';
  };

  const handleAction = async (action: 'approve' | 'reject' | 'evidence') => {
    setLoading(true);
    try {
      const defaultReason = action === 'approve' ? 'Approved by manager' : 'Rejected by manager';
      
      if (action === 'approve') {
        await onApprove(approval.approvalId, defaultReason);
      } else if (action === 'reject') {
        await onReject(approval.approvalId, defaultReason);
      } else {
        await onRequestEvidence(approval.approvalId, 'Evidence review requested');
      }
    } finally {
      setLoading(false);
      setShowActions(false);
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={() => setShowActions(!showActions)} activeOpacity={0.9}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.initials}>
              {approval.employeeName
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{approval.employeeName}</Text>
            <Text style={styles.eventType}>{getEventTypeLabel(approval.eventType)}</Text>
            <Text style={styles.time}>{formatTime(approval.eventTimestamp)}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>PENDING</Text>
          </View>
        </View>

        <View style={styles.details}>
          {approval.matchScore !== null && (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Match:</Text>
              <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(approval.matchScore) }]}>
                <Text style={styles.scoreText}>{(approval.matchScore * 100).toFixed(0)}%</Text>
              </View>
            </View>
          )}

          {approval.livenessScore !== null && (
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>Liveness:</Text>
              <View style={[styles.scoreBadge, { backgroundColor: getScoreColor(approval.livenessScore) }]}>
                <Text style={styles.scoreText}>{(approval.livenessScore * 100).toFixed(0)}%</Text>
              </View>
            </View>
          )}

          <View style={styles.reasonRow}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText}>{approval.reason}</Text>
          </View>

          {approval.deviceId && (
            <Text style={styles.deviceText}>Device: {approval.deviceId}</Text>
          )}
        </View>
      </TouchableOpacity>

      {showActions && (
        <View style={styles.actions}>
          {loading ? (
            <ActivityIndicator color="#1976D2" />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => handleAction('approve')}
              >
                <Text style={styles.approveText}>✓ Approve</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.rejectButton]}
                onPress={() => handleAction('reject')}
              >
                <Text style={styles.rejectText}>✗ Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.evidenceButton]}
                onPress={() => handleAction('evidence')}
              >
                <Text style={styles.evidenceText}>🔍 Evidence</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFA000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  initials: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  eventType: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  badge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#F57C00',
    fontSize: 10,
    fontWeight: '700',
  },
  details: {
    gap: 8,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scoreLabel: {
    fontSize: 13,
    color: '#757575',
    width: 70,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  reasonRow: {
    marginTop: 4,
  },
  reasonLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 13,
    color: '#424242',
    fontStyle: 'italic',
  },
  deviceText: {
    fontSize: 11,
    color: '#9E9E9E',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#E8F5E9',
  },
  approveText: {
    color: '#2E7D32',
    fontWeight: '700',
    fontSize: 13,
  },
  rejectButton: {
    backgroundColor: '#FFEBEE',
  },
  rejectText: {
    color: '#C62828',
    fontWeight: '700',
    fontSize: 13,
  },
  evidenceButton: {
    backgroundColor: '#E3F2FD',
  },
  evidenceText: {
    color: '#1565C0',
    fontWeight: '700',
    fontSize: 13,
  },
});
