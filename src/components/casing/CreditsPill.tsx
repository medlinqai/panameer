

// "use client";
//
// import Link from "next/link";
// import { formatCredits, type CreditsSummary } from "@/lib/credits";
//
// /**
//  * The Community Credits pill (WS1-D).
//  *
//  * Top-right of the header, primary magenta, reading
//  * `Community Credits {balance} | {earnedThisWeek} This Week`.
//  *
//  * DISPLAY-ONLY IN PHASE 1 — there is no spend flow yet. It is still a LINK, to
//  * /community, because the one thing a person seeing an unfamiliar currency
//  * wants is to find out what it is, and Phase 2's hub is where that explanation
//  * lives.
//  *
//  * IT SAYS WHEN IT IS NOT REAL. While `pending` is true the pill carries a
//  * "Coming soon" marker, so a walk-through can't mistake a structural zero for a
//  * measured one. Phase 3 returns `pending: false` from the same hook and the
//  * marker disappears with no other change here.
//  */
// export function CreditsPill({ summary }: { summary: CreditsSummary }) {
//   return (
//     <Link
//       href="/community"
//       title={
//         summary.pending
//           : "Community Credits — earn them by taking part, spend them on group sessions."
//       }
//     >
//       <SparkIcon />
//       <span className="hidden sm:inline">Community Credits</span>
//       <span className="tabular-nums">{formatCredits(summary.balance)}</span>
//       <span aria-hidden className="text-white/45">
//         |
//       </span>
//       <span className="whitespace-nowrap tabular-nums font-semibold text-white/85">
//         {formatCredits(summary.earnedThisWeek)} This Week
//       </span>
//       {summary.pending && (
//           Coming soon
//         </span>
//       )}
//     </Link>
//   );
// }
//
//
// function SparkIcon() {
//   return (
//     <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
//       <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
//     </svg>
//   );
// }
//
