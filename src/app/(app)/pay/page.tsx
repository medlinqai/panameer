import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/**
 * PAYMENTS — a titled placeholder the requester rail can land on (WS-A).
 *
 * ⚠⚠ THE HEADING SAID `Pay Providers` UNTIL 2026-09-04 (`P1-ALL-E380` WS-1b),
 * in BOTH the `<h1>` and the `metadata.title`. SUPERSEDED, QUOTED NOT DELETED.
 * Same defect as `/contracts` and the same cause: a placeholder named after
 * what the URL does rather than after the journey. `E378`'s rule is that the
 * RAIL carries the one-word verb (`Payments`) and the PAGE carries the
 * journey's name — which is also `Payments`.
 *
 * ⚠ THE ROUTE DOES NOT MOVE. `/pay` names an ACTION, not a phantom record, and
 * nobody has asked for it to change. `E380` changed the words only.
 *
 * The rail names this destination, so it has to exist: a 404 out of your own
 * navigation reads as a broken product, where a titled empty state reads as one
 * that has not got there yet — which is the truth. The route, its title and its
 * capability gate are real; only the content is pending.
 */
export const metadata = { title: "Payments · Panameer" };

export default async function Page() {
  await guardPage("canHireTalent");
  return <ComingSoon title="Payments" />;
}
