import { ArrowRight, Check } from "lucide-react";
import { AppShot } from "@/components/marketing-home/AppShot";
import { P2P_DOMAINS as CAPABILITY_DOMAINS } from "@/lib/capability-domains";
import { P2P_DOMAINS as ASSESSED_DOMAINS } from "@/lib/assessment/questions-p2p";
import { assessmentProductFor } from "@/lib/brand";

const ACTIVE_INDEX = 3;
const ACTIVE_DOMAIN = CAPABILITY_DOMAINS[ACTIVE_INDEX];

const ACTIVE_LADDER = (() => {
  const found = ASSESSED_DOMAINS.find((d) => d.key === ACTIVE_DOMAIN.id);
  if (!found) {
    throw new Error(
      `AssessmentWizardShot: "${ACTIVE_DOMAIN.name}" is in capability-domains.ts ` +
        `but not in questions-p2p.ts, so its rung ladder cannot be derived.`,
    );
  }
  return found;
})();

/** 35% — the wizard is partway through the fourth of ten domains. */
const PROGRESS_PCT = 35;

/** Rung 2 is the selected answer, 0-based. */
const SELECTED_RUNG = 1;

export function AssessmentWizardShot() {
  return (
    <AppShot railActive={1}>
      <div className="ash-main">
        <div className="ash-mh">
          <div>
            {}
            <h3 className="ash-h3">{assessmentProductFor("Procure-to-Pay")}</h3>
            <p className="ash-sub">Ten capability domains · about 20 minutes</p>
          </div>
          <div className="ash-mact">
            <span className="ash-pill">Save &amp; finish later</span>
          </div>
        </div>

        <div className="wz">
          {/* ---- the progress rail ------------------------------------- */}
          <div className="wz-l">
            <p className="wz-k">Progress</p>
            <p className="wz-p">
              {ACTIVE_INDEX + 1} of {CAPABILITY_DOMAINS.length} capability
              domains
            </p>
            <div className="wz-bar" aria-hidden>
              <b style={{ width: `${PROGRESS_PCT}%` }} />
            </div>
            {/* Mapped over the ten, never hard-coded — an eleventh domain appears */}
            <ul className="wz-dl">
              {CAPABILITY_DOMAINS.map((d, i) => {
                const done = i < ACTIVE_INDEX;
                const on = i === ACTIVE_INDEX;
                return (
                  <li
                    className={done ? "is-done" : on ? "is-on" : undefined}
                    key={d.id}
                  >
                    <span className="wz-tick" aria-hidden>
                      {done ? (
                        <Check className="ash-sv" strokeWidth={3} aria-hidden />
                      ) : null}
                    </span>
                    {d.name}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ---- the question ----------------------------------------- */}
          <div className="wz-r">
            <p className="wz-qk">
              Capability domain {ACTIVE_INDEX + 1} of{" "}
              {CAPABILITY_DOMAINS.length} · {ACTIVE_DOMAIN.name}
            </p>
            {/* DERIVED, NOT WRITTEN (E155). This shipped carrying chat's wording */}
            <h4 className="wz-q">{ACTIVE_LADDER.question}</h4>
            <p className="wz-qs">
              Pick the description closest to how it actually runs — not how the
              policy reads.
            </p>
            <div className="wz-opts">
              {ACTIVE_LADDER.rungs.map((r, i) => (
                <div
                  className={"wz-opt" + (i === SELECTED_RUNG ? " is-sel" : "")}
                  key={r.title}
                >
                  <span className="wz-radio" aria-hidden />
                  <div className="wz-ot">
                    <span className="wz-oh">{r.title}</span>
                    <span className="wz-op">{r.examples}</span>
                  </div>
                  {/* home.css for no reader's benefit. The ladder metaphor is still */}
                  <span className="wz-rung">Option {i + 1}</span>
                </div>
              ))}
            </div>
            <div className="wz-f">
              <span className="wz-btn">Back</span>
              <span className="wz-btn is-mag">
                Next capability domain
                <ArrowRight className="ash-sv" strokeWidth={2} aria-hidden />
              </span>
              <span className="wz-sp">Answers save as you go</span>
            </div>
          </div>
        </div>
      </div>
    </AppShot>
  );
}
