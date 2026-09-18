import CommunityPage from "../page";

/**
 * ── ⚠⚠ `/community/colleagues` (`P2-J3-E557` WS-A) ─────────────────────────
 *
 * ⚠ `E557` makes `/community` the Connect HOME and gives Colleagues its own
 * address. ⚠⚠ THIS ROUTE EXISTS IN THE SAME WORKSTREAM AS THE TAB THAT POINTS
 * AT IT — the brief's rule about Messages ("do not leave the row in a state
 * where messages are unreachable") is the same rule here, and a tab pointing at
 * a 404 is the worse version of it.
 *
 * ⚠ IT RENDERS THE EXISTING COMMUNITY BODY, NOT A COPY. The only difference is
 * `current`, so the Colleagues tab underlines here and Home underlines at
 * `/community`.
 *
 * ⚠⚠ `E558` OWNS THE REAL COLLEAGUES PAGE. This is the move that unblocks it,
 * not the build — when `E558` lands it replaces this body and `/community`
 * keeps only Home.
 */
export default async function ColleaguesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return <CommunityPage searchParams={searchParams} current="/community/colleagues" />;
}
