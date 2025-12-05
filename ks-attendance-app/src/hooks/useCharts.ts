/**
 * useCharts - Chart Data Aggregation Hook
 * 
 * Transforms TOON history data into chart-friendly formats
 */

import { useState, useCallback } from 'react';
import { ToonClient } from '../services/api/ToonClient';
import { decodeFromToonPayload, encodeToToonPayload } from '../utils/toon';

export interface WeeklyHoursData {
  day: string;
  hours: number;
  overtime: number;
}

export interface PunctualityPoint {
  date: string;
  percentage: number;
  lateCount: number;
  totalCount: number;
}

export interface BreakUsageData {
  type: string;
  allowed: number;
  used: number;
  over: number;
}

export interface OvertimeBin {
  range: string;
  count: number;
  totalMinutes: number;
}

export const useCharts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toonClient = new ToonClient();

  /**
   * Get weekly hours data
   */
  const getWeeklyHours = useCallback(async (
    employeeId?: string,
    fromDate?: string
  ): Promise<WeeklyHoursData[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        CHART: 'weekly_hours',
      };

      if (employeeId) params.E1 = employeeId;
      if (fromDate) params.T1 = fromDate;
      else {
        // Default: last 7 days
        const date = new Date();
        date.setDate(date.getDate() - 7);
        params.T1 = date.toISOString().split('T')[0];
      }

      const toonQuery = encodeToToonPayload(params);
      const queryString = typeof toonQuery === 'string' ? toonQuery : Buffer.from(toonQuery).toString('base64');

      const response = await toonClient.toonGet(`/api/charts/data?toon=${encodeURIComponent(queryString)}`);
      const data = decodeFromToonPayload(response);

      const weekData: WeeklyHoursData[] = [];
      const count = data.COUNT || 7;

      for (let i = 0; i < count; i++) {
        weekData.push({
          day: data[`D${i}_DAY`] || ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
          hours: parseFloat(data[`D${i}_HRS`] || '0'),
          overtime: parseFloat(data[`D${i}_OT`] || '0'),
        });
      }

      return weekData;
    } catch (err: any) {
      console.error('[useCharts] Weekly hours fetch failed:', err);
      setError(err.message);
      // Return mock data for graceful degradation
      return generateMockWeeklyData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get monthly punctuality trend
   */
  const getMonthlyPunctuality = useCallback(async (
    employeeId?: string,
    month?: string
  ): Promise<PunctualityPoint[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        CHART: 'punctuality',
      };

      if (employeeId) params.E1 = employeeId;
      if (month) params.M1 = month;

      const toonQuery = encodeToToonPayload(params);
      const queryString = typeof toonQuery === 'string' ? toonQuery : Buffer.from(toonQuery).toString('base64');

      const response = await toonClient.toonGet(`/api/charts/data?toon=${encodeURIComponent(queryString)}`);
      const data = decodeFromToonPayload(response);

      const points: PunctualityPoint[] = [];
      const count = data.COUNT || 0;

      for (let i = 0; i < count; i++) {
        points.push({
          date: data[`P${i}_DATE`] || '',
          percentage: parseFloat(data[`P${i}_PCT`] || '100'),
          lateCount: parseInt(data[`P${i}_LATE`] || '0'),
          totalCount: parseInt(data[`P${i}_TOTAL`] || '1'),
        });
      }

      return points;
    } catch (err: any) {
      console.error('[useCharts] Punctuality fetch failed:', err);
      setError(err.message);
      return generateMockPunctualityData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get break usage summary
   */
  const getBreakUsage = useCallback(async (
    employeeId?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<BreakUsageData[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        CHART: 'break_usage',
      };

      if (employeeId) params.E1 = employeeId;
      if (fromDate) params.T1 = fromDate;
      if (toDate) params.T2 = toDate;

      const toonQuery = encodeToToonPayload(params);
      const queryString = typeof toonQuery === 'string' ? toonQuery : Buffer.from(toonQuery).toString('base64');

      const response = await toonClient.toonGet(`/api/charts/data?toon=${encodeURIComponent(queryString)}`);
      const data = decodeFromToonPayload(response);

      const breakData: BreakUsageData[] = [];
      const types = ['LUNCH', 'PERSONAL', 'SMOKE', 'OTHER'];

      types.forEach((type, i) => {
        const allowed = parseFloat(data[`B${i}_ALLOWED`] || '0');
        const used = parseFloat(data[`B${i}_USED`] || '0');
        const over = parseFloat(data[`B${i}_OVER`] || '0');

        if (allowed > 0 || used > 0) {
          breakData.push({ type, allowed, used, over });
        }
      });

      return breakData.length > 0 ? breakData : generateMockBreakData();
    } catch (err: any) {
      console.error('[useCharts] Break usage fetch failed:', err);
      setError(err.message);
      return generateMockBreakData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Get overtime histogram
   */
  const getOvertimeHistogram = useCallback(async (
    employeeId?: string,
    fromDate?: string,
    toDate?: string
  ): Promise<OvertimeBin[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const params: Record<string, any> = {
        CHART: 'overtime',
      };

      if (employeeId) params.E1 = employeeId;
      if (fromDate) params.T1 = fromDate;
      if (toDate) params.T2 = toDate;

      const toonQuery = encodeToToonPayload(params);
      const queryString = typeof toonQuery === 'string' ? toonQuery : Buffer.from(toonQuery).toString('base64');

      const response = await toonClient.toonGet(`/api/charts/data?toon=${encodeURIComponent(queryString)}`);
      const data = decodeFromToonPayload(response);

      const bins: OvertimeBin[] = [];
      const count = data.COUNT || 0;

      for (let i = 0; i < count; i++) {
        bins.push({
          range: data[`O${i}_RANGE`] || '',
          count: parseInt(data[`O${i}_CNT`] || '0'),
          totalMinutes: parseFloat(data[`O${i}_MINS`] || '0'),
        });
      }

      return bins.length > 0 ? bins : generateMockOvertimeData();
    } catch (err: any) {
      console.error('[useCharts] Overtime fetch failed:', err);
      setError(err.message);
      return generateMockOvertimeData();
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mock data generators for offline/error states
  const generateMockWeeklyData = (): WeeklyHoursData[] => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => ({
      day,
      hours: Math.random() * 10 + 5,
      overtime: Math.random() * 2,
    }));
  };

  const generateMockPunctualityData = (): PunctualityPoint[] => {
    const points: PunctualityPoint[] = [];
    const now = new Date();
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      points.push({
        date: date.toISOString().split('T')[0],
        percentage: 90 + Math.random() * 10,
        lateCount: Math.floor(Math.random() * 2),
        totalCount: 5,
      });
    }
    
    return points;
  };

  const generateMockBreakData = (): BreakUsageData[] => [
    { type: 'LUNCH', allowed: 60, used: 58, over: 0 },
    { type: 'PERSONAL', allowed: 15, used: 12, over: 0 },
    { type: 'SMOKE', allowed: 10, used: 15, over: 5 },
  ];

  const generateMockOvertimeData = (): OvertimeBin[] => [
    { range: '0-30', count: 5, totalMinutes: 75 },
    { range: '30-60', count: 8, totalMinutes: 360 },
    { range: '60-90', count: 3, totalMinutes: 210 },
    { range: '90+', count: 1, totalMinutes: 120 },
  ];

  return {
    isLoading,
    error,
    getWeeklyHours,
    getMonthlyPunctuality,
    getBreakUsage,
    getOvertimeHistogram,
  };
};
