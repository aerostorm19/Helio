import json
import logging
from datetime import datetime
from uuid import uuid4

from upstash_redis.asyncio import Redis

from config import settings
from models.schemas import CallSession, Message

logger = logging.getLogger(__name__)

SESSION_TTL = 3600  # 1 hour


class SessionService:
    def __init__(self):
        self._redis: Redis | None = None

    @property
    def redis(self) -> Redis:
        if self._redis is None:
            if not settings.upstash_redis_rest_url:
                raise RuntimeError("Upstash Redis not configured")
            self._redis = Redis(
                url=settings.upstash_redis_rest_url,
                token=settings.upstash_redis_rest_token,
            )
        return self._redis

    def key(self, call_sid: str) -> str:
        return f"helio:session:{call_sid}"

    async def create_session(
        self, call_sid: str, business: dict, call_id: str
    ) -> CallSession:
        session = CallSession(
            call_sid=call_sid,
            call_id=call_id,
            business_id=business["id"],
            business=business,
            messages=[],
            current_intent="greeting",
            collected_data={},
        )
        try:
            await self.redis.setex(
                self.key(call_sid),
                SESSION_TTL,
                session.model_dump_json(),
            )
        except Exception:
            logger.exception("Session create (redis) failed; continuing in-memory")
        return session

    async def create_widget_session(self, business: dict) -> CallSession:
        call_sid = f"widget-{uuid4()}"
        return await self.create_session(call_sid, business, call_sid)

    async def get_session(self, call_sid: str) -> CallSession | None:
        try:
            data = await self.redis.get(self.key(call_sid))
        except Exception:
            logger.exception("Session get failed")
            return None
        if not data:
            return None
        try:
            return CallSession(**json.loads(data))
        except Exception:
            logger.exception("Session parse failed")
            return None

    async def update_session(self, session: CallSession) -> None:
        try:
            await self.redis.setex(
                self.key(session.call_sid),
                SESSION_TTL,
                session.model_dump_json(),
            )
        except Exception:
            logger.exception("Session update failed")

    async def delete_session(self, call_sid: str) -> None:
        try:
            await self.redis.delete(self.key(call_sid))
        except Exception:
            logger.exception("Session delete failed")


session_service = SessionService()
