import React from 'react';
import { useToonDownload, generateAndDownloadReport } from '../../hooks/useReports';
import { Button } from '../common/Button';
import type { ReportRequest } from '../../types/report';

interface ReportDownloadButtonProps {
  reportRequest: ReportRequest;
  onSuccess?: (metadata: Record<string, any>) => void;
  onError?: (error: string) => void;
}

export function ReportDownloadButton({ 
  reportRequest, 
  onSuccess, 
  onError 
}: ReportDownloadButtonProps) {
  const { downloading, progress, error } = useToonDownload();
  const [generating, setGenerating] = React.useState(false);

  const handleDownload = async () => {
    setGenerating(true);

    const result = await generateAndDownloadReport(reportRequest);

    setGenerating(false);

    if (result.success) {
      onSuccess?.(result.reportMetadata || {});
    } else {
      onError?.(result.error || 'Unknown error');
    }
  };

  const isLoading = downloading || generating;
  const errorMsg = error;

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleDownload}
        disabled={isLoading}
        variant="primary"
      >
        {isLoading ? `Generating... ${progress}%` : 'Download Report'}
      </Button>
      
      {isLoading && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      
      {errorMsg && (
        <p className="text-sm text-red-600">{errorMsg}</p>
      )}
    </div>
  );
}
