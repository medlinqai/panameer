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
        `aria-live="polite"` and not `assertive`: the swap is a response to the
        visitor's own click, so it should be announced at the next pause rather
        than interrupt whatever is being read.
      */}
      <div className="mat-card" aria-live="polite">
        <div className="mat-head">
          <div>
            <div className="ey">AI MATURITY ASSESSMENT</div>
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
  );
}
