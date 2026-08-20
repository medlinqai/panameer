import { FileText, Sparkles, type LucideIcon } from "lucide-react";
import { AppShot } from "@/components/marketing-home/AppShot";
import { milestoneByKey } from "@/lib/roadmap-milestones";

/**
 * `GetTheTalent`'s GRAPHIC — the three resource types, made concrete (E176).
 *
 * The section named an expert, a package and a pre-built agent in text and showed
 * none of them; it was the only section on `/` with no graphic. This is one milestone
 * from the roadmap — Contract renegotiation — offered three ways.
 *
 * ⚠ THE MILESTONE NAME COMES FROM `lib/roadmap-milestones.ts`, not from a string here.
 * The whole page argues that these sections are one journey: the roadmap plans this
 * item, the tracker executes it, and this is where you staff it. If the milestone gets
 * renamed, all three move together. (The header shows it lowercased the way the mockup
 * writes it — "Contract price renegotiation" in the mockup vs the list's "Contract
 * renegotiation"; the list wins, same as it did for the tracker at E173.)
 *
 * ── ⚠ WHY THE THREE VERBS DIFFER — DO NOT UNIFY THEM ─────────────────────────
 *
 * Scott, 2026-08-19: "Buy now feels like a product. services are soooo different." The
 * reason is structural — the three cards differ by HOW MUCH MARKET IS LEFT TO RESOLVE:
 *
 *   Expert   no price yet; location, history and scarcity set it   -> `Interview`
 *   Package  one named provider, published price, human accepts    -> `Review & hire`
 *   Agent    Panameer's own, no provider to accept                 -> `Deploy`
 *
 * ⚠ THERE IS NO "BUY NOW" ANYWHERE, because nothing completes on click — every path
 * ends with someone accepting. A button promising a checkout would be untrue.
 *
 * ── ⚠ TWO STRINGS SHIPPED AS MOCKED AND FLAGGED, NOT FIXED HERE ──────────────
 *
 * 1. `Deploy` may be the wrong verb. Scott, later the same day: "they are not an
 *    off-the-shelf buy it and you are done. there is an installation." If an agent
 *    needs a connector stood up, the honest verb is nearer `Start setup` and the card
 *    owes a line about what setup involves. The install model is undecided and is not
 *    this brief's to settle.
 * 2. `Setup: none — connects to your ERP` carries the same assumption.
 *
 * ⚠ COUNSEL GATE: a named person with a rate and a rating, a named partner firm with a
 * published price, and a named agent with a monthly price and an ERP-connection claim.
 * All illustrative, none real.
 *
 * Inert by construction — the actions are spans. Nothing here can be clicked.
 */

type Card = {
  /** The resource-type chip. The first card is the selected state. */
  chip: string;
  picked?: true;
  /** Round dark initials for a person; a magenta square icon for a thing. */
  initials?: string;
  Icon?: LucideIcon;
  name: string;
  sub: string;
  /** label -> value. Deliberately the same three-row shape in all three cards, so the
   *  cards compare rather than each inventing its own layout. */
  facts: [string, string][];
  price: string;
  priceNote: string;
  action: string;
  /** "" outlined magenta · "n" grey outline · "fill" solid magenta */
  actionTone: "" | "n" | "fill";
};

