import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { runHierarchicalScreening } from '../services/api';

export default function AnalysisPage({
  patient,
  imageData,
  sampleMeta,
  onAnalysisComplete,
  onError
}) {
  const { t, lang } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { id: 1, labelKey: 'stepScreening' },
    { id: 2, labelKey: 'stepSeverity' },
    { id: 3, labelKey: 'stepExplanation' }
  ];

  useEffect(() => {
    let isMounted = true;

    async function execute() {
      try {
        const result = await runHierarchicalScreening({
          patient,
          imageData,
          sampleMeta,
          lang,
          onStepProgress: ({ step }) => {
            if (isMounted) {
              setCurrentStep(step);
            }
          }
        });

        if (isMounted) {
          // Brief pause after all 4 checkmarks light up before showing result
          setTimeout(() => {
            onAnalysisComplete(result);
          }, 400);
        }
      } catch (err) {
        console.error('Analysis error:', err);
        if (isMounted && onError) {
          onError(err);
        }
      }
    }

    execute();

    return () => {
      isMounted = false;
    };
  }, [patient, imageData, sampleMeta, onAnalysisComplete, onError]);

  return (
    <div style={{ maxWidth: '540px', margin: '20px auto' }}>
      <div className="clean-card" style={{ textAlign: 'center' }}>
        <h2 style={{ marginBottom: '4px' }}>{t('analysisTitle')}</h2>
        <p className="subtitle" style={{ marginBottom: '24px' }}>
          {t('analyzingRetina')}
        </p>

        {/* Retinal Scanning Animation View */}
        <div className="scan-wrapper">
          <img
            src={imageData}
            alt="Scanning Fundus"
            className="preview-img"
            style={{ opacity: 0.85, filter: 'contrast(1.1)' }}
          />
          {/* Subtle glowing laser scanning line */}
          <div className="scan-line" aria-hidden="true" />
        </div>

        {/* 4 SRS Progress Stages */}
        <ul className="progress-list" role="status" aria-live="polite">
          {steps.map((s) => {
            const isCompleted = currentStep > s.id;
            const isActive = currentStep === s.id;

            return (
              <li
                key={s.id}
                className={`progress-item ${isCompleted ? 'completed' : ''} ${isActive ? 'active' : ''}`}
              >
                <div className="progress-badge">
                  {isCompleted ? (
                    <Check size={16} strokeWidth={3} />
                  ) : isActive ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <span>{s.id}</span>
                  )}
                </div>
                <span>{t(s.labelKey)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
