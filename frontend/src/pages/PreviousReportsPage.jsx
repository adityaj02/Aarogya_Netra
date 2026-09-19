import React, { useState, useEffect } from 'react';
import { Search, Filter, ArrowLeft, FileText, ChevronRight, CheckCircle2, AlertCircle, AlertTriangle, Loader2, Inbox } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { fetchReports } from '../services/api';

export default function PreviousReportsPage({ onSelectReport, onBack }) {
  const { t } = useLanguage();
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      const data = await fetchReports({ search: searchTerm, filter: activeFilter });
      if (isMounted) {
        setReports(data);
        setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [searchTerm, activeFilter]);

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      <div className="clean-card">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
            style={{ padding: '6px 12px', minHeight: '38px', fontSize: '0.9rem' }}
          >
            <ArrowLeft size={16} />
            <span>{t('back')}</span>
          </button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {t('totalScreenings')}: {reports.length}
          </span>
        </div>

        <h2 style={{ marginBottom: '4px' }}>{t('reportsTitle')}</h2>
        <p className="subtitle" style={{ marginBottom: '20px' }}>
          {t('reportsSubtitle')}
        </p>

        {/* Search & Filter Bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
          {/* Search Box */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px', minHeight: '42px', fontSize: '0.95rem' }}
              placeholder={t('searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label={t('searchPlaceholder')}
            />
          </div>

          {/* Filter Chips */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
            <button
              type="button"
              className={`tab-btn ${activeFilter === 'ALL' ? 'active' : ''}`}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}
              onClick={() => setActiveFilter('ALL')}
            >
              {t('filterAll')}
            </button>
            <button
              type="button"
              className={`tab-btn ${activeFilter === 'NO_DR' ? 'active' : ''}`}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}
              onClick={() => setActiveFilter('NO_DR')}
            >
              {t('filterNoDR')}
            </button>
            <button
              type="button"
              className={`tab-btn ${activeFilter === 'DR_DETECTED' ? 'active' : ''}`}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}
              onClick={() => setActiveFilter('DR_DETECTED')}
            >
              {t('filterDRDetected')}
            </button>
            <button
              type="button"
              className={`tab-btn ${activeFilter === 'UNCERTAIN' ? 'active' : ''}`}
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)' }}
              onClick={() => setActiveFilter('UNCERTAIN')}
            >
              {t('filterUncertain')}
            </button>
          </div>
        </div>

        {/* Report List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--primary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
            <Loader2 size={36} className="animate-spin" />
            <span style={{ fontSize: '1.05rem', fontWeight: 500 }}>Loading reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '64px 20px',
              backgroundColor: 'var(--surface-subtle)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-muted)',
              border: '1px dashed var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Inbox size={48} style={{ opacity: 0.4 }} />
            <p style={{ fontSize: '1.1rem', fontWeight: 500, margin: 0 }}>{t('noReportsFound') || "No records found"}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {reports.map((rep) => {
              const isHealthy = rep.stage1Outcome === 'NO_DR';
              const isDR = rep.stage1Outcome === 'DR_DETECTED';
              const isUncertain = rep.stage1Outcome === 'UNCERTAIN';

              return (
                <div
                  key={rep.id}
                  onClick={() => onSelectReport(rep)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSelectReport(rep)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s ease, background 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    {/* Status Icon */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isHealthy ? 'var(--outcome-healthy-bg)' : isDR ? 'var(--outcome-alert-bg)' : 'var(--outcome-warning-bg)',
                        color: isHealthy ? 'var(--outcome-healthy-text)' : isDR ? 'var(--outcome-alert-text)' : 'var(--outcome-warning-text)',
                        flexShrink: 0
                      }}
                    >
                      {isHealthy && <CheckCircle2 size={20} />}
                      {isDR && <AlertCircle size={20} />}
                      {isUncertain && <AlertTriangle size={20} />}
                    </div>

                    {/* Patient & Outcome info */}
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {rep.patient?.name || 'Anonymous Patient'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span>ID: {rep.id}</span>
                        <span>•</span>
                        <span>{rep.date}</span>
                        {rep.severityKey && (
                          <>
                            <span>•</span>
                            <span style={{ fontWeight: 600, color: '#991b1b' }}>{t(rep.severityKey)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: isHealthy ? 'var(--outcome-healthy-bg)' : isDR ? 'var(--outcome-alert-bg)' : 'var(--outcome-warning-bg)',
                        color: isHealthy ? 'var(--outcome-healthy-text)' : isDR ? 'var(--outcome-alert-text)' : 'var(--outcome-warning-text)'
                      }}
                    >
                      {isHealthy && t('outcomeNoDR')}
                      {isDR && t('outcomeDRDetected')}
                      {isUncertain && t('outcomeUncertain')}
                    </span>
                    <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
