import { ShotCard } from "@/components/learn/public/shared";

/**
 * THE WORK SPINE'S GRAPHICS (`P1-J4-E015`).
 *
 * ── ⚠⚠ THE HONESTY TEST DECIDED FOUR OF THE FIVE ────────────────────────────
 *
 * A graphic of an unbuilt screen is a picture of software that does not exist, and
 * a DRAWN claim is stronger than the sentence above it — a reader takes a screenshot
 * as evidence in a way they do not take prose.
 *
 * Steps 2-5 have NO models at all: no `Proposal`, no `Offer`, no `WorkOrder`, no
 * `SettlementRequest`, no `Invoice`, no `Payment`. So:
 *
 *   1 Create Work Request      NEW (below) — the wizard and the JD paste door BOTH
 *                              exist; this is the one step that can carry a shot.
 *   2 Accept Proposal          ⚠ NONE — a "proposal accepted" card would be a
 *                              drawing of a model that does not exist.
 *   3 Release Work Order       ⚠ NONE — same, for `WorkOrder`.
 *   4 Approve Settlement Req.  ⚠ NONE — same, for `SettlementRequest`.
 *   5 Pay Panameer             ⚠ NONE — an invoice or a receipt would be the
 *                              strongest false claim on the page.
 *
 * ⚠ AN EMPTY GRAPHIC RENDERS NOTHING AND THAT IS THE ANSWER, NOT A GAP.
 * `spine-steps.ts` records the rule and `/optimize` ships two empty ones today.
 * ⚠ DO NOT FILL THESE FOUR. Fill them when the models exist.
 *
 * ⚠ THE INVENTORY WAS RUN FIRST AND NOTHING FIT. Nineteen shot components exist;
 * every one draws a Learn surface, an assessment surface, a provider profile or a
 * package list. None depicts a work request, and adapting e.g. `PathProgressShot`
 * into a fake settlement timeline would be the same lie in a reused shell.
 *
 * ⚠ `ShotCard`, NOT `AppShot`, for the reason `talent-shots.tsx` records: the Talent
 * spine ships `PathProgressShot` unchanged and that is a `ShotCard`, so the site's
 * spine graphics are `ShotCard`-shelled. One shell across the spines is the rule's
 * intent. REPORTED as a deviation from the brief's `AppShot` instruction.
 *
 * ⚠ NO REAL BUYER, PROVIDER OR COMPANY NAMES. ⚠ NO PRICES OR SAVINGS FIGURES —
 * explicitly forbidden by this brief, and the budget row below shows a RANGE with no
 * currency total attached.
 */

/**
 * STEP 1 — THE JD PASTE DOOR AND WHAT IT FILLS.
 *
 * ⚠ EVERY FIELD DRAWN HERE IS ONE `/api/work-requests/import` ACTUALLY WRITES:
 * `description` + `title`, `startDate`/`endDate`, `budgetType` + `budgetMin`/`Max`,
 * and `locationCountry` + `worksite`. Verified against the route, not assumed.
 *
 * ⚠ `Skills` IS SHOWN AS **held, not saved** BECAUSE THAT IS WHAT THE CODE DOES —
 * the route returns skills and the wizard applies them on the skills step, since
 * they cannot be validated until a role and domain exist. Drawing them as saved
 * would be the one inaccuracy available in an otherwise honest shot.
 */
export function WorkRequestDraftShot() {
  const FILLED = [
    { label: "Title", value: "Oracle Cloud Procurement rollout support" },
    { label: "Dates", value: "6 Oct 2026 – 19 Feb 2027" },
    { label: "Budget", value: "Range, fixed price" },
    { label: "Location", value: "United States · Remote" },
  ];
  return (
    <ShotCard>
      <div className="flex items-baseline justify-between border-b border-line pb-3">
        <span className="text-[13px] font-semibold text-ink">
          Draft Work Request
        </span>
        <span className="rounded-full bg-[#eef0f6] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.07em] text-ink-2">
          Draft
        </span>
      </div>

      {/* ⚠ THE DOOR ITSELF, AS IT IS ON STEP 1 — first of three, badged Fastest. */}
      <div className="mt-4 rounded-[12px] border border-dashed border-magenta/45 bg-magenta/[0.05] px-4 py-3">
        <span className="flex items-center gap-2">
          <span className="text-[12.5px] font-bold text-ink">
            Paste your JD
          </span>
          <span className="rounded-full bg-magenta px-2 py-[2px] text-[9.5px] font-bold uppercase tracking-[0.07em] text-white">
            Fastest
          </span>
        </span>
        <span className="mt-1 block text-[11.5px] leading-[1.45] text-ink-2">
          Paste it in and we&rsquo;ll draft the Work Request from what it says.
        </span>
      </div>

      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-2">
        Filled from your JD
      </p>
      <dl className="m-0 mt-2">
        {FILLED.map((f) => (
          <div
            key={f.label}
            className="grid grid-cols-[76px_1fr] items-baseline gap-3 border-b border-line py-[7px] last:border-b-0"
          >
            <dt className="text-[11px] uppercase tracking-[0.06em] text-ink-2">
              {f.label}
            </dt>
            <dd className="m-0 truncate text-[12.5px] font-semibold text-ink">
              {f.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-[11px] leading-[1.45] text-ink-2">
        Skills are read too — held until you pick a role and domain to check
        them against.
      </p>
    </ShotCard>
  );
}
