import React from 'react';
import { X, CheckCircle2, AlertCircle, Camera, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function HelpModal({ isOpen, onClose }) {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div
      className="modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px'
      }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <div
        className="clean-card"
        style={{
          maxWidth: '600px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 id="help-title" style={{ margin: 0, fontSize: '1.3rem' }}>{t('helpTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '8px',
              borderRadius: '50%'
            }}
            aria-label={t('close')}
          >
            <X size={24} />
          </button>
        </div>

        <p className="subtitle" style={{ marginBottom: '20px' }}>
          {t('helpSubtitle')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '8px', borderRadius: '8px' }}>
              <Camera size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{t('helpStep1Title')}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('helpStep1Desc')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--accent-teal-light)', color: 'var(--accent-teal)', padding: '8px', borderRadius: '8px' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{t('helpStep2Title')}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('helpStep2Desc')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ background: '#fef3c7', color: '#b45309', padding: '8px', borderRadius: '8px' }}>
              <AlertCircle size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{t('helpStep3Title')}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('helpStep3Desc')}</p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{ background: '#f1f5f9', color: '#475569', padding: '8px', borderRadius: '8px' }}>
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', marginBottom: '4px' }}>{t('helpStep4Title')}</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{t('helpStep4Desc')}</p>
            </div>
          </div>
        </div>

        <div className="medical-disclaimer" style={{ marginTop: '20px' }}>
          {t('safetyDisclaimer')}
        </div>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button type="button" className="btn btn-primary" onClick={onClose}>
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
