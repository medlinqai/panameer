import { ScrollRow } from "@/components/casing/ScrollRow";
import Link from "next/link";
import { guardPage } from "@/lib/guard";
import {
  getDiscoverGroups,
  getGroupRequests,
  getGroupsHome,
  countPendingForOwner,
  type DiscoverTrack,
  type GroupCard,
} from "@/lib/groups-home";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { getSessionViewer } from "@/lib/session";
import { unreadCount } from "@/lib/messages";
import { AccountHero, HERO_BTN, HERO_BTN_W } from "@/components/casing/AccountHero";
import { BubbleField } from "@/components/casing/BubbleField";
import { StartGroup } from "@/components/community/StartGroup";
import { GroupJoin } from "@/components/community/GroupJoin";
import { DecideRequest } from "@/components/community/DecideRequest";
import { GROUP_OFFER_COPY } from "@/lib/group-membership";
import { getSkillAreas } from "@/lib/skill-area-store";
import { areaFor } from "@/lib/skill-areas";

export const metadata = { title: "Groups · Panameer" };

const VIEWS = [
  { key: "my", label: "My Groups" },
  { key: "discover", label: "Discover" },
  { key: "requests", label: "Requests" },
] as const;
const ROW = "flex flex-wrap items-center justify-between gap-2 border-b border-line py-3";
const OPEN = "inline-flex min-h-9 items-center border border-ink px-3.5 text-[13px] font-semibold hover:bg-black/[0.04]";
const TAG = "border px-1.5 text-[10.5px] font-bold tracking-[0.06em]";

