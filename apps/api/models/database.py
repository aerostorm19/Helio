import json
from functools import lru_cache

from supabase import Client, create_client
from upstash_redis.asyncio import Redis

from config import settings

_redis_client = None


def get_redis() -> Redis:
    global _redis_client
    if _redis_client is None:
        if not settings.upstash_redis_rest_url:
            raise RuntimeError("Upstash Redis not configured")
        _redis_client = Redis(
            url=settings.upstash_redis_rest_url,
            token=settings.upstash_redis_rest_token,
        )
    return _redis_client


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Server-side Supabase client using the service-role key. Backend-only."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase credentials missing")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_business_by_id(business_id: str) -> dict | None:
    redis = get_redis()
    cache_key = f"helio:business:{business_id}"
    try:
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    sb = get_supabase()
    res = sb.table("businesses").select("*").eq("id", business_id).single().execute()
    biz = res.data
    if biz:
        try:
            await redis.setex(cache_key, 300, json.dumps(biz))
        except Exception:
            pass
    return biz


async def get_business_by_twilio_number(twilio_number: str) -> dict | None:
    redis = get_redis()
    cache_key = f"helio:business:number:{twilio_number}"
    try:
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    sb = get_supabase()
    res = (
        sb.table("businesses")
        .select("*")
        .eq("twilio_phone_number", twilio_number)
        .limit(1)
        .execute()
    )
    biz = res.data[0] if res.data else None
    if biz:
        try:
            await redis.setex(cache_key, 300, json.dumps(biz))
        except Exception:
            pass
    return biz


async def get_faqs(business_id: str, active_only: bool = True) -> list[dict]:
    sb = get_supabase()
    q = sb.table("faqs").select("*").eq("business_id", business_id)
    if active_only:
        q = q.eq("is_active", True)
    res = q.order("sort_order").execute()
    return res.data or []


class BusinessRepository:
    """Repository pattern to enforce business_id data isolation on all queries."""

    def __init__(self, business_id: str):
        self.business_id = business_id
        self.sb = get_supabase()

    def get_appointments(self):
        return self.sb.table("appointments").select("*").eq("business_id", self.business_id)

    def get_calls(self):
        return self.sb.table("calls").select("*").eq("business_id", self.business_id)

    def get_faqs(self, active_only: bool = True):
        q = self.sb.table("faqs").select("*").eq("business_id", self.business_id)
        if active_only:
            q = q.eq("is_active", True)
        return q.order("sort_order")
