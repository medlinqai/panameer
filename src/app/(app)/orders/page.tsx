import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/**
 * WORK ORDERS — the rail's `Orders` slot (`P1-ALL-E380`).
 *
 * ⚠⚠ THIS ROUTE WAS `/contracts` UNTIL 2026-09-04, AND THE RENAME IS THE WHOLE
 * POINT OF `E380`. SCOTT: *"remove contract. we will not have that."*
 *
 * ⚠ SUPERSEDED, QUOTED NOT DELETED — the entire previous file was:
 *     *"/** Rail "Contracts" — stub; the brief lists it as nav-only. *​/"*
 *     `return <ComingSoon title="Contracts" />;`
 *
 * ⚠⚠ THE RAIL WAS NEVER WRONG. It has said `Work Orders` throughout and now
 * says `Orders`. The STUB was titled after the URL SEGMENT rather than after the
 * rail label, in `9ae05d7` — so a placeholder named a concept into existence,
 * and the concept does not exist. See the doctrine block in `lib/nav.ts` beside
 * the `Orders` slot: the ToS is the MSA, the Work Order is the SOW, and
 * `Contract` was a route name and never a product record.
 *
 * ⚠ THE HEADING IS THE JOURNEY'S NAME, per `E378`'s rule — the rail carries the
 * one-word verb (`Orders`), the page carries the journey (`Work Orders`).
 *
 * ⚠ RENAMING THIS ROUTE WAS CHEAP ONLY BECAUSE THE PAGE IS AN UNBUILT STUB:
 * nothing deep-links into it, there is no data behind it, and no real bookmark
 * can break. Renaming a BUILT route is a different and much worse trade.
 * ⚠ AND IT IS STILL A STUB AFTER `E380`. Renaming it is not implementing it.
 */
export const metadata = { title: "Work Orders · Panameer" };

export default async function Page() {
  await guardPage("authenticated");
  return <ComingSoon title="Work Orders" />;
}
