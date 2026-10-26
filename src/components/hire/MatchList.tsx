"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import type { HireMatch } from "@/lib/hire-questionnaire";
import { NeutralAvatar, isMaskedName } from "@/components/Avatar";
import { BTN_MAGENTA, BTN_OUT, MatchBadges } from "@/components/hire/HireUI";
import { AskQuestionsDialog } from "@/components/hire/AskQuestionsDialog";
import type { Question } from "@/lib/question-types";

// SE-E002/E003: one match list for Hire and the Job page — star (Shortlist), quick view, Compare, Request Proposals by a deadline.
const GHOST = "inline-flex min-h-9 items-center justify-center border border-ink bg-white px-3.5 text-[13px] font-semibold text-ink hover:bg-bg-soft disabled:opacity-40";
const CHIP = "rounded-full border border-line bg-bg-soft px-2";
const WHY = "rounded-full border border-magenta-dark bg-[#fbeafb] px-2 font-semibold text-magenta-dark";

async function post(body: object) {
  const r = await fetch("/api/hire", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
  const j = (await r?.json().catch(() => ({}))) as Record<string, unknown>;
  return r?.ok ? j : { error: (j.error as string) ?? "That didn't work." };
}

function Star({ on, onClick, name }: { on: boolean; onClick: () => void; name: string }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={on} aria-label={on ? `Remove ${name} from the Shortlist` : `Shortlist ${name}`} data-star={on ? "on" : "off"} className={on ? "text-[20px] leading-none text-magenta-dark" : "text-[20px] leading-none text-ink-3 hover:text-magenta-dark"}>
      {on ? "★" : "☆"}
    </button>
  );
}

