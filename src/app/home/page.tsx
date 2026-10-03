import type { Metadata } from "next";
import HomePage, { metadata as homeMetadata } from "../page";

/**
 * `/home` — THE MARKETING HOME, AT ITS OWN ADDRESS (`P2-ALL-E787`).
 *
 * ⚠⚠ **IT IS A RE-EXPORT, NOT A COPY.** `src/app/page.tsx` is ~400 lines of
 * which almost all is the record of twenty sections leaving the page across a
 * dozen briefs. ⚠ Duplicating it would create two homes that drift apart, which
 * is `E585` on the most-walked page on the site.
 *
 * ⚠ **WHY IT EXISTS:** until R1, `panameer.com/` 307s to
 * `status.panameer.com/`, so the full marketing site needs an address that is
 * not `/`. The pink band's *"See the full site →"* points here.
 * ⚠⚠ **`/` STILL RENDERS THIS SAME COMPONENT WHEN THE SWITCH IS OFF** — the
 * redirect is the only thing that changes, so turning it off restores today's
 * behaviour exactly and `/home` keeps working either way.
 *
 * ⚠⚠⚠ **IT IS REGISTERED IN `lib/public-routes.ts`.** The default is DENY
 * (load-bearing rule 5), so an unregistered `/home` would have been a login
 * wall on the marketing site.
 */
export const metadata: Metadata = homeMetadata;

export default HomePage;
