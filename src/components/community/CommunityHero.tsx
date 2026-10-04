import { CommunityWeb } from "@/components/community/CommunityWeb";
import { PatternHeader } from "@/components/casing/PatternHeader";
import { webFigures, type CommunityWeb as WebData } from "@/lib/community-web";
import type { CommunityHero as HeroData } from "@/lib/community-hero";
import type { LevelStanding } from "@/lib/levels";

export function CommunityHero({
  web,
  hero,
  standing,
}: {
  web: WebData;
  hero: HeroData | null;
  standing: LevelStanding | null;
}) {
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
  /* ⚠⚠ THE ARITHMETIC IS THE LIB'S, so a fixture can drive it past zero —
     see `webFigures`. ⚠ Inline here, it could not be asserted (`E607`). */
  const figures = webFigures(web);

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
        { label: "Joined", value: figures.joined },
        { label: "Invited", value: figures.invited },
        { label: "Reachable", value: figures.reachable },
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
              {/*
                ── ⚠⚠⚠ THE XP BAR — A COMPUTED VALUE THAT HAD NO READER ──────

                ⚠⚠ **`LevelStanding.percent` IS COMPUTED ON EVERY RENDER AND
                WAS READ BY NOTHING.** Its own comment in `lib/levels.ts:80`
                says it is *"0–100 THROUGH THE CURRENT LEVEL, **for the bar**"*
                — **and the bar was never built** (`P2-A3-E678`). The mockup's
                `xptrack` is the one visual that makes a level legible: `340 XP`
                and `360 to Level 4` are two numbers, and the bar is what turns
                them into a position.
                ⚠ `levels.ts:90` already guards the arithmetic — *"a `percent`
                of `-4` would render as a bar pointing backwards"* — so the
                value is safe to render as a width without further clamping.

                ⚠⚠ **IT IS A PICTURE OF A FIGURE, SO IT OBEYS THE COUNTING
                RULES:** it renders ONLY when `next` exists. At the top of the
                ladder `percent` is 100 and a full bar would read as *"complete"*
                rather than *"nothing further to reach"* — two different
                meanings that must not look identical (counting rule 2, which
                says the same rule applies to pictures).
                ⚠ `aria-hidden` because the two numbers beside it already state
                the position in words; announcing it twice is noise, and ruling
                65 is about a label the UI does NOT carry — here it does.
              */}
              {standing.next && standing.toNext !== null ? (
                <span
                  aria-hidden
                  className="mt-2 mb-1 block h-[6px] w-full overflow-hidden rounded-full bg-ink/10"
                >
                  <span
                    className="block h-full rounded-full bg-magenta"
                    style={{ width: `${standing.percent}%` }}
                  />
                </span>
              ) : null}
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
