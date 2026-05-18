from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, EmailStr, Field


# ─── Business ────────────────────────────────────────────────
class WorkingHour(BaseModel):
    day: str
    open: str = "10:00"
    close: str = "20:00"
    closed: bool = False


class Service(BaseModel):
    name: str
    duration_minutes: int = 30
    price: float = 0.0


class BusinessCreate(BaseModel):
    name: str
    slug: str
    industry: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    agent_name: str = "Maya"
    greeting_message: Optional[str] = None
    escalation_phone: Optional[str] = None
    working_hours: list[WorkingHour] = []
    services: list[Service] = []


class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    industry: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    timezone: Optional[str] = None
    agent_name: Optional[str] = None
    greeting_message: Optional[str] = None
    escalation_phone: Optional[str] = None
    after_hours_message: Optional[str] = None
    agent_enabled: Optional[bool] = None
    after_hours_mode: Optional[bool] = None
    whatsapp_confirmations: Optional[bool] = None
    email_confirmations: Optional[bool] = None
    escalation_alerts: Optional[bool] = None
    working_hours: Optional[list[WorkingHour]] = None
    services: Optional[list[Service]] = None


# ─── FAQ ─────────────────────────────────────────────────────
class FAQCreate(BaseModel):
    question: str
    answer: str
    sort_order: int = 0


class FAQUpdate(BaseModel):
    question: Optional[str] = None
    answer: Optional[str] = None
    is_active: Optional[bool] = None
    sort_order: Optional[int] = None


# ─── Booking ─────────────────────────────────────────────────
class AvailabilityQuery(BaseModel):
    business_id: str
    date_description: str
    service_name: Optional[str] = None


class AppointmentCreate(BaseModel):
    business_id: str
    call_id: Optional[str] = None
    customer_name: str
    customer_phone: Optional[str] = None
    customer_email: Optional[EmailStr] = None
    service: str
    scheduled_at: datetime
    duration_minutes: int = 30
    notes: Optional[str] = None


# ─── Call session (in-memory shape) ──────────────────────────
class Message(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: Optional[str] = None


class CallSession(BaseModel):
    call_sid: str
    call_id: str
    business_id: str
    business: dict[str, Any] = Field(default_factory=dict)
    messages: list[Message] = Field(default_factory=list)
    current_intent: Optional[str] = "greeting"
    collected_data: dict[str, Any] = Field(default_factory=dict)


# ─── LLM response ────────────────────────────────────────────
class ToolCall(BaseModel):
    name: str
    args: dict[str, Any] = Field(default_factory=dict)


class LLMResponse(BaseModel):
    text: str
    tool_calls: list[ToolCall] = Field(default_factory=list)
    should_escalate: bool = False
    is_farewell: bool = False


# ─── STT ─────────────────────────────────────────────────────
class TranscriptionResult(BaseModel):
    text: str
    confidence: float = 0.0
    language: str = "en"
