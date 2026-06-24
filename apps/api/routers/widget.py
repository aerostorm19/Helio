import asyncio
import json
import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from models.database import get_business_by_id, get_supabase
from models.schemas import Message
from services.llm import llm_service
from services.session import session_service
from services.stt import stt_service
from services.tts import tts_service
from tools.handlers import tool_handlers

router = APIRouter()
logger = logging.getLogger(__name__)


DEMO_BUSINESS = {
    "id": "demo-biz",
    "name": "Aarogya Multispeciality Clinic",
    "slug": "aarogya-clinic",
    "industry": "healthcare",
    "agent_name": "Maya",
    "greeting_message": "Namaskar! Thank you for calling Aarogya Multispeciality Clinic. This is Maya. How may I assist you today?",
    "timezone": "Asia/Kolkata",
    "services": [
        {"name": "General Consultation", "duration_minutes": 20, "price": 500},
        {"name": "Specialist Consultation", "duration_minutes": 30, "price": 1200},
        {"name": "Blood Test (Basic Panel)", "duration_minutes": 15, "price": 800},
        {"name": "ECG", "duration_minutes": 20, "price": 600},
        {"name": "X-Ray", "duration_minutes": 30, "price": 900},
        {"name": "Physiotherapy Session", "duration_minutes": 45, "price": 700},
    ],
    "working_hours": [
        {"day": "monday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "tuesday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "wednesday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "thursday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "friday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "saturday", "open": "10:00", "close": "20:00", "closed": False},
        {"day": "sunday", "open": "00:00", "close": "00:00", "closed": True},
    ],
    "address": "FC Road, Shivajinagar, Pune - 411005",
    "phone": "+91 20 2553 0000",
    "faqs": [
        {"question": "Do you accept Mediclaim / cashless insurance?", "answer": "Yes, we are empanelled with most major TPA providers including Star Health, ICICI Lombard, and United India. Please carry your insurance card."},
        {"question": "What are your OPD timings?", "answer": "Our OPD is open Monday to Saturday, 9 AM to 8 PM. Sunday OPD is available 10 AM to 2 PM for emergencies only."},
        {"question": "Is prior appointment required?", "answer": "Walk-ins are welcome for general consultation. For specialist consultations and procedures, prior appointment is recommended to avoid wait times."},
        {"question": "Do you have a 24-hour emergency?", "answer": "Yes, our emergency department operates 24 hours, 7 days a week."},
    ],
    "working_hours": [
        {"day": "monday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "tuesday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "wednesday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "thursday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "friday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "saturday", "open": "09:00", "close": "20:00", "closed": False},
        {"day": "sunday", "open": "10:00", "close": "14:00", "closed": False},
    ],
    "escalation_phone": None,
    "after_hours_message": "Thank you for calling Aarogya Clinic. Our OPD is currently closed. For emergencies, our 24-hour emergency department is always available. Please visit us or call back during OPD hours.",
    "after_hours_mode": False,
    "whatsapp_number": None,
    "google_calendar_id": None,
}


@router.websocket("/stream/{business_id}")
async def widget_stream(websocket: WebSocket, business_id: str):
    await websocket.accept()

    if business_id == "demo-biz":
        business = DEMO_BUSINESS
    else:
        business = await get_business_by_id(business_id)
        if not business:
            await websocket.close(code=4404)
            return

    session = await session_service.create_widget_session(business)

    # Skip DB call logging for demo
    if business_id != "demo-biz":
        sb = get_supabase()
        call_row = (
            sb.table("calls")
            .insert(
                {
                    "business_id": business_id,
                    "twilio_call_sid": session.call_sid,
                    "call_direction": "inbound",
                    "caller_number": "widget",
                }
            )
            .execute()
        ).data[0]
        session.call_id = call_row["id"]
        await session_service.update_session(session)

    greeting = (
        business.get("greeting_message")
        or f"Hi, thanks for calling {business['name']}! How can I help?"
    )
    await websocket.send_text(json.dumps({"role": "assistant", "text": greeting}))
    greeting_audio = await tts_service.synthesize_raw(greeting, business_id)
    if greeting_audio:
        await websocket.send_bytes(greeting_audio)
    session.messages.append(Message(role="assistant", content=greeting))
    await session_service.update_session(session)

    try:
        while True:
            try:
                audio_data = await asyncio.wait_for(
                    websocket.receive_bytes(), timeout=30.0
                )
            except asyncio.TimeoutError:
                break
            if not audio_data:
                break

            transcript = await stt_service.transcribe(audio_data)
            if not transcript.text.strip():
                continue

            # Send user transcript event to client
            await websocket.send_text(json.dumps({"role": "user", "text": transcript.text}))

            session.messages.append(Message(role="user", content=transcript.text))
            llm_response = await llm_service.process_turn(session)

            if llm_response.tool_calls:
                tool_results = await tool_handlers.execute(llm_response.tool_calls, session)
                llm_response = await llm_service.process_with_results(session, tool_results)

            session.messages.append(Message(role="assistant", content=llm_response.text))
            await session_service.update_session(session)

            # Send assistant transcript event before audio so UI updates immediately
            await websocket.send_text(json.dumps({"role": "assistant", "text": llm_response.text}))

            audio = await tts_service.synthesize_raw(llm_response.text, business_id)
            if audio:
                await websocket.send_bytes(audio)

            if llm_response.is_farewell or llm_response.should_escalate:
                break
    except WebSocketDisconnect:
        pass
    except Exception:
        logger.exception("Widget stream failed")
    finally:
        if business_id != "demo-biz" and session.call_id:
            try:
                sb = get_supabase()
                sb.table("calls").update(
                    {
                        "ended_at": datetime.utcnow().isoformat(),
                        "transcript": [m.model_dump() for m in session.messages],
                    }
                ).eq("id", session.call_id).execute()
            except Exception:
                logger.exception("Widget call finalize failed")
        await session_service.delete_session(session.call_sid)
