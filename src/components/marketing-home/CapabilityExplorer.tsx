"use client";

import { useState } from "react";
import {
  DEFAULT_DOMAIN_ID,
  LADDER,
  P2P_DOMAINS,
  P2P_OVERALL_SCORE,
  bandFor,
} from "@/lib/capability-domains";

export function CapabilityExplorer() {
  const [selectedId, setSelectedId] = useState(DEFAULT_DOMAIN_ID);
  const domain = P2P_DOMAINS.find((d) => d.id === selectedId) ?? P2P_DOMAINS[0];
  const band = bandFor(domain.score);

  return (
    <div className="fw-body">
      <div>
        <h3>Procure-to-Pay Capability Domains</h3>
        {}
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

      {}
      <div>
        {}
        <h3>Capability Domain Scorecard</h3>

        {}
        <div className="mat-card" aria-live="polite">
          <div className="mat-head">
            <div>
              {}
              <div className="ey">CAPABILITY DOMAIN</div>
              {/* The card belongs to the DOMAIN now; the process score moved out. */}
              <h4>{domain.name}</h4>
              <div className="mat-proc">
                Procure-to-Pay &middot; {P2P_OVERALL_SCORE} / 100 overall
              </div>
            </div>
            {}
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
