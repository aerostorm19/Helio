import logging

from services.email import email_service
from services.whatsapp import whatsapp_service

logger = logging.getLogger(__name__)


class NotificationService:
    """Operator-facing alerts: escalations, missed calls, errors."""

    async def send_escalation_alert(self, business: dict, session) -> None:
        if not business.get("escalation_alerts", True):
            return
        owner_phone = business.get("phone") or business.get("escalation_phone")
        owner_email = business.get("email")
        caller = getattr(session, "collected_data", {}) or {}
        snippet = "\n".join(
            f"{m.role}: {m.content[:80]}" for m in getattr(session, "messages", [])[-4:]
        )
        text = (
            f"🚨 Helio escalation — {business['name']}\n"
            f"Call ID: {getattr(session, 'call_id', 'unknown')}\n\n"
            f"Recent transcript:\n{snippet}"
        )

        if owner_phone and business.get("meta_phone_number_id"):
            try:
                await whatsapp_service.send_booking_confirmation(
                    business,
                    {
                        "customer_phone": owner_phone,
                        "service": "ESCALATION",
                        "scheduled_at": "1970-01-01T00:00:00+00:00",
                    },
                )
            except Exception:
                logger.exception("Escalation WA alert failed")

        if owner_email:
            try:
                from config import settings
                import resend

                if settings.resend_api_key:
                    resend.Emails.send(
                        {
                            "from": f"Helio <{settings.resend_from_email}>",
                            "to": owner_email,
                            "subject": f"🚨 Call escalation — {business['name']}",
                            "html": f"<pre>{text}</pre>",
                        }
                    )
            except Exception:
                logger.exception("Escalation email alert failed")


notification_service = NotificationService()
