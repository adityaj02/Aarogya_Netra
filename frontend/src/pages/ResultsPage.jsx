import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion';
import {
  CheckCircle2, AlertTriangle, FileText, Printer, RotateCcw,
  Camera, ArrowRight, ShieldCheck, Calendar, AlertCircle,
  HelpCircle, ChevronDown, Download, Sparkles, Info
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import GradCAMViewer from '../components/GradCAMViewer';

/* ─── Grade scale config ─────────────────────────────────────────── */
const GRADE_CONFIG = {
  0: { label: 'No DR',         color: 'var(--grade-0)', bg: 'var(--grade-0-bg)', border: 'var(--grade-0-border)', textColor: 'var(--grade-0-text)' },
  1: { label: 'Mild DR',       color: 'var(--grade-1)', bg: 'var(--grade-1-bg)', border: 'var(--grade-1-border)', textColor: 'var(--grade-1-text)' },
  2: { label: 'Moderate DR',   color: 'var(--grade-2)', bg: 'var(--grade-2-bg)', border: 'var(--grade-2-border)', textColor: 'var(--grade-2-text)' },
  3: { label: 'Severe DR',     color: 'var(--grade-3)', bg: 'var(--grade-3-bg)', border: 'var(--grade-3-border)', textColor: 'var(--grade-3-text)' },
  4: { label: 'Proliferative', color: 'var(--grade-4)', bg: 'var(--grade-4-bg)', border: 'var(--grade-4-border)', textColor: 'var(--grade-4-text)' },
};

/* ─── Animated counter ───────────────────────────────────────────── */
function AnimatedNumber({ value, decimals = 1, suffix = '%' }) {
  const mv  = useMotionValue(0);
  const ref = useRef(null);
  useEffect(() => {
    const c = animate(mv, Number(value) || 0, { duration: 0.9, ease: 'easeOut' });
    const unsub = mv.on('change', (v) => {
      if (ref.current) ref.current.textContent = v.toFixed(decimals) + suffix;
    });
    return () => { c.stop(); unsub(); };
  }, [value]);
  return <span ref={ref}>0{suffix}</span>;
}

/* ─── Accordion ──────────────────────────────────────────────────── */
function Accordion({ title, icon: Icon, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        aria-expanded={open}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', background: 'var(--surface-muted)',
          border: 'none', cursor: 'pointer', gap: 10, textAlign: 'left',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-main)' }}>
          {Icon && <Icon size={16} strokeWidth={1.5} aria-hidden="true" style={{ color: 'var(--primary)', flexShrink: 0 }} />}
          {title}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }} style={{ display: 'flex', flexShrink: 0 }}>
          <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '16px 18px', background: 'white', borderTop: '1px solid var(--border-subtle)' }}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Grade Scale Legend ─────────────────────────────────────────── */
