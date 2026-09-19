import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Stepper({ currentStep }) {
  const { t } = useLanguage();

  const steps = [
    { id: 1, label: t('patientInfoTitle', 'Patient Info') },
    { id: 2, label: t('stepUpload', 'Fundus Upload') },
    { id: 3, label: t('stepResults', 'Results') },
  ];

  return (
    <div className="stepper-strip" role="navigation" aria-label="Screening progress">
      <div className="stepper-inner">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', maxWidth: 520, margin: '0 auto' }}>

          {/* Base track */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 16,
              left: '16.66%',
              right: '16.66%',
              height: 2,
              background: 'var(--border-subtle)',
              zIndex: 0,
            }}
          />

          {/* Animated progress fill */}
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 16,
              left: '16.66%',
              height: 2,
              background: 'var(--primary)',
              zIndex: 0,
              originX: 0,
            }}
            animate={{
              width: currentStep === 1 ? '0%'
                : currentStep === 2 ? '33.33%'
                : '66.66%',
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />

          {steps.map(({ id, label }) => {
            const isCompleted = currentStep > id;
            const isActive    = currentStep === id;
            const isFuture    = currentStep < id;

            return (
              <div
                key={id}
                style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '33.33%' }}
              >
                {/* Circle */}
                <motion.div
                  initial={false}
                  animate={{
                    scale: isActive ? 1 : isCompleted ? [1, 1.15, 1] : 1,
                    backgroundColor: isCompleted ? 'var(--primary)' : isActive ? 'var(--primary)' : 'white',
                    borderColor: isCompleted ? 'var(--primary)' : isActive ? 'var(--primary)' : 'var(--border)',
                    color: isCompleted || isActive ? 'white' : 'var(--text-tertiary)',
                  }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  aria-current={isActive ? 'step' : undefined}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    border: '2px solid',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    boxShadow: isActive
                      ? '0 0 0 4px rgba(2, 132, 199, 0.15)'
                      : 'none',
                  }}
                >
                  {isCompleted
                    ? <Check size={16} strokeWidth={3} aria-hidden="true" />
                    : <span aria-hidden="true">{id}</span>
                  }
                  {/* Visually hidden status text */}
                  <span className="sr-only">
                    {isCompleted ? `${label} — completed` : isActive ? `${label} — current step` : `${label} — upcoming`}
                  </span>
                </motion.div>

                {/* Label */}
                <motion.span
                  initial={false}
                  animate={{
                    color: isActive ? 'var(--primary)' : isCompleted ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                    fontWeight: isActive ? 700 : isCompleted ? 600 : 400,
                  }}
                  style={{
                    marginTop: 8,
                    fontSize: '0.8125rem',
                    textAlign: 'center',
                    lineHeight: 1.3,
                    maxWidth: 90,
                  }}
                >
                  {label}
                </motion.span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
