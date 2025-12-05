/**
 * PendingApprovals - Pending Approvals Screen
 * 
 * Shows attendance exceptions pending manager approval
 */

import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useApprovals } from '../../hooks/useApprovals';
import { PendingApprovalCard } from '../../components/manager';
import { useAuth } from '../../context/AuthContext';

interface PendingApprovalsProps {
  navigation: any;
}

export const PendingApprovals: React.FC<PendingApprovalsProps> = ({ navigation }) => {
  const { approvals, loading, error, approve, reject, requestEvidenceReview, fetchPendingApprovals } =
    useApprovals();
  const { user } = useAuth();

  const managerId = user?.id || 'MGR_UNKNOWN';

  const handleApprove = async (approvalId: string, reason: string) => {
    const approval = approvals.find((a) => a.approvalId === approvalId);
    if (approval) {
      await approve(approvalId, approval.employeeId, reason, managerId);
    }
  };

  const handleReject = async (approvalId: string, reason: string) => {
    const approval = approvals.find((a) => a.approvalId === approvalId);
    if (approval) {
      await reject(approvalId, approval.employeeId, reason, managerId);
    }
  };

  const handleRequestEvidence = async (approvalId: string, reason: string) => {
    const approval = approvals.find((a) => a.approvalId === approvalId);
    if (approval) {
      await requestEvidenceReview(approvalId, approval.employeeId, reason, managerId);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pending Approvals</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Count Badge */}
      {approvals.length > 0 && (
        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {approvals.length} approval{approvals.length !== 1 ? 's' : ''} pending
          </Text>
        </View>
      )}

      {/* Approvals List */}
      {loading && approvals.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1976D2" />
          <Text style={styles.loadingText}>Loading approvals...</Text>
        </View>
      ) : error && approvals.length === 0 ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>❌ {error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchPendingApprovals({ status: 'PENDING' })}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => fetchPendingApprovals({ status: 'PENDING' })}
            />
          }
        >
          {approvals.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyText}>No pending approvals at the moment.</Text>
            </View>
          ) : (
            approvals.map((approval) => (
              <PendingApprovalCard
                key={approval.approvalId}
                approval={approval}
                onApprove={handleApprove}
                onReject={handleReject}
                onRequestEvidence={handleRequestEvidence}
              />
            ))
          )}
          <View style={styles.listFooter} />
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    fontSize: 16,
    color: '#1976D2',
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  placeholder: {
    width: 60,
  },
  countBadge: {
    backgroundColor: '#FFF3E0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  countText: {
    color: '#F57C00',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listFooter: {
    height: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 16,
  },
  errorText: {
    fontSize: 15,
    color: '#D32F2F',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#1976D2',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
  },
  emptyText: {
    fontSize: 15,
    color: '#757575',
    textAlign: 'center',
  },
});
