import logging
import os
from datetime import datetime, timedelta

import pytz
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

logger = logging.getLogger(__name__)


def _get_hours_for_day(working_hours: list[dict], day_name: str) -> dict | None:
    for h in working_hours or []:
        if h.get("day", "").lower() == day_name:
            return h
    return None


def _service_duration(services: list[dict], name: str) -> int:
    for s in services or []:
        if s["name"].lower() == name.lower():
            return s.get("duration_minutes", 30)
    return 30


def _overlaps(slot_start: datetime, slot_end: datetime, busy: list[dict]) -> bool:
    for b in busy or []:
        bs = datetime.fromisoformat(b["start"].replace("Z", "+00:00"))
        be = datetime.fromisoformat(b["end"].replace("Z", "+00:00"))
        if slot_start < be and slot_end > bs:
            return True
    return False


class CalendarService:
    def _credentials(self, business: dict) -> Credentials:
        return Credentials(
            token=business.get("google_calendar_access_token"),
            refresh_token=business.get("google_calendar_refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
        )

    def _service(self, business: dict):
        creds = self._credentials(business)
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
        return build("calendar", "v3", credentials=creds, cache_discovery=False)

    async def get_available_slots(
        self, business: dict, date: datetime, service_name: str
    ) -> list[str]:
        tz = pytz.timezone(business.get("timezone", "Asia/Kolkata"))
        day_name = date.strftime("%A").lower()
        hours = _get_hours_for_day(business.get("working_hours", []), day_name)
        if not hours or hours.get("closed"):
            return []

        open_t = datetime.strptime(hours["open"], "%H:%M").time()
        close_t = datetime.strptime(hours["close"], "%H:%M").time()
        duration = _service_duration(business.get("services", []), service_name)

        day_start = tz.localize(datetime.combine(date.date(), open_t))
        day_end = tz.localize(datetime.combine(date.date(), close_t))

        candidates: list[datetime] = []
        current = day_start
        while current + timedelta(minutes=duration) <= day_end:
            candidates.append(current)
            current += timedelta(minutes=30)

        cal_id = business.get("google_calendar_id")
        busy: list[dict] = []
        if cal_id and business.get("google_calendar_access_token"):
            try:
                svc = self._service(business)
                fb = svc.freebusy().query(
                    body={
                        "timeMin": day_start.isoformat(),
                        "timeMax": day_end.isoformat(),
                        "items": [{"id": cal_id}],
                    }
                ).execute()
                busy = fb["calendars"][cal_id].get("busy", [])
            except Exception:
                logger.exception("Freebusy query failed")

        available = []
        for slot in candidates:
            slot_end = slot + timedelta(minutes=duration)
            if not _overlaps(slot, slot_end, busy):
                available.append(slot.strftime("%I:%M %p"))
        return available

    async def create_event(self, business: dict, appointment: dict) -> str | None:
        cal_id = business.get("google_calendar_id")
        if not cal_id or not business.get("google_calendar_access_token"):
            return None

        try:
            tz_name = business.get("timezone", "Asia/Kolkata")
            start_dt = datetime.fromisoformat(
                appointment["scheduled_at"].replace("Z", "+00:00")
            )
            end_dt = start_dt + timedelta(
                minutes=appointment.get("duration_minutes", 30)
            )
            event = {
                "summary": f"{appointment['service']} — {appointment['customer_name']}",
                "description": (
                    "Booked via Helio AI Receptionist\n"
                    f"Customer: {appointment['customer_name']}\n"
                    f"Phone: {appointment.get('customer_phone', '')}\n"
                    f"Service: {appointment['service']}"
                ),
                "start": {"dateTime": start_dt.isoformat(), "timeZone": tz_name},
                "end":   {"dateTime": end_dt.isoformat(),   "timeZone": tz_name},
            }
            svc = self._service(business)
            res = svc.events().insert(calendarId=cal_id, body=event).execute()
            return res.get("id")
        except Exception:
            logger.exception("Calendar event create failed")
            return None


calendar_service = CalendarService()
