import { ArrowRight, Calendar } from "lucide-react";
import Link from "next/link";
import { AppShot } from "@/components/marketing-home/AppShot";
import { milestoneByKey, milestoneDetail } from "@/lib/roadmap-milestones";

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
 * ── THE PROGRESS IS THE SAME 0% REPORT, PART-FILLED ──────────────────────────
 *
 * `ReportDashboard` draws a fresh report at 0% deliberately, and this section is what
 * fills it. Drawn here PART-WAY on purpose — this is the only graphic on the page
 * showing a DELIVERED state, and that contrast with step 4's empty one is the point
 * being made. It is illustrative, and marked as such by sitting inside the same inert
 * product-shot chrome as every other graphic.
 *
 * ⚠ AS OF E173 THAT PROGRESS IS SHOWN AS PHASE GROUPS, NOT A RING. Scott: "it needs
 * to show the project tracker (which we might need to beef up a little bit)" —
 * pointing at the AIM/StratERP task builder. Three quarter groups each carry their own
 * `n of m` and percentage, five KPI cards sit above them, and every row has a state
 * dot, an owner chip, a bar and a status control. The argument is unchanged; the
 * evidence for it got specific.
 *
 * ── ⚠ SHAPE FROM AIM, NOT DENSITY ────────────────────────────────────────────
 *
 * AIM shows ~200 tasks, task ids, owner inputs, a source filter and a Proposed/amber
 * treatment because it is a BUILD tool. This is the CLIENT's tracker: five milestones
 * that came off their own roadmap. None of that builder furniture is here, and adding
 * it would make this a picture of our internal tooling rather than of what they get.
 *
 * ── THE REPEATED CTA ─────────────────────────────────────────────────────────
 *
 * The brief asks for the assessment CTA again at the foot, so a visitor who
 * read the whole page does not have to scroll back up. It is the same
 * destination as the hero's, deliberately: one page, one job.
 *
 * Inert by construction: the only interactive element is the CTA link.
 */

/**
 * ⚠ FIVE MILESTONES, READ FROM `lib/roadmap-milestones.ts` — THE SAME LIST STEP 5's
 * ROADMAP DRAWS. That is the whole argument of this section: this IS that roadmap,
 * executing. It was FOUR hand-typed rows before E173, and two of the names disagreed
 * with the roadmap ("Contract price renegotiation" vs "Contract renegotiation",
 * "Supplier registration validation" vs "Supplier doc validation") while
 * "Rogue-spend alert" was missing entirely — so the plan and the execution were
 * telling a reader different things about what the plan was. One list now; the names
 * cannot drift again.
 *
 * ⚠ THE APPROVED MOCKUP CARRIES THOSE TWO OLD NAMES, and the brief's own rule
 * overrides it: "Names and owners must match `AiRoadmapShot` exactly… If one changes,
 * both change." Reported rather than silently chosen.
 *
 * ⚠ STATES, NOT DATES (E149). The mockup's first draft had "closed 14 Oct" /
 * "started 4 Nov" / "loaded 2 Oct" and they were struck: a hardcoded date in
 * marketing chrome only rots. `tail` says where a milestone stands instead.
 */
const PHASES = [
  {
    title: "Q1 · Deployed",
    rows: [
      {
        key: "invoice_match",
        tail: "complete",
        state: "done",
        pct: 100,
        status: "Done",
      },
      /* "live" rather than "2 wks · complete" — an agent that is running is not a
         finished project, it is a thing still working. */
      {
        key: "po_price",
        tail: null,
        state: "done",
        pct: 100,
        status: "Done",
        detail: "Agent · live",
      },
    ],
  },
  {
    title: "Q2 · In flight",
    rows: [
      {
        key: "rogue_spend",
        tail: "in build",
        state: "run",
        pct: 70,
        status: "In progress",
      },
      /* The one row naming a human, and it names the SAME expert as the Step 5
         booking card's session — the person you met is the person doing it. */
      {
        key: "contract_reneg",
        tail: "Dana Whitfield",
        state: "run",
        pct: 40,
        status: "In progress",
      },
    ],
  },
  {
    title: "Q3 – Q4 · Queued",
    rows: [
      {
        key: "supplier_docs",
        tail: "not started",
        state: "next",
        pct: 0,
        status: "Queued",
      },
    ],
  },
] as const;

/**
 * ⚠ `n of m` AND THE PERCENTAGE ARE DERIVED, NOT TYPED. A group's completion is
 * counted from its own rows and its bar is the mean of their percentages, so editing a
 * row's `pct` cannot leave a header claiming something the rows below it contradict —
 * which is exactly the class of error a hand-typed "1 of 2, 55%" invites.
 */
const phaseStats = (rows: readonly { state: string; pct: number }[]) => {
  const done = rows.filter((r) => r.state === "done").length;
  const pct = Math.round(rows.reduce((n, r) => n + r.pct, 0) / rows.length);
  return { done, total: rows.length, pct };
};

