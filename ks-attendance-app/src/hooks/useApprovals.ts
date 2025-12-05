/**
 * useApprovals - Attendance Approvals Hook
 * 
 * Manages pending attendance exceptions and approval workflows.
 * All operations use TOON tokens.
 * 
 * TOON Endpoints:
 * - GET /api/approvals/pending
 * - POST /api/approvals/:id/decision
 * 
 * Query Tokens (pending):
 * - T1: From date (optional)
 * - T2: To date (optional)
 * - E1: Employee filter (optional)
 * - S1: Status filter (PENDING/APPROVED/REJECTED)
 * 
 * Response Tokens (pending list):
 * - COUNT: Number of pending items
 * - APR_<idx>_A1: Approval ID
 * - APR_<idx>_E1: Employee ID
 * - APR_<idx>_NAME: Employee name
 * - APR_<idx>_A2: Event type
 * - APR_<idx>_A3: Event timestamp
 * - APR_<idx>_F3: Match score
 * - APR_<idx>_L1: Liveness score
 * - APR_<idx>_R1: Exception reason
 * - APR_<idx>_S1: Current state
 * - APR_<idx>_D1: Device ID
 * 
 * Decision Payload Tokens:
 * - A1: Approval ID
 * - E1: Employee ID
 * - S1: Decision (APPROVED/REJECTED)
 * - R2: Manager reason/comment
 * - MGR_ID: Manager employee ID
 * - SIG1: Signature token
 * - TS: Decision timestamp
 */

import { useState, useCallback, useEffect } from 'react';
import { ToonClient } from '../services/api/ToonClient';
import { decodeFromToonPayload, encodeToToonPayload } from '../utils/toon';

export interface PendingApproval {
  approvalId: string;
  employeeId: string;
  employeeName: string;
  eventType: string;
  eventTimestamp: string;
  matchScore: number | null;
  livenessScore: number | null;
  reason: string;
  state: 'PENDING' | 'APPROVED' | 'REJECTED';
  deviceId: string | null;
}

export type ApprovalDecision = 'APPROVED' | 'REJECTED' | 'REQUEST_EVIDENCE';

export interface ApprovalFilters {
  fromDate?: string;
  toDate?: string;
  employeeId?: string;
  status?: string;
}

export const useApprovals = () => {
  const [approvals, setApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const toonClient = new ToonClient();

  /**
   * Parse TOON response into approval list
   */
  const parseApprovalsResponse = useCallback((toonData: Record<string, string>): PendingApproval[] => {
    const count = parseInt(toonData.COUNT || '0', 10);
    const approvalList: PendingApproval[] = [];

    for (let i = 0; i < count; i++) {
      approvalList.push({
        approvalId: toonData[`APR_${i}_A1`] || '',
        employeeId: toonData[`APR_${i}_E1`] || '',
        employeeName: toonData[`APR_${i}_NAME`] || 'Unknown',
        eventType: toonData[`APR_${i}_A2`] || '',
        eventTimestamp: toonData[`APR_${i}_A3`] || '',
        matchScore: toonData[`APR_${i}_F3`] ? parseFloat(toonData[`APR_${i}_F3`]) : null,
        livenessScore: toonData[`APR_${i}_L1`] ? parseFloat(toonData[`APR_${i}_L1`]) : null,
        reason: toonData[`APR_${i}_R1`] || 'No reason provided',
        state: (toonData[`APR_${i}_S1`] || 'PENDING') as PendingApproval['state'],
        deviceId: toonData[`APR_${i}_D1`] || null,
      });
    }

    return approvalList;
  }, []);

  /**
   * Fetch pending approvals
   */
  const fetchPendingApprovals = useCallback(async (filters?: ApprovalFilters) => {
    setLoading(true);
    setError(null);

    try {
      // Build query params
      const queryParams: Record<string, string> = {};
      if (filters?.fromDate) queryParams.T1 = filters.fromDate;
      if (filters?.toDate) queryParams.T2 = filters.toDate;
      if (filters?.employeeId) queryParams.E1 = filters.employeeId;
      if (filters?.status) queryParams.S1 = filters.status;

      const toonQuery = encodeToToonPayload(queryParams);
      
      // Fetch from backend
      const toonResponse = await toonClient.toonGet(
        `/api/approvals/pending${Object.keys(queryParams).length ? `?toon=${toonQuery}` : ''}`
      );
      
      // Decode and parse
      const decoded = decodeFromToonPayload(toonResponse);
      const parsed = parseApprovalsResponse(decoded);
      
      setApprovals(parsed);
    } catch (err) {
      console.error('Failed to fetch pending approvals:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch approvals');
    } finally {
      setLoading(false);
    }
  }, [parseApprovalsResponse, toonClient]);

  /**
   * Submit approval decision
   */
  const submitDecision = useCallback(
    async (
      approvalId: string,
      employeeId: string,
      decision: ApprovalDecision,
      reason: string,
      managerId: string
    ): Promise<boolean> => {
      setSubmitting(true);
      setError(null);

      try {
        // Build decision payload
        const payload: Record<string, string> = {
          A1: approvalId,
          E1: employeeId,
          S1: decision,
          R2: reason,
          MGR_ID: managerId,
          TS: new Date().toISOString(),
          SIG1: `MGR_${managerId}_${Date.now()}`, // Simplified signature
        };

        const toonPayload = encodeToToonPayload(payload);
        
        // Submit decision
        await toonClient.toonPost(`/api/approvals/${approvalId}/decision`, toonPayload);
        
        // Remove from local list if decision is final
        if (decision === 'APPROVED' || decision === 'REJECTED') {
          setApprovals((prev) => prev.filter((a) => a.approvalId !== approvalId));
        }

        return true;
      } catch (err) {
        console.error('Failed to submit approval decision:', err);
        setError(err instanceof Error ? err.message : 'Failed to submit decision');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [toonClient]
  );

  /**
   * Approve an attendance exception
   */
  const approve = useCallback(
    (approvalId: string, employeeId: string, reason: string, managerId: string) => {
      return submitDecision(approvalId, employeeId, 'APPROVED', reason, managerId);
    },
    [submitDecision]
  );

  /**
   * Reject an attendance exception
   */
  const reject = useCallback(
    (approvalId: string, employeeId: string, reason: string, managerId: string) => {
      return submitDecision(approvalId, employeeId, 'REJECTED', reason, managerId);
    },
    [submitDecision]
  );

  /**
   * Request evidence review
   */
  const requestEvidenceReview = useCallback(
    (approvalId: string, employeeId: string, reason: string, managerId: string) => {
      return submitDecision(approvalId, employeeId, 'REQUEST_EVIDENCE', reason, managerId);
    },
    [submitDecision]
  );

  /**
   * Get approval by ID
   */
  const getApprovalById = useCallback(
    (approvalId: string): PendingApproval | null => {
      return approvals.find((a) => a.approvalId === approvalId) || null;
    },
    [approvals]
  );

  /**
   * Get approvals count by status
   */
  const getCountByStatus = useCallback(
    (status: PendingApproval['state']): number => {
      return approvals.filter((a) => a.state === status).length;
    },
    [approvals]
  );

  // Auto-load pending approvals on mount
  useEffect(() => {
    fetchPendingApprovals({ status: 'PENDING' });
  }, []);

  return {
    approvals,
    loading,
    error,
    submitting,
    fetchPendingApprovals,
    approve,
    reject,
    requestEvidenceReview,
    getApprovalById,
    getCountByStatus,
  };
};
