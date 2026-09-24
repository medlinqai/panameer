import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { getGroupsHome, type GroupCard } from "@/lib/groups-home";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { getSessionViewer } from "@/lib/session";
import { unreadCount } from "@/lib/messages";
import { GroupCircles } from "@/components/community/GroupCircles";
import { StartGroup } from "@/components/community/StartGroup";
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
export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string }>;
}) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  const unread = viewer ? await unreadCount(viewer) : 0;
  const home = viewer
    ? await getGroupsHome(viewer)
    : null;

  /*
    ⚠ Four cards, then a link — the mockup's own shape. A page that lists
    twenty rooms is the wall of empty rooms the old one was criticised for.
    ⚠⚠⚠ `Show All` EXPANDS THIS PAGE, IT DOES NOT NAVIGATE TO A NEW ONE. The
    first draft linked to `/community/forums/all`, **which does not exist** —
    and Scott runs 13 groups, so that link would have rendered for him and
    404'd. ⚠ `E579`: a control whose handler refuses is a door onto a wall, and
    a link to a route nobody built is the plainest form of it. ⚠⚠ A query
    string keeps the expanded view linkable and the back button honest — the
    same reasoning `/community/grow` used for its own tabs.
  */
  const showAll = (await searchParams).all === "1";
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
        current="/community/forums"
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
                  href={`/community/forums/${home.starterSlug}`}
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
                      href={`/community/forums/thread/${t.id}`}
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
                A topic, a region, an alumni room — anyone can start one, and
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
      ⚠⚠⚠ IT MUST NOT NAME `Discover`. The first build read *"Start one, or join
      one from Discover"* — and **Discover is WS-B and does not exist yet**, so
      the one line the empty state offers pointed at a surface with no route.
      ⚠ Caught in the desktop screenshot, not by an assertion: every assertion
      about this sentence was true, because a sentence cannot 404.
      ⚠⚠ `E579` in prose — a door onto a wall is still a door onto a wall when
      it is a noun instead of a button. **The line names the move that EXISTS.**
    */
    return "You're not in a group yet. Starting one is the first move.";
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
                href={`/community/forums/${c.slug}`}
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
