import Link from "next/link";
import { notFound } from "next/navigation";
import { ProviderProfileViewPage } from "@/components/profile/ProviderProfileView";
import { getProviderProfileView } from "@/lib/provider-profile-view";
import { getSessionViewer } from "@/lib/session";
import { getPathsTaughtByProfile } from "@/lib/learn-home";
import { publicTestimonials } from "@/lib/recommendations";

/**
 * Public provider profile — a marketplace surface. Not behind the auth gate;
 * renders server-side straight from the lib (still API-first: logic lives in
 * src/lib/provider-profile-view). The lib enforces the visibility gate
 * (brief_K), so a hidden profile 404s — but the owner always sees their own.
 *
 * NOW THE BRANDED VIEW (brief_buyer_profileview). This page rendered
 * `ProfileView` — the older, plainer component — while `/profile` rendered
 * `ProviderProfileView` under E155. Two renderings of one record, and the buyer
 * got the worse one: no testimonials, none of the branded hero, none of the
 * work-history disclosures. A provider polishing their profile was looking at a
 * page no buyer would ever see.
 *
 * OWNER AFFORDANCES ARE ALREADY CONDITIONAL, which is why this is a swap rather
 * than a new read-only variant. `getProviderProfileView` sets `isOwner` from the
 * session, and the component keys the "you're live" banner, the completeness
 * meter, the freshness nudge, Edit Profile, the résumé re-read and every
 * per-section edit link off that one flag. A visitor gets the same page with
 * none of them.
 *
 * THE DATE→ISO NOTE IS GONE BECAUSE ITS REASON IS. It warned that
 * `getPublicProviderProfile` returns Date objects while `PublicProviderProfile`
 * is typed for the wire, and cast through `unknown` to reconcile the two. Both
 * sides are server-side here and share one inferred type, so there is nothing to
 * serialize and nothing to cast.
 */
export default async function PublicProviderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const viewer = await getSessionViewer();

  /*
    THE SAME GATE, IN THE SAME PLACE. The lib returns null for a profile that
    isn't marketplace-visible unless the viewer owns it, and null is a 404 —
    unchanged from the previous implementation, which applied the identical
    predicate inside `getPublicProviderProfile`.

    `viewer` is passed whole as well as by id because the WS5 Plus gate decides
    at the read whether the contact address is in the payload at all.
  */
  const profile = await getProviderProfileView(id, {
    viewerUserId: viewer?.userId,
    viewer,
  });
  if (!profile) notFound();

  const [taughtPaths, testimonials] = await Promise.all([
    getPathsTaughtByProfile(profile.id),
    publicTestimonials(profile.id),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      {/*
        The public chrome stays. This page is reachable signed-out, so it keeps
        its own thin header rather than the app shell — a buyer arriving from a
        search result is not a signed-in user and should not meet a console.
      */}
      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6">
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            Panameer
          </Link>
          <Link
            href="/login"
            className="ml-auto text-sm font-semibold text-ink-2 hover:text-magenta"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/*
        No wrapper container: `ProviderProfileViewPage` brings its own max-w-6xl
        frame, and nesting it inside another would leave the main column
        narrower here than on /profile — the same record looking like two
        different pages, which is the bug this commit closes.

        `taughtPaths` is passed IN rather than rendered after it. The component
        already places the courses strip below the sections (E137); rendering it
        here as well would print it twice.
      */}
      <main className="flex-1">
        <ProviderProfileViewPage
          p={profile}
          taughtPaths={taughtPaths}
          testimonials={testimonials}
        />
      </main>
    </div>
  );
}