// Connect › Groups (2026-10-08, mockup A–C): bubble hero, sub-tabs, Needs You + Groups You Run | This Month · Joined · Start a Group.
export default async function GroupsPage({ searchParams }: { searchParams: Promise<{ all?: string; view?: string; q?: string; area?: string; asked?: string }> }) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const unread = viewer ? await unreadCount(viewer) : 0;
  const sp = await searchParams;
  const view = VIEWS.some((v) => v.key === sp.view) ? sp.view! : "my";

  const home = viewer ? await getGroupsHome(viewer) : null;
  const discover: DiscoverTrack[] = viewer && view === "discover" ? await getDiscoverGroups(viewer) : [];
  const requests = viewer && view === "requests" ? await getGroupRequests(viewer) : { incoming: [], mine: [] };
  const pendingForMe = viewer && home ? (view === "requests" ? requests.incoming.length : await countPendingForOwner(viewer)) : 0;

  const run = home?.run ?? [];
  const joined = home?.joined ?? [];
  const needs = home?.needsYou ?? [];
  const waitingBy = new Map<string, number>();
  for (const t of needs) waitingBy.set(t.boardSlug, (waitingBy.get(t.boardSlug) ?? 0) + 1);
  const firstWaiting = needs[0] ?? null;
  const shown = sp.all === "1" ? run : run.slice(0, 4);
  const bubbles = (home?.circles ?? []).map((c) => ({
    key: c.slug,
    href: `/connect/groups/${c.slug}`,
    label: c.title,
    hover: `${c.title} · ${c.members} ${c.members === 1 ? "member" : "members"} · ${c.posts === 0 ? "no posts yet" : `${c.posts} posted`}${waitingBy.get(c.slug) ? ` · ${waitingBy.get(c.slug)} waiting on you` : ""}`,
    size: c.members,
    fill: c.quiet ? null : 1,
    ring: !!waitingBy.get(c.slug),
  }));
  const ago = (d: Date) => {
    // eslint-disable-next-line react-hooks/purity
    const h = Math.floor((Date.now() - d.getTime()) / 3_600_000);
    return h < 1 ? "just now" : h < 24 ? `${h} h ago` : `${Math.floor(h / 24)} d ago`;
  };
  const say = !home || home.runCount + home.joinedCount === 0 ? (
    <>You&apos;re not in a group yet. Start one, or join one from Discover.</>
  ) : firstWaiting ? (
    <><b className="text-ink">{firstWaiting.boardTitle}</b> has a question waiting on you.{needs.length > 1 ? ` ${needs.length - 1} more ${needs.length - 1 === 1 ? "waits" : "wait"} after it.` : ""} A group whose first question gets answered keeps talking.</>
  ) : (
    <>Your groups are quiet — a group with a first question gets answers, so post a starter question in your busiest path.</>
  );

  return (
    <>
      <PageTabs wrap eyebrow="CONNECT" sequence={tabSequenceFor("/connect")} tabs={connectTabs(viewer, unread)} current="/connect/groups" />
      <div className="mx-auto w-full max-w-[1010px]">
        <AccountHero
          wide
          testId="groups-hero"
          picture={
            <BubbleField
              bubbles={bubbles}
              me="YOU"
              caption={bubbles.length ? "Bubble size = members · click a bubble to open the group" : "Your groups appear here, one bubble each"}
              legend={[
                { label: "active", swatch: "ink" },
                { label: "quiet", swatch: "quiet" },
                { label: "waiting on you", swatch: "ring" },
              ]}
            />
          }
          eyebrow="Your Groups"
          title="Where Your Learners Ask"
          kpis={[
            { value: home?.runCount ?? 0, label: "GROUPS YOU RUN" },
            { value: home?.questionsWaiting ?? 0, label: "QUESTIONS WAITING" },
            { value: home?.joinedCount ?? 0, label: "GROUPS YOU JOINED" },
          ]}
          paragraph={say}
          actions={
            <>
              {firstWaiting && <Link href={`/connect/groups/thread/${firstWaiting.id}`} className={HERO_BTN}>Answer the Question</Link>}
              {home?.starterSlug && <Link href={`/connect/groups/${home.starterSlug}`} className={firstWaiting ? HERO_BTN_W : HERO_BTN}>Post a Starter Question</Link>}
              <Link href="#start-a-group" className={HERO_BTN_W}>Start a Group</Link>
            </>
          }
        />

        <nav aria-label="Groups views" className="mt-5 flex gap-1 border-b border-line">
          {VIEWS.map((v) => (
            <Link key={v.key} href={v.key === "my" ? "/connect/groups" : `/connect/groups?view=${v.key}`} aria-current={v.key === view ? "page" : undefined} className={"-mb-px border-b-2 px-3 py-2 text-[13.5px] font-bold " + (v.key === view ? "border-magenta text-magenta-dark" : "border-transparent text-ink-2 hover:text-ink")}>
              {v.label}{v.key === "requests" ? ` (${pendingForMe})` : ""}
            </Link>
          ))}
        </nav>

        {view === "my" && (
          <div className="grid md:grid-cols-[1.35fr_1fr]">
            <div className="min-w-0 py-6 md:pr-7">
              <h2 className="text-[20px] font-bold">Needs You <small className="ml-1 text-[12px] font-medium text-ink-3">questions in groups you run</small></h2>
              {needs.length === 0 ? (
                <p className="mt-2 text-[13.5px] text-ink-2">Nothing waiting. Questions from groups you run appear here, oldest first, until you answer them.</p>
              ) : (
                <ul>
                  {needs.map((t) => (
                    <li key={t.id} data-needs-you className={ROW}>
                      <span className="min-w-0 flex-1">
                        <b className="block truncate text-[14px]">{t.title}</b>
                        <span className="block text-[12.5px] text-ink-3">{t.boardTitle} · asked {ago(t.askedAt)}</span>
                      </span>
                      <Link href={`/connect/groups/thread/${t.id}`} className="inline-flex min-h-9 items-center bg-ink px-3.5 text-[13px] font-semibold text-surface hover:bg-ink-hover">Answer</Link>
                    </li>
                  ))}
                </ul>
              )}
              <h2 className="mt-7 text-[20px] font-bold">Groups You Run <small className="ml-1 text-[12px] font-medium text-ink-3">{run.length} · quietest first</small></h2>
              {run.length === 0 ? (
                <p className="mt-2 text-[13.5px] text-ink-2">You don&apos;t run a group yet. Starting one puts you here.</p>
              ) : (
                <ul>
                  {shown.map((c) => <RunRow key={c.slug} c={c} waiting={waitingBy.get(c.slug) ?? 0} />)}
                </ul>
              )}
              {run.length > shown.length && <Link href="/connect/groups?all=1" scroll={false} className="mt-3 inline-flex min-h-9 items-center border border-line px-3.5 text-[13px] font-semibold hover:border-ink">Show All {run.length}</Link>}
            </div>
            <aside className="min-w-0 border-t border-line py-6 md:border-l md:border-t-0 md:pl-7">
              <h2 className="text-[18px] font-bold">This Month</h2>
              <dl className="mt-2 grid grid-cols-3 gap-2">
                {[["Questions asked", home?.thisMonth.asked ?? 0], ["You answered", home?.thisMonth.answered ?? 0], ["New members", home?.thisMonth.newMembers ?? 0]].map(([k, v]) => (
                  <div key={k as string}><dd className="text-[22px] font-medium tabular-nums">{v}</dd><dt className="text-[11px] font-semibold text-ink-3">{k}</dt></div>
                ))}
              </dl>
              <h2 className="mt-6 border-t border-line pt-5 text-[18px] font-bold">Groups You Joined <small className="ml-1 text-[12px] font-medium text-ink-3">{joined.length}</small></h2>
              {joined.length === 0 ? (
                <p className="mt-2 text-[13.5px] text-ink-2">None yet. <Link href="/connect/groups?view=discover" className="font-bold underline">Discover groups</Link>.</p>
              ) : (
                <ul>
                  {joined.map((c) => (
                    <li key={c.slug} className={ROW}>
                      <span className="min-w-0 flex-1"><b className="block truncate text-[14px]">{c.title}</b><span className="text-[12.5px] text-ink-3">{c.members} {c.members === 1 ? "member" : "members"}</span></span>
                      <Link href={`/connect/groups/${c.slug}`} className={OPEN}>Open</Link>
                    </li>
                  ))}
                </ul>
              )}
              <div id="start-a-group" className="mt-6 scroll-mt-24 border-t border-line pt-5">
                <h2 className="text-[18px] font-bold">Start a Group</h2>
                <p className="mb-3 mt-1 text-[13px] text-ink-2">A topic, a region, alumni — any member can start one.</p>
                <StartGroup />
              </div>
            </aside>
          </div>
        )}

        {view === "discover" && <Discover tracks={discover} q={sp.q ?? ""} area={sp.area ?? ""} asked={sp.asked === "1"} areas={(await getSkillAreas()).filter((a) => !a.hidden)} />}
        {view === "requests" && <Requests incoming={requests.incoming} mine={requests.mine} />}
      </div>
    </>
  );
}

