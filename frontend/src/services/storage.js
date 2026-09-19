/**
 * Local storage manager for AarogyaNetra reports and offline queue.
 * Allows screening reports to be securely cached and recalled on device.
 */

const STORAGE_KEY = 'aarogyanetra_reports_v1';

export function getSavedReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultReports();
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to load reports from localStorage', err);
    return getDefaultReports();
  }
}

export function saveReport(report) {
  try {
    const existing = getSavedReports();
    const updated = [report, ...existing.filter(r => r.id !== report.id)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed to save report to localStorage', err);
    return [];
  }
}

export function getReportById(id) {
  const reports = getSavedReports();
  return reports.find(r => r.id === id) || null;
}

function getDefaultReports() {
  const now = new Date();
  const d1 = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const d2 = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const d3 = new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return [
    {
      id: 'AN-2026-0814',
      date: d1,
      patient: {
        name: 'Rameshwar Singh',
        age: 58,
        gender: 'male',
        diabetesDuration: 'duration5to10',
        mobile: '9876543210'
      },
      stage1Outcome: 'DR_DETECTED',
      grade: 2,
      severityKey: 'severityModerate',
      confidence: 'HIGH',
      confidenceScore: 0.93,
      referralKey: 'recClinicalReview',
      timelineKey: 'recClinicalReviewTimeline',
      explanation: 'The automated analysis indicates retinal changes consistent with moderate non-proliferative diabetic retinopathy. Multiple microaneurysms and small dot hemorrhages were observed in the macular periphery. Clinical confirmation by an eye care specialist is recommended within 3 to 6 months.',
      iqaScore: 0.94,
      iqaPassed: true
    },
    {
      id: 'AN-2026-0792',
      date: d2,
      patient: {
        name: 'Sunita Devi',
        age: 46,
        gender: 'female',
        diabetesDuration: 'duration1to5',
        mobile: '9845123789'
      },
      stage1Outcome: 'NO_DR',
      grade: 0,
      severityKey: 'severityNone',
      confidence: 'HIGH',
      confidenceScore: 0.97,
      referralKey: 'recRoutine',
      timelineKey: 'recRoutineTimeline',
      explanation: 'No characteristic lesions or microvascular abnormalities of diabetic retinopathy were detected. Optic disc and foveal architecture appear normal. Routine annual screening is advised.',
      iqaScore: 0.96,
      iqaPassed: true
    },
    {
      id: 'AN-2026-0740',
      date: d3,
      patient: {
        name: 'Gurpreet Kaur',
        age: 63,
        gender: 'female',
        diabetesDuration: 'durationOver10',
        mobile: '9811223344'
      },
      stage1Outcome: 'UNCERTAIN',
      grade: null,
      severityKey: null,
      confidence: 'NEEDS_REVIEW',
      confidenceScore: 0.54,
      referralKey: 'recRetest',
      timelineKey: 'recRetestTimeline',
      explanation: 'Boundary verification between Class 0 and Class 1 indicated borderline microvascular features. The AI model has flagged this image for manual clinical review or a repeat fundus photograph.',
      iqaScore: 0.81,
      iqaPassed: true
    }
  ];
}
