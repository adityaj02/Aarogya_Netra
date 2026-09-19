import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Check } from 'lucide-react';

export default function Stepper({ currentStep }) {
  const { t } = useLanguage();
  const steps = [
    { id: 1, label: t('patientInfoTitle', 'Patient Information') },
    { id: 2, label: t('stepScreening', 'Eye Scan') },
    { id: 3, label: t('stepResults', 'Results') },
  ];

  // Calculate progress bar width based on active step
  const progressWidth = currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%';

  return (
    <div className="w-full mb-8">
      <div className="relative flex items-start justify-between max-w-[480px] mx-auto">
        {/* Base track - sits behind everything, vertically centered with the 32px circles (top: 16px) */}
        <div className="absolute top-[15px] left-[10%] right-[10%] h-[2px] bg-slate-200 z-0"></div>
        
        {/* Active progress */}
        <div 
          className="absolute top-[15px] left-[10%] h-[2px] bg-sky-500 z-0 transition-all duration-500 ease-in-out" 
          style={{ width: `calc(${progressWidth} * 0.8)` }} // 0.8 to account for left/right offsets
        ></div>

        {steps.map(({ id, label }) => {
          const isCompleted = currentStep > id;
          const isActive = currentStep === id;
          const isFuture = currentStep < id;

          return (
            <div key={id} className="relative z-10 flex flex-col items-center w-1/3">
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold transition-colors duration-300 ${
                  isCompleted ? 'bg-sky-500 text-white shadow-[var(--shadow-sm)]' :
                  isActive ? 'bg-sky-600 text-white shadow-[var(--shadow-md)] ring-4 ring-sky-100' :
                  'bg-white text-slate-400 border border-slate-300'
                }`}
              >
                {isCompleted ? <Check size={16} strokeWidth={3} /> : id}
              </div>
              <span 
                className={`mt-2 text-[14px] font-semibold text-center leading-tight ${
                  isActive ? 'text-sky-700' :
                  isCompleted ? 'text-slate-700' :
                  'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
