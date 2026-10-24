import React, { useState } from 'react';
import { FloatingNav } from '@/components/FloatingNav';
import { Footer } from '@/components/Footer';
import { UploadCloud, Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { predictImage, getImageUrl } from '@/services/api';
import DownloadReportButton from '@/components/DownloadReportButton';
import SkinConditionGuide from '@/components/SkinConditionGuide';

export default function Predict() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<{
    label: string;
    confidence: number;
    code: string;
    imageUrl: string;
    warnings: string[];
    reportId?: number;
    reportDownloadUrl?: string;
  } | null>(null);

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
    setResult(null);
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
          imageUrl: getImageUrl(response.result.image_url),
          warnings: response.warnings || [],
          reportId: response.result.report_id,
          reportDownloadUrl: response.result.report_download_url,
        });
      } else {
        throw new Error(response.message || 'Prediction failed');
      }
    } catch (err: any) {
      console.error('Prediction error:', err);
      setError(
        err.message || 'Failed to connect to backend inference server. Ensure FastAPI is running.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg text-text">
      <FloatingNav />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 md:py-14">
        {/* Page Header */}
        <div className="border-b border-border pb-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <span className="section-label">Screening Protocol</span>
              <h1 className="text-3xl sm:text-4xl font-serif text-text mt-1">
                Skin Lesion Diagnostic Intake
              </h1>
            </div>
            {result && (
              <button
                type="button"
                onClick={resetAnalysis}
                className="btn-secondary text-xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>New Specimen</span>
              </button>
            )}
          </div>
          <p className="text-sm text-muted mt-2 max-w-2xl">
            Upload high-resolution dermatoscope photographs or macro clinical captures. 
            All uploads are securely isolated and encrypted.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-sm bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-semibold block">Screening Pipeline Error</span>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {!result ? (
          <div className="border border-border bg-surface rounded-sm p-6 sm:p-10">
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border border-dashed border-border hover:border-accent p-8 sm:p-12 text-center transition-colors relative cursor-pointer bg-bg/50 rounded-sm"
            >
              <input
                type="file"
                accept="image/png, image/jpeg, image/jpg"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />

              {preview ? (
                <div className="flex flex-col items-center">
                  <div className="border border-border p-2 bg-surface rounded-sm mb-4">
                    <img
                      src={preview}
                      alt="Intake Preview"
                      className="max-h-72 object-contain rounded-sm"
                    />
                  </div>
                  <span className="font-mono text-xs text-muted">
                    {file?.name} ({(file!.size / 1024).toFixed(1)} KB)
                  </span>
                  <span className="text-xs text-accent mt-1 hover:underline">
                    Click or drag new file to replace
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 flex items-center justify-center border border-border rounded-sm bg-surface mb-4">
                    <UploadCloud className="w-6 h-6 text-muted" />
                  </div>
                  <h3 className="text-base font-serif text-text mb-1">
                    Select or drag clinical specimen
                  </h3>
                  <p className="text-xs text-muted mb-2">
                    Accepts PNG, JPG, or JPEG images up to 5MB
                  </p>
                  <span className="font-mono text-[11px] text-muted tracking-wider uppercase">
                    Resolution Recommendation: 500px+ Macro
                  </span>
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-border">
              <span className="text-xs text-muted">
                {file ? 'File loaded and ready for feature extraction' : 'No specimen loaded yet'}
              </span>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={!file || isAnalyzing}
                className="btn-primary w-full sm:w-auto"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Executing CNN-ViT Model...</span>
                  </>
                ) : (
                  <span>Run Diagnostic Inference</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Primary Analysis Result Card */}
            <div className="border border-border bg-surface rounded-sm p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                <span className="section-label">Screening Telemetry & Findings</span>
                <span className="font-mono text-xs text-muted">
                  CONFIDENCE: <strong className="text-text">{result.confidence}%</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                <div className="md:col-span-5">
                  <div className="border border-border p-2 bg-bg rounded-sm">
                    <img
                      src={result.imageUrl || preview!}
                      alt="Analyzed Lesion"
                      className="w-full h-64 object-cover rounded-sm"
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between font-mono text-[11px] text-muted">
                    <span>SPECIMEN RESOLVED</span>
                    <span>CODE: {result.code.toUpperCase()}</span>
                  </div>
                </div>

                <div className="md:col-span-7 space-y-6">
                  <div>
                    <span className="section-label">Differential Classification</span>
                    <h2 className="text-2xl sm:text-3xl font-serif text-text mt-1">
                      {result.label}
                    </h2>
                  </div>

                  {/* Meter */}
                  <div className="space-y-2">
                    <div className="flex justify-between font-mono text-xs">
                      <span className="text-muted">Calculated Model Likelihood</span>
                      <span className="font-semibold text-text">{result.confidence}%</span>
                    </div>
                    <div className="w-full h-2 bg-bg border border-border rounded-sm overflow-hidden">
                      <div
                        className="h-full bg-accent transition-all duration-500 ease-out"
                        style={{ width: `${Math.min(result.confidence, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Warnings */}
                  {result.warnings.length > 0 && (
                    <div className="border border-amber-500/40 bg-amber-500/10 p-4 rounded-sm text-xs space-y-2">
                      <span className="font-mono font-semibold tracking-wider uppercase text-amber-800 dark:text-amber-300 block">
                        Clinical Advisory
                      </span>
                      <ul className="list-disc pl-4 space-y-1 text-amber-900 dark:text-amber-200">
                        {result.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Report Download */}
                  {(result.reportId || result.reportDownloadUrl) && (
                    <div className="pt-2 border-t border-border">
                      <DownloadReportButton
                        reportId={result.reportId}
                        reportDownloadUrl={result.reportDownloadUrl}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Educational Guide */}
            <SkinConditionGuide
              predictionLabel={result.label}
              predictionCode={result.code}
            />
          </div>
        )}

        {/* Clinical Disclaimer Notice */}
        <div className="mt-12 p-4 border border-border bg-surface rounded-sm text-xs text-muted flex items-start gap-3">
          <CheckCircle2 className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
          <p>
            <strong className="text-text font-medium">Notice:</strong> DERMO-AI provides machine-learning 
            differential screening for educational and clinical research decision support. It does not replace 
            histopathological biopsy or in-person evaluation by a board-certified dermatologist.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
