import { useState, useCallback } from 'react';
import { ToonClient, ToonCodec } from '../toon';
import type { ToonDownloadResponse, ReportMetadata, ReportRequest } from '../types/report';

const toonClient = new ToonClient({ baseURL: '/api' });

/**
 * Hook for TOON-based file downloads with progress tracking
 */
export function useToonDownload() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string>('');

  const download = useCallback(async (
    endpoint: string,
    filename: string
  ): Promise<boolean> => {
    setDownloading(true);
    setProgress(0);
    setError('');

    try {
      const blob = await toonClient.toonDownload(endpoint);
      
      // Trigger browser download
      ToonClient.triggerDownload(blob, filename);
      
      setProgress(100);
      setDownloading(false);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Download failed';
      setError(errorMsg);
      setDownloading(false);
      return false;
    }
  }, []);

  const downloadWithResponse = useCallback(async (
    endpoint: string
  ): Promise<ToonDownloadResponse | null> => {
    setDownloading(true);
    setProgress(0);
    setError('');

    try {
      const blob = await toonClient.toonDownload(endpoint);
      
      setProgress(100);
      setDownloading(false);
      
      return {
        blob,
        headers: {},
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Download failed';
      setError(errorMsg);
      setDownloading(false);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setDownloading(false);
    setProgress(0);
    setError('');
  }, []);

  return {
    downloading,
    progress,
    error,
    download,
    downloadWithResponse,
    reset,
  };
}

/**
 * Custom fetch wrapper for TOON reports with streaming and header parsing
 */
export async function generateAndDownloadReport(
  reportRequest: Record<string, any>
): Promise<{ success: boolean; reportMetadata?: Record<string, any>; error?: string }> {
  try {
    const toonPayload = ToonCodec.encode(reportRequest);

    const response = await fetch('/api/reports/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
      },
      body: toonPayload,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorData = ToonCodec.decode(errorText);
      return {
        success: false,
        error: errorData.ERR || 'Failed to generate report',
      };
    }

    // Parse X-TOON-RESP header if present
    const toonRespHeader = response.headers.get('X-TOON-RESP');
    let reportMetadata: Record<string, any> = {};
    
    if (toonRespHeader) {
      reportMetadata = ToonCodec.decode(toonRespHeader);
    }

    // Get blob
    const blob = await response.blob();
    
    // Generate filename
    const filename = `attendance_report_${reportRequest.R1 || Date.now()}.${reportRequest.O1 === 'CSV' ? 'csv' : 'xlsx'}`;
    
    // Trigger download
    ToonClient.triggerDownload(blob, filename);

    return {
      success: true,
      reportMetadata,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Hook for managing reports list and individual report operations
 */
export function useReports() {
  const [reports, setReports] = useState<ReportMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await toonClient.toonGet('/reports');
      
      if (response.REPORTS) {
        // Parse batch of reports separated by ||
        const reportStrings = response.REPORTS.split('||');
        const parsedReports: ReportMetadata[] = reportStrings.map((reportStr: string) => {
          return ToonCodec.decode(reportStr) as ReportMetadata;
        });
        setReports(parsedReports);
      } else {
        setReports([]);
      }

      setLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch reports';
      setError(errorMsg);
      setLoading(false);
    }
  }, []);

  const generateReport = useCallback(async (request: ReportRequest) => {
    setLoading(true);
    setError('');

    const result = await generateAndDownloadReport(request);
    
    setLoading(false);

    if (result.success) {
      // Refresh reports list after generation
      await fetchReports();
    } else {
      setError(result.error || 'Failed to generate report');
    }

    return result;
  }, [fetchReports]);

  const downloadReport = useCallback(async (report: ReportMetadata) => {
    try {
      const blob = await toonClient.toonDownload(`/reports/${report.R1}/download`);
      const filename = `${report.R1}.${report.DOWNLOAD_TOKEN?.includes('xlsx') ? 'xlsx' : 'csv'}`;
      ToonClient.triggerDownload(blob, filename);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
      return false;
    }
  }, []);

  const deleteReport = useCallback(async (reportId: string) => {
    setLoading(true);
    setError('');

    try {
      await toonClient.toonDelete(`/reports/${reportId}`);
      await fetchReports();
      setLoading(false);
      return true;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete report';
      setError(errorMsg);
      setLoading(false);
      return false;
    }
  }, [fetchReports]);

  return {
    reports,
    loading,
    error,
    fetchReports,
    generateReport,
    downloadReport,
    deleteReport,
  };
}
