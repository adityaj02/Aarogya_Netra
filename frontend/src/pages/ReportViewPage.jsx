import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Download, RotateCcw, ShieldCheck, Calendar,
  CheckCircle2, AlertCircle, AlertTriangle, HelpCircle,
  FileText, Flame, ChevronLeft, Building2, MapPin
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import DoctorValidationPanel from '../components/DoctorValidationPanel';

/* ─── Grade label map ──────────────────────────────────────────── */
const GRADE_LABELS = {
  0: 'Grade 0 — No DR',
  1: 'Grade 1 — Mild DR',
  2: 'Grade 2 — Moderate DR',
  3: 'Grade 3 — Severe DR',
  4: 'Grade 4 — Proliferative DR',
};
const GRADE_COLORS = {
  0: '#16a34a', 1: '#ca8a04', 2: '#ea580c', 3: '#dc2626', 4: '#7f1d1d',
};

/* ─── Outcome config ───────────────────────────────────────────── */
function outcomeStyle(outcome) {
  if (outcome === 'NO_DR')       return { bg: '#f0fdf4', border: '#86efac', color: '#14532d' };
  if (outcome === 'DR_DETECTED') return { bg: '#fef2f2', border: '#fca5a5', color: '#7f1d1d' };
  return { bg: '#fefce8', border: '#fde68a', color: '#713f12' };
}

/* ─── PDF download helper ──────────────────────────────────────── */
function downloadAsPDF(reportId) {
  const prev = document.title;
  document.title = `AarogyaNetra_DR_Report_${reportId || 'screening'}_${new Date().toISOString().slice(0, 10)}`;
  window.print();
  setTimeout(() => { document.title = prev; }, 2000);
}

