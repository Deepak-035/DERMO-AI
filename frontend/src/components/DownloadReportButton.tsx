import { useState } from 'react';
import { downloadReport } from '@/services/api';
import { Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface DownloadReportButtonProps {
  reportId?: number;
  reportDownloadUrl?: string;
  className?: string;
}

export default function DownloadReportButton({
  reportId,
  reportDownloadUrl,
  className,
}: DownloadReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleDownload = async () => {
    if (!reportId && !reportDownloadUrl) {
      setError('Report download information is unavailable.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const { blob, filename } = await downloadReport(reportId, reportDownloadUrl);

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err: any) {
      console.error('Download report error:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred while downloading the report.'
      );
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || (!reportId && !reportDownloadUrl);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleDownload}
        disabled={isButtonDisabled}
        className={className || 'btn-primary text-sm'}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparing PDF…</span>
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="h-4 w-4" />
            <span>Downloaded</span>
          </>
        ) : (
          <>
            <Download className="h-4 w-4" />
            <span>Download PDF Report</span>
          </>
        )}
      </button>

      {error && (
        <div className="alert alert-error text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p role="alert">{error}</p>
        </div>
      )}
    </div>
  );
}
