"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StepRail } from "@/components/onboarding/StepRail";
import { TitleEditor } from "@/components/onboarding/editors/TitleEditor";

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
const INPUT = "block w-full border border-line bg-surface px-3 py-2 text-[15px]";
const CHIP = "inline-flex items-center gap-1 border border-ink bg-ink px-2.5 py-1 text-[13px] text-surface";
const dollars = (c: number | null | undefined) => (c != null ? String(c / 100) : "");
const cents = (v: string) => (v.trim() && Number(v) > 0 ? Math.round(Number(v) * 100) : null);
const money = (c: number | null) => (c != null ? `$${(c / 100).toLocaleString("en-US")}` : "—");

export function CreateWhatYouSell() {
  const router = useRouter();
  const [s, setS] = useState<State | null>(null);
  const [stop, setStop] = useState(0);
  const [reached, setReached] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stop 1
  const [title, setTitle] = useState("");
  const [skills, setSkills] = useState<Item[]>([]);
  const [industries, setIndustries] = useState<Item[]>([]);
  const [q, setQ] = useState("");
  const [found, setFound] = useState<Item[]>([]);
  const [addInd, setAddInd] = useState("");
  // Stop 2
  const [picks, setPicks] = useState({ hour: false, month: false, pkg: false });
  const [hourly, setHourly] = useState("");
  const [monthly, setMonthly] = useState({ price: "", hours: "" });
  const [pkgs, setPkgs] = useState<{ id?: string | null; name: string; included: string; price: string; perMonth: boolean; ready: string }[]>([]);

  const apply = useCallback((r: State | null) => {
    if (!r) return setError("Couldn't load your catalog.");
    setS(r);
    setTitle(r.title);
    setSkills(r.skills);
    setIndustries(r.industries);
    setHourly(dollars(r.hourlyCents));
    setMonthly({ price: dollars(r.monthly?.priceCents), hours: r.monthly?.hours ? String(r.monthly.hours) : "" });
    setPkgs(r.packages.map((p) => ({ id: p.id, name: p.name, included: p.included, price: dollars(p.priceCents), perMonth: p.perMonth, ready: p.readyDays != null ? String(p.readyDays) : "" })));
    setPicks({ hour: r.hourlyCents != null, month: !!r.monthly?.priceCents, pkg: r.packages.length > 0 });
  }, []);
  const fetchState = () => fetch("/api/catalog/create").then((x) => (x.ok ? (x.json() as Promise<State>) : null)).catch(() => null);
  const load = async () => apply(await fetchState());
  useEffect(() => {
    fetchState().then(apply);
  }, [apply]);

  useEffect(() => {
    if (q.trim().length < 2) return;
    const t = setTimeout(() => fetch(`/api/catalog/create?q=${encodeURIComponent(q)}`).then((r) => r.json()).then((b) => setFound(b.skills ?? [])).catch(() => {}), 200);
    return () => clearTimeout(t);
  }, [q]);

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

  const has = new Set(skills.map((x) => x.id));
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

  // ---- Stop 1: What You Do ---------------------------------------------------
  if (stop === 0) {
    const suggestions = s.suggestions.filter((x) => !has.has(x.id));
    return shell(
      <div className="mt-1 space-y-5" data-stop="do">
        <h1 className="text-[26px] font-extrabold">What do you do?</h1>
        <section>
          <p className="mb-1 text-[14px] font-bold">Your title</p>
          <TitleEditor value={title} onChange={setTitle} />
        </section>
        <section>
          <p className="text-[14px] font-bold">Skills buyers can find you by</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {skills.map((x) => <button key={x.id} type="button" onClick={() => setSkills((v) => v.filter((y) => y.id !== x.id))} className={CHIP} aria-label={`Remove ${x.name}`}>{x.name} <span aria-hidden>×</span></button>)}
            {!skills.length && <span className="text-[13.5px] text-ink-2">No skills yet — add a few below.</span>}
          </div>
          {suggestions.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-[12.5px] text-ink-2">Suggested:</span>
              {suggestions.map((x) => <button key={x.id} type="button" onClick={() => setSkills((v) => [...v, x])} className="border border-line px-2.5 py-1 text-[13px] hover:border-ink">+ {x.name}</button>)}
            </div>
          )}
          <div className="relative mt-2 max-w-sm">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="+ Add a skill" aria-label="Add a skill" className={INPUT} />
            {q.trim().length >= 2 && found.length > 0 && (
              <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-auto border border-line bg-surface shadow-sm">
                {found.filter((x) => !has.has(x.id)).map((x) => <li key={x.id}><button type="button" onClick={() => { setSkills((v) => [...v, x]); setQ(""); setFound([]); }} className="block w-full px-3 py-2 text-left text-[14px] hover:bg-surface-hover">{x.name}</button></li>)}
              </ul>
            )}
          </div>
        </section>
        <section>
          <p className="text-[14px] font-bold">Industries you&apos;ve worked in <span className="font-normal text-ink-2">(optional)</span></p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {industries.map((x) => <button key={x.id} type="button" onClick={() => setIndustries((v) => v.filter((y) => y.id !== x.id))} className={CHIP} aria-label={`Remove ${x.name}`}>{x.name} <span aria-hidden>×</span></button>)}
            <select value={addInd} onChange={(e) => { const it = s.allIndustries.find((x) => x.id === e.target.value); if (it) setIndustries((v) => (v.some((y) => y.id === it.id) ? v : [...v, it])); setAddInd(""); }} aria-label="Add an industry" className="border border-line bg-surface px-2 py-1 text-[13px]">
              <option value="">+ Add</option>
              {s.allIndustries.filter((x) => !industries.some((y) => y.id === x.id)).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select>
          </div>
        </section>
      </div>,
      { label: "Next: Your Services", disabled: !title.trim() || !skills.length, onClick: async () => { if (await post({ stop: "do", title, skillIds: skills.map((x) => x.id), industryIds: industries.map((x) => x.id) })) { await load(); go(1); } } },
    );
  }

  // ---- Stop 2: What You Charge -----------------------------------------------
  if (stop === 1) {
    const card = (k: keyof typeof picks, label: string, line: string) => (
      <button type="button" aria-pressed={picks[k]} onClick={() => setPicks((v) => ({ ...v, [k]: !v[k] }))} className={"flex-1 rounded-[12px] border-2 p-4 text-left " + (picks[k] ? "border-ink bg-ink text-surface" : "border-line hover:border-ink")}>
        <b className="block text-[16px]">{label}</b>
        <span className={"mt-1 block text-[13px] " + (picks[k] ? "text-surface/80" : "text-ink-2")}>{line}</span>
      </button>
    );
    const ok = (picks.hour && !!cents(hourly)) || (picks.month && !!cents(monthly.price)) || (picks.pkg && pkgs.some((p) => p.name.trim() && cents(p.price)));
    const save = async () => {
      const body = {
        stop: "charge",
        hourlyCents: picks.hour ? cents(hourly) : null,
        monthly: picks.month && cents(monthly.price) ? { priceCents: cents(monthly.price)!, hours: monthly.hours ? Number(monthly.hours) : null } : null,
        packages: picks.pkg ? pkgs.filter((p) => p.name.trim()).map((p) => ({ id: p.id ?? null, name: p.name, included: p.included, priceCents: cents(p.price), perMonth: p.perMonth, readyDays: p.ready ? Number(p.ready) : null })) : [],
      };
      if (await post(body)) { await load(); go(3); }
    };
    return shell(
      <div className="mt-1 space-y-5" data-stop="charge">
        <h1 className="text-[26px] font-extrabold">How do you charge? <span className="font-normal text-ink-2">Pick any that fit.</span></h1>
        <div className="flex flex-col gap-3 sm:flex-row">
          {card("hour", "By the hour", "One hourly price.")}
          {card("month", "Monthly", "A monthly price for a set number of hours.")}
          {card("pkg", "Fixed package", "A set piece of work at a set price.")}
        </div>
        {picks.hour && (
          <label className="block max-w-xs text-[14px] font-bold">Your hourly price ($)
            <input inputMode="decimal" value={hourly} onChange={(e) => setHourly(e.target.value)} placeholder="140" className={`mt-1 ${INPUT}`} />
          </label>
        )}
        {picks.month && (
          <div className="grid max-w-md grid-cols-2 gap-3">
            <label className="text-[14px] font-bold">Monthly price ($)<input inputMode="decimal" value={monthly.price} onChange={(e) => setMonthly((m) => ({ ...m, price: e.target.value }))} className={`mt-1 ${INPUT}`} /></label>
            <label className="text-[14px] font-bold">Hours a month<input inputMode="numeric" value={monthly.hours} onChange={(e) => setMonthly((m) => ({ ...m, hours: e.target.value }))} className={`mt-1 ${INPUT}`} /></label>
          </div>
        )}
        {picks.pkg && (
          <div className="space-y-3">
            {(pkgs.length ? pkgs : []).map((p, i) => (
              <div key={p.id ?? `n${i}`} className="grid gap-2 border border-line p-3 sm:grid-cols-2" data-package>
                <label className="text-[13px] font-bold">Name<input value={p.name} onChange={(e) => setPkgs((v) => v.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Procurement Health Check" className={`mt-1 ${INPUT}`} /></label>
                <div className="grid grid-cols-[1fr_auto] items-end gap-2">
                  <label className="text-[13px] font-bold">Price ($)<input inputMode="decimal" value={p.price} onChange={(e) => setPkgs((v) => v.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))} className={`mt-1 ${INPUT}`} /></label>
                  <select aria-label="Fixed or per month" value={p.perMonth ? "m" : "f"} onChange={(e) => setPkgs((v) => v.map((x, j) => (j === i ? { ...x, perMonth: e.target.value === "m" } : x)))} className="border border-line bg-surface px-2 py-2 text-[14px]"><option value="f">fixed</option><option value="m">per month</option></select>
                </div>
                <label className="text-[13px] font-bold sm:col-span-2">What&apos;s included<textarea value={p.included} onChange={(e) => setPkgs((v) => v.map((x, j) => (j === i ? { ...x, included: e.target.value } : x)))} rows={2} className={`mt-1 ${INPUT}`} /></label>
                <div className="flex items-end justify-between gap-3 sm:col-span-2">
                  <label className="text-[13px] font-bold">Ready in (days)<input inputMode="numeric" value={p.ready} onChange={(e) => setPkgs((v) => v.map((x, j) => (j === i ? { ...x, ready: e.target.value } : x)))} className={`mt-1 w-28 ${INPUT}`} /></label>
                  {!p.id && <button type="button" onClick={() => setPkgs((v) => v.filter((_, j) => j !== i))} className="text-[13px] font-semibold underline underline-offset-4">Remove</button>}
                </div>
              </div>
            ))}
            {pkgs.length < 3 && <button type="button" onClick={() => setPkgs((v) => [...v, { name: "", included: "", price: "", perMonth: false, ready: "" }])} className="text-[14px] font-semibold text-magenta-dark underline underline-offset-4">+ Add a package</button>}
          </div>
        )}
      </div>,
      { label: "Next: Enable", disabled: !ok, onClick: save },
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
