import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { searchMembers } from "@/lib/connections";

/**
 * ── ⚠⚠⚠ `GET /api/community/members/search?q=` (`P2-A3-E721` item 1b) ────────────────────
 *
 * ⚠ **SCOTT: *"Under the roster, 'Other members matching &lt;query&gt;', from the existing
 * member/provider search (don't write a second search, `E585`)."***
 *
 * ⚠⚠⚠ **THIS ROUTE CONTAINS NO SEARCH. IT IS TRANSPORT.** Every rule — which fields are
 * matched, the two-character floor, the `take` ceiling, the ordering, the exclusion of the
 * caller, and the `relation` each row carries — lives in `searchMembers`
 * (`lib/connections.ts:412`) and is unchanged by this file. ⚠ That is the whole point of the
 * item: `/community`'s search already answers this question, and a second implementation on
 * the colleagues page is precisely the `E585` shape Scott named in the brief.
 *
 * ── ⚠⚠ WHY A ROUTE WHEN `/community` DOES THIS AS A SERVER COMPONENT ─────────────────────
 *
 * ⚠ Because `ColleagueRoster` is a **client** component whose query lives in `useState`, not
 * in `?q=`. ⚠⚠ Its roster filter is instant and local — it is filtering rows already in the
 * browser — and routing every keystroke through the server to keep one list in the URL would
 * make the fast half slow to make the slow half tidy. ⚠⚠⚠ **SO THE TWO LISTS ARE FED
 * DIFFERENTLY ON PURPOSE: the roster from props, the strangers from here.** They are two
 * different questions — *"which of my colleagues is this?"* and *"who else is there?"* — and
 * only the second one needs a database.
 *
 * ⚠ **`relation` IS COMPUTED SERVER-SIDE AND COMES BACK WITH EACH ROW**, so `ConnectControls`
 * renders the right button without this surface deciding anything (load-bearing rule 5).
 * ⚠⚠ **NO RATE IS SELECTED OR RETURNED.** `searchMembers` never reads one; a payload that
 * reaches the browser discloses whatever it carries, whether or not anything renders it.
 */
export async function GET(req: Request) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  const q = new URL(req.url).searchParams.get("q") ?? "";
  /* ⚠⚠ THE TWO-CHARACTER FLOOR IS NOT RE-STATED HERE — `searchMembers` returns `[]` below two
     characters and owns that rule. ⚠ Restating it would be a second copy that could drift,
     which is the defect this route exists to avoid. */
  const members = await searchMembers(gate, q);
  return NextResponse.json({ members });
}
