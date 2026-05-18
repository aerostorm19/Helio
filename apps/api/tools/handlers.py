import asyncio
import logging
from datetime import datetime, timedelta
from typing import Any

import dateparser
import pytz

from models.database import get_supabase

logger = logging.getLogger(__name__)


def _parse_date(description: str, tz_name: str) -> datetime:
    tz = pytz.timezone(tz_name)
    parsed = dateparser.parse(
        description,
        settings={
            "TIMEZONE": tz_name,
            "RETURN_AS_TIMEZONE_AWARE": True,
            "PREFER_DATES_FROM": "future",
        },
    )
    if not parsed:
        raise ValueError(f"Could not parse date: {description}")
    if parsed.tzinfo is None:
        parsed = tz.localize(parsed)
    return parsed


class ToolHandlers:
    """Execute Gemini tool calls. Each handler must NEVER raise — return error dict instead."""

    async def execute(self, tool_calls: list, session) -> list[dict]:
        results = []
        for call in tool_calls:
            name = getattr(call, "name", None) or call.get("name")
            args = dict(getattr(call, "args", None) or call.get("args", {}))
            try:
                if name == "check_availability":
                    result = await self._check_availability(args, session)
                elif name == "book_appointment":
                    result = await self._book_appointment(args, session)
                elif name == "escalate_to_human":
                    result = await self._escalate(args, session)
                else:
                    result = {"error": f"Unknown tool: {name}"}
            except Exception as e:
                logger.exception("Tool execution failed: %s", name)
                result = {"error": str(e), "fallback": "escalate"}
            results.append({"tool": name, "result": result})
        return results

    async def _check_availability(self, args: dict, session) -> dict:
        from services.calendar import calendar_service

        business = session.business
        try:
            date = _parse_date(
                args["date_description"], business.get("timezone", "Asia/Kolkata")
            )
        except ValueError as e:
            return {"error": str(e), "fallback": "ask_again"}

        service_name = args.get("service_name", "appointment")
        try:
            slots = await calendar_service.get_available_slots(
                business, date, service_name
            )
        except Exception as e:
            logger.exception("Calendar lookup failed")
            return {"error": "Calendar unavailable", "fallback": "offer_callback"}

        if not slots:
            return {"available": False, "message": "No slots available on that date."}
        return {"available": True, "date": date.strftime("%Y-%m-%d"), "slots": slots[:5]}

    async def _book_appointment(self, args: dict, session) -> dict:
        from services.calendar import calendar_service
        from services.confirmations import confirmation_service

        business = session.business
        tz = pytz.timezone(business.get("timezone", "Asia/Kolkata"))

        try:
            scheduled_at = tz.localize(
                datetime.fromisoformat(f"{args['date_str']}T{args['time_str']}")
            )
        except Exception as e:
            return {"error": f"Invalid date/time: {e}"}

        sb = get_supabase()
        duration = 30
        for s in business.get("services", []) or []:
            if s["name"].lower() == args["service"].lower():
                duration = s.get("duration_minutes", 30)
                break

        appt_data = {
            "business_id": business["id"],
            "call_id": session.call_id,
            "customer_name": args["customer_name"],
            "customer_phone": args.get("customer_phone"),
            "service": args["service"],
            "scheduled_at": scheduled_at.isoformat(),
            "duration_minutes": duration,
            "notes": args.get("notes"),
            "status": "confirmed",
        }
        res = sb.table("appointments").insert(appt_data).execute()
        appt = res.data[0] if res.data else None
        if not appt:
            return {"error": "Could not save appointment", "fallback": "escalate"}

        try:
            event_id = await calendar_service.create_event(business, appt)
            if event_id:
                sb.table("appointments").update(
                    {"google_calendar_event_id": event_id}
                ).eq("id", appt["id"]).execute()
        except Exception:
            logger.exception("Google Calendar event create failed")

        # Send confirmation asynchronously — never block the call.
        asyncio.create_task(confirmation_service.send(business, appt))

        # Flag the call as a booking outcome.
        sb.table("calls").update(
            {"had_booking": True, "outcome": "booked", "outcome_detail": f"booked:{appt['id']}"}
        ).eq("id", session.call_id).execute()

        return {
            "success": True,
            "appointment_id": appt["id"],
            "confirmation": f"{args['date_str']} at {args['time_str']}",
        }

    async def _escalate(self, args: dict, session) -> dict:
        from services.notifications import notification_service

        sb = get_supabase()
        sb.table("calls").update(
            {
                "was_escalated": True,
                "outcome": "escalated",
                "outcome_detail": args.get("reason", ""),
            }
        ).eq("id", session.call_id).execute()

        asyncio.create_task(
            notification_service.send_escalation_alert(session.business, session)
        )

        return {
            "escalate_to": session.business.get("escalation_phone"),
            "reason": args.get("reason", "Caller requested human"),
        }


tool_handlers = ToolHandlers()
