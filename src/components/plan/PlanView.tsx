/**
 * ── THE PLAN VIEW — PUBLIC ON `/status`, A WORK ORDER IN R2 (`P2-ALL-E785`) ──
 *
 * ⚠⚠ **A SERVER COMPONENT WITH ONE CLIENT ISLAND.** The accordions are
 * `<details>`/`<summary>`, which open and close, take focus and announce
 * themselves with nothing hydrated. ⚠ `/status` is the page a stranger lands on
 * first; making its main content depend on a bundle is the wrong trade.
 * ⚠⚠⚠ **THE EXCEPTION IS `PlanTimeline` (`E797`)**, which hydrates because
 * Scott asked for collapsing phases — a `<details>` cannot drive a Gantt row's
 * siblings. ⚠ **SUPERSEDED, quoted not deleted (`E164`):**
 * //   A SERVER COMPONENT WITH NO CLIENT JAVASCRIPT.
 *
 * ⚠⚠⚠ **IT RENDERS `PublicPlan` AND NOTHING ELSE.** That type has no
 * `admin_note` and no `hours` field, so this file cannot leak either — the
 * guarantee is in the shape, not in this component remembering.
 */
import type { PublicPlan, PublicPlanRow } from "@/lib/plan/public";
/**
 * ⚠⚠ **THE TIMELINE IS THE ONE CLIENT ISLAND ON THIS PAGE (`E797`)** — phases
 * collapse, which needs state. ⚠ Everything else here stays server-rendered,
 * and the accordions are still `<details>`/`<summary>` with nothing hydrated.
 */
import { PlanTimeline } from "./PlanTimeline";

const HEAD = "font-display font-bold tracking-[-0.3px]";

export function PlanView({ plan, today }: { plan: PublicPlan; today: string }) {
  if (plan.rows.length === 0) {
    /** ⚠⚠ At genuine zero, say what is true rather than drawing an empty
     *  chart. A timeline with no rows is not a timeline. */
    return (
      <section className="mt-12 border-t border-line pt-6">
        <h2 className={`text-[24px] text-ink ${HEAD}`}>The plan</h2>
        <p className="mt-1.5 max-w-[70ch] text-[15px] leading-relaxed text-ink-2">
          The plan is being set up. Nothing is published here yet.
        </p>
      </section>
    );
  }

  return (
    <>
      <PlanTimeline plan={plan} today={today} />
      <section className="mt-12 border-t border-line pt-6">
        <h2 className={`text-[24px] text-ink ${HEAD}`}>The plan, phase by phase</h2>
        <div className="mt-5 border-t border-line">
          {plan.rows.map((row) => (
            <PhaseAccordion key={row.id} row={row} />
          ))}
        </div>
      </section>
    </>
  );
}

/* ── the accordions ─────────────────────────────────────────────────────── */

function PhaseAccordion({ row }: { row: PublicPlanRow }) {
  /** ⚠⚠ THE IN-PROGRESS PHASE IS OPEN BY DEFAULT (the design). Everything else
   *  starts closed so the page can be scanned in seconds. */
  const open = row.status === "In progress";
  return (
    <details open={open} className="border-b border-line">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 py-3">
        <span
          className={
            /** ⚠⚠ NO FILLED BADGE. A top-level row keeps a 20px OUTLINED badge;
             *  a milestone is the magenta mark; anything else is a plain grey
             *  number (`E792`, Scott: the chart is "a little heavy"). */
            "inline-flex h-5 min-w-5 items-center justify-center px-1 font-mono text-[11px] " +
            (row.type === "milestone"
              ? "text-magenta"
              : "rounded-full border border-line text-ink-2")
          }
        >
          {row.number}
        </span>
        <span className="text-[16px] font-bold text-ink">{row.title || "Untitled"}</span>
        <DateRange row={row} />
        <StatusMark row={row} />
      </summary>

      <div className="pb-4 pl-9">
        {row.note && <p className="max-w-[70ch] text-[14px] leading-relaxed text-ink-2">{row.note}</p>}
        {row.children.length === 0 ? (
          <p className="text-[13px] text-ink-3">
            {row.type === "milestone" ? "A date to hit." : "No tasks listed yet."}
          </p>
        ) : (
          <ul className="mt-1">
            {row.children.map((child) => (
              <li key={child.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-line/60 py-2">
                <span className="w-10 shrink-0 font-mono text-[11px] text-ink-3">{child.number}</span>
                <span className="text-[14px] font-normal text-ink-2">{child.title || "Untitled"}</span>
                {child.owner && <span className="text-[12px] text-ink-3">{child.owner}</span>}
                <DateRange row={child} />
                <StatusMark row={child} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}

function DateRange({ row }: { row: PublicPlanRow }) {
  if (row.type === "milestone" && (row.start || row.end)) {
    return <span className="font-mono text-[12px] text-ink-3">{fmt(row.start ?? row.end!)}</span>;
  }
  /** ⚠⚠ THREE STATES, AND THEY MUST NOT LOOK ALIKE: both dates, a start with no
   *  end, and nothing at all. ⚠ A missing end never prints "Present" — that was
   *  `E549`'s defect, and the rule is the same here. */
  if (row.start && row.end) {
    return <span className="font-mono text-[12px] text-ink-3">{fmt(row.start)} – {fmt(row.end)}</span>;
  }
  if (row.start) return <span className="font-mono text-[12px] text-ink-3">Started {fmt(row.start)}</span>;
  return <span className="font-mono text-[12px] text-ink-3">Not scheduled</span>;
}

function StatusMark({ row }: { row: PublicPlanRow }) {
  /** ⚠⚠ `Late` IS SHOWN BESIDE THE STATUS, NEVER INSTEAD OF IT. It is derived
   *  from the end date, and replacing the status would hide what was set. */
  return (
    <span className="ml-auto flex items-center gap-2">
      {row.late && <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-magenta">Past due</span>}
      <span
        className={
          "text-[12px] " + (row.status === "Done" ? "font-bold text-ink" : "text-ink-2")
        }
      >
        {row.status}
      </span>
    </span>
  );
}

function fmt(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
