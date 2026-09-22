import Link from "next/link";
import { redirect } from "next/navigation";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getSessionViewer } from "@/lib/session";
import { PageTabs } from "@/components/casing/PageTabs";
import { tabSequenceFor } from "@/lib/nav";
import { connectTabs } from "@/lib/connect-tabs";
import { unreadCount } from "@/lib/messages";
import {
  GROWTH_WEIGHTS,
  daysLeftInMonth,
  growthBoard,
  growthScore,
  nextMove,
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
export default async function GrowPage() {
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

  const unread = await unreadCount(viewer);
  const [me, board] = await Promise.all([
    growthScore(personId, "month"),
    growthBoard("month"),
  ]);
  const myRow = board.find((r) => r.personId === personId) ?? null;
  const move = nextMove(board, me);

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
  const showBoard = board.length >= 3;

  return (
    <>
      <PageTabs
        eyebrow="CONNECT"
        sequence={tabSequenceFor("/connect")}
        tabs={connectTabs(viewer, unread)}
        current="/community"
      />
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-1 font-display text-[26px] font-bold tracking-[-0.5px]">
          Grow the Network
        </h1>
        <p className="mb-5 text-[13.5px] text-ink-2">
          Every Oracle practitioner you bring in makes this a better place to buy
          and sell. Resets on the 1st &middot; {daysLeftInMonth()}{" "}
          {daysLeftInMonth() === 1 ? "day" : "days"} left this month.
        </p>

        {/* ── your score ─────────────────────────────────────────────── */}
        <section className="rounded-brand border border-line bg-white px-[18px] py-4">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[15px] font-bold">Your Score</h2>
            {/* ⚠ `E433` — a figure is INK, never magenta. */}
            <span className="text-[26px] font-extrabold tabular-nums">{me.points}</span>
          </div>

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

        {/* ── rank and the one move ──────────────────────────────────── */}
        <section className="mt-3.5 rounded-brand border border-line bg-white px-[18px] py-4">
          <h2 className="font-display text-[15px] font-bold">Your Rank This Month</h2>
          {myRow ? (
            <p className="mt-1.5 text-[13.5px]">
              <span className="text-[22px] font-extrabold tabular-nums">#{myRow.rank}</span>
              <span className="ml-2 text-ink-2">
                of {board.length} {board.length === 1 ? "member" : "members"} with a
                score this month
              </span>
            </p>
          ) : (
            /* ⚠ NOT RANKED IS NOT RANK ZERO. Somebody with no points has not
               come last; they are not on the board at all, and saying so is
               what makes the invite panel the obvious next thing. */
            <p className="mt-1.5 text-[13.5px] text-ink-2">
              You&rsquo;re not on this month&rsquo;s board yet. Invite a colleague to
              get on it.
            </p>
          )}
          {/* ⚠⚠ COMPUTED FROM THE BOARD, NEVER CANNED (WS-A 1). */}
          {move && <p className="mt-2 text-[13.5px] font-semibold">{move.text}</p>}
        </section>

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
          <Link
            href="/invite-colleague"
            className="mt-3 inline-block rounded-full bg-magenta px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Invite a Colleague
          </Link>
        </section>

        {/* ── the board ──────────────────────────────────────────────── */}
        {showBoard ? (
          /*
            ⚠⚠ THE FULL BOARD, ITS TABS AND THE MOVEMENT COLUMN ARE **WS-B**.
            What renders here is the ordered rows for THIS MONTH, from the same
            `growthBoard` WS-B will tab over — so WS-B adds tabs to a list that
            is already proven, rather than introducing the list and the tabs at
            once.
          */
          <section className="mt-3.5 rounded-brand border border-line bg-white px-[18px] py-4">
            <h2 className="mb-2 font-display text-[15px] font-bold">This Month</h2>
            <ol className="flex flex-col">
              {board.map((r) => (
                <li
                  key={r.personId}
                  className={
                    "flex items-center justify-between gap-2.5 border-t border-line py-2 text-[13.5px] first:border-t-0 " +
                    /* ⚠ YOUR ROW IS ALWAYS VISIBLE AND HIGHLIGHTED (WS-B 3),
                       built here because the rule costs one class. */
                    (r.personId === personId ? "font-bold" : "")
                  }
                >
                  <span className="min-w-0 truncate">
                    <span className="mr-2 tabular-nums text-ink-3">#{r.rank}</span>
                    {r.name}
                  </span>
                  <span className="flex-none tabular-nums">{r.points}</span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <p className="mt-3.5 text-[13px] text-ink-3">
            {/* ⚠ RULING 6, SAID OUT LOUD RATHER THAN RENDERED AS AN EMPTY BOX. */}
            No board yet — it appears once three members have a score this month.
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
