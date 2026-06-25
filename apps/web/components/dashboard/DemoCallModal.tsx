"use client";

import { useEffect, useRef, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface Props {
  businessId: string;
  agentName?: string;
  onClose: () => void;
}

type CallState = "idle" | "connecting" | "active" | "ended";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Scripted conversation — Maya speaks, "user" lines appear as caller
const SCRIPT: { role: "user" | "assistant"; text: string; bookAppt?: boolean }[] = [
  { role: "assistant", text: "Namaskar! Thank you for calling SmileCraft Dental and Implant Centre. This is Maya. How may I assist you today?" },
  { role: "user",      text: "Hi Maya, I'd like to book a teeth cleaning appointment." },
  { role: "assistant", text: "Of course! I'd be happy to help. Could I get your name please?" },
  { role: "user",      text: "Sure, it's Rahul Sharma." },
  { role: "assistant", text: "Thank you, Rahul. What day works best for you?" },
  { role: "user",      text: "How about tomorrow afternoon?" },
  { role: "assistant", text: "Let me check availability for you… I have a slot open at 2:00 PM tomorrow. Does that work?" },
  { role: "user",      text: "Yes, perfect!" },
  { role: "assistant", text: "Great. And could I get a contact number for the confirmation?" },
  { role: "user",      text: "It's 98765 43210." },
  {
    role: "assistant",
    text: "All done, Rahul! Your Teeth Cleaning is booked for tomorrow at 2:00 PM. You'll receive a confirmation shortly. Is there anything else I can help with?",
    bookAppt: true,
  },
  { role: "user",      text: "No, that's all. Thank you!" },
  { role: "assistant", text: "It was a pleasure. Have a wonderful day and we'll see you tomorrow at SmileCraft!" },
];

function speak(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.05;
  utter.pitch = 1.0;
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => v.lang.startsWith("en") && /female|zira|susan|samantha/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en")) ||
    null;
  if (preferred) utter.voice = preferred;
  window.speechSynthesis.speak(utter);
}

// Returns ms to wait after a line appears before moving to next
function pauseAfter(role: "user" | "assistant", text: string): number {
  // Maya: let her finish speaking (~70ms/char) + 600ms gap
  if (role === "assistant") return Math.max(2000, text.length * 70 + 600);
  // Caller line: short pause to simulate typing
  return 900;
}

export default function DemoCallModal({ businessId, agentName = "Maya", onClose }: Props) {
  const [state, setState]           = useState<CallState>("idle");
  const [seconds, setSeconds]       = useState(0);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [statusText, setStatusText] = useState("Ready to call");
  const [isMayaSpeaking, setIsMayaSpeaking] = useState(false);

  const timerRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const cancelRef     = useRef(false);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  useEffect(() => () => {
    cancelRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    window.speechSynthesis?.cancel();
  }, []);

  function startTimer() {
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  function formatTime(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  async function bookAppointment() {
    try {
      // Tomorrow at 14:00
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(14, 0, 0, 0);

      await fetch(`${API_BASE}/booking/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId === "demo-biz" ? "b1000000-0000-0000-0000-000000000001" : businessId,
          customer_name: "Rahul Sharma",
          customer_phone: "+919876543210",
          service: "Teeth Cleaning",
          scheduled_at: tomorrow.toISOString(),
          status: "confirmed",
          notes: "Booked via demo call",
        }),
      });
    } catch {
      // Booking failure is non-fatal for the demo
    }
  }

  async function runScript() {
    cancelRef.current = false;
    setState("active");
    startTimer();

    for (const line of SCRIPT) {
      if (cancelRef.current) break;

      if (line.role === "assistant") {
        setStatusText(`${agentName} is speaking…`);
        setIsMayaSpeaking(true);
        speak(line.text);
      } else {
        setStatusText("Caller speaking…");
        setIsMayaSpeaking(false);
      }

      setTranscript((t) => [...t, { role: line.role, text: line.text }]);

      if (line.bookAppt) {
        bookAppointment();
      }

      await new Promise<void>((res) => setTimeout(res, pauseAfter(line.role, line.text)));
      if (line.role === "assistant") setIsMayaSpeaking(false);
    }

    if (!cancelRef.current) {
      stopTimer();
      window.speechSynthesis?.cancel();
      setState("ended");
      setStatusText("Call ended");
    }
  }

  function endCall() {
    cancelRef.current = true;
    stopTimer();
    window.speechSynthesis?.cancel();
    setState("ended");
    setStatusText("Call ended");
  }

  const accent = "#A6FF4D";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-[#0F1510] border border-[#22291F] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-[#22291F] flex items-center justify-between">
          <div>
            <div className="font-medium">{agentName} — AI Receptionist</div>
            <div className="text-xs text-helio-mute mt-0.5">Live demo — SmileCraft Dental</div>
          </div>
          {state === "active" && (
            <div className="flex items-center gap-1.5 pill text-helio">
              <span className="w-2 h-2 rounded-full bg-helio animate-pulse" />
              {formatTime(seconds)}
            </div>
          )}
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center py-6 px-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold mb-4 transition-all duration-300"
            style={{
              background: state === "active" ? accent + "22" : "#1A211A",
              border: `2px solid ${state === "active" ? accent : "#22291F"}`,
              boxShadow: isMayaSpeaking ? `0 0 24px ${accent}66` : "none",
            }}
          >
            {state === "active"
              ? <span className="text-[#A6FF4D]">{agentName[0]}</span>
              : <Phone className="h-8 w-8 text-helio-mute" />}
          </div>
          <div className="text-sm text-helio-mute">{statusText}</div>
        </div>

        {/* Transcript */}
        {(state === "active" || state === "ended") && (
          <div
            ref={transcriptRef}
            className="mx-4 mb-4 max-h-52 overflow-y-auto space-y-2 panel-soft p-3 rounded-xl"
          >
            {transcript.length === 0 && (
              <div className="text-xs text-helio-mute text-center py-2">Starting call…</div>
            )}
            {transcript.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${
                    m.role === "user"
                      ? "bg-helio text-black"
                      : "bg-[#1A211A] text-white border border-[#22291F]"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {state === "ended" && (
              <div className="text-center text-[10px] text-helio-mute pt-1">Call ended · Appointment booked ✓</div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="p-5 border-t border-[#22291F] flex items-center justify-center gap-4">
          {state === "idle" && (
            <button
              onClick={runScript}
              className="flex items-center gap-2 px-6 py-3 rounded-full font-medium text-sm text-black"
              style={{ background: accent }}
            >
              <Phone className="h-4 w-4" /> Start demo call
            </button>
          )}

          {state === "connecting" && (
            <div className="text-sm text-helio-mute">Connecting…</div>
          )}

          {state === "active" && (
            <button
              onClick={endCall}
              className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition"
            >
              <PhoneOff className="h-5 w-5" />
            </button>
          )}

          {state === "ended" && (
            <div className="flex gap-3">
              <button
                onClick={() => { setTranscript([]); setState("idle"); setStatusText("Ready to call"); setSeconds(0); }}
                className="btn-ghost"
              >
                Call again
              </button>
              <button onClick={onClose} className="btn-primary">Done</button>
            </div>
          )}
        </div>

        {(state === "idle" || state === "ended") && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-helio-mute hover:text-white text-lg leading-none"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
