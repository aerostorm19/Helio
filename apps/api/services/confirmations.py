import logging
from datetime import datetime

from models.database import get_supabase
from services.email import email_service
from services.whatsapp import whatsapp_service

logger = logging.getLogger(__name__)


class ConfirmationService:
    """Try WhatsApp first, fall back to email. Never raise."""

    async def send(self, business: dict, appointment: dict) -> None:
        channel: str | None = None

        if business.get("whatsapp_confirmations", True):
            try:
                ok = await whatsapp_service.send_booking_confirmation(business, appointment)
                if ok:
                    channel = "whatsapp"
            except Exception:
                logger.exception("WhatsApp confirmation failed")

        if channel is None and business.get("email_confirmations", True):
            try:
                ok = await email_service.send_booking_confirmation(business, appointment)
                if ok:
                    channel = "email"
            except Exception:
                logger.exception("Email confirmation failed")

        if channel:
            try:
                sb = get_supabase()
                sb.table("appointments").update(
                    {
                        "confirmation_sent_at": datetime.utcnow().isoformat(),
                        "confirmation_channel": channel,
                    }
                ).eq("id", appointment["id"]).execute()
            except Exception:
                logger.exception("Failed to record confirmation channel")


confirmation_service = ConfirmationService()
