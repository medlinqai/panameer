import { ArrowRight, Check } from "lucide-react";
import { AppShot } from "@/components/marketing-home/AppShot";
import { P2P_DOMAINS as CAPABILITY_DOMAINS } from "@/lib/capability-domains";
import { P2P_DOMAINS as ASSESSED_DOMAINS } from "@/lib/assessment/questions-p2p";

/**
 * STEP 2's GRAPHIC — the assessment wizard, mid-questionnaire.
 *
 * A COMPONENT, NOT A PNG, and it renders inside the shared `AppShot` shell. It
 * imports nothing from the real `AssessmentWizard`: `/` prerenders static with no
 * session, and the real wizard is a stateful client surface under active change.
 *
 * ── ⚠ THE LADDER IS DERIVED FROM THE QUESTION BANK, NOT RETYPED ───────────────
 *
 * The four options come from `lib/assessment/questions-p2p.ts` by looking up the
 * domain this screen is showing. That is the strongest available form of the
 * brief's "take it from the file, do not retype it": the marketing art cannot
 * drift from the product's real ladder, because it has no copy of it. Rung titles
 * and rung examples both come across, so the ladder shown here is the ladder the
 * assessment actually asks.
 *
 * ⚠ TWO DIFFERENT `P2P_DOMAINS` ARE IN PLAY HERE, ON PURPOSE:
 *
 *   - `lib/capability-domains.ts` — the TEN advertised on `/`, used for the
 *     progress list, same source as the Step 3 funnel after E143.
 *   - `lib/assessment/questions-p2p.ts` — the EIGHT actually assessed, used for
 *     the ladder. The two never assessed are Data, Analytics & AI Governance and
 *     Change Management & AI Adoption.
 *
 * They are joined by NAME rather than by index, so reordering either list cannot
 * silently pair a heading with someone else's ladder — which is the exact defect
 * described below.
 *
 * ── ⚠ THE MOCKUP PAIRED DOMAIN 4's HEADING WITH DOMAIN 1's LADDER ─────────────
 *
 * `mockups/step2_assessment_wizard_2026-08-17.html` shows the heading "Capability
 * domain 4 of 10 · Purchase Order Management" above these example lines:
 *
 *     rung 1  "Excel/XLS, Sharepoint, SmartSheets, Word, Email, etc."
 *     rung 2  "Enterprise Resource Planning or ERP Applications (HCM, F&A, SCM, etc.)"
 *     rung 4  "Voice-Request Agent, Price Alert Agent, Services Procurement Fulfillment, etc."
 *
 * All three are the REQUISITIONING domain's — domain 1, "How do employees request
 * goods and services?" — not Purchase Order Management's. The brief named that
 * rung-4 string explicitly and said to take it from the file; it IS in the file,
 * attached to a different domain. Deriving by name resolves it: the ladder shown
 * is `purchase_orders`', which is what the heading claims.
 *
 * The brief also expected the rung-3 line to be chat-written filler because
 * "the real INTEGRATED rung has no per-domain examples for Purchase Order
 * Management". It has one — `INTEGRATED` is a single shared RungOption used by all
 * eight domains, so the string exists, it is just not per-domain. It comes from
 * the file like the rest, and no filler ships.
 */

/**
 * Which domain the screen is sitting on — 0-based, so 3 is "4 of 10". Everything
 * derived: the eyebrow, the ticks, the counter and the ladder all read this.
 */
const ACTIVE_INDEX = 3;
const ACTIVE_DOMAIN = CAPABILITY_DOMAINS[ACTIVE_INDEX];

/**
 * ⚠ THROWS AT BUILD IF THE TWO LISTS STOP AGREEING, AND THAT IS THE POINT. Both
 * are static in-repo data, so a miss means someone renamed a domain in one file
 * and not the other. A silent `?? []` would ship a wizard with no options on it —
 * a prerender failure naming the domain is the cheaper outcome.
 */
const ACTIVE_LADDER = (() => {
  const found = ASSESSED_DOMAINS.find((d) => d.name === ACTIVE_DOMAIN.name);
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
            <h3 className="ash-h3">Procure-to-Pay AI Adoption Assessment</h3>
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
            {/*
              Mapped over the ten, never hard-coded — an eleventh domain appears
              here, in the counter above and in the Step 3 funnel with no edit.
              State is derived from position against ACTIVE_INDEX, so moving the
              active domain moves the ticks with it.
            */}
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
            {/*
              ⚠ THE QUESTION IS THE BRIEF'S, NOT THE FILE'S — flagged, not fixed.
              The bank asks "How does your organization place and manage orders
              with suppliers?"; the brief specifies this wording verbatim. The
              brief's "take it from the file" instruction was attached to the rung
              EXAMPLES, so the examples are derived and this stays as written.
            */}
            <h4 className="wz-q">
              How are purchase orders created, approved and priced today?
            </h4>
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
                  <span className="wz-rung">Rung {i + 1}</span>
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
