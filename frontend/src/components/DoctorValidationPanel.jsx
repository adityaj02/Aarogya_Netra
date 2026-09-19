import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Send } from 'lucide-react';
import { submitClinicalFeedback } from '../services/api';

export default function DoctorValidationPanel({ result }) {
  const [reviewStatus, setReviewStatus] = useState(null);
  const [actualGrade, setActualGrade] = useState('');
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState(null);

  if (!result || submitted) {
    return submitted ? (
      <div className="clean-card" style={{ padding: '24px', backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }}>
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

  const handleSubmit = async () => {
    if (reviewStatus === 'corrected_prediction' && actualGrade === '') {
      setError('Please select the actual grade.');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      await submitClinicalFeedback({
        report_id: result.id,
        image_id: result.imageData,
        predicted_grade: result.grade,
        predicted_stage1_status: result.stage1Outcome,
        review_status: reviewStatus,
        actual_grade: reviewStatus === 'corrected_prediction' ? parseInt(actualGrade) : null,
        doctor_comments: comments,
        reviewer_id: "DR_MOCK_USER_001", // TODO: Replace with actual auth user
        inference_snapshot: result.probabilities
      });
      setSubmitted(true);
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

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button
          className={`btn ${reviewStatus === 'confirmed_correct' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setReviewStatus('confirmed_correct'); setError(null); }}
          style={{ flex: 1, minWidth: '160px', padding: '10px' }}
        >
          <CheckCircle2 size={18} /> Confirm Result
        </button>
        <button
          className={`btn ${reviewStatus === 'corrected_prediction' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setReviewStatus('corrected_prediction'); setError(null); }}
          style={{ flex: 1, minWidth: '160px', padding: '10px', backgroundColor: reviewStatus === 'corrected_prediction' ? '#dc2626' : undefined, color: reviewStatus === 'corrected_prediction' ? 'white' : undefined, borderColor: reviewStatus === 'corrected_prediction' ? '#b91c1c' : undefined }}
        >
          <XCircle size={18} /> Incorrect
        </button>
        <button
          className={`btn ${reviewStatus === 'needs_review' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setReviewStatus('needs_review'); setError(null); }}
          style={{ flex: 1, minWidth: '160px', padding: '10px', backgroundColor: reviewStatus === 'needs_review' ? '#d97706' : undefined, color: reviewStatus === 'needs_review' ? 'white' : undefined, borderColor: reviewStatus === 'needs_review' ? '#b45309' : undefined }}
        >
          <AlertTriangle size={18} /> Needs Further Review
        </button>
      </div>

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
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.95rem' }}>Clinical Comments (Optional)</label>
          <textarea 
            style={{ width: '100%', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', minHeight: '80px', fontFamily: 'inherit', resize: 'vertical' }}
            placeholder="Add any notes about anomalies, image quality, or pathology..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
      )}

      {error && <div style={{ color: '#dc2626', marginBottom: '16px', fontSize: '0.9rem', fontWeight: 600 }}>{error}</div>}

      {reviewStatus && (
        <button 
          className="btn btn-primary" 
          style={{ width: '100%' }} 
          onClick={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Validation'}
          {!isSubmitting && <Send size={18} />}
        </button>
      )}
    </div>
  );
}
