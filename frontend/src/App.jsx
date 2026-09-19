import React, { useState } from 'react';
import Header from './components/Header';
import OfflineBanner from './components/OfflineBanner';
import HelpModal from './components/HelpModal';

import WelcomePage from './pages/WelcomePage';
import PatientInfoPage from './pages/PatientInfoPage';
import ImageUploadPage from './pages/ImageUploadPage';
import AnalysisPage from './pages/AnalysisPage';
import ResultsPage from './pages/ResultsPage';
import ReportViewPage from './pages/ReportViewPage';
import PreviousReportsPage from './pages/PreviousReportsPage';
import DoctorPortalPage from './pages/DoctorPortalPage';

export default function App() {
  // Navigation views: 'welcome' | 'patient_info' | 'image_upload' | 'analysis' | 'result' | 'report' | 'reports'
  const [currentView, setCurrentView] = useState('welcome');
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Workflow State
  const [patient, setPatient] = useState({
    name: '',
    age: '',
    gender: '',
    diabetesDuration: '',
    mobile: ''
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSampleMeta, setSelectedSampleMeta] = useState(null);
  const [screeningResult, setScreeningResult] = useState(null);
  const [selectedReportToView, setSelectedReportToView] = useState(null);

  // Step 1: Start screening -> Patient Info
  const handleStartScreening = () => {
    setCurrentView('patient_info');
  };

  // Step 2: Patient Info -> Image Upload
  const handlePatientInfoSubmitted = (patientData) => {
    setPatient(patientData);
    setCurrentView('image_upload');
  };

  // Step 3: Image Upload -> Analysis (skip quality check)
  const handleImageSelected = (imageData, sampleMeta) => {
    setSelectedImage(imageData);
    setSelectedSampleMeta(sampleMeta);
    setCurrentView('analysis');
  };

  // Step 5: AI Analysis -> Results
  const handleAnalysisComplete = (fullReport) => {
    setScreeningResult(fullReport);
    setCurrentView('result');
  };

  // Step 6: Results -> Full Report
  const handleViewReport = () => {
    setSelectedReportToView(screeningResult);
    setCurrentView('report');
  };

  // Step 5: Reset to start new screening
  const handleStartNewScreening = () => {
    setPatient({
      name: '',
      age: '',
      gender: '',
      diabetesDuration: '',
      mobile: ''
    });
    setSelectedImage(null);
    setSelectedSampleMeta(null);
    setScreeningResult(null);
    setSelectedReportToView(null);
    setCurrentView('welcome');
  };

  // IQA rejected: go straight back to upload, keep patient info intact
  const handleRecaptureImage = () => {
    setSelectedImage(null);
    setSelectedSampleMeta(null);
    setScreeningResult(null);
    setCurrentView('image_upload');
  };

  // Open past report from list
  const handleSelectReportFromList = (rep) => {
    setSelectedReportToView(rep);
    setCurrentView('report');
  };

  return (
    <>
      {/* Offline Banner */}
      <OfflineBanner />

      {/* Persistent Global Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      {/* Main Interactive Workspace */}
      <main className={['welcome', 'patient_info', 'image_upload'].includes(currentView) ? 'flex-1 w-full' : 'main-content'} role="main">
        {currentView === 'welcome' && (
          <WelcomePage
            onStartScreening={handleStartScreening}
            onViewReports={() => setCurrentView('reports')}
            onOpenHelp={() => setIsHelpOpen(true)}
          />
        )}

        {currentView === 'patient_info' && (
          <PatientInfoPage
            initialData={patient}
            onContinue={handlePatientInfoSubmitted}
            onBack={() => setCurrentView('welcome')}
          />
        )}

        {currentView === 'image_upload' && (
          <ImageUploadPage
            onImageSelected={handleImageSelected}
            onBack={() => setCurrentView('patient_info')}
          />
        )}

        {currentView === 'analysis' && (
          <AnalysisPage
            patient={patient}
            imageData={selectedImage}
            sampleMeta={selectedSampleMeta}
            onAnalysisComplete={handleAnalysisComplete}
            onError={(err) => {
              alert('Screening error: ' + err.message);
              setCurrentView('image_upload');
            }}
          />
        )}

        {currentView === 'result' && (
          <ResultsPage
            result={screeningResult}
            onViewReport={handleViewReport}
            onStartNewScreening={handleStartNewScreening}
            onRecapture={handleRecaptureImage}
          />
        )}

        {currentView === 'report' && (
          <ReportViewPage
            report={selectedReportToView || screeningResult}
            onStartNewScreening={handleStartNewScreening}
          />
        )}

        {currentView === 'reports' && (
          <PreviousReportsPage
            onSelectReport={handleSelectReportFromList}
            onBack={() => setCurrentView('welcome')}
          />
        )}

        {currentView === 'doctor_portal' && (
          <DoctorPortalPage
            onBack={() => setCurrentView('welcome')}
            onSelectReport={handleSelectReportFromList}
          />
        )}
      </main>

      {/* Universal Footer */}
      <footer style={{ textAlign: 'center', padding: '24px', fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-subtle)', background: 'var(--surface-default)' }}>
        AarogyaNetra is an AI-assistive tool, not a replacement for clinical judgment.
      </footer>

      {/* Help & Guidance Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
      />
    </>
  );
}
