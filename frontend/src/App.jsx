import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import Stepper from './components/Stepper';
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

// Page transition variants — fade + 8px slide up, no layout shift
const pageVariants = {
  initial: { opacity: 0, y: 10 },
  enter:   { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15, ease: 'easeIn' } },
};

// Steps that show the Stepper strip
const STEPPER_VIEWS   = ['patient_info', 'image_upload', 'analysis', 'result'];
const STEPPER_STEP_MAP = {
  patient_info: 1,
  image_upload: 2,
  analysis:     3,
  result:       3,
};

export default function App() {
  const [currentView, setCurrentView] = useState('welcome');
  const [isHelpOpen, setIsHelpOpen]   = useState(false);

  // Workflow state
  const [patient, setPatient] = useState({
    name: '', age: '', gender: '', diabetesDuration: '', mobile: '', dob: ''
  });
  const [selectedImage,     setSelectedImage]     = useState(null);
  const [selectedSampleMeta, setSelectedSampleMeta] = useState(null);
  const [screeningResult,   setScreeningResult]   = useState(null);
  const [selectedReportToView, setSelectedReportToView] = useState(null);

  // Doctor session state (for header nav swap)
  const [doctorName, setDoctorName] = useState(
    () => localStorage.getItem('aarogyanetra_doctor') || ''
  );

  const handleDoctorLogin  = (name) => {
    setDoctorName(name);
    localStorage.setItem('aarogyanetra_doctor', name);
  };

  const handleDoctorLogout = () => {
    setDoctorName('');
    localStorage.removeItem('aarogyanetra_doctor');
    setCurrentView('welcome');
  };

  // Navigation handlers
  const handleStartScreening        = () => setCurrentView('patient_info');
  const handlePatientInfoSubmitted   = (data) => { setPatient(data); setCurrentView('image_upload'); };
  const handleImageSelected          = (img, meta) => { setSelectedImage(img); setSelectedSampleMeta(meta); setCurrentView('analysis'); };
  const handleAnalysisComplete       = (report) => { setScreeningResult(report); setCurrentView('result'); };
  const handleViewReport             = () => { setSelectedReportToView(screeningResult); setCurrentView('report'); };
  const handleStartNewScreening      = () => {
    setPatient({ name: '', age: '', gender: '', diabetesDuration: '', mobile: '', dob: '' });
    setSelectedImage(null); setSelectedSampleMeta(null);
    setScreeningResult(null); setSelectedReportToView(null);
    setCurrentView('welcome');
  };
  const handleRecaptureImage         = () => {
    setSelectedImage(null); setSelectedSampleMeta(null);
    setScreeningResult(null); setCurrentView('image_upload');
  };
  const handleSelectReportFromList   = (rep) => { setSelectedReportToView(rep); setCurrentView('report'); };

  const showStepper  = STEPPER_VIEWS.includes(currentView);
  const stepperStep  = STEPPER_STEP_MAP[currentView] || 1;

  return (
    <>
      <OfflineBanner />

      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        onOpenHelp={() => setIsHelpOpen(true)}
        doctorName={doctorName || null}
        onDoctorLogout={handleDoctorLogout}
      />

      {/* Stepper strip — rendered outside cards, directly below navbar */}
      {showStepper && <Stepper currentStep={stepperStep} />}

      {/* Main workspace */}
      <main id="main-content" role="main" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentView}
            variants={pageVariants}
            initial="initial"
            animate="enter"
            exit="exit"
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
          >
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
                  console.error('Screening error:', err);
                  setCurrentView('image_upload');
                }}
              />
            )}

            {currentView === 'result' && (
              <ResultsPage
                result={screeningResult}
                patient={patient}
                onViewReport={handleViewReport}
                onStartNewScreening={handleStartNewScreening}
                onRecapture={handleRecaptureImage}
              />
            )}

            {currentView === 'report' && (
              <ReportViewPage
                report={selectedReportToView || screeningResult}
                onStartNewScreening={handleStartNewScreening}
                onBack={() => {
                  // If a doctor is logged in, go back to doctor portal; otherwise result
                  if (doctorName) setCurrentView('doctor_portal');
                  else setCurrentView('result');
                }}
              />
            )}

            {currentView === 'reports' && (
              <PreviousReportsPage
                onSelectReport={handleSelectReportFromList}
                onBack={() => setCurrentView('welcome')}
              />
            )}

            {currentView.startsWith('doctor_portal') && (
              <DoctorPortalPage
                onBack={() => setCurrentView('welcome')}
                onSelectReport={handleSelectReportFromList}
                externalDoctorName={doctorName}
                onLoginSuccess={handleDoctorLogin}
                onLogout={handleDoctorLogout}
                activeTab={currentView.replace('doctor_portal_', '').replace('doctor_portal', 'dashboard')}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer style={{
        textAlign: 'center', padding: '20px 24px',
        fontSize: '0.8125rem', color: 'var(--text-tertiary)',
        borderTop: '1px solid var(--border-subtle)',
        background: 'white',
      }}>
        AarogyaNetra is an AI-assistive screening tool — not a substitute for clinical diagnosis.
        &nbsp;·&nbsp; Model v2.1 &nbsp;·&nbsp; Data stored locally &nbsp;·&nbsp;{' '}
        <span>Built for Smart India Hackathon 2026</span>
      </footer>

      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </>
  );
}
