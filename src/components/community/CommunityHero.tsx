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
      primary={{ label: "Join Panameer", href: "/connect/invite" }}
    />
  );
}

/** Connections hero (2026-10-08, Health-page layout): picture left 340px, level + numbers right, one bottom rule, no box. */
export function ConnectionsHero({ web, hero, standing, requests }: { web: WebData; hero: HeroData | null; standing: LevelStanding | null; invitations?: number; requests: number }) {
  const figures = webFigures(web);
  const rank = !hero ? null : hero.rank !== null ? (
    <><strong className="text-ink">#{hero.rank}</strong> of {hero.boardSize} {hero.boardSize === 1 ? "member" : "members"} with a score this month.{hero.move ? ` ${hero.move}` : ""}</>
  ) : hero.boardShown ? (
    <>You&rsquo;re not on this month&rsquo;s board yet. Invite a colleague to get on it.</>
  ) : (
    <>Ranking starts once {hero.minScorers} members have a score this month.</>
  );
  return (
    <section data-connections-hero className="grid items-center gap-x-14 gap-y-6 border-b border-line pb-8 pt-1.5 md:grid-cols-[460px_1fr]">
      <div className="mx-auto w-full max-w-[460px]">
        <CommunityWeb initial={web} />
      </div>
      <div>
        <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">{standing ? `LEVEL ${standing.level.number} · ${standing.level.name.toUpperCase()}` : "YOUR COMMUNITY"}</p>
        <h2 className="mb-4 mt-1.5 text-[30px] font-bold leading-tight">Grow Your Community</h2>
        <div className="flex flex-wrap gap-x-11 gap-y-3 border-b border-line pb-4">
          {[["Joined", figures.joined], ["Invited", figures.invited], ["Reachable", figures.reachable]].map(([label, value]) => (
            <div key={label as string}>
              <b className="block text-[26px] font-medium tabular-nums">{value}</b>
              <span className="text-[11px] font-semibold tracking-[0.08em] text-ink-2">{(label as string).toUpperCase()}</span>
            </div>
          ))}
        </div>
        {standing && (
          <>
            <p className="mb-1.5 mt-4 text-[13px]">
              <b>{standing.xp} XP</b>
              {standing.next && standing.toNext !== null ? <> · {standing.toNext} to Level {standing.next.number}</> : <> · top of the ladder</>}
            </p>
            {standing.next && standing.toNext !== null && (
              <span aria-hidden className="block h-[6px] w-full bg-bg-soft"><span className="block h-full bg-ink" style={{ width: `${standing.percent}%` }} /></span>
            )}
          </>
        )}
        <p className="mb-4 mt-2.5 text-[14px] text-ink-2">
          {rank}
          {hero?.latestJoin ? <> <strong className="text-ink">{hero.latestJoin.name}</strong> joined from your invitation.</> : null}
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/connect/invite" className="inline-flex min-h-[44px] items-center bg-ink px-5 text-[14px] font-bold text-surface hover:bg-ink-hover">Join Panameer</a>
          <a href="/connect/connections?chip=requests" className="inline-flex min-h-[44px] items-center border border-ink px-5 text-[14px] font-bold hover:bg-ink/5">Requests{requests > 0 ? ` (${requests})` : ""}</a>
        </div>
      </div>
    </section>
  );
}
