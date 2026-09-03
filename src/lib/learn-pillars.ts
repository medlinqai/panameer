/**
 * THE PILLAR — the top of the LEARN taxonomy (`P1-J3-E364`).
 *
 * **SCOTT, 2026-09-02:** *"i don't want to see all paths...just the tags so i can
 * quickly pick the paths that apply to me."*
 *
 * `LearningPath.group` is a free string with nothing above it, so the catalog had
 * eleven functional areas and no way to say "show me supply chain". The pillar is
 * Oracle's product family, and it is the DEFAULT slice on `/learn`.
 *
 * ── ⚠ `FOUNDATIONS` IS NOT A PILLAR, AND IT IS IN HERE ANYWAY ────────────────
 *
 * Scott, told as much: *"yeah...i know this is not a pillar."* A learner picks
 * from ONE list; splitting "product families" from "where to start" would be two
 * controls answering one question.
 *
 * ── ⚠⚠ EPM AND CX ARE ABSENT ON PURPOSE ──────────────────────────────────────
 *
 * Both are real Oracle pillars with NOTHING on Panameer. They are not values here
 * and they are not tiles — the row carries one honest sentence instead. That is
 * the rule `P1-J1.1-E282` set with Delaware: say what you cannot do rather than
 * hide it, but do not give an empty thing equal visual weight to a full one.
 *
 * ⚠ PURE. No Prisma import, so a client component and the harness can both read
 * it.
 */

export const PILLARS = ["FOUNDATIONS", "SCM", "ERP", "HCM"] as const;
export type Pillar = (typeof PILLARS)[number];

/** ⚠ Display names. `SCM` on a tile would be jargon to a beginner. */
export const PILLAR_LABEL: Record<Pillar, string> = {
  FOUNDATIONS: "Foundations",
  SCM: "Supply Chain",
  ERP: "Finance",
  HCM: "People",
};

/** The one-line hint under the name. ⚠ CC's words — reported for Scott to overrule. */
export const PILLAR_BLURB: Record<Pillar, string> = {
  FOUNDATIONS: "New to Oracle",
  SCM: "Procurement and supply chain",
  ERP: "Finance and accounting",
  HCM: "HR and people",
};

/**
 * ⚠⚠ THE MAPPING, MEASURED AGAINST THE LIVE CATALOG on 2026-09-02, not recalled.
 *
 * Counted over the paths a learner can actually see (`E362` hides zero-playable
 * ones), the four tiles come to 3/25, 6/233, 2/33 and 1/14 — which is exactly
 * what `E364` predicted, so the mapping and the data agree.
 *
 * ⚠ A GROUP NOT IN HERE MAPS TO `null`, DELIBERATELY. `Implementer's Journal`,
 * `Oracle Cloud`, `Payroll`, `Talent Mgmt` and the three group-less stubs all
 * have ZERO playable lessons, so they are already invisible to a learner. Giving
 * them a guessed pillar would make them appear the day one video lands, under a
 * family nobody chose.
 */
export const GROUP_TO_PILLAR: Record<string, Pillar> = {
  "Foundational Learning Paths": "FOUNDATIONS",
  Procurement: "SCM",
  "Supply Chain Execution": "SCM",
  Accounting: "ERP",
  "Finance & Accounting": "ERP",
  "Core HR": "HCM",
};

export function pillarForGroup(group: string | null | undefined): Pillar | null {
  const g = (group ?? "").trim();
  return g && g in GROUP_TO_PILLAR ? GROUP_TO_PILLAR[g] : null;
}

/**
 * ⚠ THE SENTENCE THAT REPLACES TWO DEAD TILES. CC's words; reported at `E364`.
 * `href` is the support form, which is the only place a request can actually land
 * today — there is no "request a pillar" model and one was not invented.
 */
export const MISSING_PILLARS_NOTE =
  "EPM and CX aren't on Panameer yet. Tell us if you want them";
export const MISSING_PILLARS_HREF = "/support/bug";
