import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FloatingNav } from '@/components/FloatingNav';
import { BackgroundVideo } from '@/components/BackgroundVideo';
import { LevitatingCard } from '@/components/LevitatingCard';
import { BrainCircuit, Activity, Zap, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { checkHealth } from '@/services/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean | null>(null);

  useEffect(() => {
    checkHealth().then(setIsBackendHealthy);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden pt-24 px-4 pb-12">
      <BackgroundVideo />
      <FloatingNav />
      
      <main className="max-w-6xl mx-auto mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="space-y-8"
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

            <h1 className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600 leading-tight">
              Next-Gen Skin Disease Classification
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed bg-black/40 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
              An automated skin disease classification system leveraging a hybrid CNN-Transformer architecture. It combines local feature extraction with global attention mechanisms to assist in accurate dermatological screening.[1]
            </p>
            <div className="pt-4 flex items-center gap-4">
              <button className="btn" onClick={() => navigate('/predict')}>
                Get Started
              </button>
              <button 
                className="px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium text-sm transition-all border border-white/15" 
                onClick={() => navigate('/history')}
              >
                View History
              </button>
            </div>
          </motion.div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <LevitatingCard hoverEffect className="col-span-1 sm:col-span-2">
              <div className="flex items-start gap-4 pb-[5px]">
                <div className="p-3 bg-cyan-500/20 rounded-lg text-cyan-400">
                  <BrainCircuit className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">Hybrid Feature Fusion</h3>
                  <p className="text-slate-400 text-sm">Combining CNNs for spatial hierarchies with Transformers for global context.</p>
                </div>
              </div>
            </LevitatingCard>

            <LevitatingCard hoverEffect>
              <div className="flex flex-col items-center text-center gap-3 pb-[5px]">
                <div className="p-3 bg-blue-500/20 rounded-full text-blue-400">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white">High Accuracy</h3>
                <p className="text-slate-400 text-xs">State of the art precision metrics.</p>
              </div>
            </LevitatingCard>

            <LevitatingCard hoverEffect>
              <div className="flex flex-col items-center text-center gap-3 pb-[5px]">
                <div className="p-3 bg-purple-500/20 rounded-full text-purple-400">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-white">Real-time Processing</h3>
                <p className="text-slate-400 text-xs">Instantaneous screening results.</p>
              </div>
            </LevitatingCard>
          </div>
        </div>
      </main>
    </div>
  );
}
