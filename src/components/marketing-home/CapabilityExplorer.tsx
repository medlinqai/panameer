"use client";

import { useState } from "react";
import {
  DEFAULT_DOMAIN_ID,
  LADDER,
  P2P_DOMAINS,
  P2P_OVERALL_SCORE,
  bandFor,
} from "@/lib/capability-domains";

/**
 * THE INTERACTIVE HALF of "Optimize by Capability Domain" (WS-1).
 *
 * ── A CLIENT ISLAND DOES NOT COST `/` ITS STATIC PRERENDER ───────────────────
 *
 * The old header comment on CapabilityFramework claimed it would, and that
 * claim was wrong — it is deleted there and corrected here. A Client Component
 * in the App Router is still rendered to HTML at build time and hydrated
 * afterwards; a route only goes dynamic when a dynamic API enters the tree
 * (`cookies()`, `headers()`, page-level `searchParams`, a `no-store` fetch).
 * None of those is needed to hold one string in `useState`, and the build gate
 * confirms it: `/` is still ○.
 *
 * It is a SEPARATE component from the section head so the island stays small —
 * the eyebrow, headline and the four process tabs are static markup and stay on
 * the server.
 *
 * ── ACCESSIBILITY ────────────────────────────────────────────────────────────
 *
 * The ten domains are a single-select group of real <button>s with
 * `aria-pressed`, so they are reachable and operable by keyboard in DOM order.
 * The card is `aria-live="polite"` — the visual change is instant and obvious,
 * and without the live region a screen-reader user would activate a button and
 * be told nothing happened.
 */
export function CapabilityExplorer() {
  const [selectedId, setSelectedId] = useState(DEFAULT_DOMAIN_ID);
  const domain = P2P_DOMAINS.find((d) => d.id === selectedId) ?? P2P_DOMAINS[0];
  const band = bandFor(domain.score);

  return (
    <div className="fw-body">
      <div>
        <h3>Procure-to-Pay Capability Domains</h3>
        {/*
          E104 — TELLS YOU WHAT THE LIST IS AND THAT IT DOES SOMETHING.

          Two jobs in one line. First, scale: the card on the right is one
          domain's scorecard, and without this the visitor reads it as the whole
          assessment rather than a tenth of it. Second, affordance: the ten rows
          are real buttons, but at rest they read as a checklist, so the second
          sentence says plainly that selecting one changes the card.

          COPY ONLY. The list, the buttons, `aria-pressed` and the E083
          selection behaviour below are untouched — the sentence describes what
          they already do rather than adding a hint that has to be kept in sync.
        */}
        <p className="fw-sub">
          This is one of ten capability domain scorecards in your assessment
          dashboard. Select a domain to see its scores and the suggested fix.
        </p>
        <ul className="caps">
          {P2P_DOMAINS.map((d) => {
            const on = d.id === domain.id;
            return (
              <li key={d.id}>
                <button
                  type="button"
                  className={"cap-btn" + (on ? " on" : "")}
                  aria-pressed={on}
                  onClick={() => setSelectedId(d.id)}
                >
                  <span className="chk" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="3">
                      <path d="m5 12 4 4 10-10" />
                    </svg>
                  </span>
                  {d.name}
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/*
        ⚠ A WRAPPER, BECAUSE THE CARD USED TO BE THE GRID CHILD ITSELF.

        `.fw-body` is `1fr 1fr`; the left column has always been a div holding a
        heading, a sub-line and the list, and the right column was the bare
        card. It needed a sibling to sit under, so it got one. Checked first
        that nothing selected the card positionally — `.mat-card` has exactly
        one rule and it is a plain class selector, and `.fw-body h3` is a
        DESCENDANT selector, so the heading below still matches inside here.
      */}
      <div>
        {/*
          THE SAME `.fw-body h3` AS THE LEFT COLUMN, deliberately — same element,
          same class, no new heading style and no hand-tuned size. Two column
          headings that merely look alike drift the first time one is touched.

          It has no `.fw-sub` after it, so `h3:has(+ .fw-sub)` does not apply and
          it keeps the standard 22px. That is right: the left heading explains
          its list and needs the tighter gap to its sub-line; this one sits
          straight on the card.
        */}
        <h3>Capability Domain Scorecard</h3>

        {/*
          `aria-live="polite"` and not `assertive`: the swap is a response to the
          visitor's own click, so it should be announced at the next pause rather
          than interrupt whatever is being read.
        */}
        <div className="mat-card" aria-live="polite">
          <div className="mat-head">
            <div>
              {/*
              ⚠ E106 IS REVERSED HERE, KNOWINGLY (E117). It shipped the same day.

              E106 made this "CAPABILITY DOMAIN SCORECARD FOR:" and argued the
              trailing colon was load-bearing, because the eyebrow read as a
              sentence into the domain name beneath it. That argument was sound
              and it is SUPERSEDED rather than wrong: the word "Scorecard" has
              moved up to the column heading above the card, so the eyebrow no
              longer has to carry the whole sentence — it just labels the name
              under it.

              What forced it is mobile. At 11px with .14em tracking, 31
              characters of caps do not fit a card that is half a column wide,
              and it wrapped. Shortening beat shrinking the type.

              The point E106 and E104 were both making still holds: this card is
              ONE domain out of ten, not the whole assessment. The heading above
              now says so, which is a better place for it than an eyebrow.
            */}
              <div className="ey">CAPABILITY DOMAIN</div>
              {/* The card belongs to the DOMAIN now; the process score moved out. */}
              <h4>{domain.name}</h4>
              <div className="mat-proc">
                Procure-to-Pay &middot; {P2P_OVERALL_SCORE} / 100 overall
              </div>
            </div>
            {/*
            E083 — "Sample", and no status dot. It said "● Live" over invented
            numbers. A green dot beside the word "Sample" would still read as a
            live-system indicator, so the dot is gone rather than recoloured.
          */}
            <div className="live sample">Sample</div>
          </div>

          <div className="mat-kpis">
            {domain.kpis.map((kpi) => (
              <div className="mk" key={kpi.label}>
                <div className="v">{kpi.value}</div>
                <div className="l">{kpi.label}</div>
                <div className={"t " + kpi.dir}>{kpi.delta}</div>
              </div>
            ))}
          </div>

          <div className="mat-sugg">
            <div className="lead">Suggested optimization</div>
            <p>{domain.suggestion}</p>
          </div>

          <div className="score">
            <div className="score-top">
              <span className="s">AI Maturity Score</span>
              <span className="n">
                <b>{domain.score}</b> / 100
              </span>
            </div>
            <div className="track">
              {/* Width from the score, not a hardcoded 72%. */}
              <div className="fill" style={{ width: `${domain.score}%` }} />
            </div>
            <div className="scale">
              {LADDER.map((step) => (
                <span key={step} className={step === band ? "cur" : undefined}>
                  {step}
                  {step === band ? " ▲" : ""}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
