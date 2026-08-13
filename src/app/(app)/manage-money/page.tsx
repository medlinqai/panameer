import { ComingSoon } from "@/components/ComingSoon";
import { guardPage } from "@/lib/guard";

/**
 * "Manage Money" — an unbuilt stub, now GATED (brief_fix_pages_four_navs WS-1).
 *
 * ⚠ IT WAS REACHABLE LOGGED OUT. The page had no `guardPage`, and the edge
 * proxy deliberately dropped /deliver-work, /find-work and /manage-money from
 * its matcher as "Upwork-holdover routes … not the real IA". Between those two
 * decisions nothing guarded them at all: an anonymous visitor got the
 * authenticated casing — rail, header, account menu — wrapped around a
 * Coming-Soon card, which breaks the access rule (password by default) and the
 * nav model (logged-out never renders the casing).
 *
 * `guardPage("authenticated")` is the server-side gate and is authoritative on
 * its own; it does not depend on the proxy matcher being right.
 *
 * NOTE: this route appears orphaned — the Seller nav's "Find Work" points at
 * /work, not /find-work. Guarded rather than deleted, because deleting routes
 * other things may link to is not this brief's job.
 */
export default async function Page() {
  await guardPage("authenticated");
  return <ComingSoon title="Manage Money" />;
}
