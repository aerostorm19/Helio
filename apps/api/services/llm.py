import asyncio
import json
import logging
import random

from groq import Groq

from config import settings
from models.schemas import CallSession, LLMResponse, ToolCall
from prompts.system import build_system_prompt, get_current_datetime
from tools.definitions import HELIO_TOOLS

logger = logging.getLogger(__name__)

ESCALATE_PHRASES = ("connect you", "transfer", "human", "team member", "someone from")
FAREWELL_PHRASES = ("goodbye", "have a lovely", "take care", "bye", "good day")

MODEL = "llama-3.3-70b-versatile"


class LLMService:
    def __init__(self):
        self._client: Groq | None = None

    @property
    def client(self) -> Groq:
        if self._client is None:
            self._client = Groq(api_key=settings.groq_api_key)
        return self._client

    async def process_turn(self, session: CallSession) -> LLMResponse:
        business = session.business
        msgs = session.messages[-9:]

        user_msg = msgs[-1].content if msgs and msgs[-1].role == "user" else ""
        faqs = []
        if user_msg:
            try:
                from services.vector_search import search_faqs
                faqs = await search_faqs(business["id"], user_msg)
            except Exception:
                pass
        if not faqs:
            faqs = business.get("faqs", []) or []

        system_prompt = build_system_prompt(
            business,
            get_current_datetime(business.get("timezone", "Asia/Kolkata")),
            faqs=faqs,
        )

        messages = [{"role": "system", "content": system_prompt}]
        for msg in msgs:
            role = "user" if msg.role == "user" else "assistant"
            messages.append({"role": role, "content": msg.content})

        try:
            response = await self._call_with_backoff(messages)
        except Exception:
            logger.exception("LLM turn failed after retries")
            return LLMResponse(
                text="I'm experiencing a technical issue. Let me connect you with the team.",
                should_escalate=True,
            )

        choice = response.choices[0]
        message = choice.message

        tool_calls: list[ToolCall] = []
        text = message.content or ""

        if message.tool_calls:
            for tc in message.tool_calls:
                try:
                    args = json.loads(tc.function.arguments)
                except Exception:
                    args = {}
                tool_calls.append(ToolCall(name=tc.function.name, args=args))

        should_escalate = any(t.name == "escalate_to_human" for t in tool_calls)

        return LLMResponse(
            text=text.strip(),
            tool_calls=tool_calls,
            should_escalate=should_escalate,
            is_farewell=self._detect_farewell(text),
        )

    async def process_with_results(self, session: CallSession, tool_results: list[dict]) -> LLMResponse:
        summary = "\n".join(f"Tool {r['tool']} → {r['result']}" for r in tool_results)
        session.messages.append(
            type(session.messages[0])(role="user", content=f"[TOOL RESULTS]\n{summary}")
        )
        return await self.process_turn(session)

    async def _call_with_backoff(self, messages: list, max_retries: int = 3):
        for attempt in range(max_retries):
            try:
                return await asyncio.to_thread(
                    self.client.chat.completions.create,
                    model=MODEL,
                    messages=messages,
                    tools=HELIO_TOOLS,
                    tool_choice="auto",
                    temperature=0.4,
                    max_tokens=200,
                )
            except Exception as e:
                is_rate_limit = "429" in str(e) or "rate" in str(e).lower()
                if is_rate_limit and attempt < max_retries - 1:
                    wait = (2 ** attempt) + random.uniform(0, 1)
                    logger.warning("Groq 429 — retry %d in %.1fs", attempt + 1, wait)
                    await asyncio.sleep(wait)
                else:
                    raise

    @staticmethod
    def _detect_farewell(text: str) -> bool:
        t = text.lower()
        return any(k in t for k in FAREWELL_PHRASES)


llm_service = LLMService()
