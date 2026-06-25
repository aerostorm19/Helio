import asyncio
import logging
from datetime import datetime, timedelta

import dateparser
import pytz
from fastapi import APIRouter, BackgroundTasks, HTTPException

from models.database import get_business_by_id, get_supabase
from models.schemas import AppointmentCreate, AvailabilityQuery
from services.calendar import calendar_service
from services.confirmations import confirmation_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/availability")
async def availability(q: AvailabilityQuery):
    business = await get_business_by_id(q.business_id)
    if not business:
        raise HTTPException(404, "Business not found")
    tz = pytz.timezone(business.get("timezone", "Asia/Kolkata"))
    parsed = dateparser.parse(
        q.date_description,
        settings={"TIMEZONE": str(tz), "RETURN_AS_TIMEZONE_AWARE": True, "PREFER_DATES_FROM": "future"},
    )
    if not parsed:
        raise HTTPException(400, "Could not parse date")
    slots = await calendar_service.get_available_slots(business, parsed, q.service_name or "appointment")
    return {"date": parsed.strftime("%Y-%m-%d"), "slots": slots}


@router.post("/create")
async def create(appt: AppointmentCreate, background_tasks: BackgroundTasks):
    business = await get_business_by_id(appt.business_id)
    if not business:
        raise HTTPException(404, "Business not found")
    sb = get_supabase()
    data = appt.model_dump()
    data["scheduled_at"] = appt.scheduled_at.isoformat()
    res = sb.table("appointments").insert(data).execute()
    if not res.data:
        raise HTTPException(500, "Create failed")
    created = res.data[0]

    try:
        event_id = await calendar_service.create_event(business, created)
        if event_id:
            sb.table("appointments").update({"google_calendar_event_id": event_id}).eq(
                "id", created["id"]
            ).execute()
    except Exception:
        logger.exception("Calendar insert failed")

    background_tasks.add_task(confirmation_service.send, business, created)
    return created


@router.put("/{appt_id}/confirm")
async def confirm(appt_id: str):
    sb = get_supabase()
    sb.table("appointments").update({"status": "confirmed"}).eq("id", appt_id).execute()
    return {"ok": True}


@router.put("/{appt_id}/cancel")
async def cancel(appt_id: str):
    sb = get_supabase()
    try:
        res = sb.table("appointments").select("google_calendar_event_id, business_id").eq("id", appt_id).single().execute()
        if res.data:
            event_id = res.data.get("google_calendar_event_id")
            biz_id = res.data.get("business_id")
            if event_id and biz_id:
                business = await get_business_by_id(biz_id)
                if business:
                    await calendar_service.delete_event(business, event_id)
    except Exception:
        logger.exception("Failed to delete event from Google Calendar during cancellation")

    sb.table("appointments").update({"status": "cancelled"}).eq("id", appt_id).execute()
    return {"ok": True}


@router.put("/{appt_id}/reschedule")
async def reschedule(appt_id: str, new_time: datetime):
    sb = get_supabase()
    sb.table("appointments").update(
        {"scheduled_at": new_time.isoformat(), "status": "confirmed"}
    ).eq("id", appt_id).execute()
    return {"ok": True}


@router.get("/upcoming/{business_id}")
async def upcoming(business_id: str, days: int = 14):
    sb = get_supabase()
    now = datetime.utcnow()
    until = now + timedelta(days=days)
    res = (
        sb.table("appointments")
        .select("*")
        .eq("business_id", business_id)
        .gte("scheduled_at", now.isoformat())
        .lte("scheduled_at", until.isoformat())
        .neq("status", "cancelled")
        .order("scheduled_at")
        .execute()
    )
    return res.data or []
