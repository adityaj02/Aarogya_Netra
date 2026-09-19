import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Zap, ShieldCheck, Users, Loader2, BarChart2, Image, Lock, Building2 } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const features = [
  {
    icon: Zap,
    label: 'Fast & Simple',
    sub: 'Upload a fundus image and get AI results in under 30 seconds.',
  },
  {
    icon: ShieldCheck,
    label: 'AI-Powered DR Detection',
    sub: 'Trained on 88,000+ retinal images. Validated on diverse clinical datasets.',
  },
  {
    icon: Users,
    label: 'Clinician Support',
    sub: 'Results are reviewed by ophthalmologists via the Doctor Portal.',
  },
];

export default function WelcomePage({ onStartScreening }) {
  const { t } = useLanguage();
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = () => {
    if (isStarting) return;
    setIsStarting(true);
    setTimeout(() => { onStartScreening(); }, 300);
  };

  return (
    <div
      style={{
        flex: 1,
        background: 'linear-gradient(145deg, #eef5ff 0%, #e8f4fd 50%, #ddeeff 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* ── Ambient background blobs (aria-hidden, no pointer events) ── */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none', overflow: 'hidden', zIndex: 0,
        }}
      >
        <div style={{ position: 'absolute', top: '5%',  left: '3%',  width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(186,224,253,0.65) 0%, transparent 70%)', filter: 'blur(50px)' }} />
        <div style={{ position: 'absolute', top: '20%', right: '4%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(190,210,255,0.55) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '8%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,240,255,0.4) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      {/* ── Decorative retina graphic (desktop only, purely visual) ── */}
      <div aria-hidden="true" className="welcome-retina-deco retina-pulse">
        <div style={{ width: 340, height: 340, borderRadius: '50%', overflow: 'hidden' }}>
          <svg width="340" height="340" preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="rg1" cx="60%" cy="52%" r="55%">
                <stop offset="0%"   stopColor="#ffecba"/>
                <stop offset="18%"  stopColor="#f8a26c"/>
                <stop offset="42%"  stopColor="#c95542"/>
                <stop offset="70%"  stopColor="#692233"/>
                <stop offset="100%" stopColor="#2a0d1e"/>
              </radialGradient>
              <radialGradient id="rg2" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#fff"    stopOpacity="1"/>
                <stop offset="35%"  stopColor="#fff2b3" stopOpacity="0.9"/>
                <stop offset="70%"  stopColor="#ff9944" stopOpacity="0.5"/>
                <stop offset="100%" stopColor="#b0312d" stopOpacity="0"/>
              </radialGradient>
            </defs>
            <rect fill="url(#rg1)" width="400" height="400"/>
            <g opacity="0.8" stroke="#96152a" strokeLinecap="round">
              <path d="M 230 200 C 235 170, 245 130, 280 90"  fill="none" strokeWidth="4"/>
              <path d="M 225 195 C 210 150, 180 110, 140 75"  fill="none" strokeWidth="3.5"/>
              <path d="M 230 215 C 240 250, 260 290, 300 330" fill="none" strokeWidth="4"/>
              <path d="M 225 215 C 205 260, 175 300, 130 335" fill="none" strokeWidth="3.5"/>
            </g>
            <circle cx="225" cy="205" fill="url(#rg2)" r="38"/>
            <ellipse cx="227" cy="205" fill="#fff" opacity="0.85" rx="18" ry="24"/>
          </svg>
        </div>
      </div>

      {/* ── Main scrollable content ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px 56px',
          position: 'relative',
          zIndex: 1,         /* above ambient blobs */
          gap: 32,
          width: '100%',
          maxWidth: 'var(--page-max-width)',
          margin: '0 auto',
        }}
      >
        {/* ── Hero Card ── */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          aria-labelledby="hero-heading"
          style={{
            width: '100%', maxWidth: 560,
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(32px)',
            WebkitBackdropFilter: 'blur(32px)',
            border: '1px solid rgba(255,255,255,0.95)',
            borderRadius: 28,
            boxShadow: '0 24px 64px -12px rgba(52,111,170,0.18), 0 0 0 1px rgba(255,255,255,0.8) inset',
            padding: '40px 36px 32px',
          }}
        >
          {/* Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <img
              src="/aarogyanetra_logo.svg"
              alt="AarogyaNetra"
              style={{ height: 90, width: 'auto', objectFit: 'contain', maxWidth: 280 }}
            />
          </div>

          {/* Hero text */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1
              id="hero-heading"
              style={{
                fontSize: 'clamp(1.55rem, 3vw, 2rem)',
                fontWeight: 800, color: '#0f172a',
                lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: 10,
              }}
            >
              {t('heroTitle', 'AI-Powered Diabetic Retinopathy Screening')}
            </h1>
            <p style={{ fontSize: '1rem', color: '#475569', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
              {t('heroSubtitle', 'Early detection for better outcomes. Upload a fundus image — get results in seconds.')}
            </p>
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={handleStart}
              disabled={isStarting}
              style={{
                width: '100%', maxWidth: 240,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '14px 24px',
                borderRadius: 'var(--radius-md)',
                border: 'none', cursor: isStarting ? 'wait' : 'pointer',
                background: 'linear-gradient(135deg, #0284c7, #0ea5e9)',
                color: 'white', fontWeight: 700, fontSize: '1rem',
                boxShadow: '0 8px 24px -4px rgba(2,132,199,0.4)',
                minHeight: 48, fontFamily: 'inherit',
              }}
            >
              {isStarting ? (
                <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" /><span>Starting…</span></>
              ) : (
                <><span>{t('startScreening', 'Start Screening')}</span><ArrowRight size={18} aria-hidden="true" /></>
              )}
            </motion.button>

            <p style={{ fontSize: '0.8125rem', color: '#64748b', textAlign: 'center' }}>
              Upload a retinal fundus photo to begin
            </p>
          </div>

          {/* Single in-card disclaimer */}
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a',
            borderRadius: 'var(--radius-md)', padding: '10px 14px',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <svg aria-hidden="true" style={{ width: 18, height: 18, flexShrink: 0, color: '#d97706', marginTop: 1 }} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <p style={{ fontSize: '0.8125rem', color: '#92400e', lineHeight: 1.5, margin: 0 }}>
              <strong>AI-assisted screening only.</strong>{' '}
              Results must be reviewed by a qualified healthcare professional before any clinical decision.
            </p>
          </div>
        </motion.section>

        {/* ── Feature Cards ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%', maxWidth: 820,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {features.map(({ icon: Icon, label, sub }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255,255,255,0.92)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: '#e0f2fe', color: '#0284c7',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              <div>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{label}</h3>
                <p style={{ fontSize: '0.8125rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>{sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ── Trust signals (SVG icons, no emojis) ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}
        >
          {[
            { icon: BarChart2, text: 'Model v2.1' },
            { icon: Image,     text: 'Trained on 88,000+ images' },
            { icon: Lock,      text: 'Data stays on device' },
            { icon: Building2, text: 'Built for rural healthcare' },
          ].map(({ icon: Icon, text }) => (
            <span
              key={text}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.72)', padding: '5px 14px',
                borderRadius: 999, border: '1px solid rgba(255,255,255,0.9)',
                fontSize: '0.8rem', color: '#475569', fontWeight: 500,
              }}
            >
              <Icon size={13} strokeWidth={2} aria-hidden="true" style={{ color: '#0284c7', flexShrink: 0 }} />
              {text}
            </span>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
