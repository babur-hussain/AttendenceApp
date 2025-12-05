import React, { useState } from 'react';
import { Button } from '../common/Button';
import type { AttendanceFilters } from '../../types/attendance';
import { EVENT_TYPE_OPTIONS } from '../../types/attendance';

interface AttendanceFiltersProps {
  onApplyFilters: (filters: AttendanceFilters) => void;
  loading?: boolean;
}

export const AttendanceFiltersComponent: React.FC<AttendanceFiltersProps> = ({
  onApplyFilters,
  loading = false,
}) => {
  const [filters, setFilters] = useState<AttendanceFilters>({});

  const handleChange = (field: keyof AttendanceFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    // Remove empty values
    const cleanFilters: AttendanceFilters = {};
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined) {
        cleanFilters[key as keyof AttendanceFilters] = value as any;
      }
    });
    onApplyFilters(cleanFilters);
  };

  const handleReset = () => {
    setFilters({});
    onApplyFilters({});
  };

  return (
    <div style={{ padding: '16px', backgroundColor: '#f5f5f5', marginBottom: '16px', borderRadius: '4px' }}>
      <h3 style={{ marginTop: 0 }}>Filters</h3>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
        {/* Employee ID */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            Employee ID (E1)
          </label>
          <input
            type="text"
            value={filters.E1 || ''}
            onChange={(e) => handleChange('E1', e.target.value)}
            placeholder="e.g., EMP001"
            style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        {/* Event Type */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            Event Type (A2)
          </label>
          <select
            value={filters.A2 || ''}
            onChange={(e) => handleChange('A2', e.target.value)}
            style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            {EVENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Device ID */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            Device ID (D1)
          </label>
          <input
            type="text"
            value={filters.D1 || ''}
            onChange={(e) => handleChange('D1', e.target.value)}
            placeholder="e.g., DEV001"
            style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        {/* Device Type */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            Device Type (D2)
          </label>
          <select
            value={filters.D2 || ''}
            onChange={(e) => handleChange('D2', e.target.value)}
            style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">All Devices</option>
            <option value="MOBILE">Mobile</option>
            <option value="KIOSK">Kiosk</option>
            <option value="RPI">Raspberry Pi</option>
            <option value="FINGERPRINT_TERMINAL">Fingerprint Terminal</option>
          </select>
        </div>

        {/* From Date */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            From Date (T1)
          </label>
          <input
            type="date"
            value={filters.T1 || ''}
            onChange={(e) => handleChange('T1', e.target.value)}
            style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        {/* To Date */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            To Date (T2)
          </label>
          <input
            type="date"
            value={filters.T2 || ''}
            onChange={(e) => handleChange('T2', e.target.value)}
            style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        {/* Face Match Score Min */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            Min Face Score (F3)
          </label>
          <input
            type="number"
            min="0"
            max="1"
            step="0.1"
            value={filters.F3_MIN || ''}
            onChange={(e) => handleChange('F3_MIN', e.target.value ? parseFloat(e.target.value) : undefined)}
            placeholder="0.0 - 1.0"
            style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        {/* Liveness Filter */}
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 'bold' }}>
            Liveness (L1)
          </label>
          <select
            value={filters.L1 || ''}
            onChange={(e) => handleChange('L1', e.target.value)}
            style={{ width: '100%', padding: '6px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="">All</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
        <Button onClick={handleApply} disabled={loading}>
          Apply Filters
        </Button>
        <Button variant="secondary" onClick={handleReset} disabled={loading}>
          Reset
        </Button>
      </div>
    </div>
  );
};
