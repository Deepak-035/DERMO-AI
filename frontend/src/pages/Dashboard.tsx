import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingNav } from '@/components/FloatingNav';
import { BackgroundVideo } from '@/components/BackgroundVideo';
import { LevitatingCard } from '@/components/LevitatingCard';
import { useAuth } from '@/context/AuthContext';
import { checkHealth } from '@/services/api';
import {
  BrainCircuit,
  Activity,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth().then(setIsBackendHealthy);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden pt-24 px-4 pb-12 bg-slate-950">
      <BackgroundVideo />
      <FloatingNav />

      <main className="max-w-6xl mx-auto mt-8 space-y-12">
        {/* Welcome & ML Hero Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs backdrop-blur-md">
              {isBackendHealthy === null ? (
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
              ) : isBackendHealthy ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-slate-300">
                {isBackendHealthy === null
                  ? 'Checking ML API connection...'
                  : isBackendHealthy
                  ? 'FastAPI Backend Online & Ready'
                  : 'Backend Disconnected (Run python backend)'}
              </span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 leading-tight">
              Clinical Skin Disease Classification
            </h1>

            <p className="text-base text-slate-300 leading-relaxed bg-black/40 p-5 rounded-2xl border border-white/10 backdrop-blur-md">
              Welcome back, <strong className="text-cyan-300">{profile?.full_name || 'User'}</strong>.
              DERMO-AI combines local feature extraction with global attention mechanisms to deliver precise dermatological screening with end-to-end patient privacy.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4">
              <button
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20"
                onClick={() => navigate('/predict')}
              >
                Analyze Skin Image
              </button>
              <button
                className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all border border-white/15"
                onClick={() => navigate('/history')}
              >
                View My History
              </button>
            </div>
          </motion.div>

          {/* Info Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <LevitatingCard hoverEffect className="col-span-1 sm:col-span-2">
              <div className="flex items-start gap-4 pb-1">
                <div className="p-3 bg-cyan-500/20 rounded-xl text-cyan-400">
                  <BrainCircuit className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-1">Hybrid Feature Fusion</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    Combining CNN spatial hierarchies with Vision Transformer attention for multi-class skin lesion recognition.
                  </p>
                </div>
              </div>
            </LevitatingCard>

            <LevitatingCard hoverEffect>
              <div className="flex flex-col items-center text-center gap-2 pb-1">
                <div className="p-2.5 bg-blue-500/20 rounded-full text-blue-400">
                  <Activity className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-white">Private Storage</h3>
                <p className="text-slate-400 text-xs">Patient images & PDFs isolated under user-scoped UUID paths.</p>
              </div>
            </LevitatingCard>

            <LevitatingCard hoverEffect>
              <div className="flex flex-col items-center text-center gap-2 pb-1">
                <div className="p-2.5 bg-emerald-500/20 rounded-full text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-sm text-white">Secure by Design</h3>
                <p className="text-slate-400 text-xs">Row Level Security enforces data isolation per authenticated user.</p>
              </div>
            </LevitatingCard>
          </div>
        </div>
      </main>
    </div>
  );
}
