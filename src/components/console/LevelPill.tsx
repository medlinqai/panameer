import type { UserLevel } from "@/lib/user-levels";

/**
 * THE STATUS PILL (`P1-A1.5-E430` WS-5).
 *
 * **SCOTT, 2026-09-12:** *"the status is displayed differently — better. more
 * visually appealing."* Medlinq renders status as a soft-filled rounded pill:
 * small text, a pale tinted background, a matching darker text colour, generous
 * horizontal padding, centred. Panameer rendered it as plain wrapped text —
 * `Buyer: In-Process (requester_info)`, `NOT_REQU…` — which is most of why the
 * column was tall, ragged and looked clipped.
 *
 * ⚠ ONE PILL, ONE LINE, ONE STATE. Never a sentence describing a side, and never
 * two pills: it is the person's LIFECYCLE POSITION (`lib/user-levels.ts`).
 *
 * ── ⚠⚠ THE STATE-TO-TINT MAPPING, AND WHY IT IS ONE FAMILY ──────────────────
 *
 * The levels are a PROGRESSION, so the tints deepen along it rather than
 * scattering across the colour wheel — a reader should be able to tell "further
 * along" at a glance without learning a legend:
 *
 *   Registered  neutral ink wash    nothing has happened yet
 *   Verified    amber               in motion, not yet usable
 *   User        emerald, pale       Level 1 — can learn, connect, search, post
 *   Company     emerald, deeper     Level 2
 *   Payee       emerald, solid      Level 3 — the end of the funnel
 *
 * ⚠ MAGENTA IS DELIBERATELY NOT USED. WS-5a took it off the tile counts for
 * exactly this reason — it marks INTERACTIVE things (links, the active rail
 * item, buttons), and a status is not interactive. ⚠ AND THERE IS NO NAVY IN
 * THIS BRAND; the neutral end of the ramp is Panameer's own ink.
 * ⚠ THE AMBER/EMERALD FAMILIES ARE ALREADY IN THIS CODEBASE for exactly this
 * kind of semantic signal (`text-emerald-600` on the sign-up form's "✓ Passwords
 * match", `text-red-700` on field errors), so this introduces no new palette.
 */
const TINT: Record<UserLevel, string> = {
  Registered: "bg-ink/[0.06] text-ink-2",
  Verified: "bg-amber-50 text-amber-800",
  User: "bg-emerald-50 text-emerald-800",
  Company: "bg-emerald-100 text-emerald-900",
  Payee: "bg-emerald-600 text-white",
};

/** Scott's words for each stage, as the pill says them. */
const LABEL: Record<UserLevel, string> = {
  Registered: "Registered",
  Verified: "Verified",
  User: "L1 · User",
  Company: "L2 · Company",
  Payee: "L3 · Payee",
};

export function LevelPill({
  level,
  blocking = [],
}: {
  level: UserLevel;
  /** What is missing before the next level — named, never "incomplete". */
  blocking?: string[];
}) {
  return (
    <span
      /*
        ⚠ `whitespace-nowrap` IS PART OF THE FIX, not styling. The old status
        text wrapped to two and three lines and dragged the row height to 144px.
        ⚠ THE TOOLTIP NAMES THE BLOCKER so the board answers "why is this person
        stuck" without a second screen — the same rule `identity-bar.ts` follows
        for the gates a member sees.
      */
      title={blocking.length ? `Next: ${blocking.join(", ")}` : `Reached ${LABEL[level]}`}
      className={
        "inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-semibold " +
        TINT[level]
      }
    >
      {LABEL[level]}
    </span>
  );
}
