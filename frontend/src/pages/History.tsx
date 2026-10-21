import { useEffect, useState } from 'react';
import { FloatingNav } from '@/components/FloatingNav';
import { BackgroundVideo } from '@/components/BackgroundVideo';
import { LevitatingCard } from '@/components/LevitatingCard';
import { motion } from 'framer-motion';
import { Loader2, Trash2, AlertCircle, FileSpreadsheet, Download, CheckCircle2 } from 'lucide-react';
import { getHistory, deleteHistory, getImageUrl, downloadReport, type HistoryItem } from '@/services/api';

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
      setError(err.message || 'Failed to load history. Ensure backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this prediction history record and image?')) return;
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
      const { blob, filename } = await downloadReport(undefined, `/reports/prediction/${predictionId}/download`);
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
    <div className="min-h-screen relative overflow-hidden pt-24 px-4 pb-12 bg-slate-950">
      <BackgroundVideo />
      <FloatingNav />

      <main className="max-w-6xl mx-auto mt-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Screening History</h1>
            <p className="text-slate-400 text-xs mt-1">
              Private dermatological records accessible only to you and authorized doctors
            </p>
          </div>
          <button
            onClick={fetchHistoryData}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all text-xs font-semibold disabled:opacity-50"
          >
            Refresh Records
          </button>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center gap-3 text-red-200 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-cyan-400 mb-4" />
            <p className="text-xs">Decrypting and loading your private records...</p>
          </div>
        ) : history.length === 0 && !error ? (
          <LevitatingCard className="p-12 text-center border-white/10">
            <FileSpreadsheet className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Predictions Found</h3>
            <p className="text-slate-400 text-xs max-w-md mx-auto mb-6">
              You haven't run any skin disease analyses yet. Go to the Predict page to upload an image.
            </p>
          </LevitatingCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((item, i) => {
              const formattedDate = item.created_at
                ? new Date(item.created_at).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : 'Recent';

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <LevitatingCard hoverEffect className="h-full flex flex-col p-4 relative group border-white/10">
                    <div className="rounded-xl overflow-hidden mb-3.5 border border-white/10 h-44 bg-slate-900 relative">
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.prediction}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=400&q=80';
                        }}
                      />
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deletingId === item.id}
                        className="absolute top-2 right-2 p-2 rounded-lg bg-red-600/80 hover:bg-red-600 text-white transition-all opacity-80 group-hover:opacity-100 disabled:opacity-50"
                        title="Delete record"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    <div className="flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold">
                            {item.code ? item.code.toUpperCase() : 'AI'}
                          </span>
                          <span className="text-cyan-400 font-extrabold text-xs">{item.confidence}%</span>
                        </div>
                        <h3 className="text-base font-bold text-white leading-snug">{item.prediction}</h3>
                        <p className="text-[11px] text-slate-400 mt-1">{formattedDate}</p>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(item.id)}
                          disabled={downloadingId === item.id}
                          className="
                            inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                            bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-400/30
                            text-cyan-200 text-xs font-semibold transition-all
                            disabled:opacity-50 disabled:cursor-not-allowed
                          "
                        >
                          {downloadingId === item.id ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : downloadSuccessId === item.id ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Downloaded!</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3 h-3" />
                              <span>Download PDF</span>
                            </>
                          )}
                        </button>
                        <span className="font-mono text-slate-500 text-[10px]">ID: #{item.id}</span>
                      </div>
                    </div>
                  </LevitatingCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
