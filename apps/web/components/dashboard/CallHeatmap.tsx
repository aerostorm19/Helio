"use client";

export default function CallHeatmap({ data }: { data: { day: string; hours: number[] }[] }) {
  const max = Math.max(1, ...data.flatMap((r) => r.hours));
  return (
    <div>
      <div className="grid grid-cols-[40px_repeat(24,minmax(0,1fr))] gap-1 text-[10px] text-helio-mute mb-1">
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="text-center tabular-nums">{h % 6 === 0 ? h : ""}</div>
        ))}
      </div>
      <div className="space-y-1">
        {data.map((row) => (
          <div key={row.day} className="grid grid-cols-[40px_repeat(24,minmax(0,1fr))] gap-1 items-center">
            <div className="text-[10px] uppercase text-helio-mute">{row.day}</div>
            {row.hours.map((v, h) => {
              const a = v / max;
              return (
                <div
                  key={h}
                  title={`${row.day} ${h}:00 — ${v} calls`}
                  className="aspect-square rounded-[3px]"
                  style={{
                    background: a > 0
                      ? `rgba(166,255,77,${0.08 + a * 0.85})`
                      : "rgba(34,41,31,.5)",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-helio-mute">
        <span>Less</span>
        {[0.1, 0.3, 0.5, 0.75, 1].map((a) => (
          <span key={a} className="h-3 w-3 rounded-[3px]" style={{ background: `rgba(166,255,77,${0.08 + a * 0.85})` }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
