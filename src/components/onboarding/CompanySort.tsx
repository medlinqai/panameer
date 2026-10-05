"use client";

import { useEffect, useState } from "react";
import type { SortChoice, SortState } from "@/lib/resume/company-sort";

const OPTS: { v: SortChoice; label: string }[] = [
  { v: "EMPLOYER", label: "Employer" },
  { v: "PROJECT", label: "Project client" },
  { v: "REMOVE", label: "Remove" },
];

const MEMO = new Map<string, { choice: Record<string, SortChoice | null>; under: Record<string, string> }>();

// "Companies we found (N)": the member sorts each name; nothing is written until Continue.
export function CompanySort({ onSaved }: { onSaved?: () => void }) {
  const [state, setState] = useState<SortState | null>(null);
  const [choice, setChoice] = useState<Record<string, SortChoice | null>>({});
  const [under, setUnder] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = (s: SortState | null, fresh = false) => {
    setState(s);
    if (!s) return;
    const kept = fresh ? undefined : MEMO.get(s.importId);
    const c = kept?.choice ?? Object.fromEntries(s.rows.map((r) => [r.name, r.preselect]));
    const u = kept?.under ?? Object.fromEntries(s.rows.map((r) => [r.name, r.projectEmployerId ?? "independent"]));
    setChoice(c);
    setUnder(u);
    MEMO.set(s.importId, { choice: c, under: u });
  };
  // The review page can remount this list while the member is sorting; keep their choices.
  useEffect(() => {
    if (state) MEMO.set(state.importId, { choice, under });
  }, [state, choice, under]);
  useEffect(() => {
    fetch("/api/onboarding/provider/company-sort").then((r) => r.json()).then((j) => load(j.state ?? null)).catch(() => {});
  }, []);

  if (!state || state.rows.length === 0) return null;
  const markedEmployers = state.rows.filter((r) => choice[r.name] === "EMPLOYER").map((r) => r.name);
  const employerOptions = [
    ...state.employers.map((e) => ({ v: e.id, label: e.name })),
    ...markedEmployers.filter((n) => !state.employers.some((e) => e.name === n)).map((n) => ({ v: n, label: n })),
  ];
  const all = (c: SortChoice | null) => setChoice(Object.fromEntries(state.rows.map((r) => [r.name, c])));

  const save = async () => {
    setBusy(true);
    setNote(null);
    const r = await fetch("/api/onboarding/provider/company-sort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ choices: state.rows.map((r) => ({ name: r.name, choice: choice[r.name] ?? null, employer: choice[r.name] === "PROJECT" ? under[r.name] : null })) }),
    });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; employers?: number; projects?: number; removed?: number; state?: SortState | null };
    setBusy(false);
    if (!j.ok) return setNote(j.error ?? "That didn't save.");
    load(j.state ?? null, true);
    setNote(`Saved — ${j.employers ?? 0} added to Work History, ${j.projects ?? 0} projects added, ${j.removed ?? 0} removed.`);
    onSaved?.();
  };

  return (
    <section data-testid="company-sort" className="mt-6 border-t border-line pt-5">
      <h3 className="text-[17px] font-bold">Companies we found ({state.rows.length})</h3>
      <p className="mt-1 text-[13.5px] text-ink-2">Mark each one as an employer, a project client, or remove it. Nothing changes until you press Continue.</p>
      <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
        <button type="button" className="border border-ink px-3 py-1.5 font-semibold" onClick={() => all("PROJECT")}>Mark All as Project Client</button>
        <button type="button" className="border border-ink px-3 py-1.5 font-semibold" onClick={() => all("EMPLOYER")}>Mark All as Employer</button>
        <button type="button" className="border border-line px-3 py-1.5 font-semibold text-ink-2" onClick={() => all(null)}>Clear</button>
      </div>
      <ul className="mt-3">
        {state.rows.map((r) => (
          <li key={r.name} data-company={r.name} className="border-t border-line py-3">
            <div className="min-w-0">
              <p className="font-semibold">{r.name}</p>
              <p className="text-[12.5px] text-ink-2">{[r.dates, r.title, r.detail].filter(Boolean).join(" · ") || "Nothing else read"}</p>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div role="radiogroup" aria-label={`${r.name} is`} className="inline-flex border border-ink">
                {OPTS.map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={choice[r.name] === o.v}
                    onClick={() => setChoice((c) => ({ ...c, [r.name]: o.v }))}
                    className={"min-h-9 px-3 text-[12.5px] font-semibold " + (choice[r.name] === o.v ? "bg-ink text-surface" : "bg-surface text-ink hover:bg-surface-hover")}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {choice[r.name] === "PROJECT" && (
                <select
                  aria-label={`Employer for ${r.name}`}
                  className="h-9 border border-line bg-surface px-2 text-[13px]"
                  value={under[r.name] ?? "independent"}
                  onChange={(e) => setUnder((u) => ({ ...u, [r.name]: e.target.value }))}
                >
                  <option value="independent">Independent / my own company</option>
                  {employerOptions.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
        <button type="button" disabled={busy} onClick={save} className="inline-flex min-h-11 items-center bg-ink px-5 text-[14px] font-semibold text-surface hover:bg-ink-hover disabled:opacity-40">
          {busy ? "Saving…" : "Continue"}
        </button>
        {note && <p className="text-[13.5px]">{note}</p>}
      </div>
    </section>
  );
}
