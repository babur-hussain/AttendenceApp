/**
 * useManagerDashboard - Manager Dashboard Data Hook
 * 
 * Fetches team-level attendance data using TOON tokens.
 * Provides real-time team status, KPIs, and filtering.
 * 
 * TOON Endpoints:
 * - GET /api/manager/team-status?T1=<date>&...
 * 
 * Query Tokens:
 * - T1: Target date (ISO 8601)
 * - E1: Employee ID filter (optional)
 * - A2: Event type filter (optional)
 * - D1: Device filter (optional)
 * - F3_MIN: Min match score (optional)
 * - L1_MIN: Min liveness score (optional)
 * - ROLE: Role filter (optional)
 * 
 * Response Tokens:
 * - M1: Present count
 * - M2: Absent count
 * - M3: Late count
 * - M4: Over-break count
 * - M5: Total team size
 * - EMP_<idx>_E1: Employee ID
 * - EMP_<idx>_NAME: Employee name
 * - EMP_<idx>_ROLE: Employee role
 * - EMP_<idx>_STATUS: Current status (PRESENT/ABSENT/ON_BREAK/LEFT/PENDING)
 * - EMP_<idx>_A3: Last event timestamp
 * - EMP_<idx>_F3: Last match score
 * - EMP_<idx>_L1: Last liveness score
 * - EMP_<idx>_LATE_MIN: Minutes late (if late)
 * - EMP_<idx>_BREAK_OVER: Break overrun minutes (if applicable)
 */

import { useState, useCallback, useEffect } from 'react';
import { ToonClient } from '../services/api/ToonClient';
import { decodeFromToonPayload, encodeToToonPayload } from '../utils/toon';
import * as SecureStore from 'expo-secure-store';

const CACHE_KEY = 'manager_dashboard_cache';
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export interface TeamMemberStatus {
  employeeId: string;
  name: string;
  role: string;
  status: 'PRESENT' | 'ABSENT' | 'ON_BREAK' | 'LEFT' | 'PENDING';
  lastEventTime: string | null;
  matchScore: number | null;
  livenessScore: number | null;
  lateMinutes: number;
  breakOverMinutes: number;
  profilePicUrl?: string;
}

export interface DashboardKPIs {
  presentCount: number;
  absentCount: number;
  lateCount: number;
  overBreakCount: number;
  totalTeamSize: number;
}

export interface DashboardFilters {
  role?: string;
  status?: string;
  deviceId?: string;
  minMatchScore?: number;
  minLivenessScore?: number;
}

export interface DashboardData {
  kpis: DashboardKPIs;
  teamMembers: TeamMemberStatus[];
  lastUpdated: string;
}

