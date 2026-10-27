"use client";

import Link from "next/link";
import { useState } from "react";
import { DashPies } from "@/components/dashboard/DashGlance";
import type { Donut } from "@/lib/dashboard/types";
import type { AttentionItem } from "@/lib/attention";

// 10-27: both views' tiles arrive with the page; the switch flips them in place and saves the pick in the background.
export function GlanceSwitch({ views, view, labels, side, actions, seeAll }: { views: { start: Donut[]; work: Donut[] }; view: "start" | "work"; labels: [string, string]; side: string; actions: AttentionItem[]; seeAll: { href: string; label: string } }) {
  const [cur, setCur] = useState(view);
  const pick = (v: "start" | "work") => {
    if (v === cur) return;
    setCur(v);
    void fetch("/api/dashboard/view", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ view: v }), keepalive: true }).catch(() => null);
  };
  return (
    <>
      <div className="flex flex-wrap items-baseline gap-3 border-b border-ink pb-2">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-ink text-[13px] font-bold text-surface">1</span>
        <h2 className="text-[20px] font-extrabold">At a Glance</h2>
        <span className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-semibold" role="group" aria-label="At a Glance view" data-view-switch>
          {(["start", "work"] as const).map((v, i) => (
            <button key={v} type="button" aria-pressed={cur === v} onClick={() => pick(v)} className={cur === v ? "rounded-full bg-ink px-3 py-1 text-surface" : "rounded-full px-3 py-1 text-ink-2 hover:text-ink"}>{labels[i]}</button>
          ))}
        </span>
        <Link href={seeAll.href} className="ml-auto text-[13px] font-semibold text-ink-2 hover:text-ink" data-see-all-transactions>{seeAll.label}</Link>
      </div>
      <div className="mt-3"><DashPies donuts={views[cur]} side={side} compact actions={actions} /></div>
    </>
  );
}
