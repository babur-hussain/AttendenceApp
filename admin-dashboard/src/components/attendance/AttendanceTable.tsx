import React, { useState } from 'react';
import { AttendanceRowDetails } from './AttendanceRowDetails';
import type { AttendanceEvent } from '../../types/attendance';

interface AttendanceTableProps {
  events: AttendanceEvent[];
  loading?: boolean;
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({ events, loading = false }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const toggleRow = (eventId: string) => {
    setExpandedRow((prev) => (prev === eventId ? null : eventId));
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getEventTypeColor = (eventType: string) => {
    switch (eventType) {
      case 'IN': return '#d4edda';
      case 'OUT': return '#f8d7da';
      case 'BREAK_START': return '#fff3cd';
      case 'BREAK_END': return '#d1ecf1';
      case 'OVERTIME_IN': return '#e2e3e5';
      case 'OVERTIME_OUT': return '#f5c6cb';
      default: return '#f5f5f5';
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'processed': return 'green';
      case 'duplicate': return 'orange';
      case 'rejected': return 'red';
      default: return 'gray';
    }
  };

  if (loading) {
    return <p>Loading attendance events...</p>;
  }

  if (events.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: '#999', padding: '32px' }}>
        No attendance events found. Try adjusting your filters.
      </p>
    );
  }

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left', width: '30px' }}></th>
            <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Employee (E1)</th>
            <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Event Type (A2)</th>
            <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Timestamp (A3)</th>
            <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Device (D1)</th>
            <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'center' }}>Face (F3)</th>
            <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'center' }}>Fingerprint (FP2)</th>
            <th style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'left' }}>Status (S1)</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <React.Fragment key={event.A1}>
              <tr style={{ cursor: 'pointer' }} onClick={() => toggleRow(event.A1)}>
                <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'center' }}>
                  {expandedRow === event.A1 ? '▼' : '▶'}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>{event.E1}</td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  <span
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      backgroundColor: getEventTypeColor(event.A2),
                      fontSize: '12px',
                    }}
                  >
                    {event.A2}
                  </span>
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc', fontSize: '13px' }}>
                  {formatTimestamp(event.A3)}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc', fontSize: '12px' }}>
                  {event.D1}
                  {event.D2 && <span style={{ color: '#666' }}> ({event.D2})</span>}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'center' }}>
                  {event.F3 !== undefined ? (
                    <span style={{ 
                      color: event.F3 >= 0.8 ? 'green' : event.F3 >= 0.6 ? 'orange' : 'red',
                      fontWeight: 'bold'
                    }}>
                      {event.F3.toFixed(2)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc', textAlign: 'center' }}>
                  {event.FP2 !== undefined ? (
                    <span style={{ 
                      color: event.FP2 >= 0.8 ? 'green' : event.FP2 >= 0.6 ? 'orange' : 'red',
                      fontWeight: 'bold'
                    }}>
                      {event.FP2.toFixed(2)}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>
                <td style={{ padding: '8px', border: '1px solid #ccc' }}>
                  <span style={{ color: getStatusColor(event.S1) }}>
                    {event.S1 || 'processed'}
                  </span>
                </td>
              </tr>
              {expandedRow === event.A1 && (
                <tr>
                  <td colSpan={8} style={{ padding: 0, border: '1px solid #ccc' }}>
                    <AttendanceRowDetails event={event} />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};
