"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { estimateEventForBuyer } from "@/lib/estimate-events";
import { Countdown } from "@/components/hire/Countdown";
import { NeutralAvatar } from "@/components/Avatar";

// ES-E004/E006: the Estimate Event — path strip, estimates side by side, Ask a Question · Request Changes · Award.
type Ev = NonNullable<Awaited<ReturnType<typeof estimateEventForBuyer>>>;
const usd = (c: number | null) => (c == null ? "—" : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
const KIND: Record<string, string> = { SERVICE: "Service – Rate", FIXED: "Fixed", NOT_TO_EXCEED: "Not to Exceed" };
const STATUS: Record<string, string> = { OPEN: "Open", CLOSED: "Closed", AWARDED: "Awarded", DRAFT: "Draft" };
const BTN = "inline-flex min-h-9 items-center justify-center bg-ink px-4 text-[13px] font-bold text-surface hover:bg-ink-hover disabled:opacity-40";
const GHOST = "inline-flex min-h-9 items-center justify-center border border-ink bg-white px-3.5 text-[13px] font-semibold hover:bg-bg-soft disabled:opacity-40";

export function EstimateEventView({ ev }: { ev: Ev }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [changing, setChanging] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const post = async (url: string, body: object, ok: string) => {
    setBusy(true); setMsg(null);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const j = (await r?.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!r?.ok) { setMsg(j.error ?? "That didn't work."); return; }
    setMsg(ok); setChanging(null); setComment(""); router.refresh();
  };
  const priced = ev.estimates.filter((x) => x.estimate);
  const lowest = priced.length > 1 ? Math.min(...priced.map((x) => x.estimate!.totalCents)) : null;
  const awarded = ev.estimates.some((x) => x.estimate?.status === "ACCEPTED");
  const current = ev.path.find((s) => !s.done)?.key ?? null;
  return (
    <div data-estimate-event>
      <header className="mt-3 rounded-brand border border-line bg-white p-4 sm:p-5">
        <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">Estimate Event</p>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h1 className="text-[24px] font-extrabold">{ev.number}</h1>
          <span className="rounded-full border border-ink px-3 py-0.5 text-[12.5px] font-bold">{STATUS[ev.status] ?? ev.status}</span>
        </div>
        <p className="text-[15px] font-semibold">{ev.job.title}</p>
        {ev.job.description && <p className="mt-1 whitespace-pre-line text-[13.5px] text-ink-2">{ev.job.description}</p>}
        <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-2">
          <span>Deadline {new Date(ev.deadlineAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · <b className="text-magenta-dark"><Countdown at={ev.deadlineAt} /></b></span>
          {(ev.job.budget_min_cents != null || ev.job.budget_max_cents != null) && <span>Budget {usd(ev.job.budget_min_cents)} – {usd(ev.job.budget_max_cents)}</span>}
        </p>
      </header>

      {/* ES-E006: Describe → Ask Providers → Estimates In → Award → Approval → Work Order Created */}
      <section className="mt-4 rounded-brand border border-line bg-white p-4 sm:p-5" data-estimate-path>
        <h2 className="text-[12px] font-bold uppercase tracking-[0.1em] text-ink-3">Estimate Path · {ev.number}{ev.wo?.workRequest.wr_number ? ` · ${ev.wo.workRequest.wr_number}` : ""}</h2>
        <div className="-mx-1 overflow-x-auto pb-1">
          <ol className="mt-3 flex min-w-max gap-x-1 px-1">
            {ev.path.map((s) => {
              const on = s.key === current;
              const body = (
                <>
                  <span className={s.done ? "grid h-8 w-8 place-items-center rounded-full bg-ink text-[14px] font-bold text-white" : on ? "grid h-8 w-8 place-items-center rounded-full border-2 border-magenta bg-white ring-2 ring-magenta/30" : "grid h-8 w-8 place-items-center rounded-full border-2 border-[#C9CDDC] bg-white"} aria-hidden>{s.done ? "✓" : ""}</span>
                  <span className={s.done || on ? "mt-1.5 block text-[13px] font-bold leading-tight" : "mt-1.5 block text-[13px] font-bold leading-tight text-ink-3"}>{s.label}</span>
                  {s.note && <span className="block text-[11.5px] text-ink-2">{s.note}</span>}
                </>
              );
              return <li key={s.key} className="flex w-[104px] flex-col items-center text-center" data-step={s.key}>{s.href ? <Link href={s.href} className="flex flex-col items-center hover:underline">{body}</Link> : body}</li>;
            })}
          </ol>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="text-[18px] font-extrabold">Estimates <small className="text-[13px] font-semibold text-ink-3">{priced.length} of {ev.estimates.length} in</small></h2>
        <div className="mt-3 overflow-x-auto pb-2">
          <div className="grid min-w-max auto-cols-[280px] grid-flow-col gap-3 sm:auto-cols-[300px]">
            {ev.estimates.map((x) => {
              const e = x.estimate;
              return (
                <article key={x.requestId} className={e?.status === "ACCEPTED" ? "rounded-[12px] border-2 border-ink bg-white p-4" : "rounded-[12px] border border-line bg-white p-4"} data-estimate-column={x.who}>
                  <p className="flex items-center gap-2 text-[14px] font-bold"><NeutralAvatar size={28} />{x.who}{e?.status === "ACCEPTED" && <span className="rounded-full bg-ink px-2 text-[11px] text-surface">Awarded</span>}</p>
                  {e ? (
                    <>
                      <p className="mt-2 text-[22px] font-extrabold tabular-nums">{usd(e.totalCents)}{lowest != null && e.totalCents === lowest && <span className="ml-2 rounded-full bg-[#fbeafb] px-2 align-middle text-[11px] font-bold text-magenta-dark">lowest</span>}</p>
                      <p className="text-[12.5px] text-ink-2">{e.number} · valid until {e.validUntil}{e.status === "CHANGES_REQUESTED" ? " · changes requested" : ""}</p>
                      <ul className="mt-2 grid gap-1 text-[13px]">{e.lines.map((l) => <li key={l.n} className="flex justify-between gap-2"><span className="min-w-0"><span className="text-ink-3">{KIND[l.kind] ?? l.kind} · </span>{l.description}</span><b className="shrink-0 tabular-nums">{l.amountCents != null ? usd(l.amountCents) : l.rateCents != null ? `${usd(l.rateCents)}/${(l.uom ?? "unit").toLowerCase()}` : "—"}</b></li>)}</ul>
                      {e.scope && <p className="mt-2 text-[12.5px]"><b>Scope:</b> {e.scope}</p>}
                      {e.assumptions && <p className="mt-1 text-[12.5px]"><b>Assumptions:</b> {e.assumptions}</p>}
                      {e.exclusions && <p className="mt-1 text-[12.5px]"><b>Not included:</b> {e.exclusions}</p>}
                      {!awarded && e.status === "SENT" && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <button type="button" className={BTN} disabled={busy} onClick={() => window.confirm(`Award ${x.who} at ${usd(e.totalCents)}?`) && post("/api/estimate-events", { action: "award", eventId: ev.id, estimateId: e.id }, "Awarded — the Service Requisition and Work Order are created.")} data-award-estimate>Award</button>
                          <button type="button" className={GHOST} disabled={busy} onClick={() => setChanging(changing === e.id ? null : e.id)}>Request Changes</button>
                          {x.userId && <Link href={`/messages?with=${x.userId}`} className={GHOST}>Ask a Question</Link>}
                        </div>
                      )}
                      {changing === e.id && (
                        <div className="mt-2">
                          <textarea value={comment} onChange={(ev2) => setComment(ev2.target.value)} rows={3} maxLength={1000} placeholder="What should change?" className="block w-full rounded-[8px] border border-line px-2.5 py-2 text-[13px]" />
                          <button type="button" className={`${BTN} mt-1.5`} disabled={busy || !comment.trim()} onClick={() => post("/api/estimates", { action: "decide", id: e.id, decision: "CHANGES", comment }, "Changes requested — they'll send a new revision.")}>Send</button>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-2 text-[13px] text-ink-3">{x.requestStatus === "DECLINED" ? `Declined${x.declineReason ? ` — “${x.declineReason}”` : ""}` : "No estimate yet"}</p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
        {msg && <p role="status" className="mt-2 text-[13.5px] font-semibold text-magenta-dark">{msg}</p>}
        {ev.wo && <p className="mt-2 text-[13.5px]">Work Order <Link href={`/orders/${ev.wo.id}`} className="font-semibold text-magenta-dark underline underline-offset-4">{ev.wo.order_number}</Link></p>}
      </section>
    </div>
  );
}
