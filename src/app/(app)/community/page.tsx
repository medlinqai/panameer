import { guardPage } from "@/lib/guard";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import { FreeLine } from "@/components/marketing/FreeLine";
import Link from "next/link";
import { CommunityHero } from "@/components/community/CommunityHero";
import { CommunityRail } from "@/components/community/CommunityRail";
import { JoinedCard, InvitedCardView } from "@/components/community/ColleagueCards";
import { getMyCommunity } from "@/lib/connections";
import { getCommunityWeb } from "@/lib/community-web";
import { getCommunityHero } from "@/lib/community-hero";
import { standingForViewer } from "@/lib/levels";
import { getCommunityPage } from "@/lib/community-page";
import type { Viewer } from "@/lib/access";
import "@/components/community/community-web.css";
import "@/components/community/community-page.css";

export default async function CommunityPage() {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const unread = viewer ? await unreadCount(viewer) : 0;

  return (
    <>
      {}
      <PageTabs
        wrap
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/community"
      />
      <div className="mx-auto max-w-5xl space-y-5">
        <header>
          {}
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
            Community
          </h1>
          <p className="mt-1 text-[14.5px] leading-relaxed text-ink-2">
            Everyone you&rsquo;re connected to, and everyone you could be.
          </p>
          {}
          <FreeLine
            claim="Message your colleagues, free."
            compare="Other professional networks charge per message."
          />
        </header>
        {viewer && <CommunityBody viewer={viewer} />}
      </div>
    </>
  );
}

async function CommunityBody({ viewer }: { viewer: Viewer }) {
  const [web, page, mine, hero, standing] = await Promise.all([
    getCommunityWeb(viewer),
    getCommunityPage(viewer),
    getMyCommunity(viewer),
    getCommunityHero(viewer),
    standingForViewer(viewer),
  ]);
  const incoming = mine.incoming
    .filter((r) => r.person)
    .map((r) => ({
      connectionId: r.connectionId,
      userId: r.person!.userId,
      name: r.person!.name,
      title: r.person!.title,
      photoUrl: r.person!.photoUrl,
    }));

  return (
    <>
      {}
      <CommunityHero web={web} hero={hero} standing={standing} />

      <div className="pm-cm">
        <div className="min-w-0 space-y-5">
          {}
        {}
          <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            {}
            <h2 className="font-display text-[17px] font-bold">Colleagues</h2>
            {page.colleagues.length > 0 && (
              <Link
                href="/community/connections"
                className="text-[13.5px] font-semibold text-magenta hover:underline"
              >
                See All {page.colleagues.length}
              </Link>
            )}
          </div>

          {page.colleagues.length === 0 && page.invited.length === 0 ? (
            <p className="text-[14px] leading-relaxed text-ink-2">
              Nobody here yet.{" "}
              <Link
                href="/invite-colleague"
                className="font-semibold text-magenta hover:underline"
              >
                Invite a Colleague
              </Link>
              .
            </p>
          ) : (
            <div className="pm-cm-cards">
              {page.colleagues.map((c) => (
                <JoinedCard key={c.connectionId} c={c} />
              ))}
              {}
              {page.invited.map((i) => (
                <InvitedCardView key={i.id} i={i} />
              ))}
            </div>
          )}
        </section>
      </div>

        <CommunityRail viewer={viewer} mine={mine} incoming={incoming} />
      </div>
    </>
  );
}
