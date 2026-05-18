from datetime import datetime, timedelta

from fastapi import APIRouter, Query

from models.database import get_supabase

router = APIRouter()


@router.get("/{business_id}/overview")
async def overview(business_id: str):
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

    return {
        "calls_this_month": total,
        "bookings": booked,
        "conversion_pct": conversion,
        "escalations": escalated,
        "avg_call_seconds": avg_duration,
    }


@router.get("/{business_id}/calls")
async def call_history(
    business_id: str,
    page: int = 1,
    page_size: int = 25,
    outcome: str | None = None,
):
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
