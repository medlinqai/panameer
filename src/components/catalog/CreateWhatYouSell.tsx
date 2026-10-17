"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StepRail } from "@/components/onboarding/StepRail";
import { WhatYouDoModes } from "@/components/catalog/WhatYouDoModes";
import { GetFoundRates } from "@/components/onboarding/GetFoundRates";

// CWS-E002–E005: Create What You Sell, slimmed — three stops in the app casing. Plain words; fits one screen.
type Item = { id: string; name: string };
type Pkg = { id?: string | null; name: string; included: string; priceCents: number | null; perMonth: boolean; readyDays: number | null };
type State = {
  live: boolean; title: string; skills: Item[]; suggestions: Item[]; industries: Item[]; allIndustries: Item[];
  hourlyCents: number | null; monthly: { priceCents: number | null; hours: number | null } | null; packages: (Pkg & { status?: string })[];
};
// CG-E001: four stops (Scott 10-17).
const STOPS = [{ key: "do", label: "What You Do" }, { key: "services", label: "Your Services" }, { key: "products", label: "Your Service Products" }, { key: "enable", label: "Enable" }];
const BTN = "inline-flex min-h-[44px] items-center justify-center bg-ink px-6 text-[14.5px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40";
const GHOST = "inline-flex min-h-[44px] items-center justify-center border border-ink px-5 text-[14.5px] font-semibold";
const money = (c: number | null) => (c != null ? `$${(c / 100).toLocaleString("en-US")}` : "—");

export function CreateWhatYouSell({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();
  const [s, setS] = useState<State | null>(null);
  const [stop, setStop] = useState(0);
  const [reached, setReached] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stop 1: Next confirms the modes; without Global Taxonomy a non-admin goes straight to Your Services.
  const skipDo = useCallback(() => { setStop((v) => (v === 0 ? 1 : v)); setReached((r) => Math.max(r, 1)); }, []);
  const nextFromDo = useCallback(async () => {
    setBusy(true);
    // Each row's pre-selected mode (the résumé's guess) is confirmed — Scott's "confirm the mode".
    const b = await fetch("/api/provider/capabilities").then((r) => (r.ok ? r.json() : null)).catch(() => null);
    for (const c of (b?.capabilities ?? []) as { id: string; mode: string; confirmed: boolean }[]) {
      if (!c.confirmed) await fetch("/api/provider/capabilities", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "confirm", id: c.id, mode: c.mode }) }).catch(() => null);
    }
    setBusy(false);
    setError(null);
    setStop(1);
    setReached((r) => Math.max(r, 1));
  }, []);

  const apply = useCallback((r: State | null) => {
    if (!r) return setError("Couldn't load your catalog.");
    setS(r);
  }, []);
  const fetchState = () => fetch("/api/catalog/create").then((x) => (x.ok ? (x.json() as Promise<State>) : null)).catch(() => null);
  const load = async () => apply(await fetchState());
  useEffect(() => {
    fetchState().then(apply);
  }, [apply]);


  const go = (i: number) => { setError(null); setStop(i); setReached((r) => Math.max(r, i)); };
  const post = async (body: object) => {
    setBusy(true);
    setError(null);
    const r = await fetch("/api/catalog/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setError(j?.error ?? "That didn't save."); return false; }
    return true;
  };

  if (!s) return <p className="py-10 text-ink-2">{error ?? "Loading…"}</p>;

  const shell = (body: React.ReactNode, next: { label: string; onClick: () => void; disabled?: boolean }) => (
    <div className="mx-auto w-full max-w-3xl" data-create-what-you-sell>
      <StepRail steps={STOPS} current={stop} review={false} reached={reached} onPick={go} />
      <p className="mt-4 text-[12px] font-bold tracking-[0.1em] text-magenta-dark">STEP {stop + 1} OF 4 · {STOPS[stop].label.toUpperCase()}</p>
      {body}
      {error && <p role="alert" className="mt-4 text-[14px] font-semibold text-magenta-dark">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {stop > 0 ? <button type="button" onClick={() => go(stop - 1)} className={GHOST}>Back</button> : <button type="button" onClick={() => router.push("/dashboard")} className={GHOST}>Finish later</button>}
        <button type="button" disabled={busy || next.disabled} onClick={next.onClick} className={BTN}>{busy ? "Saving…" : next.label}</button>
      </div>
    </div>
  );

  // ---- Stop 1: What You Do (CG-E005) -----------------------------------------
  if (stop === 0) {
    return shell(
      <div className="mt-1" data-stop="do">
        <h1 className="text-[26px] font-extrabold">How do you work with what you know?</h1>
        <p className="mt-1 text-[14.5px] text-ink-2">We read these from your profile. Tell buyers how you work with each one.</p>
        <WhatYouDoModes skills={s.skills} isAdmin={isAdmin} onSkip={skipDo} />
      </div>,
      { label: "Next: Your Services", onClick: nextFromDo },
    );
  }

  // ---- Stop 2: Your Services (CG-E002) — the Your Rates grid --------------------
  if (stop === 1) {
    return shell(
      <div className="mt-1" data-stop="services">
        <h1 className="text-[26px] font-extrabold">Your Services</h1>
        <p className="mt-1 text-[14.5px] text-ink-2">Turn on the services you offer and add your rate. Saved as you go.</p>
        <div className="mt-3"><GetFoundRates /></div>
      </div>,
      { label: "Next: Your Service Products", onClick: async () => { await load(); go(2); } },
    );
  }

  // ---- Stop 3: Your Service Products (CG-E003) -------------------------------
  if (stop === 2) {
    return shell(<div className="mt-1" data-stop="products"><h1 className="text-[26px] font-extrabold">Your Service Products</h1></div>, { label: "Next: Enable", onClick: () => go(3) });
  }

  // ---- Stop 3: Enable My Catalog ---------------------------------------------
  const charge = [
    s.hourlyCents != null && `${money(s.hourlyCents)} an hour`,
    s.monthly?.priceCents && `${money(s.monthly.priceCents)} a month${s.monthly.hours ? ` (${s.monthly.hours} hours)` : ""}`,
    ...s.packages.map((p) => `${p.name} — ${money(p.priceCents)}${p.perMonth ? " a month" : ""}`),
  ].filter(Boolean) as string[];
  const row = (label: string, value: string, to: number) => (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-line px-5 py-3 last:border-0">
      <dt className="w-32 shrink-0 text-[13px] font-bold uppercase tracking-wide text-ink-2">{label}</dt>
      <dd className="min-w-0 flex-1 text-[15px]">{value || "—"}</dd>
      <button type="button" onClick={() => go(to)} className="text-[13.5px] font-bold text-magenta hover:underline">Edit</button>
    </div>
  );
  return shell(
    <div className="mt-1" data-stop="enable">
      <h1 className="text-[26px] font-extrabold">{s.live ? "You're live" : "Ready to go live?"}</h1>
      <dl className="mt-4 overflow-hidden border border-line">
        {row("Title", s.title, 0)}
        {row("Skills", s.skills.map((x) => x.name).join(", "), 0)}
        {row("Industries", s.industries.map((x) => x.name).join(", "), 0)}
        {row("You charge", charge.join(" · "), 1)}
      </dl>
      <p className="mt-4 text-[13.5px] text-ink-2">Later, in My Catalog (optional): expenses, onsite vs. remote, open to offers, package pictures, process areas, deliverables, payment terms.</p>
    </div>,
    { label: "Enable My Catalog", onClick: async () => { if (await post({ stop: "enable" })) router.push("/dashboard"); } },
  );
}
