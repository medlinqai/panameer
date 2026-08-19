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

/**
 * STEP 5's GRAPHIC — the Year-1 AI Roadmap, built on the call and handed to the
 * Project Tracker.
 *
 * ── ⚠ THIS GRAPHIC EXISTS TO MAKE ONE ARGUMENT (Scott, 2026-08-17) ────────────
 *
 * "build your AI Roadmap and load it into the Project Tracker. Gets us in the
 * tracker... it really keeps the client in our infrastructure. I do not want to
 * give them a document they take away."
 *
 * So the roadmap is not a deliverable that leaves on its own: it is built inside
 * Panameer, on the call, and it lands in the Project Tracker — the section already
 * further down this page under *What Comes After the Roadmap*. That is why the
 * primary button is `Load into Project Tracker` and NOT `Download PDF`, and why
 * the footnote says the roadmap lives in Panameer.
 *
 * ⚠ DO NOT ADD AN EXPORT, DOWNLOAD OR SHARE AFFORDANCE HERE. Its absence is the
 * argument. But the absence is about THE BUYER'S VIEW, not about whether export
 * exists at all — Scott, same day, on enterprise approvals: "maybe the expert has
 * a button the buyer doesn't." An export path does exist, through the expert, on
 * request, not self-serve. So equally: do not write copy anywhere claiming the
 * roadmap can never leave. It can, if they ask.
 *
 * ── ⚠ THE SHIPPED VIEW IS THE TIMELINE. THE SERPENTINE IS A SECOND VIEW ───────
 *
 * `mockups/step5_ai_roadmap_2026-08-17.html` draws a SERPENTINE, and it is not
 * what this builds — the brief is explicit that the mockup is the spec for the
 * *Roadmap* view when that gets built, and that the Timeline ships now. So the
 * Timeline below has no mockup and comes from the brief's own table.
 *
 * The reason is substantive, not aesthetic: a serpentine cannot show concurrency
 * or duration. Every stop is the same size and strictly sequential, while the real
 * Year-1 plan runs two items at once in Q1 and has a 4-week item beside 2-week
 * ones. A roadmap graphic that can show neither is misdescribing the plan. (The
 * reference slide Scott supplied has twelve enhancements and no time axis at all —
 * a backlog, which is what a serpentine is the right idiom for.)
 *
 * ⚠ DO NOT DELETE THE SERPENTINE MOCKUP. It wins for long, many-item programmes
 * where a Gantt is unreadable. Its spec lives in `2. Claude Sub-Files/dual_view_pattern.md`.
 *
 * ── ⚠ COUNSEL GATE ────────────────────────────────────────────────────────────
 *
 * The dollars, "23 optimization opportunities", the named expert Dana Whitfield,
 * Ingrao Dental Services, and the inert `Roadmap` tab (a claim for a view that does
 * not exist yet, same class as the AIP and the rung-4 agent names) are all public
 * claims or apparent references on a pre-account page. Blocker for launch, not for
 * build.
 *
 * ⚠ NO ABSOLUTE DATES. The Step 4 shot shipped "Thursday, 30 September 2022" and a
 * "1 Sep 22 – 30 Sep 22" pill, four years stale on a page that wants to read as
 * live (E149). `Next 12 months` is durable for the same reason. `Year 1`, not 3 —
 * it matches the flagged correction in `spine-steps.ts` step 5 and the 2–4 week
 * timeframes in the Step 4 findings table.
 */

/**
 * ⚠ THE NAMES AND OWNERS ARE NO LONGER DECLARED HERE — they come from
 * `lib/roadmap-milestones.ts`, which `ProjectTracker` reads too (E173). This roadmap
 * and that tracker are the SAME five milestones, planned and then executing; two
 * arrays could not keep that promise and had already broken it. This view adds only
 * what is its own: an icon, a bar position, a tone and a value.
 */
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

/**
 * ⚠ THE PERCENTAGES ARE THE POINT — DO NOT ROUND THEM TO WHOLE QUARTERS.
 *
 * They sit at roughly twice true scale so a two-week bar is legible at all, while
 * preserving the real ratio: the 4-week item is visibly ~2x the 2-week ones, and
 * the two Q1 items OVERLAP, which is what tells the reader the plan is not a
 * queue. An earlier draft spanned the 4-week item across Q2–Q3 — six months of bar
 * for four weeks of work — which is the misdescription this layout exists to
 * avoid, and the reason the serpentine was rejected.
 */
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
  /* ⚠ StratERP is amber against four grey Panameer chips — one item is a partner's
     product. Both the owner and that flag live in `roadmap-milestones.ts`. */
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

