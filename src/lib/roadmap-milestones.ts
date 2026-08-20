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
 * The roadmap shows "Agent · 2 wks"; the tracker appends a state — "Agent · 2 wks ·
 * in build". Storing one string would have forced one of them to lie.
 *
 * ⚠ THE ORDER IS THE ROADMAP'S SEQUENCE and both views depend on it: the roadmap
 * draws bars left to right in it, and the tracker groups them into quarters in it.
 */
export type RoadmapMilestone = {
  key: string;
  action: string;
  /** Package · Agent · Expert — what kind of thing does the work. */
  resource: string;
  weeks: string;
  owner: string;
  /** ⚠ Amber chip vs grey. One milestone is a partner's product, four are ours. */
  isPartner: boolean;
};

export const ROADMAP_MILESTONES: RoadmapMilestone[] = [
  { key: "invoice_match", action: "Invoice match exceptions", resource: "Package", weeks: "2 wks", owner: "Panameer", isPartner: false },
  { key: "po_price", action: "PO price alerts", resource: "Agent", weeks: "2 wks", owner: "Panameer", isPartner: false },
  { key: "rogue_spend", action: "Rogue-spend alert", resource: "Agent", weeks: "2 wks", owner: "Panameer", isPartner: false },
  { key: "contract_reneg", action: "Contract renegotiation", resource: "Expert", weeks: "4 wks", owner: "StratERP", isPartner: true },
  { key: "supplier_docs", action: "Supplier doc validation", resource: "Agent", weeks: "2 wks", owner: "Panameer", isPartner: false },
];

/** "Agent · 2 wks", plus an optional state tail for the tracker. */
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
