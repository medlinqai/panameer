import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { getCommunityWeb } from "@/lib/community-web";

/**
 * GET /api/community/web — the community web's graph (`P2-J3-E591` WS-B).
 *
 * ── ⚠⚠ WHY A ROUTE AT ALL, WHEN EVERY OTHER COMMUNITY READ IS A SERVER
 *    COMPONENT ───────────────────────────────────────────────────────────────
 *
 * ⚠⚠⚠ BECAUSE THE REBUILD MUST BE TIED TO RE-FETCHED DATA. Scott: *"the cycle
 * must be tied to re-fetched data"*, and *"movement that means nothing is worse
 * than no movement."* ⚠ A server component renders once; re-drawing from it on
 * a timer would move nodes that nobody had checked were still there, which is
 * the fidgeting the ruling forbids. ⚠ So the page server-renders the FIRST
 * picture as a prop, and this route is what every later cycle is built from.
 *
 * ── ⚠⚠ OWNER-SCOPED. THE VIEWER IS THE SUBJECT, NEVER AN ARGUMENT ─────────
 *
 * ⚠ It takes NO parameters — not an id, not a person, not a page. The graph is
 * the caller's own, resolved from the session inside `getCommunityWeb`
 * (load-bearing rule 5). ⚠⚠ THERE IS NO SHAPE OF REQUEST THAT ASKS FOR SOMEBODY
 * ELSE'S NETWORK, which is the only version of this that cannot be walked.
 *
 * ⚠⚠⚠ AND IT CARRIES NO RATE. `getCommunityWeb` never selects one; this payload
 * reaches the browser, where an omitted-from-render-but-present-in-JSON rate is
 * disclosed anyway. `check:community-web` §7 fails the build if one appears.
 */
export async function GET() {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;

  try {
    const web = await getCommunityWeb(gate);
    /*
      ⚠ `no-store`. The whole point of the cycle is that it re-reads; a cached
      response would animate a rebuild that changed nothing, which is exactly
      the movement-without-meaning the ruling rejects.
    */
    return NextResponse.json(web, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[community] web read failed:", e);
    /*
      ⚠⚠ A FAILURE MUST BE VISIBLE TO THE CALLER AS A FAILURE. The component
      holds its last good picture and does NOT animate on a non-ok response —
      so returning a stale or empty 200 here would make the web silently claim
      the network had emptied.
    */
    return NextResponse.json({ error: "Could not read your community." }, { status: 500 });
  }
}
