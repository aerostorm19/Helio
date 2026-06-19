import asyncio
import logging
import random

import google.generativeai as genai

from config import settings
from models.schemas import CallSession, LLMResponse, ToolCall
from prompts.system import build_system_prompt, get_current_datetime
from tools.definitions import HELIO_TOOLS

logger = logging.getLogger(__name__)

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)

ESCALATE_PHRASES = ("connect you", "transfer", "human", "team member", "someone from")
FAREWELL_PHRASES = ("goodbye", "have a lovely", "take care", "bye", "good day")


class LLMService:
    async def process_turn(self, session: CallSession) -> LLMResponse:
        business = session.business

        # Cap history at 8 to limit latency / token usage.
        msgs = session.messages[-9:]  # last 8 + current

        # Retrieve dynamic FAQ matches from vector search
        user_msg = msgs[-1].content if msgs and msgs[-1].role == "user" else ""
        faqs = []
        if user_msg:
            try:
                from services.vector_search import search_faqs
                faqs = await search_faqs(business["id"], user_msg)
            except Exception:
                logger.exception("Failed to query vector FAQs")

        if not faqs:
            faqs = business.get("faqs", []) or []

        system_prompt = build_system_prompt(
            business,
            get_current_datetime(business.get("timezone", "Asia/Kolkata")),
            faqs=faqs,
        )
        history = []
        for msg in msgs[:-1]:
            role = "user" if msg.role == "user" else "model"
            history.append({"role": role, "parts": [msg.content]})

        try:
            model = genai.GenerativeModel(
                model_name="gemini-1.5-flash",
                system_instruction=system_prompt,
                tools=HELIO_TOOLS,
            )
            chat = model.start_chat(history=history)
            last_user_msg = msgs[-1].content
            gen_config = genai.GenerationConfig(
                temperature=0.4,
                max_output_tokens=200,
                candidate_count=1,
            )
            response = await self._send_with_backoff(chat, last_user_msg, gen_config)
        except Exception:
            logger.exception("LLM turn failed after retries")
            return LLMResponse(
                text="I'm experiencing a technical issue. Let me connect you with the team.",
                should_escalate=True,
            )

        tool_calls: list[ToolCall] = []
        text_parts: list[str] = []
        try:
            for part in response.parts:
                if getattr(part, "function_call", None) and part.function_call.name:
                    tool_calls.append(
                        ToolCall(
                            name=part.function_call.name,
                            args=dict(part.function_call.args or {}),
                        )
                    )
                elif getattr(part, "text", None):
                    text_parts.append(part.text)
        except Exception:
            logger.exception("Parsing LLM response failed")
            text_parts = [getattr(response, "text", "") or ""]

        text = " ".join(t for t in text_parts if t).strip()
        should_escalate = any(t.name == "escalate_to_human" for t in tool_calls)

        return LLMResponse(
            text=text,
            tool_calls=tool_calls,
            should_escalate=should_escalate,
            is_farewell=self._detect_farewell(text),
        )

    async def process_with_results(
        self, session: CallSession, tool_results: list[dict]
    ) -> LLMResponse:
        """Feed tool results back into the model to produce a natural-language reply."""
        summary = "\n".join(
            f"Tool {r['tool']} → {r['result']}" for r in tool_results
        )
        session.messages.append(
            type(session.messages[0])(role="user", content=f"[TOOL RESULTS]\n{summary}")
        )
        return await self.process_turn(session)

    @staticmethod
    async def _send_with_backoff(chat, message: str, generation_config, max_retries: int = 4):
        for attempt in range(max_retries):
            try:
                return await asyncio.to_thread(
                    chat.send_message, message, generation_config=generation_config
                )
            except Exception as e:
                is_rate_limit = "429" in str(e) or "Resource has been exhausted" in str(e)
                if is_rate_limit and attempt < max_retries - 1:
                    wait = (2 ** attempt) + random.uniform(0, 1)
                    logger.warning("Gemini 429 — retry %d in %.1fs", attempt + 1, wait)
                    await asyncio.sleep(wait)
                else:
                    raise

    @staticmethod
    def _detect_farewell(text: str) -> bool:
        t = text.lower()
        return any(k in t for k in FAREWELL_PHRASES)


llm_service = LLMService()
