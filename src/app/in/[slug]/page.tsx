import { permanentRedirect } from "next/navigation";

/**
 * ⚠⚠⚠ `/in/<slug>` IS NOW A PERMANENT REDIRECT TO `/pro/<slug>` (`P2-A1.1-E756`).
 *
 * Scott, 2026-10-02: *"replace 'in' with me"*, then *"short 'pro'?"* — ruling
 * `/pro/`. (`/profile/` was rejected: that is the signed-in, gated owner page.)
 *
 * ⚠⚠ **THIS FILE EXISTS SO THAT A LINK ALREADY SHARED DOES NOT BREAK.** The
 * whole point of the member's personal URL is that they paste it into an email
 * signature and a LinkedIn profile — those live for years, and a 404 on one is
 * the member's reputation, not ours.
 *
 * ⚠ **308, NOT 302.** A permanent redirect preserves the method and tells
 * crawlers the canonical address moved; a temporary one would leave `/in/` in
 * the index forever and split the member's own link equity across two addresses.
 * That is the same reasoning the retired-slug redirect inside `/pro/[slug]`
 * already uses.
 *
 * ⚠⚠ **NO LOOKUP HAPPENS HERE, DELIBERATELY.** This route does not resolve the
 * slug, does not read the database and does not decide whether the member is
 * opted in — `/pro/[slug]` owns every one of those rules, and duplicating any of
 * them would be a second definition of the public profile's behaviour (`E585`).
 * An unknown slug therefore redirects and THEN 404s, which is correct: the two
 * are indistinguishable to a stranger either way.
 */
export const dynamic = "force-static";

export default async function LegacyInSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/pro/${encodeURIComponent(slug)}`);
}
