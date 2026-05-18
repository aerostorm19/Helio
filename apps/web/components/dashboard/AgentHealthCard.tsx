"use client";

import { Activity, Cpu, Mic, Volume2 } from "lucide-react";

export default function AgentHealthCard() {
  const items = [
    { icon: Cpu,    label: "LLM latency",  value: "642 ms", bar: 0.42, hint: "Gemini Flash" },
    { icon: Mic,    label: "STT accuracy", value: "94.2 %", bar: 0.94, hint: "Twilio + Whisper" },
    { icon: Volume2,label: "TTS cache",    value: "87 %",   bar: 0.87, hint: "hits / synth" },
    { icon: Activity,label:"Uptime",       value: "99.98%", bar: 0.999,hint: "30 days" },
  ];
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium">Agent health</div>
          <div className="text-xs text-helio-mute">Live system telemetry</div>
        </div>
        <span className="pill text-helio"><span className="status-dot bg-helio" /> Healthy</span>
      </div>
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.label}>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-helio-mute">
                <it.icon className="h-3.5 w-3.5" /> {it.label}
              </div>
              <div className="tabular-nums">{it.value}</div>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-helio-edge overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-helio to-helio-dark"
                style={{ width: `${Math.round(it.bar * 100)}%` }}
              />
            </div>
            <div className="text-[10px] text-helio-mute/70 mt-0.5">{it.hint}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
