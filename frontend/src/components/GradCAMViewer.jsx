import React, { useState } from 'react';
import { Layers, Eye, Flame, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function GradCAMViewer({ originalSrc, heatmapSrc, overlaySrc }) {
  const [activeTab, setActiveTab] = useState('overlay'); // 'original', 'heatmap', 'overlay'
  const [opacity, setOpacity] = useState(0.75);
  const { t } = useLanguage();

  return (
    <div className="gradcam-container" style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Flame size={20} style={{ color: '#ea580c' }} aria-hidden="true" />
          {t('gradcamTitle')}
        </h3>
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        {t('gradcamSubtitle')}
      </p>

      {/* Tabs */}
      <div className="view-tabs" role="tablist" aria-label="Visualizations">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'original'}
          className={`tab-btn ${activeTab === 'original' ? 'active' : ''}`}
          onClick={() => setActiveTab('original')}
        >
          <Eye size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          {t('viewOriginal')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'heatmap'}
          className={`tab-btn ${activeTab === 'heatmap' ? 'active' : ''}`}
          onClick={() => setActiveTab('heatmap')}
        >
          <Flame size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          {t('viewHeatmap')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overlay'}
          className={`tab-btn ${activeTab === 'overlay' ? 'active' : ''}`}
          onClick={() => setActiveTab('overlay')}
        >
          <Layers size={15} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          {t('viewOverlay')}
        </button>
      </div>

      {/* Display Box */}
      <div
        className="preview-container"
        style={{
          position: 'relative',
          backgroundColor: '#09090b',
          aspectRatio: '1/1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {activeTab === 'original' && (
          <img src={originalSrc} alt="Retinal Fundus Original" className="preview-img" />
        )}

        {activeTab === 'heatmap' && (
          <img src={heatmapSrc || originalSrc} alt="Grad-CAM Attention Heatmap" className="preview-img" />
        )}

        {activeTab === 'overlay' && (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {/* Base Image */}
            <img
              src={originalSrc}
              alt="Retinal Base"
              className="preview-img"
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            />
            {/* Heatmap Overlay with dynamic opacity */}
            <img
              src={heatmapSrc || overlaySrc}
              alt="AI Attention Overlay"
              className="preview-img"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: opacity,
                mixBlendMode: 'screen',
                pointerEvents: 'none'
              }}
            />
          </div>
        )}
      </div>

      {/* Opacity slider for overlay mode */}
      {activeTab === 'overlay' && (
        <div className="opacity-slider-wrapper">
          <label htmlFor="overlay-slider" style={{ whiteSpace: 'nowrap' }}>
            {t('overlayOpacity')}:
          </label>
          <input
            id="overlay-slider"
            type="range"
            min="0.2"
            max="1.0"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(parseFloat(e.target.value))}
            className="opacity-slider"
            aria-label={t('overlayOpacity')}
          />
          <span style={{ minWidth: '36px', textAlign: 'right', fontWeight: 600 }}>
            {Math.round(opacity * 100)}%
          </span>
        </div>
      )}

      {/* SRS Mandatory Safety Disclaimer */}
      <div
        style={{
          marginTop: '12px',
          padding: '10px 14px',
          background: 'var(--surface-subtle)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          display: 'flex',
          gap: '8px',
          alignItems: 'flex-start'
        }}
      >
        <AlertCircle size={16} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
        <span>{t('gradcamDisclaimer')}</span>
      </div>
    </div>
  );
}
