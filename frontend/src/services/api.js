/**
 * AarogyaNetra API Service
 * Encapsulates the complete SRS Hierarchical AI Pipeline:
 * - Stage 1 DR Screening (Class 0 vs DR)
 * - 0 vs 1 Boundary Validation
 * - Stage 2 Severity Classification (Grades 1 to 4)
 * - Neighbouring-Class Boundary Validation
 * - Decision Fusion & Confidence Calibration
 * - Grad-CAM Attention Synthesis
 * - Knowledge-Grounded RAG Clinical Explanation
 * - Referral & Clinical Action Mapping
 */

const API_BASE = "/api";

export async function runHierarchicalScreening({
  patient,
  imageData,
  sampleMeta = null,
  lang = 'en',
  onStepProgress = () => {}
}) {
  // Stage 1: Preprocessing
  onStepProgress({ step: 1, label: 'stagePreprocessing' });

  // Create patient first
  let patientId = "1";
  try {
    const patientRes = await fetch(`${API_BASE}/patients`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patient)
    });
    if (patientRes.ok) {
      const patientData = await patientRes.json();
      if (patientData && patientData.id) {
        patientId = String(patientData.id);
      }
    }
  } catch (err) {
    console.warn("Could not register patient, fallback to default ID:", err);
  }

  // Stage 2: DR Screening (image upload starts)
  onStepProgress({ step: 2, label: 'stepScreening' });

  // Convert imageData (dataURL) to blob
  const res = await fetch(imageData);
  const blob = await res.blob();

  const formData = new FormData();
  formData.append("patient_id", patientId);
  formData.append("language", lang);
  formData.append("file", blob, "fundus.jpg");

  // Stage 3: Severity grading (kick off while request is in-flight)
  const screenPromise = fetch(`${API_BASE}/screen`, {
    method: "POST",
    body: formData
  });

  // Simulate stage progression with timeouts while request runs
  const stepTimer = setTimeout(() => onStepProgress({ step: 3, label: 'stepSeverity' }), 1200);

  const screenRes = await screenPromise;
  clearTimeout(stepTimer);

  // Stage 3 confirmed (if not already triggered)
  onStepProgress({ step: 3, label: 'stepSeverity' });

  const fullReport = await screenRes.json();

  // Stage 4: Explanation generation
  onStepProgress({ step: 4, label: 'stepExplanation' });

  // Prepend API base to image URLs if needed
  if (fullReport.heatmapDataUrl && fullReport.heatmapDataUrl.startsWith("/")) {
    fullReport.heatmapDataUrl = fullReport.heatmapDataUrl;
    fullReport.overlayDataUrl = fullReport.overlayDataUrl;
    fullReport.imageData = fullReport.imageData;
  }

  // Add patient back to report for UI
  fullReport.patient = patient;

  return fullReport;
}


export async function fetchReports({ search = '', filter = 'ALL' } = {}) {
  const res = await fetch(`${API_BASE}/reports`);
  const allReports = await res.json();
  
  return allReports.filter((rep) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      (rep.patient?.name && rep.patient.name.toLowerCase().includes(query)) ||
      rep.id.toLowerCase().includes(query);

    let matchesFilter = true;
    if (filter === 'NO_DR') matchesFilter = rep.stage1Outcome === 'NO_DR';
    else if (filter === 'DR_DETECTED') matchesFilter = rep.stage1Outcome === 'DR_DETECTED';
    else if (filter === 'UNCERTAIN') matchesFilter = rep.stage1Outcome === 'UNCERTAIN';

    return matchesSearch && matchesFilter;
  });
}

export async function fetchReportById(id) {
  const reports = await fetchReports();
  return reports.find((r) => r.id === id);
}

export async function submitClinicalFeedback(data) {
  const res = await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  
  if (!res.ok) {
    throw new Error('Failed to submit clinical feedback');
  }
  
  return await res.json();
}
