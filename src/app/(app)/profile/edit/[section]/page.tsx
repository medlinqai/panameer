import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { ownedProviderProfile } from "@/lib/access";
import { sectionFor } from "@/lib/profile-sections";
import { SectionEditorClient } from "@/components/profile/SectionEditorClient";

export default async function ProfileSectionEditPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  await guardPage("authenticated");
  const { section: slug } = await params;
  const section = sectionFor(slug);
  if (!section) notFound();

  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fprofile");

  const owned = await ownedProviderProfile(viewer);
  if (!owned) redirect("/profile");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <header className="mb-5">
        {}
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
