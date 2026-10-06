import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { resolveSlug } from "@/lib/public-slug";
import { getMaskedProfile } from "@/lib/masked-profile";
import { getNamedProfile } from "@/lib/named-profile";
import { NamedProfilePage } from "@/components/public/NamedProfilePage";

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
      // INDEXABLE — AND ONLY HERE. Scott: *"page may be indexed."* It
      robots: { index: true, follow: true },
      openGraph: { title, description, type: "profile" },
    };
  }

  // Not opted in → the masked page's rule applies: title, never a name, and
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

  // AN UNKNOWN SLUG IS A 404, NOT A 500
  if (!hit) notFound();

  // A RETIRED SLUG REDIRECTS, PERMANENTLY
  if (!hit.canonical && hit.current && hit.current !== slug.toLowerCase()) {
    permanentRedirect(`/pro/${hit.current}`);
  }

  const named = await getNamedProfile(hit.profileId);
  if (named) {
    return <NamedProfilePage p={named} slug={slug} />;
  }

  // THE MASKED ARM REDIRECTS, IT DOES NOT RENDER
  redirect(`/providers/${hit.profileId}`);
}
