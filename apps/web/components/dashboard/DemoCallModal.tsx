"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";

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

export default function DemoCallModal({ businessId, agentName = "Maya", onClose }: Props) {
  const [state, setState]       = useState<CallState>("idle");
  const [muted, setMuted]       = useState(false);
  const [seconds, setSeconds]   = useState(0);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [statusText, setStatusText] = useState("Ready to call");

  const wsRef        = useRef<WebSocket | null>(null);
  const streamRef    = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioCtxRef  = useRef<AudioContext | null>(null);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const playQueueRef = useRef<Promise<void>>(Promise.resolve());
  const micBufferRef = useRef<Int16Array[]>([]);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const activeRef    = useRef(false);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  // Cleanup on unmount
  useEffect(() => () => { teardown(); }, []);

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

  // ── Audio helpers ──────────────────────────────────────────────────────────
  function float32ToInt16(buf: Float32Array): Int16Array {
    const out = new Int16Array(buf.length);
    for (let i = 0; i < buf.length; i++) {
      const s = Math.max(-1, Math.min(1, buf[i]));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return out;
  }

  function buildWav(samples: Int16Array, sampleRate: number): Uint8Array {
    const dataLen = samples.byteLength;
    const buf = new ArrayBuffer(44 + dataLen);
    const v = new DataView(buf);
    const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)); };
    str(0, "RIFF"); v.setUint32(4, 36 + dataLen, true);
    str(8, "WAVE"); str(12, "fmt ");
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    str(36, "data"); v.setUint32(40, dataLen, true);
    new Uint8Array(buf).set(new Uint8Array(samples.buffer), 44);
    return new Uint8Array(buf);
  }

  function flushMic() {
    if (!micBufferRef.current.length) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const total = micBufferRef.current.reduce((a, b) => a + b.length, 0);
    const pcm = new Int16Array(total);
    let off = 0;
    for (const chunk of micBufferRef.current) { pcm.set(chunk, off); off += chunk.length; }
    micBufferRef.current = [];
    wsRef.current.send(buildWav(pcm, 16000));
  }

  function playAudio(bytes: ArrayBuffer) {
    playQueueRef.current = playQueueRef.current.then(
      () =>
        new Promise<void>((resolve) => {
          const ctx = audioCtxRef.current!;
          ctx.decodeAudioData(
            bytes.slice(0),
            (decoded) => {
              setStatusText(`${agentName} is speaking…`);
              const src = ctx.createBufferSource();
              src.buffer = decoded;
              src.connect(ctx.destination);
              src.onended = () => {
                if (activeRef.current) setStatusText("Listening…");
                resolve();
              };
              src.start(0);
            },
            () => resolve()
          );
        })
    );
  }

  // ── Core call lifecycle ───────────────────────────────────────────────────
  async function startCall() {
    setState("connecting");
    setStatusText("Requesting mic…");

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
        video: false,
      });
    } catch {
      setStatusText("Mic access denied — allow mic in browser and try again");
      setState("idle");
      return;
    }
    streamRef.current = stream;

    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    const ctx = audioCtxRef.current;
    const source = ctx.createMediaStreamSource(stream);
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (!activeRef.current || muted) return;
      micBufferRef.current.push(float32ToInt16(e.inputBuffer.getChannelData(0)));
      const total = micBufferRef.current.reduce((a, b) => a + b.length, 0);
      if (total >= 16000) flushMic(); // flush every ~1 second
    };
    source.connect(processor);
    processor.connect(ctx.destination);

    // Open WebSocket
    const wsUrl = `${API_BASE.replace(/^http/, "ws")}/widget/stream/${businessId}`;
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    ws.onopen = () => {
      activeRef.current = true;
      setState("active");
      setStatusText("Listening…");
      startTimer();
    };

    ws.onmessage = (e) => {
      if (e.data instanceof ArrayBuffer) {
        // Audio bytes from TTS
        playAudio(e.data);
      } else {
        // JSON transcript events from server
        try {
          const msg = JSON.parse(e.data as string);
          if (msg.role && msg.text) {
            setTranscript((t) => [...t, { role: msg.role, text: msg.text }]);
          }
        } catch { /* binary-only mode — transcript built client-side */ }
      }
    };

    ws.onerror = () => setStatusText("Connection error — is the backend running?");

    ws.onclose = () => {
      if (activeRef.current) endCall();
    };
  }

  const teardown = useCallback(() => {
    activeRef.current = false;
    stopTimer();
    playQueueRef.current = Promise.resolve();
    micBufferRef.current = [];

    wsRef.current?.close();
    wsRef.current = null;

    processorRef.current?.disconnect();
    processorRef.current = null;

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  function endCall() {
    teardown();
    setState("ended");
    setStatusText("Call ended");
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      streamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
      return next;
    });
  }

  const accent = "#A6FF4D";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md mx-4 bg-[#0F1510] border border-[#22291F] rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="p-5 border-b border-[#22291F] flex items-center justify-between">
          <div>
            <div className="font-medium">{agentName} — AI Receptionist</div>
            <div className="text-xs text-helio-mute mt-0.5">{business_name_display(businessId)}</div>
          </div>
          {state === "active" && (
            <div className="flex items-center gap-1.5 pill text-helio">
              <span className="w-2 h-2 rounded-full bg-helio animate-pulse" />
              {formatTime(seconds)}
            </div>
          )}
        </div>

        {/* Avatar + status */}
        <div className="flex flex-col items-center py-8 px-6">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-semibold mb-4"
            style={{ background: state === "active" ? accent + "22" : "#1A211A", border: `2px solid ${state === "active" ? accent : "#22291F"}` }}
          >
            {state === "active" ? (
              <span className="text-[#A6FF4D]">{agentName[0]}</span>
            ) : (
              <Phone className="h-8 w-8 text-helio-mute" />
            )}
          </div>
          <div className="text-sm text-helio-mute">{statusText}</div>
        </div>

        {/* Transcript — shown during/after call */}
        {(state === "active" || state === "ended") && (
          <div
            ref={transcriptRef}
            className="mx-4 mb-4 max-h-48 overflow-y-auto space-y-2 panel-soft p-3 rounded-xl"
          >
            {transcript.length === 0 && (
              <div className="text-xs text-helio-mute text-center py-2">Transcript will appear here…</div>
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
            {state === "ended" && transcript.length > 0 && (
              <div className="text-center text-[10px] text-helio-mute pt-1">Call ended</div>
            )}
          </div>
        )}

        {/* Controls */}
        <div className="p-5 border-t border-[#22291F] flex items-center justify-center gap-4">
          {state === "idle" && (
            <button
              onClick={startCall}
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
            <>
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center border transition ${
                  muted ? "bg-red-500/20 border-red-500 text-red-400" : "border-[#22291F] text-helio-mute hover:border-helio"
                }`}
              >
                {muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <button
                onClick={endCall}
                className="w-12 h-12 rounded-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white transition"
              >
                <PhoneOff className="h-5 w-5" />
              </button>
            </>
          )}

          {state === "ended" && (
            <div className="flex gap-3">
              <button onClick={() => { setTranscript([]); setState("idle"); setStatusText("Ready to call"); setSeconds(0); }} className="btn-ghost">
                Call again
              </button>
              <button onClick={onClose} className="btn-primary">Done</button>
            </div>
          )}
        </div>

        {/* Close X */}
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

// The modal doesn't need to show the business name — placeholder helper
function business_name_display(_id: string) {
  return "Live demo — your real AI agent";
}
