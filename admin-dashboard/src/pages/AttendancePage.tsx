import React from 'react';
import { Card, Button } from '../components/common';
import { AttendanceFiltersComponent, AttendanceTable } from '../components/attendance';
import { useAttendance } from '../hooks/useAttendance';
import { TOON_ERROR_MESSAGES } from '../types/attendance';

const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds

export const AttendancePage: React.FC = () => {
  const {
    events,
    loading,
    error,
    filters,
    applyFilters,
    refresh,
    nextPage,
    previousPage,
    pagination,
    autoRefresh,
  } = useAttendance(AUTO_REFRESH_INTERVAL);

  const getErrorMessage = (errorMsg: string): string => {
    // Try to extract TOON error token
    const match = errorMsg.match(/ERR\d*:(\w+)/);
    if (match) {
      const errorToken = match[1];
      return TOON_ERROR_MESSAGES[errorToken] || errorMsg;
    }
    return errorMsg;
  };

  return (
    <div>
      <h1>Attendance Records</h1>
      <p>Real-time attendance event monitoring via TOON protocol</p>

      {error && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#ffebee', 
          color: '#c62828', 
          marginBottom: '16px',
          borderRadius: '4px'
        }}>
          <strong>Error:</strong> {getErrorMessage(error)}
        </div>
      )}

      <Card title="Filters">
        <AttendanceFiltersComponent onApplyFilters={applyFilters} loading={loading} />
        
        <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Applied Filters:</strong>{' '}
              {Object.keys(filters).length === 0 ? (
                <span style={{ color: '#666' }}>None</span>
              ) : (
                <span>
                  {Object.entries(filters)
                    .map(([key, value]) => `${key}=${value}`)
                    .join(', ')}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={autoRefresh.enabled}
                  onChange={autoRefresh.toggle}
                />
                Auto-refresh (10s)
              </label>
              <Button variant="secondary" onClick={refresh} disabled={loading}>
                {loading ? 'Loading...' : 'Refresh Now'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Attendance Events">
        <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
          Showing {events.length} events {pagination.total > 0 && `of ${pagination.total} total`}
          {' • '}
          Page {pagination.page}
          {autoRefresh.enabled && ' • Auto-refreshing...'}
        </div>

        <AttendanceTable events={events} loading={loading} />

        {/* Pagination Controls */}
        {(pagination.hasNextPage || pagination.hasPreviousPage) && (
          <div style={{ 
            marginTop: '16px', 
            display: 'flex', 
            justifyContent: 'center', 
            gap: '8px', 
            alignItems: 'center' 
          }}>
            <Button
              variant="secondary"
              onClick={previousPage}
              disabled={!pagination.hasPreviousPage || loading}
            >
              ← Previous
            </Button>
            <span style={{ padding: '0 16px' }}>
              Page {pagination.page}
              {pagination.total > 0 && ` • ${pagination.total} total events`}
            </span>
            <Button
              variant="secondary"
              onClick={nextPage}
              disabled={!pagination.hasNextPage || loading}
            >
              Next →
            </Button>
          </div>
        )}
      </Card>

      <Card title="TOON Protocol Info">
        <div style={{ fontSize: '14px', color: '#666' }}>
          <h4 style={{ marginTop: 0 }}>Token Mapping</h4>
          <ul style={{ marginBottom: '16px' }}>
            <li><strong>E1</strong> = Employee ID</li>
            <li><strong>A1</strong> = Event ID</li>
            <li><strong>A2</strong> = Event Type (IN/OUT/BREAK_START/BREAK_END)</li>
            <li><strong>A3</strong> = Timestamp</li>
            <li><strong>D1/D2</strong> = Device ID/Type</li>
            <li><strong>F3</strong> = Face Match Score (0-1)</li>
            <li><strong>FP2</strong> = Fingerprint Match Score (0-1)</li>
            <li><strong>L1</strong> = Location/Liveness Token</li>
            <li><strong>B1-B3</strong> = Break Type, Duration, Over-break flag</li>
            <li><strong>P1-P3</strong> = Pagination: Cursor, Limit, Next Cursor</li>
          </ul>
          <p>
            <strong>Note:</strong> All communication uses pure TOON protocol. No JSON is involved
            in any request or response.
          </p>
        </div>
      </Card>
    </div>
  );
};
