/**
 * useHistory - Attendance History & Calendar Data Hook
 * 
 * Features:
 * - Month/day event fetching via TOON
 * - Local caching (last 3 months)
 * - Export reports via ToonClient
 * - Offline-first with sync
 */

import { useState, useEffect, useCallback } from 'react';
import { ToonClient } from '../services/api/ToonClient';
import { decodeFromToonPayload, encodeToToonPayload } from '../utils/toon';
import * as SecureStore from 'expo-secure-store';

export interface HistoryFilters {
  fromDate?: string;
  toDate?: string;
  employeeId?: string;
  eventType?: string;
  deviceId?: string;
  minMatchScore?: number;
  minLiveness?: number;
}

export interface DayBadge {
  date: string;
  type: 'present' | 'absent' | 'late' | 'over-break' | 'partial';
  eventsCount: number;
  totalMinutes?: number;
  overBreakMinutes?: number;
}

export interface MonthSummary {
  year: number;
  month: number;
  totalPresentDays: number;
  totalHours: number;
  overtimeMinutes: number;
  punctualityPercent: number;
  days: Record<string, DayBadge>;
}

export interface AttendanceEvent {
  eventId: string;
  employeeId: string;
  eventType: string;
  timestamp: string;
  matchScore?: number;
  fingerprintScore?: number;
  livenessScore?: number;
  deviceId: string;
  status: string;
  rawToon: string;
}

export interface PaginationInfo {
  nextToken?: string;
  prevToken?: string;
  hasMore: boolean;
}

const CACHE_KEY_PREFIX = 'history_cache_';
const CACHE_MONTHS = 3;

