import React, { useEffect, useState } from 'react';
import { Card } from '../components/common/Card';
import { ReportBuilderForm } from '../components/reports/ReportBuilderForm';
import { RecentReportsTable } from '../components/reports/RecentReportsTable';
import { useReports } from '../hooks/useReports';
import type { ReportRequest, ReportMetadata } from '../types/report';

export const ReportsPage: React.FC = () => {
  const {
    reports,
    loading,
    error,
    fetchReports,
    generateReport,
    downloadReport,
    deleteReport,
  } = useReports();

  const [generatingReport, setGeneratingReport] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [debugInfo, setDebugInfo] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleGenerate = async (request: ReportRequest) => {
    setGeneratingReport(true);
    setDebugInfo(null);

    const result = await generateReport(request);

    setGeneratingReport(false);

    if (result.success) {
      setToast({ message: 'Report generated successfully!', type: 'success' });
      
      // Store debug info from X-TOON-RESP header
      if (result.reportMetadata) {
        setDebugInfo(result.reportMetadata);
      }
    } else {
      setToast({ message: result.error || 'Failed to generate report', type: 'error' });
    }
  };

  const handleDownload = async (report: ReportMetadata) => {
    const success = await downloadReport(report);
    if (success) {
      setToast({ message: 'Download started!', type: 'success' });
    } else {
      setToast({ message: 'Download failed', type: 'error' });
    }
  };

  const handleRegenerate = async (report: ReportMetadata) => {
    const request: ReportRequest = {
      R1: `REPORT_${Date.now()}`,
      T1: report.T1,
      T2: report.T2,
      E1: report.E1,
      O1: 'XLSX',
    };
    await handleGenerate(request);
  };

  const handleDelete = async (report: ReportMetadata) => {
    if (!confirm(`Delete report ${report.R1}?`)) return;

    const success = await deleteReport(report.R1);
    if (success) {
      setToast({ message: 'Report deleted successfully', type: 'success' });
    } else {
      setToast({ message: 'Failed to delete report', type: 'error' });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="mt-2 text-sm text-gray-600">
          Generate and download attendance reports with Excel or CSV format
        </p>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
            toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white`}
        >
          {toast.message}
        </div>
      )}

      {/* Report Builder */}
      <Card title="Generate New Report">
        <ReportBuilderForm onGenerate={handleGenerate} loading={generatingReport} />
      </Card>

      {/* Debug Panel */}
      {debugInfo && (
        <Card title="X-TOON-RESP Debug Info">
          <div className="bg-gray-50 p-4 rounded border border-gray-200">
            <pre className="text-xs font-mono overflow-x-auto">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        </Card>
      )}

      {/* Recent Reports */}
      <Card title="Recent Reports">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            {error}
          </div>
        )}
        <RecentReportsTable
          reports={reports}
          onDownload={handleDownload}
          onRegenerate={handleRegenerate}
          onDelete={handleDelete}
          loading={loading}
        />
      </Card>
    </div>
  );
};