function RunRow({ c, waiting }: { c: GroupCard; waiting: number }) {
  return (
    <li data-run-group={c.slug} className={ROW}>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <b className="truncate text-[14px]">{c.title}</b>
          {waiting > 0 ? <span className={TAG + " border-magenta text-magenta-dark"}>{waiting} WAITING</span> : c.posts === 0 ? <span className={TAG + " border-[#C9CDDC] text-ink-3"}>QUIET</span> : null}
        </span>
        <span className="block text-[12.5px] text-ink-3">{c.pathBacked ? "Path group" : "Member group"} · {c.members} {c.members === 1 ? "member" : "members"} · {c.posts === 0 ? "no posts yet" : `${c.posts} ${c.posts === 1 ? "post" : "posts"}`}</span>
      </span>
      <Link href={`/connect/groups/${c.slug}`} className={OPEN}>Open</Link>
    </li>
  );
}

/** Discover: search, area chips + Has Questions, 3-up cards. */
function Discover({ tracks, q, area, asked, areas }: { tracks: DiscoverTrack[]; q: string; area: string; asked: boolean; areas: { code: string; label: string }[] }) {
  const n = q.trim().toLowerCase();
  const groups = tracks
    .flatMap((t) => t.groups.map((g) => ({ ...g, track: t.track, area: areaFor(g.title, [t.track]) })))
    .filter((g) => (!area || g.area === area) && (!asked || g.posts > 0) && (!n || [g.title, g.track].some((x) => x.toLowerCase().includes(n))));
  const href = (patch: Record<string, string>) => {
    const u = new URLSearchParams({ view: "discover", ...(q ? { q } : {}), ...(area ? { area } : {}), ...(asked ? { asked: "1" } : {}), ...patch });
    for (const [k, v] of [...u.entries()]) if (!v) u.delete(k);
    return `/connect/groups?${u.toString()}`;
  };
  const chip = (on: boolean) => "shrink-0 whitespace-nowrap border px-3 py-1.5 text-[13px] font-semibold " + (on ? "border-ink bg-ink text-surface" : "border-line text-ink hover:border-ink");
  const used = new Set<string | null>(tracks.flatMap((t) => t.groups.map((g) => areaFor(g.title, [t.track]))));
  return (
    <div className="py-6" data-discover>
      <form method="get" action="/connect/groups" className="flex flex-wrap gap-2">
        <input type="hidden" name="view" value="discover" />
        {area && <input type="hidden" name="area" value={area} />}
        {asked && <input type="hidden" name="asked" value="1" />}
        <input name="q" defaultValue={q} placeholder="Search groups…" aria-label="Search groups" className="h-10 min-w-[220px] flex-1 border border-line bg-surface px-3 text-[14px] focus:border-ink focus:outline-none" />
        <button type="submit" className="inline-flex min-h-[40px] items-center border border-ink bg-ink px-3.5 text-[13px] font-bold text-surface">Search</button>
      </form>
      <div className="-mx-1 mt-3"><ScrollRow as="nav" label="Areas" className="gap-1.5 px-1 pb-1">
        <Link href={href({ area: "" })} className={chip(!area)}>All Areas</Link>
        {areas.filter((a) => used.has(a.code)).map((a) => <Link key={a.code} href={href({ area: a.code })} className={chip(area === a.code)}>{a.label}</Link>)}
        <Link href={href({ asked: asked ? "" : "1" })} className={chip(asked)}>Has Questions</Link>
      </ScrollRow></div>
      {groups.length === 0 ? (
        <p className="mt-6 text-center text-[14px] text-ink-2">{tracks.length === 0 ? "You're already in every group there is. Starting one is the way to make another." : "No groups match."}</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((g) => (
            <li key={g.slug} data-discover-group={g.slug} className="flex flex-col border border-line bg-white p-4">
              <p className="text-[10.5px] font-bold tracking-[0.08em] text-ink-3">{(areas.find((a) => a.code === g.area)?.label ?? g.track).toUpperCase()}</p>
              <Link href={`/connect/groups/${g.slug}`} className="mt-1.5 text-[15px] font-bold leading-snug hover:underline">{g.title}</Link>
              <p className="mt-1 text-[12.5px] text-ink-2">{g.pathSlug ? "Path group" : "Member group"} · {g.members} {g.members === 1 ? "member" : "members"} · {g.posts === 0 ? "quiet" : `${g.posts} ${g.posts === 1 ? "question" : "questions"}`}</p>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
                <GroupJoin boardId={g.boardId} offer={g.offer} copy={GROUP_OFFER_COPY[g.offer.kind]} canLeave={false} pathSlug={g.pathSlug} />
                <Link href={`/connect/groups/${g.slug}`} className={OPEN}>Open</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** REQUESTS, BOTH DIRECTIONS WS-B 3) */
function Requests({
  incoming,
  mine,
}: {
  incoming: { id: string; groupSlug: string; groupTitle: string; personName: string; askedAt: Date }[];
  mine: {
    groupSlug: string;
    groupTitle: string;
    state: "PENDING" | "DECLINED";
    askedAt: Date;
    decidedAt: Date | null;
  }[];
}) {
  return (
    <div className="mt-6 space-y-6">
      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">
          People Asking to Join Your Groups
        </h2>
        {incoming.length === 0 ? (
          <p className="text-[14px] leading-relaxed text-ink-2 border-t border-line py-5">
            Nobody is waiting on you. When someone asks to join a group you run,
            they appear here, oldest first.
          </p>
        ) : (
          <div className="space-y-2">
            {incoming.map((r) => (
              // A named class, so a gate can address the ROW rather than
              <div
                key={r.id}
                className="pm-groups-req flex flex-wrap items-center gap-3 border-t border-line py-5"
              >
                <div className="min-w-[180px] flex-1">
                  <p className="text-[15px] font-bold">{r.personName}</p>
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    wants to join {r.groupTitle}
                  </p>
                </div>
                <DecideRequest membershipId={r.id} personName={r.personName} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-[17px] font-bold">Your Requests</h2>
        {mine.length === 0 ? (
          <div className="border-t border-line py-5">
            <p className="text-[14px] leading-relaxed text-ink-2">
              You haven&rsquo;t asked to join anything. Groups that need an owner&rsquo;s
              say-so show up here while you wait.
            </p>
            {/* THE DOOR OUT . The mockup carries */}
            <Link
              href="/connect/groups?view=discover"
              className="mt-3 inline-block text-[13.5px] font-bold text-magenta hover:underline"
            >
              Discover Groups &rarr;
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {mine.map((r) => (
              <div
                key={r.groupSlug}
                className="flex flex-wrap items-center gap-3 border-t border-line py-5"
              >
                <div className="min-w-[180px] flex-1">
                  <Link
                    href={`/connect/groups/${r.groupSlug}`}
                    className="text-[15px] font-bold hover:text-magenta"
                  >
                    {r.groupTitle}
                  </Link>
                  {/* THE STATE IN WORDS, NOT A COLOURED DOT. A decline that */}
                  <p className="mt-0.5 text-[13px] text-ink-2">
                    {r.state === "PENDING"
                      ? "Waiting on the group's owner."
                      : "The owner declined this one."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
