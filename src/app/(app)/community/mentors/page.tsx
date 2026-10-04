import { guardPage } from "@/lib/guard";
import { listMentors } from "@/lib/mentors";
import { getSessionViewer } from "@/lib/session";
import { getMyCommunity } from "@/lib/connections";
import { getMentoringHome, helpfulAnswersByPerson } from "@/lib/mentoring-home";
import { OpenForMentoringToggle } from "@/components/community/OpenForMentoringToggle";
import { MentoringPanels } from "@/components/community/MentoringPanels";
import { FindAMentor } from "@/components/community/FindAMentor";
// import { formatCents } from "@/lib/display";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";

export const metadata = { title: "Mentoring · Panameer" };

export default async function MentorsPage({
  searchParams,
}: {
  searchParams: Promise<{ skill?: string }>;
}) {
  await guardPage("authenticated");
  const unreadViewer = await getSessionViewer();
  const unread = unreadViewer ? await unreadCount(unreadViewer) : 0;
  const { skill } = await searchParams;
  const mentors = await listMentors({
    skill: skill?.trim() || undefined,
    openOnly: true,
  });

  const viewer = await getSessionViewer();
  const mine = viewer ? await getMyCommunity(viewer) : null;
  const mentorUserIds = new Set(
    (mine?.following ?? []).filter((f) => f.person).map((f) => f.person!.userId)
  );
  const viewerUserId = viewer?.userId ?? null;

  const home = viewer ? await getMentoringHome(viewer) : null;

  const visible = mentors.filter((m) => m.userId && m.userId !== viewerUserId);
  const signals = await helpfulAnswersByPerson(visible.map((m) => m.personId));

  return (
    <>
      {}
      {}
      {}
      <PageTabs
        wrap
        eyebrow="CONNECT" sequence={tabSequenceFor("/connect")} tabs={connectTabs(viewer, unread)} current="/community/mentors" />
      <div className="mx-auto max-w-5xl space-y-5">
      <header>
        {}
        <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
          Ask for Mentoring
        </h1>
        <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-2">
          Every member can be asked. These are practitioners on Panameer whose
          profiles show the work — connect as a mentor and their published rate
          is what applies.
        </p>
      </header>

      {}
      <section className="rounded-brand border border-dashed border-magenta/30 bg-magenta/[0.03] p-4">
        <p className="text-[14px] leading-relaxed text-ink-2">
          <b className="text-ink">Connecting is free and immediate.</b> Nobody
          here has to accept, opt in or be approved — asking is what makes
          somebody a mentor. Their rate is the one they published. Paying for
          time through Panameer arrives with the rest of the commerce path; until
          then you arrange it between yourselves.
        </p>
      </section>

      {}
      {home?.openForMentoring !== null && home !== null && (
        <OpenForMentoringToggle initial={home.openForMentoring} />
      )}
      {home && (
        <MentoringPanels
          followers={home.followers.map((f) => ({
            connectionId: f.connectionId,
            userId: f.userId,
            name: f.name,
            title: f.title,
            photoUrl: f.photoUrl,
          }))}
          followingMentors={home.followingMentors}
          helpfulAnswers={home.helpfulAnswers}
        />
      )}

      {}
      <FindAMentor
        skill={skill?.trim() ?? ""}
        openForMentoring={home?.openForMentoring ?? null}
        viewerUserId={viewerUserId}
        results={visible.map((m) => ({
          profileId: m.profileId,
          userId: m.userId,
          personId: m.personId,
          name: m.name,
          headline: m.headline,
          photoUrl: m.photoUrl,
          skills: m.skills,
          helpfulAnswers: signals.get(m.personId) ?? 0,
          alreadyFollowing: mentorUserIds.has(m.userId ?? ""),
        }))}
      />
    </div>
    </>
  );
}
