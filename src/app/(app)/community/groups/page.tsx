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

/**
 * ── ⚠⚠⚠ GROUPS — THE PAGE, REBUILT (`P2-A3-E619` WS-A) ───────────────────
 *
 * ⚠ SCOTT, 2026-09-22, RULING 3: *"The Groups page is meh, zzzzzzz."* — the
 * page is **REPLACED, not restyled**, against `mockups/groups_2026-09-22.html`.
 *
 * ── ⚠⚠ WHAT THIS PAGE REPLACED, AND WHAT SURVIVED IT ────────────────────
 *
 * ⚠ The old page led with instructor thread panels and put the rooms in a rail.
 * ⚠⚠ **`getForumsHome` AND `ForumRooms` ARE NOT DELETED AND MUST NOT BE.**
 * `check:forums` calls `getForumsHome` DIRECTLY to prove the enrolment access
 * rule — a stranger sees the 4 general rooms and zero path boards while a
 * teacher sees theirs. ⚠⚠⚠ `CLAUDE.md` lesson 14: *"BEFORE DELETING DEAD CODE,
 * CHECK WHETHER A GATE ASSERTS A LIVE RULE AGAINST IT… WHEN THE CODE A RULE
 * NAMES GOES AWAY, THE RULE MAY NOT."* Both stay on disk, and the live rule
 * they carry stays proven.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the shape this page had:
 * //   const home = await getForumsHome(viewer);
 * //   <h2>In Paths You Teach</h2>   … noReplies / unweighed ThreadGroups
 * //   <h2>Recent in Your Groups</h2> … home.recent
 * //   <aside><ForumRooms rooms={home.rooms} /></aside>
 * ⚠⚠ The instructor panels' JOB survives as **Needs You**, which asks the same
 * question — *what is waiting on me* — against the groups you RUN rather than
 * the paths you teach. ⚠ Those are different sets and that is deliberate:
 * ownership is the column (`E572`), not the teaching capability.
 *
 * ── ⚠⚠⚠ EVERY FIGURE ON THIS PAGE IS COUNTED ────────────────────────────
 *
 * ⚠ `getGroupsHome` carries the measurements and the reasons. ⚠⚠ Nothing here
 * prints a dash, because nothing here lacks a writer; and nothing here prints a
 * PAID or a PENDING figure, because both of those do.
 */
