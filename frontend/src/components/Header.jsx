import React, { useState, useRef, useEffect } from 'react';
import { Eye, HelpCircle, FileText, ChevronDown, Check } from 'lucide-react';
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

  // React-Bits Style Interactive macOS Dock Magnification Physics
  useEffect(() => {
    const dockContainer = dockRef.current;
    if (!dockContainer) return;
    
    const dockItems = dockContainer.querySelectorAll('[data-dock-item]');
    const maxDistance = 140; // Pixels reach of magnification field
    const maxScale = 1.30;   // Maximum magnification factor
    const maxTranslateY = -6; // Upward translation lift

    const handleMouseMove = (e) => {
      const mouseX = e.clientX;
      dockItems.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemCenterX = rect.left + rect.width / 2;
        const distance = Math.abs(mouseX - itemCenterX);

        if (distance < maxDistance) {
          const progress = (1 + Math.cos((distance / maxDistance) * Math.PI)) / 2;
          const scale = 1 + (maxScale - 1) * progress;
          const translateY = maxTranslateY * progress;
          item.style.transform = `scale(${scale.toFixed(3)}) translateY(${translateY.toFixed(2)}px)`;
          item.style.zIndex = '20';
        } else {
          item.style.transform = 'scale(1) translateY(0px)';
          item.style.zIndex = '1';
        }
      });
    };

    const handleMouseLeave = () => {
      dockItems.forEach((item) => {
        item.style.transform = 'scale(1) translateY(0px)';
        item.style.zIndex = '1';
      });
    };

    dockContainer.addEventListener('mousemove', handleMouseMove);
    dockContainer.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      dockContainer.removeEventListener('mousemove', handleMouseMove);
      dockContainer.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const currentLangLabel = languages.find(l => l.code === lang)?.label || 'English';

  return (
    <>
      {/* BEGIN: Ambient Background Layers */}
      <div aria-hidden="true" className="fixed inset-0 subtle-grid pointer-events-none z-0"></div>
      <div aria-hidden="true" className="fixed top-12 left-1/4 w-[480px] h-[480px] rounded-full bg-sky-200/50 blur-[110px] pointer-events-none -z-10"></div>
      <div aria-hidden="true" className="fixed bottom-0 right-10 w-[620px] h-[620px] rounded-full bg-blue-200/40 blur-[130px] pointer-events-none -z-10"></div>
      <div aria-hidden="true" className="fixed bottom-10 left-10 w-[420px] h-[420px] rounded-full bg-teal-100/40 blur-[100px] pointer-events-none -z-10"></div>

      <header className="sticky top-0 z-40 w-full px-6 lg:px-14 py-3 border-b border-white/80 bg-white/45 backdrop-blur-2xl shadow-[0_4px_30px_rgba(7,141,204,0.05)] flex items-center justify-between transition-all relative overflow-visible" data-purpose="site-navigation">
        {/* Ambient Luminous Header Gradient Reflection */}
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#edf6ff]/60 via-white/50 to-[#edf6ff]/60 pointer-events-none -z-10"></div>
        <div aria-hidden="true" className="absolute bottom-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-[#078dcc]/30 to-transparent pointer-events-none"></div>
        
        {/* Brand Identity */}
        <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setCurrentView('welcome')}>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#d7eeff] to-[#f4faff] border border-sky-200 shadow-sm flex items-center justify-center text-sky-600 transition hover:scale-105" data-purpose="brand-icon">
            <svg className="w-6 h-6 stroke-sky-600 fill-none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
              <circle className="fill-sky-500/20 stroke-sky-600" cx="12" cy="12" r="3.2"></circle>
              <circle className="fill-sky-600" cx="12" cy="12" r="1.2"></circle>
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-[#142642] block leading-tight">{t('appName')}</span>
            <span className="text-[11.5px] font-medium text-slate-500 tracking-normal block">{t('appTagline')}</span>
          </div>
        </div>

        {/* React-Bits Style Interactive Glassmorphism Dock */}
        <nav ref={dockRef} aria-label="Interactive Navigation Dock" className="react-bits-dock" data-purpose="interactive-dock" id="header-dock">
          
          {/* Dock Item 1: Start Screening / Quick Scan Icon */}
          <div className="dock-item" data-dock-item="">
            <button aria-label="Quick Scan" className="dock-btn dock-btn-icon-only" onClick={() => setCurrentView('patient_info')} type="button">
              <svg className="w-4 h-4 text-sky-600" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9"></circle>
                <line x1="12" x2="12" y1="3" y2="7"></line>
                <line x1="12" x2="12" y1="17" y2="21"></line>
                <line x1="3" x2="7" y1="12" y2="12"></line>
                <line x1="17" x2="21" y1="12" y2="12"></line>
              </svg>
            </button>
            <span className="dock-tooltip">Quick Scan</span>
          </div>

          {/* Dock Item 2: Previous Reports */}
          <div className="dock-item" data-dock-item="">
            <button className="dock-btn" onClick={() => setCurrentView('reports')} type="button">
              <FileText className="w-4 h-4 text-slate-500 transition-colors" />
              <span>{t('previousReports')}</span>
            </button>
            <span className="dock-tooltip">View Past Reports</span>
          </div>

          {/* Dock Item 3: Help & Guidance */}
          <div className="dock-item" data-dock-item="">
            <button className="dock-btn" onClick={onOpenHelp} type="button">
              <HelpCircle className="w-4 h-4 text-slate-500 transition-colors" />
              <span>{t('help')}</span>
            </button>
            <span className="dock-tooltip">Clinical User Guide</span>
          </div>

          {/* Dock Separator */}
          <div className="w-[1px] h-5 bg-slate-300/60 my-auto mx-0.5 pointer-events-none"></div>

          {/* Dock Item 4: Custom Interactive Language Dropdown */}
          <div className="dock-item relative" data-dock-item="">
            <button 
              className={`dock-btn ${isLangOpen ? 'ring-2 ring-sky-400 bg-white shadow-md' : ''}`}
              onClick={() => setIsLangOpen(!isLangOpen)}
              type="button"
            >
              <svg className="w-4 h-4 text-slate-500 transition-colors" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" x2="22" y1="12" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>{currentLangLabel}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-0.5 transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} />
            </button>
            <span className="dock-tooltip">Change Language</span>

            {/* Custom Dropdown Menu */}
            {isLangOpen && (
              <div className="absolute top-full right-0 mt-3 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 transform origin-top-right transition-all max-h-72 overflow-y-auto">
                <div className="p-1.5 flex flex-col gap-1">
                  {languages.map((l) => (
                    <button
                      key={l.code}
                      className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between transition-colors ${
                        lang === l.code ? 'bg-sky-50 text-sky-700' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                      onClick={() => {
                        setLang(l.code);
                        setIsLangOpen(false);
                      }}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[15px] leading-tight">{l.native}</span>
                        <span className="text-[11px] opacity-70 leading-none">{l.label}</span>
                      </div>
                      {lang === l.code && <Check className="w-4 h-4 text-sky-600" />}
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
