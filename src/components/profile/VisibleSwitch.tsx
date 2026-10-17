"use client";

import { useState } from "react";
import Link from "next/link";
import { useMe } from "@/components/MeProvider";

type Missing = { key: string; label: string; href: string };

// VR-E005: "Visible to buyers" On/Off (paused_at). Off hides you from search, Shop and your profile page; the catalog is untouched.
// Turning it on only works when nothing is missing — otherwise the list shows, each linked to its fix.
export function useVisibleSwitch() {
  const { me, refresh } = useMe();
  const p = me?.providerProfile ?? null;
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState<Missing[]>([]);
  const set = async (on: boolean) => {
    setBusy(true);
    setMissing([]);
    const r = await fetch("/api/settings/pause", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paused: !on }) }).catch(() => null);
    if (!r?.ok) {
      const j = (await r?.json().catch(() => ({}))) as { missing?: Missing[] };
      setMissing(j.missing?.length ? j.missing : p?.missing ?? []);
    }
    refresh();
    setBusy(false);
  };
  return { p, on: !!p && !p.paused, busy, missing, set };
}

export function MissingList({ missing, onNavigate }: { missing: Missing[]; onNavigate?: () => void }) {
  if (!missing.length) return null;
  return (
    <p role="alert" className="mt-1.5 text-[12.5px] text-ink-2" data-visible-missing>
      <b>Add first:</b>{" "}
      {missing.map((m, i) => (
        <span key={m.key}>
          {i > 0 && " · "}
          <Link href={m.href} onClick={onNavigate} className="font-semibold text-magenta-dark underline underline-offset-4">{m.label}</Link>
        </span>
      ))}
    </p>
  );
}

export function VisibleSwitch({ className = "", onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { p, on, busy, missing, set } = useVisibleSwitch();
  if (!p) return null;
  return (
    <div className={className} data-visible-switch>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy}
        onClick={() => void set(!on)}
        className="flex w-full items-center gap-2.5 rounded-[10px] border border-line px-3 py-2 text-left transition-colors hover:border-magenta/40 disabled:opacity-60"
      >
        <span className="flex-1 text-[13.5px] font-semibold">Visible to buyers</span>
        <span className="text-[12px] font-semibold text-ink-2">{on ? "On" : "Off"}</span>
        <span aria-hidden className={on ? "relative h-[18px] w-8 shrink-0 rounded-full bg-magenta transition-colors" : "relative h-[18px] w-8 shrink-0 rounded-full bg-line transition-colors"}>
          <span className={on ? "absolute left-[16px] top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all" : "absolute left-[2px] top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-all"} />
        </span>
      </button>
      <MissingList missing={missing} onNavigate={onNavigate} />
    </div>
  );
}
