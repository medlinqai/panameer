import { CommunityWeb } from "@/components/community/CommunityWeb";
import { PatternHeader } from "@/components/casing/PatternHeader";
import type { CommunityWeb as WebData } from "@/lib/community-web";
import type { CommunityHero as HeroData } from "@/lib/community-hero";
import type { LevelStanding } from "@/lib/levels";

/**
 * ── ⚠⚠⚠ NOW A CALLER OF `PatternHeader`, NOT A SECOND COPY OF IT ────────
 *
 * ⚠ Brief 8, ruling 23: **build it once.** This component was one of THREE
 * hand-shaped versions of the same object; it is now the Community page's
 * CONFIGURATION of the one shared header, and it owns only what is
 * Community-specific: the web, the figures, and the sentence.
 *
 * ⚠⚠ **WHAT MOVED OUT:** the eyebrow, the headline, the figure grid, the move
 * line and the button now live in `PatternHeader`. ⚠⚠⚠ **WHAT STAYED:** every
 * RULE this component held is still here, and none of it moved into the shared
 * component, because none of it is shared —
 * · the rank is shown only when the board is (ruling 6), decided in
 *   `community-hero.ts` against the real board and never re-derived here;
 * · the `minScorers` threshold is the lib's and is not restated;
 * · the activity line renders a real accepted invite or nothing at all.
 *
 * ── ⚠⚠⚠ THE THREE FIGURES MOVED UP INTO THE HEADER. SCOTT, 2026-09-25. ──
 *
 * ⚠ Asked where `joined · invited · reachable` belonged — the web's legend, or
 * the header — Scott chose **the header**. ⚠⚠ **SO THEY ARE STATED ONCE.** They
 * are the same three counts the drawing already knew about; what changed is that
 * the card now says them in ink where the mockup says them, instead of leaving
 * them as a caption under a picture.
 *
 * ── ⚠⚠ XP AND LEVELS, BUILT ON SCOTT'S CALL (2026-09-25) ────────────────
 *
 * ⚠ The mockup's `LEVEL 3 · PRACTITIONER` is now the eyebrow and the XP line is
 * real. ⚠⚠⚠ **IT IS NOT A NEW MECHANISM:** `lib/levels.ts` derives both from
 * `growthScore(personId, "all")`, the same function and the same weights the
 * monthly figure uses — **one score, two windows, never two definitions.**
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — the card's whole right half:
 * //   <h2 className="pm-hero-title">Grow Your Community</h2>
 * //   <p className="pm-hero-lede">Every Oracle practitioner you bring in makes
 * //     this a better place to buy and sell.</p>
 * //   <div className="pm-hero-score"><span className="pm-hero-score-n">
 * //     {hero.score.points}</span><span className="pm-hero-score-k">
 * //     points this month · {hero.daysLeft} days left</span></div>
 * //   <Link href="/invite-colleague" className="pm-hero-cta">Invite a Colleague</Link>
 */
export function CommunityHero({
  web,
  hero,
  standing,
}: {
  web: WebData;
  hero: HeroData | null;
  /** ⚠ `null` only when the viewer has no Person row — same as `hero`. */
  standing: LevelStanding | null;
}) {
  /*
    ⚠⚠ THE RANK SENTENCE, PICKED HERE BECAUSE IT IS THIS PAGE'S, and unchanged
    in meaning from what this component rendered before. ⚠⚠⚠ `hero.rank` is
    ALREADY `null` unless the board is shown — ruling 6 is decided in the lib
    against the real board, and this component must not re-derive it.
  */
  const rankLine = !hero ? null : hero.rank !== null ? (
    <>
      <strong className="text-ink">#{hero.rank}</strong> of {hero.boardSize}{" "}
      {hero.boardSize === 1 ? "member" : "members"} with a score this month.
      {hero.move ? ` ${hero.move}` : ""}
    </>
  ) : hero.boardShown ? (
    <>You&rsquo;re not on this month&rsquo;s board yet. Invite a colleague to get on it.</>
  ) : (
    <>Ranking starts once {hero.minScorers} members have a score this month.</>
  );

  /*
    ⚠⚠⚠ THE EYEBROW IS THE LEVEL, AND IT DEGRADES HONESTLY. With no Person row
    there is no score, so there is no level — and the eyebrow falls back to
    naming the page rather than inventing `LEVEL 1`. ⚠ A level nobody has earned
    is a figure with no writer wearing a label.
  */
  const eyebrow = standing
    ? `LEVEL ${standing.level.number} · ${standing.level.name.toUpperCase()}`
    : "YOUR COMMUNITY";

  return (
    <PatternHeader
      eyebrow={eyebrow}
      headline="Grow Your Community"
      lede="Every Oracle practitioner you bring in makes this a better place to buy and sell."
      picture={<CommunityWeb initial={web} />}
      /*
        ⚠⚠ THREE, ALL COUNTED — a measured `0` renders `0`, in ink.
        ⚠⚠⚠ **DRAWN + OVERFLOW, NOT THE DRAWN COUNT.** The web caps how many
        nodes it paints, so `web.joined.length` is what fitted on the ring, not
        how many colleagues the member has. ⚠ Showing the drawn subset as the
        member's figure would UNDER-REPORT the exact people whose network is
        biggest — and it would disagree with the picture's own overflow line
        sitting directly beneath it.
        ⚠ Caught by reading the web's legend arithmetic (`nJ = drawnJ +
        overflow.joined`) rather than by the numbers looking wrong: with today's
        data the overflow is 0, so **both readings agree and the bug is
        invisible.** Two zeros agree.
      */
      figures={[
        { label: "Joined", value: web.joined.length + web.overflow.joined },
        { label: "Invited", value: web.invited.length + web.overflow.invited },
        { label: "Reachable", value: web.reachable.length + web.overflow.reachable },
      ]}
      move={
        <>
          {standing ? (
            <>
              {/* ⚠ The XP line, in the sentence slot rather than as a fourth
                  figure — the header takes three, and ruling 45(1) is that a
                  page shows what it has rather than padding to a shape. */}
              <strong className="text-ink">{standing.xp} XP</strong>
              {standing.next && standing.toNext !== null ? (
                <> · {standing.toNext} to Level {standing.next.number}</>
              ) : (
                <> · top of the ladder</>
              )}
              {". "}
            </>
          ) : null}
          {rankLine}
          {/* ⚠⚠ A REAL ACCEPTED INVITE OR NOTHING. Measured: zero accepted
              invites exist today, so nothing is the live state for everybody. */}
          {hero?.latestJoin ? (
            <>
              {" "}
              <strong className="text-ink">{hero.latestJoin.name}</strong> joined from your
              invite.
            </>
          ) : null}
        </>
      }
      /* ⚠⚠⚠ ONE BUTTON. Ruling 45(4): the second slot is absent unless a second
         action is genuinely real, and a link that repeats one already on the
         page is `E579` in a nicer coat. Inviting is the one action this card
         exists to offer. */
      primary={{ label: "Invite a Colleague", href: "/invite-colleague" }}
    />
  );
}
