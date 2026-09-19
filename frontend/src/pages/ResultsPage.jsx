import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import GradCAMViewer from '../components/GradCAMViewer';
import DoctorValidationPanel from '../components/DoctorValidationPanel';

export default function ResultsPage({
  result,
  onViewReport,
  onStartNewScreening
}) {
  const { t } = useLanguage();

  const formatExplanation = (text) => {
    if (!text) return null;
    const parts = text.split(/Guidance:/i);
    if (parts.length > 1) {
      let finding = parts[0].replace(/This is a screening assessment and not a definitive diagnosis.*/i, '').trim();
      return (
        <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <li><strong>Finding:</strong> {finding}</li>
          <li><strong>Guidance:</strong> {parts[1].trim()}</li>
          <li><strong>Disclaimer:</strong> AI-screening assessment only; not a definitive diagnosis.</li>
        </ul>
      );
    }
    return text;
  };

  if (!result) return null;

  const isHealthy = result.stage1Outcome === 'NO_DR';
  const isDRDetected = result.stage1Outcome === 'DR_DETECTED';
  const isUncertain = result.stage1Outcome === 'UNCERTAIN';
  const isUngradable = result.stage1Outcome === 'UNGRADABLE' || result.Final_Grade === 'UNGRADABLE';

  const severityDescMap = {
    severityMild: 'severityMildDesc',
    severityModerate: 'severityModerateDesc',
    severitySevere: 'severitySevereDesc',
    severityProliferative: 'severityProliferativeDesc',
    severityNone: 'severityNoneDesc'
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {/* 1. Main Stage 1 Screening Result Card */}
      <div style={{ flex: '1 1 500px' }}>
        <div className="clean-card" style={{ paddingBottom: '20px', marginBottom: '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{t('resultTitle')}</h2>
            <span
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: isUngradable ? '#fee2e2' : result.confidence === 'HIGH' ? 'var(--accent-teal-light)' : '#fef3c7',
                color: isUngradable ? '#991b1b' : result.confidence === 'HIGH' ? 'var(--accent-teal)' : '#b45309'
              }}
            >
              {isUngradable ? 'QUALITY WARNING' : result.confidence === 'HIGH' ? t('confidenceHigh') : t('confidenceReview')}
            </span>
          </div>

          {/* Outcome Box */}
          {isUngradable && (
            <div className="result-status-card ungradable" style={{ borderLeft: '6px solid #dc2626', backgroundColor: '#fff1f2', padding: '16px', borderRadius: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={36} style={{ flexShrink: 0, color: '#e11d48' }} />
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#9f1239' }}>
                    Quality Insufficient / Ungradable
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#be123c', marginTop: '4px' }}>
                    The uploaded image quality is too low (e.g. severe blur, opacity, or poor lighting) to guarantee an accurate AI DR diagnosis.
                  </div>
                </div>
              </div>
            </div>
          )}

          {isHealthy && !isUngradable && (
            <div className="result-status-card healthy">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <CheckCircle2 size={32} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {t('outcomeNoDR')}
                  </div>
                  <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
                    {t('severityNoneDesc')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isDRDetected && !isUngradable && (
            <div className="result-status-card dr-positive" style={{ borderLeft: '6px solid #dc2626', backgroundColor: '#fef2f2', boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertCircle size={32} style={{ flexShrink: 0, color: '#dc2626' }} />
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {t('outcomeDRDetected')}
                  </div>
                  {result.severityKey && (
                    <div style={{ marginTop: '6px' }}>
                      <span
                        style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-sm)',
                          fontWeight: 700,
                          fontSize: '1rem',
                          display: 'inline-block',
                          marginBottom: '4px'
                        }}
                      >
                        {t(result.severityKey)}
                      </span>
                      <div style={{ fontSize: '0.85rem', color: '#7f1d1d' }}>
                        {t(severityDescMap[result.severityKey] || '')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {isUncertain && !isUngradable && (
            <div className="result-status-card uncertain">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={32} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                    {t('outcomeUncertain')}
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, marginTop: '4px' }}>
                    {t('uncertainNoticeTitle')}
                  </div>
                  <div style={{ fontSize: '0.85rem', marginTop: '2px' }}>
                    {t('uncertainNoticeDesc')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. Clinical Recommendation & Referral */}
          <div
            style={{
              marginTop: '16px',
              padding: '16px',
              backgroundColor: 'var(--surface-subtle)',
              borderRadius: 'var(--radius-md)',
              borderLeft: '4px solid var(--primary)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <Calendar size={18} style={{ color: 'var(--primary)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{t('recommendationTitle')}</h3>
            </div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginTop: '4px' }}>
              {t(result.referralKey)}
            </div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
              {t(result.timelineKey)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="btn-group" style={{ marginTop: '24px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onStartNewScreening}
              style={{ flex: 1 }}
            >
              <RotateCcw size={18} />
              <span>{t('startNewScreening')}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={onViewReport}
              style={{ flex: 2 }}
            >
              <FileText size={18} />
              <span>{t('viewReport')}</span>
              <ArrowRight size={18} />
            </button>
          </div>

          {/* 3. Knowledge-Grounded Human-Readable Explanation */}
          <div style={{ marginTop: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <Sparkles size={18} style={{ color: 'var(--accent-teal)' }} />
              <h3 style={{ margin: 0, fontSize: '1.05rem' }}>{t('clinicalExplanationTitle')}</h3>
            </div>
            <div
              style={{
                fontSize: '0.95rem',
                color: 'var(--text-main)',
                lineHeight: 1.5,
                background: '#fff',
                padding: '16px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {formatExplanation(result.explanation)}
            </div>
          </div>

          {/* Non-intrusive safety disclaimer */}
          <div className="medical-disclaimer" style={{ marginTop: '20px' }}>
            <ShieldCheck size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
            {t('safetyDisclaimer')}
          </div>
          
          {/* Doctor Validation Panel */}
          <DoctorValidationPanel result={result} />
        </div>
      </div>

      {/* Side Column for Probabilities and Visualizations */}
      {(result.probabilities || result.heatmapDataUrl) && (
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* 4. Grad-CAM Explainable Attention Visualizer */}
          <div className="clean-card" style={{ padding: '0', overflow: 'hidden', marginBottom: 0 }}>
            <GradCAMViewer
              originalSrc={result.imageData}
              heatmapSrc={result.heatmapDataUrl}
              overlaySrc={result.overlayDataUrl}
            />
          </div>

          {result.probabilities && (
          <div className="clean-card" style={{ padding: '24px' }}>
            <details>
              <summary style={{ fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-main)' }}>
                <svg className="w-5 h-5" style={{ color: 'var(--primary)', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                </svg>
                View Technical AI Details
              </summary>
              <div style={{ marginTop: '20px' }}>
            
            {result.probabilities.Stage1 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stage 1: Detection Models</h4>
                <div style={{ background: 'var(--surface-subtle)', padding: '12px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', color: 'var(--text-muted)' }}>
                    <span>Model M0ALL (Base):</span>
                    <span>{result.probabilities.Stage1.P_M0ALL_DR !== undefined ? (result.probabilities.Stage1.P_M0ALL_DR * 100).toFixed(1) + '%' : 'N/A'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', color: 'var(--text-muted)' }}>
                    <span>Boundary M01 (1+ vs 0):</span>
                    <span>{result.probabilities.Stage1.P_M01_DR !== undefined ? (result.probabilities.Stage1.P_M01_DR * 100).toFixed(1) + '%' : 'N/A'}</span>
                  </div>
                  <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 500 }}>Fused DR Prob:</span>
                    <strong style={{ color: 'var(--primary)' }}>{(result.probabilities.Stage1.Fused_DR_Prob * 100).toFixed(1)}%</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 500 }}>Cutoff Threshold:</span>
                    <span style={{ color: 'var(--text-muted)' }}>{(result.probabilities.Stage1.Threshold_Used * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            )}

            {result.probabilities.Stage2 && (
              <div>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stage 2: Severity Models</h4>
                <div style={{ background: 'var(--surface-subtle)', padding: '16px 12px', borderRadius: 'var(--radius-md)', fontSize: '0.9rem' }}>
                  
                  {/* Base M1234 Probs */}
                  {result.probabilities.Stage2.M1234_Probs && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Model M1234 (Base):</div>
                      {Object.entries(result.probabilities.Stage2.M1234_Probs).map(([grade, prob]) => (
                        <div key={grade} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          <span>{grade}</span>
                          <span>{(prob * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Active Boundary Models */}
                  {(result.probabilities.Stage2.P_M12 !== undefined || result.probabilities.Stage2.P_M23 !== undefined || result.probabilities.Stage2.P_M34 !== undefined) && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>Active Boundary Models:</div>
                      {result.probabilities.Stage2.P_M12 !== undefined && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          <span>M12 (Grade 2+ vs 1)</span>
                          <span>{(result.probabilities.Stage2.P_M12 * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      {result.probabilities.Stage2.P_M23 !== undefined && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          <span>M23 (Grade 3+ vs 2)</span>
                          <span>{(result.probabilities.Stage2.P_M23 * 100).toFixed(1)}%</span>
                        </div>
                      )}
                      {result.probabilities.Stage2.P_M34 !== undefined && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          <span>M34 (Grade 4 vs 3)</span>
                          <span>{(result.probabilities.Stage2.P_M34 * 100).toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {result.probabilities.Stage2.Fused_Probs && (
                    <>
                      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '12px 0' }} />
                      <div style={{ fontWeight: 600, marginBottom: '8px' }}>Fused Final Probabilities:</div>
                      {Object.entries(result.probabilities.Stage2.Fused_Probs).map(([grade, prob]) => (
                        <div key={grade} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
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
            </details>
          </div>
          )}
        </div>
      )}
    </div>
  );
}
