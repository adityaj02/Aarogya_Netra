import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Upload, Trash2, ArrowLeft, ArrowRight, Video, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function ImageUploadPage({ onImageSelected, onBack }) {
  const { t } = useLanguage();

  const [selectedImage,     setSelectedImage]     = useState(null);
  const [selectedSampleMeta, setSelectedSampleMeta] = useState(null);
  const [isCameraActive,    setIsCameraActive]    = useState(false);
  const [cameraError,       setCameraError]       = useState(null);
  const [isDragging,        setIsDragging]        = useState(false);
  const [uploadError,       setUploadError]       = useState(null);

  const fileInputRef = useRef(null);
  const videoRef     = useRef(null);
  const streamRef    = useRef(null);

  // â”€â”€ File handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadFile = useCallback((file) => {
    setUploadError(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Unsupported file format. Please upload a JPEG or PNG image.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 15 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => { setSelectedImage(e.target.result); setSelectedSampleMeta(null); };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e) => loadFile(e.target.files?.[0]);

  const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = ()  => setIsDragging(false);
  const handleDrop      = (e) => {
    e.preventDefault();
    setIsDragging(false);
    loadFile(e.dataTransfer.files?.[0]);
  };

  // â”€â”€ Camera â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setCameraError(t('cameraNotSupported', 'Camera not available. Please upload an image instead.'));
      setIsCameraActive(false);
    }
  };

  const stopCamera  = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth  || 640;
    canvas.height = videoRef.current.videoHeight || 640;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    setSelectedImage(canvas.toDataURL('image/jpeg', 0.95));
    setSelectedSampleMeta(null);
    stopCamera();
  };

  const clearImage = () => { setSelectedImage(null); setSelectedSampleMeta(null); setUploadError(null); };

  const handleProceed = () => {
    if (selectedImage) onImageSelected(selectedImage, selectedSampleMeta);
  };

  return (
    <div style={{
      flex: 1, padding: '32px 16px 64px',
      background: 'linear-gradient(145deg, #eef5ff 0%, #e8f4fd 60%, #ddeeff 100%)',
    }}>
      <div className="page-container" style={{ maxWidth: 760 }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div style={{
            background: 'rgba(255,255,255,0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.95)',
            borderRadius: 24,
            padding: '36px 32px 32px',
            boxShadow: '0 20px 48px -12px rgba(28,95,160,0.14)',
          }}>

            {/* â”€â”€ Page heading (ABOVE dropzone â€” critical order fix) â”€â”€ */}
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em', marginBottom: 6 }}>
                {t('uploadTitle', 'Fundus Image Upload')}
              </h2>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-tertiary)', lineHeight: 1.6, margin: 0 }}>
                {t('uploadInstruction', 'Upload a clear retinal fundus photograph. The image will be analyzed by the AI screening model.')}
              </p>
            </div>

            {/* â”€â”€ Camera View â”€â”€ */}
            <AnimatePresence>
              {isCameraActive && (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ marginBottom: 20 }}
                >
                  <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#0f172a', border: '1.5px solid var(--border)' }}>
                    <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button
                      type="button"
                      onClick={stopCamera}
                      style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                      aria-label="Close camera"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={stopCamera}>{t('cancelCamera', 'Cancel')}</button>
                    <button type="button" className="btn btn-primary" style={{ flex: 2 }} onClick={capturePhoto}>
                      <Camera size={18} aria-hidden="true" />{t('takePhoto', 'Capture Photo')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* â”€â”€ Dropzone / Preview (only shown when no camera active) â”€â”€ */}
            {!isCameraActive && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png"
                  style={{ display: 'none' }}
                  aria-label="Upload fundus image"
                />

                <AnimatePresence mode="wait">
                  {selectedImage ? (
                    /* â”€â”€ Success state: image preview â”€â”€ */
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.96 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      style={{ position: 'relative', marginBottom: 20 }}
                    >
                      <div style={{ width: '100%', aspectRatio: '16/9', position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', background: '#0f172a', border: '1.5px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                        <img
                          src={selectedImage}
                          alt="Selected fundus retinal image"
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                        {selectedSampleMeta && (
                          <div style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 10px', borderRadius: 6, fontSize: '0.8125rem', fontWeight: 600, backdropFilter: 'blur(8px)' }}>
                            {t(selectedSampleMeta.titleKey)}
                          </div>
                        )}
                        <motion.button
                          type="button"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={clearImage}
                          style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)', border: 'none', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#dc2626', boxShadow: 'var(--shadow-sm)' }}
                          aria-label="Remove selected image"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, color: 'var(--success)', fontSize: '0.875rem', fontWeight: 600 }}>
                        <CheckCircle2 size={16} aria-hidden="true" />
                        Image selected - ready for analysis
                      </div>
                    </motion.div>
                  ) : (
                    /* â”€â”€ Idle / Drag-over dropzone â”€â”€ */
                    <motion.div
                      key="dropzone"
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      style={{ marginBottom: 20 }}
                    >
                      <motion.div
                        animate={{ scale: isDragging ? 1.02 : 1 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
                        aria-label="Upload fundus image â€” click or drag and drop"
                        style={{
                          width: '100%', aspectRatio: '16/9', maxHeight: 360,
                          borderRadius: 'var(--radius-lg)',
                          border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
                          background: isDragging ? 'var(--primary-light)' : 'var(--surface-muted)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          gap: 12, cursor: 'pointer',
                          transition: 'border-color 0.2s ease, background 0.2s ease',
                          padding: 24,
                        }}
                      >
                        <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-md)', background: isDragging ? 'rgba(2,132,199,0.15)' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                          <Upload size={24} style={{ color: isDragging ? 'var(--primary)' : 'var(--text-tertiary)' }} aria-hidden="true" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <p style={{ fontWeight: 700, color: isDragging ? 'var(--primary)' : 'var(--text-main)', fontSize: '0.9375rem', marginBottom: 4 }}>
                            {isDragging ? 'Drop to upload' : t('uploadImage', 'Click to upload or drag & drop')}
                          </p>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', margin: 0 }}>
                            JPEG or PNG · Max 15 MB
                          </p>
                        </div>
                      </motion.div>

                      {/* Error state */}
                      <AnimatePresence>
                        {uploadError && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                            style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}
                            role="alert"
                          >
                            <AlertCircle size={16} aria-hidden="true" />
                            {uploadError}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Capture button (visually separated) ── */}
                {!selectedImage && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} aria-hidden="true" />
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>or</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} aria-hidden="true" />
                  </div>
                )}
                {!selectedImage && (
                  <button type="button" className="btn btn-secondary" style={{ width: '100%', marginBottom: 28 }} onClick={startCamera}>
                    <Video size={18} aria-hidden="true" />
                    <span>{t('captureImage', 'Capture with Camera')}</span>
                  </button>
                )}

                {cameraError && (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '10px 14px', color: '#92400e', fontSize: '0.875rem', fontWeight: 500, marginBottom: 16 }} role="alert">
                    <AlertCircle size={16} aria-hidden="true" />
                    {cameraError}
                  </div>
                )}
              </>
            )}

            {/* ── Footer Navigation ── */}
            <div style={{ display: 'flex', gap: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 20 }}>
              <button type="button" className="btn btn-secondary" onClick={onBack} style={{ flex: '0 0 auto', minWidth: 100 }}>
                <ArrowLeft size={16} aria-hidden="true" />
                <span>{t('back', 'Back')}</span>
              </button>
              <motion.button
                type="button"
                className="btn btn-primary"
                onClick={handleProceed}
                whileTap={{ scale: 0.97 }}
                disabled={!selectedImage || isCameraActive}
                style={{ flex: 1 }}
                title={!selectedImage ? 'Upload or select an image to continue.' : undefined}
              >
                <span>{t('proceedToAnalysis', 'Proceed to AI Analysis')}</span>
                <ArrowRight size={16} aria-hidden="true" />
              </motion.button>
            </div>

            {/* Disabled helper */}
            <AnimatePresence>
              {!selectedImage && (
                <motion.p
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ textAlign: 'center', fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 10 }}
                >
                  ↑ Upload or select an image to continue
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
