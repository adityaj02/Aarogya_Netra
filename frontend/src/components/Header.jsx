import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye, FileText, HelpCircle, User, LogOut,
  Globe, ChevronDown, Check, Menu, X,
  LayoutDashboard, Clock, Users, MapPin
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSelectedState } from '../context/StateContext';
import hospitalDirectory from '../data/hospital_directory.json';

const STATE_LIST = Object.keys(hospitalDirectory).sort();

/* ─── Animation variants ─────────────────────────────────────────── */
const drawerVariants = {
  hidden:  { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.22, ease: 'easeIn' } },
};
const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1 },
  exit:    { opacity: 0 },
};
const itemVariants = {
  hidden:  { opacity: 0, x: 20 },
  visible: (i) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.2 } }),
};
const dropdownVariants = {
  hidden:  { opacity: 0, y: -8, scale: 0.97 },
  visible: { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.14 } },
};

export default function Header({ currentView, setCurrentView, onOpenHelp, doctorName = null, onDoctorLogout = null }) {
  const { lang, setLang, t, languages } = useLanguage();
  const { selectedState, setSelectedState } = useSelectedState();
  const [isLangOpen,     setIsLangOpen]     = useState(false);
  const [isStateOpen,    setIsStateOpen]    = useState(false);
  const [isMobileOpen,   setIsMobileOpen]   = useState(false);
  const [isElevated,     setIsElevated]     = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const langRef     = useRef(null);
  const stateRef    = useRef(null);
  const userMenuRef = useRef(null);
  const hamburgerRef = useRef(null);

  const isClinicianView = !!doctorName;

  /* scroll elevation */
  useEffect(() => {
    const onScroll = () => setIsElevated(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* close dropdowns on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (langRef.current     && !langRef.current.contains(e.target))     setIsLangOpen(false);
      if (stateRef.current    && !stateRef.current.contains(e.target))    setIsStateOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setIsUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  /* body scroll lock when drawer open */
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  /* Escape key closes overlays */
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (isMobileOpen) { setIsMobileOpen(false); hamburgerRef.current?.focus(); }
      setIsLangOpen(false);
      setIsStateOpen(false);
      setIsUserMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isMobileOpen]);

  const navigate = useCallback((view) => {
    setCurrentView(view);
    setIsMobileOpen(false);
  }, [setCurrentView]);

  const isActive = (view) => {
    if (view === 'patient_info') {
      return ['patient_info', 'image_upload', 'analysis', 'result'].includes(currentView);
    }
    if (view.startsWith('doctor_portal')) {
      // 'report' can be reached from doctor portal; keep portal nav highlighted
      if (currentView === 'report' && isClinicianView) return true;
      // Exact match for the sub-tabs
      return currentView === view;
    }
    return currentView === view;
  };

  /* Nav items depend on role */
  const patientNavItems = [
    { view: 'patient_info', label: t('startScreening', 'Start Screening'), icon: Eye },
    { view: 'reports',      label: t('previousReports', 'My Reports'),      icon: FileText },
  ];
  const clinicianNavItems = [
    { view: 'doctor_portal', label: 'Dashboard',       icon: LayoutDashboard },
    { view: 'doctor_portal_pending', label: 'Pending Reviews', icon: Clock },
    { view: 'doctor_portal_patients', label: 'My Patients',     icon: Users },
  ];
  const navItems = isClinicianView ? clinicianNavItems : patientNavItems;

  const currentLangObj = languages.find(l => l.code === lang) || languages[0];

  /* ── Shared nav button renderer ─────────────────────────────────── */
  const NavBtn = ({ view, label, icon: Icon, index }) => {
    const active = isActive(view);
    return (
      <div key={label} style={{ position: 'relative' }}>
        <button
          type="button"
          className={`nav-item${active ? ' active' : ''}`}
          aria-current={active ? 'page' : undefined}
          onClick={() => navigate(view)}
        >
          <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
          <span>{label}</span>
        </button>
        {active && (
          <motion.div
            layoutId="nav-indicator"
            style={{
              position: 'absolute', bottom: 0, left: 8, right: 8,
              height: 2, background: 'var(--primary)', borderRadius: 1,
            }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* ── Navbar ───────────────────────────────────────────────── */}
      <header
        className={`nav-header${isElevated ? ' elevated' : ''}`}
        role="banner"
      >
        <div className="nav-inner">

          {/* Logo */}
          <button
            type="button"
            onClick={() => navigate('welcome')}
            aria-label="AarogyaNetra — go to home"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'none', border: 'none', cursor: 'pointer',
              borderRadius: 8, padding: '4px 6px', flexShrink: 0,
            }}
          >
            <img
              src="/aarogyanetra_logo.svg"
              alt="AarogyaNetra logo"
              style={{ height: 36, width: 'auto' }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          </button>

          {/* ── Desktop center nav ── (CSS-controlled, not Tailwind) */}
          <nav aria-label="Main" className="nav-desktop">
            {navItems.map(({ view, label, icon: Icon }, i) => (
              <NavBtn key={label} view={view} label={label} icon={Icon} index={i} />
            ))}
          </nav>

          {/* ── Desktop right cluster ── */}
          <div className="nav-desktop-right">
            {/* Help */}
            {!isClinicianView && (
              <button type="button" className="nav-item" onClick={onOpenHelp} aria-label="Help">
                <HelpCircle size={18} strokeWidth={1.5} aria-hidden="true" />
                <span>{t('help', 'Help')}</span>
              </button>
            )}

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} aria-hidden="true" />

            {/* Language selector */}
            <div ref={langRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="lang-btn"
                aria-label={`Change language, current: ${currentLangObj.label}`}
                aria-expanded={isLangOpen}
                aria-haspopup="listbox"
                onClick={() => setIsLangOpen(p => !p)}
              >
                <Globe size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>{currentLangObj.native}</span>
                <motion.span
                  animate={{ rotate: isLangOpen ? 180 : 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <ChevronDown size={13} strokeWidth={1.5} aria-hidden="true" />
                </motion.span>
              </button>

              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden" animate="visible" exit="exit"
                    role="listbox"
                    aria-label="Select language"
                    style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                      width: 220, background: 'white',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 100, padding: 8,
                    }}
                  >
                    {languages.map((l) => (
                      <button
                        key={l.code}
                        type="button"
                        role="option"
                        aria-selected={lang === l.code}
                        onClick={() => { setLang(l.code); setIsLangOpen(false); }}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '9px 12px', borderRadius: 'var(--radius-sm)',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 8, fontFamily: 'inherit',
                          background: lang === l.code ? 'var(--primary-light)' : 'transparent',
                          color: lang === l.code ? 'var(--primary)' : 'var(--text-secondary)',
                          minHeight: 44,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.9375rem', fontWeight: 600 }}>{l.native}</div>
                          <div style={{ fontSize: '0.75rem', opacity: 0.65 }}>{l.label}</div>
                        </div>
                        {lang === l.code && <Check size={15} strokeWidth={2.5} aria-hidden="true" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} aria-hidden="true" />

            {/* ── State selector ── */}
            <div ref={stateRef} style={{ position: 'relative' }}>
              <button
                type="button"
                className="lang-btn"
                aria-label={selectedState ? `Selected state: ${selectedState}` : 'Select your state'}
                aria-expanded={isStateOpen}
                aria-haspopup="listbox"
                onClick={() => setIsStateOpen(p => !p)}
                title={selectedState || 'Select state'}
                style={{
                  maxWidth: 140,
                  background: selectedState ? 'var(--primary-light)' : undefined,
                  color: selectedState ? 'var(--primary)' : undefined,
                  borderColor: selectedState ? 'var(--primary)' : undefined,
                }}
              >
                <MapPin size={14} strokeWidth={1.75} aria-hidden="true" />
                <span style={{ maxWidth: 88, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.82rem' }}>
                  {selectedState || 'Select State'}
                </span>
                <motion.span
                  animate={{ rotate: isStateOpen ? 180 : 0 }}
                  transition={{ duration: 0.18 }}
                  style={{ display: 'flex', alignItems: 'center' }}
                >
                  <ChevronDown size={13} strokeWidth={1.5} aria-hidden="true" />
                </motion.span>
              </button>

              <AnimatePresence>
                {isStateOpen && (
                  <motion.div
                    variants={dropdownVariants}
                    initial="hidden" animate="visible" exit="exit"
                    role="listbox"
                    aria-label="Select state"
                    style={{
                      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                      width: 240, background: 'white',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-lg)',
                      boxShadow: 'var(--shadow-lg)',
                      zIndex: 100, padding: 8,
                      maxHeight: 320, overflowY: 'auto',
                    }}
                  >
                    {/* Clear option */}
                    <button
                      type="button"
                      role="option"
                      aria-selected={!selectedState}
                      onClick={() => { setSelectedState(''); setIsStateOpen(false); }}
                      style={{
                        width: '100%', textAlign: 'left',
                        padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 8, fontFamily: 'inherit', fontSize: '0.875rem',
                        background: !selectedState ? 'var(--primary-light)' : 'transparent',
                        color: !selectedState ? 'var(--primary)' : 'var(--text-tertiary)',
                        fontWeight: 500,
                      }}
                    >
                      All States
                      {!selectedState && <Check size={14} strokeWidth={2.5} aria-hidden="true" />}
                    </button>
                    <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                    {STATE_LIST.map((s) => (
                      <button
                        key={s}
                        type="button"
                        role="option"
                        aria-selected={selectedState === s}
                        onClick={() => { setSelectedState(s); setIsStateOpen(false); }}
                        style={{
                          width: '100%', textAlign: 'left',
                          padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                          border: 'none', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          gap: 8, fontFamily: 'inherit', fontSize: '0.875rem',
                          background: selectedState === s ? 'var(--primary-light)' : 'transparent',
                          color: selectedState === s ? 'var(--primary)' : 'var(--text-secondary)',
                          fontWeight: selectedState === s ? 700 : 500,
                          minHeight: 36,
                        }}
                      >
                        {s}
                        {selectedState === s && <Check size={13} strokeWidth={2.5} aria-hidden="true" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 20, background: 'var(--border-subtle)' }} aria-hidden="true" />

            {/* Doctor Portal / User menu */}
            {isClinicianView ? (
              <div ref={userMenuRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  className="nav-item"
                  aria-expanded={isUserMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setIsUserMenuOpen(p => !p)}
                  style={{ gap: 8 }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8125rem', fontWeight: 800, flexShrink: 0,
                  }}>
                    {doctorName.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`}
                  </span>
                  <ChevronDown size={13} strokeWidth={1.5} aria-hidden="true" />
                </button>
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      variants={dropdownVariants}
                      initial="hidden" animate="visible" exit="exit"
                      role="menu"
                      style={{
                        position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                        width: 180, background: 'white',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-lg)',
                        boxShadow: 'var(--shadow-lg)',
                        zIndex: 100, padding: 6,
                      }}
                    >
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => { setIsUserMenuOpen(false); onDoctorLogout?.(); }}
                        style={{
                          width: '100%', textAlign: 'left', padding: '10px 12px',
                          borderRadius: 'var(--radius-sm)', border: 'none',
                          display: 'flex', alignItems: 'center', gap: 8,
                          color: '#dc2626', fontWeight: 600, fontSize: '0.9rem',
                          cursor: 'pointer', background: 'transparent', fontFamily: 'inherit',
                        }}
                      >
                        <LogOut size={15} strokeWidth={1.5} aria-hidden="true" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                className="nav-clinician-btn"
                onClick={() => navigate('doctor_portal')}
                aria-label="Doctor Portal — clinician access"
              >
                <User size={15} strokeWidth={1.5} aria-hidden="true" />
                <span>Doctor Portal</span>
              </button>
            )}
          </div>

          {/* ── Mobile hamburger ── (CSS-controlled) */}
          <button
            ref={hamburgerRef}
            type="button"
            className="nav-mobile-btn"
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileOpen}
            aria-controls="mobile-drawer"
            onClick={() => setIsMobileOpen(p => !p)}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isMobileOpen
                ? <motion.span key="x"   initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}><X    size={22} strokeWidth={2} aria-hidden="true" /></motion.span>
                : <motion.span key="ham" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }} style={{ display: 'flex' }}><Menu size={22} strokeWidth={1.75} aria-hidden="true" /></motion.span>
              }
            </AnimatePresence>
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ─────────────────────────────────────────── */}
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              className="drawer-backdrop"
              variants={backdropVariants}
              initial="hidden" animate="visible" exit="exit"
              onClick={() => setIsMobileOpen(false)}
              aria-hidden="true"
            />
            <motion.nav
              id="mobile-drawer"
              className="drawer-panel"
              role="navigation"
              aria-label="Mobile navigation"
              variants={drawerVariants}
              initial="hidden" animate="visible" exit="exit"
            >
              {/* Drawer header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
                <img src="/aarogyanetra_logo.svg" alt="AarogyaNetra" style={{ height: 32 }} onError={e => e.target.style.display = 'none'} />
                <button type="button" className="nav-mobile-btn" onClick={() => setIsMobileOpen(false)} aria-label="Close menu">
                  <X size={20} strokeWidth={2} />
                </button>
              </div>

              {/* Nav items */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
                {navItems.map(({ view, label, icon: Icon }, i) => (
                  <motion.button
                    key={label}
                    type="button"
                    custom={i} variants={itemVariants} initial="hidden" animate="visible"
                    className={`nav-item${isActive(view) ? ' active' : ''}`}
                    aria-current={isActive(view) ? 'page' : undefined}
                    onClick={() => navigate(view)}
                    style={{
                      width: '100%', textAlign: 'left', justifyContent: 'flex-start',
                      padding: '12px 16px', fontSize: '1rem',
                      background: isActive(view) ? 'var(--primary-light)' : undefined,
                    }}
                  >
                    <Icon size={20} strokeWidth={1.5} aria-hidden="true" />
                    {label}
                  </motion.button>
                ))}

                {!isClinicianView && (
                  <motion.button
                    type="button"
                    custom={navItems.length} variants={itemVariants} initial="hidden" animate="visible"
                    className="nav-item"
                    onClick={() => { setIsMobileOpen(false); onOpenHelp?.(); }}
                    style={{ width: '100%', textAlign: 'left', justifyContent: 'flex-start', padding: '12px 16px', fontSize: '1rem' }}
                  >
                    <HelpCircle size={20} strokeWidth={1.5} aria-hidden="true" />
                    {t('help', 'Help')}
                  </motion.button>
                )}

                <div style={{ height: 1, background: 'var(--border-subtle)', margin: '12px 0' }} />

                {isClinicianView ? (
                  <motion.button
                    type="button"
                    custom={navItems.length + 1} variants={itemVariants} initial="hidden" animate="visible"
                    onClick={() => { setIsMobileOpen(false); onDoctorLogout?.(); }}
                    style={{
                      width: '100%', textAlign: 'left', justifyContent: 'flex-start',
                      padding: '12px 16px', fontSize: '1rem',
                      display: 'flex', alignItems: 'center', gap: 10,
                      color: '#dc2626', fontWeight: 600, background: 'transparent',
                      border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                      fontFamily: 'inherit',
                    }}
                  >
                    <LogOut size={20} strokeWidth={1.5} aria-hidden="true" />
                    Sign out
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    custom={navItems.length + 1} variants={itemVariants} initial="hidden" animate="visible"
                    className="nav-clinician-btn"
                    onClick={() => navigate('doctor_portal')}
                    style={{ width: '100%', justifyContent: 'center', padding: '12px 16px' }}
                  >
                    <User size={18} strokeWidth={1.5} aria-hidden="true" />
                    Doctor Portal
                  </motion.button>
                )}
              </div>

              {/* State selector in drawer */}
              <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={12} aria-hidden="true" /> Select State
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedState('')}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                    background: !selectedState ? 'var(--primary-light)' : 'transparent',
                    color: !selectedState ? 'var(--primary)' : 'var(--text-secondary)',
                    fontWeight: 500, fontSize: '0.875rem',
                    border: 'none', cursor: 'pointer', fontFamily: 'inherit', marginBottom: 2,
                  }}
                >
                  All States
                  {!selectedState && <Check size={13} aria-hidden="true" />}
                </button>
                {STATE_LIST.map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { setSelectedState(s); setIsMobileOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '7px 12px', borderRadius: 'var(--radius-sm)',
                      background: selectedState === s ? 'var(--primary-light)' : 'transparent',
                      color: selectedState === s ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: selectedState === s ? 700 : 500,
                      fontSize: '0.875rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {s} {selectedState === s && <Check size={13} aria-hidden="true" />}
                  </button>
                ))}
              </div>

              {/* Language at bottom */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                <p style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                  Language
                </p>
                {languages.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => { setLang(l.code); setIsMobileOpen(false); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                      background: lang === l.code ? 'var(--primary-light)' : 'transparent',
                      color: lang === l.code ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: lang === l.code ? 700 : 500,
                      fontSize: '0.9rem', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    <span>{l.native} <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>({l.label})</span></span>
                    {lang === l.code && <Check size={14} aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
