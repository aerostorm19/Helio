import asyncio
import logging
import re
from datetime import datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request

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
async def add_faq(business_id: str, body: FAQCreate, background_tasks: BackgroundTasks):
    sb = get_supabase()
    res = sb.table("faqs").insert({**body.model_dump(), "business_id": business_id}).execute()
    if not res.data:
        raise HTTPException(500, "Create failed")
    faq = res.data[0]
    background_tasks.add_task(upsert_faq_embedding, faq["id"], faq["question"], faq["answer"])
    return faq


@router.put("/{business_id}/faqs/{faq_id}")
async def update_faq(business_id: str, faq_id: str, body: FAQUpdate, background_tasks: BackgroundTasks):
    sb = get_supabase()
    payload = {k: v for k, v in body.model_dump().items() if v is not None}
    res = sb.table("faqs").update(payload).eq("id", faq_id).eq("business_id", business_id).execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    faq = res.data[0]
    if "question" in payload or "answer" in payload:
        background_tasks.add_task(upsert_faq_embedding, faq["id"], faq["question"], faq["answer"])
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
    import os
    from google_auth_oauthlib.flow import Flow
    from googleapiclient.discovery import build
    from config import settings

    client_id = os.getenv("GOOGLE_OAUTH_CLIENT_ID") or settings.google_oauth_client_id
    client_secret = os.getenv("GOOGLE_OAUTH_CLIENT_SECRET") or settings.google_oauth_client_secret

    if not client_id or not client_secret:
        raise HTTPException(500, "Google OAuth client configuration missing")

    try:
        # Standard flow config for web frontend authorization codes
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "redirect_uri": os.getenv("GOOGLE_OAUTH_REDIRECT_URI", "http://localhost:3000/settings/integrations"),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                }
            },
            scopes=["https://www.googleapis.com/auth/calendar"],
        )
        await asyncio.to_thread(flow.fetch_token, code=code)
        creds = flow.credentials

        # Discover primary calendar ID
        service = build("calendar", "v3", credentials=creds, cache_discovery=False)
        primary_cal = await asyncio.to_thread(
            service.calendars().get(calendarId="primary").execute
        )
        primary_id = primary_cal.get("id")

        sb = get_supabase()
        sb.table("businesses").update({
            "google_calendar_id": primary_id,
            "google_calendar_access_token": creds.token,
            "google_calendar_refresh_token": creds.refresh_token,
            "google_calendar_token_expiry": creds.expiry.isoformat() if creds.expiry else None,
        }).eq("id", business_id).execute()

        # Register push-notification watch so Google notifies us of event changes
        try:
            import uuid
            channel_id = str(uuid.uuid4())
            webhook_base = os.getenv("TWILIO_WEBHOOK_BASE_URL", "https://api.tryhelio.com").rstrip("/")
            watch_body = {
                "id": channel_id,
                "type": "web_hook",
                "address": f"{webhook_base}/business/{business_id}/calendar/sync",
            }
            watch_result = await asyncio.to_thread(
                service.events().watch(calendarId=primary_id, body=watch_body).execute
            )
            sb.table("businesses").update({
                "google_calendar_channel_id": watch_result.get("id"),
                "google_calendar_resource_id": watch_result.get("resourceId"),
            }).eq("id", business_id).execute()
        except Exception:
            logger.warning("Calendar watch registration failed — sync-back disabled", exc_info=True)

        return {"ok": True, "calendar_id": primary_id}
    except Exception as e:
        logger.exception("Google OAuth exchange failed")
        raise HTTPException(500, f"OAuth exchange failed: {e}")


@router.post("/{business_id}/whatsapp/connect")
async def whatsapp_connect(business_id: str, waba_id: str, phone_number_id: str):
    sb = get_supabase()
    sb.table("businesses").update(
        {"meta_waba_id": waba_id, "meta_phone_number_id": phone_number_id}
    ).eq("id", business_id).execute()
    return {"ok": True}


@router.get("/{business_id}/phone-numbers")
async def list_available_numbers(business_id: str, country: str = "IN"):
    from twilio.rest import Client
    from config import settings

    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        # Return mock numbers in dev mode if settings are missing
        if settings.app_env == "development":
            return {"country": country, "numbers": ["+919876543210", "+919876543211", "+919876543212"]}
        raise HTTPException(500, "Twilio configuration missing")

    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        # Search available local numbers
        numbers = await asyncio.to_thread(
            client.available_phone_numbers(country).local.list,
            limit=5
        )
        return {"country": country, "numbers": [n.phone_number for n in numbers]}
    except Exception as e:
        logger.exception("Failed to query Twilio available numbers")
        raise HTTPException(500, f"Twilio query failed: {e}")


