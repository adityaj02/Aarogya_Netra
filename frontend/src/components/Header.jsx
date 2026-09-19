import React, { useState, useRef, useEffect } from 'react';
import { Eye, HelpCircle, FileText, ChevronDown, Check, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function Header({ currentView, setCurrentView, onOpenHelp }) {
  const { lang, setLang, t, languages } = useLanguage();
  const [isLangOpen, setIsLangOpen] = useState(false);
  const dockRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dockRef.current && !dockRef.current.contains(event.target)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLangLabel = languages.find(l => l.code === lang)?.label || 'English';

  return (
    <>
      {/* Ambient Background Layers (moved behind everything) */}
      <div aria-hidden="true" className="fixed inset-0 subtle-grid pointer-events-none z-0"></div>
      <div aria-hidden="true" className="fixed top-12 left-1/4 w-[480px] h-[480px] rounded-full bg-sky-200/50 blur-[110px] pointer-events-none -z-10"></div>
      <div aria-hidden="true" className="fixed bottom-0 right-10 w-[620px] h-[620px] rounded-full bg-blue-200/40 blur-[130px] pointer-events-none -z-10"></div>
      <div aria-hidden="true" className="fixed bottom-10 left-10 w-[420px] h-[420px] rounded-full bg-teal-100/40 blur-[100px] pointer-events-none -z-10"></div>

      <header className="sticky top-0 z-40 w-full px-6 lg:px-14 py-3 bg-white/95 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between animate-nav" data-purpose="site-navigation">
        
        {/* Brand Identity */}
        <div className="flex items-center cursor-pointer transition hover:opacity-95 outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-lg" onClick={() => setCurrentView('welcome')} data-purpose="brand-logo" tabIndex="0" aria-label="AarogyaNetra Home">
          <img src="/aarogyanetra_logo.svg" alt="" className="h-12 w-auto object-contain" />
        </div>

        {/* Screening Indicator (Visible during active screening flow) */}
        {(currentView === 'patient_info' || currentView === 'upload') && (
          <div className="hidden md:flex items-center gap-2 text-sm text-sky-700 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100 font-medium ml-4 mr-auto">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            Screening in progress
          </div>
        )}

        {/* Clean Right Navigation Row */}
        <nav ref={dockRef} aria-label="Site Navigation" className="flex items-center bg-white rounded-full px-4 py-2 shadow-[var(--shadow-sm)] border border-slate-200 gap-6">
          
          {/* Quick Scan */}
          <button 
            aria-label="Quick Scan" 
            className="flex items-center gap-2 text-[14px] font-medium text-slate-600 hover:text-sky-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md" 
            onClick={() => setCurrentView('patient_info')}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Quick Scan</span>
          </button>

          {/* Previous Reports */}
          <button 
            aria-label="Past Reports"
            className="flex items-center gap-2 text-[14px] font-medium text-slate-600 hover:text-sky-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md" 
            onClick={() => setCurrentView('reports')}
          >
            <FileText className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t('previousReports', 'Past Reports')}</span>
          </button>

          {/* Doctor Portal */}
          <button 
            aria-label="Doctor Portal"
            className="flex items-center gap-2 text-[14px] font-medium text-slate-600 hover:text-sky-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md" 
            onClick={() => setCurrentView('doctor_portal')}
          >
            <User className="w-4 h-4" aria-hidden="true" />
            <span className="hidden md:inline">Doctor Portal</span>
          </button>

          {/* Help & Guidance */}
          <button 
            aria-label="Help Guide"
            className="flex items-center gap-2 text-[14px] font-medium text-slate-600 hover:text-sky-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md" 
            onClick={onOpenHelp}
          >
            <HelpCircle className="w-4 h-4" aria-hidden="true" />
            <span className="hidden md:inline">{t('help')}</span>
          </button>

          {/* Separator */}
          <div className="w-[1px] h-4 bg-slate-200 hidden sm:block"></div>

          {/* Language Dropdown */}
          <div className="relative">
            <button 
              aria-label={`Change Language, current is ${currentLangLabel}`}
              className="flex items-center gap-2 text-[14px] font-medium text-slate-600 hover:text-sky-600 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
              onClick={() => setIsLangOpen(!isLangOpen)}
              aria-expanded={isLangOpen}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" x2="22" y1="12" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>{currentLangLabel}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            {isLangOpen && (
              <div className="absolute top-full right-0 mt-3 w-60 min-w-[240px] bg-white border border-slate-200 rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] z-50 p-2">
                <div className="flex flex-col gap-1">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      className={`w-full text-left px-4 py-2.5 rounded-[var(--radius-md)] text-sm font-medium flex items-center justify-between transition-colors focus-visible:ring-2 focus-visible:ring-sky-500 outline-none ${
                        lang === l.code ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                      onClick={() => {
                        setLang(l.code);
                        setIsLangOpen(false);
                      }}
                      aria-pressed={lang === l.code}
                    >
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[14px] leading-tight truncate">{l.native}</span>
                        <span className="text-[12px] opacity-70 leading-none truncate">{l.label}</span>
                      </div>
                      {lang === l.code && <Check className="w-4 h-4 shrink-0 ml-3" aria-hidden="true" />}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>
    </>
  );
}
