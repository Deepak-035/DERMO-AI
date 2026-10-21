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
        className={
          className ||
          `
          inline-flex items-center justify-center gap-2
          rounded-xl border border-cyan-300/60
          bg-gradient-to-r from-cyan-600 to-blue-600
          px-6 py-3
          text-sm font-semibold text-white
          shadow-lg shadow-cyan-500/20
          transition-all duration-300
          hover:from-cyan-500 hover:to-blue-500
          hover:border-cyan-200
          hover:shadow-xl hover:shadow-cyan-400/30
          hover:-translate-y-0.5
          active:translate-y-0
          disabled:cursor-not-allowed
          disabled:opacity-50
          disabled:hover:translate-y-0
        `
        }
      >
        {loading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Preparing PDF...</span>
          </>
        ) : success ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-emerald-300" />
            <span>Report Downloaded!</span>
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            <span>Download PDF Report</span>
          </>
        )}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 mt-1 font-medium bg-red-500/10 border border-red-500/20 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p role="alert">{error}</p>
        </div>
      )}
    </div>
  );
}