/**
 * ── ⚠⚠ THE THREE VIEWS (`P2-A3-E619` WS-B) ──────────────────────────────
 *
 * ⚠ The mockup's own three: **My Groups · Discover · Requests.**
 * ⚠⚠ ONE ROUTE, A QUERY STRING — not three routes. All three show the same
 * person the same subject through a different window, and `?view=` keeps each
 * linkable and the back button honest. ⚠ The reasoning and the shape are
 * `/community/grow`'s, which settled this for its own tabs.
 * ⚠⚠⚠ AND IT KEEPS THE ROUTE RENAME A WS-C DECISION: three routes here would
 * have to be renamed three times.
 * ⚠ AN UNKNOWN VALUE FALLS BACK TO `my` rather than 404ing — a mistyped tab is
 * not a missing page.
 */
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

  /*
    ⚠⚠ EACH VIEW READS ONLY WHAT IT RENDERS. Discover scans every board and
    Requests joins two directions; running all three on every render would make
    two of them waste on every page load. ⚠ The header pair is shared, so
    `getGroupsHome` runs for all three — it is the one read the card needs.
  */
  const home = viewer ? await getGroupsHome(viewer) : null;
  const discover: DiscoverTrack[] =
    viewer && view === "discover" ? await getDiscoverGroups(viewer) : [];
  const requests =
    viewer && view === "requests"
      ? await getGroupRequests(viewer)
      : { incoming: [], mine: [] };

  /*
    ⚠⚠ READ ON EVERY VIEW, DELIBERATELY. A request waiting on you is the one
    thing you should not have to go looking for, so the count rides the tab
    wherever you are. ⚠ It is a COUNT of a state with a writer — `joinGroup`
    writes `PENDING` and `decideJoinRequest` clears it — so it is countable
    (`decisions_2026-09-23` §1), and it renders only above zero because a `0`
    badge on a tab is noise rather than information.
  */
  const pendingForMe =
    viewer && home
      ? view === "requests"
        ? requests.incoming.length
        : await countPendingForOwner(viewer)
      : 0;

  /*
    ⚠ Four cards, then a link — the mockup's own shape. A page that lists
    twenty rooms is the wall of empty rooms the old one was criticised for.
    ⚠⚠⚠ `Show All` EXPANDS THIS PAGE, IT DOES NOT NAVIGATE TO A NEW ONE. The
    first draft linked to `/community/groups/all`, **which does not exist** —
    and Scott runs 13 groups, so that link would have rendered for him and
    404'd. ⚠ `E579`: a control whose handler refuses is a door onto a wall, and
    a link to a route nobody built is the plainest form of it. ⚠⚠ A query
    string keeps the expanded view linkable and the back button honest — the
    same reasoning `/community/grow` used for its own tabs.
  */
  const showAll = sp.all === "1";
  const SHOWN = showAll ? Number.MAX_SAFE_INTEGER : 4;
  const run = home?.run ?? [];
  const joined = home?.joined ?? [];

  return (
    <>
      {/* ⚠⚠ `wrap` IS THE CONNECT SET'S, unchanged from `E612` Q16 — the row
          clipped at 390px without it. ⚠ `check:community` requires every
          Connect page to draw this row through `connectTabs`, and this page is
          named in that list. */}
      <PageTabs
        wrap
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/community/groups"
      />

      <div className="mx-auto max-w-5xl">
        <header className="mb-5">
          {/* ⚠ `E612` Q17 — the heading is `Groups`, matching the nav. */}
          <h1 className="font-display text-[26px] font-bold tracking-[-0.5px]">
            Groups
          </h1>
        </header>

        {/* ── 1 · THE HEADER PAIR — the same split card as Grow and Score ──
            ⚠ Picture left, the counted figures and the actions right. */}
        <section className="pm-hero pm-groups-hero">
          <div className="pm-hero-stage">
            <GroupCircles circles={home?.circles ?? []} />
          </div>

          <div className="pm-hero-side">
            <h2 className="pm-hero-title">Where Your Learners Ask</h2>

            {/* ⚠⚠⚠ THREE FIGURES, ALL COUNTED, ALL IN INK (`E433`). A measured
                zero renders as `0` — it is information, not an absence. */}
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

            {/* ⚠⚠ THE ONE LINE WORTH ACTING ON, AND IT IS DERIVED FROM THE
                FIGURES RATHER THAN CANNED. ⚠ At genuine zero it NAMES THE FIRST
                MOVE instead of reporting emptiness (`decisions_2026-09-23` §4),
                and the credit is a COUNT, never a compliment. */}
            <p className="pm-hero-move">{actionLine(home)}</p>

            <div className="pm-groups-actions">
              {/* ⚠⚠⚠ RENDERED ONLY WHEN THERE IS SOMEWHERE TO POST. `E579` — a
                  control whose handler refuses is a door onto a wall. Somebody
                  who runs no group has no room to start a question in, so the
                  button is absent rather than dead. */}
              {home?.starterSlug && (
                <Link
                  href={`/community/groups/${home.starterSlug}`}
                  className="pm-hero-cta"
                >
                  Post a Starter Question
                </Link>
              )}
              {/* ⚠ An anchor to the ONE form in the rail — not a second form. */}
              <Link href="#start-a-group" className="pm-groups-ghost">
                Start a Group
              </Link>
            </div>
          </div>
        </section>

        {/* ── 1b · THE THREE VIEWS — the mockup's own switcher ──────────────
            ⚠⚠ LINKS, NOT BUTTONS. Each view is a real URL, so it is
            shareable, bookmarkable and survives the back button — and a link
            needs no JavaScript to work. ⚠ `aria-current` is what tells a
            screen reader which one is showing; colour alone would not. */}
        <nav aria-label="Groups views" className="pm-groups-views">
          {VIEWS.map((v) => (
            <Link
              key={v.key}
              href={v.key === "my" ? "?" : `?view=${v.key}`}
              aria-current={v.key === view ? "page" : undefined}
              className={v.key === view ? "is-on" : undefined}
            >
              {v.label}
              {/* ⚠⚠⚠ THE COUNT RIDES THE TAB ONLY WHEN IT IS ABOVE ZERO AND
                  ONLY WHERE IT IS COUNTED. `pendingForMe` is read on every
                  view because a request waiting on you is the one thing you
                  should see without going looking for it. */}
              {v.key === "requests" && pendingForMe > 0 && (
                <span className="pm-groups-pill">{pendingForMe}</span>
              )}
            </Link>
          ))}
        </nav>

        {view === "my" && (
        <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-6">
            {/* ── 2 · NEEDS YOU ─────────────────────────────────────────────
                ⚠⚠ OLDEST FIRST. ⚠⚠⚠ MEASURED: `ForumThread` holds ZERO rows,
                so this is an EMPTY STATE for everybody today — and the brief is
                explicit that it says what will appear there with **no invented
                questions**. A seeded question would put words in a real
                member's mouth (`E564`). */}
            <section className="space-y-3">
              <h2 className="font-display text-[17px] font-bold">Needs You</h2>
              {home && home.needsYou.length > 0 ? (
                <div className="space-y-2">
                  {home.needsYou.map((t) => (
                    <Link
                      key={t.id}
                      href={`/community/groups/thread/${t.id}`}
                      className="block rounded-brand border border-line bg-white p-4 transition-colors hover:border-magenta"
                    >
                      <p className="text-[15px] font-bold">{t.title}</p>
                      <p className="mt-0.5 text-[13px] text-ink-2">
                        {t.boardTitle}
                      </p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="rounded-brand border border-line bg-white p-5 text-[14px] leading-relaxed text-ink-2">
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

            {/* ⚠ The joined list renders only when there is one — an empty
                second list beneath an empty first is two failures, not one. */}
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
            <div className="rounded-brand border border-line bg-white p-4">
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
            <div id="start-a-group" className="rounded-brand border border-line bg-white p-4">
              <h3 className="font-display text-[15px] font-bold">Start a Group</h3>
              <p className="mb-3 mt-1 text-[13px] leading-relaxed text-ink-2">
                A topic, a region, an alumni group — anyone can start one, and
                anyone can join it.
              </p>
              <StartGroup />
            </div>

            {/* ── 4c · PAID GROUPS ───────────────────────────────────────────
                ⚠⚠⚠ IT STATES A SETUP STATE AND OFFERS NO PURCHASE. MEASURED:
                **0 of 27 boards carry a price**, nothing writes `price_cents`,
                and no `Payment` row is created anywhere in the codebase. ⚠ A
                figure here would be a count of a state with no writer, and a
                "Join for $X" would promise a mechanism that does not exist —
                the rule that dashed Earnings at `E603`. */}
            <div className="rounded-brand border border-line bg-white p-4">
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

/**
 * ⚠⚠ THE ONE LINE, DERIVED FROM THE COUNTS. ⚠⚠⚠ NO FABRICATED ENCOURAGEMENT,
 * no promises and no absolutes (`decisions_2026-09-23` §4) — every branch below
 * states a COUNT or names a MOVE, and the order runs from the most urgent fact
 * to the emptiest.
 */
function actionLine(home: Awaited<ReturnType<typeof getGroupsHome>> | null): string {
  if (!home || home.runCount + home.joinedCount === 0) {
    /*
      ⚠⚠ IT NAMES `Discover` AGAIN — BECAUSE DISCOVER NOW EXISTS (WS-B).
      ⚠ WS-A shipped this as *"Starting one is the first move"* on purpose: at
      that point the line's first draft pointed at a surface with no route, and
      that was caught in a SCREENSHOT rather than by an assertion, because a
      sentence cannot 404. ⚠⚠⚠ `E579` IN PROSE — a door onto a wall is still a
      door onto a wall when it is a noun instead of a button.
      ⚠ SUPERSEDED, quoted not deleted (`E164`) — true only while WS-A stood
      alone, and restored the moment its destination was built:
      //   return "You're not in a group yet. Starting one is the first move.";
    */
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

/**
 * ⚠ Two across on desktop, one on a phone — the brief's grid, phone first.
 * ⚠⚠ `Show All N` appears only when there ARE more, and it names the REAL
 * remainder rather than a rounded word.
 */
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
        {/* ⚠⚠ THE SORT IS STATED WHERE IT APPLIES (`decisions_2026-09-23` §3 —
            a control says what it governs at the point it governs it). It is a
            LABEL, not a control: the order is fixed by the brief, and a picker
            that offered one option would be a control that governs nothing. */}
        {cards.length > 1 && (
          <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
            Quietest First
          </p>
        )}
      </div>

      {cards.length === 0 ? (
        <p className="rounded-brand border border-line bg-white p-5 text-[14px] leading-relaxed text-ink-2">
          {empty}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {cards.slice(0, shown).map((c) => (
              <Link
                key={c.slug}
                href={`/community/groups/${c.slug}`}
                className="pm-groups-card"
              >
                <p className="pm-groups-card-t">{c.title}</p>
                {/* ⚠⚠ EVERY PART OF THIS LINE IS COUNTED. `no posts yet` is the
                    ZERO branch in words — `E433`'s rule is that a figure is
                    ink, and "quiet" is the same fact without the accusation
                    (the wording `ForumRooms` established and Scott kept). */}
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

/**
 * ── ⚠⚠⚠ DISCOVER (`P2-A3-E619` WS-B 1) ─────────────────────────────────
 *
 * ⚠ THE BRIEF: *"groups you're not in, grouped by track, each with member count
 * and **Join**; a group you're already in says so and opens instead."*
 *
 * ⚠⚠⚠ THE JOIN CONTROL IS `GroupJoin` — THE ONE THAT ALREADY EXISTS. It knows
 * every offer kind, it posts to the one route, and it refuses to render a
 * control that cannot work. ⚠ A second Join button here would be a second
 * predicate, which is precisely the shape that shipped eight real rates to
 * signed-out visitors on `/explore` earlier the same day (`E618`).
 *
 * ⚠⚠ "ALREADY IN IT" NEVER REACHES THIS LIST — `getDiscoverGroups` filters
 * those out by membership OR ownership, so the `member` branch is unreachable
 * here by construction rather than by a check this component remembers.
 */
function Discover({ tracks }: { tracks: DiscoverTrack[] }) {
  if (tracks.length === 0) {
    return (
      <p className="mt-6 rounded-brand border border-line bg-white p-5 text-[14px] leading-relaxed text-ink-2">
        You&rsquo;re already in every group there is. Starting one is the way to
        make another.
      </p>
    );
  }
  return (
    <div className="mt-6 space-y-6">
      {tracks.map((t) => (
        <section key={t.track} className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[17px] font-bold">{t.track}</h2>
            {/* ⚠ `E433` — the count is a figure, so ink. */}
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-3">
              {t.groups.length} {t.groups.length === 1 ? "group" : "groups"}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {t.groups.map((g) => (
              <div key={g.slug} className="pm-groups-card pm-groups-card-static">
                <Link href={`/community/groups/${g.slug}`} className="pm-groups-card-t">
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
                  {/* ⚠⚠ `boardId`, not slug — the one join route is keyed on it.
                      ⚠ `canLeave` is false: nothing in Discover is a group you
                      are in, so a Leave control could never apply. */}
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

/**
 * ── ⚠⚠⚠ REQUESTS, BOTH DIRECTIONS (`P2-A3-E619` WS-B 3) ────────────────
 *
 * ⚠⚠⚠ THIS VIEW COULD NOT HAVE EXISTED BEFORE THIS BRANCH, AND THE REASON IS
 * WORTH KEEPING: every one of the 27 boards that existed was `OPEN`, nothing
 * wrote a board's `type`, and nothing could move a `PENDING` row. ⚠ So a
 * Requests screen built on today's trunk would have been **permanently empty —
 * not "nobody has asked yet", but "nothing can ask"**. `createGroup` accepting
 * `REQUEST` and `decideJoinRequest` answering one are what make this list a
 * real zero instead of an impossible one.
 *
 * ⚠⚠ "TOLD EITHER WAY" IS THE `Your Requests` HALF. Notifications about group
 * activity are out of scope by the brief's own list and belong to
 * `brief_notifications` — so the answer is delivered where the asker already
 * looks. ⚠ A DECLINE IS SHOWN, NOT HIDDEN: a decline they cannot see reads as
 * *"you never asked"*, and they ask again forever.
 */
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
          <p className="rounded-brand border border-line bg-white p-5 text-[14px] leading-relaxed text-ink-2">
            Nobody is waiting on you. When someone asks to join a group you run,
            they appear here, oldest first.
          </p>
        ) : (
          <div className="space-y-2">
            {incoming.map((r) => (
              /* ⚠ A named class, so a gate can address the ROW rather than
                 guessing at div nesting — the first version of the walk
                 located `div` by text and resolved to the innermost one,
                 which holds the name but NOT the buttons, and hung. */
              <div
                key={r.id}
                className="pm-groups-req flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-4"
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
          <p className="rounded-brand border border-line bg-white p-5 text-[14px] leading-relaxed text-ink-2">
            You haven&rsquo;t asked to join anything. Groups that need an owner&rsquo;s
            say-so show up here while you wait.
          </p>
        ) : (
          <div className="space-y-2">
            {mine.map((r) => (
              <div
                key={r.groupSlug}
                className="flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-4"
              >
                <div className="min-w-[180px] flex-1">
                  <Link
                    href={`/community/groups/${r.groupSlug}`}
                    className="text-[15px] font-bold hover:text-magenta"
                  >
                    {r.groupTitle}
                  </Link>
                  {/* ⚠⚠ THE STATE IN WORDS, NOT A COLOURED DOT. A decline that
                      only a colour communicates is not an answer. */}
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
