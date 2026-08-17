import Link from "next/link";

/**
 * "PROJECT TRACKER" — the loop closes (brief_home_assessment_spine §5).
 *
 * ── IT ONLY MAKES SENSE AS THE LAST SECTION ──────────────────────────────────
 *
 * The assessment gives you a score, the consultation names the fixes,
 * GetTheTalent hands you the people — and this is where you watch that score
 * move. That is why the copy points back at the opening number rather than
 * describing features: a tracker pitched on its own is a PSA tool nobody asked
 * for, and the argument here is precisely that you do not have to buy one.
 *
 * ── THE PROGRESS RING IS THE SAME 0% RING FROM THE REPORT ────────────────────
 *
 * `ReportDashboard` draws a fresh report at 0% deliberately, and this section
 * is what fills it. Drawn here PART-WAY on purpose — this is the only graphic
 * on the page showing a delivered state, and that contrast with step 4's empty
 * ring is the point being made. It is illustrative, and marked as such by
 * sitting inside the same inert product-shot chrome as every other graphic.
 *
 * ── THE REPEATED CTA ─────────────────────────────────────────────────────────
 *
 * The brief asks for the assessment CTA again at the foot, so a visitor who
 * read the whole page does not have to scroll back up. It is the same
 * destination as the hero's, deliberately: one page, one job.
 *
 * Inert by construction: the only interactive element is the CTA link.
 */

const MILESTONES = [
  { name: "Invoice match exceptions", who: "Package · 2 wks", state: "done", pct: 100 },
  { name: "PO price alerts", who: "Agent · live", state: "done", pct: 100 },
  { name: "Contract price renegotiation", who: "Expert · 4 wks", state: "run", pct: 55 },
  { name: "Supplier registration validation", who: "Agent · queued", state: "next", pct: 0 },
];

export function ProjectTracker() {
  return (
    <section className="ptr">
      <div className="wrap">
        {/*
          ⚠ THE EYEBROW ANSWERS A QUESTION INSTEAD OF NAMING A FEATURE.
          "Project Tracker" labelled the tool; this labels the moment in the
          narrative — assess, dashboard, AI Roadmap, and then what? Only the
          eyebrow changes; the heading below it was already right.
        */}
        <div className="eyebrow">What Comes After the Roadmap</div>
        <h2 className="ptr-h2">And this is where you watch the score move.</h2>
        <p className="ptr-lead">
          Milestones, timeline, spend and deliverables across however many
          experts, packages and agents you deployed &mdash; in one place, without
          buying a PSA tool or standing up another project system to track the
          work you just bought.
        </p>

        <div className="ptr-shot">
          <div className="ptr-win" aria-hidden>
            <span className="ptr-dot r" />
            <span className="ptr-dot y" />
            <span className="ptr-dot g" />
          </div>

          <div className="ptr-body">
            <div className="ptr-stats">
              <div className="ptr-stat">
                <span className="ptr-sl">Opportunity captured</span>
                <span className="ptr-sv">$31K</span>
                <span className="ptr-sn">of $47K identified</span>
              </div>
              <div className="ptr-stat">
                <span className="ptr-sl">Spend to date</span>
                <span className="ptr-sv">$12K</span>
                <span className="ptr-sn">of $20K budgeted</span>
              </div>
              <div className="ptr-stat">
                <span className="ptr-sl">Maturity</span>
                <span className="ptr-sv">
                  42 <span className="ptr-arrow">&rarr;</span> 58
                </span>
                <span className="ptr-sn">since the assessment</span>
              </div>
            </div>

            <div className="ptr-rows">
              {MILESTONES.map((m) => (
                <div className="ptr-row" key={m.name}>
                  <span className={"ptr-chip is-" + m.state} aria-hidden />
                  <span className="ptr-name">
                    <span className="ptr-nt">{m.name}</span>
                    <span className="ptr-nw">{m.who}</span>
                  </span>
                  <span className="ptr-track">
                    <span
                      className={"ptr-fill is-" + m.state}
                      style={{ width: `${m.pct}%` }}
                    />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="ptr-cta">
          <Link className="btn btn-solid" href="/assess">
            Where Can AI Help My Business? &rsaquo;
          </Link>
          <span className="ptr-ctan">
            Free. About eight minutes. No account needed to start.
          </span>
        </div>
      </div>
    </section>
  );
}