export const useManagerDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>({});

  const toonClient = new ToonClient();

  /**
   * Parse TOON response into DashboardData
   */
  const parseDashboardResponse = useCallback((toonData: Record<string, string>): DashboardData => {
    // Parse KPIs
    const kpis: DashboardKPIs = {
      presentCount: parseInt(toonData.M1 || '0', 10),
      absentCount: parseInt(toonData.M2 || '0', 10),
      lateCount: parseInt(toonData.M3 || '0', 10),
      overBreakCount: parseInt(toonData.M4 || '0', 10),
      totalTeamSize: parseInt(toonData.M5 || '0', 10),
    };

    // Parse team members
    const teamMembers: TeamMemberStatus[] = [];
    let idx = 0;

    while (toonData[`EMP_${idx}_E1`]) {
      teamMembers.push({
        employeeId: toonData[`EMP_${idx}_E1`],
        name: toonData[`EMP_${idx}_NAME`] || 'Unknown',
        role: toonData[`EMP_${idx}_ROLE`] || 'Employee',
        status: (toonData[`EMP_${idx}_STATUS`] || 'PENDING') as TeamMemberStatus['status'],
        lastEventTime: toonData[`EMP_${idx}_A3`] || null,
        matchScore: toonData[`EMP_${idx}_F3`] ? parseFloat(toonData[`EMP_${idx}_F3`]) : null,
        livenessScore: toonData[`EMP_${idx}_L1`] ? parseFloat(toonData[`EMP_${idx}_L1`]) : null,
        lateMinutes: parseInt(toonData[`EMP_${idx}_LATE_MIN`] || '0', 10),
        breakOverMinutes: parseInt(toonData[`EMP_${idx}_BREAK_OVER`] || '0', 10),
        profilePicUrl: toonData[`EMP_${idx}_PIC`] || undefined,
      });
      idx++;
    }

    return {
      kpis,
      teamMembers,
      lastUpdated: new Date().toISOString(),
    };
  }, []);

  /**
   * Load cached dashboard data
   */
  const loadFromCache = useCallback(async (): Promise<DashboardData | null> => {
    try {
      const cached = await SecureStore.getItemAsync(CACHE_KEY);
      if (!cached) return null;

      const parsed = JSON.parse(cached) as DashboardData & { cachedAt: string };
      const cacheAge = Date.now() - new Date(parsed.cachedAt).getTime();

      if (cacheAge > CACHE_DURATION_MS) {
        return null; // Cache expired
      }

      return {
        kpis: parsed.kpis,
        teamMembers: parsed.teamMembers,
        lastUpdated: parsed.lastUpdated,
      };
    } catch (err) {
      console.warn('Failed to load dashboard cache:', err);
      return null;
    }
  }, []);

  /**
   * Save dashboard data to cache
   */
  const saveToCache = useCallback(async (dashboardData: DashboardData) => {
    try {
      const toCache = {
        ...dashboardData,
        cachedAt: new Date().toISOString(),
      };
      await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(toCache));
    } catch (err) {
      console.warn('Failed to save dashboard cache:', err);
    }
  }, []);

  /**
   * Fetch team status from backend
   */
  const fetchTeamStatus = useCallback(async (date?: string, customFilters?: DashboardFilters) => {
    setLoading(true);
    setError(null);

    const targetDate = date || new Date().toISOString().split('T')[0];
    const activeFilters = customFilters || filters;

    // Build TOON query params
    const queryParams: Record<string, string | number> = {
      T1: targetDate,
    };

    if (activeFilters.role) queryParams.ROLE = activeFilters.role;
    if (activeFilters.status) queryParams.STATUS = activeFilters.status;
    if (activeFilters.deviceId) queryParams.D1 = activeFilters.deviceId;
    if (activeFilters.minMatchScore !== undefined) queryParams.F3_MIN = activeFilters.minMatchScore;
    if (activeFilters.minLivenessScore !== undefined) queryParams.L1_MIN = activeFilters.minLivenessScore;

    try {
      // Encode to TOON
      const toonQuery = encodeToToonPayload(queryParams);
      
      // Fetch from backend
      const toonResponse = await toonClient.toonGet(`/api/manager/team-status?toon=${toonQuery}`);
      
      // Decode TOON response
      const decoded = decodeFromToonPayload(toonResponse);
      
      // Parse into dashboard data
      const dashboardData = parseDashboardResponse(decoded);
      
      setData(dashboardData);
      setIsOffline(false);
      
      // Cache the result
      await saveToCache(dashboardData);
    } catch (err) {
      console.error('Failed to fetch team status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch team status');
      setIsOffline(true);

      // Fall back to cache
      const cached = await loadFromCache();
      if (cached) {
        setData(cached);
      }
    } finally {
      setLoading(false);
    }
  }, [filters, parseDashboardResponse, saveToCache, loadFromCache, toonClient]);

  /**
   * Apply filters
   */
  const applyFilters = useCallback((newFilters: DashboardFilters) => {
    setFilters(newFilters);
    fetchTeamStatus(undefined, newFilters);
  }, [fetchTeamStatus]);

  /**
   * Clear filters
   */
  const clearFilters = useCallback(() => {
    setFilters({});
    fetchTeamStatus(undefined, {});
  }, [fetchTeamStatus]);

  /**
   * Refresh dashboard
   */
  const refresh = useCallback(() => {
    return fetchTeamStatus();
  }, [fetchTeamStatus]);

  /**
   * Search team member by name or ID
   */
  const searchTeamMember = useCallback((query: string): TeamMemberStatus[] => {
    if (!data) return [];
    
    const lowerQuery = query.toLowerCase();
    return data.teamMembers.filter(
      (member) =>
        member.name.toLowerCase().includes(lowerQuery) ||
        member.employeeId.toLowerCase().includes(lowerQuery)
    );
  }, [data]);

  /**
   * Get team member by ID
   */
  const getTeamMember = useCallback((employeeId: string): TeamMemberStatus | null => {
    if (!data) return null;
    return data.teamMembers.find((m) => m.employeeId === employeeId) || null;
  }, [data]);

  // Auto-load on mount
  useEffect(() => {
    fetchTeamStatus();
  }, []);

  return {
    data,
    loading,
    error,
    isOffline,
    filters,
    fetchTeamStatus,
    applyFilters,
    clearFilters,
    refresh,
    searchTeamMember,
    getTeamMember,
  };
};
