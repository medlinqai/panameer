import { permanentRedirect } from "next/navigation";

export const dynamic = "force-static";

export default async function LegacyInSlugRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  permanentRedirect(`/pro/${encodeURIComponent(slug)}`);
}
