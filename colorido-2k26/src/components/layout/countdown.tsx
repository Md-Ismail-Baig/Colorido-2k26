"use client";

import { useEffect, useState } from "react";

function getParts(target: number) {
  const diff = Math.max(0, target - Date.now());
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { d, h, m, s };
}

/** Live countdown to the festival date (28 December 2026, midnight IST). */
export function Countdown() {
  const [parts, setParts] = useState<ReturnType<typeof getParts> | null>(null);

  useEffect(() => {
    // 2026-12-28T00:00:00+05:30 (IST)
    const target = new Date("2026-12-28T00:00:00+05:30").getTime();
    setParts(getParts(target));
    const id = setInterval(() => setParts(getParts(target)), 1000);
    return () => clearInterval(id);
  }, []);

  const cells = [
    { label: "Days", value: parts?.d },
    { label: "Hours", value: parts?.h },
    { label: "Minutes", value: parts?.m },
    { label: "Seconds", value: parts?.s },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 sm:gap-6" role="timer" aria-label="Countdown to fest">
      {cells.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-white/10 bg-brand-deep-purple/70 p-3 text-center"
        >
          <span className="block font-heading text-2xl font-bold text-white sm:text-4xl">
            {c.value === undefined ? "–" : String(c.value).padStart(2, "0")}
          </span>
          <span className="text-[11px] uppercase tracking-wider text-slate-300">
            {c.label}
          </span>
        </div>
      ))}
    </div>
  );
}