export function MatchList({ jobId, matches: initial, state, empty, chosen = true }: { jobId: string | null; matches: HireMatch[]; state?: string; empty?: ReactNode; /** Scott 10-23: before a door is chosen, show the doors and a top-3 preview only. */ chosen?: boolean }) {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(chosen);
  const [showHidden, setShowHidden] = useState(false);
  const [showOutside, setShowOutside] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [hours, setHours] = useState("48");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opened, setOpened] = useState<{ eventId: string; eventNumber: string; count: number } | null>(null);
  const [showWeak, setShowWeak] = useState(false);
  const [minYears, setMinYears] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [composing, setComposing] = useState(false);
  const [minImpl, setMinImpl] = useState(0);

  const patch = (personId: string, p: Partial<HireMatch>) => setList((ms) => ms.map((m) => (m.personId === personId ? { ...m, ...p } : m)));
  const star = (m: HireMatch) => { patch(m.personId, { starred: !m.starred }); void post({ action: "star", jobId, personIds: [m.personId], on: !m.starred }); };
  const hide = (m: HireMatch, hidden: boolean) => {
    patch(m.personId, { hidden, ...(hidden ? { starred: false } : {}) });
    if (hidden && active === m.personId) setActive(null);
    void post({ action: hidden ? "hide" : "unhide", jobId, personIds: [m.personId] });
    if (hidden && m.starred) void post({ action: "star", jobId, personIds: [m.personId], on: false });
  };

  const shown = list.filter((m) => !m.hidden && (showOutside || !m.outside) && (!starredOnly || m.starred) && (m.detail.ocYears ?? 0) >= minYears && (m.detail.implementations ?? 0) >= minImpl);
  // HP-E004: product-only matches (no domain, no skill) go under "Weaker matches", folded.
  const strong = shown.filter((m) => !m.weak || m.starred);
  const weak = shown.filter((m) => m.weak && !m.starred);
  const visible = showWeak ? [...strong, ...weak] : strong;
  const starred = list.filter((m) => m.starred && !m.hidden && !m.requested);
  // Scott 10-22: the Shortlisted chip counts everyone starred, asked or not; the request bar only those not asked yet.
  const allStarred = list.filter((m) => m.starred && !m.hidden);
  const asked = allStarred.filter((m) => m.requested);
  const allAsked = asked.length > 0 && !starred.length;
  const at = visible.findIndex((m) => m.personId === active);
  const cur = at >= 0 ? visible[at] : null;

  const request = async () => {
    setBusy(true);
    setError(null);
    const j = await post({ action: "request", jobId, personIds: starred.map((m) => m.personId), hours: Number(hours), ...(questions.length ? { questions } : {}) });
    setBusy(false);
    if (j.error) { setError(j.error as string); return; }
    setOpened({ eventId: j.eventId as string, eventNumber: j.eventNumber as string, count: ((j.created as unknown[]) ?? []).length });
    // HP-E003: the starred rows now read "Requested · due …".
    const due = new Date(Date.now() + Number(hours) * 3_600_000).toISOString();
    setList((ms) => ms.map((m) => (m.starred && !m.requested ? { ...m, requested: { eventId: j.eventId as string, due } } : m)));
  };

  if (!list.length) return <>{empty}</>;
  return (
    <div data-match-list>
      {/* Scott 10-23: one line that says what to do here. */}
      {!chosen && <>
      <p className="mt-5 text-[13.5px] text-state-inactive" data-matches-next><b className="text-ink">Next:</b>{" "}
        {opened || allAsked
          ? <>You asked {opened?.count ?? asked.length} — their answers arrive on <Link href={`/work-requests/${jobId}?tab=responses`} className="font-semibold">Responses</Link>. Or Hire one directly.</>
          : starred.length
            ? <>Ask your {starred.length} starred for availability below — or Hire one directly.</>
            : <>Hire one directly, or star (☆) the ones you like and ask them all for availability.</>}
      </p>
      {/* Scott 10-23: the matches decide the door — say how many are strong and suggest one. */}
      {(() => {
        const visible = list.filter((m) => !m.hidden);
        const strong = visible.filter((m) => !m.weak && m.inBudget).length;
        const pick = strong === 0 ? "Compare Providers (the Job Board brings more)" : strong <= 3 ? "Hire Directly" : "Compare Providers";
        return <p className="mt-1.5 text-[13px]" data-match-hint><b>{visible.length} match{visible.length === 1 ? "" : "es"} · {strong} strong</b> <span className="text-state-inactive">(in budget, good skill fit) — suggested: </span><b>{pick}</b></p>;
      })()}
      </>}
      {/* OJ-E002: two doors — Hire Directly (any row's Hire) or Compare Providers (the one magenta button). */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2" data-two-doors>
        <div className="rounded-[12px] border border-state-border p-5" data-door="direct">
          <h3 className="text-[15px] font-extrabold">Hire Directly</h3>
          <p className="mt-1 text-[13px] text-state-inactive">You know who you want. Press <b className="text-ink">Request to Hire</b> on their row — terms, then the Request.</p>
          <p className="mt-2 text-[12px] text-state-inactive">Fastest · one provider</p>
          {!open && <button type="button" onClick={() => setOpen(true)} className={`${BTN_OUT} mt-2.5`} data-choose-direct>Choose Hire Directly</button>}
        </div>
        <div className="rounded-[12px] border border-magenta p-5" data-door="compare">
          <h3 className="text-[15px] font-extrabold">Compare Providers</h3>
          <p className="mt-1 text-[13px] text-state-inactive">Star the ones you like. They each answer with their rate by your deadline; interview the best, then Hire.</p>
          {!open ? (
            <button type="button" onClick={() => setOpen(true)} className={`${BTN_OUT} mt-2.5`} data-choose-compare>Choose Compare Providers</button>
          ) : !opened && allAsked ? (
            <p className="mt-2 text-[13.5px]" data-all-asked>All {asked.length} starred were asked. <Link href={`/work-requests/${jobId}?tab=responses`} className="font-semibold">See Their Answers →</Link> <span className="text-state-inactive">Star someone new to ask them too.</span></p>
          ) : opened ? (
            <p className="mt-2 text-[13.5px]"><b>{opened.eventNumber}</b> — {opened.count} asked. <Link href={`/work-requests/${jobId}?tab=responses`} className="font-semibold">See Responses →</Link></p>
          ) : (
            <div className="mt-2.5 flex flex-wrap items-center gap-3" data-proposals-bar>
              <button type="button" className={`${BTN_MAGENTA} disabled:opacity-40`} disabled={busy || !starred.length || !jobId} onClick={request} data-request-proposals>{`Ask ${starred.length} Starred for Availability`}</button>
              <label className="flex items-center gap-2 text-[12.5px] font-semibold">Deadline
                <input inputMode="numeric" value={hours} onChange={(e) => setHours(e.target.value.replace(/\D/g, "").slice(0, 3))} aria-label="Deadline in hours" className="w-14 rounded-[8px] border border-state-border px-2 py-1 text-right" data-deadline-hours /> h
              </label>
              <button type="button" disabled={!jobId} onClick={() => setComposing(true)} className="text-[12.5px] font-semibold underline underline-offset-4" data-add-questions>{questions.length ? `${questions.length} Question${questions.length === 1 ? "" : "s"} Added · Edit` : "Add Questions"}</button>
              {!starred.length && <span className="w-full text-[12.5px] text-state-inactive" data-request-help>Star who you want to ask first.</span>}
            </div>
          )}
          {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
        </div>
      </div>
      {open && <div className="mt-8 flex flex-wrap items-center gap-2 text-[13px]">
        <button type="button" aria-pressed={!starredOnly} onClick={() => setStarredOnly(false)} className={!starredOnly ? "rounded-full border border-magenta-dark bg-[#fbeafb] px-3 py-1 font-semibold text-magenta-dark" : "rounded-full border border-line px-3 py-1 font-semibold"}>All ({list.filter((m) => !m.hidden).length})</button>
        <button type="button" aria-pressed={starredOnly} onClick={() => setStarredOnly(true)} data-filter-shortlisted className={starredOnly ? "rounded-full border border-magenta-dark bg-[#fbeafb] px-3 py-1 font-semibold text-magenta-dark" : "rounded-full border border-line px-3 py-1 font-semibold"}>Shortlisted ({allStarred.length})</button>
        <button type="button" disabled={starred.length < 2 || starred.length > 4} onClick={() => setComparing(true)} className={GHOST} data-compare title="Star 2 to 4 providers to compare them">Compare{starred.length >= 2 ? ` ${Math.min(starred.length, 4)}` : ""}</button>
        <MinChip label="Min Oracle Cloud Years" value={minYears} options={[2, 5, 8, 10]} onChange={setMinYears} />
        <MinChip label="Min Implementations" value={minImpl} options={[1, 3, 5, 10]} onChange={setMinImpl} />
      </div>}
      {!open && <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.08em] text-state-inactive" data-top-matches>Top Matches</p>}

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {(open ? visible : visible.slice(0, 3)).map((m) => (
          <li key={m.personId} className={`flex items-start gap-3 py-4 ${active === m.personId ? "bg-[#fbeafb]/40" : ""}`} data-hire-match={m.name}>
            <Star on={m.starred} onClick={() => star(m)} name={m.name} />
            {(isMaskedName(m.name) || m.photoUrl) && <NeutralAvatar size={36} photoUrl={m.photoUrl} />}
            <button type="button" onClick={() => setActive(m.personId)} className="min-w-0 flex-1 text-left" data-quick-view-open>
              <p className="text-[15px] font-bold hover:underline">{m.company ? `${m.company} · ` : ""}{m.name}</p>
              <p className="text-[13px] text-ink-2">{m.line}</p>
              <MatchBadges badges={m.badges} className="mt-1" />
              <p className="mt-1 flex flex-wrap gap-1.5 text-[11.5px]" data-why>
                {m.why.map((k) => <span key={k} className={WHY}>{k}</span>)}
                {m.matched.map((k) => <span key={k} className={CHIP}>{k}</span>)}
                {m.inBudget && <span className="rounded-full border border-line px-2">In Budget</span>}
                {m.aboveRange && <span className="rounded-full bg-[#FAF0DA] px-2 font-semibold text-[#8a5a00]">Above Your Range</span>}
              </p>
              {m.requested && <span className="mt-1 block text-[12.5px] font-semibold text-state-pending" data-requested>Requested · due {new Date(m.requested.due).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
            </button>
            <div className="flex flex-col items-end gap-1 text-right text-[13px]">
              {m.rate && <b className="block">{m.rate}</b>}
              {m.requested && <Link href={`/work-requests/${jobId}?tab=responses`} className="text-[12.5px] font-semibold text-magenta-dark underline underline-offset-4">Responses</Link>}
              <Link href={`/hire/terms?job=${jobId}&provider=${m.personId}`} data-hire-provider className="inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover">Request to Hire</Link>
              <button type="button" onClick={() => hide(m, true)} className="text-[12.5px] text-ink-3 underline underline-offset-4 hover:text-ink" data-hide-match aria-label={`Hide ${m.name}`}>Hide ×</button>
            </div>
          </li>
        ))}
        {!visible.length && <li className="py-4 text-[13.5px] text-ink-3">{starredOnly ? "Star providers to shortlist them." : "No one to show."}</li>}
      </ul>
      {!open && visible.length > 3 && <button type="button" onClick={() => setOpen(true)} className="mt-3 text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4" data-see-all>See All {visible.length} Matches</button>}
      {open && weak.length > 0 && (
        <button type="button" onClick={() => setShowWeak((v) => !v)} className="mt-3 flex w-full items-center gap-3 text-[13px] font-semibold text-ink-2" data-weaker-matches>
          <span className="h-px flex-1 bg-line" />{showWeak ? "Hide weaker matches" : `Weaker matches (${weak.length})`}<span className="h-px flex-1 bg-line" />
        </button>
      )}

      {open && list.some((m) => m.hidden) && (
        <div className="mt-3 text-[13.5px]" data-hidden-matches>
          <button type="button" onClick={() => setShowHidden((v) => !v)} className="font-semibold text-ink-2 underline underline-offset-4">{`Show hidden (${list.filter((m) => m.hidden).length})`}</button>
          {showHidden && <ul className="mt-1">{list.filter((m) => m.hidden).map((m) => <li key={m.personId} className="flex items-center gap-3 py-1">{m.name} <button type="button" onClick={() => hide(m, false)} className="font-semibold text-magenta-dark underline underline-offset-4">Restore</button></li>)}</ul>}
        </div>
      )}
      {open && list.some((m) => m.outside) && (
        <button type="button" onClick={() => setShowOutside((v) => !v)} className="mt-3 text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4" data-show-outside>
          {showOutside ? `Hide providers outside ${(state ?? "").toUpperCase()}` : `Show providers outside ${(state ?? "").toUpperCase()} (${list.filter((m) => m.outside).length})`}
        </button>
      )}

      {composing && jobId && <AskQuestionsDialog jobId={jobId} providerPersonIds={starred.map((m) => m.personId)} onClose={() => setComposing(false)} compose={{ initial: questions, onDone: setQuestions }} />}
      {cur && <QuickView m={cur} jobId={jobId} onClose={() => setActive(null)} onStar={() => star(cur)} onHide={() => hide(cur, true)} prev={at > 0 ? () => setActive(visible[at - 1].personId) : null} next={at < visible.length - 1 ? () => setActive(visible[at + 1].personId) : null} />}
      {comparing && <CompareTable rows={starred.slice(0, 4).map((m) => ({ m }))} onClose={() => setComparing(false)} jobId={jobId} onRemove={(id) => { const m = list.find((x) => x.personId === id); if (m) star(m); if (starred.length <= 2) setComparing(false); }} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="text-[11.5px] font-bold uppercase tracking-[0.08em] text-ink-3">{title}</h3>
      <div className="mt-1 text-[13.5px]">{children}</div>
    </div>
  );
}

function QuickView({ m, jobId, onClose, onStar, onHide, prev, next }: { m: HireMatch; jobId: string | null; onClose: () => void; onStar: () => void; onHide: () => void; prev: (() => void) | null; next: (() => void) | null }) {
  const d = m.detail;
  return (
    <aside role="dialog" aria-label={`Quick view: ${m.name}`} data-quick-view className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-white p-5 shadow-[-8px_0_24px_rgba(0,0,0,0.12)] md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:border-l md:border-line">
      <div className="flex items-start gap-3">
        {(isMaskedName(m.name) || m.photoUrl) && <NeutralAvatar size={48} photoUrl={m.photoUrl} />}
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-extrabold">{m.company ? `${m.company} · ` : ""}{m.name}</p>
          <p className="text-[13px] text-ink-2">{m.line}</p>
          <MatchBadges badges={m.badges} className="mt-1.5" />
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="text-[22px] leading-none text-ink-3 hover:text-ink">×</button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={onStar} className={GHOST} data-quick-star>{m.starred ? "★ Shortlisted" : "☆ Shortlist"}</button>
        <button type="button" onClick={onHide} className={GHOST}>Hide</button>
        <Link href={`/hire/terms?job=${jobId}&provider=${m.personId}`} className="inline-flex min-h-9 items-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover">Request to Hire</Link>
      </div>
      {d.summary && <Section title="Summary"><p className="whitespace-pre-line text-ink-2">{d.summary}</p></Section>}
      <Section title="Role">{d.role ?? "—"}</Section>
      <Section title={`Skills Matched (${d.skillsMatched})`}>
        <p className="flex flex-wrap gap-1.5 text-[12px]">{m.why.map((k) => <span key={k} className={WHY}>{k}</span>)}{m.matched.map((k) => <span key={k} className={CHIP}>{k}</span>)}</p>
      </Section>
      <div className="grid grid-cols-2 gap-x-4">
        <Section title="Years">{d.years != null ? `${d.years} yrs` : "—"}</Section>
        <Section title="Location">{d.location ?? "—"}</Section>
        <Section title="Oracle Cloud Years">{d.ocYearsLabel?.replace(/ Oracle Cloud$/, "") ?? "—"}</Section>
        <Section title="Implementations">{d.implementationsLabel?.replace(/ Implementations?$/, "") ?? "—"}</Section>
      </div>
      <Section title="Certifications">{d.certifications.length ? d.certifications.join(" · ") : "—"}</Section>
      <Section title="Rates">{d.rates.length ? <ul>{d.rates.map((r) => <li key={r.name} className="flex justify-between gap-3"><span>{r.name}</span><b>{r.rate}</b></li>)}</ul> : m.rate ?? "—"}</Section>
      <Section title="Products">{d.products.length ? <ul>{d.products.map((p) => <li key={p.title} className="flex justify-between gap-3"><span>{p.title}</span>{p.price && <b>{p.price}</b>}</li>)}</ul> : "—"}</Section>
      <Link href={`/providers/${m.profileId}?from=matches`} className="mt-4 text-[13.5px] font-semibold text-magenta-dark underline underline-offset-4">View the Full Profile</Link>
      <div className="mt-auto flex justify-between gap-3 border-t border-line pt-4">
        <button type="button" onClick={prev ?? undefined} disabled={!prev} className={GHOST} data-quick-prev>‹ Previous</button>
        <button type="button" onClick={next ?? undefined} disabled={!next} className={GHOST} data-quick-next>Next ›</button>
      </div>
    </aside>
  );
}

/** SE-E003/E005 + HP-E005: side by side — providers, or their proposals (proposed rate and start added). Best value per row
 *  is highlighted (lowest rate, most years, most skills); equal columns, a fixed label column; Hire / Remove per column. */
const num = (t: string | null | undefined) => { const m = /\$([\d,]+(?:\.\d+)?)/.exec(t ?? ""); return m ? Number(m[1].replace(/,/g, "")) : null; };
const skillsN = (m: HireMatch) => Number(/^(\d+)/.exec(m.detail.skillsMatched)?.[1] ?? 0);
export function CompareTable({ rows, onClose, jobId, onRemove }: { rows: { m: HireMatch; proposed?: string | null; start?: string | null; qa?: { q: string; a: string }[] | null }[]; onClose: () => void; jobId?: string | null; onRemove?: (personId: string) => void }) {
  const withProposal = rows.some((r) => r.proposed !== undefined);
  const best = (vals: (number | null)[], pick: "min" | "max") => { const v = vals.filter((x): x is number => x != null); return v.length > 1 ? (pick === "min" ? Math.min(...v) : Math.max(...v)) : null; };
  const bestRate = best(rows.map((r) => num(r.proposed ?? r.m.rate)), "min");
  const bestYears = best(rows.map((r) => r.m.detail.years), "max");
  const bestSkills = best(rows.map((r) => skillsN(r.m)), "max");
  const bestOc = best(rows.map((r) => r.m.detail.ocYears), "max");
  const bestImpl = best(rows.map((r) => r.m.detail.implementations), "max");
  const HL = "rounded-full bg-[#fbeafb] px-2 py-0.5 font-bold text-magenta-dark";
  const lines: [string, (r: (typeof rows)[number]) => ReactNode][] = [
    ...(withProposal ? ([["Their Rate", (r) => <span className={num(r.proposed) != null && num(r.proposed) === bestRate ? HL : ""}>{r.proposed ?? "—"}</span>], ["Earliest Start", (r) => r.start ?? "—"]] as [string, (r: (typeof rows)[number]) => ReactNode][]) : []),
    ["Rate", (r) => <span><span className={!withProposal && num(r.m.rate) != null && num(r.m.rate) === bestRate ? HL : ""}>{r.m.rate ?? "—"}</span>{r.m.rate && <span className="ml-1.5 text-[12px] text-ink-2">{r.m.inBudget ? "in budget" : "over budget"}</span>}</span>],
    ["Years", (r) => <span className={r.m.detail.years != null && r.m.detail.years === bestYears ? HL : ""}>{r.m.detail.years != null ? `${r.m.detail.years} yrs` : "—"}</span>],
    ["Oracle Cloud Years", (r) => <span className={r.m.detail.ocYears != null && r.m.detail.ocYears === bestOc ? HL : ""}>{r.m.detail.ocYearsLabel?.replace(/ Oracle Cloud$/, "") ?? "—"}</span>],
    ["Implementations", (r) => <span className={r.m.detail.implementations != null && r.m.detail.implementations === bestImpl ? HL : ""}>{r.m.detail.implementationsLabel?.replace(/ Implementations?$/, "") ?? "—"}</span>],
    ["Role", (r) => r.m.detail.role ?? "—"],
    ["Skills Matched", (r) => <span><span className={skillsN(r.m) === bestSkills ? HL : "font-semibold"}>{r.m.detail.skillsMatched}</span>{r.m.matched.length > 0 && <span className="mt-1 block text-[12px] text-ink-2">{r.m.matched.join(", ")}</span>}</span>],
    ["Certifications", (r) => (r.m.detail.certifications.length ? <span title={r.m.detail.certifications.join(" · ")}>{r.m.detail.certifications.length} · {r.m.detail.certifications.slice(0, 3).join(" · ")}{r.m.detail.certifications.length > 3 ? " …" : ""}</span> : "—")],
    ["Location", (r) => r.m.detail.location ?? "—"],
    ["Products", (r) => r.m.detail.products.map((p) => p.title).join(" · ") || "—"],
    // AQ-E004: a row per written question, answers side by side.
    ...((rows.find((r) => r.qa?.length)?.qa ?? []).map((x, i) => [x.q === "Score" ? "Score" : `Q${i + 1}: ${x.q}`, (r: (typeof rows)[number]) => <span className="whitespace-pre-wrap text-[13px]">{r.qa?.[i]?.a || "—"}</span>] as [string, (r: (typeof rows)[number]) => ReactNode])),
  ];
  return (
    <div role="dialog" aria-label="Compare" data-compare-table className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" onClick={onClose}>
      <div className="mt-10 w-full max-w-5xl rounded-[12px] bg-white p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-extrabold">Compare</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[22px] leading-none text-ink-3 hover:text-ink">×</button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] table-fixed border-collapse text-[13.5px]">
            <colgroup><col className="w-36" />{rows.map((r) => <col key={r.m.personId} />)}</colgroup>
            <thead>
              <tr>
                <th />
                {rows.map((r) => (
                  <th key={r.m.personId} className="border-b border-line p-2 text-left align-bottom">
                    <span className="flex items-center gap-2">{isMaskedName(r.m.name) || r.m.photoUrl ? <NeutralAvatar size={32} photoUrl={r.m.photoUrl} /> : null}<span className="min-w-0 truncate text-[14px] font-extrabold">{r.m.name}</span></span>
                    <MatchBadges badges={r.m.badges} className="mt-1.5 font-normal" />
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      {jobId && <Link href={`/hire/terms?job=${jobId}&provider=${r.m.personId}`} className="inline-flex min-h-8 items-center bg-ink px-3 text-[12.5px] font-bold text-surface hover:bg-ink-hover">Request to Hire</Link>}
                      {onRemove && <button type="button" onClick={() => onRemove(r.m.personId)} className="inline-flex min-h-8 items-center border border-ink px-2.5 text-[12.5px] font-semibold">Remove</button>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>{lines.map(([label, cell]) => <tr key={label}><th className="border-b border-line p-2 text-left align-top text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">{label}</th>{rows.map((r) => <td key={r.m.personId} className="break-words border-b border-line p-2 align-top">{cell(r)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/** MR-E004: a "minimum" filter chip — Any, or one of a few thresholds. */
function MinChip({ label, value, options, onChange }: { label: string; value: number; options: number[]; onChange: (n: number) => void }) {
  return (
    <label className={value ? "inline-flex items-center gap-1 rounded-full border border-magenta-dark bg-[#fbeafb] px-3 py-1 font-semibold text-magenta-dark" : "inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 font-semibold"} data-min-chip={label}>
      {label}
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={label} className="bg-transparent font-semibold outline-none">
        <option value={0}>Any</option>
        {options.map((n) => <option key={n} value={n}>{n}+</option>)}
      </select>
    </label>
  );
}
