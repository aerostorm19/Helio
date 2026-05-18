"use client";

import { useBusiness } from "@/hooks/useBusiness";

export default function IntegrationsPage() {
  const { data: business } = useBusiness();
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
        <button className="btn-primary mt-3">{business?.google_calendar_id ? "Reconnect" : "Connect"}</button>
      </Card>

      <Card title="Twilio phone number" status={business?.twilio_phone_number ? business.twilio_phone_number : "No number"}>
        <p className="text-sm text-helio-mute">Buy a number to receive real phone calls.</p>
        <button className="btn-primary mt-3">Buy a number</button>
      </Card>

      <Card title="WhatsApp Business" status={business?.meta_phone_number_id ? "Connected" : "Not connected"}>
        <p className="text-sm text-helio-mute">Send booking confirmations via WhatsApp.</p>
        <button className="btn-primary mt-3">Connect WhatsApp</button>
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