export const useHistory = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [monthSummary, setMonthSummary] = useState<MonthSummary | null>(null);
  const [dayEvents, setDayEvents] = useState<AttendanceEvent[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ hasMore: false });
  const [error, setError] = useState<string | null>(null);

  const toonClient = new ToonClient();

  /**
   * Fetch month summary with day badges
   */
  const fetchMonthSummary = useCallback(async (
    year: number,
    month: number,
    filters?: HistoryFilters
  ): Promise<MonthSummary | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Build TOON query params
      const params: Record<string, any> = {
        Y1: year,
        M1: month,
      };

      if (filters?.employeeId) params.E1 = filters.employeeId;
      if (filters?.fromDate) params.T1 = filters.fromDate;
      if (filters?.toDate) params.T2 = filters.toDate;
      if (filters?.eventType) params.A2 = filters.eventType;
      if (filters?.deviceId) params.D1 = filters.deviceId;
      if (filters?.minMatchScore !== undefined) params.F3_MIN = filters.minMatchScore;
      if (filters?.minLiveness !== undefined) params.L1_MIN = filters.minLiveness;

      const toonQuery = encodeToToonPayload(params);
      const queryString = typeof toonQuery === 'string' ? toonQuery : Buffer.from(toonQuery).toString('base64');

      const response = await toonClient.toonGet(`/api/history/month?toon=${encodeURIComponent(queryString)}`);
      const data = decodeFromToonPayload(response);

      // Parse response tokens
      const summary: MonthSummary = {
        year: data.Y1 || year,
        month: data.M1 || month,
        totalPresentDays: data.M2 || 0,
        totalHours: data.M3 || 0,
        overtimeMinutes: data.M4 || 0,
        punctualityPercent: data.M5 || 0,
        days: {},
      };

      // Parse day badges (D1_1, D1_2, etc for each day)
      Object.keys(data).forEach(key => {
        const match = key.match(/^D(\d+)_TYPE$/);
        if (match) {
          const day = match[1];
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          summary.days[dateStr] = {
            date: dateStr,
            type: data[`D${day}_TYPE`] || 'absent',
            eventsCount: data[`D${day}_COUNT`] || 0,
            totalMinutes: data[`D${day}_MINS`],
            overBreakMinutes: data[`D${day}_OVER`],
          };
        }
      });

      // Cache locally
      await cacheMonthSummary(year, month, summary);
      
      setMonthSummary(summary);
      setIsOffline(false);
      return summary;
    } catch (err: any) {
      console.error('[useHistory] Month fetch failed:', err);
      
      // Try loading from cache
      const cached = await loadCachedMonth(year, month);
      if (cached) {
        setMonthSummary(cached);
        setIsOffline(true);
        return cached;
      }

      setError(err.message || 'Failed to load month summary');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch events for specific day
   */
  const fetchDayEvents = useCallback(async (
    date: string,
    filters?: HistoryFilters,
    paginationToken?: string
  ): Promise<AttendanceEvent[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        T1: date,
        T2: date,
      };

      if (filters?.employeeId) params.E1 = filters.employeeId;
      if (filters?.eventType) params.A2 = filters.eventType;
      if (filters?.deviceId) params.D1 = filters.deviceId;
      if (filters?.minMatchScore !== undefined) params.F3_MIN = filters.minMatchScore;
      if (filters?.minLiveness !== undefined) params.L1_MIN = filters.minLiveness;
      if (paginationToken) params.P1 = paginationToken;

      const toonQuery = encodeToToonPayload(params);
      const queryString = typeof toonQuery === 'string' ? toonQuery : Buffer.from(toonQuery).toString('base64');

      const response = await toonClient.toonGet(`/api/history/events?toon=${encodeURIComponent(queryString)}`);
      const data = decodeFromToonPayload(response);

      // Parse events array
      const events: AttendanceEvent[] = [];
      const eventCount = data.COUNT || 0;

      for (let i = 0; i < eventCount; i++) {
        const prefix = `E${i}_`;
        events.push({
          eventId: data[`${prefix}A1`] || '',
          employeeId: data[`${prefix}E1`] || '',
          eventType: data[`${prefix}A2`] || '',
          timestamp: data[`${prefix}A3`] || '',
          matchScore: data[`${prefix}F3`] ? parseFloat(data[`${prefix}F3`]) : undefined,
          fingerprintScore: data[`${prefix}FP2`] ? parseFloat(data[`${prefix}FP2`]) : undefined,
          livenessScore: data[`${prefix}L1`] ? parseFloat(data[`${prefix}L1`]) : undefined,
          deviceId: data[`${prefix}D1`] || '',
          status: data[`${prefix}S1`] || '',
          rawToon: data[`${prefix}RAW`] || '',
        });
      }

      setPagination({
        nextToken: data.P2,
        prevToken: data.P1,
        hasMore: !!data.P2,
      });

      setDayEvents(events);
      return events;
    } catch (err: any) {
      console.error('[useHistory] Day events fetch failed:', err);
      setError(err.message || 'Failed to load day events');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Export filtered report
   */
  const exportFilteredReport = useCallback(async (
    filters: HistoryFilters,
    format: 'xlsx' | 'csv' = 'xlsx'
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        FMT: format,
      };

      if (filters.fromDate) params.T1 = filters.fromDate;
      if (filters.toDate) params.T2 = filters.toDate;
      if (filters.employeeId) params.E1 = filters.employeeId;
      if (filters.eventType) params.A2 = filters.eventType;
      if (filters.deviceId) params.D1 = filters.deviceId;
      if (filters.minMatchScore !== undefined) params.F3_MIN = filters.minMatchScore;
      if (filters.minLiveness !== undefined) params.L1_MIN = filters.minLiveness;

      const toonPayload = encodeToToonPayload(params);
      const payloadString = typeof toonPayload === 'string' ? toonPayload : Buffer.from(toonPayload).toString('base64');

      // Post request for report generation
      const response = await toonClient.toonPost('/api/reports/attendance', payloadString);
      const responseData = decodeFromToonPayload(response);

      const reportId = responseData.R1;
      const downloadUrl = responseData.URL;

      if (!reportId) {
        throw new Error('No report ID returned');
      }

      // Download file
      // TODO: Implement toonDownload helper in ToonClient
      const filename = `attendance_${filters.fromDate || 'all'}_${filters.toDate || 'all'}_${reportId}.${format}`;
      
      console.log('[useHistory] Export ready:', { reportId, downloadUrl, filename });
      return reportId;
    } catch (err: any) {
      console.error('[useHistory] Export failed:', err);
      setError(err.message || 'Export failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Manual sync when back online
   */
  const syncCachedMonths = useCallback(async () => {
    const now = new Date();
    const promises: Promise<MonthSummary | null>[] = [];

    for (let i = 0; i < CACHE_MONTHS; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      promises.push(fetchMonthSummary(d.getFullYear(), d.getMonth() + 1));
    }

    await Promise.all(promises);
  }, [fetchMonthSummary]);

  // Cache helpers
  const cacheMonthSummary = async (year: number, month: number, data: MonthSummary) => {
    try {
      const key = `${CACHE_KEY_PREFIX}${year}_${month}`;
      await SecureStore.setItemAsync(key, JSON.stringify(data));
    } catch (e) {
      console.warn('[useHistory] Cache save failed:', e);
    }
  };

  const loadCachedMonth = async (year: number, month: number): Promise<MonthSummary | null> => {
    try {
      const key = `${CACHE_KEY_PREFIX}${year}_${month}`;
      const cached = await SecureStore.getItemAsync(key);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      console.warn('[useHistory] Cache load failed:', e);
      return null;
    }
  };

  return {
    isLoading,
    isOffline,
    error,
    monthSummary,
    dayEvents,
    pagination,
    fetchMonthSummary,
    fetchDayEvents,
    exportFilteredReport,
    syncCachedMonths,
  };
};