/** The five KPI cards. The first three are unchanged so figures a reader may already
 *  have seen do not move; Milestones and On schedule are new at E173. */
const KPIS = [
  { label: "Opportunity captured", value: "$31K", note: "of $47K identified" },
  { label: "Spend to date", value: "$12K", note: "of $20K budgeted" },
  {
    label: "Maturity",
    value: "42 → 58",
    note: "since the assessment",
    arrow: true,
  },
  { label: "Milestones", value: "2 / 5", note: "complete" },
  {
    label: "On schedule",
    value: "Yes",
    note: "no milestone past due",
    up: true,
  },
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
          experts, packages and agents you deployed &mdash; in one place,
          without buying a PSA tool or standing up another project system to
          track the work you just bought.
        </p>

        {/*
          ⚠ THE SHARED `AppShot` FRAME, `railActive={4}` — the documents tile, which is
          the one the mockup highlights. Steps 4/2/5 use 0/1/2, so all four product
          shots on this page now point at a different rail item, which is what makes
          them read as four screens of one product rather than four screenshots.

          ⚠ NO WRAPPER AND NO PADDING MODIFIER HERE, unlike steps 4 and 5: nothing
          overhangs this frame, so there is nothing for `.ash`'s `overflow:hidden` to
          clip and no blank band to reserve. `.ash-main` is shared by steps 2/4/5 and
          this adds nothing to it.
        */}
        <AppShot railActive={4}>
          <div className="ash-main">
            <div className="ash-mh">
              <div>
                <h3 className="ash-h3">
                  Procure-to-Pay AI Roadmap — Project Tracker
                </h3>
                <p className="ash-sub">
                  5 milestones from your Year-1 roadmap · loaded from your
                  roadmap
                </p>
              </div>
              <div className="ash-mact">
                <span className="ash-pill">
                  <Calendar className="ash-sv" strokeWidth={1.7} aria-hidden />
                  Next 12 months
                </span>
              </div>
            </div>

            <div className="trk-kpis">
              {KPIS.map((k) => (
                <div className="trk-k" key={k.label}>
                  <span className="trk-kl">{k.label}</span>
                  <span className={"trk-kv" + (k.up ? " is-up" : "")}>
                    {k.arrow ? (
                      <>
                        42 <span className="trk-arrow">→</span> 58
                      </>
                    ) : (
                      k.value
                    )}
                  </span>
                  <span className="trk-kn">{k.note}</span>
                </div>
              ))}
            </div>

            {PHASES.map((ph) => {
              const st = phaseStats(ph.rows);
              return (
                <div className="trk-ph" key={ph.title}>
                  <div className="trk-phh">
                    <div className="trk-pht">
                      <h4>{ph.title}</h4>
                      <p>
                        {st.done} of {st.total} complete
                      </p>
                    </div>
                    <span className="trk-phm">
                      <span>
                        {st.done} of {st.total}
                      </span>
                      <i aria-hidden>
                        <b style={{ width: `${st.pct}%` }} />
                      </i>
                      <em>{st.pct}%</em>
                    </span>
                  </div>
                  {ph.rows.map((r) => {
                    const m = milestoneByKey(r.key);
                    return (
                      <div className="trk-row" key={r.key}>
                        <span className={"trk-dot is-" + r.state} aria-hidden />
                        <span className="trk-nm">
                          <b>{m.action}</b>
                          <span>
                            {"detail" in r && r.detail
                              ? r.detail
                              : milestoneDetail(m, r.tail ?? undefined)}
                          </span>
                        </span>
                        <span
                          className={
                            "trk-own" + (m.isPartner ? " is-partner" : "")
                          }
                        >
                          {m.owner}
                        </span>
                        <span className="trk-bar" aria-hidden>
                          <b
                            className={"is-" + r.state}
                            style={{ width: `${r.pct}%` }}
                          />
                        </span>
                        {/*
                          ⚠ DRAWN, NOT WIRED — a span with a chevron, no <select>, no
                          state, no "use client". Every graphic on this page is inert;
                          a control that swallows a click is worse than no control.
                        */}
                        <span
                          className={
                            "trk-st" + (r.state === "done" ? " is-done" : "")
                          }
                          aria-hidden
                        >
                          {r.status} <i>▾</i>
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            <div className="trk-foot">
              <p>
                Every expert, package and agent you deployed — in one place,
                without buying a PSA tool.
              </p>
              {/*
                ⚠ COUNSEL GATE: this claims a flow that does not exist. The
                roadmap→work-request path is recorded in
                `claude/roadmap_to_talent_flow.md` and is unbuilt. It joins the list
                with the inert Timeline/Roadmap tab on Step 5.
              */}
              <span className="trk-btn">
                Add work from your roadmap
                <ArrowRight className="ash-sv" strokeWidth={2} aria-hidden />
              </span>
            </div>
          </div>
        </AppShot>

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
