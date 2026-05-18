"use client";

export default function TopFaqsCard({ faqs }: { faqs: { q: string; hits: number }[] }) {
  const max = Math.max(...faqs.map((f) => f.hits), 1);
  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-medium">Top FAQs this month</div>
        <span className="text-xs text-helio-mute">hits</span>
      </div>
      <div className="space-y-3">
        {faqs.map((f, i) => (
          <div key={i}>
            <div className="flex items-center justify-between text-sm">
              <div className="truncate pr-3">{f.q}</div>
              <div className="text-helio tabular-nums">{f.hits}</div>
            </div>
            <div className="mt-1 h-1 rounded-full bg-helio-edge overflow-hidden">
              <div className="h-full bg-helio/70 rounded-full" style={{ width: `${(f.hits / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
