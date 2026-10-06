import { ArrowRight, Calendar } from "lucide-react";
import { AppShot } from "@/components/marketing-home/AppShot";
import { milestoneByKey, milestoneDetail } from "@/lib/roadmap-milestones";

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
      {
        key: "po_price",
        tail: null,
        state: "done",
        pct: 100,
        status: "Done",
        detail: `${milestoneByKey("po_price").resource} · live`,
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

/** counted from its own rows and its bar is the mean of their percentages, so editing a */
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

export function WorkTracker() {
  return (
    <section className="ptr">
      <div className="wrap">
        {/* THE EYEBROW ANSWERS A QUESTION INSTEAD OF NAMING A FEATURE. */}
        <div className="eyebrow">What Comes After the Roadmap</div>
        <h2 className="ptr-h2">And this is where you watch the score move.</h2>
        <p className="ptr-lead">
          Milestones, timeline, spend and deliverables across however many
          experts, packages and agents you deployed &mdash; in one place,
          without buying a PSA tool or standing up another project system to
          track the work you just bought.
        </p>

        {/* THE SHARED `AppShot` FRAME, `railActive={4}` — the documents tile, which is */}
        <AppShot railActive={4}>
          <div className="ash-main">
            <div className="ash-mh">
              <div>
                {/* right on a harder point than vocabulary: `Project` IS ALREADY A */}
                <h3 className="ash-h3">
                  Procure-to-Pay AI Roadmap — Work Tracker
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
                        {/* DRAWN, NOT WIRED — a span with a chevron, no <select>, no */}
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
              {/* COUNSEL GATE: this claims a flow that does not exist. The */}
              <span className="trk-btn">
                Add work from your roadmap
                <ArrowRight className="ash-sv" strokeWidth={2} aria-hidden />
              </span>
            </div>
          </div>
        </AppShot>

        {/* THE PAGE NOW ENDS ON THE TRACKER SCREENSHOT WITH NO CLOSING ACTION */}
      </div>
    </section>
  );
}
