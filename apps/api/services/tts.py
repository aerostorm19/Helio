import hashlib
import logging

from config import settings
from models.database import get_supabase

logger = logging.getLogger(__name__)

_CACHE_BUCKET = "tts-cache"


class TTSService:
    """Google Cloud TTS with content-hash caching to Supabase Storage.
    Returns a public URL that Twilio can <Play>."""

    def __init__(self):
        self._client = None
        self._voice = None
        self._audio_config = None

    def _lazy_init(self):
        if self._client is not None:
            return
        from google.cloud import texttospeech

        self._client = texttospeech.TextToSpeechClient()
        self._voice = texttospeech.VoiceSelectionParams(
            language_code="en-IN",
            name="en-IN-Wavenet-D",
        )
        self._audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=1.05,
            pitch=0.0,
        )

    async def synthesize(self, text: str, business_id: str | None = None) -> str:
        """Return a public URL of the MP3 for Twilio to fetch."""
        try:
            self._lazy_init()
        except Exception:
            logger.exception("TTS client init failed")
            return ""

        cache_key = hashlib.sha256(
            f"{text}|{self._voice.name}".encode()
        ).hexdigest()[:32]
        file_path = f"tts/{cache_key}.mp3"

        sb = get_supabase()

        # Check cache by trying public URL first (cheap).
        try:
            existing = sb.storage.from_(_CACHE_BUCKET).get_public_url(file_path)
            # If file does not exist, get_public_url still returns a URL string —
            # so we attempt a HEAD via list to confirm.
            files = sb.storage.from_(_CACHE_BUCKET).list("tts")
            if any(f.get("name") == f"{cache_key}.mp3" for f in (files or [])):
                return existing
        except Exception:
            logger.debug("TTS cache lookup failed; will synthesize fresh")

        # Synthesize.
        try:
            from google.cloud import texttospeech

            input_text = texttospeech.SynthesisInput(text=text)
            response = self._client.synthesize_speech(
                input=input_text,
                voice=self._voice,
                audio_config=self._audio_config,
            )
            audio_bytes = response.audio_content
        except Exception:
            logger.exception("TTS synthesis failed")
            return ""

        try:
            sb.storage.from_(_CACHE_BUCKET).upload(
                path=file_path,
                file=audio_bytes,
                file_options={"content-type": "audio/mpeg", "upsert": "true"},
            )
        except Exception:
            logger.exception("TTS upload failed")
            return ""

        return sb.storage.from_(_CACHE_BUCKET).get_public_url(file_path)

    async def synthesize_raw(
        self, text: str, business_id: str | None = None
    ) -> bytes:
        """Return raw MP3 bytes (used by the browser widget WebSocket)."""
        try:
            self._lazy_init()
            from google.cloud import texttospeech

            input_text = texttospeech.SynthesisInput(text=text)
            response = self._client.synthesize_speech(
                input=input_text,
                voice=self._voice,
                audio_config=self._audio_config,
            )
            return response.audio_content
        except Exception:
            logger.exception("TTS raw synthesis failed")
            return b""


tts_service = TTSService()
