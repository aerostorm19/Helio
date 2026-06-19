import logging
from datetime import datetime

from models.database import get_supabase
from services.email import email_service
from services.whatsapp import whatsapp_service

logger = logging.getLogger(__name__)


class ConfirmationService:
    """Try WhatsApp first, fall back to email. Never raise."""

    async def send(self, business: dict, appointment: dict) -> bool:
        # Try WhatsApp first
        if business.get("whatsapp_confirmations") and business.get("meta_phone_number_id"):
            try:
                success = await whatsapp_service.send_booking_confirmation(business, appointment)
                if success:
                    await self._log_confirmation(appointment["id"], "whatsapp")
                    return True
            except Exception as e:
                logger.warning(f"WhatsApp confirmation failed: {e}")

        # Fallback to email
        if business.get("email_confirmations") and appointment.get("customer_email"):
            try:
                success = await email_service.send_booking_confirmation(business, appointment)
                if success:
                    await self._log_confirmation(appointment["id"], "email")
                    return True
            except Exception as e:
                logger.warning(f"Email confirmation failed: {e}")

        return False  # Both failed — log but don't raise

    async def _log_confirmation(self, appointment_id: str, channel: str):
        try:
            sb = get_supabase()
            sb.table("appointments").update(
                {
                    "confirmation_sent_at": datetime.utcnow().isoformat(),
                    "confirmation_channel": channel,
                }
            ).eq("id", appointment_id).execute()
        except Exception:
            logger.exception("Failed to record confirmation channel")


confirmation_service = ConfirmationService()