@router.post("/{business_id}/phone-numbers/buy")
async def buy_number(business_id: str, phone_number: str):
    from twilio.rest import Client
    from config import settings

    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        # Return mock success in dev mode if settings are missing
        if settings.app_env == "development":
            sb = get_supabase()
            sb.table("businesses").update({"twilio_phone_number": phone_number}).eq(
                "id", business_id
            ).execute()
            return {"ok": True, "stub": True, "phone_number": phone_number}
        raise HTTPException(500, "Twilio configuration missing")

    try:
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        webhook_base = settings.twilio_webhook_base_url.rstrip("/")
        
        # Purchase phone number and configure the voice webhooks
        incoming_number = await asyncio.to_thread(
            client.incoming_phone_numbers.create,
            phone_number=phone_number,
            voice_url=f"{webhook_base}/call/incoming",
            voice_method="POST",
            status_callback=f"{webhook_base}/call/status",
            status_callback_method="POST"
        )

        sb = get_supabase()
        sb.table("businesses").update({
            "twilio_phone_number": phone_number,
            "twilio_phone_sid": incoming_number.sid
        }).eq("id", business_id).execute()

        return {"ok": True, "phone_number": phone_number, "twilio_phone_sid": incoming_number.sid}
    except Exception as e:
        logger.exception("Failed to purchase phone number")
        raise HTTPException(500, f"Purchase failed: {e}")


# ─── Google Calendar push sync-back ────────────────
@router.post("/{business_id}/calendar/watch")
async def register_calendar_watch(business_id: str):
    """Register a Google push-notification channel so Google tells us about event changes."""
    import os
    import uuid
    from googleapiclient.discovery import build as gcal_build

    sb = get_supabase()
    res = sb.table("businesses").select("*").eq("id", business_id).single().execute()
    if not res.data:
        raise HTTPException(404, "Not found")
    business = res.data

    if not business.get("google_calendar_id") or not business.get("google_calendar_access_token"):
        raise HTTPException(400, "Calendar not connected")

    try:
        from services.calendar import calendar_service
        service = await asyncio.to_thread(calendar_service._service, business)

        channel_id = str(uuid.uuid4())
        webhook_base = os.getenv("TWILIO_WEBHOOK_BASE_URL", "https://api.tryhelio.com").rstrip("/")

        body = {
            "id": channel_id,
            "type": "web_hook",
            "address": f"{webhook_base}/business/{business_id}/calendar/sync",
        }
        result = await asyncio.to_thread(
            service.events().watch(calendarId=business["google_calendar_id"], body=body).execute
        )

        # Store channel info so we can stop the watch when needed
        sb.table("businesses").update({
            "google_calendar_channel_id": result.get("id"),
            "google_calendar_resource_id": result.get("resourceId"),
        }).eq("id", business_id).execute()

        return {"ok": True, "channel_id": result.get("id"), "expiration": result.get("expiration")}
    except Exception as e:
        logger.exception("Calendar watch registration failed")
        raise HTTPException(500, f"Watch registration failed: {e}")


@router.post("/{business_id}/calendar/sync")
async def calendar_sync_webhook(business_id: str, request: "Request"):
    """Receive Google Calendar push notifications and reconcile appointment state."""
    from fastapi import Request as FastAPIRequest

    # Google sends these headers to identify the notification type
    channel_id = request.headers.get("X-Goog-Channel-ID")
    resource_state = request.headers.get("X-Goog-Resource-State")

    if resource_state == "sync":
        # Initial sync notification — acknowledge and ignore
        return {"ok": True}

    sb = get_supabase()
    biz_res = sb.table("businesses").select("*").eq("id", business_id).single().execute()
    if not biz_res.data:
        return {"ok": True}
    business = biz_res.data

    if not business.get("google_calendar_id") or not business.get("google_calendar_access_token"):
        return {"ok": True}

    try:
        from services.calendar import calendar_service
        from datetime import timezone

        service = await asyncio.to_thread(calendar_service._service, business)

        # Fetch events updated in the last 5 minutes
        now = datetime.utcnow().replace(tzinfo=timezone.utc)
        updated_min = (now - timedelta(minutes=5)).isoformat()

        events_result = await asyncio.to_thread(
            service.events().list(
                calendarId=business["google_calendar_id"],
                updatedMin=updated_min,
                singleEvents=True,
                showDeleted=True,
            ).execute
        )
        events = events_result.get("items", [])

        for event in events:
            google_event_id = event.get("id")
            status = event.get("status")  # "cancelled" if deleted
            if status != "cancelled":
                continue

            # Find matching appointment by google_event_id
            appt_res = (
                sb.table("appointments")
                .select("id, status")
                .eq("business_id", business_id)
                .eq("google_calendar_event_id", google_event_id)
                .maybe_single()
                .execute()
            )
            if appt_res.data and appt_res.data["status"] not in ("cancelled", "no_show"):
                sb.table("appointments").update({"status": "cancelled"}).eq(
                    "id", appt_res.data["id"]
                ).execute()
                logger.info("Cancelled appointment %s via Google Calendar sync", appt_res.data["id"])

    except Exception:
        logger.exception("Calendar sync reconciliation failed")

    return {"ok": True}
