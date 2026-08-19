import Link from "next/link";
import { formatRange, type ReportModel } from "@/lib/assessment/report";
import { SendToColleagues } from "@/components/assessment/SendToColleagues";
import { EmailedNotice } from "@/components/assessment/EmailedNotice";
import { MaturityDashboard } from "@/components/marketing/MaturityDashboard";

/**
 * THE REPORT (WS-D) — the output surface, in the image-2 dashboard shape.
 *
 * NOT A WIZARD, and that is a rule rather than a style choice: the brief draws
 * the line explicitly, and a result rendered in step chrome reads as another
 * question. So this is a dashboard — money tiles across the top, the ranked
 * moves beneath, the progress card to the side.
 *
 * ── FOUR TILES, AND FUNDING IS NOT SAVINGS ───────────────────────────────────
 *
 * Funding Available and Opportunity on the Table are SEPARATE tiles, never
 * summed into one headline. They are different kinds of money — one is what the
 * tax treatment can cover, the other is what better process recovers — and
 * merging them would be the single most dishonest number the page could show.
 *
 * ── THE FUNDING NUMBER CARRIES NO CAVEAT LABEL ───────────────────────────────
 *
 * Locked decision: it renders as a figure, unlabelled. The honesty rail is that
 * the RATE behind it is configuration a Panameer Admin owns (default 18%, per
 * geography overridable) — not that the UI hedges the number with "estimate".
 * Scott manages this claim. Do not add a disclaimer here without him.
 *
 * ── THE DONUT IS 0% AND THAT IS THE TRUTH ────────────────────────────────────
 *
 * A fresh report has delivered nothing, so progress against the plan is zero.
 * It is drawn as a real ring at zero rather than hidden, because the empty ring
 * is the point: this is the plan, and the tracker fills it in as work lands
 * (Phase 2). Showing a seeded 12% would be the exact fake-live the rails forbid.
 */