function GradeScaleLegend({ currentGrade }) {
  return (
    <div style={{ marginTop: 16 }}>
      <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
        DR Severity Scale
      </p>
      <div style={{ display: 'flex', gap: 4 }}>
        {[0, 1, 2, 3, 4].map((g) => {
          const cfg = GRADE_CONFIG[g];
          const isCurrent = currentGrade === g;
          return (
            <div key={g} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: 8, borderRadius: 4,
                background: cfg.color,
                border: isCurrent ? `2px solid ${cfg.textColor}` : '2px solid transparent',
                boxShadow: isCurrent ? `0 0 0 2px ${cfg.color}` : 'none',
                transform: isCurrent ? 'scaleY(1.4)' : 'scaleY(1)',
                transition: 'transform 0.2s',
                marginBottom: 4,
              }} />
              <span style={{ fontSize: '0.65rem', fontWeight: isCurrent ? 800 : 500, color: isCurrent ? cfg.textColor : 'var(--text-tertiary)' }}>
                G{g}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────────── */
export default function ResultsPage({ result, patient, onViewReport, onStartNewScreening, onRecapture }) {
  const { t } = useLanguage();

  if (!result) return null;

  const isHealthy    = result.stage1Outcome === 'NO_DR';
  const isDRDetected = result.stage1Outcome === 'DR_DETECTED';
  const isUncertain  = result.stage1Outcome === 'UNCERTAIN';
  const isUngradable = result.qualityMetrics?.overallScore !== undefined
    ? result.qualityMetrics.overallScore < 0.6
    : (result.stage1Outcome === 'UNGRADABLE' || result.Final_Grade === 'UNGRADABLE');

  const drProbPct    = result.probabilities?.Stage1?.Fused_DR_Prob != null
    ? (result.probabilities.Stage1.Fused_DR_Prob * 100).toFixed(1)
    : null;
  const thresholdPct = result.probabilities?.Stage1?.Threshold_Used != null
    ? (result.probabilities.Stage1.Threshold_Used * 100).toFixed(1)
    : '45.0';

  const gradeNum = typeof result.Final_Grade === 'number' ? result.Final_Grade
    : typeof result.grade === 'number' ? result.grade : null;

  const gradeCfg = gradeNum != null ? GRADE_CONFIG[gradeNum] : null;

  // Format explanation into scannable bullets
  const formatExplanation = (text) => {
    if (!text) return null;
    const parts = text.split(/Guidance:/i);
    if (parts.length > 1) {
      const finding = parts[0].replace(/This is a screening assessment and not a definitive diagnosis.*/i, '').trim();
      const guidance = parts[1].trim();
      return { finding, guidance };
    }
    return { finding: text, guidance: null };
  };
  const explanation = formatExplanation(result.explanation);

  const screeningDate = new Date().toLocaleString('en-IN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const cardAnimation = {
    initial: { opacity: 0, y: 20, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } },
  };

  return (
    <div style={{
      flex: 1, padding: '24px 16px 64px',
      background: 'var(--bg-app)',
    }}>
      <div className="page-container" style={{ maxWidth: 1000 }}>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>

          {/* ── Left Column: Main Results ── */}
          <motion.div {...cardAnimation} style={{ flex: '1 1 520px', minWidth: 0 }}>
            <div className="clean-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>

              {/* Report Header */}
              <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--surface-muted)', display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Screening Report
                  </div>
                  {patient?.name && (
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>
                      {patient.name}
                    </h2>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                    {patient?.age && <span>Age: {patient.age} yrs</span>}
                    {patient?.gender && <span>· {patient.gender}</span>}
                    {patient?.dob && <span>· DOB: {patient.dob}</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text-tertiary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Calendar size={13} aria-hidden="true" />
                    {screeningDate}
                  </div>
                  <div style={{ marginTop: 4, fontSize: '0.75rem' }}>Model v2.1 · AarogyaNetra</div>
                </div>
              </div>

              <div style={{ padding: '24px' }}>

                {/* ── Outcome card ── */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1, duration: 0.35, type: 'spring', stiffness: 260, damping: 24 }}
                  style={{ marginBottom: 20 }}
                >
                  {/* Ungradable */}
                  {isUngradable && (
                    <div className="result-status-card ungradable" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <AlertTriangle size={32} style={{ flexShrink: 0, color: '#be123c', marginTop: 2 }} aria-hidden="true" />
                      <div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: 4 }}>{t('outcomeUngradable', 'Image Quality Insufficient')}</div>
                        <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{result.explanation || t('iqaSubtitle', 'The image could not be graded due to poor quality. Please recapture.')}</div>
                        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                          {onRecapture && <button type="button" className="btn btn-primary btn-sm" onClick={onRecapture}><Camera size={15} aria-hidden="true" />{t('recRecapture', 'Recapture Image')}</button>}
                          <button type="button" className="btn btn-secondary btn-sm" onClick={onStartNewScreening}><RotateCcw size={14} aria-hidden="true" />{t('startNewScreening', 'New Screening')}</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Healthy */}
                  {isHealthy && !isUngradable && (
                    <div className="result-status-card healthy" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <CheckCircle2 size={32} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                      <div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{t('outcomeNoDR', 'No Diabetic Retinopathy Detected')}</div>
                        <div style={{ fontSize: '0.9rem', marginTop: 4, lineHeight: 1.5 }}>{t('severityNoneDesc', 'No signs of DR were found in this image. Continue annual screening.')}</div>
                        {gradeNum != null && <GradeScaleLegend currentGrade={gradeNum} />}
                      </div>
                    </div>
                  )}

                  {/* DR Detected */}
                  {isDRDetected && !isUngradable && (
                    <div className="result-status-card dr-positive" style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <AlertCircle size={32} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700 }}>{t('outcomeDRDetected', 'Diabetic Retinopathy Detected')}</div>
                        {result.severityKey && (
                          <div style={{ marginTop: 8 }}>
                            <motion.span
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                              style={{
                                display: 'inline-block',
                                background: gradeCfg?.bg || '#fee2e2',
                                color: gradeCfg?.textColor || '#991b1b',
                                border: `1px solid ${gradeCfg?.border || '#fca5a5'}`,
                                padding: '4px 12px', borderRadius: 999,
                                fontWeight: 700, fontSize: '0.9rem', marginBottom: 6,
                              }}
                            >
                              {t(result.severityKey)}
                              {gradeNum != null && ` (Grade ${gradeNum})`}
                            </motion.span>
                          </div>
                        )}
                        {gradeNum != null && <GradeScaleLegend currentGrade={gradeNum} />}
                      </div>
                    </div>
                  )}

                  {/* Uncertain */}
                  {isUncertain && !isUngradable && (
                    <div style={{ background: 'var(--uncertain-bg)', border: `1.5px solid var(--uncertain-border)`, borderRadius: 'var(--radius-lg)', padding: '20px 24px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <HelpCircle size={32} style={{ flexShrink: 0, color: 'var(--uncertain)', marginTop: 2 }} aria-hidden="true" />
                      <div>
                        <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--uncertain-text)' }}>{t('outcomeUncertain', 'Uncertain — Clinical Review Required')}</div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--uncertain-text)', marginTop: 6, lineHeight: 1.5 }}>
                          The AI model could not reach a confident determination. Schedule a clinical review or retake the image.
                        </div>
                        <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(124,58,237,0.08)', borderRadius: 8, fontSize: '0.8125rem', color: 'var(--uncertain-text)', fontWeight: 600 }}>
                          Recommended action: Refer for clinical examination within 2 weeks.
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>

                {/* ── AI Probability Metrics (3 labeled chips) ── */}
                {drProbPct !== null && !isUngradable && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}
                  >
                    {[
                      {
                        label: 'DR Probability',
                        value: drProbPct,
                        hint: 'Likelihood of diabetic retinopathy in this image.',
                        color: 'var(--primary)',
                      },
                      {
                        label: 'Referral Threshold',
                        value: thresholdPct,
                        hint: 'Cases above this value are flagged for review.',
                        color: 'var(--text-tertiary)',
                      },
                      {
                        label: 'Model Confidence',
                        value: null,
                        text: result.confidence === 'HIGH' ? 'High' : result.confidence === 'LOW' ? 'Low' : 'Medium',
                        hint: 'How confident the AI model is in this result.',
                        color: result.confidence === 'HIGH' ? 'var(--success)' : result.confidence === 'LOW' ? 'var(--danger)' : 'var(--warning)',
                      },
                    ].map(({ label, value, text, hint, color }) => (
                      <div key={label} style={{ flex: '1 1 140px', background: 'var(--surface-muted)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '12px 14px', minWidth: 130 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                          {label}
                          <span title={hint} aria-label={hint} style={{ marginLeft: 5, cursor: 'help', display: 'inline-flex', verticalAlign: 'middle' }}>
                            <Info size={11} strokeWidth={2} style={{ color: 'var(--text-tertiary)' }} />
                          </span>
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color }}>
                          {value != null ? <AnimatedNumber value={value} /> : text}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* ── Clinical Recommendation ── */}
                {!isUngradable && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.28 }}
                    style={{ marginBottom: 20, padding: '16px', background: 'var(--surface-muted)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--primary)' }}
                  >
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
                      <Calendar size={16} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                      <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700 }}>{t('recommendationTitle', 'Clinical Recommendation')}</h3>
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.9rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 5, lineHeight: 1.6 }}>
                      {isHealthy ? (
                        <>
                          <li>Routine annual comprehensive eye examination.</li>
                          <li>Maintain controlled blood sugar, blood pressure, and cholesterol.</li>
                          <li><strong>Referral urgency:</strong> Annual review — no immediate referral required.</li>
                        </>
                      ) : isDRDetected ? (
                        <>
                          <li>Schedule an ophthalmologist or retina specialist appointment.</li>
                          <li>Bring this report to your consultation.</li>
                          <li>Do not delay if you experience sudden vision changes.</li>
                          <li><strong>Referral urgency:</strong> {gradeNum != null && gradeNum >= 3 ? 'Urgent — within 1 week.' : 'Within 2–4 weeks.'}</li>
                        </>
                      ) : (
                        <>
                          <li>{t(result.referralKey, 'Schedule clinical review within 2 weeks.')}</li>
                          <li>{t(result.timelineKey, 'Bring this report to your next consultation.')}</li>
                        </>
                      )}
                    </ul>
                  </motion.div>
                )}

                {/* ── Clinical Explanation (accordion) ── */}
                {explanation && !isUngradable && (
                  <motion.div
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    style={{ marginBottom: 20 }}
                  >
                    <Accordion title={t('clinicalExplanationTitle', 'AI Screening Explanation')} icon={Sparkles} defaultOpen>
                      {/* Scannable bullets first */}
                      <div style={{ marginBottom: 16 }}>
                        {[
                          { heading: 'What we found', content: explanation.finding },
                          explanation.guidance && { heading: 'What to do next', content: explanation.guidance },
                          { heading: 'What this is not', content: 'This screening is not a definitive diagnosis. It is an AI-assisted assessment to support — not replace — clinical judgment.' },
                        ].filter(Boolean).map(({ heading, content }) => (
                          <div key={heading} style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                            <div style={{ width: 4, borderRadius: 2, background: 'var(--primary)', flexShrink: 0, marginTop: 3 }} />
                            <div>
                              <p style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-main)', marginBottom: 2 }}>{heading}</p>
                              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>{content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Accordion>
                  </motion.div>
                )}

                {/* ── Single consolidated disclaimer ── */}
                <div className="medical-disclaimer" style={{ marginBottom: 20 }}>
                  <ShieldCheck size={14} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                  <span>{t('safetyDisclaimer', 'AarogyaNetra is an AI-assistive tool. Results must be reviewed by a qualified ophthalmologist or healthcare provider before any clinical decision is made. Model accuracy may vary based on image quality and patient demographics.')}</span>
                </div>

                {/* ── Action buttons ── */}
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  transition={{ delay: 0.45 }}
                  style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
                >
                  <button type="button" className="btn btn-secondary btn-sm" onClick={onStartNewScreening}>
                    <RotateCcw size={14} aria-hidden="true" />
                    {t('startNewScreening', 'New Screening')}
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                    <Printer size={14} aria-hidden="true" />
                    Print / PDF
                  </button>
                  <button type="button" className="btn btn-primary" onClick={onViewReport} style={{ marginLeft: 'auto' }}>
                    <FileText size={16} aria-hidden="true" />
                    {t('viewReport', 'Full Report')}
                    <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* ── Right Column: GradCAM + Technical Details ── */}
          {(result.probabilities || result.heatmapDataUrl) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              style={{ flex: '1 1 300px', minWidth: 280, display: 'flex', flexDirection: 'column', gap: 16 }}
            >
              {/* GradCAM */}
              {result.heatmapDataUrl && (
                <div className="clean-card" style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}>
                  <GradCAMViewer
                    originalSrc={result.imageData}
                    heatmapSrc={result.heatmapDataUrl}
                    overlaySrc={result.overlayDataUrl}
                  />
                </div>
              )}

              {/* Technical AI Details accordion */}
              {result.probabilities && (
                <div className="clean-card" style={{ marginBottom: 0 }}>
                  <Accordion title="Technical AI Details" icon={null} defaultOpen={false}>
                    {result.probabilities.Stage1 && (
                      <div style={{ marginBottom: 16 }}>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                          Stage 1: DR Detection
                          <span title="Stage 1 uses two binary models (M0ALL and M01) fused into a final probability." style={{ cursor: 'help', marginLeft: 4, display: 'inline-flex', verticalAlign: 'middle' }}>
                            <Info size={10} strokeWidth={2} style={{ color: 'var(--text-tertiary)' }} />
                          </span>
                        </p>
                        <div style={{ background: 'var(--surface-muted)', borderRadius: 'var(--radius-sm)', padding: '10px 12px', fontSize: '0.8125rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {result.probabilities.Stage1.P_M0ALL_DR !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                              <span title="Base ensemble model — all grades vs no-DR">M0ALL (Base) <Info size={10} strokeWidth={2} style={{ verticalAlign: 'middle', color: 'var(--text-tertiary)' }} /></span>
                              <strong>{(result.probabilities.Stage1.P_M0ALL_DR * 100).toFixed(1)}%</strong>
                            </div>
                          )}
                          {result.probabilities.Stage1.P_M01_DR !== undefined && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                              <span title="Boundary model — distinguishes Grade 1+ from Grade 0">M01 Boundary (Grade 1+ vs 0) <Info size={10} strokeWidth={2} style={{ verticalAlign: 'middle', color: 'var(--text-tertiary)' }} /></span>
                              <strong>{(result.probabilities.Stage1.P_M01_DR * 100).toFixed(1)}%</strong>
                            </div>
                          )}
                          <div style={{ height: 1, background: 'var(--border-subtle)', margin: '4px 0' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                            <span>Fused DR Probability</span>
                            <span style={{ color: 'var(--primary)' }}>
                              {(result.probabilities.Stage1.Fused_DR_Prob * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>
                            <span>Decision Threshold</span>
                            <span>{(result.probabilities.Stage1.Threshold_Used * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {result.probabilities.Stage2?.Fused_Probs && (
                      <div>
                        <p style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                          Stage 2: Grade Probabilities
                          <span title="Final fused severity grade probabilities across all 5 DR levels." style={{ cursor: 'help', marginLeft: 4, display: 'inline-flex', verticalAlign: 'middle' }}>
                            <Info size={10} strokeWidth={2} style={{ color: 'var(--text-tertiary)' }} />
                          </span>
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {Object.entries(result.probabilities.Stage2.Fused_Probs).map(([grade, prob]) => (
                            <div key={grade}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 500, marginBottom: 3 }}>
                                <span style={{ color: 'var(--text-secondary)' }}>{grade}</span>
                                <strong style={{ color: 'var(--primary)' }}>{(prob * 100).toFixed(1)}%</strong>
                              </div>
                              <div style={{ height: 6, background: 'var(--border-subtle)', borderRadius: 3, overflow: 'hidden' }}>
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${prob * 100}%` }}
                                  transition={{ duration: 0.7, ease: 'easeOut' }}
                                  style={{ height: '100%', background: 'var(--primary)', borderRadius: 3 }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </Accordion>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
