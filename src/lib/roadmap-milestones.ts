/**
 * THE FIVE YEAR-1 MILESTONES — one list, read by the Step 5 roadmap AND the tracker.
 *
 * ── WHY THIS IS A SHARED MODULE AND NOT TWO ARRAYS ───────────────────────────
 *
 * `brief_project_tracker_beef` states the rule these two graphics live under: "The
 * five milestones are the Step 5 roadmap's five actions. Names and owners must match
 * `AiRoadmapShot` exactly — the argument is that this IS that roadmap, executing. If
 * one changes, both change."
 *
 * Two arrays cannot keep that promise, and had already broken it: the tracker shipped
 * "Contract price renegotiation" and "Supplier registration validation" against the
 * roadmap's "Contract renegotiation" and "Supplier doc validation", and carried FOUR
 * milestones where the roadmap has five (Rogue-spend alert was missing). A reader
 * comparing the two sections would have found the plan and the execution disagreeing
 * about what the plan was.
 *
 * So the FACTS live here and each view adds only what is its own:
 *   `AiRoadmapShot`  — an icon, a bar position, a tone and a dollar value
 *   `WorkTracker` — a phase, a state, a percentage and a status label
 *
 * ⚠ `detail` IS COMPOSED, NOT STORED, because the two views need different tails.
 * The roadmap shows "Deployable · 2 wks"; the tracker appends a state —
 * "Deployable · 2 wks · in build". Storing one string would have forced one of them
 * to lie.
 *
 * ⚠ THE ORDER IS THE ROADMAP'S SEQUENCE and both views depend on it: the roadmap
 * draws bars left to right in it, and the tracker groups them into quarters in it.
 */
export type RoadmapMilestone = {
  key: string;
  action: string;
  /**
   * ⚠ `Deliverable` · `Deployable` · `Expert's hours` — WHAT IS BEING BOUGHT, in
   * Scott's vocabulary as of 2026-08-21 (E254's brief, WS2). Was `Package` /
   * `Agent` / `Expert`.
   *
   * ⚠ THESE ARE THE SAME THREE NAMES AS `Package.kind`
   * (`DELIVERABLE · DEPLOYABLE · HOURS`, `brief_solution_types_2026-08-21`) AND
   * THEY MUST NOT DRIFT FROM IT. A roadmap line that says one word and the catalog
   * row behind it that says another is the same class of defect E173 fixed between
   * this list and the tracker.
   *
   * ⚠ `Deployment` IS BANNED AS A WORD ON THIS SURFACE — one letter from
   * `Deployable` and the opposite meaning: a deployable is the THING, a deployment
   * is the ACT. Do not "correct" one into the other.
   *
   * ⚠ CHANGING A WORD HERE CHANGES BOTH SURFACES ON `/`, WHICH IS THE POINT OF THIS
   * FILE. `AiRoadmapShot` and `WorkTracker` both render it through
   * `milestoneDetail`, so the plan and the execution cannot disagree about what
   * kind of thing is being bought. An override in one view would re-create exactly
   * the drift this module exists to prevent.
   */
  resource: string;
  weeks: string;
  owner: string;
  /** ⚠ Amber chip vs grey. One milestone is a partner's product, four are ours. */
  isPartner: boolean;
};

export const ROADMAP_MILESTONES: RoadmapMilestone[] = [
  { key: "invoice_match", action: "Invoice match exceptions", resource: "Deliverable", weeks: "2 wks", owner: "Panameer", isPartner: false },
  { key: "po_price", action: "PO price alerts", resource: "Deployable", weeks: "2 wks", owner: "Panameer", isPartner: false },
  { key: "rogue_spend", action: "Rogue-spend alert", resource: "Deployable", weeks: "2 wks", owner: "Panameer", isPartner: false },
  { key: "contract_reneg", action: "Contract renegotiation", resource: "Expert’s hours", weeks: "4 wks", owner: "StratERP", isPartner: true },
  { key: "supplier_docs", action: "Supplier doc validation", resource: "Deployable", weeks: "2 wks", owner: "Panameer", isPartner: false },
];

/** "Deployable · 2 wks", plus an optional state tail for the tracker. */
export const milestoneDetail = (m: RoadmapMilestone, tail?: string) =>
  [m.resource, m.weeks, tail].filter(Boolean).join(" · ");

export const milestoneByKey = (key: string) => {
  const m = ROADMAP_MILESTONES.find((x) => x.key === key);
  /*
    ⚠ THROWS AT BUILD rather than rendering a hole. Both callers key into this list
    by string, so a typo or a removed milestone should stop the build naming the key,
    not produce a tracker row with no name in it.
  */
  if (!m) throw new Error(`roadmap-milestones: no milestone with key "${key}"`);
  return m;
};
