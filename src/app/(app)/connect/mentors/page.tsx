import { ScrollRow } from "@/components/casing/ScrollRow";
import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { listMentors } from "@/lib/mentors";
import { getSessionViewer } from "@/lib/session";
import { getMyCommunity, type PersonCard } from "@/lib/connections";
import { helpfulAnswersByPerson } from "@/lib/mentoring-home";
import { getSkillAreas } from "@/lib/skill-area-store";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import { AccountHero, HERO_BTN_W } from "@/components/casing/AccountHero";
import { Avatar } from "@/components/Avatar";
import { MentorBridge } from "@/components/community/MentorBridge";
import { MentoringSwitch } from "@/components/community/MentoringSwitch";
import { MentorRequestActions } from "@/components/community/MentorRequestActions";
import { ConnectControls } from "@/components/community/ConnectControls";

export const metadata = { title: "Mentors · Panameer" };

// Connect › Mentors (2026-10-08): hero, Find a Mentor (search + area chips + cards), then your mentors | requests + mentees.
export default async function MentorsPage({ searchParams }: { searchParams: Promise<{ q?: string; area?: string; shared?: string }> }) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  if (!viewer) return null;
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const area = sp.area ?? "";
  const shared = sp.shared === "1";

  const [unread, mine, me, areas, found] = await Promise.all([
    unreadCount(viewer),
    getMyCommunity(viewer),
    prisma.person.findUnique({
      where: { user_id: viewer.userId },
      select: { first_name: true, last_name: true, photo_url: true, providerProfile: { select: { open_for_mentoring: true, skills: { select: { skill_id: true } } } } },
    }),
    getSkillAreas(),
    listMentors({ openOnly: true, q: q || undefined, area: area || undefined }),
  ]);
  const mySkills = new Set((me?.providerProfile?.skills ?? []).map((s) => s.skill_id));
  const mentorIds = new Set(mine.following.map((f) => f.person!.userId));
  const requestedIds = new Set(mine.mentorRequested.map((f) => f.person!.userId));
  const colleagueIds = new Set(mine.colleagues.map((c) => c.person!.userId));
  const cards = found
    .filter((m) => m.userId && m.userId !== viewer.userId)
    .map((m) => ({ ...m, sharedCount: m.skillIds.filter((s) => mySkills.has(s)).length }))
    .filter((m) => !shared || m.sharedCount > 0)
    .sort((a, b) => b.sharedCount - a.sharedCount);
  const helpful = await helpfulAnswersByPerson(cards.map((m) => m.personId));

  const mentors = mine.following.map((f) => f.person!) as PersonCard[];
  const mentees = mine.mentees.map((f) => f.person!) as PersonCard[];
  const requests = mine.mentorRequests;
  const meName = `${me?.first_name ?? ""} ${me?.last_name ?? ""}`.trim();
  const open = me?.providerProfile?.open_for_mentoring ?? null;
  const say =
    requests.length > 0 ? (
      <><b className="text-ink">{requests.length} {requests.length === 1 ? "person has" : "people have"} asked you to mentor them.</b> Accept or decline below.</>
    ) : mentors.length === 0 ? (
      <>Ask anyone open for mentoring to mentor you — it&apos;s free, and they accept or decline.{open === false ? " Turn on mentoring and people who want to learn from you can find you." : ""}</>
    ) : (
      <>You have {mentors.length} {mentors.length === 1 ? "mentor" : "mentors"}{mentees.length ? ` and ${mentees.length} ${mentees.length === 1 ? "mentee" : "mentees"}` : ""}.{open === false ? " Turn on mentoring and people who want to learn from you can find you." : ""}</>
    );
  const href = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ ...(q ? { q } : {}), ...(area ? { area } : {}), ...(shared ? { shared: "1" } : {}), ...patch });
    for (const [k, v] of [...p.entries()]) if (!v) p.delete(k);
    const s = p.toString();
    return `/connect/mentors${s ? `?${s}` : ""}#find`;
  };
  const chip = (on: boolean) => "shrink-0 whitespace-nowrap border px-3 py-1.5 text-[13px] font-semibold " + (on ? "border-ink bg-ink text-surface" : "border-line text-ink hover:border-ink");

  return (
    <>
      <PageTabs wrap eyebrow="CONNECT" sequence={tabSequenceFor("/connect")} tabs={connectTabs(viewer, unread)} current="/connect/mentors" />
      <div className="mx-auto w-full max-w-[1010px]">
        <AccountHero
          testId="mentors-hero"
          picture={<MentorBridge mentors={mentors} mentees={mentees} me={{ name: meName, photoUrl: me?.photo_url ?? null }} />}
          eyebrow="Mentors"
          title="Learn From People Who've Done the Work"
          kpis={[
            { value: mentors.length, label: "YOUR MENTORS" },
            { value: mentees.length, label: "YOUR MENTEES" },
            { value: requests.length, label: "REQUESTS WAITING" },
          ]}
          paragraph={say}
          actions={
            <>
              {open !== null && <MentoringSwitch initial={open} />}
              <a href="#find" className={`${HERO_BTN_W} self-start`}>Find a Mentor</a>
            </>
          }
        />

        <section id="find" data-find-mentor className="scroll-mt-24 py-7">
          <h2 className="text-[22px] font-bold">Find a Mentor</h2>
          <p className="text-[13.5px] text-ink-2">People who are open for mentoring, best match first.</p>
          <form method="get" action="/connect/mentors#find" className="mt-3 flex flex-wrap gap-2">
            {area && <input type="hidden" name="area" value={area} />}
            {shared && <input type="hidden" name="shared" value="1" />}
            <input name="q" defaultValue={q} placeholder="Search skill, role or name…" aria-label="Search mentors" className="h-10 min-w-[220px] flex-1 border border-line bg-surface px-3 text-[14px] focus:border-ink focus:outline-none" />
            <button type="submit" className="inline-flex min-h-[40px] items-center border border-ink bg-ink px-3.5 text-[13px] font-bold text-surface">Search</button>
          </form>
          <div className="-mx-1 mt-3"><ScrollRow as="nav" label="Areas" className="gap-1.5 px-1 pb-1">
            <Link href={href({ area: "" })} className={chip(!area)}>All Areas</Link>
            {areas.filter((a) => !a.hidden).map((a) => (
              <Link key={a.code} href={href({ area: a.code })} className={chip(area === a.code)}>{a.label}</Link>
            ))}
            {mySkills.size > 0 && <Link href={href({ shared: shared ? "" : "1" })} className={chip(shared)}>Shared skills</Link>}
          </ScrollRow></div>
          <p className="mt-2 text-[13px] text-ink-2"><b className="text-ink">{cards.length}</b> {cards.length === 1 ? "mentor" : "mentors"}</p>
          {cards.length === 0 ? (
            <p className="mt-6 text-center text-[14px] text-ink-2">No one open for mentoring matches yet. Try another area or search.</p>
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((m) => {
                const h = helpful.get(m.personId) ?? 0;
                const status = mentorIds.has(m.userId!) ? ("MENTOR" as const) : requestedIds.has(m.userId!) ? ("REQUESTED" as const) : null;
                return (
                  <li key={m.profileId} data-mentor-card={m.userId} className="flex flex-col border border-line bg-white p-4">
                    <Link href={`/providers/${m.profileId}`} className="flex items-start gap-3 hover:underline">
                      <Avatar firstName={m.firstName} lastName={m.lastName} photoUrl={m.photoUrl} size={48} />
                      <span className="min-w-0">
                        <b className="block truncate text-[15px]">{m.name}</b>
                        <span className="block truncate text-[12.5px] text-ink-2">{[m.headline, m.years ? `${m.years} years` : null].filter(Boolean).join(" · ")}</span>
                      </span>
                    </Link>
                    <p className="mt-2.5 text-[12.5px] font-semibold text-ink-2">
                      {[h ? `${h} ${h === 1 ? "answer" : "answers"} marked helpful` : null, m.sharedCount ? `${m.sharedCount} shared skill${m.sharedCount === 1 ? "" : "s"}` : null].filter(Boolean).join(" · ") || "Open for mentoring"}
                    </p>
                    {m.skills.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {m.skills.slice(0, 3).map((s) => <span key={s} className="border border-line px-1.5 py-0.5 text-[11.5px]">{s}</span>)}
                      </div>
                    )}
                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
                      <ConnectControls toUserId={m.userId!} relation={null} part="mentor" mentorStatus={status} tone="outline" />
                      {colleagueIds.has(m.userId!) && <Link href={`/messages?with=${m.userId}`} className="border border-line px-3.5 py-1.5 text-[13px] font-semibold hover:border-ink">Message</Link>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="grid border-t border-line md:grid-cols-2">
          <section data-your-mentors className="min-w-0 py-6 md:pr-7">
            <h2 className="text-[20px] font-bold">Your Mentors <small className="ml-1 text-[12px] font-medium text-ink-3">{mentors.length}</small></h2>
            <PeopleList people={mentors} colleagueIds={colleagueIds} empty="No mentors yet. Find one above and ask." />
            {mine.mentorRequested.length > 0 && (
              <p className="mt-3 text-[12.5px] text-ink-2">Waiting on: {mine.mentorRequested.map((r) => r.person!.name).join(", ")}</p>
            )}
          </section>
          <section className="min-w-0 border-t border-line py-6 md:border-l md:border-t-0 md:pl-7">
            <h2 id="requests" className="scroll-mt-24 text-[20px] font-bold">Requests to Mentor You <small className="ml-1 text-[12px] font-medium text-ink-3">{requests.length}</small></h2>
            {requests.length === 0 ? (
              <p className="mt-2 text-[13.5px] text-ink-2">{open ? "No requests waiting." : "Nobody can ask until you turn on Open for Mentoring."}</p>
            ) : (
              <ul className="mt-1">
                {requests.map((r) => (
                  <li key={r.connectionId} data-mentor-request className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5">
                    <PersonLine p={r.person!} />
                    <MentorRequestActions connectionId={r.connectionId} />
                  </li>
                ))}
              </ul>
            )}
            <h2 className="mt-6 text-[20px] font-bold">Your Mentees <small className="ml-1 text-[12px] font-medium text-ink-3">{mentees.length}</small></h2>
            <PeopleList people={mentees} colleagueIds={colleagueIds} empty="Nobody yet." />
          </section>
        </div>
      </div>
    </>
  );
}

function PersonLine({ p }: { p: PersonCard }) {
  const [first, ...rest] = p.name.split(" ");
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar firstName={first ?? ""} lastName={rest.join(" ")} photoUrl={p.photoUrl} size={36} />
      <span className="min-w-0">
        <b className="block truncate text-[14px]">{p.name}</b>
        {p.title && <span className="block truncate text-[12.5px] text-ink-3">{p.title}</span>}
      </span>
    </span>
  );
}

function PeopleList({ people, colleagueIds, empty }: { people: PersonCard[]; colleagueIds: Set<string>; empty: string }) {
  if (people.length === 0) return <p className="mt-2 text-[13.5px] text-ink-2">{empty}</p>;
  return (
    <ul className="mt-1">
      {people.map((p) => (
        <li key={p.userId} className="flex items-center justify-between gap-2 border-b border-line py-2.5">
          <PersonLine p={p} />
          {colleagueIds.has(p.userId) && <Link href={`/messages?with=${p.userId}`} className="border border-line px-3 py-1 text-[13px] font-semibold hover:border-ink">Message</Link>}
        </li>
      ))}
    </ul>
  );
}
