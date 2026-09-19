import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Send, User, Building2, MapPin } from 'lucide-react';
import { submitClinicalFeedback } from '../services/api';
import { useSelectedState } from '../context/StateContext';
import hospitalDirectory from '../data/hospital_directory.json';

export default function DoctorValidationPanel({ result, onFeedbackSubmitted }) {
  const { selectedState } = useSelectedState();

  const [reviewStatus,    setReviewStatus]    = useState(null);
  const [actualGrade,     setActualGrade]     = useState('');
  const [comments,        setComments]        = useState('');
  const [reviewerId,      setReviewerId]      = useState('');
  const [referralHospital, setReferralHospital] = useState('');
  const [isSubmitting,    setIsSubmitting]    = useState(false);
  const [submitted,       setSubmitted]       = useState(false);
  const [error,           setError]           = useState(null);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [existingFeedback, setExistingFeedback] = useState(null);

  // Hospitals for the selected state
  const hospitalsForState = selectedState
    ? (hospitalDirectory[selectedState] || [])
    : [];

  useEffect(() => {
    fetch('/api/doctors')
      .then(res => res.json())
      .then(data => { if (Array.isArray(data)) setAvailableDoctors(data); })
      .catch(err => console.error('Error fetching doctors:', err));

    if (result && result.id) {
      fetch(`/api/feedback/${result.id}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setExistingFeedback(data[0]);
          }
        })
        .catch(err => console.error('Error fetching existing feedback:', err));
    }
  }, [result]);

  // Reset referral when state changes
  useEffect(() => { setReferralHospital(''); }, [selectedState]);

  if (!result || submitted) {
    return submitted ? (
      <div className="clean-card" style={{ padding: '24px', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#065f46' }}>
          <CheckCircle2 size={24} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Feedback Submitted Successfully</h3>
        </div>
        <p style={{ marginTop: '8px', color: '#064e3b', fontSize: '0.95rem' }}>
          Thank you for providing clinical validation. Your feedback helps improve the AI model.
        </p>
      </div>
    ) : null;
  }

  if (existingFeedback) {
    const isCorrect = existingFeedback.is_correct;
    return (
      <div className="clean-card" style={{ marginTop: '24px', borderTop: '4px solid var(--primary)', backgroundColor: '#f8fafc' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
          <CheckCircle2 color="#0ea5e9" size={20} /> Clinical Validation (Read-only)
        </h3>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Reviewer ID</span>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>{existingFeedback.reviewer_id}</div>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Date</span>
            <div style={{ fontWeight: 600, color: '#0f172a' }}>{new Date(existingFeedback.timestamp).toLocaleDateString()}</div>
          </div>
        </div>

        <div style={{
          padding: '16px', borderRadius: '12px',
          backgroundColor: isCorrect ? '#ecfdf5' : '#fef2f2',
          border: `1px solid ${isCorrect ? '#a7f3d0' : '#fecaca'}`,
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.85rem', color: isCorrect ? '#065f46' : '#991b1b' }}>
                AI Predicted Grade: <strong>{existingFeedback.predicted_grade !== null ? existingFeedback.predicted_grade : 'N/A'}</strong>
              </span>
            </div>
            <div>
              <span style={{ fontSize: '0.85rem', color: isCorrect ? '#065f46' : '#991b1b' }}>
                Clinician Validated Grade: <strong>{existingFeedback.actual_grade !== null ? existingFeedback.actual_grade : 'N/A'}</strong>
              </span>
            </div>
          </div>
          <div style={{ marginTop: '12px', fontWeight: 600, color: isCorrect ? '#059669' : '#dc2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {isCorrect ? 'AI Detection was Correct' : 'AI Detection was Incorrect/Changed'}
          </div>
        </div>

        {existingFeedback.referral_hospital && (
          <div style={{ marginBottom: '12px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Referred To</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, marginTop: 4 }}>
              <Building2 size={15} style={{ color: '#1d4ed8', flexShrink: 0 }} aria-hidden="true" />
              <span style={{ fontWeight: 600, color: '#1d4ed8', fontSize: '0.9rem' }}>{existingFeedback.referral_hospital}</span>
              {existingFeedback.referral_state && (
                <span style={{ fontSize: '0.78rem', color: '#3b82f6', marginLeft: 'auto' }}>{existingFeedback.referral_state}</span>
              )}
            </div>
          </div>
        )}

        {existingFeedback.doctor_comments && (
          <div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Clinical Comments</span>
            <div style={{ padding: '12px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.9rem', marginTop: '4px', color: '#334155' }}>
              {existingFeedback.doctor_comments}
            </div>
          </div>
        )}
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!reviewerId.trim()) {
      setError('Please enter your Reviewer ID / Staff ID before submitting.');
      return;
    }
    if (reviewStatus === 'corrected_prediction' && actualGrade === '') {
      setError('Please select the actual grade.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const selectedHospitalObj = hospitalsForState.find(h => h.id === referralHospital);
    const feedbackPayload = {
      report_id:                result.id,
      image_id:                 result.imageData,
      predicted_grade:          result.grade,
      predicted_stage1_status:  result.stage1Outcome,
      review_status:            reviewStatus,
      actual_grade:             reviewStatus === 'corrected_prediction' ? parseInt(actualGrade) : null,
      doctor_comments:          comments,
      reviewer_id:              reviewerId.trim(),
      referral_hospital:        selectedHospitalObj ? selectedHospitalObj.name : null,
      referral_state:           selectedHospitalObj ? selectedState : null,
      inference_snapshot:       result.probabilities,
    };

    try {
      await submitClinicalFeedback(feedbackPayload);
      setSubmitted(true);
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(feedbackPayload);
      }
    } catch (err) {
      setError('Failed to submit feedback. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="clean-card" style={{ marginTop: '24px', borderTop: '4px solid var(--primary)' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Doctor Validation</h3>
      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
        AI Predicted Grade: <strong>{result.grade !== null ? result.grade : 'N/A'}</strong>
      </p>

      {/* ── Status buttons ── */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button
          className="btn"
          onClick={() => { setReviewStatus('confirmed_correct'); setError(null); }}
          style={{ flex: 1, minWidth: '160px', padding: '10px', backgroundColor: reviewStatus === 'confirmed_correct' ? '#10b981' : '#ecfdf5', color: reviewStatus === 'confirmed_correct' ? 'white' : '#059669', border: `1px solid ${reviewStatus === 'confirmed_correct' ? '#059669' : '#a7f3d0'}` }}
        >
          <CheckCircle2 size={18} /> Confirm Result
        </button>
        <button
          className="btn"
          onClick={() => { setReviewStatus('corrected_prediction'); setError(null); }}
          style={{ flex: 1, minWidth: '160px', padding: '10px', backgroundColor: reviewStatus === 'corrected_prediction' ? '#ef4444' : '#fef2f2', color: reviewStatus === 'corrected_prediction' ? 'white' : '#b91c1c', border: `1px solid ${reviewStatus === 'corrected_prediction' ? '#b91c1c' : '#fecaca'}` }}
        >
          <XCircle size={18} /> Incorrect
        </button>
        <button
          className="btn"
          onClick={() => { setReviewStatus('needs_review'); setError(null); }}
          style={{ flex: 1, minWidth: '160px', padding: '10px', backgroundColor: reviewStatus === 'needs_review' ? '#f59e0b' : '#fffbeb', color: reviewStatus === 'needs_review' ? 'white' : '#b45309', border: `1px solid ${reviewStatus === 'needs_review' ? '#b45309' : '#fde68a'}` }}
        >
          <AlertTriangle size={18} /> Needs Further Review
        </button>
      </div>

      {/* ── Grade correction ── */}
      {reviewStatus === 'corrected_prediction' && (
        <div style={{ background: 'var(--surface-subtle)', padding: '16px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.95rem' }}>Actual Assessment (Grade)</label>
          <select
            className="lang-select"
            style={{ width: '100%', marginBottom: '16px', backgroundColor: 'white' }}
            value={actualGrade}
            onChange={(e) => setActualGrade(e.target.value)}
          >
            <option value="">Select correct grade...</option>
            <option value="0">Grade 0 (No DR)</option>
            <option value="1">Grade 1 (Mild)</option>
            <option value="2">Grade 2 (Moderate)</option>
            <option value="3">Grade 3 (Severe)</option>
            <option value="4">Grade 4 (Proliferative)</option>
          </select>
        </div>
      )}

      {reviewStatus && (
        <>
          {/* ── Reviewer ID ── */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.95rem' }}>
              <User size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
              Reviewer ID / Staff ID <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              list="validation-doctor-list"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 'var(--radius-sm)', border: `1px solid ${!reviewerId.trim() ? '#fca5a5' : 'var(--border)'}`, fontFamily: 'inherit', fontSize: '0.95rem' }}
              placeholder="e.g. DR-SHARMA-01 or Staff ID"
              value={reviewerId}
              onChange={(e) => { setReviewerId(e.target.value); setError(null); }}
            />
            <datalist id="validation-doctor-list">
              {availableDoctors.map(doc => <option key={doc} value={doc} />)}
            </datalist>
            {!reviewerId.trim() && (
              <div style={{ fontSize: '0.8rem', color: '#ef4444', marginTop: '4px' }}>Required to attribute clinical feedback.</div>
            )}
          </div>

          {/* ── Hospital Referral ── */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '6px', fontSize: '0.95rem' }}>
              <Building2 size={14} style={{ display: 'inline', marginRight: '5px', verticalAlign: 'text-bottom' }} />
              Refer to Hospital <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-tertiary)' }}>(Optional)</span>
            </label>

            {!selectedState ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#f8fafc', border: '1.5px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                <MapPin size={15} aria-hidden="true" />
                <span>Select a state from the top navigation bar to see nearby eye care hospitals.</span>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <MapPin size={13} style={{ color: 'var(--primary)' }} aria-hidden="true" />
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                    Showing {hospitalsForState.length} hospitals in {selectedState}
                  </span>
                </div>
                <select
                  className="form-input form-select"
                  value={referralHospital}
                  onChange={(e) => setReferralHospital(e.target.value)}
                  style={{ width: '100%', paddingLeft: 12, cursor: 'pointer', background: 'white' }}
                >
                  <option value="">— No referral / Select hospital —</option>
                  {hospitalsForState.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.name}{h.branch && h.branch !== h.name ? ` — ${h.branch}` : ''} ({h.district})
                    </option>
                  ))}
                </select>
                {referralHospital && (() => {
                  const h = hospitalsForState.find(x => x.id === referralHospital);
                  return h ? (
                    <div style={{ marginTop: 8, padding: '10px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, fontSize: '0.82rem', color: '#1d4ed8' }}>
                      <strong>{h.name}</strong>
                      {h.branch && h.branch !== h.name && <span style={{ color: '#3b82f6' }}> — {h.branch}</span>}<br />
                      <span style={{ color: '#374151' }}>{h.address}</span>
                      <br />
                      <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>{h.ownership} · {h.facility_type} · {h.area_type}</span>
                    </div>
                  ) : null;
                })()}
              </>
            )}
          </div>

          {/* ── Clinical Comments ── */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.95rem' }}>Clinical Comments (Optional)</label>
            <textarea
              style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
              placeholder="Add any notes about anomalies, image quality, or pathology..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          </div>

          {error && <div style={{ color: '#dc2626', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600 }}>{error}</div>}

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={handleSubmit}
            disabled={isSubmitting || !reviewerId.trim()}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Validation'}
            {!isSubmitting && <Send size={18} />}
          </button>
        </>
      )}
    </div>
  );
}
