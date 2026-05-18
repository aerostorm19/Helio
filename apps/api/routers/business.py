import asyncio
import logging
import re

from fastapi import APIRouter, Depends, Header, HTTPException

from models.database import get_supabase
from models.schemas import BusinessCreate, BusinessUpdate, FAQCreate, FAQUpdate
from services.vector_search import upsert_faq_embedding

router = APIRouter()
logger = logging.getLogger(__name__)


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "business"


async def require_user(authorization: str | None = Header(default=None)) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Missing bearer token")
    token = authorization.split(" ", 1)[1]
    sb = get_supabase()
    try:
        res = sb.auth.get_user(token)
        if not res or not res.user:
            raise HTTPException(401, "Invalid token")
        return res.user.id
    except Exception:
        raise HTTPException(401, "Auth failed")


@router.post("/onboard")
async def onboard(body: BusinessCreate, user_id: str = Depends(require_user)):
    sb = get_supabase()
    payload = body.model_dump()
    payload["user_id"] = user_id
    payload["slug"] = body.slug or slugify(body.name)
    res = sb.table("businesses").insert(payload).execute()
    if not res.data:
        raise HTTPException(500, "Create failed")
    return res.data[0]


@router.get("/{business_id}")
async def get_business(business_id: str):
    sb = get_supabase()
    res = sb.table("businesses").select("*").eq("id", business_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    return res.data


@router.put("/{business_id}")
async def update_business(business_id: str, body: BusinessUpdate):
    sb = get_supabase()
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    res = sb.table("businesses").update(payload).eq("id", business_id).execute()
    return res.data[0] if res.data else {}


# ─── FAQs ──────────────────────────────────────────
@router.get("/{business_id}/faqs")
async def list_faqs(business_id: str):
    sb = get_supabase()
    res = (
        sb.table("faqs")
        .select("*")
        .eq("business_id", business_id)
        .order("sort_order")
        .execute()
    )
    return res.data or []


@router.post("/{business_id}/faqs")
async def add_faq(business_id: str, body: FAQCreate):
    sb = get_supabase()
    res = sb.table("faqs").insert({**body.model_dump(), "business_id": business_id}).execute()
    if not res.data:
        raise HTTPException(500, "Create failed")
    faq = res.data[0]
    asyncio.create_task(upsert_faq_embedding(faq["id"], faq["question"], faq["answer"]))
    return faq


@router.put("/{business_id}/faqs/{faq_id}")
async def update_faq(business_id: str, faq_id: str, body: FAQUpdate):
    sb = get_supabase()
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    res = sb.table("faqs").update(payload).eq("id", faq_id).eq("business_id", business_id).execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    faq = res.data[0]
    if "question" in payload or "answer" in payload:
        asyncio.create_task(
            upsert_faq_embedding(faq["id"], faq["question"], faq["answer"])
        )
    return faq


@router.delete("/{business_id}/faqs/{faq_id}")
async def delete_faq(business_id: str, faq_id: str):
    sb = get_supabase()
    sb.table("faqs").delete().eq("id", faq_id).eq("business_id", business_id).execute()
    return {"ok": True}


@router.post("/{business_id}/faqs/reorder")
async def reorder_faqs(business_id: str, order: list[str]):
    sb = get_supabase()
    for idx, faq_id in enumerate(order):
        sb.table("faqs").update({"sort_order": idx}).eq("id", faq_id).eq(
            "business_id", business_id
        ).execute()
    return {"ok": True}


# ─── Integrations ──────────────────────────────────
@router.post("/{business_id}/calendar/connect")
async def calendar_connect(business_id: str, code: str):
    """Stub. Real impl: exchange OAuth code with Google, persist tokens + calendar_id."""
    return {"ok": True, "stub": True, "code_received": bool(code)}


@router.post("/{business_id}/whatsapp/connect")
async def whatsapp_connect(business_id: str, waba_id: str, phone_number_id: str):
    sb = get_supabase()
    sb.table("businesses").update(
        {"meta_waba_id": waba_id, "meta_phone_number_id": phone_number_id}
    ).eq("id", business_id).execute()
    return {"ok": True}


@router.get("/{business_id}/phone-numbers")
async def list_available_numbers(business_id: str, country: str = "IN"):
    """Stub: real impl uses Twilio AvailablePhoneNumbers REST."""
    return {"country": country, "numbers": []}


@router.post("/{business_id}/phone-numbers/buy")
async def buy_number(business_id: str, phone_number: str):
    """Stub: real impl calls Twilio IncomingPhoneNumbers.create + persists SID."""
    sb = get_supabase()
    sb.table("businesses").update({"twilio_phone_number": phone_number}).eq(
        "id", business_id
    ).execute()
    return {"ok": True, "stub": True}
