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
import { GroupCircles } from "@/components/community/GroupCircles";
import { StartGroup } from "@/components/community/StartGroup";
import { GroupJoin } from "@/components/community/GroupJoin";
import { DecideRequest } from "@/components/community/DecideRequest";
import { GROUP_OFFER_COPY } from "@/lib/group-membership";
import "@/components/community/community-page.css";
import "@/components/community/groups.css";

const VIEWS = [
  { key: "my", label: "My Groups" },
  { key: "discover", label: "Discover" },
  { key: "requests", label: "Requests" },
] as const;

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string; view?: string }>;
}) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const unread = viewer ? await unreadCount(viewer) : 0;
  const sp = await searchParams;
  const view = VIEWS.some((v) => v.key === sp.view) ? sp.view! : "my";

  const home = viewer ? await getGroupsHome(viewer) : null;
  const discover: DiscoverTrack[] =
    viewer && view === "discover" ? await getDiscoverGroups(viewer) : [];
  const requests =
    viewer && view === "requests"
      ? await getGroupRequests(viewer)
      : { incoming: [], mine: [] };

  const pendingForMe =
    viewer && home
      ? view === "requests"
        ? requests.incoming.length
        : await countPendingForOwner(viewer)
      : 0;

  const showAll = sp.all === "1";
  const SHOWN = showAll ? Number.MAX_SAFE_INTEGER : 4;
  const run = home?.run ?? [];
  const joined = home?.joined ?? [];

  return (
    <>
      {}
      <PageTabs
        wrap
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/connect/groups"
      />

      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          {}
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
            Groups
          </h1>
        </header>

        {}
        <section className="pm-hero pm-groups-hero">
          <div className="pm-hero-stage">
            <GroupCircles circles={home?.circles ?? []} />
          </div>

          <div className="pm-hero-side">
            {}
            {}
            <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">
              Your Groups
            </p>
            <h2 className="pm-hero-title">Where Your Learners Ask</h2>

            {}
            <dl className="pm-groups-figs">
              <div>
                <dt>Groups You Run</dt>
                <dd>{home?.runCount ?? 0}</dd>
              </div>
              <div>
                <dt>Questions Waiting</dt>
                <dd>{home?.questionsWaiting ?? 0}</dd>
              </div>
              <div>
                <dt>Groups You Joined</dt>
                <dd>{home?.joinedCount ?? 0}</dd>
              </div>
            </dl>

            {}
            <p className="pm-hero-move">{actionLine(home)}</p>

            <div className="pm-groups-actions">
              {}
              {home?.starterSlug && (
                <Link
                  href={`/connect/groups/${home.starterSlug}`}
                  className="pm-hero-cta"
                >
                  Post a Starter Question
                </Link>
              )}
              {/* An anchor to the ONE form in the rail — not a second form. */}
              <Link href="#start-a-group" className="pm-groups-ghost">
                Start a Group
              </Link>
            </div>
          </div>
        </section>

        {/* 1b · THE THREE VIEWS — the mockup's own switcher */}
        <nav aria-label="Groups views" className="pm-groups-views">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={v.key === "my" ? "?" : `?view=${v.key}`}
              aria-current={v.key === view ? "page" : undefined}
              className={v.key === view ? "is-on" : undefined}
            >
              {v.label}
              {/* THE COUNT RIDES THE TAB ONLY WHEN IT IS ABOVE ZERO AND */}
              {v.key === "requests" && pendingForMe > 0 && (
                <span className="pm-groups-pill">{pendingForMe}</span>
              )}
            </Link>
          ))}
        </nav>

        {view === "my" && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            {/* 2 · NEEDS YOU */}
            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-bold">Needs You</h2>
              {home && home.needsYou.length > 0 ? (
                <div className="space-y-2">
                  {home.needsYou.map((t) => (
                    <Link
                      key={t.id}
                      href={`/connect/groups/thread/${t.id}`}
                      className="block transition-colors hover:border-magenta border-t border-line py-5"
                    >
                      <p className="text-[15px] font-bold">{t.title}</p>
                      <p className="mt-0.5 text-[13px] text-ink-2">
                        {t.boardTitle}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-[14px] leading-relaxed text-ink-2 border-t border-line py-5">
                  Questions from groups you run will appear here, oldest first,
                  until you answer them. Nobody has asked anything yet.
                </p>
              )}
            </section>

            {/* ── 3 · GROUPS YOU RUN — quietest first ───────────────────── */}
            <GroupList
              heading="Groups You Run"
              cards={run}
              shown={SHOWN}
              empty="You don't run a group yet. Starting one puts you here."
            />

            {/* The joined list renders only when there is one — an empty */}
            {joined.length > 0 && (
              <GroupList
                heading="Groups You Joined"
                cards={joined}
                shown={SHOWN}
                empty=""
              />
            )}
          </div>

          <aside className="space-y-4">
            {/* ── 4a · THIS MONTH — three counts, one window ─────────────── */}
            <div className="border-t border-line py-5">
              <h3 className="font-display text-[15px] font-bold">This Month</h3>
              <dl className="pm-groups-month">
                <div>
                  <dt>Questions asked</dt>
                  <dd>{home?.thisMonth.asked ?? 0}</dd>
                </div>
                <div>
                  <dt>You answered</dt>
                  <dd>{home?.thisMonth.answered ?? 0}</dd>
                </div>
                <div>
                  <dt>New members</dt>
                  <dd>{home?.thisMonth.newMembers ?? 0}</dd>
                </div>
              </dl>
            </div>

            {/* ── 4b · START A GROUP — the one form ──────────────────────── */}
            <div id="start-a-group" className="border-t border-line py-5">
              <h3 className="font-display text-[15px] font-bold">Start a Group</h3>
              <p className="mb-3 mt-1 text-[13px] leading-relaxed text-ink-2">
                A topic, a region, an alumni group — anyone can start one, and
                anyone can join it.
              </p>
              <StartGroup />
            </div>

            {/* 4c · PAID GROUPS */}
            <div className="border-t border-line py-5">
              <h3 className="font-display text-[15px] font-bold">Paid Groups</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                Not set up yet. Charging for a group needs a way to take payment,
                and that lives in Shop.
              </p>
            </div>
          </aside>
        </div>
        )}

        {/* ── 2 · DISCOVER (`P2-A3-E619` WS-B 1) ───────────────────────────── */}
        {view === "discover" && <Discover tracks={discover} />}

        {/* ── 3 · REQUESTS (`P2-A3-E619` WS-B 3) ───────────────────────────── */}
        {view === "requests" && (
          <Requests incoming={requests.incoming} mine={requests.mine} />
        )}
      </div>
    </>
  );
}

