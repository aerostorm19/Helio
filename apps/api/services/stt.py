import logging

from groq import Groq

from config import settings
from models.schemas import TranscriptionResult

logger = logging.getLogger(__name__)


class STTService:
    """Groq Whisper transcription. Used for the browser widget WebRTC path —
    Twilio phone calls use Twilio's built-in <Gather> STT."""

    def __init__(self):
        self._client: Groq | None = None

    @property
    def client(self) -> Groq:
        if self._client is None:
            if not settings.groq_api_key:
                raise RuntimeError("GROQ_API_KEY not configured")
            self._client = Groq(api_key=settings.groq_api_key)
        return self._client

    async def transcribe(
        self, audio_data: bytes, language: str = "en"
    ) -> TranscriptionResult:
        try:
            transcription = self.client.audio.transcriptions.create(
                file=("audio.wav", audio_data, "audio/wav"),
                model="whisper-large-v3-turbo",
                language=language,
                response_format="verbose_json",
                temperature=0.0,
            )
            confidence = 0.5
            segments = getattr(transcription, "segments", None) or []
            if segments:
                first = segments[0]
                avg = getattr(first, "avg_logprob", None)
                if avg is not None:
                    # avg_logprob ranges roughly [-1, 0]; map to [0, 1].
                    confidence = max(0.0, min(1.0, 1.0 + avg))
            return TranscriptionResult(
                text=transcription.text,
                confidence=confidence,
                language=getattr(transcription, "language", language),
            )
        except Exception:
            logger.exception("Groq transcription failed")
            return TranscriptionResult(text="", confidence=0.0, language=language)


stt_service = STTService()
