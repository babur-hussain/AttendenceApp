import React, { useEffect, useState } from 'react';
import { Card, Button } from '../components/common';
import { ToonClient } from '../toon';

const toonClient = new ToonClient({ baseURL: '/api' });

interface SummaryData {
  TOTAL_EMPLOYEES?: number;
  PUNCTUALITY_PCT?: number;
  OVER_BREAK_MINUTES?: number;
  LATE_INS?: number;
  LAST_REPORT_ID?: string;
  TOTAL_RECORDS?: number;
  ACTIVE_DEVICES?: number;
}

export const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<SummaryData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    setLoading(true);
    setError('');
    
    try {
      const data = await toonClient.toonGet('/reports/summary');
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load summary');
      console.error('Error loading summary:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to KS Attendance Admin Dashboard</p>
      
      <div style={{ marginBottom: '16px' }}>
        <Button onClick={loadSummary} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Summary'}
        </Button>
      </div>

      {error && (
        <div style={{ padding: '16px', backgroundColor: '#ffebee', color: '#c62828', marginBottom: '16px' }}>
          Error: {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
        <Card title="Total Employees">
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {loading ? '...' : summary.TOTAL_EMPLOYEES ?? 0}
          </div>
        </Card>

        <Card title="Punctuality Rate">
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {loading ? '...' : `${summary.PUNCTUALITY_PCT ?? 0}%`}
          </div>
        </Card>

        <Card title="Over-Break Minutes">
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {loading ? '...' : summary.OVER_BREAK_MINUTES ?? 0}
          </div>
        </Card>

        <Card title="Late Check-ins">
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {loading ? '...' : summary.LATE_INS ?? 0}
          </div>
        </Card>

        <Card title="Total Records">
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {loading ? '...' : summary.TOTAL_RECORDS ?? 0}
          </div>
        </Card>

        <Card title="Active Devices">
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
            {loading ? '...' : summary.ACTIVE_DEVICES ?? 0}
          </div>
        </Card>
      </div>

      {summary.LAST_REPORT_ID && (
        <Card title="Last Report">
          <p>Report ID: <strong>{summary.LAST_REPORT_ID}</strong></p>
        </Card>
      )}

      <Card title="Quick Actions">
        <p>Navigation links:</p>
        <ul>
          <li>View Employees → /employees</li>
          <li>View Attendance → /attendance</li>
          <li>Generate Reports → /reports</li>
          <li>Manage Devices → /devices</li>
        </ul>
      </Card>
    </div>
  );
};
