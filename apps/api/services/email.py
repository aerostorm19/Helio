import logging
from datetime import datetime

import resend

from config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(self):
        if settings.resend_api_key:
            resend.api_key = settings.resend_api_key

    async def send_booking_confirmation(
        self, business: dict, appointment: dict
    ) -> bool:
        if not appointment.get("customer_email"):
            return False
        if not settings.resend_api_key:
            return False

        appt_dt = datetime.fromisoformat(
            appointment["scheduled_at"].replace("Z", "+00:00")
        )

        html = f"""
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
          <h2 style="color: #111; margin-bottom: 4px;">Appointment Confirmed</h2>
          <p style="color: #666; font-size: 14px; margin-top: 0;">{business['name']}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <table style="width: 100%; font-size: 15px;">
            <tr><td style="color: #888; padding-bottom: 8px;">Date</td>
                <td style="font-weight: 600;">{appt_dt.strftime('%A, %B %d, %Y')}</td></tr>
            <tr><td style="color: #888; padding-bottom: 8px;">Time</td>
                <td style="font-weight: 600;">{appt_dt.strftime('%I:%M %p')}</td></tr>
            <tr><td style="color: #888; padding-bottom: 8px;">Service</td>
                <td style="font-weight: 600;">{appointment['service']}</td></tr>
            <tr><td style="color: #888; padding-bottom: 8px;">Location</td>
                <td>{business.get('address', 'Contact business for address')}</td></tr>
          </table>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="font-size: 13px; color: #999;">
            Booked via Helio — AI Receptionist · To reschedule, call {business.get('phone', '')}
          </p>
        </div>
        """

        try:
            resend.Emails.send(
                {
                    "from": f"{business['name']} via Helio <{settings.resend_from_email}>",
                    "to": appointment["customer_email"],
                    "subject": f"Appointment confirmed — {appt_dt.strftime('%a %b %d at %I:%M %p')}",
                    "html": html,
                }
            )
            return True
        except Exception:
            logger.exception("Resend email failed")
            return False


email_service = EmailService()
