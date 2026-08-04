import React, { useState } from 'react';
import { FloatingNav } from '@/components/FloatingNav';
import { BackgroundVideo } from '@/components/BackgroundVideo';
import { LevitatingCard } from '@/components/LevitatingCard';
import { SecondaryButton } from '@/components/SecondaryButton';
import { UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { predictImage, getImageUrl } from '@/services/api';

export default function Predict() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ label: string; confidence: number; code: string; imageUrl: string } | null>(null);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setResult(null); // reset
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await predictImage(file);
      if (response.success && response.result) {
        setResult({
          label: response.result.prediction,
          confidence: response.result.confidence,
          code: response.result.code,
          imageUrl: getImageUrl(response.result.image_url) || preview!,
        });
      } else {
        throw new Error(response.message || 'Prediction failed');
      }
    } catch (err: any) {
      console.error('Prediction error:', err);
      setError(err.message || 'Failed to connect to backend server. Make sure FastAPI server is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden pt-24 px-4 pb-12 flex flex-col items-center">
      <BackgroundVideo />
      <FloatingNav />

      <main className="w-full max-w-3xl mt-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 border border-red-500/50 flex items-center gap-3 text-red-200">
            <AlertCircle className="w-6 h-6 flex-shrink-0 text-red-400" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {!result ? (
          <LevitatingCard className="p-8">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Analyze Skin Image</h2>
            
            <div 
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-cyan-500/50 rounded-2xl p-12 flex flex-col items-center justify-center text-center hover:border-cyan-400 transition-colors bg-white/5 cursor-pointer relative"
            >
              <input 
                type="file" 
                accept="image/png, image/jpeg, image/jpg" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
              
              {preview ? (
                <img src={preview} alt="Preview" className="max-h-64 rounded-lg object-contain mb-4 shadow-lg shadow-cyan-500/20" />
              ) : (
                <UploadCloud className="w-16 h-16 text-cyan-400 mb-4 animate-pulse" />
              )}
              
              {!preview && (
                <>
                  <p className="text-white font-medium mb-1">Drag and drop your image here</p>
                  <p className="text-slate-400 text-sm">Supports PNG, JPG, JPEG up to 5MB</p>
                </>
              )}
            </div>

            <div className="mt-8 flex justify-center">
              <SecondaryButton onClick={handleAnalyze} disabled={!file || isAnalyzing}>
                {isAnalyzing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing with Hybrid CNN-Transformer...
                  </span>
                ) : (
                  "Analyze Image"
                )}
              </SecondaryButton>
            </div>
          </LevitatingCard>
        ) : (
          <LevitatingCard className="p-8 border-green-500/30">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Analysis Result</h2>
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="flex justify-center">
                <img src={result.imageUrl || preview!} alt="Analyzed" className="rounded-xl border border-white/10 shadow-2xl shadow-cyan-500/30 max-h-64 object-cover" />
              </div>
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-slate-400 uppercase tracking-wider mb-1">Predicted Disease ({result.code.toUpperCase()})</p>
                  <h3 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-500">
                    {result.label}
                  </h3>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-300">Confidence</span>
                    <span className="text-cyan-400 font-bold">{result.confidence}%</span>
                  </div>
                  <Progress value={result.confidence} className="h-2 bg-slate-800" />
                </div>
                
                <div className="pt-4">
                  <button 
                    onClick={() => { setFile(null); setPreview(null); setResult(null); setError(null); }}
                    className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                  >
                    ← Analyze another image
                  </button>
                </div>
              </div>
            </div>
          </LevitatingCard>
        )}
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl z-50">
        <LevitatingCard className="p-3 text-center bg-black/60 border-yellow-500/30">
          <p className="text-yellow-500/90 text-xs">
            For informational and screening purposes only. Please consult a qualified dermatologist for official medical advice.
          </p>
        </LevitatingCard>
      </div>
    </div>
  );
}
