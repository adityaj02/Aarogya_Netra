import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ArrowRight, Calendar, ChevronDown,
  User, Phone, Activity, Lock, AlertCircle
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

/* ─── Helpers ─────────────────────────────────────────────────────── */
function calculateAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 && age <= 125 ? age : null;
}

/* ─── Field error check ───────────────────────────────────────────── */
function validate(form, t) {
  const errors = {};
  if (!form.name.trim())             errors.name = t('errNameReq', 'Full name is required.');
  if (!form.dob)                     errors.dob  = t('errDobReq', 'Date of birth is required.');
  else {
    const age = calculateAge(form.dob);
    if (age === null)                errors.dob  = t('errDobInv', 'Please enter a valid date of birth.');
    if (age < 0 || age > 125)        errors.dob  = t('errAgeRange', 'Age must be between 0 and 125.');
  }
  if (!form.gender)                  errors.gender = t('errGenderReq', 'Please select a gender.');
  if (!form.diabetesDuration)        errors.diabetesDuration = t('errDurationReq', 'Please select diabetes duration.');
  return errors;
}

/* ─── Input component ─────────────────────────────────────────────── */
function Field({ label, required, optional, error, touched, hint, t, children }) {
  return (
    <div className="form-group" style={{ marginBottom: 20 }}>
      <label className="form-label">
        {label}
        {required && <span style={{ color: '#dc2626', marginLeft: 2 }} aria-hidden="true">*</span>}
        {optional && <span className="form-label-optional">{t ? t('optionalLabel', '(Optional)') : '(Optional)'}</span>}
      </label>
      {children}
      <AnimatePresence>
        {touched && error && (
          <motion.div
            className="form-error animate-shake"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <AlertCircle size={13} aria-hidden="true" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      {hint && !error && <p className="form-hint">{hint}</p>}
    </div>
  );
}

const GENDER_OPTIONS = [
  { value: 'Male',   label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other',  label: 'Other' },
];

const DURATION_OPTIONS = [
  { value: 'Less than 1 year',   label: 'Less than 1 year' },
  { value: '1–5 years',          label: '1–5 years' },
  { value: '5–10 years',         label: '5–10 years' },
  { value: '10–15 years',        label: '10–15 years' },
  { value: 'More than 15 years', label: 'More than 15 years' },
  { value: 'Not diagnosed',      label: 'Not diagnosed / Unknown' },
];

/* ─── Main Component ──────────────────────────────────────────────── */
export default function PatientInfoPage({ initialData, onContinue, onBack }) {
  const { t } = useLanguage();

  const [form, setForm] = useState({
    name:             initialData?.name             || '',
    dob:              initialData?.dob              || '',
    gender:           initialData?.gender           || '',
    diabetesDuration: initialData?.diabetesDuration || '',
    mobile:           initialData?.mobile           || '',
  });

  const GENDER_OPTIONS = [
    { value: 'Male',   label: t('genderMale', 'Male') },
    { value: 'Female', label: t('genderFemale', 'Female') },
    { value: 'Other',  label: t('genderOther', 'Other') },
  ];

  const DURATION_OPTIONS = [
    { value: 'Less than 1 year',   label: t('dur1', 'Less than 1 year') },
    { value: '1–5 years',          label: t('dur2', '1–5 years') },
    { value: '5–10 years',         label: t('dur3', '5–10 years') },
    { value: '10–15 years',        label: t('dur4', '10–15 years') },
    { value: 'More than 15 years', label: t('dur5', 'More than 15 years') },
    { value: 'Not diagnosed',      label: t('dur6', 'Not diagnosed / Unknown') },
  ];

  const [touched, setTouched] = useState({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors        = validate(form, t);
  const isFormValid   = Object.keys(errors).length === 0;
  const age           = calculateAge(form.dob);

  const updateField = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const touchField  = (field) => setTouched(prev => ({ ...prev, [field]: true }));

  const handleContinue = () => {
    setSubmitAttempted(true);
    const allTouched = { name: true, dob: true, gender: true, diabetesDuration: true, mobile: true };
    setTouched(allTouched);
    if (!isFormValid) return;
    onContinue({
      name: form.name.trim(),
      dob: form.dob,
      age: age !== null ? String(age) : '',
      gender: form.gender,
      diabetesDuration: form.diabetesDuration,
      mobile: form.mobile,
    });
  };

  const inputStyle = (field) => ({
    width: '100%', fontFamily: 'inherit', fontSize: '1rem',
    padding: '10px 14px 10px 42px',
    minHeight: 44, background: 'white', color: 'var(--text-main)',
    border: `1.5px solid ${touched[field] && errors[field] ? '#dc2626' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    outline: 'none',
    boxShadow: touched[field] && errors[field] ? '0 0 0 3px rgba(220,38,38,0.12)' : 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  });

  const plainInputStyle = (field) => ({
    ...inputStyle(field),
    paddingLeft: 14,
  });

  const iconWrap = {
    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
    color: 'var(--text-tertiary)', pointerEvents: 'none', display: 'flex',
  };

  return (
    <div style={{
      flex: 1, padding: '32px 16px 64px',
      background: 'linear-gradient(145deg, #eef5ff 0%, #e8f4fd 60%, #ddeeff 100%)',
    }}>
      <div className="page-container">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{ maxWidth: 560, margin: '0 auto' }}
        >
          {/* Card */}
          <div style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.95)',
            borderRadius: 24,
            padding: '36px 32px 32px',
            boxShadow: '0 20px 48px -12px rgba(28,95,160,0.14)',
          }}>

            {/* Header */}
            <div style={{ marginBottom: 28 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em', marginBottom: 4 }}>
                {t('patientInfoTitle', 'Patient Information')}
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                {t('patientInfoSubtitle', 'Enter basic details required for the screening record.')}
              </p>
            </div>

            {/* ── Full Name ── */}
            <Field
              label={t('fullName', 'Full Name')}
              required
              error={errors.name}
              touched={touched.name}
              t={t}
            >
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><User size={16} strokeWidth={1.5} /></span>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => updateField('name', e.target.value)}
                  onBlur={() => touchField('name')}
                  placeholder={t('fullNamePlaceholder', 'e.g. Ravi Kumar')}
                  aria-required="true"
                  aria-invalid={!!(touched.name && errors.name)}
                  style={inputStyle('name')}
                  autoComplete="name"
                />
              </div>
            </Field>

            {/* ── Date of Birth ── */}
            <Field
              label={t('dateOfBirth', 'Date of Birth')}
              required
              error={errors.dob}
              touched={touched.dob}
              hint={age !== null ? undefined : t('dobHint', 'Format: YYYY-MM-DD')}
              t={t}
            >
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><Calendar size={16} strokeWidth={1.5} /></span>
                <input
                  type="date"
                  value={form.dob}
                  onChange={e => updateField('dob', e.target.value)}
                  onBlur={() => touchField('dob')}
                  max={new Date().toISOString().split('T')[0]}
                  aria-required="true"
                  aria-invalid={!!(touched.dob && errors.dob)}
                  style={{ ...inputStyle('dob'), WebkitAppearance: 'none' }}
                />
              </div>
              {/* Calculated age — subtle helper text, fade in */}
              <AnimatePresence>
                {age !== null && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 5, fontWeight: 500 }}
                    aria-live="polite"
                  >
                    {t('calculatedAgeFormat', 'Calculated age: {{age}} {{unit}}', { 
                      age: age, 
                      unit: age === 1 ? t('yearText', 'year') : t('yearsText', 'years') 
                    })}
                  </motion.p>
                )}
              </AnimatePresence>
            </Field>

            {/* ── Gender ── */}
            <Field
              label={t('gender', 'Gender')}
              required
              error={errors.gender}
              touched={touched.gender}
              t={t}
            >
              <div
                role="group"
                aria-label="Gender"
                style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
                onBlur={() => touchField('gender')}
              >
                {GENDER_OPTIONS.map(({ value, label }) => {
                  const selected = form.gender === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => { updateField('gender', value); touchField('gender'); }}
                      style={{
                        flex: 1, minWidth: 80,
                        padding: '10px 16px',
                        minHeight: 44,
                        borderRadius: 'var(--radius-md)',
                        border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                        background: selected ? 'var(--primary)' : 'white',
                        color: selected ? 'white' : 'var(--text-secondary)',
                        fontWeight: selected ? 700 : 500,
                        fontSize: '0.9375rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* ── Diabetes Duration ── */}
            <Field
              label={t('diabetesDuration', 'Diabetes Duration')}
              required
              error={errors.diabetesDuration}
              touched={touched.diabetesDuration}
              t={t}
            >
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><Activity size={16} strokeWidth={1.5} /></span>
                <select
                  value={form.diabetesDuration}
                  onChange={e => { updateField('diabetesDuration', e.target.value); touchField('diabetesDuration'); }}
                  onBlur={() => touchField('diabetesDuration')}
                  aria-required="true"
                  aria-invalid={!!(touched.diabetesDuration && errors.diabetesDuration)}
                  style={{
                    ...inputStyle('diabetesDuration'),
                    paddingRight: 36,
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    color: form.diabetesDuration ? 'var(--text-main)' : 'var(--text-tertiary)',
                    cursor: 'pointer',
                  }}
                >
                  <option value="" disabled style={{ color: 'var(--text-tertiary)' }}>
                    {t('selectDuration', '— Select duration —')}
                  </option>
                  {DURATION_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <span style={{ ...iconWrap, left: 'auto', right: 12 }}>
                  <ChevronDown size={16} strokeWidth={1.5} />
                </span>
              </div>
            </Field>

            {/* ── Mobile Number ── */}
            <Field
              label={t('mobileNumber', 'Mobile Number')}
              optional
              error={errors.mobile}
              touched={touched.mobile}
              hint={t('mobileHint', 'Used only for report delivery — never shared.')}
              t={t}
            >
              <div style={{ position: 'relative' }}>
                <span style={iconWrap}><Phone size={16} strokeWidth={1.5} /></span>
                <input
                  type="tel"
                  value={form.mobile}
                  onChange={e => updateField('mobile', e.target.value)}
                  onBlur={() => touchField('mobile')}
                  placeholder={t('mobilePlaceholder', '+91 98765 43210')}
                  aria-describedby="mobile-hint"
                  style={inputStyle('mobile')}
                  autoComplete="tel"
                  inputMode="tel"
                />
              </div>
            </Field>

            {/* Privacy notice */}
            <div style={{
              display: 'flex', gap: 10, alignItems: 'flex-start',
              background: 'var(--surface-muted)',
              borderRadius: 'var(--radius-sm)',
              padding: '10px 14px', marginBottom: 24,
              border: '1px solid var(--border-subtle)',
            }}>
              <Lock size={14} strokeWidth={1.5} style={{ flexShrink: 0, color: 'var(--text-tertiary)', marginTop: 2 }} aria-hidden="true" />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5 }}>
                {t('privacyNotice1', 'Your data is stored locally on this device and is not transmitted to third parties.')}
                {' '}
                {t('privacyNotice2', 'Mobile number is used only for report delivery.')}
              </p>
            </div>

            {/* ── Actions ── */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onBack}
                style={{ flex: '0 0 auto', minWidth: 100 }}
              >
                <ArrowLeft size={16} aria-hidden="true" />
                <span>{t('back', 'Back')}</span>
              </button>

              <motion.button
                type="button"
                className="btn btn-primary"
                onClick={handleContinue}
                whileTap={{ scale: 0.97 }}
                style={{ flex: 1, position: 'relative' }}
                aria-disabled={submitAttempted && !isFormValid}
                title={!isFormValid ? 'Please fill in all required fields to continue.' : undefined}
              >
                <span>{t('continue', 'Continue')}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </motion.button>
            </div>

            {/* Inline form-level error summary */}
            <AnimatePresence>
              {submitAttempted && !isFormValid && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  style={{
                    marginTop: 12, background: '#fef2f2',
                    border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)',
                    padding: '10px 14px', fontSize: '0.8125rem', color: '#991b1b',
                    display: 'flex', gap: 8, alignItems: 'center',
                  }}
                  role="alert"
                >
                  <AlertCircle size={14} aria-hidden="true" />
                  {t('fillRequired', 'Please fill in all required fields before continuing.')}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
