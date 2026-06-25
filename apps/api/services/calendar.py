import asyncio
import logging
import os
from datetime import datetime, timedelta

import pytz
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from models.database import get_supabase

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


def is_overlapping(slot_start: datetime, slot_end: datetime, busy_periods: list) -> bool:
    for period in busy_periods:
        busy_start = datetime.fromisoformat(period["start"].replace("Z", "+00:00"))
        busy_end = datetime.fromisoformat(period["end"].replace("Z", "+00:00"))
        if slot_start < busy_end and slot_end > busy_start:
            return True
    return False


class CalendarService:
    def _credentials(self, business: dict) -> Credentials:
        creds = Credentials(
            token=business.get("google_calendar_access_token"),
            refresh_token=business.get("google_calendar_refresh_token"),
            token_uri="https://oauth2.googleapis.com/token",
            client_id=os.getenv("GOOGLE_OAUTH_CLIENT_ID"),
            client_secret=os.getenv("GOOGLE_OAUTH_CLIENT_SECRET"),
        )
        # Save to DB whenever token auto-refreshes
        original_refresh = creds.refresh
        def refresh_and_save(request):
            original_refresh(request)
            asyncio.create_task(self._save_refreshed_token(business["id"], creds))
        creds.refresh = refresh_and_save
        return creds

    async def _save_refreshed_token(self, business_id: str, creds: Credentials):
        try:
            sb = get_supabase()
            sb.table("businesses").update({
                "google_calendar_access_token": creds.token,
                "google_calendar_token_expiry": creds.expiry.isoformat() if creds.expiry else None,
            }).eq("id", business_id).execute()
        except Exception:
            logger.exception("Failed to save refreshed token to database")

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
                fb = await asyncio.to_thread(
                    svc.freebusy().query(
                        body={
                            "timeMin": day_start.isoformat(),
                            "timeMax": day_end.isoformat(),
                            "items": [{"id": cal_id}],
                        }
                    ).execute
                )
                busy = fb["calendars"][cal_id].get("busy", [])
            except Exception:
                logger.exception("Freebusy query failed")

        # If no Google Calendar connected, use existing DB appointments as busy periods
        if not busy and not (cal_id and business.get("google_calendar_access_token")):
            try:
                from models.database import get_supabase
                sb = get_supabase()
                day_start_iso = day_start.isoformat()
                day_end_iso = day_end.isoformat()
                res = sb.table("appointments").select("scheduled_at,duration_minutes") \
                    .eq("business_id", business["id"]) \
                    .gte("scheduled_at", day_start_iso) \
                    .lte("scheduled_at", day_end_iso) \
                    .execute()
                for row in (res.data or []):
                    appt_start = datetime.fromisoformat(row["scheduled_at"].replace("Z", "+00:00"))
                    appt_end = appt_start + timedelta(minutes=row.get("duration_minutes", 30))
                    busy.append({"start": appt_start.isoformat(), "end": appt_end.isoformat()})
            except Exception:
                logger.exception("DB busy-slot lookup failed; proceeding with no conflicts")

        available = []
        for slot in candidates:
            slot_end = slot + timedelta(minutes=duration)
            if not is_overlapping(slot, slot_end, busy):
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
            res = await asyncio.to_thread(
                svc.events().insert(calendarId=cal_id, body=event).execute
            )
            return res.get("id")
        except Exception:
            logger.exception("Calendar event create failed")
            return None

    async def delete_event(self, business: dict, event_id: str) -> bool:
        cal_id = business.get("google_calendar_id")
        if not cal_id or not business.get("google_calendar_access_token"):
            return False
        try:
            svc = self._service(business)
            await asyncio.to_thread(
                svc.events().delete(calendarId=cal_id, eventId=event_id).execute
            )
            return True
        except Exception:
            logger.exception("Calendar event delete failed")
            return False


calendar_service = CalendarService()
