import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingNav } from '@/components/FloatingNav';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/context/AuthContext';
import { checkHealth } from '@/services/api';
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Cpu,
  FileText,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth().then(setIsBackendHealthy);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <FloatingNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-16">
        {/* Status bar */}
        <div className="flex items-center justify-between pb-6 border-b border-border mb-10">
          <div className="flex items-center gap-2">
            <span
              className={`inline-block w-2.5 h-2.5 rounded-full ${
                isBackendHealthy === null
                  ? 'bg-amber-400 animate-pulse'
                  : isBackendHealthy
                  ? 'bg-emerald-500'
                  : 'bg-rose-500'
              }`}
            />
            <span className="font-mono text-xs tracking-wider uppercase text-muted">
              {isBackendHealthy === null
                ? 'Connecting to ML Pipeline…'
                : isBackendHealthy
                ? 'Inference Engine Active · FastAPI 8000'
                : 'Inference Engine Offline'}
            </span>
          </div>

          <div className="font-mono text-xs text-muted">
            SESSION: <span className="text-text font-medium">{profile?.email || 'Authenticated User'}</span>
          </div>
        </div>

        {/* Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-16">
          <div className="lg:col-span-8 space-y-6">
            <span className="section-label">Diagnostic Screening Interface</span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif tracking-tight text-text leading-tight">
              Clinical skin lesion classification & audit records.
            </h1>
            <p className="text-lg text-muted max-w-2xl leading-relaxed">
              Welcome, <strong className="text-text font-semibold">{profile?.full_name || 'Clinician'}</strong>. 
              DERMO-AI utilizes a hybrid convolutional and vision transformer pipeline to provide assisted dermatological 
              differential screening, private diagnostic archives, and patient-ready reporting.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/predict')}
                className="btn-primary"
              >
                <span>Upload New Scan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/history')}
                className="btn-secondary"
              >
                <span>Review History</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics / Status Card */}
          <div className="lg:col-span-4 border border-border p-6 bg-surface rounded-sm space-y-5">
            <div className="border-b border-border pb-3">
              <span className="section-label">System Specification</span>
            </div>

            <div className="space-y-4 text-sm">
              <div className="flex items-start justify-between">
                <span className="text-muted">Core Model</span>
                <span className="font-mono text-xs font-semibold text-text text-right">
                  CNN + ViT Hybrid
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-muted">Target Resolution</span>
                <span className="font-mono text-xs font-semibold text-text">
                  224 × 224 RGB
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-muted">Patient Storage</span>
                <span className="font-mono text-xs font-semibold text-text">
                  Isolated UUID RLS
                </span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-muted">Report Engine</span>
                <span className="font-mono text-xs font-semibold text-text">
                  ReportLab Vector PDF
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 text-xs text-muted">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Zero telemetry transmission outside private enclave.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 border-t border-border">
          <div className="p-6 border border-border bg-surface rounded-sm hover:border-accent transition-colors">
            <div className="w-10 h-10 flex items-center justify-center border border-border rounded-sm mb-4 bg-bg">
              <Cpu className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-serif mb-2">Dual-Stream Extraction</h3>
            <p className="text-sm text-muted leading-relaxed">
              High-frequency convolutional feature maps retain fine lesion boundary detail, while multi-head self-attention models macro-level context.
            </p>
          </div>

          <div className="p-6 border border-border bg-surface rounded-sm hover:border-accent transition-colors">
            <div className="w-10 h-10 flex items-center justify-center border border-border rounded-sm mb-4 bg-bg">
              <Activity className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-serif mb-2">Confidence Calibration</h3>
            <p className="text-sm text-muted leading-relaxed">
              Every inference provides probability scores, clinical warnings for ambiguous borders, and contextual condition guides for verified classes.
            </p>
          </div>

          <div className="p-6 border border-border bg-surface rounded-sm hover:border-accent transition-colors">
            <div className="w-10 h-10 flex items-center justify-center border border-border rounded-sm mb-4 bg-bg">
              <FileText className="w-5 h-5 text-accent" />
            </div>
            <h3 className="text-lg font-serif mb-2">Clinical Export & PDF</h3>
            <p className="text-sm text-muted leading-relaxed">
              Generate structured screening summary documents with patient identifier, model telemetry, and educational consultation guidelines.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
