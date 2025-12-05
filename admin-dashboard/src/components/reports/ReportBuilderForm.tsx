import React, { useState } from 'react';
import { Button } from '../common/Button';
import type { ReportRequest } from '../../types/report';
import { OUTPUT_FORMAT_OPTIONS } from '../../types/report';

interface ReportBuilderFormProps {
  onGenerate: (request: ReportRequest) => void;
  loading?: boolean;
}

export function ReportBuilderForm({ onGenerate, loading = false }: ReportBuilderFormProps) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [format, setFormat] = useState<'XLSX' | 'CSV'>('XLSX');
  const [includeRawEvents, setIncludeRawEvents] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromDate || !toDate) {
      alert('Please select both from and to dates');
      return;
    }

    const request: ReportRequest = {
      R1: `REPORT_${Date.now()}`,
      T1: fromDate,
      T2: toDate,
      O1: format,
      O2: includeRawEvents,
    };

    if (employeeId.trim()) {
      request.E1 = employeeId.trim();
    }

    if (roleFilter.trim()) {
      request.F1 = roleFilter.trim();
    }

    onGenerate(request);
  };

  // Set default date range (last 30 days)
  React.useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setToDate(today.toISOString().split('T')[0]);
    setFromDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="fromDate" className="block text-sm font-medium text-gray-700 mb-1">
            From Date
          </label>
          <input
            type="date"
            id="fromDate"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <div>
          <label htmlFor="toDate" className="block text-sm font-medium text-gray-700 mb-1">
            To Date
          </label>
          <input
            type="date"
            id="toDate"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
      </div>

      {/* Employee Filter */}
      <div>
        <label htmlFor="employeeId" className="block text-sm font-medium text-gray-700 mb-1">
          Employee ID (Optional)
        </label>
        <input
          type="text"
          id="employeeId"
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="Filter by specific employee"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">Leave blank to include all employees</p>
      </div>

      {/* Role/Shift Filter */}
      <div>
        <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-700 mb-1">
          Role/Shift Filter (Optional)
        </label>
        <input
          type="text"
          id="roleFilter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          placeholder="e.g., Admin,Manager or Shift-A,Shift-B"
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        />
        <p className="mt-1 text-sm text-gray-500">Comma-separated values for multiple filters</p>
      </div>

      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Output Format
        </label>
        <div className="flex gap-4">
          {OUTPUT_FORMAT_OPTIONS.map((option) => (
            <label key={option.value} className="flex items-center">
              <input
                type="radio"
                name="format"
                value={option.value}
                checked={format === option.value}
                onChange={(e) => setFormat(e.target.value as 'XLSX' | 'CSV')}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">{option.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Advanced Options</h3>
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={includeRawEvents}
              onChange={(e) => setIncludeRawEvents(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-2 text-sm text-gray-700">
              Include raw events sheet (detailed timestamp data)
            </span>
          </label>
        </div>
      </div>

      {/* Generate Button */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={loading}
          variant="primary"
        >
          {loading ? 'Generating...' : 'Generate Report'}
        </Button>
      </div>
    </form>
  );
}
