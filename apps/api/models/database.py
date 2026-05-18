from functools import lru_cache

from supabase import Client, create_client

from config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Server-side Supabase client using the service-role key. Backend-only."""
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError("Supabase credentials missing")
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_business_by_id(business_id: str) -> dict | None:
    sb = get_supabase()
    res = sb.table("businesses").select("*").eq("id", business_id).single().execute()
    return res.data


async def get_business_by_twilio_number(twilio_number: str) -> dict | None:
    sb = get_supabase()
    res = (
        sb.table("businesses")
        .select("*")
        .eq("twilio_phone_number", twilio_number)
        .limit(1)
        .execute()
    )
    return res.data[0] if res.data else None


async def get_faqs(business_id: str, active_only: bool = True) -> list[dict]:
    sb = get_supabase()
    q = sb.table("faqs").select("*").eq("business_id", business_id)
    if active_only:
        q = q.eq("is_active", True)
    res = q.order("sort_order").execute()
    return res.data or []
