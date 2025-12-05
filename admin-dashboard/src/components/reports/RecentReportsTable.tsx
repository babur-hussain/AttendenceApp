import type { ReportMetadata } from '../../types/report';

interface RecentReportsTableProps {
  reports: ReportMetadata[];
  onDownload: (report: ReportMetadata) => void;
  onRegenerate: (report: ReportMetadata) => void;
  onDelete: (report: ReportMetadata) => void;
  loading?: boolean;
}

export function RecentReportsTable({
  reports,
  onDownload,
  onRegenerate,
  onDelete,
  loading = false,
}: RecentReportsTableProps) {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(2)} MB`;
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ready: 'bg-green-100 text-green-800',
      generating: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No reports generated yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Report ID</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Range</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee Filter</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Generated</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {reports.map((report) => (
          <tr key={report.R1} className="hover:bg-gray-50">
            <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">{report.R1}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              {formatDate(report.T1)} - {formatDate(report.T2)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
              {report.E1 || 'All Employees'}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
              {report.GENERATED_AT ? new Date(report.GENERATED_AT).toLocaleString() : 'N/A'}
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
              {formatFileSize(report.FILE_SIZE)}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(report.S1)}</td>
            <td className="px-6 py-4 whitespace-nowrap">
              <div className="flex gap-2">
                <button
                  onClick={() => onDownload(report)}
                  disabled={report.S1 !== 'ready'}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Download
                </button>
                <button
                  onClick={() => onRegenerate(report)}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Regenerate
                </button>
                <button
                  onClick={() => onDelete(report)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    </div>
  );
}
