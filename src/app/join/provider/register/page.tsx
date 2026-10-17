import { getSessionViewer } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getProviderProfileView } from "@/lib/provider-profile-view";
import { ConnectProfile } from "@/components/community/ConnectProfile";
import { CapabilityLines } from "@/components/profile/CapabilityLines";
import { taxonomyV2 } from "@/lib/platform-settings";
import { RegisterClient } from "./RegisterClient";

// Scott 10-17: "the purpose of this sequence was to build my profile… I do not see it" — Review shows the profile as buyers see it.
export default async function SellerRegisterPage() {
  const viewer = await getSessionViewer();
  let preview: React.ReactNode = null;
  if (viewer) {
    const pp = await prisma.providerProfile.findFirst({ where: { person: { user_id: viewer.userId } }, select: { id: true } });
    const profile = pp ? await getProviderProfileView(pp.id, { viewerUserId: viewer.userId, viewer }) : null;
    if (profile) {
      preview = (
        <div className="account-surface">
          <ConnectProfile p={profile} whatIDo={(await taxonomyV2()) ? <CapabilityLines profileId={profile.id} owner={false} /> : undefined} previewAsBuyer signedIn />
        </div>
      );
    }
  }
  return <RegisterClient preview={preview} />;
}
