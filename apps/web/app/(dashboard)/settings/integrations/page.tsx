"use client";

import { useEffect, useState } from "react";
import { useBusiness } from "@/hooks/useBusiness";
import { api } from "@/lib/api";

export default function IntegrationsPage() {
  const { data: business, mutate } = useBusiness();
  const [loadingCalendar, setLoadingCalendar] = useState(false);
  const [loadingNumbers, setLoadingNumbers] = useState(false);
  const [availableNumbers, setAvailableNumbers] = useState<string[]>([]);
  const [buyingNumber, setBuyingNumber] = useState<string | null>(null);

  // Listen for Google Calendar redirect callback code
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (code && business?.id) {
      setLoadingCalendar(true);
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
      
      fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/business/${business.id}/calendar/connect?code=${encodeURIComponent(code)}`, {
        method: "POST",
      })
        .then((res) => {
          if (res.ok) mutate();
        })
        .catch(console.error)
        .finally(() => setLoadingCalendar(false));
    }
  }, [business?.id]);

  function connectCalendar() {
    const client_id = "469334427023-86e5rsjup7mu1aqc7ggh6q1evo1oiqbb.apps.googleusercontent.com";
    const redirect_uri = `${window.location.origin}/settings/integrations`;
    const scope = "https://www.googleapis.com/auth/calendar";
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${encodeURIComponent(redirect_uri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
  }

  async function loadAvailableNumbers() {
    if (!business?.id) return;
    setLoadingNumbers(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/business/${business.id}/phone-numbers`);
      if (res.ok) {
        const data = await res.json();
        setAvailableNumbers(data.numbers || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNumbers(false);
    }
  }

  async function buyNumber(num: string) {
    if (!business?.id) return;
    setBuyingNumber(num);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/business/${business.id}/phone-numbers/buy?phone_number=${encodeURIComponent(num)}`, {
        method: "POST",
      });
      if (res.ok) {
        mutate();
        setAvailableNumbers([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBuyingNumber(null);
    }
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
        <button className="btn-primary mt-3" onClick={async () => {
          if (!business?.id) return;
          // Connect placeholder for testing
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"}/business/${business.id}/whatsapp/connect?waba_id=12345&phone_number_id=67890`, {
            method: "POST"
          });
          mutate();
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
