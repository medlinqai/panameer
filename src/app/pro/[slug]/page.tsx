import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { resolveSlug } from "@/lib/public-slug";
import { getMaskedProfile } from "@/lib/masked-profile";
import { getNamedProfile } from "@/lib/named-profile";
/* ⚠ `MaskedProviderPage`'s import is GONE because its only caller here was the
   `__none__` sentinel the 404 above replaced. ⚠⚠ The COMPONENT stays on disk and
   is still rendered by `/providers/[id]` — nothing is deleted (`E164`). */
import { NamedProfilePage } from "@/components/public/NamedProfilePage";

/**
 * ── ⚠⚠⚠ `/pro/<slug>` — THE MEMBER'S OWN PUBLIC URL (`E738`, renamed `E756`) ───────
 *
 * ⚠ SCOTT, 2026-10-01: *"a personal public URL (like LinkedIn), for Scott's
 * email signature."*
 *
 * ⚠⚠ **IT SERVES TWO DIFFERENT PAGES AND THE MEMBER CHOOSES WHICH:**
 *   · `public_name_at` **set**  → the NAMED page (name, photo, employers),
 *                                 indexable, rates and contact behind a free
 *                                 sign-up.
 *   · `public_name_at` **null** → the SAME masked preview `/providers/[id]`
 *                                 serves. ⚠ **THIS IS THE DEFAULT.**
 *
 * ⚠⚠⚠ **THE DEFAULT IS THE MASKED ONE BECAUSE PUBLISHING A MEMBER'S REAL NAME
 * WITHOUT THEM ASKING IS A DISCLOSURE, NOT A SETTING.** A member who has never
 * opened the Visibility card has a working `/in/<slug>` that names nobody.
 *
 * ⚠ A SIGNED-IN VISITOR GETS THE SAME PAGE HERE, deliberately: this URL is a
 * share link whose whole job is to look the same to everyone who opens it.
 * ⚠⚠ The signed-in surface for a profile is `/providers/[id]`, which is
 * byte-unchanged for members.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const hit = await resolveSlug(slug);
  if (!hit) return { title: "Profile — Panameer", robots: { index: false, follow: true } };

  const named = await getNamedProfile(hit.profileId);
  if (named) {
    const who = `${named.named.firstName} ${named.named.lastName}`.trim();
    const title = `${who} — ${named.title} — Panameer`;
    const description =
      named.summary?.slice(0, 180) ??
      [named.location, named.experience ? `${named.experience} experience` : null]
        .filter(Boolean)
        .join(" · ");
    return {
      title,
      description,
      /* ⚠⚠ **INDEXABLE — AND ONLY HERE.** Scott: *"page may be indexed."* ⚠ It
         is the one surface where the member has explicitly asked to be found by
         name; every masked page is `noindex` (his answer 4). */
      robots: { index: true, follow: true },
      openGraph: { title, description, type: "profile" },
    };
  }

  /* ⚠ Not opted in → the masked page's rule applies: title, never a name, and
     `noindex`. */
  const masked = await getMaskedProfile(hit.profileId);
  const title = masked?.title?.trim()
    ? `${masked.title} — Panameer`
    : "Provider Profile — Panameer";
  return {
    title,
    robots: { index: false, follow: true },
    openGraph: { title },
  };
}

export default async function PublicSlugPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const hit = await resolveSlug(slug);

  /*
    ── ⚠⚠⚠ AN UNKNOWN SLUG IS A 404, NOT A 500 (`P2-A1.1-E756`) ───────────────

    ⚠⚠ **THE SENTINEL WAS A REAL DEFECT AND IT WAS LIVE.** This line read
    `<MaskedProviderPage id="__none__" …>`, and `getMaskedProfile` puts that
    string straight into a `uuid` column — Postgres answers
    `invalid input syntax for type uuid: "__none__"` and the route returns
    **500**. ⚠ Measured on `bf2cda6`: `/in/does-not-exist` → 500 while every real
    slug → 307, and it is why `check:public-profile` was 5 passed / 1 failed.

    ⚠ **THE PRIVACY REASONING IS UNCHANGED AND IS WHY IT IS `notFound()`:** an
    unknown slug and a hidden profile must look the same, because distinguishing
    them confirms who exists. ⚠⚠ A 404 does that; a 500 does the opposite — it
    says "something about this one broke", which is itself a signal, and it hands
    a stranger a stack-shaped error page.
    ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   if (!hit) return <MaskedProviderPage id="__none__" backTo={`/in/${slug}`} />;
  */
  if (!hit) notFound();

  /*
    ── ⚠⚠⚠ A RETIRED SLUG REDIRECTS, PERMANENTLY ─────────────────────────────

    ⚠ SCOTT: *"old slugs redirect."* ⚠⚠ `permanentRedirect` is a **308**, which
    preserves the method and tells crawlers the canonical address moved — a 302
    would leave the old URL indexed forever and split the member's own link
    equity across two addresses.
    ⚠⚠⚠ **IT REDIRECTS ONLY WHEN THERE IS SOMEWHERE TO GO.** A retired slug
    whose member has since removed every slug falls through to the masked page
    rather than looping.
  */
  if (!hit.canonical && hit.current && hit.current !== slug.toLowerCase()) {
    permanentRedirect(`/pro/${hit.current}`);
  }

  const named = await getNamedProfile(hit.profileId);
  if (named) {
    return <NamedProfilePage p={named} slug={slug} />;
  }

  /*
    ── ⚠⚠⚠ THE MASKED ARM **REDIRECTS**, IT DOES NOT RENDER (`P2-A1.1-E738`) ──

    ⚠⚠ **FOUND BY THE LEAK TEST, AND IT IS A REAL CONFLICT BETWEEN TWO OF
    SCOTT'S OWN SENTENCES** — not a coding slip:
      · *"Off: `/in/<slug>` shows the masked preview."*
      · *"Leak test covers both states: option off → no name anywhere in the
        response."*

    ⚠⚠⚠ **THE SLUG IS `<first>-<last>`, SO IT CONTAINS THE NAME BY
    CONSTRUCTION — AND NEXT SERIALISES THE ROUTE SEGMENTS INTO THE RSC FLIGHT
    PAYLOAD OF EVERY DYNAMIC PAGE IT RENDERS.** Measured: the document carries
    `["","in","scott-walls"]` inside `self.__next_f.push(...)`. ⚠ That is
    framework behaviour. **NO IN-PLACE RENDER OF THIS ROUTE CAN SATISFY "NO NAME
    ANYWHERE IN THE RESPONSE."** Fixing the callback URLs was not enough and
    never could have been.

    ⚠⚠ **SO, OPTED OUT, THIS ROUTE FORWARDS TO THE ID ROUTE.** The member's link
    still works and still ends at the masked preview — Scott's first sentence —
    and the rendered response contains no name at all, which is his second.
    ⚠ A 307, not a 308: this forward is a consequence of a setting the member can
    change at any moment, and a permanent redirect would be cached by browsers
    and crawlers long after they switched naming ON.

    ⚠⚠⚠ **REPORTED AS A DEVIATION FOR SCOTT:** he said *"shows"*, and this
    *"forwards to"*. ⚠ The alternative is to stop deriving the slug from the
    name, which would defeat the whole purpose (*"like LinkedIn, for my email
    signature"*). **If he prefers the in-place render, the leak test's OFF case
    has to be narrowed to the rendered content and the URL accepted as public.**
  */
  redirect(`/providers/${hit.profileId}`);
}
