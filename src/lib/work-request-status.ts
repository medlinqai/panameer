import type { WorkRequestStatus } from "@prisma/client";

/**
 * ── ⚠⚠⚠ ONE PLACE WHERE A `WorkRequestStatus` BECOMES WORDS (`P2-A8-E679`) ──
 *
 * ⚠⚠ **THE DEFECT THIS CLOSES:** two pages turned the status into copy with a
 * ternary on one value — `hire/page.tsx:106` and `work-requests/[id]/page.tsx`
 * `:76`/`:86`, each reading `status === "POSTED" ? "Posted" : "Draft"`.
 * ⚠⚠⚠ **SO `ASSIGNED`, `ORDERED` AND `CANCELLED` ALL FELL TO "Draft"** — an
 * ordered request, under contract, reading *"This request is still a draft."*
 *
 * ⚠ **LATENT TODAY AND LIVE THE MOMENT THE CHAIN WORKS:** measured 2026-09-26,
 * `WorkRequest` holds **0 rows**, so nobody has seen it — and **WS-F of this
 * brief writes two of the three missing states.** A defect that arrives with
 * the feature that makes it visible is the worst kind to leave.
 *
 * ── ⚠⚠ THE WORDS ARE SCOTT'S, CONFIRMED 2026-09-26 ────────────────────────
 *
 * ⚠ **THE MODEL'S NAMES ARE NOT THE MEMBER'S NAMES.** `ASSIGNED` → **Provider
 * Selected** and `ORDERED` → **Under Contract**, because *"a member reading
 * 'Assigned' learns less than one reading 'Provider Selected.'"* ⚠⚠ The column
 * keeps its values — **nothing is renamed** (ruling 38; a rename is DROP+ADD).
 *
 * ── ⚠⚠⚠ A `Record`, SO A SIXTH STATUS IS A COMPILE ERROR ──────────────────
 *
 * ⚠ Keyed by **every** `WorkRequestStatus`, so adding one to the enum fails
 * `tsc` until somebody says what a member should read — rather than silently
 * inheriting a neighbour's word, which is exactly how the ternary failed.
 * ⚠⚠ **THE PATTERN SCOTT ASKS FOR BEFORE A GATE:** *"a forgetful sender being
 * a compile error rather than a silent gap is worth more than any check we
 * could write after the fact."*
 *
 * ⚠⚠ **COPY AND TONE TRAVEL TOGETHER, AND THAT IS DELIBERATE.** Both pages
 * chose a pill colour from the same ternary they chose the word from, so
 * splitting them would leave two maps to keep in step — `E585` rebuilt one
 * layer down. ⚠ Tone is a Tailwind class string, not a colour name, because
 * these are the only two palettes the pills already used.
 *
 * ⚠ **`WorkOrderStatus` IS A DIFFERENT ENUM AND IS NOT TOUCHED.**
 * `components/orders/OrderChrome.tsx` maps `DRAFT · ISSUED · ACCEPTED ·
 * RELEASED · ACTIVE · CLOSED · CANCELLED` — a different set for a different
 * table. Merging the two would be one concept in name only.
 */
export const WORK_REQUEST_STATUS_LABEL: Record<WorkRequestStatus, string> = {
  DRAFT: "Draft",
  POSTED: "Posted",
  ASSIGNED: "Provider Selected",
  ORDERED: "Under Contract",
  CANCELLED: "Cancelled",
};

/**
 * ⚠ The pill's classes. ⚠⚠ `POSTED` and the two live states read as progress
 * and keep the emerald the page already used; `DRAFT` and `CANCELLED` are the
 * two "not in the market" states and keep the muted one.
 * ⚠⚠⚠ **`CANCELLED` IS NOT GIVEN A RED.** It is a buyer withdrawing their own
 * request, not a failure — and a red pill on a member's own deliberate action
 * reads as an error they need to fix.
 */
export const WORK_REQUEST_STATUS_TONE: Record<WorkRequestStatus, string> = {
  DRAFT: "bg-ink/[0.05] text-ink-2",
  POSTED: "bg-emerald-50 text-emerald-700",
  ASSIGNED: "bg-emerald-50 text-emerald-700",
  ORDERED: "bg-emerald-50 text-emerald-700",
  CANCELLED: "bg-ink/[0.05] text-ink-2",
};

/** ⚠ The pill's full class list, so neither page rebuilds the shape. */
export function workRequestStatusPillClass(status: WorkRequestStatus): string {
  return `rounded-full px-3 py-1 text-[12.5px] font-bold ${WORK_REQUEST_STATUS_TONE[status]}`;
}
