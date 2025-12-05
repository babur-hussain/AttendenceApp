/**
 * useEmployeeDetail - Employee Detail View Hook
 * 
 * Fetches detailed employee data including:
 * - Last N days attendance summary
 * - Event timeline (TOON events)
 * - Aggregated metrics (hours, breaks, punctuality)
 * - Employee policies
 * 
 * TOON Endpoints:
 * - GET /api/manager/employee/:id/detail?T1=<fromDate>&T2=<toDate>
 * - GET /api/manager/employee/:id/timeline?T1=<fromDate>&T2=<toDate>
 * 
 * Response Tokens:
 * - E1: Employee ID
 * - NAME: Employee name
 * - ROLE: Employee role
 * - M1: Total days present
 * - M2: Total hours worked
 * - M3: Overtime minutes
 * - M4: Break usage %
 * - M5: Punctuality %
 * - EVENT_<idx>_A1: Event ID
 * - EVENT_<idx>_A2: Event type
 * - EVENT_<idx>_A3: Timestamp
 * - EVENT_<idx>_F3: Match score
 * - EVENT_<idx>_L1: Liveness score
 * - EVENT_<idx>_D1: Device ID
 * - EVENT_<idx>_S1: Status
 * - EVENT_<idx>_RAW: Raw TOON payload
 */

import { useState, useCallback } from 'react';
import { ToonClient } from '../services/api/ToonClient';
import { decodeFromToonPayload, encodeToToonPayload } from '../utils/toon';

export interface EmployeeMetrics {
  totalDaysPresent: number;
  totalHours: number;
  overtimeMinutes: number;
  breakUsagePercent: number;
  punctualityPercent: number;
}

export interface EmployeeEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  matchScore: number | null;
  livenessScore: number | null;
  deviceId: string | null;
  status: string;
  rawToon: string;
}

export interface EmployeeDetail {
  employeeId: string;
  name: string;
  role: string;
  profilePicUrl?: string;
  metrics: EmployeeMetrics;
  recentEvents: EmployeeEvent[];
}

export const useEmployeeDetail = (employeeId: string) => {
  const [detail, setDetail] = useState<EmployeeDetail | null>(null);
  const [timeline, setTimeline] = useState<EmployeeEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toonClient = new ToonClient();

  /**
   * Parse employee detail response
   */
  const parseDetailResponse = useCallback((toonData: Record<string, string>): EmployeeDetail => {
    const metrics: EmployeeMetrics = {
      totalDaysPresent: parseInt(toonData.M1 || '0', 10),
      totalHours: parseFloat(toonData.M2 || '0'),
      overtimeMinutes: parseInt(toonData.M3 || '0', 10),
      breakUsagePercent: parseFloat(toonData.M4 || '0'),
      punctualityPercent: parseFloat(toonData.M5 || '0'),
    };

    const events: EmployeeEvent[] = [];
    let idx = 0;

    while (toonData[`EVENT_${idx}_A1`]) {
      events.push({
        eventId: toonData[`EVENT_${idx}_A1`],
        eventType: toonData[`EVENT_${idx}_A2`] || '',
        timestamp: toonData[`EVENT_${idx}_A3`] || '',
        matchScore: toonData[`EVENT_${idx}_F3`] ? parseFloat(toonData[`EVENT_${idx}_F3`]) : null,
        livenessScore: toonData[`EVENT_${idx}_L1`] ? parseFloat(toonData[`EVENT_${idx}_L1`]) : null,
        deviceId: toonData[`EVENT_${idx}_D1`] || null,
        status: toonData[`EVENT_${idx}_S1`] || 'UNKNOWN',
        rawToon: toonData[`EVENT_${idx}_RAW`] || '',
      });
      idx++;
    }

    return {
      employeeId: toonData.E1 || employeeId,
      name: toonData.NAME || 'Unknown',
      role: toonData.ROLE || 'Employee',
      profilePicUrl: toonData.PIC || undefined,
      metrics,
      recentEvents: events,
    };
  }, [employeeId]);

  /**
   * Parse timeline response
   */
  const parseTimelineResponse = useCallback((toonData: Record<string, string>): EmployeeEvent[] => {
    const events: EmployeeEvent[] = [];
    let idx = 0;

    while (toonData[`EVENT_${idx}_A1`]) {
      events.push({
        eventId: toonData[`EVENT_${idx}_A1`],
        eventType: toonData[`EVENT_${idx}_A2`] || '',
        timestamp: toonData[`EVENT_${idx}_A3`] || '',
        matchScore: toonData[`EVENT_${idx}_F3`] ? parseFloat(toonData[`EVENT_${idx}_F3`]) : null,
        livenessScore: toonData[`EVENT_${idx}_L1`] ? parseFloat(toonData[`EVENT_${idx}_L1`]) : null,
        deviceId: toonData[`EVENT_${idx}_D1`] || null,
        status: toonData[`EVENT_${idx}_S1`] || 'UNKNOWN',
        rawToon: toonData[`EVENT_${idx}_RAW`] || '',
      });
      idx++;
    }

    return events;
  }, []);

  /**
   * Fetch employee detail
   */
  const fetchDetail = useCallback(
    async (fromDate?: string, toDate?: string) => {
      setLoading(true);
      setError(null);

      const from = fromDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = toDate || new Date().toISOString().split('T')[0];

      try {
        const queryParams = { T1: from, T2: to };
        const toonQuery = encodeToToonPayload(queryParams);
        
        const toonResponse = await toonClient.toonGet(
          `/api/manager/employee/${employeeId}/detail?toon=${toonQuery}`
        );
        
        const decoded = decodeFromToonPayload(toonResponse);
        const parsed = parseDetailResponse(decoded);
        
        setDetail(parsed);
      } catch (err) {
        console.error('Failed to fetch employee detail:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch employee detail');
      } finally {
        setLoading(false);
      }
    },
    [employeeId, parseDetailResponse, toonClient]
  );

  /**
   * Fetch employee timeline
   */
  const fetchTimeline = useCallback(
    async (fromDate?: string, toDate?: string) => {
      setLoading(true);
      setError(null);

      const from = fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const to = toDate || new Date().toISOString().split('T')[0];

      try {
        const queryParams = { T1: from, T2: to };
        const toonQuery = encodeToToonPayload(queryParams);
        
        const toonResponse = await toonClient.toonGet(
          `/api/manager/employee/${employeeId}/timeline?toon=${toonQuery}`
        );
        
        const decoded = decodeFromToonPayload(toonResponse);
        const parsed = parseTimelineResponse(decoded);
        
        setTimeline(parsed);
      } catch (err) {
        console.error('Failed to fetch employee timeline:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch timeline');
      } finally {
        setLoading(false);
      }
    },
    [employeeId, parseTimelineResponse, toonClient]
  );

  /**
   * Refresh both detail and timeline
   */
  const refresh = useCallback(
    async (fromDate?: string, toDate?: string) => {
      await Promise.all([fetchDetail(fromDate, toDate), fetchTimeline(fromDate, toDate)]);
    },
    [fetchDetail, fetchTimeline]
  );

  return {
    detail,
    timeline,
    loading,
    error,
    fetchDetail,
    fetchTimeline,
    refresh,
  };
};
