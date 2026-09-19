import React from 'react';
import { CheckCircle, XCircle, RefreshCw, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ImageQualityStatus({
  iqaResult,
  imageSrc,
  onRecapture,
  onProceedToAnalysis
}) {
  const { t } = useLanguage();

  if (!iqaResult) return null;

  const passed = iqaResult.iqaPassed;
  const details = iqaResult.details || {};

  return (
    <div className="clean-card" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '4px' }}>{t('iqaTitle')}</h2>
      <p className="subtitle" style={{ textAlign: 'center', marginBottom: '24px' }}>
        {passed ? t('iqaPassedSubtitle') : t('iqaSubtitle')}
      </p>

      {/* Image Preview with overlay badge */}
      <div className="preview-container" style={{ marginBottom: '24px' }}>
        <img src={imageSrc} alt="Retinal Quality Check" className="preview-img" />
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            backgroundColor: passed ? 'rgba(6, 95, 70, 0.92)' : 'rgba(153, 27, 27, 0.92)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.9rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {passed ? <CheckCircle size={18} /> : <XCircle size={18} />}
          <span>{passed ? t('iqaPassedTitle') : t('iqaFailedTitle')}</span>
        </div>
      </div>

      {/* Metric Breakdown */}
      <div
        style={{
          background: 'var(--surface-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '16px',
          marginBottom: '24px'
        }}
      >
        <h4 style={{ fontSize: '0.95rem', marginBottom: '12px', color: 'var(--text-muted)' }}>
          Standard Quality Verification
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('iqaFocus')}</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{details.focus || t('statusGood')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('iqaIllumination')}</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{details.illumination || t('statusGood')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('iqaFieldOfView')}</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{details.fov || t('statusGood')}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('iqaRetinalVisibility')}</div>
            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{details.retinalVisibility || t('statusGood')}</div>
          </div>
        </div>
      </div>

      {/* Decision Status Callout */}
      {passed ? (
        <div
          className="result-status-card healthy"
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}
        >
          <ShieldCheck size={24} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700 }}>{t('iqaPassedTitle')}</div>
            <div style={{ fontSize: '0.9rem' }}>{t('iqaPassedSubtitle')}</div>
          </div>
        </div>
      ) : (
        <div
          className="result-status-card uncertain"
          style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px' }}
        >
          <AlertTriangle size={24} style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700 }}>{t('iqaFailedTitle')}</div>
            <div style={{ fontSize: '0.9rem' }}>{t('iqaFailedSubtitle')}</div>
          </div>
        </div>
      )}

      {/* Primary Actions based strictly on IQA outcome */}
      <div className="btn-group">
        {passed ? (
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onRecapture}
              style={{ flex: 1 }}
            >
              <RefreshCw size={18} />
              {t('replaceImage')}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onProceedToAnalysis}
              style={{ flex: 2 }}
            >
              <span>{t('proceedToAnalysis')}</span>
              <ArrowRight size={18} />
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary btn-block"
            onClick={onRecapture}
          >
            <RefreshCw size={20} />
            <span>{t('recaptureImage')}</span>
          </button>
        )}
      </div>
    </div>
  );
}
