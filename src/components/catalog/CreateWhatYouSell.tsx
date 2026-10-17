"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StepRail } from "@/components/onboarding/StepRail";
import { GetFoundRates } from "@/components/onboarding/GetFoundRates";
import { ProductsGrid } from "@/components/catalog/ProductsGrid";

// CWS-E002–E005: Create What You Sell, slimmed — three stops in the app casing. Plain words; fits one screen.
type State = { live: boolean; servicesOn: { name: string; rateCents: number; unit: string | null }[]; productsOn: { name: string; priceCents: number; monthly: boolean }[] };
// CG-E001: four stops (Scott 10-17).
// RF-E006 (Scott 10-17): the catalog is services and products only — skills are built at registration.
const STOPS = [{ key: "services", label: "Your Services" }, { key: "products", label: "Your Service Products" }, { key: "enable", label: "Enable" }];
const BTN = "inline-flex min-h-[44px] items-center justify-center bg-ink px-6 text-[14.5px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40";
const GHOST = "inline-flex min-h-[44px] items-center justify-center border border-ink px-5 text-[14.5px] font-semibold";
const money = (c: number | null) => (c != null ? `$${(c / 100).toLocaleString("en-US")}` : "—");

export function CreateWhatYouSell() {
  const router = useRouter();
  const [s, setS] = useState<State | null>(null);
  const [stop, setStop] = useState(0);
  const [reached, setReached] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <p className="mt-4 text-[12px] font-bold tracking-[0.1em] text-magenta-dark">STEP {stop + 1} OF 3 · {STOPS[stop].label.toUpperCase()}</p>
      {body}
      {error && <p role="alert" className="mt-4 text-[14px] font-semibold text-magenta-dark">{error}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        {stop > 0 ? <button type="button" onClick={() => go(stop - 1)} className={GHOST}>Back</button> : <button type="button" onClick={() => router.push("/dashboard")} className={GHOST}>Finish later</button>}
        <button type="button" disabled={busy || next.disabled} onClick={next.onClick} className={BTN}>{busy ? "Saving…" : next.label}</button>
      </div>
    </div>
  );

  // ---- Stop 2: Your Services (CG-E002) — the Your Rates grid --------------------
  if (stop === 0) {
    return shell(
      <div className="mt-1" data-stop="services">
        <h1 className="text-[26px] font-extrabold">Your Services</h1>
        <p className="mt-1 text-[14.5px] text-ink-2">Turn on the services you offer and add your rate. Saved as you go.</p>
        <div className="mt-3"><GetFoundRates /></div>
      </div>,
      { label: "Next: Your Service Products", onClick: async () => { await load(); go(1); } },
    );
  }

  // ---- Stop 3: Your Service Products (CG-E003) -------------------------------
  if (stop === 1) {
    return shell(
      <div className="mt-1" data-stop="products">
        <h1 className="text-[26px] font-extrabold">Your Service Products</h1>
        <p className="mt-1 text-[14.5px] text-ink-2">One row per product. Turn on the ones you sell and fill in the row. Need two of the same type? Add another. Pictures and a PDF are optional.</p>
        <div className="mt-3"><ProductsGrid /></div>
      </div>,
      { label: "Next: Enable", onClick: async () => { await load(); go(2); } },
    );
  }

  // ---- Stop 4: Enable (CG-E004) ------------------------------------------------
  const per = (u: string | null) => ({ HOUR: "/hr", DAY: "/day", WEEK: "/wk", MONTH: "/mo", SESSION: "/session", VISIT: "/visit" } as Record<string, string>)[u ?? ""] ?? "";
  const block = (title: string, lines: string[], to: number, empty: string) => (
    <section className="border-b border-line px-5 py-3 last:border-0" data-enable-block={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-2">{title}</h2>
        <button type="button" onClick={() => go(to)} className="text-[13.5px] font-bold text-magenta hover:underline">Edit</button>
      </div>
      {lines.length ? <ul className="mt-1 text-[15px]">{lines.map((l, i) => <li key={i}>{l}</li>)}</ul> : <p className="mt-1 text-[14px] text-ink-3">{empty}</p>}
    </section>
  );
  const ready = s.servicesOn.length > 0 || s.productsOn.length > 0;
  return shell(
    <div className="mt-1" data-stop="enable">
      <h1 className="text-[26px] font-extrabold">{s.live ? "You're live" : "Ready to go live?"}</h1>
      <div className="mt-4 overflow-hidden border border-line">
        {block("Your services", s.servicesOn.map((x) => `${x.name} — ${money(x.rateCents)}${per(x.unit)}`), 0, "No services on.")}
        {block("Your service products", s.productsOn.map((x) => `${x.name} — ${money(x.priceCents)}${x.monthly ? "/mo" : ""}`), 1, "No products on.")}
      </div>
      {!ready && <p className="mt-3 text-[13.5px] font-semibold text-magenta-dark">Turn on at least one service or one product to enable your catalog.</p>}
    </div>,
    { label: "Enable My Catalog", disabled: !ready, onClick: async () => { if (await post({ stop: "enable" })) router.push("/dashboard"); } },
  );
}
