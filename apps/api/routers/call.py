import logging
import pytz
from datetime import datetime

from fastapi import APIRouter, Form, Response, Request, HTTPException, BackgroundTasks
from twilio.request_validator import RequestValidator

from config import settings
from models.database import (
    get_business_by_twilio_number,
    get_supabase,
)
from models.schemas import Message
from services.llm import llm_service
from services.session import session_service
from services.tts import tts_service
from tools.handlers import tool_handlers

router = APIRouter()
logger = logging.getLogger(__name__)


def _twiml(content: str) -> Response:
    return Response(content=content, media_type="application/xml")


def _hangup(say: str) -> Response:
    return _twiml(f"<Response><Say>{say}</Say><Hangup/></Response>")


def _gather(audio_url: str | None, say_fallback: str = "") -> Response:
    play_or_say = f"<Play>{audio_url}</Play>" if audio_url else f"<Say>{say_fallback}</Say>"
    return _twiml(
        f"""<Response>
  <Gather input="speech" action="/call/speech" method="POST"
          speechTimeout="auto" timeout="10" language="en-IN">
    {play_or_say}
  </Gather>
  <Say>I didn't hear anything. Please call back when you're ready.</Say>
</Response>"""
    )


async def validate_twilio_signature(request: Request, form_data: dict):
    if settings.app_env == "development" or not settings.twilio_auth_token:
        return
    validator = RequestValidator(settings.twilio_auth_token)
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    # Twilio validator requires exact URL matching what Twilio requested.
    if not validator.validate(url, form_data, signature):
        raise HTTPException(403, "Invalid Twilio signature")


def is_within_working_hours(business: dict) -> bool:
    tz = pytz.timezone(business.get("timezone", "Asia/Kolkata"))
    now = datetime.now(tz)
    day_name = now.strftime("%A").lower()
    
    for h in business.get("working_hours", []):
        if h.get("day", "").lower() == day_name:
            if h.get("closed"):
                return False
            try:
                open_t = datetime.strptime(h["open"], "%H:%M").time()
                close_t = datetime.strptime(h["close"], "%H:%M").time()
                return open_t <= now.time() <= close_t
            except Exception:
                logger.exception("Error parsing business working hours")
                return False
    return False  # Default: closed if no config


@router.post("/incoming")
async def incoming_call(
    request: Request,
    CallSid: str = Form(...),
    From: str = Form(""),
    To: str = Form(""),
):
    form_data = await request.form()
    await validate_twilio_signature(request, {k: v for k, v in form_data.items()})

    business = await get_business_by_twilio_number(To)
    if not business:
        return _hangup("This number is not configured.")

    if not is_within_working_hours(business):
        msg = business.get("after_hours_message") or f"Thank you for calling {business['name']}. We're currently closed. Please call back during business hours."
        audio_url = await tts_service.synthesize(msg, business["id"])
        return _twiml(f"<Response><Play>{audio_url}</Play><Hangup/></Response>")

    if not business.get("agent_enabled", True):
        return _hangup(
            business.get("after_hours_message")
            or "Our AI receptionist is currently off. Please call back later."
        )

    sb = get_supabase()
    call_res = (
        sb.table("calls")
        .insert(
            {
                "business_id": business["id"],
                "caller_number": From,
                "twilio_call_sid": CallSid,
                "call_direction": "inbound",
            }
        )
        .execute()
    )
    call = call_res.data[0]

    await session_service.create_session(CallSid, business, call["id"])

    greeting = (
        business.get("greeting_message")
        or f"Thank you for calling {business['name']}. How can I help you today?"
    )
    audio_url = await tts_service.synthesize(greeting, business["id"])

    # Cache greeting in session messages so the LLM has full context.
    session = await session_service.get_session(CallSid)
    if session:
        session.messages.append(Message(role="assistant", content=greeting))
        await session_service.update_session(session)

    return _gather(audio_url, say_fallback=greeting)


