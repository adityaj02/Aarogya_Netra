import React, { useState, useRef, useEffect } from 'react';
import { Volume2, Loader2, Play, Square, AlertCircle } from 'lucide-react';

export default function TTSPlayer({ reportId, disabled }) {
  const [language, setLanguage] = useState('hi');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [error, setError] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef(null);

  // If report ID changes or language changes, we need to fetch the new audio URL
  const fetchAudio = async () => {
    if (!reportId) return;
    setLoading(true);
    setError(null);
    setAudioUrl(null);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId, language }),
      });
      const data = await response.json();
      if (data.audio_url) {
        setAudioUrl(data.audio_url);
      } else {
        throw new Error('No audio URL returned');
      }
    } catch (err) {
      setError('Could not generate speech.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.play().catch(e => console.log('Autoplay prevented:', e));
      setIsPlaying(true);
    }
  }, [audioUrl]);

  const handlePlayClick = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      fetchAudio();
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div className="clean-card" style={{ marginBottom: 0, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Volume2 size={18} style={{ color: 'var(--primary)' }} />
          Listen to Result
        </h3>
        
        <select 
          value={language} 
          onChange={(e) => {
            setLanguage(e.target.value);
            setAudioUrl(null); // Reset on language change so we fetch fresh
            setIsPlaying(false);
          }}
          disabled={disabled || loading}
          style={{ 
            padding: '4px 8px', 
            borderRadius: 6, 
            border: '1px solid var(--border-subtle)',
            fontSize: '0.8rem',
            background: 'var(--surface)'
          }}
        >
          <option value="en">English</option>
          <option value="hi">हिन्दी (Hindi)</option>
          <option value="bn">বাংলা (Bengali)</option>
          <option value="gu">ગુજરાતી (Gujarati)</option>
          <option value="kn">ಕನ್ನಡ (Kannada)</option>
          <option value="ml">മലയാളം (Malayalam)</option>
          <option value="mr">मराठी (Marathi)</option>
          <option value="or">ଓଡ଼ିଆ (Odia)</option>
          <option value="raj">राजस्थानी (Rajasthani)</option>
          <option value="ta">தமிழ் (Tamil)</option>
          <option value="te">తెలుగు (Telugu)</option>
          <option value="as">অসমীয়া (Assamese)</option>
          <option value="brx">बड़ो (Bodo)</option>
          <option value="mni">মৈতৈ (Manipuri)</option>
        </select>
      </div>

      {error && (
        <div style={{ color: '#dc2626', fontSize: '0.8rem', display: 'flex', gap: 4, alignItems: 'center', marginBottom: 8 }}>
          <AlertCircle size={14} /> {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button 
          onClick={handlePlayClick}
          disabled={disabled || loading}
          className="btn btn-primary"
          style={{ flex: 1, padding: '8px 12px', justifyContent: 'center' }}
        >
          {loading ? <Loader2 size={16} className="spinner" /> : (isPlaying ? <Square size={16} /> : <Play size={16} />)}
          {loading ? 'Generating...' : (isPlaying ? 'Restart' : 'Play Result')}
        </button>
        
        {isPlaying && (
          <button 
            onClick={handleStop}
            className="btn btn-secondary"
            style={{ padding: '8px 12px' }}
          >
            <Square size={16} /> Stop
          </button>
        )}
      </div>

      {/* Hidden native audio element */}
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          style={{ display: 'none' }} 
        />
      )}
    </div>
  );
}
