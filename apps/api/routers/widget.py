import asyncio
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


@router.websocket("/stream/{business_id}")
async def widget_stream(websocket: WebSocket, business_id: str):
    await websocket.accept()
    business = await get_business_by_id(business_id)
    if not business:
        await websocket.close(code=4404)
        return

    session = await session_service.create_widget_session(business)

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

            session.messages.append(Message(role="user", content=transcript.text))
            llm_response = await llm_service.process_turn(session)

            if llm_response.tool_calls:
                tool_results = await tool_handlers.execute(llm_response.tool_calls, session)
                llm_response = await llm_service.process_with_results(session, tool_results)

            session.messages.append(Message(role="assistant", content=llm_response.text))
            await session_service.update_session(session)

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
        try:
            sb.table("calls").update(
                {
                    "ended_at": datetime.utcnow().isoformat(),
                    "transcript": [m.model_dump() for m in session.messages],
                }
            ).eq("id", session.call_id).execute()
        except Exception:
            logger.exception("Widget call finalize failed")
        await session_service.delete_session(session.call_sid)
