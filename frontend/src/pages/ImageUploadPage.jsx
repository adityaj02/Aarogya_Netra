import React, { useState, useRef } from 'react';
import { Camera, Upload, Trash2, ArrowLeft, ArrowRight, CheckCircle2, Video, AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { getSampleFundusImages } from '../utils/sampleImages';
import Stepper from '../components/Stepper';

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
    <div className="w-full max-w-[1024px] mx-auto px-4 pb-12">
      <Stepper currentStep={2} />
      <div className="clean-card w-full p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          
          {/* Left Column: Dropzone / Preview / Camera */}
          <div className="flex flex-col items-center justify-start w-full max-w-[500px] mx-auto">
            {/* Live Camera View */}
            {isCameraActive ? (
              <div className="w-full">
                <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-900 border border-slate-200">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex gap-3 mt-4">
                  <button type="button" className="btn btn-secondary flex-1" onClick={stopCamera}>
                    {t('cancelCamera')}
                  </button>
                  <button type="button" className="btn btn-primary flex-2" onClick={capturePhoto} style={{ flex: 2 }}>
                    <Camera size={20} />
                    <span>{t('takePhoto')}</span>
                  </button>
                </div>
              </div>
            ) : selectedImage ? (
              /* Selected Image Preview */
              <div className="w-full">
                <div className="w-full aspect-square relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm">
                  <img src={selectedImage} alt="Fundus Retinal Preview" className="w-full h-full object-cover" />
                  {selectedSampleMeta && (
                    <div className="absolute top-3 left-3 bg-slate-900/85 text-white px-3 py-1 rounded-[var(--radius-sm)] text-[13px] font-semibold backdrop-blur-sm shadow-sm">
                      {t(selectedSampleMeta.titleKey)}
                    </div>
                  )}
                </div>
                <div className="flex justify-center mt-4">
                  <button
                    type="button"
                    className="btn btn-secondary w-full max-w-[200px]"
                    onClick={() => {
                      setSelectedImage(null);
                      setSelectedSampleMeta(null);
                    }}
                  >
                    <Trash2 size={16} />
                    <span>{t('removeImage')}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Upload / Capture options */
              <div className="w-full">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png"
                  style={{ display: 'none' }}
                />

                <div
                  className={`w-full aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all ${
                    isDragging ? 'border-sky-500 bg-sky-50' : 'border-[var(--border-default)] bg-[var(--surface-muted)] hover:border-sky-300 hover:bg-slate-50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={42} className="text-sky-500 mb-4" />
                  <div className="text-[1.1rem] font-semibold text-[var(--text-main)] mb-2">
                    {t('uploadImage')}
                  </div>
                  <p className="text-[0.9rem] text-[var(--text-muted)] mb-3">
                    {t('dragDropText')}
                  </p>
                  <span className="text-[0.75rem] text-[var(--text-muted)] bg-slate-200/50 px-3 py-1 rounded-full">
                    {t('supportedFormats')}
                  </span>
                </div>

                <div className="mt-4">
                  <button type="button" className="btn btn-secondary w-full" onClick={startCamera}>
                    <Video size={18} className="mr-2" />
                    <span>{t('captureImage')}</span>
                  </button>
                </div>

                {cameraError && (
                  <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center justify-center gap-2">
                    <AlertCircle size={16} />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Instructions, Samples, Actions */}
          <div className="flex flex-col justify-between h-full">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{t('uploadTitle')}</h2>
              <p className="text-[15px] text-slate-500 mb-8">
                {t('uploadInstruction')}
              </p>

              {/* Sample Selector */}
              <div className="mb-8">
                <div className="text-[14px] font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <span className="w-6 h-[1px] bg-slate-300"></span>
                  {t('selectSampleImage')}
                  <span className="flex-1 h-[1px] bg-slate-300"></span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

                  {Object.entries(samples).map(([key, sample]) => {
                    const isSelected = selectedSampleMeta?.titleKey === sample.titleKey;
                    return (
                      <div
                        key={key}
                        onClick={() => selectSample(key)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && selectSample(key)}
                        className={`group cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 bg-[var(--surface-muted)] relative ${
                          isSelected 
                            ? 'border-sky-500 shadow-sm opacity-100' 
                            : 'border-transparent opacity-70 hover:opacity-100 hover:border-slate-300'
                        }`}
                        style={{ paddingBottom: '32px' }}
                      >
                        <img 
                          src={sample.dataUrl} 
                          alt={sample.titleKey} 
                          className="w-full aspect-[4/3] object-cover" 
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-1.5 text-center bg-white text-[11px] font-semibold text-slate-600 truncate border-t border-slate-100">
                          {t(sample.titleKey)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="flex gap-4 pt-6 border-t border-slate-200 mt-auto">
              <button
                type="button"
                className="btn btn-secondary flex-1"
                onClick={onBack}
              >
                <ArrowLeft size={18} className="mr-2" />
                <span>{t('back')}</span>
              </button>

              <button
                type="button"
                className="btn btn-primary flex-2 shadow-md transition-transform active:translate-y-[1px]"
                disabled={!selectedImage || isCameraActive}
                onClick={handleProceed}
                style={{ flex: 2 }}
              >
                <span>{t('proceedToAnalysis')}</span>
                <ArrowRight size={18} className="ml-2" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  );
}
