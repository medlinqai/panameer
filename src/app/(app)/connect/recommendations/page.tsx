import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { ownedProviderProfile } from "@/lib/access";
import { defaultMessage, listRecommendations } from "@/lib/recommendations";
import { RecommendationsClient } from "@/components/console/RecommendationsClient";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import { getMyCommunity } from "@/lib/connections";
import { Avatar } from "@/components/Avatar";
import { RecommendMe } from "@/components/community/RecommendMe";

export const metadata = { title: "Recommendations · Panameer" };

// Connect › Recommendations (2026-10-08): ask someone you've worked with to vouch for you.
export default async function RecommendationsPage() {
  const viewer = await guardPage("authenticated");
  const [profile, unread] = await Promise.all([
    prisma.providerProfile.findFirst({ where: ownedProviderProfile(viewer), select: { id: true } }),
    unreadCount(viewer),
  ]);
  const data = profile ? await listRecommendations(viewer) : null;
  // Connections who haven't recommended you yet; "Requested" while an ask is open.
  const mine = profile ? await getMyCommunity(viewer) : null;
  const colleagues = (mine?.colleagues ?? []).map((c) => c.person!).filter(Boolean);
  const emails = colleagues.length ? await prisma.user.findMany({ where: { id: { in: colleagues.map((c) => c.userId) } }, select: { id: true, email: true } }) : [];
  const emailOf = new Map(emails.map((e) => [e.id, e.email.toLowerCase()]));
  const asks = profile ? await prisma.recommendationRequest.findMany({ where: { provider_profile_id: profile.id, status: { in: ["SENT", "SUBMITTED"] } }, select: { contact_email: true, status: true } }) : [];
  const status = new Map(asks.map((a) => [a.contact_email.toLowerCase(), a.status]));
  const notYet = colleagues
    .map((c) => ({ ...c, st: status.get(emailOf.get(c.userId) ?? "") ?? null }))
    .filter((c) => c.st !== "SUBMITTED");

  return (
    <>
      <PageTabs wrap eyebrow="CONNECT" sequence={tabSequenceFor("/connect")} tabs={connectTabs(viewer, unread)} current="/connect/recommendations" />
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">Recommendations</h1>
        <p className="mb-5 mt-1.5 max-w-2xl text-[14.5px] leading-relaxed text-ink-2">
          Ask someone you&apos;ve worked with to vouch for you. It shows on your profile once they write it.
        </p>
        {notYet.length > 0 && (
          <section data-recommend-connections className="mb-7">
            <h2 className="text-[17px] font-bold">Your Connections <small className="ml-1 text-[12px] font-medium text-ink-3">who haven&apos;t recommended you yet</small></h2>
            <ul className="mt-1">
              {notYet.map((c) => {
                const [first, ...rest] = c.name.split(" ");
                return (
                  <li key={c.userId} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar firstName={first ?? ""} lastName={rest.join(" ")} photoUrl={c.photoUrl} size={36} />
                      <span className="min-w-0">
                        <b className="block truncate text-[14px]">{c.name}</b>
                        {c.title && <span className="block truncate text-[12.5px] text-ink-3">{c.title}</span>}
                      </span>
                    </span>
                    <RecommendMe toUserId={c.userId} name={c.name} requested={c.st === "SENT"} />
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {data ? (
          <RecommendationsClient template={defaultMessage(data.providerFirstName)} initialRows={data.rows} />
        ) : (
          <p className="text-ink-2">Recommendations show on a provider profile. Set up your profile first, then ask the people who know your work.</p>
        )}
      </div>
    </>
  );
}
