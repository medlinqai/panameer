import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { defaultMessage, listRecommendations } from "@/lib/recommendations";
import { RecommendationsClient } from "@/components/console/RecommendationsClient";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";

export const metadata = { title: "Recommendations · Panameer" };

// Connect › Recommendations (2026-10-08): ask someone you've worked with to vouch for you.
export default async function RecommendationsPage() {
  const viewer = await guardPage("authenticated");
  const [profile, unread] = await Promise.all([
    prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } }),
    unreadCount(viewer),
  ]);
  const data = profile ? await listRecommendations(viewer) : null;

  return (
    <>
      <PageTabs wrap eyebrow="CONNECT" sequence={tabSequenceFor("/connect")} tabs={connectTabs(viewer, unread)} current="/connect/recommendations" />
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">Recommendations</h1>
        <p className="mb-5 mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          Ask someone you&apos;ve worked with to vouch for you. It shows on your profile once they write it.
        </p>
        {data ? (
          <RecommendationsClient template={defaultMessage(data.providerFirstName)} initialRows={data.rows} />
        ) : (
          <p className="text-ink-2">Recommendations show on a provider profile. Set up your profile first, then ask the people who know your work.</p>
        )}
      </div>
    </>
  );
}
