import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  Loader2,
  HelpCircle,
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
      <div className={`mt-8 border border-border bg-surface p-6 rounded-sm ${className}`}>
        <div className="flex items-center justify-center gap-3 py-8 text-muted">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
          <span className="font-mono text-xs uppercase tracking-wider">
            Retrieving peer-reviewed clinical guide…
          </span>
        </div>
      </div>
    );
  }

  // Unmapped or Non-Lesion Condition
  const resolvedKey = mapModelClassToKey(predictionCode) || mapModelClassToKey(predictionLabel);
  if (!resolvedKey) {
    return (
      <div className={`mt-8 border border-border bg-surface p-6 rounded-sm text-text ${className}`}>
        <div className="flex items-start gap-3">
          <HelpCircle className="h-5 w-5 flex-shrink-0 text-muted mt-0.5" />
          <div>
            <h4 className="text-sm font-semibold">Educational Reference Scope</h4>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              Standardized educational references are indexed for the seven primary clinical dermoscopy lesion classes.
              For rare or non-dermatoscopic conditions, refer directly to institutional clinical guidelines.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !guide) {
    return (
      <div className={`mt-8 border border-amber-500/30 bg-amber-500/10 p-6 rounded-sm text-amber-900 dark:text-amber-200 ${className}`}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-semibold">Reference Temporarily Unavailable</h4>
            <p className="mt-1 text-xs opacity-90">
              {error || 'Clinical educational data could not be retrieved from the server.'}
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
          label: 'Urgent Dermatological Evaluation Advised',
          classes: 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300',
          dot: 'bg-rose-500',
        };
      case 'prompt':
        return {
          label: 'Prompt Clinical Assessment Recommended',
          classes: 'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
          dot: 'bg-amber-500',
        };
      default:
        return {
          label: 'Routine Dermatological Surveillance',
          classes: 'border-border bg-bg text-muted',
          dot: 'bg-emerald-500',
        };
    }
  };

  const urgency = getUrgencyBadge(guide.urgency_level);

  return (
    <div className={`border border-border bg-surface p-6 sm:p-8 rounded-sm text-text ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="section-label">Peer-Reviewed Clinical Profile</span>
          <h3 className="text-2xl sm:text-3xl font-serif text-text mt-1">
            {guide.display_name}
          </h3>
        </div>

        <div className={`inline-flex items-center gap-2 px-3 py-1 border rounded-sm font-mono text-xs ${urgency.classes}`}>
          <span className={`h-2 w-2 rounded-full ${urgency.dot}`} />
          <span>{urgency.label}</span>
        </div>
      </div>

      {/* Mandatory Medical Disclaimer Banner */}
      <div className="mt-6 border border-border bg-bg/50 p-4 rounded-sm text-xs text-muted flex items-start gap-3">
        <Info className="h-4 w-4 text-accent flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-mono text-[11px] font-semibold tracking-wider uppercase text-text block">
            Clinical Reference Disclaimer
          </span>
          <p className="leading-relaxed">
            This dossier reflects evidence-based medical literature corresponding to the model's highest-probability class.
            Machine learning output is non-diagnostic; clinical histology and dermatoscopic evaluation remain the gold standard.
          </p>
        </div>
      </div>

      {/* Expand / Collapse Controls */}
      <div className="mt-6 flex justify-between items-center text-xs border-b border-border pb-3">
        <span className="font-mono text-muted uppercase tracking-wider text-[11px]">
          Clinical Modules
        </span>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setAllSections(true)}
            className="text-accent hover:underline font-medium"
          >
            Expand All
          </button>
          <span className="text-border">|</span>
          <button
            type="button"
            onClick={() => setAllSections(false)}
            className="text-muted hover:text-text font-medium"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Accordion Sections */}
      <div className="divide-y divide-border">
        {/* 1. Overview */}
        <div className="py-3">
          <button
            type="button"
            onClick={() => toggleSection('about')}
            className="w-full flex items-center justify-between py-2 text-left hover:text-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted">01</span>
              <span className="text-sm font-semibold">Clinical Overview & Pathophysiology</span>
            </div>
            {openSections.about ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {openSections.about && (
            <div className="pl-7 pr-2 pt-2 pb-3 text-sm text-muted leading-relaxed">
              <p>{guide.overview}</p>
            </div>
          )}
        </div>

        {/* 2. Risk factors */}
        <div className="py-3">
          <button
            type="button"
            onClick={() => toggleSection('riskFactors')}
            className="w-full flex items-center justify-between py-2 text-left hover:text-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted">02</span>
              <span className="text-sm font-semibold">Predisposition & Epidemiological Risk Factors</span>
            </div>
            {openSections.riskFactors ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {openSections.riskFactors && (
            <div className="pl-7 pr-2 pt-2 pb-3 text-sm text-muted space-y-2">
              <ul className="list-disc pl-4 space-y-1.5 text-xs sm:text-sm">
                {guide.risk_factors.map((factor, idx) => (
                  <li key={idx} className="leading-relaxed">{factor}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 3. Warning signs */}
        <div className="py-3">
          <button
            type="button"
            onClick={() => toggleSection('warningSigns')}
            className="w-full flex items-center justify-between py-2 text-left hover:text-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted">03</span>
              <span className="text-sm font-semibold">Diagnostic Warning Signs & Morphological Changes</span>
            </div>
            {openSections.warningSigns ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {openSections.warningSigns && (
            <div className="pl-7 pr-2 pt-2 pb-3 text-sm text-muted space-y-2">
              <ul className="list-disc pl-4 space-y-1.5 text-xs sm:text-sm">
                {guide.warning_signs.map((sign, idx) => (
                  <li key={idx} className="leading-relaxed">{sign}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 4. Prevention */}
        <div className="py-3">
          <button
            type="button"
            onClick={() => toggleSection('prevention')}
            className="w-full flex items-center justify-between py-2 text-left hover:text-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted">04</span>
              <span className="text-sm font-semibold">Evidence-Based Prevention & Photoprotection</span>
            </div>
            {openSections.prevention ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {openSections.prevention && (
            <div className="pl-7 pr-2 pt-2 pb-3 text-sm text-muted space-y-2">
              <ul className="list-disc pl-4 space-y-1.5 text-xs sm:text-sm">
                {guide.prevention.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 5. Recommended next steps */}
        <div className="py-3">
          <button
            type="button"
            onClick={() => toggleSection('nextSteps')}
            className="w-full flex items-center justify-between py-2 text-left hover:text-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted">05</span>
              <span className="text-sm font-semibold">Recommended Clinical Pathway & Next Steps</span>
            </div>
            {openSections.nextSteps ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {openSections.nextSteps && (
            <div className="pl-7 pr-2 pt-2 pb-3 text-sm text-muted space-y-2">
              <ul className="list-disc pl-4 space-y-1.5 text-xs sm:text-sm">
                {guide.recommended_actions.map((action, idx) => (
                  <li key={idx} className="leading-relaxed font-medium text-text">{action}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 6. Treatment overview */}
        <div className="py-3">
          <button
            type="button"
            onClick={() => toggleSection('treatment')}
            className="w-full flex items-center justify-between py-2 text-left hover:text-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted">06</span>
              <span className="text-sm font-semibold">Therapeutic Landscape Overview</span>
            </div>
            {openSections.treatment ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {openSections.treatment && (
            <div className="pl-7 pr-2 pt-2 pb-3 text-sm text-muted space-y-2 leading-relaxed">
              <p>{guide.treatment_overview}</p>
              <p className="text-xs text-muted italic border-t border-border pt-2 mt-2">
                * Informational summary of standard dermatological protocols. DERMO-AI never prescribes specific pharmaceutical dosing or regimens.
              </p>
            </div>
          )}
        </div>

        {/* 7. References */}
        <div className="py-3">
          <button
            type="button"
            onClick={() => toggleSection('sources')}
            className="w-full flex items-center justify-between py-2 text-left hover:text-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-muted">07</span>
              <span className="text-sm font-semibold">Peer-Reviewed Citations & Audit Metadata</span>
            </div>
            {openSections.sources ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}
          </button>
          {openSections.sources && (
            <div className="pl-7 pr-2 pt-2 pb-3 text-xs text-muted space-y-3">
              <div className="flex items-center gap-2">
                <span className="font-medium text-text">Review Status:</span>
                <span className="font-mono uppercase px-2 py-0.5 border border-border rounded-sm bg-bg text-emerald-600 dark:text-emerald-400">
                  {guide.review_status}
                </span>
                {guide.reviewed_at && (
                  <span className="font-mono text-muted">
                    ({new Date(guide.reviewed_at).toLocaleDateString()})
                  </span>
                )}
              </div>
              <div>
                <p className="font-medium text-text mb-1">Literature Sources:</p>
                <ul className="list-disc pl-4 space-y-1 font-mono text-[11px]">
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
