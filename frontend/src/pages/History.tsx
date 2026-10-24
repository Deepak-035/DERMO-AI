import { useEffect, useState } from 'react';
import { FloatingNav } from '@/components/FloatingNav';
import { Footer } from '@/components/Footer';
import {
  Loader2,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import {
  getHistory,
  deleteHistory,
  getImageUrl,
  downloadReport,
  type HistoryItem,
} from '@/services/api';

export default function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHistoryData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const items = await getHistory();
      setHistory(items);
    } catch (err: any) {
      console.error('Failed to load history:', err);
      setError(err.message || 'Failed to retrieve screening history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this screening specimen and associated diagnostic archive?')) return;
    setDeletingId(id);
    try {
      await deleteHistory(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(`Error deleting record: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownloadPdf = async (predictionId: number) => {
    setDownloadingId(predictionId);
    try {
      const { blob, filename } = await downloadReport(
        undefined,
        `/reports/prediction/${predictionId}/download`
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setDownloadSuccessId(predictionId);
      setTimeout(() => setDownloadSuccessId(null), 3000);
    } catch (err: any) {
      alert(`Error downloading report: ${err.message}`);
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <FloatingNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-border pb-6 mb-8">
          <div>
            <span className="section-label">Audit Trail & Archive</span>
            <h1 className="text-3xl sm:text-4xl font-serif text-text mt-1">
              Screening Specimen History
            </h1>
            <p className="text-sm text-muted mt-1">
              Cryptographically isolated records belonging exclusively to your authenticated identity.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-muted">
              TOTAL SPECIMENS: <strong className="text-text">{history.length}</strong>
            </span>
            <button
              type="button"
              onClick={fetchHistoryData}
              disabled={isLoading}
              className="btn-secondary text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh Records</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-sm bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-semibold block">Archive Retrieval Error</span>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted border border-border bg-surface rounded-sm">
            <Loader2 className="w-8 h-8 animate-spin text-accent mb-3" />
            <p className="font-mono text-xs uppercase tracking-wider">
              Querying encrypted records from database…
            </p>
          </div>
        ) : history.length === 0 && !error ? (
          <div className="border border-border bg-surface p-12 sm:p-16 text-center rounded-sm">
            <div className="w-12 h-12 flex items-center justify-center border border-border rounded-sm bg-bg mx-auto mb-4">
              <FileSpreadsheet className="w-6 h-6 text-muted" />
            </div>
            <h3 className="text-xl font-serif text-text mb-2">No Archived Specimens</h3>
            <p className="text-sm text-muted max-w-md mx-auto mb-6">
              You have not performed any skin screening analyses yet. Submit a new scan to begin building your longitudinal history.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item) => {
              const formattedDate = item.created_at
                ? new Date(item.created_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Recent';

              return (
                <div
                  key={item.id}
                  className="border border-border bg-surface rounded-sm flex flex-col justify-between hover:border-accent transition-colors"
                >
                  <div>
                    {/* Thumbnail + Delete header */}
                    <div className="relative border-b border-border bg-bg/50 h-48 overflow-hidden">
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.prediction}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=400&q=80';
                        }}
                      />
                      <div className="absolute top-2 left-2 font-mono text-[11px] bg-surface/90 backdrop-blur-sm border border-border px-2 py-0.5 rounded-sm">
                        #{item.id}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="absolute top-2 right-2 p-1.5 rounded-sm bg-surface/90 border border-border text-muted hover:text-rose-600 hover:border-rose-500 transition-colors disabled:opacity-50"
                        title="Delete specimen"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Metadata */}
                    <div className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs uppercase px-2 py-0.5 border border-border rounded-sm bg-bg text-text">
                          {item.code ? item.code.toUpperCase() : 'DX'}
                        </span>
                        <span className="font-mono text-xs font-semibold text-accent">
                          {item.confidence}% Match
                        </span>
                      </div>

                      <h3 className="text-lg font-serif text-text leading-snug">
                        {item.prediction}
                      </h3>

                      <p className="text-xs font-mono text-muted">{formattedDate}</p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="p-4 border-t border-border bg-bg/30 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(item.id)}
                      disabled={downloadingId === item.id}
                      className="btn-secondary text-xs py-1.5 px-3 min-h-[36px]"
                    >
                      {downloadingId === item.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating…</span>
                        </>
                      ) : downloadSuccessId === item.id ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Downloaded</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download Report</span>
                        </>
                      )}
                    </button>

                    <span className="font-mono text-[11px] text-muted">PDF Vector</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
