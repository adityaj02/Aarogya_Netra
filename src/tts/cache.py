import hashlib
import os

# Increment this if the TTS model or generation logic changes fundamentally
TTS_MODEL_VERSION = "v1"
AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "backend_generated", "audio")

def get_cache_key(text: str, language: str) -> str:
    """Generates a stable SHA256 cache key for the audio file."""
    normalized = text.strip()
    raw = f"{normalized}|{language}|{TTS_MODEL_VERSION}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def get_cached_audio_path(text: str, language: str, ext: str = "wav") -> str:
    """Returns the absolute path to the cached audio file if it exists, else None."""
    key = get_cache_key(text, language)
    filename = f"{key}_{language}_{TTS_MODEL_VERSION}.{ext}"
    filepath = os.path.join(AUDIO_DIR, filename)
    
    if os.path.exists(filepath):
        return filepath
    return None

def get_audio_filepath_for_generation(text: str, language: str, ext: str = "wav") -> str:
    """Returns the absolute path where the new audio file should be saved."""
    os.makedirs(AUDIO_DIR, exist_ok=True)
    key = get_cache_key(text, language)
    filename = f"{key}_{language}_{TTS_MODEL_VERSION}.{ext}"
    return os.path.join(AUDIO_DIR, filename)

def get_audio_url_from_path(filepath: str) -> str:
    """Converts the absolute filepath to a URL path for the frontend."""
    filename = os.path.basename(filepath)
    return f"/audio/{filename}"
