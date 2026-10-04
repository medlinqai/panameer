import type { CSSProperties } from "react";
import Link from "next/link";
import { PROCESSES, type BusinessProcess } from "@/lib/processes";

/** A live process routes; a coming-soon one must not look clickable. */
function CardBody({ p }: { p: BusinessProcess }) {
  return (
    <>
      {}
      <span
        className="pp-media"
        aria-hidden
        style={
          {
            "--tint": p.tint,
            "--deep": p.deep,
            ...(p.media ? { backgroundImage: `url('${p.media}')` } : null),
          } as CSSProperties
        }
      />
      <span className="pp-scrim" aria-hidden />
      {/* Only when there is something to play. See the header note. */}
      {p.media && (
        <span className="pp-play" aria-hidden>
          &#9654;
        </span>
      )}

      <span className="pp-abbr">{p.abbr}</span>
      <span className="pp-name">{p.name}</span>
      <span className="pp-blurb">{p.blurb}</span>
      <span className="pp-foot">
        {}
        <span className="pp-meta">
          {p.domainCount === null ? "" : `${p.domainCount} capability domains`}
        </span>
        <span className={"pp-chip " + (p.status === "live" ? "is-live" : "is-soon")}>
          {p.status === "live" ? "Live" : "Coming soon"}
        </span>
      </span>
    </>
  );
}

export function ProcessPicker() {
  return (
    <section className="pp" id="step-process">
      <div className="wrap">
        {/*
          ── ⚠⚠ THE EYEBROW IS GONE FROM HERE (`P1-J0-E330`) ─────────────────

          ⚠ `/optimize` PRINTED IT TWICE IN ONE PANEL. `OptimizeSteps` maps
          `SPINE_STEPS` and prints `{s.eyebrow}` for every step, then renders
          `StepGraphic graphic="process-picker"` — which is this component,
          which printed its own hardcoded copy of the same string right beneath
          it. Two leaf nodes, same text, same panel.

          ⚠ SUPERSEDED 2026-08-26, quoted not deleted:
            *`<div className="eyebrow">Step 1 - Select a Business Process</div>`*

          ⚠ `OptimizeSteps` IS THE ONE THAT STAYS because it DERIVES the string
          from `spine-steps.ts:122`; this one was a second copy of it.
          ⚠ VERIFIED BEFORE DELETING, not assumed: nothing renders this component
          outside `OptimizeSteps`. `SpineSteps.tsx:46` maps it in the registry and
          `OptimizeSteps` imports only `StepGraphic`; the `SpineSteps` SECTION is
          imported by nothing, and `app/page.tsx:26` still holds — none of
          `HowItWorks`/`ProcessPicker`/`SpineSteps` is imported on `/`. So this
          component has exactly one live render path and it already has an eyebrow.
          ⚠ IF `SpineSteps` IS EVER RE-RENDERED it prints `s.eyebrow` too — the
          registry entry does not need this div back.
        */}
        {/*
          ⚠ E139 — SHIPPED AS THE EXACT LITERAL, INCLUDING NO TERMINAL PERIOD.

          Scott's string ends without a full stop. Flagged in the report; not
          added, because a silent period would mean the page and the brief
          disagree with nobody knowing which was intended.

          ⚠ NO `text-wrap:balance` HERE EITHER — see the standing rule in
          home.css. This heading had it plus a 36ch cap, the same defect as
          section 2's but worse: 36ch held it to 707px of a 1136px container.

          E140: the lede paragraph ("You will be asked a series questions...")
          is DELETED, not emptied — this longer title absorbs it. Its CSS rule is
          gone from home.css too.
        */}
        {/*
          ⚠ E230 — VERBATIM, Scott 2026-08-20. The detail is DROPPED, not lost:
          *"we will cover the details in the next section."* Do NOT re-add
          methods, counts or dollars to this heading.

          ⚠ THE SUBSTANTIVE CHANGE IS `you own` → `you are most familiar with`,
          and it must survive a re-word. Ownership is a title; the assessment
          needs whoever knows the numbers. The same qualification is now in
          `assessment-ready.ts` — two surfaces, one phrase, or the invite
          contradicts the page that sent it.
        */}
        <h2 className="pp-h2">
          Choose the business process you are most familiar with.
        </h2>

        <div className="pp-grid">
          {PROCESSES.map((p) =>
            p.status === "live" ? (
              /*
                A REAL LINK, because this one goes somewhere. One anchor with
                only spans inside it — `check:ui` §12 forbids an interactive
                element nested in another anywhere on this page.
              */
              <Link className="pp-card" key={p.key} href="/assess">
                <CardBody p={p} />
              </Link>
            ) : (
              /*
                ⚠ A DIV, NOT A DISABLED LINK. Coming-soon processes must not be
                "presented as clickable": no href, no pointer cursor, nothing in
                the tab order. An <a> without href would still be an <a>, and an
                aria-disabled link is a control that says it exists and then
                refuses — worse than a card that plainly is not one yet.
              */
              <div className="pp-card is-soon" key={p.key}>
                <CardBody p={p} />
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
