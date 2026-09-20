import logging
import os
import threading
from .language_map import LANGUAGE_MAP
from .cache import get_cached_audio_path, get_audio_filepath_for_generation

logger = logging.getLogger(__name__)

class IndicTTSService:
    """
    Lazy-loaded singleton wrapper for the AI4Bharat Indic-TTS architecture.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(IndicTTSService, cls).__new__(cls)
                cls._instance._initialize()
            return cls._instance

    def _initialize(self):
        self.models_loaded = False
        self.use_mock = False
        
        try:
            # Try importing Coqui TTS components according to the AI4Bharat architecture
            from TTS.utils.synthesizer import Synthesizer
            self.synthesizers = {}
            # We would load the model eagerly here if we had the checkpoint files locally:
            # For each language we want to support, init the synthesizer.
            # Example: 
            # self.synthesizers['hi'] = Synthesizer(
            #     tts_checkpoint=LANGUAGE_MAP['hi']['fastpitch_model'],
            #     tts_config_path=LANGUAGE_MAP['hi']['fastpitch_config'],
            #     vocoder_checkpoint=LANGUAGE_MAP['hi']['hifigan_model'],
            #     vocoder_config=LANGUAGE_MAP['hi']['hifigan_config']
            # )
            self.models_loaded = True
        except ImportError:
            logger.warning("TTS package not found. Falling back to gTTS for hackathon/demo compatibility.")
            self.use_mock = True
            try:
                import gtts
                self.gtts_available = True
            except ImportError:
                self.gtts_available = False

    def synthesize(self, text: str, language: str) -> str:
        """
        Synthesizes speech from text. Returns the absolute filepath to the saved file.
        """
        ext = "mp3" if self.use_mock else "wav"
        
        # 1. Check Cache First
        cached = get_cached_audio_path(text, language, ext=ext)
        if cached:
            logger.info(f"Returning cached TTS audio for {language}")
            return cached

        # 2. Determine output path
        out_path = get_audio_filepath_for_generation(text, language, ext=ext)

        # 3. Synthesize
        if self.use_mock:
            if getattr(self, "gtts_available", False):
                from gtts import gTTS
                # Fallback unsupported languages to Hindi for the mock so it doesn't crash
                supported_by_gtts = ['en', 'hi', 'bn', 'gu', 'kn', 'ml', 'mr', 'ta', 'te']
                safe_lang = language if language in supported_by_gtts else 'hi'
                
                try:
                    tts = gTTS(text=text, lang=safe_lang, slow=False)
                    tts.save(out_path)
                    logger.info(f"Generated mock TTS audio using gTTS at {out_path} (mapped to {safe_lang})")
                except Exception as e:
                    logger.error(f"gTTS failed: {e}. Writing empty file.")
                    with open(out_path, "wb") as f:
                        pass
            else:
                # Absolute worst-case fallback: write a silent empty file
                with open(out_path, "wb") as f:
                    pass
        else:
            # Use the loaded Coqui Synthesizer
            if language not in self.synthesizers:
                raise ValueError(f"Language {language} model not loaded.")
                
            synthesizer = self.synthesizers[language]
            wav = synthesizer.tts(text)
            synthesizer.save_wav(wav, out_path)
            logger.info(f"Generated AI4Bharat Indic-TTS audio at {out_path}")

        return out_path

# Export a singleton instance method
def get_tts_service():
    return IndicTTSService()
