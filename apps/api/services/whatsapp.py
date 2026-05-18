import logging
import re
from datetime import datetime

import httpx

from config import settings

logger = logging.getLogger(__name__)


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    return digits


class WhatsAppService:
    BASE_URL = "https://graph.facebook.com/v19.0"

    async def send_booking_confirmation(
        self, business: dict, appointment: dict
    ) -> bool:
        if not business.get("meta_phone_number_id"):
            return False
        if not appointment.get("customer_phone"):
            return False
        if not settings.meta_whatsapp_token:
            return False

        appt_dt = datetime.fromisoformat(
            appointment["scheduled_at"].replace("Z", "+00:00")
        )
        formatted_date = appt_dt.strftime("%A, %B %d")
        formatted_time = appt_dt.strftime("%I:%M %p")

        body = (
            f"✅ Appointment Confirmed!\n\n"
            f"*{business['name']}*\n"
            f"📅 {formatted_date} at {formatted_time}\n"
            f"💇 {appointment['service']}\n\n"
            f"📍 {business.get('address', '')}\n\n"
            f"To reschedule or cancel, reply to this message or call us."
        )

        payload = {
            "messaging_product": "whatsapp",
            "to": normalize_phone(appointment["customer_phone"]),
            "type": "text",
            "text": {"body": body},
        }

        url = f"{self.BASE_URL}/{business['meta_phone_number_id']}/messages"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(
                    url,
                    headers={
                        "Authorization": f"Bearer {settings.meta_whatsapp_token}"
                    },
                    json=payload,
                )
            if resp.status_code >= 400:
                logger.warning("WhatsApp send failed: %s %s", resp.status_code, resp.text)
                return False
            return True
        except Exception:
            logger.exception("WhatsApp send error")
            return False


whatsapp_service = WhatsAppService()
