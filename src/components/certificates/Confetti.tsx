"use client";

import { useEffect, useState } from "react";

const COLORS = ["#C81E8C", "#7A1F86", "#3D1A5B", "#F3B6F0", "#ffffff"];

// L-E056: a short burst on the pass screen; nothing when reduced motion is on.
export function Confetti() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setOn(true);
    const t = setTimeout(() => setOn(false), 2600);
    return () => clearTimeout(t);
  }, []);
  if (!on) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <style>{`@keyframes pm-confetti { 0% { transform: translate3d(0,-10vh,0) rotate(0); opacity: 1 } 100% { transform: translate3d(var(--dx), 105vh, 0) rotate(var(--r)); opacity: .9 } }`}</style>
      {Array.from({ length: 70 }, (_, i) => (
        <span
          key={i}
          style={{
            position: "absolute", top: 0, left: `${(i * 37) % 100}%`, width: 8, height: 12, background: COLORS[i % COLORS.length],
            animation: `pm-confetti ${1.6 + ((i * 13) % 10) / 10}s cubic-bezier(.2,.6,.4,1) ${((i * 7) % 10) / 20}s forwards`,
            ["--dx" as string]: `${((i * 53) % 200) - 100}px`, ["--r" as string]: `${(i * 97) % 720}deg`,
          }}
        />
      ))}
    </div>
  );
}
