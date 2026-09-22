import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { sectionFor } from "@/lib/profile-sections";
import { SectionEditorClient } from "@/components/profile/SectionEditorClient";

/**
 * ── ⚠⚠ ONE SECTION OF THE PROFILE, ON ITS OWN PAGE (`P2-A2-E597` WS-C) ───
 *
 * ⚠ SCOTT, walking `/connect`: *"I went to edit the specializations… and when I
 * clicked the edit hyperlink it takes me back to the registration walk. This is
 * wrong and presents multiple issues (not the right page, not the right
 * menu)."*
 *
 * ⚠⚠ IT RENDERS IN THE APP SHELL WITH NO CONNECT TAB ROW, which is where these
 * editors are HEADED: the avatar-menu brief moves the profile out from under
 * Connect, and a tab row saying CONNECT above a profile editor would be the
 * "not the right menu" half of the complaint in a new place.
 *
 * ── ⚠ ACCESS: `route-access.ts`'s `{ prefix: "/profile", requires: "authenticated" }` ──
 *
 * ⚠⚠ THAT IS THE RULE, AND IT COVERS THIS ROUTE BY LONGEST-PREFIX MATCH —
 * `route-access.ts` line 131. No new entry was added, because adding
 * `/profile/edit` would be a second rule saying the same thing, and two rules
 * for one tree is how they drift.
 * ⚠ SIGNED OUT → `/login`, applied at the edge by `proxy.ts` from that entry.
 * ⚠⚠⚠ AND "OWNER ONLY" IS STRUCTURAL, NOT A CHECK: there is no id in this URL.
 * The profile being edited is resolved FROM THE SESSION, so a signed-in member
 * can only ever reach their own — the `E046`-family rule that a write target is
 * never accepted from client input.
 */
export default async function ProfileSectionEditPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await guardPage("authenticated");
  const { section: slug } = await params;
  const section = sectionFor(slug);
  /* ⚠ AN UNKNOWN SECTION IS A 404, NOT A REDIRECT TO THE FIRST ONE. A URL that
     silently becomes a different editor is how somebody saves the wrong field. */
  if (!section) notFound();

  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fprofile");

  /*
    ⚠⚠ A MEMBER WITH NO PROVIDER PROFILE HAS NOTHING TO EDIT HERE. They are sent
    to `/profile`, which is the stable route (`E591`) and knows what to show
    them — rather than to a 404, which would be a dead end for a buyer who
    followed a stale link.
  */
  const owned = await ownedProviderProfile(viewer);
  if (!owned) redirect("/profile");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-5">
        {/* ⚠ ONE WAY BACK (`E530`), and it is the same destination Save and
            Cancel use — so the page has one exit, not three. */}
        <Link
          href={`/profile#${section.slug}`}
          className="text-[13px] font-semibold text-magenta hover:underline"
        >
          &larr; Back to your profile
        </Link>
        <h1 className="mt-2 font-display text-[26px] font-bold tracking-[-0.5px]">
          {section.title}
        </h1>
        {/* ⚠⚠ NO STEP COUNTER AND NO "Next". This edits ONE thing; a counter
            would say it is part of a sequence, which is the wizard's claim and
            the thing Scott filed. */}
      </header>
      {/*
        ⚠⚠ THE SLUG CROSSES THE BOUNDARY, NOT THE SPEC. A `SectionSpec` carries
        `payload`, a FUNCTION, and a server component cannot serialise one into a
        client component — *"Functions cannot be passed directly to Client
        Components"*, a 500 on every section that has a payload.
        ⚠ SIX OF EIGHT 500ed AND THE OTHER TWO DID NOT: `work-history` and
        `solo-projects` carry `payload: null`, so they serialised fine and the
        route looked half-built rather than broken.
        ⚠⚠⚠ NEITHER `tsc` NOR `npm run build` CAUGHT IT — the prop types agree
        and the boundary is only enforced at render. Measured, not reasoned.
        ⚠ The client re-reads the spec from the same registry, so there is still
        ONE definition of what a section posts.
      */}
      <SectionEditorClient slug={section.slug} />
    </div>
  );
}
