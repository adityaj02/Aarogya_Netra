import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function WelcomePage({ onStartScreening, onViewReports, onOpenHelp }) {
  const { t } = useLanguage();

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
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 32,
        alignItems: 'center',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* ── Left Statement Column ── */}
        <section style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ width: 48, height: 6, borderRadius: 9999, background: '#168dd2' }} />
          <h1 style={{
            fontSize: 'clamp(28px, 3vw, 42px)',
            fontWeight: 800,
            color: '#17345d',
            lineHeight: 1.18,
            letterSpacing: '-0.02em',
            margin: 0,
          }}>
            For Healthier<br />Eyes Tomorrow
          </h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {['Early detection.', 'Better outcomes.', 'Brighter lives.'].map(line => (
              <p key={line} style={{ margin: 0, color: '#475569', fontWeight: 500, fontSize: 15.5 }}>{line}</p>
            ))}
          </div>
        </section>

        {/* ── Center Card ── */}
        <section style={{ gridColumn: 'span 6', display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: '100%',
            maxWidth: 540,
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 24,
                background: 'linear-gradient(160deg, #e3f2fd, #cae7ff)',
                border: '1px solid rgba(255,255,255,0.9)',
                boxShadow: '0 4px 20px rgba(9,134,212,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                transition: 'transform 0.3s ease',
              }}
                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.06)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <svg style={{ width: 40, height: 40, color: '#0986d4' }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24">
                  <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                  <circle fill="#0986d4" cx="12" cy="12" r="3.4" />
                  <circle fill="white" cx="13" cy="11" r="1" />
                </svg>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, color: '#111d36', letterSpacing: '-0.02em' }}>
                {t('appName')}
              </h2>
              <p style={{ margin: '6px 0 0', fontSize: 15, fontWeight: 700, color: '#078bd0' }}>{t('appTagline')}</p>
              <p style={{ margin: '10px 0 0', fontSize: 13.5, color: '#475569', maxWidth: 390, lineHeight: 1.5 }}>
                {t('appSubtitle')}
              </p>
            </div>

            {/* Feature Trio */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 28, marginBottom: 28 }}>
              {[
                { bg: '#ddf6fc', color: '#00a3c4', label: 'Fast & Simple', sub: 'Upload and get results', icon: (
                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" viewBox="0 0 24 24"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                )},
                { bg: '#e3ecfe', color: '#3d6ff8', label: 'AI-Powered', sub: 'Trained for DR screening', icon: (
                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></svg>
                )},
                { bg: '#ffece8', color: '#f26352', label: 'Clinician Support', sub: 'For better care decisions', icon: (
                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>
                )},
              ].map(({ bg, color, label, sub, icon }) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 8, borderRadius: 16, textAlign: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    {icon}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#142642' }}>{label}</span>
                  <span style={{ fontSize: 10, color: '#64748b', marginTop: 2, lineHeight: 1.3, fontWeight: 500 }}>{sub}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button
                onClick={onStartScreening}
                type="button"
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '16px 24px', borderRadius: 18, border: 'none', cursor: 'pointer',
                  background: 'linear-gradient(90deg, #078dcc, #298af2)',
                  color: '#fff', fontWeight: 700, fontSize: '1.05rem',
                  boxShadow: '0 12px 28px -6px rgba(11,137,235,0.45), 0 4px 12px rgba(11,137,235,0.25)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 18px 36px -6px rgba(11,137,235,0.55)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 28px -6px rgba(11,137,235,0.45), 0 4px 12px rgba(11,137,235,0.25)'; }}
              >
                <span style={{ padding: '4px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.2)' }}>
                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
                  </svg>
                </span>
                <span style={{ letterSpacing: '0.02em' }}>{t('startScreening')}</span>
                <span style={{ padding: '4px 8px', borderRadius: 10, background: 'rgba(255,255,255,0.15)' }}>
                  <svg style={{ width: 20, height: 20 }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                    <line x1="5" x2="19" y1="12" y2="12" /><polyline points="12 5 19 12 12 19" />
                  </svg>
                </span>
              </button>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#64748b', fontWeight: 500, margin: 0 }}>
                Upload a retinal fundus image to begin
              </p>
            </div>

            {/* Disclaimer */}
            <div style={{
              marginTop: 24, borderRadius: 18, background: '#fff8df', border: '1px solid #f0d995',
              padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              <div style={{ flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: '#fde9a8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aa7305', marginTop: 2 }}>
                <svg style={{ width: 20, height: 20 }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                </svg>
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.5, color: '#513f14' }}>
                <span style={{ fontWeight: 700, color: '#44330d', display: 'block' }}>AI-assisted screening support only.</span>
                <span style={{ fontWeight: 500 }}>Results should be reviewed by an appropriate healthcare professional when indicated.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Right Fundus Visualization ── */}
        <section style={{ gridColumn: 'span 3', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: 24 }}>
          {/* Floating stat pill */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            padding: '10px 16px', borderRadius: 16,
            background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.92)',
            boxShadow: '0 4px 14px rgba(70,115,170,0.08)',
          }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg style={{ width: 16, height: 16 }} fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" viewBox="0 0 24 24">
                <line x1="18" x2="18" y1="20" y2="10" /><line x1="12" x2="12" y1="20" y2="4" /><line x1="6" x2="6" y1="20" y2="14" />
              </svg>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#1e293b' }}>Early Detection</p>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 500, color: '#64748b' }}>Saves Vision</p>
            </div>
          </div>

          {/* Fundus graphic container */}
          <div style={{ position: 'relative', width: 320, height: 320 }}>
            {/* Outer scanning ring */}
            <div className="retina-spin" style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(125,211,252,0.4)' }} />
            {/* Glow aura */}
            <div style={{
              position: 'absolute', width: '90%', height: '90%', top: '5%', left: '5%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(56,189,248,0.45) 0%, rgba(251,191,36,0.28) 45%, rgba(14,165,233,0.15) 70%, transparent 85%)',
              filter: 'blur(36px)',
            }} />
            {/* Fundus disc */}
            <div className="retina-pulse" style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 288, height: 288, borderRadius: '50%',
              background: 'rgba(255,255,255,0.35)',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(255,255,255,0.8)',
              boxShadow: 'rgba(56,189,248,0.22) 0 0 40px, rgba(255,255,255,0.4) 0 0 20px inset',
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
        </section>
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
          <div style={{ width: 40, height: 40, borderRadius: 14, background: 'linear-gradient(135deg, #0ea5e9, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(14,165,233,0.3)' }}>
            <svg style={{ width: 20, height: 20 }} fill="white" viewBox="0 0 24 24">
              <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z"/>
            </svg>
          </div>
          <div>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', display: 'block' }}>Trusted AI Support</span>
            <span style={{ fontSize: 11, fontWeight: 500, color: '#64748b', letterSpacing: '0.05em' }}>Screen • Detect • Care</span>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 13, fontStyle: 'italic', fontWeight: 500, color: '#64748b' }}>
          "Clearer insights for a healthier tomorrow"
        </p>
      </footer>
    </div>
  );
}
