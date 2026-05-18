import logging

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
    def __init__(self):
        self._model: genai.GenerativeModel | None = None

    @property
    def model(self):
        if self._model is None:
            self._model = genai.GenerativeModel(
                model_name="gemini-1.5-flash", tools=HELIO_TOOLS
            )
        return self._model

    async def process_turn(self, session: CallSession) -> LLMResponse:
        business = session.business
        system_prompt = build_system_prompt(
            business, get_current_datetime(business.get("timezone", "Asia/Kolkata"))
        )

        # Cap history at 8 to limit latency / token usage.
        msgs = session.messages[-9:]  # last 8 + current
        history = []
        for msg in msgs[:-1]:
            role = "user" if msg.role == "user" else "model"
            history.append({"role": role, "parts": [msg.content]})

        try:
            chat = self.model.start_chat(history=history)
            last_user_msg = msgs[-1].content
            response = chat.send_message(
                last_user_msg,
                generation_config=genai.GenerationConfig(
                    temperature=0.4,
                    max_output_tokens=200,
                    candidate_count=1,
                ),
                # system_instruction is set on the model; pass via tools/system if needed.
            )
        except Exception:
            logger.exception("LLM turn failed")
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
        return LLMResponse(
            text=text,
            tool_calls=tool_calls,
            should_escalate=self._detect_escalation(text)
            or any(t.name == "escalate_to_human" for t in tool_calls),
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
    def _detect_escalation(text: str) -> bool:
        t = text.lower()
        return any(k in t for k in ESCALATE_PHRASES)

    @staticmethod
    def _detect_farewell(text: str) -> bool:
        t = text.lower()
        return any(k in t for k in FAREWELL_PHRASES)


llm_service = LLMService()