/* ─── Probability bar ──────────────────────────────────────────── */
function ProbBar({ label, value, color = '#0284c7' }) {
  const pct = (value * 100).toFixed(1);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: 3 }}>
        <span style={{ color: '#475569' }}>{label}</span>
        <strong style={{ color }}>{pct}%</strong>
      </div>
      <div style={{ height: 5, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────── */
export default function ReportViewPage({ report: initialReport, onStartNewScreening, onBack }) {
  const { t } = useLanguage();
  const [report, setReport] = useState(initialReport);

  useEffect(() => {
    setReport(initialReport);
  }, [initialReport]);

  if (!report) return null;

  const isHealthy    = report.stage1Outcome === 'NO_DR';
  const isDR         = report.stage1Outcome === 'DR_DETECTED';
  const isUncertain  = report.stage1Outcome === 'UNCERTAIN';
  const outcome      = outcomeStyle(report.stage1Outcome);
  const gradeNum     = typeof report.Final_Grade === 'number' ? report.Final_Grade
    : typeof report.grade === 'number' ? report.grade : null;
  const gradeColor   = gradeNum != null ? GRADE_COLORS[gradeNum] : '#64748b';
  const gradeLabel   = gradeNum != null ? GRADE_LABELS[gradeNum] : (report.severityKey ? t(report.severityKey) : '—');
  const drProb       = report.probabilities?.Stage1?.Fused_DR_Prob;
  const threshold    = report.probabilities?.Stage1?.Threshold_Used;
  const screenDate   = report.date || new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });

  const OutcomeIcon = isHealthy ? CheckCircle2 : isDR ? AlertCircle : HelpCircle;
  const outcomeText = isHealthy ? t('outcomeNoDR', 'No Diabetic Retinopathy Detected')
    : isDR ? t('outcomeDRDetected', 'Diabetic Retinopathy Detected')
    : t('outcomeUncertain', 'Uncertain — Clinical Review Required');

  return (
    <>
      {/* ── Screen-only action bar ─────────────────────────────── */}
      <div
        className="report-action-bar no-print"
        style={{
          background: 'white',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '12px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
          position: 'sticky',
          top: 'var(--nav-height)',
          zIndex: 20,
          boxShadow: '0 2px 8px -2px rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {onBack && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>
              <ChevronLeft size={16} aria-hidden="true" />
              Back
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={onStartNewScreening}>
            <RotateCcw size={14} aria-hidden="true" />
            {t('startNewScreening', 'New Screening')}
          </button>
        </div>

        {/* Single "Download PDF" button — calls print dialog with right filename */}
        <motion.button
          type="button"
          className="btn btn-primary"
          whileTap={{ scale: 0.97 }}
          onClick={() => downloadAsPDF(report.id)}
          style={{ gap: 8 }}
        >
          <Download size={16} aria-hidden="true" />
          Download PDF
        </motion.button>
      </div>

      {/* ════════════════════════════════════════════════════════════
          PRINTABLE REPORT — all print styling in @media print
          ═══════════════════════════════════════════════════════════ */}
      <div
        id="printable-report"
        style={{
          maxWidth: 860,
          margin: '0 auto',
          padding: '32px 24px 64px',
          fontFamily: 'inherit',
        }}
      >

        {/* ── REPORT HEADER ── */}
        <div className="print-section" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          borderBottom: '2.5px solid #0284c7', paddingBottom: 16, marginBottom: 24,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <img
              src="/aarogyanetra_logo.svg"
              alt="AarogyaNetra"
              style={{ height: 68, width: 'auto', objectFit: 'contain' }}
            />
            <p style={{ fontSize: '0.8rem', color: '#475569', margin: 0 }}>
              AI-Assisted Diabetic Retinopathy Screening · Smart India Hackathon 2026
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
              Screening Report
            </div>
            {report.id && (
              <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#0284c7', fontWeight: 600 }}>
                {report.id}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, justifyContent: 'flex-end', marginTop: 4, fontSize: '0.8125rem', color: '#64748b' }}>
              <Calendar size={13} aria-hidden="true" />
              {screenDate}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>
              Model v2.1 · AarogyaNetra
            </div>
          </div>
        </div>

        {/* ── PATIENT INFO ── */}
        <div className="print-section" style={{
          background: '#f8fafc', border: '1px solid #e2e8f0',
          borderRadius: 12, padding: '16px 20px', marginBottom: 20,
        }}>
          <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
            Patient Information
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {[
              { label: 'Full Name',          value: report.patient?.name              || '—' },
              { label: 'Age / Gender',       value: `${report.patient?.age || '—'} yrs / ${report.patient?.gender || '—'}` },
              { label: 'Date of Birth',      value: report.patient?.dob               || '—' },
              { label: 'Diabetes Duration',  value: report.patient?.diabetesDuration  || '—' },
              ...(report.patient?.mobile ? [{ label: 'Mobile', value: report.patient.mobile }] : []),
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: 2 }}>{label}</div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── OUTCOME BANNER ── */}
        <div className="print-section" style={{
          background: outcome.bg, border: `1.5px solid ${outcome.border}`,
          borderRadius: 12, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          <OutcomeIcon size={28} style={{ color: outcome.color, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: outcome.color, marginBottom: 4 }}>
              {outcomeText}
            </div>
            {gradeNum != null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: `${gradeColor}15`, color: gradeColor,
                  border: `1px solid ${gradeColor}40`,
                  borderRadius: 999, padding: '4px 12px',
                  fontWeight: 700, fontSize: '0.875rem',
                }}>
                  {gradeLabel}
                </span>
                <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                  Model Confidence: <strong>{report.confidence || '—'}</strong>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── SCREENING SUMMARY GRID ── */}
        <div className="print-section" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 12, marginBottom: 20,
        }}>
          {[
            { label: 'Stage 1 Outcome',  value: isHealthy ? 'No DR' : isDR ? 'DR Detected' : 'Uncertain', highlight: isDR },
            { label: 'Severity Grade',   value: gradeLabel },
            { label: 'Model Confidence', value: report.confidence || '—' },
            ...(drProb != null ? [{ label: 'DR Probability', value: `${(drProb * 100).toFixed(1)}%`, highlight: drProb > (threshold ?? 0.45) }] : []),
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 10, padding: '12px 14px',
            }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: highlight ? '#dc2626' : '#0f172a' }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── CLINICAL RECOMMENDATION ── */}
        <div className="print-section" style={{
          borderLeft: '4px solid #0284c7', background: '#eff6ff',
          borderRadius: '0 10px 10px 0', padding: '16px 18px', marginBottom: 20,
        }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e40af', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Calendar size={16} aria-hidden="true" />
            Clinical Recommendation
          </h3>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.9rem', color: '#1e3a8a', display: 'flex', flexDirection: 'column', gap: 5, lineHeight: 1.6 }}>
            {isHealthy ? (
              <>
                <li>Routine annual comprehensive eye examination recommended.</li>
                <li>Maintain controlled blood sugar, blood pressure, and cholesterol.</li>
                <li><strong>Referral urgency:</strong> Annual review — no immediate ophthalmologist referral required.</li>
              </>
            ) : isDR ? (
              <>
                <li>Schedule an ophthalmologist or retina specialist appointment promptly.</li>
                <li>Bring this printed report to your consultation.</li>
                <li>Seek immediate care if you experience sudden vision changes, floaters, or vision loss.</li>
                <li><strong>Referral urgency:</strong> {gradeNum != null && gradeNum >= 3 ? 'Urgent — within 1 week.' : 'Within 2–4 weeks.'}</li>
              </>
            ) : (
              <>
                <li>{t(report.referralKey || 'Schedule clinical review within 2 weeks.')}</li>
                <li>{t(report.timelineKey || 'Bring this report to your next consultation.')}</li>
              </>
            )}
          </ul>
        </div>

        {/* ── HOSPITAL REFERRAL ── */}
        {report.referral_hospital && (
          <div className="print-section" style={{
            borderLeft: '4px solid #1d4ed8', background: '#eff6ff',
            borderRadius: '0 10px 10px 0', padding: '16px 18px', marginBottom: 20,
          }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#1e40af', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Building2 size={16} aria-hidden="true" />
              Hospital Referral
            </h3>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <MapPin size={15} style={{ color: '#3b82f6', marginTop: 2, flexShrink: 0 }} aria-hidden="true" />
              <div>
                <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9375rem' }}>{report.referral_hospital}</div>
                {report.referral_state && (
                  <div style={{ fontSize: '0.8125rem', color: '#3b82f6', marginTop: 2 }}>{report.referral_state}</div>
                )}
              </div>
            </div>
          </div>
        )}


        {(report.imageData || report.heatmapDataUrl) && (
          <div className="print-section" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Flame size={16} style={{ color: '#ea580c' }} aria-hidden="true" />
              Retinal Images — AI Attention Analysis (Grad-CAM)
            </h3>
            <div className="print-images-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {report.imageData && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Original Fundus</div>
                  <img
                    src={report.imageData}
                    alt="Original retinal fundus photograph"
                    style={{ width: '100%', maxWidth: 280, aspectRatio: '1/1', objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0', display: 'block', margin: '0 auto' }}
                  />
                </div>
              )}
              {(report.overlayDataUrl || report.heatmapDataUrl) && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Attention Overlay</div>
                  <img
                    src={report.overlayDataUrl || report.heatmapDataUrl}
                    alt="Grad-CAM AI attention heatmap overlay"
                    style={{ width: '100%', maxWidth: 280, aspectRatio: '1/1', objectFit: 'cover', borderRadius: 10, border: '1px solid #e2e8f0', display: 'block', margin: '0 auto' }}
                  />
                </div>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center', marginTop: 8, fontStyle: 'italic' }}>
              Highlighted areas indicate regions of AI model attention. These are not confirmed pathology markers.
            </p>
          </div>
        )}

        {/* ── AI EXPLANATION ── */}
        {report.explanation && (
          <div className="print-section" style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileText size={16} style={{ color: '#0284c7' }} aria-hidden="true" />
              AI Clinical Explanation
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.7, background: '#f8fafc', borderRadius: 8, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
              {report.explanation}
            </p>
          </div>
        )}

        {/* ── DOCTOR VALIDATION PANEL (Screen only) ── */}
        <div className="no-print" style={{ marginBottom: 24 }}>
          <DoctorValidationPanel 
            result={report} 
            onFeedbackSubmitted={(fb) => {
              setReport(prev => ({
                ...prev,
                referral_hospital: fb.referral_hospital,
                referral_state: fb.referral_state
              }));
            }} 
          />
        </div>

        {/* ── AI PROBABILITIES (summarised for print) ── */}
        {report.probabilities?.Stage1 && (
          <div className="print-section" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>
              AI Model Probability Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Stage 1 */}
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  Stage 1 — DR Detection
                </div>
                {report.probabilities.Stage1.P_M0ALL_DR != null && (
                  <ProbBar label="M0ALL (Base)" value={report.probabilities.Stage1.P_M0ALL_DR} />
                )}
                {report.probabilities.Stage1.P_M01_DR != null && (
                  <ProbBar label="M01 Boundary (1+ vs 0)" value={report.probabilities.Stage1.P_M01_DR} />
                )}
                <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
                <ProbBar label="Fused DR Probability" value={report.probabilities.Stage1.Fused_DR_Prob} color="#dc2626" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                  <span>Decision Threshold</span>
                  <span>{((report.probabilities.Stage1.Threshold_Used || 0.45) * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Stage 2 fused probs */}
              {report.probabilities.Stage2?.Fused_Probs && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                    Stage 2 — Grade Probabilities
                  </div>
                  {Object.entries(report.probabilities.Stage2.Fused_Probs).map(([grade, prob]) => (
                    <ProbBar key={grade} label={grade} value={prob} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── SIGNATURE & DISCLAIMER ── */}
        <div className="print-section" style={{
          borderTop: '1.5px solid #e2e8f0', paddingTop: 20,
          display: 'flex', flexWrap: 'wrap', gap: 24,
          justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div style={{ maxWidth: 460, flex: '1 1 300px' }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
              <ShieldCheck size={14} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
              <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.55, margin: 0 }}>
                <strong>Important:</strong> AarogyaNetra is an AI-assistive screening tool. This report is not a definitive
                medical diagnosis. All results must be reviewed and confirmed by a qualified ophthalmologist or licensed
                healthcare provider before any clinical decision is made. Model accuracy may vary based on image quality
                and patient demographics. Built for Smart India Hackathon 2026.
              </p>
            </div>
          </div>
          <div style={{ textAlign: 'center', flex: '0 0 auto' }}>
            <div style={{ borderBottom: '1.5px solid #94a3b8', width: 160, marginBottom: 6 }} />
            <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Reviewing Clinician / Stamp</div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>Date: _______________</div>
          </div>
        </div>

        {/* ── Right panel: Technical AI Details (screen only) ── */}
        {/* Moved inline — shown below main content on screen, hidden on print */}
        {report.probabilities && (
          <div className="no-print" style={{ marginTop: 24 }}>
            <div style={{
              background: 'white', border: '1px solid var(--border-subtle)',
              borderRadius: 16, padding: '24px',
              boxShadow: '0 4px 16px -4px rgba(0,0,0,0.06)',
            }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
                Technical AI Details (Screen Only — Not Printed)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                {report.probabilities.Stage2?.M1234_Probs && (
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Model M1234 (Base)</div>
                    {Object.entries(report.probabilities.Stage2.M1234_Probs).map(([g, p]) => (
                      <div key={g} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 3 }}>
                        <span style={{ color: '#475569' }}>{g}</span><strong>{(p * 100).toFixed(1)}%</strong>
                      </div>
                    ))}
                  </div>
                )}
                {(report.probabilities.Stage2?.P_M23 != null || report.probabilities.Stage2?.P_M34 != null) && (
                  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Active Boundary Models</div>
                    {report.probabilities.Stage2.P_M12 != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 3 }}><span style={{ color: '#475569' }}>M12 (2+ vs 1)</span><strong>{(report.probabilities.Stage2.P_M12 * 100).toFixed(1)}%</strong></div>
                    )}
                    {report.probabilities.Stage2.P_M23 != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 3 }}><span style={{ color: '#475569' }}>M23 (3+ vs 2)</span><strong>{(report.probabilities.Stage2.P_M23 * 100).toFixed(1)}%</strong></div>
                    )}
                    {report.probabilities.Stage2.P_M34 != null && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 3 }}><span style={{ color: '#475569' }}>M34 (4 vs 3)</span><strong>{(report.probabilities.Stage2.P_M34 * 100).toFixed(1)}%</strong></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
