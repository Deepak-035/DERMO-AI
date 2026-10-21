import { useEffect, useState } from 'react';
import {
  BookOpen,
  AlertTriangle,
  ShieldCheck,
  Stethoscope,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  ExternalLink,
  HelpCircle,
  FileText,
  Activity,
} from 'lucide-react';
import { getEducationalGuide, type SkinConditionGuide as GuideType } from '@/services/api';
import { mapModelClassToKey } from '@/utils/classMapping';

interface SkinConditionGuideProps {
  predictionLabel: string;
  predictionCode?: string;
  className?: string;
}

export default function SkinConditionGuide({
  predictionLabel,
  predictionCode,
  className = '',
}: SkinConditionGuideProps) {
  const [guide, setGuide] = useState<GuideType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    about: true,
    riskFactors: true,
    warningSigns: true,
    prevention: false,
    nextSteps: true,
    treatment: false,
    sources: false,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const setAllSections = (isOpen: boolean) => {
    setOpenSections({
      about: isOpen,
      riskFactors: isOpen,
      warningSigns: isOpen,
      prevention: isOpen,
      nextSteps: isOpen,
      treatment: isOpen,
      sources: isOpen,
    });
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchGuide() {
      setLoading(true);
      setError(null);

      // Resolve to canonical class_key
      const resolvedKey = mapModelClassToKey(predictionCode) || mapModelClassToKey(predictionLabel);

      if (!resolvedKey) {
        if (isMounted) {
          setGuide(null);
          setLoading(false);
        }
        return;
      }

      try {
        const data = await getEducationalGuide(resolvedKey);
        if (isMounted) {
          if (data) {
            setGuide(data);
          } else {
            setError(`Educational guide for this condition is currently unavailable.`);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          console.error('Error loading educational guide:', err);
          setError('Unable to fetch educational content from backend server.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchGuide();

    return () => {
      isMounted = false;
    };
  }, [predictionLabel, predictionCode]);

  // Loading State
  if (loading) {
    return (
      <div className={`mt-8 rounded-2xl border border-cyan-500/30 bg-slate-900/60 p-6 backdrop-blur-md ${className}`}>
        <div className="flex items-center justify-center gap-3 py-8 text-cyan-300">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          <span className="text-sm font-medium">Retrieving verified educational guide...</span>
        </div>
      </div>
    );
  }

  // Unmapped or Non-Lesion Condition
  const resolvedKey = mapModelClassToKey(predictionCode) || mapModelClassToKey(predictionLabel);
  if (!resolvedKey) {
    return (
      <div className={`mt-8 rounded-2xl border border-slate-700/60 bg-slate-900/50 p-6 text-slate-300 ${className}`}>
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 flex-shrink-0 text-slate-400 mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold text-white">Educational Guide Notice</h4>
            <p className="mt-1 text-xs text-slate-400 leading-relaxed">
              Detailed educational guides are available specifically for the 7 primary skin-lesion classification
              classes. For conditions outside this scope, please consult a medical practitioner directly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !guide) {
    return (
      <div className={`mt-8 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-amber-300">Guide Temporarily Unavailable</h4>
            <p className="mt-1 text-xs text-amber-200/90">
              {error || 'Educational information for this condition could not be loaded.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Urgency badge styles
  const getUrgencyBadge = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'urgent':
        return {
          label: 'Urgent Clinical Review Recommended',
          classes: 'bg-red-500/20 text-red-300 border-red-500/40 shadow-red-500/10',
          dot: 'bg-red-400 animate-pulse',
        };
      case 'prompt':
        return {
          label: 'Prompt Dermatological Assessment Advised',
          classes: 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/10',
          dot: 'bg-amber-400',
        };
      default:
        return {
          label: 'Routine Dermatological Surveillance',
          classes: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/10',
          dot: 'bg-cyan-400',
        };
    }
  };

  const urgency = getUrgencyBadge(guide.urgency_level);

  return (
    <div
      className={`mt-8 rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl text-slate-200 transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Skin Condition Educational Guide
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white tracking-tight">
            {guide.display_name}
          </h3>
        </div>

        {/* Urgency Badge */}
        <div
          className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold shadow-sm ${urgency.classes}`}
        >
          <span className={`h-2 w-2 rounded-full ${urgency.dot}`} />
          <span>{urgency.label}</span>
        </div>
      </div>

      {/* Mandatory Medical Disclaimer Banner */}
      <div className="mt-5 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-yellow-200/90 space-y-1">
            <p className="font-semibold text-yellow-300 uppercase tracking-wide text-[11px]">
              Educational & Screening Disclaimer (Non-Diagnostic)
            </p>
            <p>
              This educational guide is provided for informational awareness only and reflects the AI model’s statistical prediction.
              <strong> An AI prediction is NOT a definitive medical diagnosis.</strong> Lesions cannot be confirmed benign or malignant
              without an in-person clinical exam and, when indicated, a dermatological biopsy.
            </p>
          </div>
        </div>
      </div>

      {/* Expand / Collapse Controls */}
      <div className="mt-6 flex justify-between items-center text-xs text-slate-400">
        <span className="font-medium">Medical Information Sections</span>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setAllSections(true)}
            className="hover:text-cyan-300 text-cyan-400/90 transition-colors"
          >
            Expand All
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setAllSections(false)}
            className="hover:text-cyan-300 text-cyan-400/90 transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="mt-3 space-y-3">
        {/* 1. About this condition */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('about')}
            className="w-full flex items-center justify-between p-4 text-left font-semibold text-white hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-cyan-400" />
              <span className="text-sm">1. About this condition</span>
            </div>
            {openSections.about ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {openSections.about && (
            <div className="px-4 pb-4 pt-1 text-sm text-slate-300 border-t border-white/5 leading-relaxed">
              <p>{guide.overview}</p>
            </div>
          )}
        </div>

        {/* 2. Causes and risk factors */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('riskFactors')}
            className="w-full flex items-center justify-between p-4 text-left font-semibold text-white hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Activity className="h-4 w-4 text-cyan-400" />
              <span className="text-sm">2. Causes and Risk Factors</span>
            </div>
            {openSections.riskFactors ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {openSections.riskFactors && (
            <div className="px-4 pb-4 pt-1 text-sm text-slate-300 border-t border-white/5 space-y-2">
              <p className="text-xs text-slate-400 italic">
                Note: Risk factors increase statistical likelihood but do not prove an individual direct cause.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                {guide.risk_factors.map((factor, idx) => (
                  <li key={idx} className="leading-relaxed">{factor}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 3. Warning signs */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('warningSigns')}
            className="w-full flex items-center justify-between p-4 text-left font-semibold text-white hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              <span className="text-sm">3. Warning Signs & Changes to Watch</span>
            </div>
            {openSections.warningSigns ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {openSections.warningSigns && (
            <div className="px-4 pb-4 pt-1 text-sm text-slate-300 border-t border-white/5 space-y-2">
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                {guide.warning_signs.map((sign, idx) => (
                  <li key={idx} className="leading-relaxed">{sign}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 4. Precautions and prevention */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('prevention')}
            className="w-full flex items-center justify-between p-4 text-left font-semibold text-white hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span className="text-sm">4. Precautions & Evidence-Based Prevention</span>
            </div>
            {openSections.prevention ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {openSections.prevention && (
            <div className="px-4 pb-4 pt-1 text-sm text-slate-300 border-t border-white/5 space-y-2">
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                {guide.prevention.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 5. Recommended next steps */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('nextSteps')}
            className="w-full flex items-center justify-between p-4 text-left font-semibold text-white hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Stethoscope className="h-4 w-4 text-cyan-400" />
              <span className="text-sm">5. Recommended Next Steps for You</span>
            </div>
            {openSections.nextSteps ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {openSections.nextSteps && (
            <div className="px-4 pb-4 pt-1 text-sm text-slate-300 border-t border-white/5 space-y-2">
              <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm">
                {guide.recommended_actions.map((action, idx) => (
                  <li key={idx} className="leading-relaxed font-medium text-cyan-100">{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 6. Treatment overview */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('treatment')}
            className="w-full flex items-center justify-between p-4 text-left font-semibold text-white hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Info className="h-4 w-4 text-purple-400" />
              <span className="text-sm">6. Clinician-Directed Treatment Overview</span>
            </div>
            {openSections.treatment ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {openSections.treatment && (
            <div className="px-4 pb-4 pt-1 text-sm text-slate-300 border-t border-white/5 space-y-2 leading-relaxed">
              <p>{guide.treatment_overview}</p>
              <p className="text-xs text-slate-400 italic">
                * Informational summary only. DERMO-AI never prescribes medications, dosages, or personalized treatment regimens.
              </p>
            </div>
          )}
        </div>

        {/* 7. Medical References & Review */}
        <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden transition-all">
          <button
            type="button"
            onClick={() => toggleSection('sources')}
            className="w-full flex items-center justify-between p-4 text-left font-semibold text-white hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <ExternalLink className="h-4 w-4 text-slate-400" />
              <span className="text-sm">7. References & Medical Review Status</span>
            </div>
            {openSections.sources ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {openSections.sources && (
            <div className="px-4 pb-4 pt-1 text-xs text-slate-400 border-t border-white/5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Review Status:</span>
                <span className="capitalize text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                  {guide.review_status}
                </span>
                {guide.reviewed_at && (
                  <span className="text-slate-500">
                    (Updated: {new Date(guide.reviewed_at).toLocaleDateString()})
                  </span>
                )}
              </div>
              <div>
                <p className="font-semibold text-slate-300 mb-1">Literature Sources:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {guide.sources.map((src, idx) => (
                    <li key={idx}>{src}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
