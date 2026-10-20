"use client";

import { useEffect, useState } from "react";

/** SE-E004/E005: time left to a Sourcing Event deadline ("1 d 4 h left" · "Closed"). */
export function Countdown({ at, className = "" }: { at: string; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const t = setInterval(tick, 30_000);
    return () => clearInterval(t);
  }, []);
  if (now == null) return <span className={className}>&nbsp;</span>;
  const ms = new Date(at).getTime() - now;
  if (ms <= 0) return <span className={className} data-countdown="closed">Closed</span>;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const text = h >= 24 ? `${Math.floor(h / 24)} d ${h % 24} h left` : h > 0 ? `${h} h ${m} min left` : `${m} min left`;
  return <span className={className} data-countdown>{text}</span>;
}