export function ReportDashboard({
  model,
  /**
   * Set only on the redirect straight off submit, and only when the API
   * confirmed the send. Absent on every later visit and on a forwarded link —
   * see `EmailedNotice`.
   */
  emailedTo = null,
}: {
  model: ReportModel;
  emailedTo?: string | null;
}) {
  const net = model.netLow > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      {emailedTo && <EmailedNotice to={emailedTo} />}
      <p className="text-[13px] font-extrabold uppercase tracking-[0.08em] text-magenta">
        {model.companyName} · {model.processName}
      </p>
      <h1 className="mt-2 font-display text-[32px] font-bold leading-tight tracking-[-0.6px] sm:text-[40px]">
        Here&rsquo;s what&rsquo;s on the table.
      </h1>
      <p className="mt-3 max-w-3xl text-[16.5px] text-ink-2">
        Estimated from your answers, deliberately conservative. Real point:{" "}
        <span className="font-bold text-ink">this is built to pay for itself.</span>{" "}
        Let&rsquo;s refine it together on a call.
      </p>

      {/* ---- MONEY TILES — Year-1 --------------------------------------- */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label="Yr-1 Funding Available"
          value={formatRange(model.funding)}
          /*
            NO "est" CHIP ON THIS TILE. The other three carry one; this one is
            deliberately bare per the locked decision. The sub-line explains
            the mechanism without qualifying the figure.
          */
          sub="AI R&D credit + accelerated depreciation. Your CPA firms it up."
          accent
        />
        <Tile
          label="Opportunity on the Table"
          value={formatRange(model.opportunity)}
          sub="procurement labor + cost-lever savings"
          est
        />
        <Tile
          label="Est. Investment"
          value={formatRange(model.investment)}
          sub="phased; start small"
          est
        />
        <Tile
          label="Net, Year 1"
          /*
            The word, not a number — and it is COMPUTED, not asserted. `netLow`
            takes funding low + opportunity low − investment HIGH, so "Positive"
            only prints when it survives the worst end of all three ranges. If
            it ever does not, the tile says so rather than lying.
          */
          value={net ? "Positive" : "Needs scoping"}
          sub={
            net
              ? "funding + savings > cost, by design"
              : "the numbers don't clear the bar yet — that's what the call is for"
          }
          est
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* ---- RANKED MOVES ---------------------------------------------- */}
        <section>
          <h2 className="font-display text-[22px] font-bold tracking-[-0.3px]">
            Your highest-impact moves
          </h2>
          <p className="mt-1.5 text-[14.5px] text-ink-2">
            Ranked by the dollars running through each area, not by how far behind it is.
          </p>
          <ol className="mt-4 space-y-3">
            {model.moves.slice(0, 5).map((m) => (
              <li
                key={m.domain}
                className="rounded-brand border border-line bg-white p-5 transition-colors hover:border-magenta"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-6 w-6 flex-none place-items-center rounded-full bg-magenta/10 text-[12.5px] font-black text-magenta"
                  >
                    {m.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[16.5px] font-bold text-ink">{m.title}</p>
                    <p className="mt-1 text-[14.5px] text-ink-2">{m.detail}</p>
                    <p className="mt-2 text-[13.5px] text-ink-2">
                      <span className="font-semibold text-ink">{m.timeline}</span>
                      {" · "}
                      {m.resource}
                      {" · "}
                      <span className="font-semibold text-ink">
                        {formatRange(m.opportunity)}
                      </span>{" "}
                      on the table
                    </p>
                  </div>
                </div>
              </li>
            ))}
            {model.moves.length === 0 && (
              <li className="rounded-brand border border-line bg-bg-soft p-5 text-[15px] text-ink-2">
                Nothing ranked — on your answers, procurement is already running at the top
                of the ladder. That is a finding worth talking through, not a blank page.
              </li>
            )}
          </ol>

          {/*
            "NOT SURE" IS SURFACED AS A FINDING, not swallowed. The engine spec
            says an unknown is usually an unowned process, which is exactly the
            kind of thing the call is for.
          */}
          {model.unknownDomains.length > 0 && (
            <p className="mt-4 rounded-brand border border-line bg-bg-soft p-4 text-[14.5px] text-ink-2">
              You marked <span className="font-bold text-ink">{model.unknownDomains.length}</span>{" "}
              {model.unknownDomains.length === 1 ? "area" : "areas"} &ldquo;not sure&rdquo;. That
              is usually a sign nobody owns them — worth ten minutes on the call.
            </p>
          )}

          {model.leapfrog && (
            <p className="mt-3 rounded-brand border border-magenta/25 bg-magenta/[0.05] p-4 text-[14.5px] text-ink-2">
              You&rsquo;re on a legacy ERP. There&rsquo;s usually a faster, cheaper path than a
              full cloud migration — AI on top of what you already run.
            </p>
          )}
        </section>

        {/* ---- PROGRESS + CTA -------------------------------------------- */}
        <aside className="space-y-5">
          <div className="rounded-brand border border-line bg-white p-6 text-center">
            <h3 className="text-[15px] font-bold text-ink">Savings progress vs plan</h3>
            <Donut pct={model.progressPct} />
            <p className="mt-3 text-[14px] text-ink-2">
              <span className="font-bold text-ink">{model.progressPct}%</span> — this is your
              plan. It fills in as we deliver.
            </p>
          </div>

          <div className="rounded-brand border border-magenta/30 bg-magenta/[0.04] p-6">
            <p className="text-[16.5px] font-bold text-ink">
              Book a 20-min call — let&rsquo;s talk funding
            </p>
            <p className="mt-2 text-[14.5px] text-ink-2">
              We only take on work that pays for itself.
            </p>
            <Link
              href="/assess/scope"
              className="mt-4 inline-flex rounded-full bg-magenta px-5 py-2.5 text-[14.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
            >
              Book a 20-min call ›
            </Link>
            <Link
              href="/assess/scope"
              className="mt-3 block text-[14px] font-semibold text-ink-2 underline underline-offset-2 hover:text-magenta"
            >
              See the detailed scope assessment →
            </Link>
          </div>

          <div className="rounded-brand border border-line bg-white p-6">
            <p className="text-[15px] font-bold text-ink">Your presentation</p>
            <p className="mt-1.5 text-[14.5px] text-ink-2">
              The six-slide version, built from these numbers — for the people who
              weren&rsquo;t in the room.
            </p>
            <Link
              href={`/assess/r/${model.shareToken}/deck`}
              className="mt-4 inline-flex rounded-full border-[1.5px] border-line px-5 py-2.5 text-[14.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
            >
              Open the deck ›
            </Link>
          </div>
        </aside>
      </div>

      {/*
        THE EXISTING MaturityDashboard, fed real numbers. Not a rebuild — the
        component already draws the gauge and the stage ladder, and it drops its
        "Sample Read" chip on its own now that `sample` is false. This is the
        handoff its own comment was written for.
      */}
      <section className="mt-10">
        <h2 className="font-display text-[22px] font-bold tracking-[-0.3px]">
          Where you are today
        </h2>
        <p className="mt-1.5 max-w-3xl text-[14.5px] text-ink-2">
          {/*
            ⚠ WAS "the eight procurement capability domains" AND WENT STALE THE DAY TWO
            MORE WERE ADDED (E034). Derived from the bank now, so it cannot say the
            wrong number again — an eleventh domain updates this sentence with no edit.
          */}
          Your maturity across the {model.maturityArea.domains.length} procurement
          capability domains — measured from your answers, not a sample.
        </p>
        <div className="mt-4">
          <MaturityDashboard area={model.maturityArea} />
        </div>
      </section>

      {/*
        THE PROCESS THEY ANSWERED COUNTS AS DONE, and it was missing — the walk
        rendered a "send this to a colleague" form for Procure-to-Pay on the
        report of the person who had just completed Procure-to-Pay. The API
        already refused it ("You already completed that one"), so the only way
        to find it was to look at the page.
      */}
      <SendToColleagues
        shareToken={model.shareToken}
        companyName={model.companyName}
        done={[model.processKey, ...model.invites.map((i) => i.process)]}
      />
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  est = false,
  accent = false,
}: {
  label: string;
  value: string;
  sub: string;
  est?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={
        "rounded-brand border p-5 " +
        (accent ? "border-magenta/30 bg-magenta/[0.04]" : "border-line bg-white")
      }
    >
      <p className="flex items-center gap-2 text-[12.5px] font-bold uppercase tracking-[0.05em] text-ink-2">
        {label}
        {est && (
          <span className="rounded-full bg-bg-soft px-1.5 py-0.5 text-[10.5px] font-bold normal-case tracking-normal">
            est
          </span>
        )}
      </p>
      <p className="mt-2 font-display text-[30px] font-bold leading-none tracking-[-0.6px] text-ink">
        {value}
      </p>
      <p className="mt-2 text-[13px] leading-snug text-ink-2">{sub}</p>
    </div>
  );
}

/**
 * A real SVG ring at whatever percentage it is given — including zero.
 *
 * Zero draws the track and no arc, which is visually honest: the shape of the
 * goal is there and none of it is filled. A "0%" printed over an empty box
 * would read as a rendering failure; an empty ring reads as not started.
 */
function Donut({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, pct)) / 100;
  return (
    <svg viewBox="0 0 140 140" className="mx-auto mt-4 h-[132px] w-[132px]" role="img"
      aria-label={`Savings progress against plan: ${pct} percent`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#ece9f1" strokeWidth="14" />
      {filled > 0 && (
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#D72CD6"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={`${c * filled} ${c}`}
          transform="rotate(-90 70 70)"
        />
      )}
      <text
        x="70"
        y="70"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-ink font-display"
        fontSize="26"
        fontWeight="700"
      >
        {pct}%
      </text>
    </svg>
  );
}
