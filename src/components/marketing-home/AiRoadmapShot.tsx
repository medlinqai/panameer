import {
  AlignLeft,
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  FileText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { AppShot } from "@/components/marketing-home/AppShot";
import { milestoneByKey, milestoneDetail } from "@/lib/roadmap-milestones";

type Row = {
  Icon: LucideIcon;
  /** Key into `ROADMAP_MILESTONES`. */
  key: string;
  /** Percent across the four-quarter lane. */
  left: number;
  width: number;
  /** Which bar tone — the lane's only colour variation. */
  tone: "mag" | "violet" | "blue" | "grey";
  value: string;
};

const ROWS: Row[] = [
  {
    Icon: Check,
    key: "invoice_match",
    left: 2,
    width: 9,
    tone: "mag",
    value: "$980K",
  },
  {
    Icon: BarChart3,
    key: "po_price",
    left: 8,
    width: 9,
    tone: "mag",
    value: "$520K",
  },
  {
    Icon: Sparkles,
    key: "rogue_spend",
    left: 28,
    width: 9,
    tone: "violet",
    value: "$610K",
  },
  {
    Icon: FileText,
    key: "contract_reneg",
    left: 54,
    width: 17,
    tone: "blue",
    value: "$265K",
  },
  {
    Icon: AlignLeft,
    key: "supplier_docs",
    left: 79,
    width: 9,
    tone: "grey",
    value: "$215K",
  },
];

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"];

const SLOTS = [
  { day: "Tue", date: "19", time: "10:30 am", taken: false },
  { day: "Wed", date: "20", time: "2:00 pm", taken: true },
  { day: "Thu", date: "21", time: "9:00 am", taken: false },
];

export function AiRoadmapShot() {
  return (
    <div className="rm-wrap">
      <AppShot railActive={2}>
        {}
        <div className="ash-main rm-main">
          <div className="ash-mh">
            <div>
              <h3 className="ash-h3">Procure-to-Pay AI Roadmap — Year 1</h3>
              <p className="ash-sub">
                Built from 23 optimization opportunities · 5 selected
              </p>
            </div>
            <div className="ash-mact">
              {}
              <span className="rm-seg" aria-hidden>
                <span className="is-on">Timeline</span>
                <span>Roadmap</span>
              </span>
              <span className="ash-pill">
                <Calendar className="ash-sv" strokeWidth={1.7} aria-hidden />
                Next 12 months
              </span>
            </div>
          </div>

          {}
          <div className="rm-ex">
            <span className="rm-ex-cam" aria-hidden>
              <svg
                viewBox="0 0 20 20"
                className="ash-sv"
                aria-hidden
                focusable="false"
              >
                <rect
                  x="2.2"
                  y="5.2"
                  width="11.4"
                  height="9.6"
                  rx="2.2"
                  fill="currentColor"
                />
                <path d="M14.4 9.2l3.4-2.4v6.4l-3.4-2.4z" fill="currentColor" />
              </svg>
            </span>
            <span className="rm-ex-t">
              <b>Dana Whitfield</b>
              <span>Panameer expert · Procure-to-Pay</span>
            </span>
            <span className="rm-live">
              <i aria-hidden />
              In session with you
            </span>
          </div>

          {/* ---- the timeline ------------------------------------------- */}
          <div className="rm-tl">
            <div className="rm-hd">
              <span className="rm-hd-a">Action</span>
              <span className="rm-lane" aria-hidden>
                {QUARTERS.map((q) => (
                  <span className="rm-q" key={q}>
                    {q}
                  </span>
                ))}
              </span>
              {}
              <span className="rm-act is-hd" aria-hidden />
            </div>

            {ROWS.map((r) => {
              const m = milestoneByKey(r.key);
              return (
                <div className="rm-row" key={r.key}>
                  <div className="rm-a">
                    <span className="rm-ico" aria-hidden>
                      <r.Icon className="ash-sv" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="rm-at">
                      <b>
                        {m.action}
                        {}
                        <span className="rm-av">{r.value}</span>
                      </b>
                      <span>
                        {milestoneDetail(m)} ·{" "}
                        <span
                          className={
                            "rm-own" + (m.isPartner ? " is-partner" : "")
                          }
                        >
                          {m.owner}
                        </span>
                      </span>
                    </span>
                  </div>
                  {}
                  <div className="rm-lane">
                    <span
                      className={`rm-bar is-${r.tone}`}
                      style={{ left: `${r.left}%`, width: `${r.width}%` }}
                    >
                      <b className="rm-bv">{r.value}</b>
                    </span>
                  </div>
                  {/*
                    ── ⚠ THE SOLUTION-LEVEL ACTION (E248) ───────────────────────

                    Scott: *"we need to show how a solution-level button on the
                    roadmap line is linking to this graphic (what you buy)."*
                    `GetTheTalentShot` already opens with "From your roadmap · Q3 ·
                    three ways to get it done" — a sentence that referred to a
                    click the reader had never been shown. This is that click.

                    ⚠ THE LABEL IS `Request`, DECIDED BY SCOTT, AND IT IS NOT A
                    SYNONYM TO BE TIDIED. A buyer raises a WORK REQUEST; providers
                    respond; it becomes a WORK ORDER once one accepts. At this line
                    nobody has accepted anything and the reader has not yet seen
                    the three options.

                    ⚠ AND THE NEXT SCREEN ALREADY AGREES. The expert card says
                    `proposed rate · est. 4 wks` and its action is `Interview` —
                    both state plainly that terms are not settled. `Order` here
                    would promise a commercial certainty the very next screen
                    withdraws. `Buy` is ruled out (Scott: "services are soooo
                    different"), and `Find Talent` is ruled out because two of the
                    three destinations are a package and a pre-built agent, and an
                    agent is not talent. THIS IS ALREADY CONSISTENT WITH THE OBJECT
                    MODEL — do not "fix" it to Order.

                    ⚠ SECONDARY BY CONSTRUCTION. `Load into Work Tracker` below is
                    the section's argument; this is smaller, quieter and greyer, and
                    must stay that way. Giving it its own column (E254, below) did
                    NOT promote it — the chip is unchanged; only the cell around it
                    is new.

                    ── ⚠ IT LIVES OUTSIDE THE QUARTERS (E254) ───────────────────

                    Scott, 2026-08-21: *"the Create Request button should be outside
                    of Q4."* ⚠ THE MEANING WAS WRONG, NOT JUST THE POSITION. The
                    quarter lane says WHEN a milestone is scheduled — $980K in Q1,
                    $265K in Q3. `Request` is NOT scheduled: it is available now, on
                    every row, whichever quarter that row's bar sits in. Sitting
                    unruled beside Q4 said "you can request this in Q4", which is the
                    opposite of what E248 put it there to say.

                    ⚠ IT WAS ALREADY ITS OWN GRID COLUMN. `.rm-row` has been
                    `296px 1fr auto` since E248 — measured before touching anything,
                    the chip's left edge was 1181.78 against a lane ending at
                    1167.78. What was missing was the SEPARATION: no rule, no tint,
                    and a Q4 header centred over a cell that visually ran to the
                    table's right edge. So this adds the divider the mockup draws —
                    2px where the quarter dividers are 1px — and does not move the
                    chip.

                    ⚠ THE QUARTERS ARE STILL A CONTINUOUS LANE, NOT FOUR CELLS, and
                    that is deliberate — see the note on ROWS. The approved mockup
                    draws `repeat(4,1fr)` with each bar in exactly one cell; doing
                    that here would flatten the 4-week item to the same width as the
                    2-week ones and un-overlap the two Q1 items, which is the
                    misdescription this layout exists to avoid and the reason the
                    serpentine was rejected. Composition ported; the grid was not.

                    ⚠ THIS IS A MARKETING SHOT, NOT THE PRODUCT. Rendered, never
                    wired — no route, no handler. The real roadmap→work-request path
                    is UNBUILT AND COUNSEL-GATED; `WorkTracker.tsx` carries the same
                    note for "Add work from your roadmap", recorded in
                    `claude/roadmap_to_talent_flow.md`. The gate is now visible in
                    both places.
                  */}
                  <span className="rm-act">
                    <span className="rm-req" aria-hidden>
                      Request
                    </span>
                  </span>
                </div>
              );
            })}
          </div>

          <div className="rm-f">
            {/*
              ── ⚠ A DIRECTIONAL BAND, NOT A POINT FIGURE (decided 2026-08-21) ──

              `decisions-01.md` § *The dashboard QUALIFIES; the roadmap meeting
              QUANTIFIES*. Scott: *"just some percentage in the beginning designed
              to get the buyer into the AI Roadmap mtg... We can use THAT meeting to
              pick solutions and estimate true savings."*

              ⚠ THE DANGER WAS NEVER A WRONG NUMBER — IT WAS A PRECISE ONE. The
              seven-figure point total this replaced invited a CFO to audit the
              model; a band invites a conversation, and the conversation is the
              product. The sub-line says so out loud rather than leaving the reader
              to infer it.

              (⚠ The retired figure is PARAPHRASED, not quoted — same convention as
              the retired rung-4 line in `questions-p2p.ts`, so that grepping `src/`
              for it returns only real usages and stays a usable check.)

              ⚠ THE LABEL ABOVE IT IS UNCHANGED — `Year-1 opportunity sequenced`.

              ⚠ THIS IS A MARKETING SHOT. The figures are illustrative and stay
              hardcoded here; they are NOT wired to `lib/assessment/scoring.ts` and
              must not be. Counsel gate, with the rest of this graphic's numbers.

              ⚠ AND `Est. savings hidden from providers` DOWNSTREAM BECOMES MORE
              LOAD-BEARING, NOT LESS. A directional estimate must never become the
              quote anchor a provider prices against. That pill is untouched.
            */}
            <span className="rm-tot">
              <span>Year-1 opportunity sequenced</span>
              <b>$1.8M &ndash; $3.2M</b>
              <span className="rm-tot-q">
                directional · sized with you in this session
              </span>
            </span>
            {/*
            ⚠ THIS BUTTON IS THE ARGUMENT — `Load into Work Tracker`, never
            `Download PDF`. See the note at the top of this file before changing it.
          */}
            <span className="rm-btn">
              Load into Work Tracker
              <ArrowRight className="ash-sv" strokeWidth={2} aria-hidden />
            </span>
          </div>
          <p className="rm-note">
            The roadmap lives in Panameer — the tracker picks it up as
            milestones, so the plan and the work you buy against it stay in one
            place.
          </p>
        </div>
      </AppShot>

      {/*
        ⚠ NOTHING IN THE ROADMAP MAY BE OBSCURED — same rule and same method as E163's
        email on Step 4. `rm-main`'s deep bottom padding is what gives the overlapping
        portion blank canvas to land on.

        ⚠ THE FOOTNOTE IS IN THE TEST SET, and that is not a detail. Chat's first
        attempt cleared every table cell and still clipped "The roadmap lives in
        Panameer — the tracker picks it up as milestones…", because the first
        intersection test did not include it. It is included now.

        ⚠ THE EMPTY BAND INSIDE THE FRAME IS THE COST OF OCCLUDING NOTHING, and it is
        deliberate. Trading a little occlusion for less dead space is Scott's call — do
        not tune it here.
      */}
      <aside className="rm-bk">
        <div className="rm-bk-h">
          <span className="rm-bk-av" aria-hidden>
            SW
          </span>
          <span className="rm-bk-n">
            <b>Scott Walls</b>
            <span>Project Coordinator</span>
          </span>
          <span className="rm-bk-len">45 minutes</span>
        </div>
        {/*
          ⚠ THE LOAD-BEARING STRING. It answers the objection that actually stops people
          booking a free call — "I'll have to explain everything again." It sits ON the
          card, in the graphic, because the graphic is what gets looked at. Do not trim.
        */}
        <div className="rm-bk-r">
          <i aria-hidden>✓</i>
          <p>
            Has already read your scorecard — every domain, every score, and the
            ranked opportunities.
          </p>
        </div>
        <div className="rm-bk-days">
          {SLOTS.map((s) => (
            <div className={"rm-bk-d" + (s.taken ? " is-off" : "")} key={s.day}>
              <b>{s.day}</b>
              <s>{s.date}</s>
              <em>{s.taken ? "booked" : s.time}</em>
            </div>
          ))}
        </div>
      </aside>

      {/*
        ⚠ BOTTOM-RIGHT, MIRRORING THE BOOKING CARD AT BOTTOM-LEFT so the two bracket
        the frame. Scott: "this might be a better image for the online consultation
        step — as opposed to an email."

        ⚠ IT SITS AFTER THE BOOKING CARD IN DOM ORDER ON PURPOSE. Below 900px both go
        static and document order becomes the stacking order — the brief asks for the
        photo beneath the card, so it has to come second here.

        ⚠ SAME TWO STRUCTURAL CONSTRAINTS AS THE CARD: `.ash` is `overflow:hidden`, so
        this is a SIBLING of the frame inside `rm-wrap`, not a child of it; and the
        deep bottom padding it overlaps lives on the step-5-only `rm-main`.

        ⚠ `next/image` WITH INTRINSIC DIMENSIONS AND CSS SIZING, NOT `fill`. `fill`
        needs a positioned ancestor, and this container is deliberately `position:static`
        below 900px — so `fill` would silently start positioning against `rm-wrap`
        instead and the photo would jump back over the frame at exactly the widths where
        it is supposed to have stopped overlapping. Passing 880x587 and letting CSS size
        the box works identically in both modes. `sizes` is explicit because the box is
        300px at desktop and full-width on a phone; without it next/image would optimise
        for 300px and serve a blurry image at 390.

        ⚠ STOCK PHOTOGRAPHY OF A STRANGER IS A CLAIM OF SORTS — it implies a person who
        is not a Panameer expert, in a frame that also names Dana Whitfield and Scott
        Walls. Counsel-gate item alongside the named availability.

        `alt=""` because the caption strip below carries the meaning as real text.
      */}
      <figure className="rm-photo">
        <Image
          src="/work-images/consultation.png"
          alt=""
          width={880}
          height={587}
          sizes="(max-width: 900px) 100vw, 300px"
        />
        <figcaption>
          Your session — 45 minutes, screen shared, no slides.
        </figcaption>
      </figure>
    </div>
  );
}
