import { P2P_DOMAINS } from "@/lib/capability-domains";

/**
 * THE BUSINESS PROCESSES THE ASSESSMENT COVERS — one list, consumed by the card
 * grid on `/` (section 3, the process picker).
 *
 * ── WHY THIS FILE EXISTS AT ALL ──────────────────────────────────────────────
 *
 * Scott, on his own four-button version of this section: *"when I am creating
 * the cards to route to the different processes, I will have to come back and
 * redo this again. Seems like there could/should be a better medium."*
 *
 * So the section is DATA-DRIVEN and this is the data. Adding a fifth process —
 * or real footage behind an existing one — is an entry in this array and
 * nothing else: no JSX, no CSS, no new class. The grid is `auto-fit` and every
 * per-process colour arrives as a CSS custom property from `tint`/`deep` below,
 * precisely so a fifth process cannot require a fifth stylesheet rule.
 *
 * Follows the `capability-domains.ts` pattern: one typed array, one place to
 * audit, consumed by the component.
 */

export type ProcessStatus = "live" | "coming-soon";

export type BusinessProcess = {
  key: string;
  /** The three-letter trade name, shown above the title. */
  abbr: string;
  name: string;
  /** One line, the mockup's `.p-card__line`. */
  blurb: string;
  /**
   * ⚠ NULL MEANS "NOT ESTABLISHED", AND IT IS NULL FOR THREE OF THE FOUR.
   *
   * Only P2P has a real number, and it is DERIVED from `P2P_DOMAINS` below
   * rather than typed — `capability-domains.test.ts` asserts that array is ten
   * long, so the card cannot drift from the framework it describes.
   *
   * O2C / R2R / H2R are null on purpose. See the block comment on `PROCESSES`.
   * A null renders NO count line rather than a zero or a guess.
   */
  domainCount: number | null;
  status: ProcessStatus;
  /**
   * ⚠ A PATH TO FOOTAGE, AND IT SHIPS EMPTY FOR ALL FOUR.
   *
   * Empty string = fall back to the generated gradient built from `tint`/`deep`.
   *
   * `public/` holds `learn`, `connect`, `consultation`, `get-paid` and
   * `panameer-office` — every one shot for the Find Work story. NONE of them is
   * a procurement, billing, close or payroll clip, and a Learn clip behind
   * Procure-to-Pay is a mismatch a visitor spots immediately. So nothing is
   * reused here: the gradient is honest and the field is the seam that makes
   * real footage a one-line data edit when it is shot.
   */
  media: string;
  /** Accent hue for the gradient fallback — 8-digit hex, alpha included. */
  tint: string;
  /** Dark base the accent sits on. */
  deep: string;
};

/**
 * ── ⚠ THE DOMAIN COUNTS FOR O2C / R2R / H2R ARE DELIBERATELY ABSENT ──────────
 *
 * The mockup showed 9 / 8 / 7. Those were invented, and the brief asked for
 * either the real numbers from `question_bank_o2c_r2r_h2r.md` or no numbers at
 * all. I counted the bank; the answer is NO NUMBERS, for three reasons:
 *
 * 1. THE BANK DOES NOT DEFINE CAPABILITY DOMAINS FOR THESE THREE. It is
 *    organised as weighted VALUE LEVERS with question items beneath them —
 *    a different construct from P2P's formal capability-domain list, which
 *    exists in code and is test-asserted. Counting lever items and calling the
 *    result "capability domains" would be inventing the number a second time.
 *
 * 2. TWO OF THE THREE MOCKUP FIGURES MATCH NO READING OF THE BANK. Counting
 *    every named item gives O2C 9, R2R 7, H2R 6 — the mockup's R2R 8 and H2R 7
 *    are unsupported either way.
 *
 * 3. THE COUNTS ARE CONDITIONAL BY DESIGN, so no fixed number is true for every
 *    reader. O2C adds Project & Resource Mgmt and Service Delivery "only if
 *    services" (9 or 11); R2R adds Intercompany and Consolidation "only if
 *    multi-entity" (7 or 9).
 *
 * When these processes are implemented the way P2P is — a real domain array
 * with a test — set `domainCount` from it, exactly as P2P does. Until then the
 * card says what is true: the process name, and Coming soon.
 */
export const PROCESSES: BusinessProcess[] = [
  {
    key: "p2p",
    abbr: "P2P",
    name: "Procure-to-Pay",
    blurb:
      "Requisition, sourcing, purchase orders, receipt, invoice and payment.",
    /* DERIVED, never typed — see the field comment. */
    domainCount: P2P_DOMAINS.length,
    status: "live",
    media: "",
    tint: "#c026a888",
    deep: "#2b1b4d",
  },
  {
    key: "o2c",
    abbr: "O2C",
    name: "Order-to-Cash",
    blurb: "Quote, order, billing, collections and cash application.",
    domainCount: null,
    status: "coming-soon",
    media: "",
    tint: "#1f86c988",
    deep: "#12304d",
  },
  {
    key: "r2r",
    abbr: "R2R",
    name: "Record-to-Report",
    blurb: "Journals, reconciliations, close orchestration and reporting.",
    domainCount: null,
    status: "coming-soon",
    media: "",
    tint: "#17a08a88",
    deep: "#123d38",
  },
  {
    key: "h2r",
    abbr: "H2R",
    name: "Hire-to-Retire",
    blurb: "Recruiting, onboarding, payroll, time and workforce admin.",
    domainCount: null,
    status: "coming-soon",
    media: "",
    tint: "#c9761f88",
    deep: "#3d2415",
  },
];
