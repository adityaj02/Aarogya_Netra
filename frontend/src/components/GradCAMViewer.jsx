import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layers, Eye, Flame, AlertCircle, ImageOff } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/* Inline placeholder shown when an image 404s (e.g. old reports after server wipe) */
function ImgWithFallback({ src, alt, style }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div style={{
        ...style,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 8,
        background: '#0f172a', color: '#475569',
      }}>
        <ImageOff size={32} strokeWidth={1.5} />
        <span style={{ fontSize: '0.75rem', textAlign: 'center', padding: '0 8px' }}>Image not available</span>
      </div>
    );
  }
  return <img src={src} alt={alt} style={style} onError={() => setFailed(true)} />;
}

const TABS = [
  { id: 'original', icon: Eye,    labelKey: 'viewOriginal', label: 'Original' },
  { id: 'heatmap',  icon: Flame,  labelKey: 'viewHeatmap',  label: 'Heatmap' },
  { id: 'overlay',  icon: Layers, labelKey: 'viewOverlay',  label: 'Overlay' },
];

export default function GradCAMViewer({ originalSrc, heatmapSrc, overlaySrc }) {
  const [activeTab, setActiveTab] = useState('overlay');
  const [opacity, setOpacity]     = useState(0.75);
  const { t } = useLanguage();

  const activeSrc = {
    original: originalSrc,
    heatmap:  heatmapSrc || originalSrc,
    overlay:  null, // handled separately
  };

  return (
    <div style={{ padding: '20px 20px 16px' }}>
      {/* Section heading */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <Flame size={18} style={{ color: '#ea580c', flexShrink: 0 }} aria-hidden="true" />
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-main)' }}>
          {t('gradcamTitle', 'AI Attention Map (Grad-CAM)')}
        </h3>
      </div>
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: 14 }}>
        {t('gradcamSubtitle', 'Highlights the retinal regions the AI focused on when making its decision.')}
      </p>

      {/* Tabs — with Framer Motion layoutId indicator */}
      <div
        role="tablist"
        aria-label="Image view modes"
        style={{
          display: 'flex',
          background: 'var(--surface-muted)',
          padding: 4, borderRadius: 'var(--radius-sm)',
          gap: 4, marginBottom: 14,
          border: '1px solid var(--border-subtle)',
          position: 'relative',
        }}
      >
        {TABS.map(({ id, icon: Icon, labelKey, label }) => {
          const isActive = activeTab === id;
          return (
            <div key={id} style={{ position: 'relative', flex: 1 }}>
              {isActive && (
                <motion.div
                  layoutId="gradcam-tab-bg"
                  style={{
                    position: 'absolute', inset: 0,
                    background: 'white',
                    borderRadius: 'calc(var(--radius-sm) - 2px)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                id={`tab-${id}`}
                aria-controls={`tabpanel-${id}`}
                onClick={() => setActiveTab(id)}
                style={{
                  position: 'relative', zIndex: 1,
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 5,
                  padding: '7px 8px',
                  border: 'none',
                  background: 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  borderRadius: 'calc(var(--radius-sm) - 2px)',
                  fontFamily: 'inherit',
                  transition: 'color 0.15s ease',
                  minHeight: 36,
                }}
              >
                <Icon size={14} strokeWidth={isActive ? 2.5 : 1.75} aria-hidden="true" />
                {t(labelKey, label)}
              </button>
            </div>
          );
        })}
      </div>

      {/* Image display with AnimatePresence crossfade */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        style={{
          position: 'relative', width: '100%', aspectRatio: '1/1',
          background: '#09090b', borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === 'overlay' ? (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <ImgWithFallback
                src={originalSrc}
                alt="Retinal fundus — original"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <ImgWithFallback
                src={heatmapSrc || overlaySrc}
                alt="Grad-CAM AI attention overlay"
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
                  opacity, mixBlendMode: 'screen', pointerEvents: 'none',
                  transition: 'opacity 0.1s ease',
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ position: 'absolute', inset: 0 }}
            >
              <ImgWithFallback
                src={activeSrc[activeTab]}
                alt={activeTab === 'original' ? 'Retinal fundus — original' : 'Grad-CAM attention heatmap'}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Opacity slider (only for overlay) */}
      <AnimatePresence>
        {activeTab === 'overlay' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="opacity-slider-wrapper">
              <label htmlFor="overlay-slider" style={{ whiteSpace: 'nowrap', fontSize: '0.8125rem', fontWeight: 600 }}>
                {t('overlayOpacity', 'Overlay')}:
              </label>
              <input
                id="overlay-slider"
                type="range"
                min="0.1" max="1.0" step="0.05"
                value={opacity}
                onChange={e => setOpacity(parseFloat(e.target.value))}
                className="opacity-slider"
                aria-label={`Heatmap overlay opacity: ${Math.round(opacity * 100)}%`}
              />
              <span style={{ minWidth: 38, textAlign: 'right', fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>
                {Math.round(opacity * 100)}%
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clinical disclaimer */}
      <div style={{
        marginTop: 12, padding: '8px 12px',
        background: 'var(--surface-muted)', borderRadius: 'var(--radius-sm)',
        fontSize: '0.75rem', color: 'var(--text-tertiary)',
        display: 'flex', gap: 7, alignItems: 'flex-start',
        border: '1px solid var(--border-subtle)',
      }}>
        <AlertCircle size={13} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
        <span>{t('gradcamDisclaimer', 'Highlighted areas indicate model attention — not confirmed pathology markers.')}</span>
      </div>
    </div>
  );
}
