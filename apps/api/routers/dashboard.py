from datetime import datetime, timedelta

from fastapi import APIRouter, Query

from models.database import get_supabase

router = APIRouter()

_DEMO_OVERVIEW = {
    "calls_this_month": 142,
    "bookings": 38,
    "conversion_pct": 26.8,
    "escalations": 4,
    "avg_call_seconds": 97,
    "revenue_recovered": 52300,
    "total_minutes": 229.5,
    "answered_after_hours": 21,
}

_DEMO_WEEK = [
    {"date": (datetime.utcnow() - timedelta(days=i)).strftime("%Y-%m-%d"),
     "calls": [8, 12, 7, 15, 11, 9, 6][i],
     "bookings": [2, 4, 1, 5, 3, 2, 1][i]}
    for i in range(6, -1, -1)
]

_DEMO_CALLS = [
    {"id": f"demo-call-{i}", "outcome": ["answered", "booked", "escalated"][i % 3],
     "had_booking": i % 3 == 1, "was_escalated": i % 3 == 2,
     "duration_seconds": 60 + i * 15, "caller_number": "+91980000000" + str(i),
     "started_at": (datetime.utcnow() - timedelta(hours=i * 3)).isoformat()}
    for i in range(10)
]


@router.get("/{business_id}/overview")
async def overview(business_id: str):
    if business_id == "demo-biz":
        return _DEMO_OVERVIEW
    import pytz
    sb = get_supabase()
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    calls = (
        sb.table("calls")
        .select("id,outcome,was_escalated,had_booking,duration_seconds,started_at")
        .eq("business_id", business_id)
        .gte("started_at", month_start.isoformat())
        .execute()
    ).data or []

    total = len(calls)
    booked = sum(1 for c in calls if c.get("had_booking"))
    escalated = sum(1 for c in calls if c.get("was_escalated"))
    durations = [c["duration_seconds"] for c in calls if c.get("duration_seconds")]
    avg_duration = round(sum(durations) / len(durations), 1) if durations else 0
    conversion = round((booked / total) * 100, 1) if total else 0

    # Calculate revenue recovered
    appointments = (
        sb.table("appointments")
        .select("service")
        .eq("business_id", business_id)
        .gte("scheduled_at", month_start.isoformat())
        .neq("status", "cancelled")
        .execute()
    ).data or []

    biz_res = sb.table("businesses").select("services, working_hours, timezone").eq("id", business_id).single().execute()
    biz_data = biz_res.data or {}
    services = biz_data.get("services", []) or []
    service_prices = {s["name"].lower(): s.get("price", 0) for s in services}

    revenue_recovered = sum(service_prices.get(a["service"].lower(), 0) for a in appointments)
    total_minutes = round(sum(durations) / 60, 1) if durations else 0

    # Calculate answered after-hours saves
    working_hours = biz_data.get("working_hours", []) or []
    tz = pytz.timezone(biz_data.get("timezone", "Asia/Kolkata"))
    answered_after_hours = 0
    for c in calls:
        try:
            started = datetime.fromisoformat(c["started_at"].replace("Z", "+00:00")).astimezone(tz)
            day_name = started.strftime("%A").lower()
            is_outside = True
            for h in working_hours:
                if h.get("day", "").lower() == day_name:
                    if not h.get("closed"):
                        open_t = datetime.strptime(h["open"], "%H:%M").time()
                        close_t = datetime.strptime(h["close"], "%H:%M").time()
                        if open_t <= started.time() <= close_t:
                            is_outside = False
            if is_outside:
                answered_after_hours += 1
        except Exception:
            pass

    return {
        "calls_this_month": total,
        "bookings": booked,
        "conversion_pct": conversion,
        "escalations": escalated,
        "avg_call_seconds": avg_duration,
        "revenue_recovered": revenue_recovered,
        "total_minutes": total_minutes,
        "answered_after_hours": answered_after_hours,
    }


@router.get("/{business_id}/calls")
async def call_history(
    business_id: str,
    page: int = 1,
    page_size: int = 25,
    outcome: str | None = None,
):
    if business_id == "demo-biz":
        return {"items": _DEMO_CALLS, "total": len(_DEMO_CALLS), "page": 1, "page_size": 25}
    sb = get_supabase()
    q = (
        sb.table("calls")
        .select("*", count="exact")
        .eq("business_id", business_id)
        .order("started_at", desc=True)
    )
    if outcome and outcome != "all":
        q = q.eq("outcome", outcome)
    offset = (page - 1) * page_size
    res = q.range(offset, offset + page_size - 1).execute()
    return {
        "items": res.data or [],
        "total": res.count or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/{business_id}/calls/today")
async def calls_today(business_id: str):
    sb = get_supabase()
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    res = (
        sb.table("calls")
        .select("*")
        .eq("business_id", business_id)
        .gte("started_at", today.isoformat())
        .order("started_at", desc=True)
        .execute()
    )
    return res.data or []


@router.get("/{business_id}/stats/week")
async def week_stats(business_id: str):
    if business_id == "demo-biz":
        return _DEMO_WEEK
    sb = get_supabase()
    start = (datetime.utcnow() - timedelta(days=6)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    calls = (
        sb.table("calls")
        .select("started_at,outcome,had_booking")
        .eq("business_id", business_id)
        .gte("started_at", start.isoformat())
        .execute()
    ).data or []

    buckets: dict[str, dict] = {}
    for i in range(7):
        d = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        buckets[d] = {"date": d, "calls": 0, "bookings": 0}
    for c in calls:
        day = c["started_at"][:10]
        if day in buckets:
            buckets[day]["calls"] += 1
            if c.get("had_booking"):
                buckets[day]["bookings"] += 1
    return list(buckets.values())
