import Link from "next/link";
import { isCounted } from "@/lib/figure";
import { Gauge, formatFigure } from "@/components/console/Gauge";
import type { UsageArea, UsageSub } from "@/lib/usage-areas";
import "@/components/console/gauges.css";

/**
 * ── ⚠⚠⚠ THE GAUGE GRID (`P2-A1.1-E730` WS-C) ───────────────────────────────────────────
 *
 * ⚠ **SCOTT: *"gauges by PROFILE, LEARN, CONNECT, HIRE, SHOP, ORDERS and PAY"*, plus
 * Account Health so the grid is 4 + 4 with no empty slot.** Four across at desktop, two at
 * phone.
 *
 * ⚠⚠ **IT RENDERS WHAT IT IS GIVEN AND COUNTS NOTHING.** Every figure, goal, label, link
 * and hover line arrives on `UsageArea[]` from `lib/usage-areas.ts`, which is the same array
 * the honeycomb in the header draws. ⚠⚠⚠ **THAT IS WHY A CELL AND ITS GAUGE CANNOT DISAGREE
 * ABOUT THE SAME MEMBER IN THE SAME RENDER** — not because they are kept in step, but
 * because there is only one of them.
 *
 * ── ⚠⚠ THE SECTION IS `Your Activity`, AND IT IS NOT CALLED A JOURNEY ──────────────────
 *
 * ⚠ **SCOTT: *"users will not know what a journey is."*** The heading is `Your Activity`
 * and each card's eyebrow is the **menu label** of the area it links to, read from the nav
 * rather than retyped (`E585`).
 */
export function UsageGauges({ areas }: { areas: UsageArea[] }) {
  return (
    <section className="mt-10">
      <div className="mb-3.5 flex items-baseline justify-between">
        <h2 className="font-display text-[19px] font-bold">Your Activity</h2>
        {/* ⚠⚠ NO WINDOW IS CLAIMED. The mockup's note said *"This month"*; these figures
            are `"all"` (`E603` correction 4 — the front face shows figures as they stand),
            so a *"this month"* caption would have been a false statement about every number
            under it. ⚠ A control says what it governs at the point it governs it, and the
            honest version of that here is to claim no window at all. */}
        <small className="text-[12px] text-ink-3">Hover a gauge for detail</small>
      </div>

      <div className="pm-gauges">
        {areas.map((a) => (
          <Card key={a.key} area={a} />
        ))}
      </div>
    </section>
  );
}

function Sub({ sub }: { sub: UsageSub }) {
  /* ⚠⚠ A `const` ALIAS, NOT `sub.figure` DIRECTLY. ⚠⚠⚠ TypeScript narrows a union through a
     const alias and a const boolean; it CANNOT narrow a PROPERTY ACCESS through a separate
     boolean, because the property could in principle change between the two reads. ⚠ The
     Honeycomb does exactly this, and for the same reason — a cast would silence the one
     check this type exists to make. */
  const fig = sub.figure;
  const counted = isCounted(fig);
  return (
    <div className="pm-gauge-sub">
      <span>{sub.label}</span>
      {counted ? (
        <b>{fig.toLocaleString("en-US")}</b>
      ) : (
        /* ⚠⚠⚠ THE BADGE CARRIES THE WORDS, AND THE REASON IS ON THE TITLE. ⚠ A bare `—`
            beside a label is the thing counting rule 2 forbids: a reader cannot tell
            "nothing here" from "we cannot count this". */
        <b>
          <span className="pm-gauge-nc" title={fig.uncounted}>
            NOT COUNTED
          </span>
        </b>
      )}
    </div>
  );
}

function Card({ area: a }: { area: UsageArea }) {
  /* ⚠ Same const-alias narrowing as `Sub` above. */
  const fig = a.figure;
  const counted = isCounted(fig);

  return (
    <div
      className="pm-gauge"
      data-gauge={a.key}
      data-counted={counted ? "yes" : "no"}
    >
      <div className="pm-gauge-eyebrow" data-gauge-eyebrow>
        {a.eyebrow}
      </div>
      <div className="pm-gauge-label">{a.label}</div>

      <Gauge figure={fig} goal={a.goal} money={a.money} label={a.label} />

      {/*
        ⚠⚠⚠ `Goal: N` IN PLACE OF A BARE MAXIMUM (Scott's decision 3). ⚠ An unlabelled
        number under the right-hand end of a dial implies somebody decided what "full"
        means; the word `Goal` says who is claiming it.
        ⚠⚠ AND IT IS ABSENT WHEN THERE IS NO SCALE, rather than printing `Goal: 0` —
        see `Gauge.tsx`'s three states.
      */}
      <div className="pm-gauge-scale">
        <span>0</span>
        {a.goal != null ? (
          <span data-goal>Goal: {formatFigure(a.goal, a.money)}</span>
        ) : (
          <span />
        )}
      </div>

      <div className="pm-gauge-value">
        {counted ? (
          formatFigure(fig, a.money)
        ) : (
          <>
            {/* ⚠ The dash, then the reason. Never the dash alone. */}
            <span aria-hidden>&mdash;</span>
            <span className="pm-gauge-why">Not counted — {fig.uncounted}</span>
          </>
        )}
      </div>

      <div className="pm-gauge-subs">
        <Sub sub={a.subs[0]} />
        <Sub sub={a.subs[1]} />
      </div>

      <Link className="pm-gauge-go" href={a.href}>
        Go to {a.go} &rarr;
      </Link>

      {/* ⚠ The hover line. ⚠⚠ IT IS A `title` RATHER THAN A STYLED TOOLTIP so it reaches
          a keyboard and a screen reader without this card owning a popover. */}
      <div className="pm-gauge-tip" title={a.tip}>
        {a.tip}
      </div>
    </div>
  );
}
