import { catalogServicesFor } from "@/lib/my-catalog";
import { myEstimates } from "@/lib/estimates";
import { redirect } from "next/navigation";
import { getSessionViewer } from "@/lib/session";
import { EmployeeProfile } from "@/components/profile/EmployeeProfile";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { profileTabs, ACCOUNT_MENU_NAME } from "@/lib/profile-tabs";
import { ConnectProfile } from "@/components/community/ConnectProfile";
import { getOwnProviderProfileView } from "@/lib/provider-profile-view";
import { ensureSlug } from "@/lib/public-slug";
import { getPathsTaughtByProfile, getPathsTakenBy } from "@/lib/learn-home";
import { publicTestimonials } from "@/lib/recommendations";
import { getCommunitySignalForProfile } from "@/lib/community-signal";
import { buildCompletenessInput } from "@/lib/onboarding";
import { computeProfileScore } from "@/lib/completeness";
import { growthBoard, growthScore, rankFor } from "@/lib/growth-score";
import { prisma } from "@/lib/prisma";
import { buyerProfileFor } from "@/lib/buyer-profile";
import { BuyerProfileEditor } from "@/components/buyer/BuyerProfileEditor";

export default async function MyProfilePage() {
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fprofile");

  // A Panameer employee gets the employee profile even if a seeded provider row
  // still exists behind them — the row is demo noise, not their identity.
  if (viewer.isSystemAdmin) return <EmployeeProfile userId={viewer.userId} />;

  const profile = await getOwnProviderProfileView(viewer.userId, viewer);
  if (!profile) {
    // A buyer-only person gets their Buyer Profile here.
    const person = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true, first_name: true, last_name: true } });
    const buyer = person ? await buyerProfileFor(person.id) : null;
    if (!buyer || !person) redirect("/connect/community");
    return <div className="account-surface"><BuyerProfileEditor initial={buyer} firstName={person.first_name ?? ""} lastName={person.last_name ?? ""} /></div>;
  }

  const [taughtPathsList, takenPaths] = await Promise.all([
    getPathsTaughtByProfile(profile.id),
    getPathsTakenBy(viewer.userId),
  ]);

  const [growthMe, growthRows] = await Promise.all([
    growthScore(profile.person.personId, "month"),
    growthBoard("month"),
  ]);

  const slug = await ensureSlug(profile.id);
  const publicUrl = slug
    ? `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3100").replace(/\/$/, "")}/pro/${slug}`
    : null;

  return (
    <>
      {/* THE CRUMB REPLACES THE TAB ROW WS-B item 1) */}
      {/* IT IS THE PAGE'S `<h1>`, NOT A DECORATIVE `<p>`. Shipping it as a */}
      {/* THE CRUMB BECAME THE TAB ROW WS-A) */}
      {/* THE MENU NAME IS `Account Information` (ruling 31b, WS-A item 1) */}
      <PageTabs
        wrap
        eyebrow={ACCOUNT_MENU_NAME}
        sequence={tabSequenceFor("/profile")}
        tabs={profileTabs(viewer)}
        current="/profile"
      />
      {/* THE PROFILE LEAD LINE . IT IS ON `/profile` AND NOT INSIDE */}
      {/* is only legal in CHILDREN position, never between attributes, which */}
      {/* The comb is OWNER-ONLY, so it is computed here — on the owner's own */}
      {/* line carries the colleague COUNT and nothing renders avatars. */}
      {/* WS-B). Scott's page rule: *"No growth numbers, usage */}
      {/* THE CLEAN SURFACE STARTS HERE, BELOW THE MENUING WS-A) */}
      <div className="account-surface">
      <ConnectProfile
        // above. The view model carries `null` for every other surface.
        p={{ ...profile, publicUrl }}
        // per viewer per day, counted all time — the `Counters` decision, not a
        // SEVEN, NOT ALL OF THEM WS-D). The card is a summary

        taughtPaths={taughtPathsList}
        takenPaths={takenPaths}
        testimonials={await publicTestimonials(profile.id)}
        community={await getCommunitySignalForProfile(profile.id)}
        growth={{
          points: growthMe.points,
          // rank: growthRows.find((r) => r.personId === profile.person.personId)?.rank ?? null
          rank: rankFor(growthRows, profile.person.personId),
        }}
        score={await ownerScore(profile.id)}
        catalogServices={await catalogServicesFor(profile.id, true)}
        estimates={await myEstimates(viewer).catch(() => [])}
      />
      </div>
    </>
  );
}

/** The owner's score breakdown, or `null` when the input cannot be built. */
async function ownerScore(profileId: string) {
  const input = await buildCompletenessInput(profileId);
  return input ? computeProfileScore(input) : null;
}
