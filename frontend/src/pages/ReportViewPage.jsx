import React from 'react';
import {
  Printer,
  Download,
  RotateCcw,
  Eye,
  ShieldCheck,
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Calculator
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import DoctorValidationPanel from '../components/DoctorValidationPanel';

export default function ReportViewPage({ report, onStartNewScreening }) {
  const { t } = useLanguage();

  if (!report) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Set document title temporarily so the browser's print-to-PDF dialog
    // suggests a meaningful filename (e.g. "AarogyaNetra_Report_AN-2026-XXXX.pdf")
    const previousTitle = document.title;
    document.title = `AarogyaNetra_Report_${report.id || 'screening'}_${new Date().toISOString().slice(0, 10)}`;
    window.print();
    // Restore title after dialog opens
    setTimeout(() => { document.title = previousTitle; }, 2000);
  };

  const isHealthy = report.stage1Outcome === 'NO_DR';
  const isDR = report.stage1Outcome === 'DR_DETECTED';
  const isUncertain = report.stage1Outcome === 'UNCERTAIN';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top Action Bar (hidden in print) */}
      <div
        className="no-print"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onStartNewScreening}
        >
          <RotateCcw size={18} />
          <span>{t('startNewScreening')}</span>
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownload}
          >
            <Download size={18} />
            <span>{t('downloadReport')}</span>
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handlePrint}
          >
            <Printer size={18} />
            <span>{t('printReport')}</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="print-flex-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'flex-start' }}>

        {/* LEFT CARD: Main Printable Clinical Report */}
        <div className="clean-card" style={{ flex: '1 1 650px', padding: '36px', background: '#fff', minWidth: '300px' }}>
          {/* Printable Hospital / Clinic Letterhead Header */}
          <div className="print-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid var(--primary)', paddingBottom: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ height: '52px', display: 'flex', alignItems: 'center' }}>
                <img src="/aarogyalogo.jpeg" alt="AarogyaNetra" style={{ height: '100%', width: 'auto', objectFit: 'contain' }} />
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>
                {t('reportId')}: <span style={{ fontFamily: 'monospace' }}>{report.id}</span>
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {t('screeningDate')}: {report.date}
              </div>
            </div>
          </div>

          {/* Patient Details Grid */}
          <div
            style={{
              background: 'var(--surface-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px 20px',
              marginBottom: '24px',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              {t('patientInfoTitle')}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('fullName')}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>{report.patient?.name || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('age')} / {t('gender')}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  {report.patient?.age || '—'} yrs, {t(report.patient?.gender ? `gender${report.patient.gender.charAt(0).toUpperCase() + report.patient.gender.slice(1)}` : '—')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('diabetesDuration')}</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>
                  {t(report.patient?.diabetesDuration || 'durationNotKnown')}
                </div>
              </div>
              {report.patient?.mobile && (
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{t('mobileNumber')}</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 600 }}>{report.patient.mobile}</div>
                </div>
              )}
            </div>
          </div>

          {/* Diagnostic Assessment Block */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>{t('screeningSummary')}</h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
                marginBottom: '16px'
              }}
            >
              {/* Screening Stage 1 Outcome */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: isHealthy ? 'var(--outcome-healthy-bg)' : isDR ? 'var(--outcome-alert-bg)' : 'var(--outcome-warning-bg)',
                  border: `1.5px solid ${isHealthy ? 'var(--outcome-healthy-border)' : isDR ? 'var(--outcome-alert-border)' : 'var(--outcome-warning-border)'}`
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {t('stage1Outcome')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                  {isHealthy && t('outcomeNoDR')}
                  {isDR && t('outcomeDRDetected')}
                  {isUncertain && t('outcomeUncertain')}
                </div>
              </div>

              {/* Severity Result */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {t('severityTitle')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                  {report.severityKey ? t(report.severityKey) : '—'}
                </div>
              </div>

              {/* Calibrated Confidence */}
              <div
                style={{
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--surface-subtle)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {t('confidenceTitle')}
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '4px' }}>
                  {report.confidence === 'HIGH' ? t('confidenceHigh') : t('confidenceReview')}
                </div>
              </div>
            </div>

            {/* Clinical Action / Referral */}
            <div
              style={{
                padding: '16px',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--primary)',
                background: 'var(--primary-light)'
              }}
            >
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary-hover)' }}>
                {t('recommendationTitle')}
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary-hover)', marginTop: '2px' }}>
                {t(report.referralKey)}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginTop: '4px' }}>
                {t(report.timelineKey)}
              </div>
            </div>
          </div>

          {/* Explainable AI Visuals */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {t('gradcamTitle')}
            </h3>
            <div className="print-images-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                  {t('viewOriginal')}
                </div>
                <img
                  src={report.imageData}
                  alt="Original Fundus"
                  style={{ width: '100%', maxWidth: '260px', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                />
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--text-muted)' }}>
                  {t('viewOverlay')}
                </div>
                <img
                  src={report.overlayDataUrl || report.heatmapDataUrl}
                  alt="AI Attention Area Overlay"
                  style={{ width: '100%', maxWidth: '260px', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
                />
              </div>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
              {t('gradcamDisclaimer')}
            </div>
          </div>

          {/* Grounded Clinical Explanation */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
              {t('clinicalExplanationTitle')}
            </h3>
            <p style={{ fontSize: '0.95rem', lineHeight: 1.5, color: 'var(--text-main)', marginBottom: '16px' }}>
              {report.explanation}
            </p>
          </div>

          {/* Doctor Validation Panel (hidden in print) */}
          <div className="no-print">
            <DoctorValidationPanel result={report} />
          </div>

          {/* Signature & Disclaimer Footer */}
          <div className="print-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div style={{ maxWidth: '420px' }}>
              <ShieldCheck size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
              {t('safetyDisclaimer')}
            </div>
            <div style={{ textAlign: 'center', minWidth: '180px' }}>
              <div style={{ borderBottom: '1px solid #94a3b8', width: '140px', margin: '0 auto 6px' }} />
              <div>Reviewing Clinician / Staff</div>
            </div>
          </div>
        </div>
        {/* End of Left Card */}

        {/* RIGHT CARD: Calculation Details / Probabilities (hidden in print) */}
        {report.probabilities && (
          <div className="clean-card no-print" style={{ flex: '1 1 350px', padding: '24px', background: '#fff', minWidth: '300px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px' }}>
              <Calculator size={20} color="var(--primary)" />
              <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: 600, color: 'var(--text-main)' }}>
                View Technical AI Details
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {report.probabilities.Stage1 && (
                <div style={{ background: 'var(--surface-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stage 1: Detection Models</h4>
                  <div style={{ fontSize: '0.9rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--text-muted)' }}>
                      <span>Model M0ALL (Base):</span>
                      <span>{report.probabilities.Stage1.P_M0ALL_DR !== undefined ? (report.probabilities.Stage1.P_M0ALL_DR * 100).toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-muted)' }}>
                      <span>Boundary M01 (1+ vs 0):</span>
                      <span>{report.probabilities.Stage1.P_M01_DR !== undefined ? (report.probabilities.Stage1.P_M01_DR * 100).toFixed(1) + '%' : 'N/A'}</span>
                    </div>
                    <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span style={{ fontWeight: 500 }}>Fused DR Prob:</span>
                      <strong style={{ color: 'var(--primary)' }}>{(report.probabilities.Stage1.Fused_DR_Prob * 100).toFixed(1)}%</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 500 }}>Cutoff Threshold:</span>
                      <span style={{ color: 'var(--text-muted)' }}>{(report.probabilities.Stage1.Threshold_Used * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {report.probabilities.Stage2 && (
                <div style={{ background: 'var(--surface-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stage 2: Severity Models</h4>
                  <div style={{ fontSize: '0.9rem' }}>
                    {report.probabilities.Stage2.M1234_Probs && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Model M1234 (Base):</div>
                        {Object.entries(report.probabilities.Stage2.M1234_Probs).map(([grade, prob]) => (
                          <div key={grade} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <span>{grade}</span>
                            <span>{(prob * 100).toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {(report.probabilities.Stage2.P_M12 !== undefined || report.probabilities.Stage2.P_M23 !== undefined || report.probabilities.Stage2.P_M34 !== undefined) && (
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Active Boundary Models:</div>
                        {report.probabilities.Stage2.P_M12 !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <span>M12 (Grade 2+ vs 1)</span>
                            <span>{(report.probabilities.Stage2.P_M12 * 100).toFixed(1)}%</span>
                          </div>
                        )}
                        {report.probabilities.Stage2.P_M23 !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <span>M23 (Grade 3+ vs 2)</span>
                            <span>{(report.probabilities.Stage2.P_M23 * 100).toFixed(1)}%</span>
                          </div>
                        )}
                        {report.probabilities.Stage2.P_M34 !== undefined && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <span>M34 (Grade 4 vs 3)</span>
                            <span>{(report.probabilities.Stage2.P_M34 * 100).toFixed(1)}%</span>
                          </div>
                        )}
                      </div>
                    )}

                    {report.probabilities.Stage2.Fused_Probs && (
                      <>
                        <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '12px 0' }} />
                        <div style={{ fontWeight: 600, marginBottom: '8px' }}>Fused Final Probabilities:</div>
                        {Object.entries(report.probabilities.Stage2.Fused_Probs).map(([grade, prob]) => (
                          <div key={grade} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span style={{ fontWeight: 500 }}>{grade}</span>
                              <strong style={{ color: 'var(--primary)' }}>{(prob * 100).toFixed(1)}%</strong>
                            </div>
                            <div style={{ height: '6px', background: '#cbd5e1', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${prob * 100}%`, background: 'var(--primary)' }} />
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