/* ── the booking card, lifted from `steps/ConsultShot.tsx` (E165) ──────────── */
/**
 * ⚠ LIFTED, NOT REBUILT. `ConsultShot` is the source and E164 proposes deleting the
 * section that renders it, so this moved first. Its reasoning came across with it:
 *
 * THE COORDINATOR IS A REAL ROLE, NOT A STOCK PERSON.
 * `panameer_virtual_firm_identity.md`: the Project Coordinator is "assigned the moment
 * the maturity assessment completes… a senior person who translates the read". That
 * doc also names the first one — "Scott is the first retainer" — so the card uses him
 * rather than inventing a plausible stranger. A fabricated name on a public page is
 * the same class of unverified claim as the placeholder testimonials further down, and
 * this one at least is true.
 *
 * ⚠ PRE-LAUNCH COPY SWAP. When coordinators beyond Scott exist this becomes whoever is
 * actually assigned, on the same list as the testimonial names and the "● Live" chip.
 *
 * NO PHOTOGRAPH. Initials, not a face — a real portrait needs a real consent
 * conversation, and a stock face would undo the entire point of the card.
 *
 * ⚠ NAME CONFLICT INSIDE THIS ONE GRAPHIC, FLAGGED AND NOT RESOLVED. The expert strip
 * above says `Dana Whitfield` / `Panameer expert · Procure-to-Pay`; this card says
 * `Scott Walls` / `Project Coordinator`. Two people, two role titles, one frame. Both
 * ship as given — which one the reader actually meets is Scott's call, not mine.
 *
 * Inert by construction: the slots are spans. Booking happens at /assess, and a fake
 * calendar that swallowed a click would be worse than no calendar.
 */
const SLOTS = [
  { day: "Tue", date: "19", time: "10:30 am", taken: false },
  { day: "Wed", date: "20", time: "2:00 pm", taken: true },
  { day: "Thu", date: "21", time: "9:00 am", taken: false },
];

export function AiRoadmapShot() {
  return (
    /*
      ⚠ THE WRAPPER EXISTS BECAUSE `.ash` IS `overflow:hidden` — the same reason
      `OptimizationDashboardShot` has one. The booking card hangs off the frame's
      bottom-left corner, and anything absolutely positioned inside `.ash` is clipped
      by the rule that keeps the frame's 14px radius honest. The card is a SIBLING of
      the frame, not a child of it.
    */
    <div className="rm-wrap">
      <AppShot railActive={2}>
        {/*
          ⚠ `rm-main` IS A STEP-5-ONLY MODIFIER. `ash-main` is shared by steps 2, 4 and
          5, so the deep bottom padding that gives the booking card blank canvas cannot
          go there — it would put dead space under the wizard and the dashboard too.
        */}
        <div className="ash-main rm-main">
          <div className="ash-mh">
            <div>
              <h3 className="ash-h3">Procure-to-Pay AI Roadmap — Year 1</h3>
              <p className="ash-sub">
                Built from 23 optimization opportunities · 5 selected
              </p>
            </div>
            <div className="ash-mact">
              {/*
              ⚠ DRAWN, NOT WIRED. No state, no `"use client"`, no handler. Every
              graphic in this spine is inert by construction, and an interactive
              control mid-page would push a client boundary into a Server Component
              tree that currently builds ○. It is `aria-hidden` because a
              non-functional two-segment control announced as a control is worse
              than one not announced at all.
            */}
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

          {/*
          ⚠ THE EXPERT STRIP IS LOAD-BEARING. It is the only place on this page a
          named human appears inside product chrome, and it is what makes "built
          together" true rather than decorative. `.rm-ex-t` is a wrapper so the
          `span{display:block}` rule cannot reach the badge — the mockup's
          `.expert span` did exactly that and flattened it.
        */}
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
                        {/* ⚠ the value moves here at <=620, where a 9% bar is ~26px
                        and cannot hold a label. Hidden above that. */}
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
                  {/*
                The lane is the coordinate space: `left`/`width` are percentages of
                it, so the bars keep their positions and their ratios at every
                width without a single measured pixel. The three dividers are drawn
                by the stylesheet at 25/50/75%.
              */}
                  <div className="rm-lane">
                    <span
                      className={`rm-bar is-${r.tone}`}
                      style={{ left: `${r.left}%`, width: `${r.width}%` }}
                    >
                      <b className="rm-bv">{r.value}</b>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rm-f">
            <span className="rm-tot">
              <span>Year-1 opportunity sequenced</span>
              <b>$2,590,000</b>
            </span>
            {/*
            ⚠ THIS BUTTON IS THE ARGUMENT — `Load into Project Tracker`, never
            `Download PDF`. See the note at the top of this file before changing it.
          */}
            <span className="rm-btn">
              Load into Project Tracker
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
