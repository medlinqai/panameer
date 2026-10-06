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
        {/* NO STEP COUNTER AND NO "Next". This edits ONE thing; a counter */}
      </header>
      {/* THE SLUG CROSSES THE BOUNDARY, NOT THE SPEC. A `SectionSpec` carries */}
      <SectionEditorClient slug={section.slug} />
    </div>
  );
}
