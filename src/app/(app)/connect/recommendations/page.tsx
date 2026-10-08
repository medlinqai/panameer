import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { defaultMessage, listRecommendations } from "@/lib/recommendations";
import { RecommendationsClient } from "@/components/console/RecommendationsClient";

export const metadata = { title: "Request Recommendations · Panameer" };

export default async function RecommendationsPage() {
  const viewer = await guardPage("authenticated");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) {
    return (
      <p className="text-ink-2">
        This account has no provider profile, so there is nothing to request yet.
      </p>
    );
  }

  const { providerFirstName, rows } = await listRecommendations(viewer);

  return (
    <div className="mx-auto max-w-3xl">
      <p className="mb-5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
        A recommendation from someone you&apos;ve worked with does more for a
        buyer&apos;s confidence than anything you can write about yourself. Ask
        the people who already know your work.
      </p>
      <RecommendationsClient
        template={defaultMessage(providerFirstName)}
        initialRows={rows}
      />
    </div>
  );
}
