import Link from "next/link";
import { Avatar } from "@/components/Avatar";
/* ⚠ The shared header (`E601` WS-C 1) and its data — the same component and
   the same rebuild as `/community`. */
import { CommunityHero } from "@/components/community/CommunityHero";
import { getCommunityHero } from "@/lib/community-hero";
import { getCommunityWeb } from "@/lib/community-web";
import "@/components/community/community-web.css";
import "@/components/community/community-page.css";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import {
  BOARD_MIN_SCORERS,
  GROWTH_WEIGHTS,
  growthBoard,
  growthScore,
  boardIsShown,
  movementFor,
  myNetwork,
  providerHrefs,
  type GrowthWindow,
} from "@/lib/growth-score";

/**
 * ── ⚠⚠⚠ GROW THE NETWORK — `/community/grow` (`P2-A3-E599` WS-A) ──────────
 *
 * ⚠ The brief: *"One page where anyone (provider, buyer, requester) sees what
 * they've done to grow the network, invites colleagues with a pre-written note,
 * and sees where they rank this month. **It needs colleagues, not
 * credentials.**"*
 *
 * ⚠⚠ SIGNED-IN ONLY, AND EVERY CLASS OF MEMBER. There is no provider gate here
 * on purpose — a buyer or a requester can invite colleagues too, and gating on
 * `canProvideServices` would have made the avatar menu's future `Grow the
 * Network` item a door that bounces half the members (`E594`'s shape).
 * ⚠ ACCESS: `route-access.ts` line 244, `{ prefix: "/community", requires:
 * "authenticated" }` — inherited by longest-prefix match, so no new rule was
 * added. Two rules for one tree is how they drift.
 *
 * ── ⚠⚠ THIS PAGE IS WHY `E598` LEFT TWO THINGS OUT ───────────────────────
 *
 * ⚠ `E598` WS-A omitted the avatar menu's `Grow Your Network` item and WS-C
 * omitted the profile's `Network` one-liner, both because **the page did not
 * exist and Scott ruled against linking nowhere.** ⚠⚠ WIRING THEM UP IS
 * **WS-C**, not this workstream — the page has to exist and be walked first.
 */
/**
 * ⚠⚠ THE TAB IS A QUERY STRING, NOT THREE ROUTES. All three show the same
 * person the same thing through a different window, so they are one page — and
 * `?tab=` keeps the board linkable and the back button honest.
 * ⚠ AN UNKNOWN VALUE FALLS BACK TO `month` rather than 404ing: a mistyped tab
 * is not a missing page.
 */
const TABS: { key: string; label: string; window: GrowthWindow }[] = [
  { key: "month", label: "This Month", window: "month" },
  { key: "all", label: "All Time", window: "all" },
  /*
    ⚠ NOT A WINDOW — it lists invitations, not scores. Its `window` is unused
    and set to `all` so the type stays honest.

    ── ⚠⚠⚠ `People I Brought In`, NOT `My Network` (`E601` WS-D) ─────────────
    ⚠ SCOTT, 2026-09-22: *"it says what the list is, and it keeps 'Network'
    retired."* ⚠⚠ The same ruling that renamed the page — **one word for people,
    and it is Community; 'Network' is not kept as a second name for the same
    thing.** ⚠ SUPERSEDED, quoted not deleted (`E164`):
    //   { key: "network", label: "My Network", window: "all" },

    ⚠⚠ THE URL KEY STAYS `network`, DELIBERATELY. Scott: *"a query key isn't
    copy people read."* ⚠⚠⚠ AND CHANGING IT WOULD BREAK EVERY `?tab=network`
    LINK ALREADY SHARED, to rename something nobody sees — the cost is real and
    the benefit is zero.
  */
  { key: "network", label: "People I Brought In", window: "all" },
];