@router.post("/speech")
async def process_speech(
    request: Request,
    background_tasks: BackgroundTasks,
    CallSid: str = Form(...),
    SpeechResult: str = Form(""),
    Confidence: float = Form(0.0),
):
    form_data = await request.form()
    await validate_twilio_signature(request, {k: v for k, v in form_data.items()})

    session = await session_service.get_session(CallSid)
    if not session:
        return _hangup("Session expired.")

    if Confidence < 0.5 or not SpeechResult.strip():
        clarify = "Sorry, I didn't catch that. Could you repeat that please?"
        url = await tts_service.synthesize(clarify, session.business_id)
        return _gather(url, say_fallback=clarify)

    session.messages.append(Message(role="user", content=SpeechResult))

    llm_response = await llm_service.process_turn(session)

    if llm_response.tool_calls:
        tool_results = await tool_handlers.execute(llm_response.tool_calls, session, background_tasks)
        llm_response = await llm_service.process_with_results(session, tool_results)

    ai_text = llm_response.text or "Let me connect you with the team."

    if llm_response.should_escalate:
        return await handle_escalation(session, ai_text)

    if llm_response.is_farewell:
        return await _handle_farewell(session, ai_text)

    audio_url = await tts_service.synthesize(ai_text, session.business_id)
    session.messages.append(Message(role="assistant", content=ai_text))
    await session_service.update_session(session)

    return _gather(audio_url, say_fallback=ai_text)


async def handle_escalation(session, ai_text: str) -> Response:
    audio_url = await tts_service.synthesize(ai_text, session.business_id)
    forward_number = session.business.get("escalation_phone", "")
    
    if forward_number:
        play_or_say = f"<Play>{audio_url}</Play>" if audio_url else f"<Say>{ai_text}</Say>"
        return _twiml(f"""<Response>
            {play_or_say}
            <Dial timeout="30" action="/call/escalation-status">
                <Number>{forward_number}</Number>
            </Dial>
            <Say>Sorry, no one is available right now. Please call back later.</Say>
            <Hangup/>
        </Response>""")
    else:
        # No escalation number configured
        return _twiml(f"""<Response>
            <Say>I'm sorry, I wasn't able to help. Please call back during business hours.</Say>
            <Hangup/>
        </Response>""")


@router.post("/escalation-status")
async def escalation_status(
    request: Request,
):
    # Twilio hits this after dialing. If answered/completed, Twilio hangs up.
    # Otherwise, it falls through to subsequent TwiML.
    return _twiml("<Response><Hangup/></Response>")


async def _handle_farewell(session, ai_text: str):
    audio_url = await tts_service.synthesize(ai_text, session.business_id)
    play_tag = f"<Play>{audio_url}</Play>" if audio_url else f"<Say>{ai_text}</Say>"

    # Finalize the call record.
    try:
        sb = get_supabase()
        sb.table("calls").update(
            {
                "ended_at": datetime.utcnow().isoformat(),
                "transcript": [m.model_dump() for m in session.messages],
            }
        ).eq("id", session.call_id).execute()
        await session_service.delete_session(session.call_sid)
    except Exception:
        logger.exception("Call finalize failed")

    return _twiml(f"<Response>{play_tag}<Hangup/></Response>")


@router.post("/status")
async def call_status(
    request: Request,
    CallSid: str = Form(...),
    CallStatus: str = Form(""),
    CallDuration: int = Form(0),
):
    form_data = await request.form()
    await validate_twilio_signature(request, {k: v for k, v in form_data.items()})

    session = await session_service.get_session(CallSid)
    sb = get_supabase()
    update = {"duration_seconds": CallDuration}
    if CallStatus in ("completed", "no-answer", "busy", "failed", "canceled"):
        update["ended_at"] = datetime.utcnow().isoformat()
        if session and not session.messages:
            update["outcome"] = "missed"
        if session:
            update["transcript"] = [m.model_dump() for m in session.messages]
    try:
        sb.table("calls").update(update).eq("twilio_call_sid", CallSid).execute()
        if CallStatus == "completed":
            await session_service.delete_session(CallSid)
    except Exception:
        logger.exception("Call status update failed")
    return {"ok": True}


@router.get("/{call_id}")
async def get_call(call_id: str):
    sb = get_supabase()
    res = sb.table("calls").select("*").eq("id", call_id).single().execute()
    return res.data


@router.post("/{call_id}/end")
async def force_end(call_id: str):
    sb = get_supabase()
    sb.table("calls").update({"ended_at": datetime.utcnow().isoformat()}).eq(
        "id", call_id
    ).execute()
    return {"ok": True}
