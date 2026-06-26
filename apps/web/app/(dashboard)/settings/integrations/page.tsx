"use client";

import { useState } from "react";
import { useBusiness } from "@/hooks/useBusiness";
import { markCalendarConnected, updateLocalBusiness } from "@/lib/demo";

export default function IntegrationsPage() {
  const { data: business, mutate } = useBusiness();
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);

  function connectCalendar() {
    setLoadingCalendar(true);
    // Demo mode: simulate the OAuth round-trip and mark connected locally.
    setTimeout(() => {
      const updated = markCalendarConnected();
      if (updated) mutate(updated, { revalidate: false });
      setLoadingCalendar(false);
    }, 1200);
  }

  async function loadAvailableNumbers() {
    if (!business?.id) return;
    setLoadingNumbers(true);
    // Demo mode: offer a few sample Indian numbers to "buy".
    setTimeout(() => {
      setAvailableNumbers(["+91 20 6900 1234", "+91 20 6900 5678", "+91 22 4800 9012"]);
      setLoadingNumbers(false);
    }, 900);
  }

  async function buyNumber(num: string) {
    if (!business?.id) return;
    setBuyingNumber(num);
    setTimeout(() => {
      const updated = updateLocalBusiness({ twilio_phone_number: num });
      if (updated) mutate(updated, { revalidate: false });
      setAvailableNumbers([]);
      setBuyingNumber(null);
    }, 900);
  }

  const embed = business
    ? `<script>window.HelioConfig={businessId:"${business.id}",accentColor:"#A6FF4D"}</script>\n<script src="https://app.tryhelio.com/widget.js" async></script>`
    : "";

  return (
    <div className="space-y-4 max-w-3xl">
      <div>
        <h1 className="text-2xl font-display font-medium">Integrations</h1>
        <p className="text-helio-mute text-sm">Connect your phone, calendar, and messaging.</p>
      </div>

      <Card title="Google Calendar" status={business?.google_calendar_id ? "Connected" : "Not connected"}>
        <p className="text-sm text-helio-mute">Helio reads availability and writes events here.</p>
        <button className="btn-primary mt-3" onClick={connectCalendar} disabled={loadingCalendar}>
          {loadingCalendar ? "Connecting..." : business?.google_calendar_id ? "Reconnect" : "Connect"}
        </button>
      </Card>

      <Card title="Twilio phone number" status={business?.twilio_phone_number ? business.twilio_phone_number : "No number"}>
        <p className="text-sm text-helio-mute">Buy a number to receive real phone calls.</p>
        
        {availableNumbers.length > 0 ? (
          <div className="mt-4 space-y-2">
            <div className="text-xs text-helio-mute">Select a number to buy:</div>
            {availableNumbers.map((num) => (
              <div key={num} className="flex items-center justify-between panel-soft p-3 rounded-lg">
                <span className="text-sm font-mono">{num}</span>
                <button 
                  className="btn-primary text-xs py-1 px-3" 
                  disabled={buyingNumber !== null} 
                  onClick={() => buyNumber(num)}
                >
                  {buyingNumber === num ? "Buying..." : "Buy"}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <button className="btn-primary mt-3" onClick={loadAvailableNumbers} disabled={loadingNumbers}>
            {loadingNumbers ? "Searching..." : "Buy a number"}
          </button>
        )}
      </Card>

      <Card title="WhatsApp Business" status={business?.meta_phone_number_id ? "Connected" : "Not connected"}>
        <p className="text-sm text-helio-mute">Send booking confirmations via WhatsApp.</p>
        <button className="btn-primary mt-3" onClick={() => {
          const updated = updateLocalBusiness({ meta_phone_number_id: "demo-wa", whatsapp_number: business?.phone || null });
          if (updated) mutate(updated, { revalidate: false });
        }}>Connect WhatsApp</button>
      </Card>

      <Card title="Browser call widget" status="Ready">
        <p className="text-sm text-helio-mute">Paste this on your website for a one-click voice call.</p>
        <pre className="mt-3 panel-soft p-3 text-xs overflow-x-auto whitespace-pre-wrap">{embed}</pre>
      </Card>
    </div>
  );
}

function Card({ title, status, children }: { title: string; status: string; children: React.ReactNode }) {
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">{title}</div>
        <span className="pill">{status}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