export default async function GrowPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await guardPage("authenticated");
  const viewer = await getSessionViewer();
  if (!viewer) redirect("/login?callbackUrl=%2Fcommunity%2Fgrow");

  /*
    ⚠⚠ THE SCORE IS KEYED ON THE **PERSON**, NOT THE USER, AND `Viewer` DOES NOT
    CARRY ONE. `ColleagueInvite.inviter_person_id` is a `Person` id; `Viewer`
    holds `userId` and the capability flags and nothing else — measured, after
    `viewer.personId` failed to typecheck.
    ⚠⚠⚠ A SIGNED-IN USER CAN HAVE NO PERSON AT ALL (`P1-ALL-E002`), which is why
    this is a lookup with a redirect rather than an assertion. That case goes to
    `/community` rather than rendering a score card of zeroes about nobody.
  */
  const person = await prisma.person.findFirst({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) redirect("/community");
  const personId = person.id;

  const { tab: rawTab } = await searchParams;
  const tab = TABS.find((t) => t.key === rawTab) ?? TABS[0];

  const unread = await unreadCount(viewer);
  /* ⚠ The SCORE CARD is always THIS MONTH — it is "what you have done this
     month", and it does not follow the board's tab. The rank line below it
     does, because that is what the tab is about. */
  const [me, board, network, web, hero] = await Promise.all([
    growthScore(personId, "month"),
    growthBoard(tab.window),
    tab.key === "network" ? myNetwork(personId) : Promise.resolve([]),
    /* ⚠⚠ THE HERO'S OWN DATA, fetched the same way `/community` fetches it, so
       the two pages cannot drift: both call `getCommunityHero`, which is the
       single place the score, the rank and the board threshold are decided. */
    getCommunityWeb(viewer),
    getCommunityHero(viewer),
  ]);
  /* ⚠⚠ `myRank`, `move`, `BOARD_MIN_SCORERS` and `daysLeftInMonth` MOVED INTO
     THE HERO WITH THE CARD THAT USED THEM (`E601` WS-C). ⚠ They are removed
     here rather than left behind: an unused import is a lint warning, and the
     baseline's rule is ZERO NEW — this is exactly how four appeared.
     ⚠ SUPERSEDED, quoted not deleted (`E164`):
     //   ⚠⚠ RULING 6 APPLIES TO THE RANK, NOT ONLY TO THE BOARD (Scott, at the
     //   WS-C gate). `rankFor` returns `null` while the board is hidden, so the
     //   line below shows points without a standing earned against nobody.
     //   const myRank = rankFor(board, personId);
     //   const move = nextMove(board, me);
     ⚠⚠ THE RULE ITSELF IS UNCHANGED AND STILL ENFORCED — it now lives in
     `getCommunityHero`, which is why both pages obey it with one decision. */
  /*
    ⚠⚠ MOVEMENT ONLY ON `This Month`. Comparing an ALL-TIME board to last month
    is a comparison of two different questions, and it would draw an arrow that
    means nothing.
  */
  const movement = tab.key === "month" ? await movementFor(board) : null;
  const hrefs = await providerHrefs(board.map((r) => r.personId));

  /*
    ⚠⚠⚠ FEWER THAN THREE SCORERS MEANS NO BOARD (ruling 6). Scott: *"If the
    board has fewer than three people with a score, don't show a board; show
    your own score and the invite panel."*
    ⚠ MEASURED AT THE PREMISE CHECK AND THIS IS THE LIVE CASE TODAY:
    `colleague_invites` holds 7 rows with **1** inviter recorded and **0**
    accepted, so the board is empty for everybody. ⚠⚠ THE PAGE SHIPS HONEST
    RATHER THAN SEEDED — the board appears the day three people have earned a
    place on it.
  */
  /* ⚠ ONE RULE, from the lib — the page never restates the threshold. */
  const showBoard = boardIsShown(board);

  return (
    <>
      <PageTabs
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/community"
      />
      <div className="mx-auto w-full max-w-3xl">
        {/*
          ── ⚠⚠⚠ `Grow Your Community`, NOT `Grow the Network` (`E601` WS-C) ──

          ⚠ SCOTT, 2026-09-22: *"'Grow Your Community' wins. 'Network' is
          retired, not kept as a second name for the same thing."*
          ⚠⚠⚠ THIS IS A RULING AGAINST A RULING, NOT DRIFT (rule 13). `E599`
          shipped this heading as `Grow the Network` deliberately, AFTER the
          9/20 mockup had already argued the other way — the mockup's note
          reads *"the card is Grow Your Community, not 'Network' — 'Network' is
          retired rather than kept as a second name for the same thing."*
          ⚠ So the code did not wander off a decision; a decision was remade,
          and the newest dated statement from Scott is the live one.
          ⚠ SUPERSEDED, quoted not deleted (`E164`) — what `E599` shipped:
          //   <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-0.5px]">
          //     Grow the Network
          //   </h1>
          ⚠⚠ THE HEADING NOW MATCHES THE HERO CARD BELOW IT, which is the whole
          point: two names for one thing on one screen is what was wrong.
        */}
        <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-0.5px]">
          Grow Your Community
        </h1>
        {/*
          ── ⚠⚠⚠ THE SHARED HEADER (`P2-A3-E601` WS-C item 1) ────────────────

          ⚠ SCOTT: *"`/community/grow` uses the same header component and the
          same 15-second rebuild."* ⚠⚠ `CommunityHero` IS THAT COMPONENT, and
          the rebuild comes with it — `CommunityWeb` owns `E600` WS-D's
          `useRebuild` + `RebuildBadge`, so neither page re-implements a clock.

          ⚠⚠⚠ ADDING IT MADE FOUR THINGS DUPLICATES ON THIS PAGE, and they are
          removed rather than left to disagree: this lede (the hero says it,
          days-left included), the score card's HEADLINE NUMBER, the whole
          `Your Rank This Month` card, and the score-card title.
          ⚠ WHAT STAYED IS WHAT THE HERO DOES NOT SAY: the ARITHMETIC (each
          count × its weight), the invite panel's explanation of the weights,
          and the board itself.
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   <p className="mb-5 text-[13.5px] text-ink-2">
          //     Every Oracle practitioner you bring in makes this a better place to buy
          //     and sell. Resets on the 1st &middot; {daysLeftInMonth()}{" "}
          //     {daysLeftInMonth() === 1 ? "day" : "days"} left this month.
          //   </p>
        */}
        <div className="mb-5">
          <CommunityHero web={web} hero={hero} />
        </div>

        {/* ── your score ─────────────────────────────────────────────── */}
        <section className="rounded-brand border border-line bg-white px-[18px] py-4">
          {/* ⚠⚠ THE TOTAL MOVED TO THE HERO (`E601` WS-C). This card is now the
              ARITHMETIC — how the number is reached — and printing the total
              twice on one page is how two figures start to disagree.
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   <div className="flex items-baseline justify-between gap-3">
              //     <h2 className="font-display text-[15px] font-bold">Your Score</h2>
              //     <span className="text-[26px] font-extrabold tabular-nums">{me.points}</span>
              //   </div> */}
          <h2 className="font-display text-[15px] font-bold">How Your Score Adds Up</h2>

          <div className="mt-3 flex flex-col border-t border-line pt-1">
            {/*
              ⚠⚠ EACH COUNT CARRIES ITS OWN POINTS LINE, so the total is
              legible as arithmetic rather than asserted. ⚠ The weights come
              from `GROWTH_WEIGHTS` — the page never restates a number.
            */}
            <ScoreRow
              label="Invited"
              count={me.invited}
              each={GROWTH_WEIGHTS.INVITED}
            />
            <ScoreRow label="Joined" count={me.joined} each={GROWTH_WEIGHTS.JOINED} />
            {/*
              ── ⚠⚠⚠ `Active` SAYS WHAT IT IS, WHICH IS "NOT MEASURABLE YET" ──

              ⚠ SCOTT, 2026-09-22: *"Ship Invited + Joined only, report Active
              as unbuildable."*
              ⚠⚠ IT IS RENDERED RATHER THAN HIDDEN because the weight is real
              and the rule is decided — hiding the row would make the total look
              like the whole story. ⚠⚠⚠ AND IT PRINTS A DASH, NOT A ZERO: `0`
              would say *"you have brought in nobody who became active"*, which
              is a claim about this member. The truth is that nothing counts it.
              ⚠ The three proposed signals and why each fails are recorded on
              `GROWTH_WEIGHTS.ACTIVE_BONUS`.
            */}
            {/* ⚠ IT STACKS, IT DOES NOT SIT BESIDE THE LABEL. Measured at 390px:
                as a right-aligned `flex-none` sibling the note ran to the card
                edge and clipped mid-sentence. The other two rows are a label
                and a short figure; this one is a label and a SENTENCE, so it
                gets its own line rather than competing for the same one. */}
            <div className="py-2 text-[13.5px]">
              <span className="text-ink-2">Became Active</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-3">
                Not measured yet &middot; {GROWTH_WEIGHTS.ACTIVE_BONUS} points each
                once it is
              </span>
            </div>
          </div>
        </section>

        {/*
          ── ⚠⚠⚠ `Your Rank This Month` IS GONE — THE HERO SAYS ALL OF IT ────

          ⚠ Its three rank states moved into `CommunityHero` unchanged, which is
          what makes the hero shareable between Community and Grow rather than a
          Community-only card: `#N of M`, *"you're not on the board yet"* and
          *"ranking starts once N members…"* are the same three sentences, now
          rendered once. ⚠⚠ The next move moved with them, still computed from
          the board and never canned.
          ⚠⚠⚠ THE DISTINCTION THIS PAGE INVENTED IS THE PART THAT HAD TO SURVIVE:
          *no board* and *a board you are not on* are DIFFERENT, and collapsing
          them would make one of the two sentences a lie.
          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the card this page drew:
          ⚠⚠ RULE 12, TENTH OCCURRENCE: the quoted body carries its own JSX
          comments, and their `* /` terminators would CLOSE THIS COMMENT EARLY.
          JSX children admit no `//` line comments, so every terminator below is
          written `* /` on purpose. ⚠ It is a quote, not code.
          //         {/* ── rank and the one move ──────────────────────────────────── * /}
          //         <section className="mt-3.5 rounded-brand border border-line bg-white px-[18px] py-4">
          //           <h2 className="font-display text-[15px] font-bold">Your Rank This Month</h2>
          //           {myRank != null ? (
          //             <p className="mt-1.5 text-[13.5px]">
          //               <span className="text-[22px] font-extrabold tabular-nums">#{myRank}</span>
          //               <span className="ml-2 text-ink-2">
          //                 of {board.length} {board.length === 1 ? "member" : "members"} with a
          //                 score this month
          //               </span>
          //             </p>
          //           ) : boardIsShown(board) ? (
          //             /* ⚠ NOT RANKED IS NOT RANK ZERO. Somebody with no points has not
          //                come last; they are not on the board at all, and saying so is
          //                what makes the invite panel the obvious next thing. * /
          //             <p className="mt-1.5 text-[13.5px] text-ink-2">
          //               You&rsquo;re not on this month&rsquo;s board yet. Invite a colleague to
          //               get on it.
          //             </p>
          //           ) : (
          //             /* ⚠⚠⚠ THE BOARD IS HIDDEN, SO THERE IS NO RANK TO REPORT. Saying
          //                *"you're not on the board"* would be wrong — there is no board —
          //                and `#1` would be a standing earned against nobody. * /
          //             <p className="mt-1.5 text-[13.5px] text-ink-2">
          //               Ranking starts once {BOARD_MIN_SCORERS} members have a score this
          //               month.
          //             </p>
          //           )}
          //           {/* ⚠⚠ COMPUTED FROM THE BOARD, NEVER CANNED (WS-A 1). * /}
          //           {move && <p className="mt-2 text-[13.5px] font-semibold">{move.text}</p>}
          //         </section>
        */}
        {/* ── invite ─────────────────────────────────────────────────── */}
        <section className="mt-3.5 rounded-brand border border-line bg-white px-[18px] py-4">
          <h2 className="font-display text-[15px] font-bold">Invite Someone</h2>
          <p className="mt-1 text-[13.5px] text-ink-2">
            A colleague who joins is worth {GROWTH_WEIGHTS.JOINED} points. Sending
            an invitation is worth {GROWTH_WEIGHTS.INVITED}.
          </p>
          {/*
            ⚠⚠⚠ IT LINKS TO THE EXISTING INVITE PATH. `/invite-colleague` is the
            surface `lib/colleague-invite.ts` already serves, and the brief is
            explicit: *"Sending uses the existing invite path from premise 1.
            ⚠ No second invite system."*
            ⚠ THE PRE-WRITTEN NOTE AND THE PANEL ARE **WS-C**, not this
            workstream. This is a door to what exists, not a stub of what is
            coming.
          */}
          {/*
            ── ⚠⚠⚠ THE BUTTON IS GONE. ONE `Invite a Colleague` PER PAGE ──────

            ⚠ SCOTT, 2026-09-22: *"The Invite panel keeps its explanation of the
            weights and loses its button. One Invite a Colleague on the page, in
            the hero."*
            ⚠⚠ THIS PANEL EARNS ITS PLACE ON THE EXPLANATION, NOT ON THE ACTION —
            it is the only thing that says what an invitation is WORTH, and the
            hero's button is a few hundred pixels above it.
            ⚠ SUPERSEDED, quoted not deleted (`E164`):
            //   <Link
            //     href="/invite-colleague"
            //     className="mt-3 inline-block rounded-full bg-magenta px-4 py-2 …"
            //   >
            //     Invite a Colleague
            //   </Link>
          */}
        </section>

        {/* ── the board ──────────────────────────────────────────────── */}
        {/*
          ── ⚠⚠ THE THREE TABS (WS-B 1) ──────────────────────────────────────

          ⚠ Plain links, not buttons: each is a real URL, so a board is
          shareable, opens in a new tab on middle-click and is announced as a
          link. ⚠⚠ THE SAME REASONING THE COMPLETION-RING CARD RECORDS — *"a div
          with a handler does none of those and looks identical until somebody
          needs one of them."*
          ⚠⚠⚠ THIS IS NOT A `PageTabs` ROW. That component is the APPLICATION's
          tab row (`CONNECT · Community · Groups · …`), already rendered above;
          a second one would say this page is a second application.
        */}
        <nav aria-label="Leaderboard" className="mt-5 flex gap-1.5 border-b border-line">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "month" ? "/community/grow" : `/community/grow?tab=${t.key}`}
              aria-current={t.key === tab.key ? "page" : undefined}
              className={
                "-mb-px border-b-2 px-3 py-2 text-[13.5px] font-bold transition-colors " +
                (t.key === tab.key
                  ? "border-magenta text-magenta"
                  : "border-transparent text-ink-2 hover:text-ink")
              }
            >
              {t.label}
            </Link>
          ))}
        </nav>

        {tab.key === "network" ? (
          /*
            ── ⚠⚠ MY NETWORK — INVITATIONS, NOT SCORES ──────────────────────

            ⚠ Scott: *"list the people you brought in, with whether each has
            joined… Show what exists."*
            ⚠⚠⚠ IT NAMES AN EMAIL, NOT A PERSON, AND CANNOT LINK TO A PROFILE.
            `colleague_invites` carries `invitee_email` and an optional name;
            **nothing links an accepted invite to the account it created.** That
            is `WS-C` item 6. Until it lands, "Joined" here means *"this
            invitation was accepted"* — the honest claim the data supports.
          */
          <section className="mt-3.5">
            {network.length === 0 ? (
              <p className="text-[13px] text-ink-3">
                You haven&rsquo;t invited anyone yet. Everyone you invite appears
                here, whether or not they join.
              </p>
            ) : (
              <ul className="flex flex-col rounded-brand border border-line bg-white px-[18px]">
                {network.map((n) => (
                  <li
                    key={n.id}
                    className="flex items-center justify-between gap-2.5 border-t border-line py-2.5 text-[13.5px] first:border-t-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">
                        {n.name ?? n.email}
                      </span>
                      {n.name && (
                        <span className="block truncate text-[12px] text-ink-3">
                          {n.email}
                        </span>
                      )}
                    </span>
                    {/* ⚠ Green for joined, ink for pending — never red. A
                        colleague who has not joined yet is a to-do, not a
                        failure. */}
                    <span
                      className={
                        "flex-none text-[12.5px] font-bold " +
                        (n.joinedAt ? "text-emerald-600" : "text-ink-3")
                      }
                    >
                      {n.joinedAt ? "Joined" : "Invited"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : showBoard ? (
          <section className="mt-3.5 rounded-brand border border-line bg-white px-[18px] py-1">
            <ol className="flex flex-col">
              {board.map((r) => {
                const href = hrefs.get(r.personId);
                const mv = movement?.get(r.personId);
                return (
                  <li
                    key={r.personId}
                    className={
                      "flex items-center justify-between gap-2.5 border-t border-line py-2.5 text-[13.5px] first:border-t-0 " +
                      /* ⚠⚠ YOUR ROW IS ALWAYS VISIBLE AND HIGHLIGHTED (WS-B 3).
                         Every scorer is rendered today, so "always visible"
                         costs nothing yet — it becomes a slice-plus-your-row
                         when the board is long enough to need one. */
                      (r.personId === personId ? "bg-magenta/[0.04] font-bold" : "")
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="w-7 flex-none tabular-nums text-ink-3">
                        #{r.rank}
                      </span>
                      <Avatar
                        firstName={r.name.split(" ")[0] ?? ""}
                        lastName={r.name.split(" ").slice(1).join(" ")}
                        photoUrl={r.photoUrl}
                        size={28}
                      />
                      <span className="min-w-0">
                        {/* ⚠ A LINK ONLY WHERE THERE IS SOMEWHERE TO GO. A ranked
                            buyer has no provider page, and a link to nowhere is
                            `E579`'s defect. */}
                        {href ? (
                          <Link href={href} className="block truncate hover:underline">
                            {r.name}
                          </Link>
                        ) : (
                          <span className="block truncate">{r.name}</span>
                        )}
                        <span className="block truncate text-[12px] text-ink-3">
                          {r.invited} invited &middot; {r.joined} joined
                        </span>
                      </span>
                    </span>
                    <span className="flex flex-none items-center gap-2.5">
                      {/*
                        ⚠⚠⚠ MOVEMENT: `null` IS `NEW`, NOT A DASH. Somebody who
                        was not on last month's board has not held station.
                        ⚠ A dash means "same rank as last month", which is a
                        different statement and a real one.
                      */}
                      {movement && (
                        <span
                          className={
                            "w-10 text-right text-[12px] font-bold tabular-nums " +
                            (mv?.delta == null
                              ? "text-ink-3"
                              : mv.delta > 0
                                ? "text-emerald-600"
                                : mv.delta < 0
                                  ? "text-ink-2"
                                  : "text-ink-3")
                          }
                          aria-label={
                            mv?.delta == null
                              ? "New this month"
                              : mv.delta === 0
                                ? "No change since last month"
                                : `${Math.abs(mv.delta)} ${mv.delta > 0 ? "up" : "down"} since last month`
                          }
                        >
                          {mv?.delta == null
                            ? "NEW"
                            : mv.delta === 0
                              ? "—"
                              : `${mv.delta > 0 ? "\u25b2" : "\u25bc"}${Math.abs(mv.delta)}`}
                        </span>
                      )}
                      <span className="w-10 text-right tabular-nums">{r.points}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : (
          <p className="mt-3.5 text-[13px] text-ink-3">
            {/*
              ⚠ RULING 6, SAID OUT LOUD RATHER THAN RENDERED AS AN EMPTY BOX.
              ⚠⚠⚠ AND IT IS ABOUT **THE BOARD**, NOT ABOUT YOUR RANK. The hero
              above says *"Ranking starts once N members have a score"* — that
              is a sentence about the reader's standing. This one is about
              whether the LIST exists. ⚠ Scott, 2026-09-22: *"Keep both"*, but
              reworded so it does not echo.
              ⚠ SUPERSEDED, quoted not deleted (`E164`):
              //   No board yet — it appears once three members have a score
              //   {tab.key === "month" ? " this month" : ""}.
              ⚠ The threshold is still the lib's, never a literal.
            */}
            The board appears once {BOARD_MIN_SCORERS} members have a score
            {tab.key === "month" ? " this month" : ""}.
          </p>
        )}
      </div>
    </>
  );
}

/**
 * ⚠ One counted row and its arithmetic. ⚠⚠ THE POINTS LINE IS DERIVED FROM THE
 * COUNT AND THE WEIGHT, never passed in separately — two numbers that must
 * agree, computed once.
 */
function ScoreRow({ label, count, each }: { label: string; count: number; each: number }) {
  return (
    <div className="flex items-center justify-between gap-2.5 py-2 text-[13.5px]">
      <span className="text-ink-2">{label}</span>
      <span className="flex-none tabular-nums">
        <span className="text-ink-3">
          {count} &times; {each} ={" "}
        </span>
        <b>{count * each}</b>
      </span>
    </div>
  );
}
