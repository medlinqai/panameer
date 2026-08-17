import type { CSSProperties } from "react";
import Link from "next/link";
import { PROCESSES, type BusinessProcess } from "@/lib/processes";

/**
 * SECTION 3 / STEP 1 — CHOOSE THE BUSINESS PROCESS (E126).
 *
 * ── IT IS A LOOP OVER DATA, WHICH IS THE POINT OF THE SECTION ────────────────
 *
 * Scott's own version was four buttons in markup and he named the problem
 * himself: *"when I am creating the cards to route to the different processes, I
 * will have to come back and redo this again."* So there is exactly one card
 * here, rendered once per entry of `PROCESSES`.
 *
 * ⚠ NOTHING IN THIS FILE OR ITS CSS KNOWS HOW MANY PROCESSES THERE ARE. The
 * grid is `repeat(auto-fit, minmax(248px, 1fr))` and every per-process colour
 * arrives as a CSS custom property from the data — there is no `.pp-card--p2p`
 * class and there must never be one, because that is the thing that would make
 * a fifth process a code change instead of a data edit. Verified behaviourally:
 * a temporary fifth entry reflows the grid with zero CSS and zero JSX changes.
 *
 * ── MEDIA IS A FIELD, AND IT SHIPS EMPTY ─────────────────────────────────────
 *
 * `media: ""` on all four, so every card renders the generated gradient built
 * from its `tint`/`deep`. There is no footage for these four processes —
 * `public/` holds only clips shot for the Find Work story — and reusing one
 * would put a Learn clip behind Procure-to-Pay. The gradient is honest, needs no
 * assets, and gives each process its own hue, which is what stops the row
 * reading as four identical purple tiles.
 *
 * ⚠ THE PLAY BADGE IS CONDITIONAL ON `media`, AND THAT IS A DEVIATION I CHOSE.
 * The brief lists a play badge as part of the media layer. With `media` empty
 * there is no video, and a play affordance over a gradient advertises something
 * that does not exist and does nothing when clicked — the same rule that kept a
 * play chip off the five-step cards. It renders the moment real footage lands,
 * automatically, because it is keyed to the field.
 */

/** A live process routes; a coming-soon one must not look clickable. */
function CardBody({ p }: { p: BusinessProcess }) {
  return (
    <>
      {/*
        THE GRADIENT (or the footage, when there is any). Inline style carries
        only DATA — the two hues and, later, the image URL. The gradient itself
        is composed in home.css so the shape of it lives with the rest of the
        page's styling.
      */}
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
        {/*
          ⚠ NULL RENDERS NOTHING, NOT A ZERO. Three of the four processes have no
          established capability-domain count — see the long note in
          `lib/processes.ts`. An empty span keeps the chip right-aligned.
        */}
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
        <div className="eyebrow">Step 1 - Choose the Business Process</div>
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
        <h2 className="pp-h2">
          Choose the business process you understand and can answer questions
          about processing methods, volumes, and dollar amounts
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
