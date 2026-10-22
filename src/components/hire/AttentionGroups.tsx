"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { HireGroups } from "@/lib/live-work";
import { BTN, BTN_OUT, RedDot } from "@/components/hire/HireUI";

// HB-E007/E009: the Hire Overview's five groups. Each row carries a pair of opposite actions that do the work in place —
// the row leaves at once and the call runs after 5 seconds, so Undo (like Notifications) simply cancels it.
type Pending = { key: string; label: string; timer: ReturnType<typeof setTimeout> };
const post = (body: object) => fetch("/api/sourcing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);

export function AttentionGroups({ groups }: { groups: HireGroups }) {
  const router = useRouter();
  const [gone, setGone] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef<Pending | null>(null);

  const act = (key: string, label: string, body: object) => {
    if (latest.current) { clearTimeout(latest.current.timer); void run(latest.current); }
    setGone((g) => new Set(g).add(key));
    const p: Pending = { key, label, timer: setTimeout(() => void run(p), 5000) };
    latest.current = p;
    setPending(p);
    async function run(x: Pending) {
      if (latest.current === x) { latest.current = null; setPending(null); }
      const r = await post(body);
      if (!r?.ok) { const j = (await r?.json().catch(() => ({}))) as { error?: string }; setError(j.error ?? "Couldn't save — try again."); setGone((g) => { const n = new Set(g); n.delete(x.key); return n; }); return; }
      router.refresh();
    }
  };
  const undo = () => {
    const p = latest.current;
    if (!p) return;
    clearTimeout(p.timer);
    latest.current = null;
    setPending(null);
    setGone((g) => { const n = new Set(g); n.delete(p.key); return n; });
  };
  const extend = (eventId: string, key: string) => {
    const raw = window.prompt("Extend by how many hours? (24, 48, or any number up to 720)", "24");
    const h = Number(raw);
    if (!raw || !Number.isFinite(h) || h < 1) return;
    act(key, `Extended by ${h} h`, { action: "extend", eventId, hours: h });
  };

  const live = <T extends { key: string }>(rows: T[]) => rows.filter((r) => !gone.has(r.key));
  const expiring = live(groups.expiring.map((g) => ({ ...g, key: `x-${g.eventId}` })));
  const apps = live(groups.applications.map((g) => ({ ...g, key: `a-${g.jobId}` })));
  const rates = live(groups.rateProposals.map((g) => ({ ...g, key: `r-${g.proposalId}` })));
  const ivs = live(groups.interviews.map((g) => ({ ...g, key: `i-${g.id}` })));
  const tests = live(groups.tests.map((g) => ({ ...g, key: `t-${g.id}` })));

  return (
    <div className="flex min-w-0 flex-[1_1_520px] flex-col" data-attention-groups>
      <Group title="Jobs Expiring" n={expiring.length}>
        {expiring.map((g) => (
          <Row key={g.key} href={`/work-requests/${g.jobId}`} what={g.title} detail={`${g.when} · ${g.inText}`}>
            <button type="button" className={BTN_OUT} onClick={() => extend(g.eventId, g.key)}>Extend</button>
            <button type="button" className={BTN_OUT} onClick={() => act(g.key, "Sourcing Event closed", { action: "close", eventId: g.eventId })}>Close</button>
          </Row>
        ))}
      </Group>
      <Group title="Applications" n={apps.length}>
        {apps.map((g) => (
          <Row key={g.key} href={`/work-requests/${g.jobId}`} what={`${g.proposalIds.length} ${g.proposalIds.length === 1 ? "person" : "people"} applied to ${g.title}`} detail={["Open job", g.providers, g.range].filter(Boolean).join(" · ")}>
            <button type="button" className={BTN_OUT} onClick={() => act(g.key, "Shortlisted", { action: "decide", proposalIds: g.proposalIds, decision: "SHORTLISTED" })}>Shortlist</button>
            <button type="button" className={BTN_OUT} onClick={() => act(g.key, "Declined", { action: "decide", proposalIds: g.proposalIds, decision: "DECLINED" })}>Decline</button>
          </Row>
        ))}
      </Group>
      <Group title="Available Providers" n={rates.length}>
        {rates.map((g) => (
          <Row key={g.key} href={`/work-requests/${g.jobId}`} what={`${g.who} is available${g.rate ? ` at ${g.rate}` : ""}`} detail={[g.title, g.inRange == null ? null : g.inRange ? "in range" : "over range", g.start, "you asked them"].filter(Boolean).join(" · ")}>
            <button type="button" className={BTN_OUT} onClick={() => act(g.key, "Shortlisted", { action: "decide", proposalIds: [g.proposalId], decision: "SHORTLISTED" })}>Shortlist</button>
            <button type="button" className={BTN_OUT} onClick={() => act(g.key, "Declined", { action: "decide", proposalIds: [g.proposalId], decision: "DECLINED" })}>Decline</button>
          </Row>
        ))}
      </Group>
      <Group title="Today's Interviews" n={ivs.length} href="/hire/overview?tab=interviews">
        {ivs.map((g) => (
          <Row key={g.key} href={`/work-requests/${g.jobId}#interviews`} what={`${g.time} · ${g.who} · ${g.minutes} min`} detail={g.title}>
            {g.hasRoom ? <a href={`/api/interviews/${g.id}/join`} target="_blank" rel="noreferrer" className={BTN}>Join</a> : <span className="self-center text-[12.5px] text-state-inactive">Video link not set up yet</span>}
            <Link href={`/work-requests/${g.jobId}#interviews`} className={BTN_OUT}>Reschedule</Link>
          </Row>
        ))}
      </Group>
      <Group title="Test Results" n={tests.length} last>
        {tests.map((g) => (
          <Row key={g.key} href={`/work-requests/${g.jobId}`} what={`${g.who} · ${g.skill}`} detail={[g.score != null ? `${g.score}%` : null, g.result].filter(Boolean).join(" · ")}>
            {g.proposalId ? (
              <>
                <button type="button" className={BTN_OUT} onClick={() => act(g.key, "Shortlisted", { action: "decide", proposalIds: [g.proposalId], decision: "SHORTLISTED" })}>Shortlist</button>
                <button type="button" className={BTN_OUT} onClick={() => act(g.key, "Declined", { action: "decide", proposalIds: [g.proposalId], decision: "DECLINED" })}>Decline</button>
              </>
            ) : <Link href={`/work-requests/${g.jobId}`} className={BTN_OUT}>Review</Link>}
          </Row>
        ))}
      </Group>
      {pending && (
        <div role="status" className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 bg-ink px-4 py-3 text-[13.5px] text-surface shadow-lg" data-undo-toast>
          {pending.label}
          <button type="button" onClick={undo} className="font-bold underline underline-offset-4">Undo</button>
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] font-semibold text-state-declined">{error}</p>}
    </div>
  );
}

function Group({ title, n, children, last = false, href }: { title: string; n: number; children: ReactNode; last?: boolean; href?: string }) {
  return (
    <div data-attention-group={title}>
      <div className={`flex items-baseline justify-between border-t border-ink pb-1.5 pt-3.5 ${n ? "" : "pb-3.5 text-state-inactive"}`}>
        {href ? <Link href={href} className="text-[12px] font-extrabold uppercase tracking-[0.1em] text-ink hover:underline">{title}</Link> : <span className="text-[12px] font-extrabold uppercase tracking-[0.1em]">{title}</span>}
        {n ? <span className="text-[12px] font-bold text-state-declined">{n}</span> : <span className="text-[12px]">None waiting</span>}
      </div>
      {children}
      {last && <div className="border-t border-state-sunken" />}
    </div>
  );
}

function Row({ href, what, detail, children }: { href: string; what: string; detail: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 border-b border-state-sunken pb-3.5 pt-2.5 sm:flex-nowrap" data-attention-row>
      <RedDot size={9} />
      <Link href={href} className="min-w-0 flex-1 text-ink hover:underline">
        <span className="block text-[14px] font-bold">{what}</span>
        <span className="mt-0.5 block text-[13px] text-state-inactive">{detail}</span>
      </Link>
      <span className="flex w-full gap-1.5 sm:w-auto">{children}</span>
    </div>
  );
}
