import { useState, useEffect, useCallback, useRef } from 'react';
import { ToonClient } from '../toon';
import type { AttendanceEvent, AttendanceFilters, PaginationTokens } from '../types/attendance';

const toonClient = new ToonClient({ baseURL: '/api' });

/**
 * Hook for TOON-based pagination with cursor management
 */
export function useToonPagination(pageSize: number = 20) {
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const cursorStack = useRef<string[]>([]);

  const goToNextPage = useCallback(() => {
    if (nextCursor) {
      if (cursor) {
        cursorStack.current.push(cursor);
      }
      setCursor(nextCursor);
      setPage((p) => p + 1);
    }
  }, [nextCursor, cursor]);

  const goToPreviousPage = useCallback(() => {
    if (cursorStack.current.length > 0) {
      const prevCursor = cursorStack.current.pop();
      setCursor(prevCursor);
      setPage((p) => p - 1);
    } else {
      // Go to first page
      setCursor(undefined);
      setPage(1);
      cursorStack.current = [];
    }
  }, []);

  const reset = useCallback(() => {
    setCursor(undefined);
    setNextCursor(undefined);
    setPage(1);
    cursorStack.current = [];
  }, []);

  const updateFromResponse = useCallback((paginationData: PaginationTokens) => {
    setNextCursor(paginationData.P3);
    setTotal(paginationData.TOTAL || 0);
  }, []);

  return {
    cursor,
    nextCursor,
    total,
    page,
    pageSize,
    hasNextPage: !!nextCursor,
    hasPreviousPage: page > 1,
    goToNextPage,
    goToPreviousPage,
    reset,
    updateFromResponse,
  };
}

/**
 * Hook for managing attendance events with TOON protocol
 */
export function useAttendance(autoRefreshInterval?: number) {
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [filters, setFilters] = useState<AttendanceFilters>({});
  const pagination = useToonPagination(20);
  const autoRefreshTimer = useRef<NodeJS.Timeout | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  const loadEvents = useCallback(async (
    currentFilters: AttendanceFilters = filters,
    currentCursor?: string
  ) => {
    setLoading(true);
    setError('');

    try {
      // Build query params
      const queryParams = new URLSearchParams();
      queryParams.set('P2', pagination.pageSize.toString());
      
      if (currentCursor) {
        queryParams.set('P1', currentCursor);
      }

      // Add filters as TOON tokens
      if (currentFilters.E1) queryParams.set('E1', currentFilters.E1);
      if (currentFilters.T1) queryParams.set('T1', currentFilters.T1);
      if (currentFilters.T2) queryParams.set('T2', currentFilters.T2);
      if (currentFilters.A2) queryParams.set('A2', currentFilters.A2);
      if (currentFilters.D1) queryParams.set('D1', currentFilters.D1);
      if (currentFilters.D2) queryParams.set('D2', currentFilters.D2);
      if (currentFilters.F3_MIN !== undefined) queryParams.set('F3_MIN', currentFilters.F3_MIN.toString());
      if (currentFilters.L1) queryParams.set('L1', currentFilters.L1);

      const response = await toonClient.toonGet(`/devices/events?${queryParams.toString()}`);
      
      // Parse events from batch
      const eventsData: AttendanceEvent[] = [];
      
      if (response.EVENTS) {
        const eventStrings = response.EVENTS.split('||');
        for (const evtStr of eventStrings) {
          if (evtStr.trim()) {
            const evt = parseEventFromToon(evtStr);
            eventsData.push(evt);
          }
        }
      }

      setEvents(eventsData);
      pagination.updateFromResponse({
        P1: currentCursor,
        P2: pagination.pageSize,
        P3: response.P3,
        TOTAL: response.TOTAL,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load attendance events';
      setError(errorMsg);
      console.error('Error loading attendance:', err);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination]);

  const applyFilters = useCallback((newFilters: AttendanceFilters) => {
    setFilters(newFilters);
    pagination.reset();
    loadEvents(newFilters, undefined);
  }, [loadEvents, pagination]);

  const refresh = useCallback(() => {
    loadEvents(filters, pagination.cursor);
  }, [loadEvents, filters, pagination.cursor]);

  const nextPage = useCallback(() => {
    if (pagination.hasNextPage) {
      pagination.goToNextPage();
      loadEvents(filters, pagination.nextCursor);
    }
  }, [loadEvents, filters, pagination]);

  const previousPage = useCallback(() => {
    if (pagination.hasPreviousPage) {
      pagination.goToPreviousPage();
      // The cursor is updated in goToPreviousPage, so we need to wait
      setTimeout(() => {
        loadEvents(filters, pagination.cursor);
      }, 0);
    }
  }, [loadEvents, filters, pagination]);

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefreshEnabled && autoRefreshInterval) {
      autoRefreshTimer.current = setInterval(() => {
        refresh();
      }, autoRefreshInterval);

      return () => {
        if (autoRefreshTimer.current) {
          clearInterval(autoRefreshTimer.current);
        }
      };
    }
  }, [autoRefreshEnabled, autoRefreshInterval, refresh]);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, []);

  return {
    events,
    loading,
    error,
    filters,
    applyFilters,
    refresh,
    nextPage,
    previousPage,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total: pagination.total,
      hasNextPage: pagination.hasNextPage,
      hasPreviousPage: pagination.hasPreviousPage,
    },
    autoRefresh: {
      enabled: autoRefreshEnabled,
      toggle: () => setAutoRefreshEnabled((prev) => !prev),
    },
  };
}

/**
 * Helper to parse attendance event from TOON string
 */
function parseEventFromToon(toonStr: string): AttendanceEvent {
  const tokens = toonStr.split('|');
  const event: any = {};

  for (const token of tokens) {
    const [key, value] = token.split(':');
    if (key && value !== undefined) {
      // Parse numbers
      if (['F3', 'FP2', 'F4', 'L2', 'S2', 'B2'].includes(key)) {
        event[key] = parseFloat(value);
      }
      // Parse booleans
      else if (value === 'true') event[key] = true;
      else if (value === 'false') event[key] = false;
      // Strings
      else event[key] = value;
    }
  }

  return event as AttendanceEvent;
}
