import { useState, useEffect } from 'react';
import { FloatingNav } from '@/components/FloatingNav';
import { BackgroundVideo } from '@/components/BackgroundVideo';
import { LevitatingCard } from '@/components/LevitatingCard';
import {
  getDoctorPatients,
  getDoctorPatientPredictions,
  type SharedPatient,
  type HistoryItem,
  downloadReport,
} from '@/services/api';
import {
  Stethoscope,
  Users,
  Calendar,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState<SharedPatient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<SharedPatient | null>(null);
  const [patientRecords, setPatientRecords] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [downloadSuccessId, setDownloadSuccessId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDoctorPatients();
      setPatients(data);
      if (data.length > 0) {
        selectPatient(data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load consenting patients:', err);
      setError(err?.message || 'Could not load consenting patients.');
    } finally {
      setLoading(false);
    }
  };

  const selectPatient = async (patient: SharedPatient) => {
    setSelectedPatient(patient);
    setLoadingRecords(true);
    try {
      const records = await getDoctorPatientPredictions(patient.patient_id);
      setPatientRecords(records);
    } catch (err: any) {
      console.error('Failed loading patient records:', err);
      setError('Unable to load clinical records for this patient (access may have been revoked).');
      setPatientRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleDownloadPatientReport = async (record: HistoryItem) => {
    setDownloadingId(record.id);
    try {
      // Use prediction-based report download endpoint
      const { blob, filename } = await downloadReport(undefined, `/reports/prediction/${record.id}/download`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setDownloadSuccessId(record.id);
      setTimeout(() => setDownloadSuccessId(null), 3000);
    } catch (err: any) {
      console.error('Error downloading patient report:', err);
      alert(err?.message || 'Failed to download report.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden pt-24 px-4 pb-12 flex flex-col items-center bg-slate-950">
      <BackgroundVideo />
      <FloatingNav />

      <main className="w-full max-w-6xl mt-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-slate-900/80 border border-emerald-500/30 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                Clinical Doctor Portal
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Approved Practitioner
                </span>
              </h1>
              <p className="text-slate-400 text-xs mt-0.5">
                Review clinical records of patients who have granted active consent
              </p>
            </div>
          </div>

          <button
            onClick={loadPatients}
            className="self-start md:self-auto px-4 py-2 rounded-xl text-xs font-semibold text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/10 transition-colors"
          >
            Refresh Consents
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center gap-3 text-red-200 text-xs">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Consenting Patients List */}
          <LevitatingCard className="p-5 lg:col-span-1 border-white/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                Consenting Patients ({patients.length})
              </h2>
            </div>

            {loading ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                <span className="text-xs">Loading active consents...</span>
              </div>
            ) : patients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <Users className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                <p>No patients have actively shared their records with you yet.</p>
                <p className="text-slate-500 mt-1">Patients can authorize you from their dashboard.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {patients.map((p) => {
                  const isSelected = selectedPatient?.patient_id === p.patient_id;
                  return (
                    <button
                      key={p.grant_id}
                      onClick={() => selectPatient(p)}
                      className={`
                        w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between
                        ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-500/60 shadow-lg shadow-emerald-500/10'
                            : 'bg-white/5 border-white/5 hover:border-white/20'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-200 flex-shrink-0">
                          {p.profile.full_name?.charAt(0) || 'P'}
                        </div>
                        <div className="truncate">
                          <p className="text-sm font-semibold text-white truncate">
                            {p.profile.full_name || 'Patient'}
                          </p>
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            {new Date(p.granted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                        {p.predictions_count} scans
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </LevitatingCard>

          {/* Right Column: Selected Patient Clinical Records */}
          <LevitatingCard className="p-6 lg:col-span-2 border-white/10">
            {selectedPatient ? (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div>
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Patient Clinical File
                    </span>
                    <h2 className="text-xl font-bold text-white">
                      {selectedPatient.profile.full_name || 'Patient'}
                    </h2>
                    {selectedPatient.notes && (
                      <p className="text-xs text-slate-400 mt-1 italic">
                        Consent Note: "{selectedPatient.notes}"
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                      Active Sharing Grant
                    </span>
                  </div>
                </div>

                {loadingRecords ? (
                  <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-400 mb-2" />
                    <span className="text-xs">Decrypting and loading authorized records...</span>
                  </div>
                ) : patientRecords.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-sm">
                    <FileText className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p>No screening records uploaded by this patient yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {patientRecords.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 rounded-xl bg-slate-900/60 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          <img
                            src={rec.image_url}
                            alt="Scan"
                            className="w-16 h-16 rounded-lg object-cover border border-white/10 shadow-md bg-slate-800"
                          />
                          <div>
                            <span className="text-xs font-bold text-cyan-400 font-mono uppercase">
                              {rec.code}
                            </span>
                            <h3 className="text-base font-bold text-white">
                              {rec.prediction}
                            </h3>
                            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                              <span>Confidence: <strong className="text-emerald-400">{rec.confidence}%</strong></span>
                              <span>•</span>
                              <span>{new Date(rec.created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => handleDownloadPatientReport(rec)}
                            disabled={downloadingId === rec.id}
                            className="
                              inline-flex items-center gap-1.5 px-3.5 py-2
                              rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white
                              text-xs font-semibold shadow-md transition-all
                              disabled:opacity-50 disabled:cursor-not-allowed
                            "
                          >
                            {downloadingId === rec.id ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>PDF...</span>
                              </>
                            ) : downloadSuccessId === rec.id ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                <span>Downloaded</span>
                              </>
                            ) : (
                              <>
                                <Download className="w-3.5 h-3.5" />
                                <span>Download PDF</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-sm">
                <Eye className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p>Select a consenting patient from the left panel to review clinical records.</p>
              </div>
            )}
          </LevitatingCard>
        </div>
      </main>
    </div>
  );
}
