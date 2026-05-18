import Link from "next/link";
import { ArrowRight, PhoneCall, Calendar, MessageCircle, Sparkles, Zap, ShieldCheck } from "lucide-react";

export default function Landing() {
  return (
    <main className="relative overflow-hidden">
      {/* glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-helio/15 blur-[140px]" />
        <div className="absolute top-40 -right-20 h-72 w-72 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* nav */}
      <header className="relative z-10 border-b border-helio-edge/60">
        <div className="container max-w-7xl flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-helio grid place-items-center text-helio-ink font-bold">H</div>
            <div className="font-semibold">Helio</div>
            <span className="pill text-[10px] ml-2"><span className="status-dot bg-helio" /> v1.0</span>
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/overview" className="text-helio-mute hover:text-foreground px-3">Demo</Link>
            <Link href="/login" className="text-helio-mute hover:text-foreground px-3">Sign in</Link>
            <Link href="/register" className="btn-primary">Get started</Link>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="relative z-10 container max-w-6xl py-24 md:py-32 text-center">
        <div className="inline-flex items-center gap-2 pill text-helio mb-6 mx-auto">
          <Sparkles className="h-3 w-3" /> Always-on AI receptionist
        </div>
        <h1 className="text-5xl md:text-7xl font-display font-medium tracking-tight">
          Every call answered.<br />
          <span className="bg-gradient-to-r from-helio via-helio to-helio-dark bg-clip-text text-transparent">
            Every customer heard.
          </span>
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg text-helio-mute">
          Helio picks up the phone for your salon, clinic, or shop. It books appointments,
          answers FAQs, and only buzzes you when it really matters.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link href="/register" className="btn-primary px-5 py-3 text-base">
            Start free trial <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
          <Link href="/overview" className="btn-ghost px-5 py-3 text-base">View live dashboard</Link>
        </div>

        {/* mock dashboard preview */}
        <div className="relative mt-20">
          <div className="absolute -inset-x-20 top-10 h-40 bg-helio/10 blur-3xl rounded-full" />
          <div className="relative panel p-3 md:p-4 max-w-5xl mx-auto shadow-2xl shadow-helio/10">
            <div className="rounded-xl bg-helio-ink p-4 md:p-6 border border-helio-edge">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {[
                  { label: "Calls this month", value: "427", accent: true },
                  { label: "Bookings",         value: "312" },
                  { label: "Recovered",        value: "₹156k" },
                  { label: "Avg call",         value: "1:34" },
                ].map((c) => (
                  <div key={c.label} className={"panel-soft p-4 " + (c.accent ? "ring-1 ring-helio/30 bg-helio/10" : "")}>
                    <div className="text-[10px] uppercase text-helio-mute tracking-wide">{c.label}</div>
                    <div className={"text-2xl font-display font-medium mt-1 " + (c.accent ? "text-helio" : "")}>{c.value}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="panel-soft p-4 md:col-span-2">
                  <div className="text-xs text-helio-mute mb-3">Call volume · last 7 days</div>
                  <div className="flex items-end gap-1.5 h-32">
                    {[34,52,41,68,55,72,84].map((h, i) => (
                      <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-helio/30 to-helio" style={{ height: `${h}%` }} />
                    ))}
                  </div>
                </div>
                <div className="panel-soft p-4">
                  <div className="text-xs text-helio-mute mb-3">Conversion</div>
                  <div className="text-3xl font-display font-medium text-helio">73.1%</div>
                  <div className="mt-1 text-xs text-helio-mute">312 of 427 calls booked</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section className="relative z-10 container max-w-6xl py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: PhoneCall,    t: "Picks up in 1 ring",       d: "No customer left on hold. Voice-natural English + Hindi accents." },
            { icon: Calendar,     t: "Real-time booking",        d: "Direct Google Calendar slots. Zero double-booking." },
            { icon: MessageCircle,t: "WhatsApp confirmations",   d: "Customers get an instant message. They show up." },
            { icon: Zap,          t: "<2s latency",              d: "Powered by Gemini Flash and cached TTS. Feels human." },
            { icon: ShieldCheck,  t: "Hands off to you",         d: "Detects frustration, complaints, and transfers instantly." },
            { icon: Sparkles,     t: "Learns your business",     d: "FAQs, services, working hours — all in one onboarding." },
          ].map((f) => (
            <div key={f.t} className="panel p-6 hover:bg-helio-surface/60 transition group">
              <div className="h-10 w-10 rounded-xl bg-helio/15 text-helio grid place-items-center group-hover:bg-helio group-hover:text-helio-ink transition">
                <f.icon className="h-5 w-5" />
              </div>
              <div className="mt-4 font-medium">{f.t}</div>
              <div className="mt-1 text-sm text-helio-mute">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-helio-edge/60 mt-10">
        <div className="container max-w-7xl py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-helio-mute">
          <div>© 2026 Helio · Every call answered.</div>
          <div className="flex gap-4">
            <Link href="/login">Sign in</Link>
            <Link href="/overview">Demo</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
