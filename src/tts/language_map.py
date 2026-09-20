# Language map for Indic-TTS models

# In a full deployment, this maps the ISO language code to the specific model paths
# downloaded from AI4Bharat's repository.
# For the demo/hackathon, we are isolating the pipeline for 'hi' (Hindi) and 'en' (English).

LANGUAGE_MAP = {
    "hi": {
        "fastpitch_model": "models/hi/fastpitch/best_model.pth",
        "fastpitch_config": "models/hi/fastpitch/config.json",
        "hifigan_model": "models/hi/hifigan/best_model.pth",
        "hifigan_config": "models/hi/hifigan/config.json",
    },
    "en": {
        "fastpitch_model": "models/en/fastpitch/best_model.pth",
        "fastpitch_config": "models/en/fastpitch/config.json",
        "hifigan_model": "models/en/hifigan/best_model.pth",
        "hifigan_config": "models/en/hifigan/config.json",
    }
}
