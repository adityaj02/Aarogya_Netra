import React, { useState, useEffect } from 'react';
import { User, Activity, CheckCircle, AlertTriangle, FileText, ArrowLeft, LogOut, Loader2, Inbox } from 'lucide-react';
import { fetchReportById } from '../services/api';

export default function DoctorPortalPage({ onBack, onSelectReport }) {
  const [doctorName, setDoctorName] = useState(() => localStorage.getItem('aarogyanetra_doctor') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(!!doctorName);
  const [inputName, setInputName] = useState(doctorName);
  const [availableDoctors, setAvailableDoctors] = useState([]);
  
  const [stats, setStats] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputName.trim().length > 0) {
      setDoctorName(inputName.trim());
      localStorage.setItem('aarogyanetra_doctor', inputName.trim());
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setDoctorName('');
    setInputName('');
    localStorage.removeItem('aarogyanetra_doctor');
    setIsLoggedIn(false);
    setStats(null);
    setReports([]);
  };

  useEffect(() => {
    if (!isLoggedIn) {
      fetch('/api/doctors')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAvailableDoctors(data);
        })
        .catch(err => console.error('Error fetching doctors:', err));
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn && doctorName) {
      setLoading(true);
      setError(null);
      
      Promise.all([
        fetch(`/api/doctor/stats?doctor_name=${encodeURIComponent(doctorName)}`).then(res => res.json()),
        fetch(`/api/doctor/reports?doctor_name=${encodeURIComponent(doctorName)}`).then(res => res.json())
      ])
      .then(([statsData, reportsData]) => {
        if (statsData.detail || reportsData.detail) {
          throw new Error(statsData.detail || reportsData.detail);
        }
        setStats(statsData);
        setReports(reportsData);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
    }
  }, [isLoggedIn, doctorName]);

  const handleReportClick = async (rep) => {
    try {
      if (rep.report_id) {
        const fullReport = await fetchReportById(rep.report_id);
        if (fullReport) {
          onSelectReport(fullReport);
        } else {
          alert('Full report details not found.');
        }
      }
    } catch (err) {
      console.error('Error fetching full report:', err);
      alert('Error fetching full report details.');
    }
  };

  // Pie chart calculation
  const getPieChartSegments = (distribution) => {
    if (!distribution) return [];
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    if (total === 0) return [];
    
    let currentAngle = 0;
    const colors = {
      0: '#22c55e', // Green for None
      1: '#eab308', // Yellow for Mild
      2: '#f97316', // Orange for Moderate
      3: '#ef4444', // Red for Severe
      4: '#991b1b'  // Dark Red for Proliferative
    };
    
    const labels = {
      0: 'Grade 0 (None)',
      1: 'Grade 1 (Mild)',
      2: 'Grade 2 (Moderate)',
      3: 'Grade 3 (Severe)',
      4: 'Grade 4 (Proliferative)'
    };

    return Object.entries(distribution).map(([grade, count]) => {
      const percentage = (count / total) * 100;
      const angle = (percentage / 100) * 360;
      const segment = {
        grade,
        count,
        percentage,
        color: colors[grade],
        label: labels[grade],
        startAngle: currentAngle,
        endAngle: currentAngle + angle
      };
      currentAngle += angle;
      return segment;
    }).filter(s => s.count > 0);
  };

  const segments = stats ? getPieChartSegments(stats.grade_distribution) : [];
  
  // Construct conic gradient string
  const conicGradient = segments.length > 0 
    ? `conic-gradient(${segments.map(s => `${s.color} ${s.startAngle}deg ${s.endAngle}deg`).join(', ')})`
    : 'conic-gradient(#e2e8f0 0deg 360deg)';

  if (!isLoggedIn) {
    return (
      <div className="flex-1 w-full flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient Background Layers */}
        <div aria-hidden="true" className="fixed inset-0 subtle-grid pointer-events-none z-0"></div>
        <div aria-hidden="true" className="fixed top-12 left-1/4 w-[480px] h-[480px] rounded-full bg-sky-200/50 blur-[110px] pointer-events-none -z-10"></div>
        <div aria-hidden="true" className="fixed bottom-0 right-10 w-[620px] h-[620px] rounded-full bg-blue-200/40 blur-[130px] pointer-events-none -z-10"></div>
        
        <div className="bg-white/80 backdrop-blur-2xl rounded-[24px] p-10 shadow-[0_20px_45px_-15px_rgba(28,95,160,0.14),0_0_0_1px_rgba(190,215,240,0.45)] border border-white/95 max-w-md w-full relative z-10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center mb-4 text-sky-600 shadow-sm">
              <User size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Doctor Portal</h2>
            <p className="text-slate-500 mt-2 text-sm">Enter your clinician name or ID to access your validation dashboard.</p>
          </div>
          
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Clinician Name</label>
              <input 
                type="text" 
                list="doctor-list"
                value={inputName}
                onChange={e => setInputName(e.target.value)}
                placeholder="e.g. Dr. Smith"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white/70 focus:bg-white focus:border-sky-500 focus:ring-4 focus:ring-sky-500/15 outline-none transition-all font-medium text-slate-800"
                required
              />
              <datalist id="doctor-list">
                {availableDoctors.map(doc => (
                  <option key={doc} value={doc} />
                ))}
              </datalist>
            </div>
            <button 
              type="submit"
              className="w-full bg-gradient-to-r from-[#078dcc] to-[#218cf0] shadow-[0_8px_20px_rgba(14,165,233,0.3)] hover:shadow-[0_12px_25px_rgba(14,165,233,0.4)] text-white font-bold py-3.5 rounded-xl transition-all transform hover:-translate-y-px mt-2"
            >
              Access Dashboard
            </button>
            <button 
              type="button"
              onClick={onBack}
              className="w-full bg-white/80 text-slate-600 font-bold py-3.5 rounded-xl border border-slate-300/90 hover:bg-white hover:border-slate-400 transition-all"
            >
              Back to Home
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full bg-slate-50 overflow-y-auto relative">
      <div className="max-w-6xl mx-auto px-6 lg:px-14 py-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Doctor Dashboard</h1>
              <p className="text-slate-500 text-sm">Welcome back, <span className="font-semibold text-sky-700">{doctorName}</span></p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-semibold hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all shadow-sm"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-sky-600 gap-3">
            <Loader2 className="animate-spin" size={36} />
            <span className="font-medium">Loading your validation statistics...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl flex items-center gap-4">
            <AlertTriangle className="shrink-0" />
            <div>
              <h3 className="font-bold">Failed to load statistics</h3>
              <p className="text-sm opacity-90">{error}</p>
            </div>
          </div>
        ) : stats ? (
          <div className="flex flex-col gap-8">
            
            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-6">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
                  <FileText size={28} />
                </div>
                <div>
                  <p className="text-slate-500 font-medium text-sm mb-1">Total Validations</p>
                  <h3 className="text-3xl font-bold text-slate-800">{stats.total_reviews}</h3>
                </div>
              </div>
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex items-center gap-6">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
                  <CheckCircle size={28} />
                </div>
                <div>
                  <p className="text-slate-500 font-medium text-sm mb-1">AI Agreement (Accuracy)</p>
                  <h3 className="text-3xl font-bold text-slate-800">{stats.accuracy.toFixed(1)}%</h3>
                </div>
              </div>
            </div>

            {/* Charts & Analytics */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Severity Grade Distribution</h3>
              
              {stats.total_reviews === 0 ? (
                <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                  <p>No validation data available yet.</p>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row items-center gap-12">
                  {/* CSS Conic Gradient Pie Chart */}
                  <div className="relative w-64 h-64 shrink-0">
                    <div 
                      className="w-full h-full rounded-full shadow-inner"
                      style={{ background: conicGradient }}
                    ></div>
                    {/* Donut hole */}
                    <div className="absolute inset-0 m-auto w-40 h-40 bg-white rounded-full shadow-sm flex flex-col items-center justify-center">
                      <span className="text-3xl font-black text-slate-800">{stats.total_reviews}</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Patients</span>
                    </div>
                  </div>

                  {/* Legend / Breakdown */}
                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {segments.map(seg => (
                      <div key={seg.grade} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: seg.color }}></div>
                          <span className="font-semibold text-slate-700 text-sm">{seg.label}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-slate-800">{seg.count}</div>
                          <div className="text-xs text-slate-500">{seg.percentage.toFixed(1)}%</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Recent Validations List */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Recent Validations</h3>
              
              {reports.length === 0 ? (
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
                  <p style={{ fontSize: '1.1rem', fontWeight: 500, margin: 0 }}>No recent reports found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                        <th className="pb-4 font-semibold pl-2">Patient Name</th>
                        <th className="pb-4 font-semibold">Date</th>
                        <th className="pb-4 font-semibold">Predicted Grade</th>
                        <th className="pb-4 font-semibold">Actual Grade</th>
                        <th className="pb-4 font-semibold text-right pr-2">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {reports.slice(0, 10).map((rep) => (
                        <tr key={rep.feedback_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => handleReportClick(rep)}>
                          <td className="py-4 pl-2 font-bold text-slate-800">{rep.patient_name || 'Unknown'}</td>
                          <td className="py-4 text-slate-600">
                            {new Date(rep.timestamp).toLocaleDateString()}
                          </td>
                          <td className="py-4">
                            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              {rep.predicted_grade !== null ? `Grade ${rep.predicted_grade}` : 'N/A'}
                            </span>
                          </td>
                          <td className="py-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              rep.is_correct ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              Grade {rep.actual_grade}
                            </span>
                          </td>
                          <td className="py-4 text-right pr-2">
                            {/* In a real app we might fetch the full report. We'll just show the feedback ID for now */}
                            <span className="text-xs text-slate-400">{rep.feedback_id}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        ) : null}
        
      </div>
    </div>
  );
}
