import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, ArrowLeft, ArrowRight, CheckCircle2, Video, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getSampleFundusImages } from '../utils/sampleImages';

export default function ImageUploadPage({ onImageSelected, onBack }) {
  const { t } = useLanguage();

  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedSampleMeta, setSelectedSampleMeta] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const samples = getSampleFundusImages();

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPEG, PNG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedImage(event.target.result);
      setSelectedSampleMeta(null); // custom user uploaded image
    };
    reader.readAsDataURL(file);
  };

  // Drag & drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target.result);
        setSelectedSampleMeta(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Camera capture
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError(t('cameraNotSupported'));
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 640;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setSelectedImage(dataUrl);
    setSelectedSampleMeta(null);
    stopCamera();
  };

  const selectSample = (sampleKey) => {
    const sample = samples[sampleKey];
    if (sample) {
      setSelectedImage(sample.dataUrl);
      setSelectedSampleMeta(sample);
      stopCamera();
    }
  };

  const handleProceed = () => {
    if (selectedImage) {
      onImageSelected(selectedImage, selectedSampleMeta);
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto' }}>
      <div className="clean-card">
        <h2 style={{ marginBottom: '4px' }}>{t('uploadTitle')}</h2>
        <p className="subtitle" style={{ marginBottom: '16px' }}>
          {t('uploadInstruction')}
        </p>

        {/* Live Camera View */}
        {isCameraActive ? (
          <div style={{ marginBottom: '24px' }}>
            <div className="preview-container" style={{ position: 'relative' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{ width: '100%', height: 'auto', display: 'block' }}
              />
            </div>
            <div className="btn-group" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={stopCamera}
                style={{ flex: 1 }}
              >
                {t('cancelCamera')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={capturePhoto}
                style={{ flex: 2 }}
              >
                <Camera size={20} />
                <span>{t('takePhoto')}</span>
              </button>
            </div>
          </div>
        ) : selectedImage ? (
          /* Selected Image Preview */
          <div style={{ marginBottom: '24px' }}>
            <div className="preview-container">
              <img src={selectedImage} alt="Fundus Retinal Preview" className="preview-img" />
              {selectedSampleMeta && (
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    backgroundColor: 'rgba(15, 23, 42, 0.85)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  {t(selectedSampleMeta.titleKey)}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '14px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedImage(null);
                  setSelectedSampleMeta(null);
                }}
                style={{ fontSize: '0.95rem', padding: '8px 16px', minHeight: '40px' }}
              >
                <Trash2 size={16} />
                <span>{t('removeImage')}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Upload / Capture options */
          <div style={{ marginBottom: '24px' }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/jpeg,image/png"
              style={{ display: 'none' }}
            />

            <div
              className={`uploader-box ${isDragging ? 'drag-over' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={42} style={{ color: 'var(--primary)', margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>
                {t('uploadImage')}
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                {t('dragDropText')}
              </p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {t('supportedFormats')}
              </span>
            </div>

            {/* Camera trigger */}
            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-block"
                onClick={startCamera}
              >
                <Video size={20} />
                <span>{t('captureImage')}</span>
              </button>
            </div>

            {cameraError && (
              <div className="form-error" style={{ marginTop: '8px', justifyContent: 'center' }}>
                <AlertCircle size={16} />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Sample Selector for testing & rural health training */}
            <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>
                {t('selectSampleImage')}
              </div>
              <div className="sample-grid">
                {Object.entries(samples).map(([key, sample]) => (
                  <div
                    key={key}
                    className="sample-card"
                    onClick={() => selectSample(key)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && selectSample(key)}
                  >
                    <img src={sample.dataUrl} alt={sample.titleKey} className="sample-thumb" />
                    <div className="sample-name">{t(sample.titleKey)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <div className="btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onBack}
            style={{ flex: 1 }}
          >
            <ArrowLeft size={18} />
            <span>{t('back')}</span>
          </button>

          <button
            type="button"
            className="btn btn-primary"
            disabled={!selectedImage || isCameraActive}
            onClick={handleProceed}
            style={{ flex: 2 }}
          >
            <span>{t('proceedToQualityCheck')}</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
