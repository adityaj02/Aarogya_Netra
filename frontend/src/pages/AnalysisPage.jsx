import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Scan, Brain, BarChart2, FileText, Timer } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { runHierarchicalScreening } from '../services/api';

const PIPELINE_STAGES = [
  { id: 1, icon: Scan,     labelKey: 'stagePreprocessing', label: 'Preprocessing image',      hint: 'Checking quality and normalizing the fundus photograph.' },
  { id: 2, icon: Brain,    labelKey: 'stepScreening',      label: 'Stage 1: DR Screening',    hint: 'Binary classification — detecting presence of diabetic retinopathy.' },
  { id: 3, icon: BarChart2, labelKey: 'stepSeverity',      label: 'Stage 2: Severity Grading', hint: 'Grading severity across 5 levels (Grade 0–4).' },
  { id: 4, icon: FileText, labelKey: 'stepExplanation',    label: 'Generating explanation',   hint: 'Creating a clinical summary from the AI findings.' },
];

export default function AnalysisPage({ patient, imageData, sampleMeta, onAnalysisComplete, onError }) {
  const { t, lang } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    let isMounted = true;

    async function execute() {
      try {
        const result = await runHierarchicalScreening({
          patient, imageData, sampleMeta, lang,
          onStepProgress: ({ step }) => { if (isMounted) setCurrentStep(step); }
        });
        if (isMounted) {
          setTimeout(() => onAnalysisComplete(result), 500);
        }
      } catch (err) {
        console.error('Analysis error:', err);
        if (isMounted && onError) onError(err);
      }
    }

    execute();
    return () => { isMounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      flex: 1,
      background: 'linear-gradient(145deg, #eef5ff 0%, #e8f4fd 60%, #ddeeff 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 16px',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 560 }}
      >
        <div style={{
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.95)',
          borderRadius: 24,
          padding: '40px 36px',
          boxShadow: '0 20px 48px -12px rgba(28,95,160,0.14)',
        }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: 6 }}>
              {t('analysisTitle', 'AI Screening in Progress')}
            </h2>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', margin: 0 }}>
              {t('analyzingRetina', 'Analyzing your retinal image — this takes 15–30 seconds.')}
            </p>
          </div>

          {/* Fundus image with scan line */}
          {imageData && (
            <div className="scan-wrapper" style={{ marginBottom: 28 }}>
              <img
                src={imageData}
                alt="Retinal fundus image being analyzed"
                style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', display: 'block', opacity: 0.9, filter: 'contrast(1.05)' }}
              />
              <div className="scan-line" aria-hidden="true" />
            </div>
          )}

          {/* Pipeline stages */}
          <ul
            className="progress-list"
            role="status"
            aria-live="polite"
            aria-label="Analysis pipeline progress"
            style={{ margin: 0 }}
          >
            {PIPELINE_STAGES.map((stage) => {
              const isCompleted = currentStep > stage.id;
              const isActive    = currentStep === stage.id;
              const Icon        = stage.icon;

              return (
                <motion.li
                  key={stage.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: stage.id * 0.08, duration: 0.3 }}
                  className={`progress-item${isCompleted ? ' completed' : ''}${isActive ? ' active' : ''}`}
                >
                  <div className="progress-badge">
                    <AnimatePresence mode="wait" initial={false}>
                      {isCompleted ? (
                        <motion.span
                          key="check"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        >
                          <Check size={14} strokeWidth={3} aria-hidden="true" />
                        </motion.span>
                      ) : isActive ? (
                        <motion.span key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                        </motion.span>
                      ) : (
                        <motion.span key="icon" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                          <Icon size={14} strokeWidth={1.5} aria-hidden="true" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                      {t(stage.labelKey, stage.label)}
                    </div>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: 2, lineHeight: 1.4 }}
                      >
                        {stage.hint}
                      </motion.div>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>

          {/* Estimated time */}
          <p style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 20, marginBottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
            <Timer size={13} strokeWidth={1.75} aria-hidden="true" style={{ color: 'var(--primary)' }} />
            Estimated time: 15–30 seconds
          </p>
        </div>
      </motion.div>
    </div>
  );
}
