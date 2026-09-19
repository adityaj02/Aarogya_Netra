import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, animate } from 'framer-motion';
import {
  User, Activity, CheckCircle, CheckCircle2, XCircle, AlertTriangle, FileText,
  Loader2, Inbox, ChevronRight, ChevronUp, ChevronDown,
  Search, Clock, AlertCircle, Shield
} from 'lucide-react';
import { fetchReportById } from '../services/api';

/* ─── Grade config ───────────────────────────────────────────────── */
const GRADE_COLORS = {
  0: '#16a34a', 1: '#ca8a04', 2: '#ea580c', 3: '#dc2626', 4: '#991b1b'
};
const GRADE_LABELS = {
  0: 'Grade 0 — No DR', 1: 'Grade 1 — Mild', 2: 'Grade 2 — Moderate',
  3: 'Grade 3 — Severe', 4: 'Grade 4 — Proliferative'
};

/* ─── Animated counter ───────────────────────────────────────────── */
function AnimatedStat({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const c = animate(0, value, {
      duration: 0.8, ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return c.stop;
  }, [value]);
  return <span>{display}</span>;
}

/* ─── SVG Donut Chart ────────────────────────────────────────────── */
function DonutChart({ segments, total }) {
  const SIZE = 200, STROKE = 28, R = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * R;
  let offset = 0;

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
      <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
        {/* Background ring */}
        <circle cx={SIZE/2} cy={SIZE/2} r={R} fill="none" stroke="#e2e8f0" strokeWidth={STROKE} />
        {segments.map((seg, i) => {
          const dashLen = (seg.count / total) * CIRCUMFERENCE;
          const dashOff = CIRCUMFERENCE - dashLen;
          const currentOffset = offset;
          offset += dashLen;
          return (
            <motion.circle
              key={i}
              cx={SIZE/2} cy={SIZE/2} r={R}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE}
              strokeDasharray={`${dashLen} ${CIRCUMFERENCE - dashLen}`}
              strokeDashoffset={-(currentOffset)}
              strokeLinecap="butt"
              initial={{ strokeDasharray: `0 ${CIRCUMFERENCE}` }}
              animate={{ strokeDasharray: `${dashLen} ${CIRCUMFERENCE - dashLen}` }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeOut' }}
            />
          );
        })}
      </svg>
      {/* Center label */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: '2rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patients</span>
      </div>
    </div>
  );
}

/* ─── Badge ──────────────────────────────────────────────────────── */
function GradeBadge({ grade }) {
  if (grade === null || grade === undefined) {
    return <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>Pending</span>;
  }
  const color = GRADE_COLORS[grade] || '#64748b';
  return (
    <span style={{ background: `${color}18`, color, border: `1px solid ${color}40`, padding: '2px 8px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
      Grade {grade}
    </span>
  );
}

/* ─── Skeleton row ───────────────────────────────────────────────── */
function SkeletonRow() {
  return (
    <tr>
      {[100, 70, 60, 80, 70, 60].map((w, i) => (
        <td key={i} style={{ padding: '14px 12px' }}>
          <div className="skeleton" style={{ height: 14, width: w, borderRadius: 4 }} />
        </td>
      ))}
    </tr>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
export default function DoctorPortalPage({
  onBack, onSelectReport,
  externalDoctorName, onLoginSuccess, onLogout,
  activeTab = 'dashboard'
}) {
  const [inputName,       setInputName]       = useState(externalDoctorName || '');
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [stats,           setStats]           = useState(null);
  const [reports,         setReports]         = useState([]);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState(null);

  // Table state
  const [search,    setSearch]    = useState('');
  const [sortCol,   setSortCol]   = useState('timestamp');
  const [sortDir,   setSortDir]   = useState('desc');
  const [filterGrade, setFilterGrade] = useState('all');
  
  const tableRef = React.useRef(null);

  const isLoggedIn = !!externalDoctorName;
  const doctorName = externalDoctorName;

  // Fetch doctors for dropdown
  useEffect(() => {
    if (!isLoggedIn) {
      fetch('/api/doctors')
        .then(r => r.json())
        .then(d => { if (Array.isArray(d)) setAvailableDoctors(d); })
        .catch(() => {});
    }
  }, [isLoggedIn]);

  // Fetch stats + reports when logged in
  useEffect(() => {
    if (!isLoggedIn || !doctorName) return;
    setLoading(true); setError(null);
    Promise.all([
      fetch(`/api/doctor/stats?doctor_name=${encodeURIComponent(doctorName)}`).then(r => r.json()),
      fetch(`/api/doctor/reports?doctor_name=${encodeURIComponent(doctorName)}`).then(r => r.json()),
    ])
    .then(([s, r]) => {
      if (s.detail || r.detail) throw new Error(s.detail || r.detail);
      setStats(s); setReports(r);
    })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
  }, [isLoggedIn, doctorName]);

  // Handle activeTab from nav header
  useEffect(() => {
    if (!isLoggedIn) return;
    if (activeTab === 'pending' || activeTab === 'patients') {
      if (activeTab === 'pending') setFilterGrade('pending');
      else setFilterGrade('all');
      
      setTimeout(() => {
        if (tableRef.current) {
          const y = tableRef.current.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    } else if (activeTab === 'dashboard') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [activeTab, isLoggedIn]);

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputName.trim()) onLoginSuccess(inputName.trim());
  };

  const handleReportClick = async (rep) => {
    if (!rep.report_id) return;
    try {
      const full = await fetchReportById(rep.report_id);
      if (full) onSelectReport(full);
    } catch {
      alert('Could not load report details.');
    }
  };

  // Donut segments (computed from full total_reviews, not segments.length)
  const donutSegments = useMemo(() => {
    if (!stats?.grade_distribution) return [];
    const total = stats.total_reviews || Object.values(stats.grade_distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    return Object.entries(stats.grade_distribution)
      .filter(([, cnt]) => cnt > 0)
      .map(([grade, cnt]) => ({
        grade: Number(grade), count: cnt,
        color: GRADE_COLORS[Number(grade)] || '#94a3b8',
        label: GRADE_LABELS[Number(grade)] || `Grade ${grade}`,
        // TODO(data): percentage computed from total_reviews, not validated-only count
        percentage: (cnt / total * 100).toFixed(1),
      }));
  }, [stats]);

  const donutTotal = useMemo(() => {
    if (!stats?.grade_distribution) return 0;
    return Object.values(stats.grade_distribution).reduce((a, b) => a + b, 0);
  }, [stats]);

  // Sort + filter table
  const sortToggle = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const filteredReports = useMemo(() => {
    let rows = [...reports];
    // Urgency sort: grade 3/4 pending first
    rows.sort((a, b) => {
      const aUrgent = (a.actual_grade === null || a.actual_grade === undefined) && a.predicted_grade >= 3;
      const bUrgent = (b.actual_grade === null || b.actual_grade === undefined) && b.predicted_grade >= 3;
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      // Secondary sort
      if (sortCol === 'timestamp') {
        const diff = new Date(b.timestamp) - new Date(a.timestamp);
        return sortDir === 'asc' ? -diff : diff;
      }
      return 0;
    });
    // Filter by grade or pending status
    if (filterGrade === 'pending') {
      rows = rows.filter(r => r.actual_grade === null || r.actual_grade === undefined);
    } else if (filterGrade !== 'all') {
      rows = rows.filter(r => String(r.predicted_grade) === filterGrade);
    }
    // Search
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        (r.patient_name || '').toLowerCase().includes(q) ||
        (r.feedback_id || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [reports, sortCol, sortDir, filterGrade, search]);

  const displayDoctorName = doctorName
    ? (doctorName.startsWith('Dr.') ? doctorName : `Dr. ${doctorName}`)
    : '';

  const validatedCount = reports.filter(r => r.actual_grade !== null && r.actual_grade !== undefined).length;
  const pendingCount   = reports.filter(r => r.actual_grade === null || r.actual_grade === undefined).length;
  const urgentCount    = reports.filter(r => r.predicted_grade >= 3 && (r.actual_grade === null || r.actual_grade === undefined)).length;

  // Accuracy: only show when validatedCount > 0
  const showAccuracy = stats && validatedCount > 0;

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <ChevronDown size={12} style={{ opacity: 0.4 }} />;
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />;
  };

  /* ── LOGIN SCREEN ── */
  if (!isLoggedIn) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(145deg, #eef5ff 0%, #e8f4fd 60%, #ddeeff 100%)',
        padding: '40px 16px',
        minHeight: 'calc(100vh - 64px)',
      }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 420 }}
        >
          <div style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.95)',
            borderRadius: 24,
            padding: '40px 32px 36px',
            boxShadow: '0 24px 64px -12px rgba(28,95,160,0.18)',
          }}>
            {/* Demo badge */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 999, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 700, display: 'flex', gap: 5, alignItems: 'center' }}>
                <Shield size={12} aria-hidden="true" />
                Demo Mode — No Authentication
              </span>
            </div>

            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <User size={26} strokeWidth={1.5} aria-hidden="true" />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Clinician Access</h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', margin: 0 }}>
                Enter your name to access the validation dashboard.
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Doctor dropdown or input */}
              <div>
                <label className="form-label" htmlFor="clinician-name">Clinician Name</label>
                {availableDoctors.length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <select
                      id="clinician-name"
                      value={inputName}
                      onChange={e => setInputName(e.target.value)}
                      className="form-input form-select"
                      required
                      style={{ paddingLeft: 14, cursor: 'pointer' }}
                    >
                      <option value="" disabled>— Select clinician —</option>
                      {availableDoctors.map((d) => (
                        <option key={d} value={d}>{d.startsWith('Dr.') ? d : `Dr. ${d}`}</option>
                      ))}
                    </select>
                    <ChevronDown size={16} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                  </div>
                ) : (
                  <input
                    id="clinician-name"
                    type="text"
                    value={inputName}
                    onChange={e => setInputName(e.target.value)}
                    placeholder="e.g. Dr. Sharma"
                    className="form-input"
                    required
                    autoComplete="name"
                    autoFocus
                  />
                )}
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={!inputName.trim()}>
                <Activity size={16} aria-hidden="true" />
                Access Dashboard
              </button>
              <button type="button" className="btn btn-ghost btn-block" onClick={onBack} style={{ color: 'var(--text-tertiary)' }}>
                ← Back to Home
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    );
  }

  /* ── DASHBOARD ── */
  return (
    <div style={{ flex: 1, background: 'var(--bg-app)' }}>
      <div className="page-container" style={{ padding: '32px 24px 64px' }}>

        {/* Dashboard header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 28 }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>
            Doctor Dashboard
          </h1>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', margin: 0 }}>
            Welcome back, <strong style={{ color: 'var(--primary)' }}>{displayDoctorName}</strong>
          </p>
        </motion.div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 12, color: 'var(--primary)' }}>
            <Loader2 size={36} className="animate-spin" aria-label="Loading statistics" />
            <span style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>Loading your validation statistics…</span>
          </div>
        ) : error ? (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-lg)', padding: '20px 24px', display: 'flex', gap: 12, alignItems: 'flex-start', color: '#991b1b' }} role="alert">
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <div>
              <p style={{ fontWeight: 700, marginBottom: 4 }}>Failed to load statistics</p>
              <p style={{ fontSize: '0.875rem', opacity: 0.9 }}>{error}</p>
            </div>
          </div>
        ) : stats ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ── Stat cards ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}
            >
              {[
                {
                  label: 'Total Validations',
                  value: stats.total_reviews, icon: FileText,
                  color: '#0284c7', bg: '#e0f2fe',
                },
                {
                  label: 'AI Agreement',
                  value: showAccuracy ? `${stats.accuracy.toFixed(1)}%` : '—',
                  numeric: showAccuracy ? stats.accuracy : null,
                  icon: CheckCircle, color: '#059669', bg: '#dcfce7',
                  note: !showAccuracy ? 'No validations yet' : undefined,
                },
                {
                  label: 'Pending Reviews',
                  value: pendingCount, icon: Clock,
                  color: '#d97706', bg: '#fef3c7',
                },
                {
                  label: 'Urgent (Grade 3–4)',
                  value: urgentCount, icon: AlertCircle,
                  color: '#dc2626', bg: '#fef2f2',
                },
              ].map(({ label, value, numeric, icon: Icon, color, bg, note }, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{ background: 'white', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', gap: 14, alignItems: 'center', boxShadow: 'var(--shadow-sm)' }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={22} strokeWidth={1.5} aria-hidden="true" />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBottom: 3 }}>{label}</p>
                    <p style={{ fontSize: '1.65rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                      {typeof value === 'number' ? <AnimatedStat value={value} /> : value}
                    </p>
                    {note && <p style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: 3 }}>{note}</p>}
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* ── Charts ── */}
            {donutSegments.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{ background: 'white', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}
              >
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 20 }}>
                  Severity Grade Distribution
                  <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-tertiary)', marginLeft: 8 }}>
                    {/* TODO(data): total_reviews comes from backend; ensure it reflects all cases not just validated */}
                    {donutTotal} patient{donutTotal !== 1 ? 's' : ''}
                  </span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' }}>
                    <DonutChart segments={donutSegments} total={donutTotal} />
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10, flex: '1 1 200px' }}>
                      {donutSegments.map(seg => (
                        <div key={seg.grade} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--surface-muted)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 12, height: 12, borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{seg.label}</span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>{seg.count}</div>
                            {/* TODO(data): percentage computed over total_reviews */}
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{seg.percentage}%</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── DataTable ── */}
            <motion.div
              ref={tableRef}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{ background: 'white', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: '24px', boxShadow: 'var(--shadow-sm)' }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', flex: 1, margin: 0 }}>
                  Recent Validations
                </h3>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                  <input
                    type="search"
                    placeholder="Search patient…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft: 30, paddingRight: 12, height: 36, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontSize: '0.8125rem', outline: 'none', minWidth: 160, background: 'var(--surface-muted)' }}
                    aria-label="Search patients"
                  />
                </div>

                {/* Grade filter */}
                <div style={{ position: 'relative' }}>
                  <select
                    value={filterGrade}
                    onChange={e => setFilterGrade(e.target.value)}
                    style={{ height: 36, paddingLeft: 10, paddingRight: 28, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', fontSize: '0.8125rem', background: 'var(--surface-muted)', appearance: 'none', cursor: 'pointer', outline: 'none' }}
                    aria-label="Filter by grade"
                  >
                    <option value="all">All grades</option>
                    <option value="pending">Pending Only</option>
                    {[0,1,2,3,4].map(g => <option key={g} value={String(g)}>Grade {g}</option>)}
                  </select>
                  <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-tertiary)' }} />
                </div>
              </div>

              {reports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Inbox size={40} style={{ opacity: 0.35 }} aria-hidden="true" />
                  <p style={{ margin: 0, fontWeight: 500 }}>No reports found for {displayDoctorName}</p>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.7 }}>Complete a screening and assign it to this clinician to see records here.</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" aria-label="Patient validation records">
                    <thead>
                      <tr>
                        {[
                          { col: 'patient_name', label: 'Patient Name' },
                          { col: 'timestamp',    label: 'Date' },
                          { col: 'predicted_grade', label: 'Predicted Grade' },
                          { col: 'actual_grade',    label: 'Actual Grade' },
                          { col: 'status',          label: 'Status' },
                          { col: 'referral',        label: 'Referral' },
                          { col: 'action',          label: 'Action' },
                        ].map(({ col, label }) => (
                          <th
                            key={col}
                            onClick={() => col !== 'action' && sortToggle(col)}
                            style={{ cursor: col !== 'action' ? 'pointer' : 'default', userSelect: 'none' }}
                            aria-sort={sortCol === col ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {label}
                              {col !== 'action' && <SortIcon col={col} />}
                            </span>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {loading
                        ? Array(5).fill(0).map((_, i) => <SkeletonRow key={i} />)
                        : filteredReports.length === 0
                          ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)' }}>
                                No results match your search or filter.
                              </td>
                            </tr>
                          )
                          : filteredReports.slice(0, 20).map((rep, i) => {
                              const isUrgent = (rep.actual_grade === null || rep.actual_grade === undefined) && rep.predicted_grade >= 3;
                              return (
                                <motion.tr
                                  key={rep.feedback_id || i}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.03 }}
                                  onClick={() => handleReportClick(rep)}
                                  style={{
                                    cursor: 'pointer',
                                    borderLeft: isUrgent ? '3px solid var(--grade-3)' : '3px solid transparent',
                                  }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={e => e.key === 'Enter' && handleReportClick(rep)}
                                  aria-label={`View report for ${rep.patient_name || 'Unknown'}`}
                                >
                                  <td style={{ fontWeight: 700, color: '#0f172a', padding: '14px 12px' }}>
                                    {rep.patient_name || 'Unknown'}
                                    {isUrgent && (
                                      <span style={{ marginLeft: 6, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 999, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 800 }}>URGENT</span>
                                    )}
                                  </td>
                                  <td style={{ color: 'var(--text-tertiary)', fontSize: '0.8125rem', padding: '14px 12px', whiteSpace: 'nowrap' }}>
                                    {rep.timestamp ? new Date(rep.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                  </td>
                                  <td style={{ padding: '14px 12px' }}>
                                    <GradeBadge grade={rep.predicted_grade} />
                                  </td>
                                  <td style={{ padding: '14px 12px' }}>
                                    {/* TODO(data): actual_grade comes from doctor validation panel (submit to backend) */}
                                    <GradeBadge grade={rep.actual_grade ?? null} />
                                  </td>
                                  <td style={{ padding: '14px 12px' }}>
                                    {rep.is_correct === true ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#dcfce7', color: '#14532d', border: '1px solid #86efac', borderRadius: 999, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                                        <CheckCircle2 size={12} strokeWidth={2.5} aria-hidden="true" /> Confirmed
                                      </span>
                                    ) : rep.is_correct === false ? (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef2f2', color: '#7f1d1d', border: '1px solid #fca5a5', borderRadius: 999, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                                        <XCircle size={12} strokeWidth={2.5} aria-hidden="true" /> Corrected
                                      </span>
                                    ) : (
                                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: 999, padding: '3px 10px', fontSize: '0.75rem', fontWeight: 700 }}>
                                        <Clock size={12} strokeWidth={2} aria-hidden="true" /> Pending
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ padding: '14px 12px', fontSize: '0.75rem', color: '#1d4ed8', fontWeight: 600 }}>
                                    {rep.referral_hospital || '—'}
                                  </td>
                                  <td style={{ padding: '14px 12px' }}>
                                    <button
                                      className="btn btn-outline btn-sm"
                                      onClick={(e) => { e.stopPropagation(); handleReportClick(rep); }}
                                      aria-label={`Review report for ${rep.patient_name || 'patient'}`}
                                      style={{ whiteSpace: 'nowrap' }}
                                    >
                                      Review <ChevronRight size={12} aria-hidden="true" />
                                    </button>
                                  </td>
                                </motion.tr>
                              );
                            })
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
