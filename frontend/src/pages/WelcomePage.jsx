import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function WelcomePage({ onStartScreening, onViewReports, onOpenHelp }) {
  const { t } = useLanguage();
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = () => {
    setIsStarting(true);
    setTimeout(() => {
      onStartScreening();
    }, 400);
  };

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      background: 'linear-gradient(135deg, #ebf5ff 0%, #e8f4fd 40%, #ddeeff 100%)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background mesh orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '8%', left: '6%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(186,224,253,0.7) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', top: '15%', right: '5%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(193,226,255,0.6) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '12%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,218,255,0.5) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* Main Grid */}
      <div style={{
        flex: 1,
        maxWidth: 1280,
        width: '100%',
        margin: '0 auto',
        padding: '40px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* ── Center Card ── */}
        <section style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
          <div style={{
            width: '100%',
            maxWidth: 640,
            background: 'rgba(255,255,255,0.78)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.92)',
            borderRadius: 36,
            boxShadow: '0 30px 80px -15px rgba(52,111,170,0.22), 0 0 0 1px rgba(255,255,255,0.8) inset',
            padding: '40px 40px 36px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Subtle inner gradient orbs */}
            <div style={{ position: 'absolute', top: -96, left: -96, width: 208, height: 208, borderRadius: '50%', background: 'rgba(186,224,253,0.4)', filter: 'blur(32px)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -80, right: -80, width: 192, height: 192, borderRadius: '50%', background: 'rgba(190,214,255,0.35)', filter: 'blur(32px)', pointerEvents: 'none' }} />

            {/* Logo Badge */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative', marginBottom: 24 }}>
              <img 
                src="/aarogyanetra_logo.svg" 
                alt="AarogyaNetra" 
                style={{ 
                  width: 320, 
                  height: 120, 
                  objectFit: 'contain',
                }} 
              />
            </div>
            
            {/* Title / Subtitle */}
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h1 style={{
                fontSize: 'clamp(28px, 3vw, 40px)',
                fontWeight: 800,
                color: '#0f172a',
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
                margin: '0 0 8px 0',
              }}>
                For Healthier Eyes Tomorrow
              </h1>
              <p style={{ margin: 0, color: '#334155', fontWeight: 500, fontSize: 16 }}>
                Early detection. Better outcomes. Brighter lives.
              </p>
            </div>

            {/* Feature Trio */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 32 }}>
              {[
                { label: 'Fast & Simple', sub: 'Upload and get results', icon: (
                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                )},
                { label: 'AI-Powered', sub: 'Trained for DR screening', icon: (
                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
                )},
                { label: 'Clinician Support', sub: 'For better care decisions', icon: (
                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>
                )},
              ].map(({ label, sub, icon }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 8px', borderRadius: 'var(--radius-lg)', textAlign: 'center', background: 'rgba(241, 245, 249, 0.6)' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, boxShadow: 'var(--shadow-sm)' }}>
                    {icon}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{label}</span>
                  <span style={{ fontSize: 11, color: '#475569', marginTop: 4, lineHeight: 1.3, fontWeight: 500 }}>{sub}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
              <button
                onClick={handleStart}
                type="button"
                className={`welcome-start-btn ${isStarting ? 'active' : ''}`}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                  padding: '16px 24px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(90deg, #0284c7, #0ea5e9)',
                  color: '#fff', fontWeight: 700, fontSize: '1.05rem',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'all 0.2s ease',
                  transform: isStarting ? 'translateY(1px)' : 'translateY(0)',
                }}
                onMouseEnter={e => { if(!isStarting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.filter = 'brightness(0.94)'; } }}
                onMouseLeave={e => { if(!isStarting) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.filter = 'brightness(1)'; } }}
              >
                {isStarting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <span style={{ letterSpacing: '0.02em' }}>{t('startScreening')}</span>
                    <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                      <line x1="5" x2="19" y1="12" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </>
                )}
              </button>
              <p style={{ textAlign: 'center', fontSize: 13, color: '#475569', fontWeight: 500, margin: 0 }}>
                Upload a retinal fundus image to begin
              </p>
            </div>

            {/* Disclaimer */}
            <div style={{
              borderRadius: 'var(--radius-lg)', background: 'var(--outcome-warning-bg)', border: '1px solid var(--outcome-warning-border)',
              padding: '16px', display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              <div style={{ flexShrink: 0, width: 24, height: 24, color: 'var(--warning)', marginTop: -2 }}>
                <svg style={{ width: '100%', height: '100%' }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.5, color: '#78350f' }}>
                <span style={{ fontWeight: 700, color: '#451a03', display: 'block' }}>AI-assisted screening support only.</span>
                <span style={{ fontWeight: 500 }}>Results should be reviewed by an appropriate healthcare professional when indicated.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Background Ambient Retina Graphic ── */}
        <div aria-hidden="true" className="hidden lg:block" style={{
          position: 'absolute',
          right: '5%',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: -1,
          opacity: 0.35,
          pointerEvents: 'none'
        }}>
          {/* Fundus graphic container */}
          <div style={{ position: 'relative', width: 400, height: 400 }}>
            <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', background: 'radial-gradient(circle, transparent 60%, var(--bg-app) 100%)', zIndex: 1 }} />
            {/* Fundus disc */}
            <div className="retina-pulse" style={{
              position: 'absolute', inset: 0,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.35)',
              overflow: 'hidden',
            }}>
              <svg style={{ width: '100%', height: '100%', borderRadius: '50%' }} preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <radialGradient id="rg1" cx="60%" cy="52%" r="55%"><stop offset="0%" stopColor="#ffecba"/><stop offset="18%" stopColor="#f8a26c"/><stop offset="42%" stopColor="#c95542"/><stop offset="70%" stopColor="#692233"/><stop offset="100%" stopColor="#2a0d1e"/></radialGradient>
                  <radialGradient id="rg2" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="#fff" stopOpacity="1"/><stop offset="35%" stopColor="#fff2b3" stopOpacity="0.9"/><stop offset="70%" stopColor="#ff9944" stopOpacity="0.5"/><stop offset="100%" stopColor="#b0312d" stopOpacity="0"/></radialGradient>
                  <radialGradient id="rg3" cx="30%" cy="25%" r="50%"><stop offset="0%" stopColor="#fff" stopOpacity="0.35"/><stop offset="60%" stopColor="#fff" stopOpacity="0"/></radialGradient>
                </defs>
                <rect fill="url(#rg1)" width="400" height="400"/>
                <g opacity="0.85" stroke="#96152a" strokeLinecap="round">
                  <path d="M 230 200 C 235 170, 245 130, 280 90 C 305 60, 340 50, 380 40" fill="none" strokeWidth="4.5"/>
                  <path d="M 270 105 C 295 115, 330 115, 365 125" fill="none" strokeWidth="2.5"/>
                  <path d="M 245 140 C 275 145, 310 160, 350 170" fill="none" strokeWidth="2"/>
                  <path d="M 225 195 C 210 150, 180 110, 140 75 C 105 45, 70 40, 25 35" fill="none" strokeWidth="4"/>
                  <path d="M 175 115 C 145 125, 110 135, 60 140" fill="none" strokeWidth="2"/>
                  <path d="M 195 140 C 160 160, 120 180, 50 190" fill="none" strokeWidth="2.5"/>
                  <path d="M 230 215 C 240 250, 260 290, 300 330 C 330 360, 365 375, 395 385" fill="none" strokeWidth="4.2"/>
                  <path d="M 225 215 C 205 260, 175 300, 130 335 C 95 365, 55 375, 15 380" fill="none" strokeWidth="3.8"/>
                </g>
                <g opacity="0.75" stroke="#ff6b6b" strokeLinecap="round">
                  <circle cx="280" cy="205" fill="#ff4d4d" opacity="0.6" r="3"/>
                  <circle cx="265" cy="185" fill="#ff8585" opacity="0.7" r="2"/>
                  <circle cx="295" cy="225" fill="#e03131" opacity="0.6" r="2.5"/>
                </g>
                <circle cx="225" cy="205" fill="url(#rg2)" r="38"/>
                <ellipse cx="227" cy="205" fill="#fff" opacity="0.8" rx="18" ry="24"/>
                <circle cx="200" cy="200" fill="url(#rg3)" r="198"/>
                <circle cx="200" cy="200" fill="none" opacity="0.3" r="140" stroke="#fff" strokeDasharray="4 6" strokeWidth="0.8"/>
                <circle cx="200" cy="200" fill="none" opacity="0.4" r="80" stroke="#38bdf8" strokeWidth="0.7"/>
              </svg>
            </div>
            {/* Scanner arc */}
            <div style={{ position: 'absolute', right: -8, top: '25%', width: 48, height: 96, borderRight: '4px solid rgba(56,189,248,0.75)', borderRadius: '0 9999px 9999px 0' }} />
          </div>
        </div>
      </div>

      {/* Footer bar */}
      <footer style={{
        position: 'relative', zIndex: 1,
        maxWidth: 1280, width: '100%', margin: '0 auto',
        padding: '16px 24px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderTop: '1px solid rgba(148,188,220,0.3)',
        flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--surface-muted)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>Trusted AI Support</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.05em' }}>Screen • Detect • Care</span>
          </div>
        </div>
        <p className="hidden sm:block" style={{ margin: 0, fontSize: 13, fontStyle: 'italic', fontWeight: 500, color: 'var(--text-tertiary)' }}>
          "Clearer insights for a healthier tomorrow"
        </p>
      </footer>
    </div>
  );
}
