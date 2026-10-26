"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// HT-E004/E005: Get Sold · Make Money (seller) / Get Started · Get Work Done (buyer) on the At a Glance header.
export function ViewSwitch({ view, labels }: { view: "start" | "work"; labels: [string, string] }) {
  const router = useRouter();
  const [cur, setCur] = useState(view);
  const [, start] = useTransition();
  const pick = async (v: "start" | "work") => {
    if (v === cur) return;
    setCur(v);
    await fetch("/api/dashboard/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ view: v }) }).catch(() => null);
    start(() => router.refresh());
  };
  return (
    <span className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-semibold" role="group" aria-label="At a Glance view" data-view-switch>
      {(["start", "work"] as const).map((v, i) => (
        <button key={v} type="button" aria-pressed={cur === v} onClick={() => void pick(v)} className={cur === v ? "rounded-full bg-ink px-3 py-1 text-surface" : "rounded-full px-3 py-1 text-ink-2 hover:text-ink"}>{labels[i]}</button>
      ))}
    </span>
  );
}