/** THE ONE LINE, DERIVED FROM THE COUNTS. NO FABRICATED ENCOURAGEMENT */
function actionLine(home: Awaited<ReturnType<typeof getGroupsHome>> | null): string {
  if (!home || home.runCount + home.joinedCount === 0) {
    // IT NAMES `Discover` AGAIN — BECAUSE DISCOVER NOW EXISTS (WS-B).
    return "You're not in a group yet. Start one, or join one from Discover.";
  }
  if (home.questionsWaiting > 0) {
    return `${home.questionsWaiting} ${
      home.questionsWaiting === 1 ? "question is" : "questions are"
    } waiting on you.`;
  }
  const quiet = home.circles.filter((c) => c.quiet).length;
  if (quiet === home.circles.length) {
    return `All ${home.circles.length} of your groups are quiet. A starter question is what gets the first one talking.`;
  }
  return `${home.circles.length - quiet} of your ${home.circles.length} groups have something posted.`;
}

/** Two across on desktop, one on a phone — the brief's grid, phone first. */
function GroupList({
  heading,
  cards,
  shown,
  empty,
}: {
  heading: string;
  cards: GroupCard[];
  shown: number;
  empty: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-[17px] font-bold">{heading}</h2>
        {/* THE SORT IS STATED WHERE IT APPLIES (`decisions_2026-09-23` §3 — */}
        {cards.length > 1 && (
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
            Quietest First
          </p>
        )}
      </div>

      {cards.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-ink-2 border-t border-line py-5">
          {empty}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.slice(0, shown).map((c) => (
              <Link
                key={c.slug}
                href={`/connect/groups/${c.slug}`}
                className="pm-groups-card"
              >
                <p className="pm-groups-card-t">{c.title}</p>
                {/* EVERY PART OF THIS LINE IS COUNTED. `no posts yet` is the */}
                <p className="pm-groups-card-m">
                  {c.pathBacked ? "Path group" : "Member group"} ·{" "}
                  <span className="pm-groups-n">{c.members}</span>{" "}
                  {c.members === 1 ? "member" : "members"} ·{" "}
                  {c.posts === 0 ? (
                    "no posts yet"
                  ) : (
                    <>
                      <span className="pm-groups-n">{c.posts}</span>{" "}
                      {c.posts === 1 ? "post" : "posts"}
                    </>
                  )}
                </p>
                <span className="pm-groups-card-o">Open →</span>
              </Link>
            ))}
          </div>
          {cards.length > shown && (
            <p>
              <Link
                href="?all=1"
                scroll={false}
                className="text-[13.5px] font-bold text-magenta hover:underline"
              >
                Show All {cards.length} Groups →
              </Link>
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** DISCOVER WS-B 1) */
function Discover({ tracks }: { tracks: DiscoverTrack[] }) {
  if (tracks.length === 0) {
    return (
      <p className="mt-6 text-[14px] leading-relaxed text-ink-2 border-t border-line py-5">
        You&rsquo;re already in every group there is. Starting one is the way to
        make another.
      </p>
    );
  }
  return (
    <div className="mt-6 space-y-6">
      {/* THE VIEW SAYS WHAT IT IS */}
      <div>
        <h2 className="font-display text-[17px] font-bold">Groups You Can Join</h2>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-2">
          Groups you are not in yet, grouped by the path they belong to.
        </p>
      </div>
      {tracks.map((t) => (
        <section key={t.track} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[17px] font-bold">{t.track}</h2>
            {/* `E433` — the count is a figure, so ink. */}
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
              {t.groups.length} {t.groups.length === 1 ? "group" : "groups"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.groups.map((g) => (
              <div key={g.slug} className="pm-groups-card pm-groups-card-static">
                <Link href={`/connect/groups/${g.slug}`} className="pm-groups-card-t">
                  {g.title}
                </Link>
                <p className="pm-groups-card-m">
                  <span className="pm-groups-n">{g.members}</span>{" "}
                  {g.members === 1 ? "member" : "members"} ·{" "}
                  {g.posts === 0 ? (
                    "quiet"
                  ) : (
                    <>
                      <span className="pm-groups-n">{g.posts}</span>{" "}
                      {g.posts === 1 ? "post" : "posts"}
                    </>
                  )}
                </p>
                <div className="mt-3">
                  {/* are in, so a Leave control could never apply. */}
                  <GroupJoin
                    boardId={g.boardId}
                    offer={g.offer}
                    copy={GROUP_OFFER_COPY[g.offer.kind]}
                    canLeave={false}
                    pathSlug={g.pathSlug}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
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