const CARDS: Card[] = [
  {
    chip: "An expert",
    picked: true,
    initials: "RM",
    name: "R. Mehta",
    sub: "Oracle Procurement Lead",
    facts: [
      ["Location", "Austin, TX"],
      ["History", "14 engagements · 4.9"],
      ["Availability", "2 weeks out"],
    ],
    price: /*
      ⚠ E247 — $125, NOT $185. It is a plain string and nothing derives from it,
      but it changes what this row ARGUES. At `est. 4 wks` the expert now reads as
      ≈$20,000 against the package's $18,000 fixed and the agent's $450/mo. At
      $185 it read ≈$29,600 — half again the package — so "three ways to get it
      done" was not a real choice, it was one obviously-priced option and two
      cheap ones. ⚠ DO NOT "fix" the other two to restore the old spread.
    */
    "$125/hr",
    priceNote: "proposed rate · est. 4 wks",
    action: "Interview",
    actionTone: "",
  },
  {
    chip: "A package",
    Icon: FileText,
    name: "Contract Renegotiation Sprint",
    sub: "StratERP",
    facts: [
      ["Scope", "6 deliverables"],
      ["Duration", "4 weeks"],
      ["Delivered", "31 times"],
    ],
    price: "$18,000",
    priceNote: "fixed price · published",
    action: "Review & hire",
    actionTone: "n",
  },
  {
    chip: "A pre-built agent",
    Icon: Sparkles,
    name: "Contract Price Alert Agent",
    sub: "Panameer",
    facts: [
      ["Runs", "continuously"],
      /* ⚠ flagged above — this asserts no installation, which is not settled. */
      ["Setup", "none — connects to your ERP"],
      ["Covers", "off-contract & renewal"],
    ],
    price: "$450/mo",
    priceNote: "fixed price · cancel anytime",
    action: "Deploy",
    actionTone: "fill",
  },
];

export function GetTheTalentShot() {
  const milestone = milestoneByKey("contract_reneg");
  return (
    <AppShot railActive={3}>
      <div className="ash-main">
        <div className="ash-mh">
          <div>
            <h3 className="ash-h3">{milestone.action}</h3>
            <p className="ash-sub">
              From your roadmap · Q3 · three ways to get it done
            </p>
          </div>
          <div className="ash-mact">
            {/*
              ⚠ LOAD-BEARING, NOT DECORATION. The roadmap's $265K is Panameer's estimate
              of what the fix is WORTH, not a budget — any provider who sees it prices
              against it, and the estimate becomes the quote. The pill states the rule on
              screen rather than leaving it as an internal policy. Do not soften it.
            */}
            <span className="ash-pill">Est. savings hidden from providers</span>
          </div>
        </div>

        <div className="gts-three">
          {CARDS.map((c) => (
            <div
              className={"gts-c" + (c.picked ? " is-pick" : "")}
              key={c.chip}
            >
              <span className={"gts-ck" + (c.picked ? "" : " is-n")}>
                {c.chip}
              </span>
              <div className="gts-ch">
                {/*
                  ⚠ `gts-av`, NEVER `av`. home.css already carries a bare `.pm-home .av`
                  — a 38px SQUARE with a 10px radius from another shot — and it would
                  capture this one, squaring the person's round avatar and leaving the
                  initials on no background. The mockup got away with `.ch .av` because
                  it had no such rule. Namespaced, and the computed values are asserted
                  from the DOM rather than read off the stylesheet.
                */}
                <span
                  className={"gts-av" + (c.Icon ? " is-sq" : "")}
                  aria-hidden
                >
                  {c.Icon ? (
                    <c.Icon className="ash-sv" strokeWidth={2} aria-hidden />
                  ) : (
                    c.initials
                  )}
                </span>
                <span className="gts-cht">
                  <b>{c.name}</b>
                  <span>{c.sub}</span>
                </span>
              </div>
              <div className="gts-meta">
                {c.facts.map(([k, v]) => (
                  <div key={k}>
                    <u>{k}</u>
                    {v}
                  </div>
                ))}
              </div>
              <div className="gts-price">
                <b>{c.price}</b>
                <span>{c.priceNote}</span>
              </div>
              {/* inert — a span, so nothing can be clicked */}
              <span
                className={
                  "gts-act" + (c.actionTone ? " is-" + c.actionTone : "")
                }
              >
                {c.action}
              </span>
            </div>
          ))}
        </div>

        <p className="gts-note">
          The right resource is whatever the recommendation needs — judgement, a
          known shape, or a rule that should just run.
        </p>
      </div>
    </AppShot>
  );
}
