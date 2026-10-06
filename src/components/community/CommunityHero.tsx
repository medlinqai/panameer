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

  // THE EYEBROW IS THE LEVEL, AND IT DEGRADES HONESTLY. With no Person row
  // THE ARITHMETIC IS THE LIB'S, so a fixture can drive it past zero —
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
      // THREE, ALL COUNTED — a measured `0` renders `0`, in ink.
      figures={[
        { label: "Joined", value: figures.joined },
        { label: "Invited", value: figures.invited },
        { label: "Reachable", value: figures.reachable },
      ]}
      move={
        <>
          {standing ? (
            <>
              {/* The XP line, in the sentence slot rather than as a fourth */}
              <strong className="text-ink">{standing.xp} XP</strong>
              {standing.next && standing.toNext !== null ? (
                <> · {standing.toNext} to Level {standing.next.number}</>
              ) : (
                <> · top of the ladder</>
              )}
              {". "}
              {/* THE XP BAR — A COMPUTED VALUE THAT HAD NO READER */}
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
          {/* A REAL ACCEPTED INVITE OR NOTHING. Measured: zero accepted */}
          {hero?.latestJoin ? (
            <>
              {" "}
              <strong className="text-ink">{hero.latestJoin.name}</strong> joined from your
              invite.
            </>
          ) : null}
        </>
      }
      // ONE BUTTON. Ruling 45(4): the second slot is absent unless a second
      primary={{ label: "Invite a Colleague", href: "/invite-colleague" }}
    />
  );
}
