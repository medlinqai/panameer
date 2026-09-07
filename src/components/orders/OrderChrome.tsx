import type { WorkOrderOrigin, WorkOrderStatus } from "@prisma/client";

/**
 * The two badges every order surface repeats (`P1-J4-E393`).
 *
 * Shared so the list and the detail cannot describe the same order two ways —
 * the same reasoning `SettingsNav` and `SettingsHeading` share one definition
 * for.
 */

/**
 * ⚠⚠ `origin` IS VISIBLE, ALWAYS, AND THAT IS A DOCTRINE REQUIREMENT RATHER THAN
 * A DESIGN CHOICE.
 *
 * `lib/nav.ts` (`P1-ALL-E380`): *"PANAMEER CAN ASSERT THE TERMS OF AN ORDER IT
 * GENERATED; IT CAN ONLY RECORD THE EXISTENCE OF ONE IT DID NOT."* A reader who
 * cannot tell the two apart will assume the platform stands behind both.
 *
 * ⚠ AND THE WORDS ARE THE DOCTRINE'S. A DIRECT order is one where *"the deal was
 * struck elsewhere and brought in to use settlement, timesheets and the rest"* —
 * so the badge says **Direct**, and the detail page says the rest in a sentence.
 * ⚠ INDIRECT IS DELIBERATELY NOT BADGED. It is the normal path, and a badge on
 * the default makes the default look like a special case; the direct one is the
 * exception and the exception is what gets marked.
 */
export function OriginBadge({ origin }: { origin: WorkOrderOrigin }) {
  if (origin !== "DIRECT") return null;
  return (
    <span
      className="rounded-full border border-line px-2.5 py-0.5 text-[11.5px] font-bold uppercase tracking-[0.06em] text-ink-2"
      title="Agreed outside Panameer and brought in — Panameer records this order rather than issuing it."
    >
      Direct
    </span>
  );
}

/** ⚠ The activation states read differently, so they are coloured differently. */
const TONE: Record<WorkOrderStatus, string> = {
  DRAFT: "bg-ink/[0.05] text-ink-2",
  ISSUED: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-sky-50 text-sky-700",
  RELEASED: "bg-emerald-50 text-emerald-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  CLOSED: "bg-ink/[0.05] text-ink-2",
  CANCELLED: "bg-ink/[0.05] text-ink-2",
};

const LABEL: Record<WorkOrderStatus, string> = {
  DRAFT: "Draft",
  ISSUED: "Issued",
  ACCEPTED: "Accepted",
  RELEASED: "Released",
  ACTIVE: "Active",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

export function StatusPill({ status }: { status: WorkOrderStatus }) {
  return (
    <span className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${TONE[status]}`}>
      {LABEL[status]}
    </span>
  );
}
