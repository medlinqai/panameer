import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs, ACCOUNT_MENU_NAME } from "@/lib/profile-tabs";
import { ownedProviderProfile } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { buildCompletenessInput } from "@/lib/onboarding";
import { computeProfileScore } from "@/lib/completeness";
import { ProfileScoreView } from "@/components/community/ProfileScoreView";

export const metadata = { title: "Your Profile Score · Panameer" };

export default async function ProfileScorePage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fscore");

  const profile = await prisma.providerProfile.findFirst({
    where: ownedProviderProfile(viewer),
    select: { id: true },
  });
  if (!profile) redirect("/community");

  const input = await buildCompletenessInput(profile.id);
  if (!input) redirect("/connect");

  return (
    <>
      {}
      <PageTabs
        wrap
        eyebrow={ACCOUNT_MENU_NAME}
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/score"
      />
      <ProfileScoreView score={computeProfileScore(input)} />
    </>
  );
}
