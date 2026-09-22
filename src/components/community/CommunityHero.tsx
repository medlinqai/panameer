import Link from "next/link";
import { CommunityWeb } from "@/components/community/CommunityWeb";
import type { CommunityWeb as WebData } from "@/lib/community-web";
import type { CommunityHero as HeroData } from "@/lib/community-hero";

/**
 * ── ⚠⚠⚠ THE SPLIT CARD (`P2-A3-E601` WS-B item 1) ─────────────────────────
 *
 * ⚠ SCOTT, 2026-09-22: *"I really like this structure. Split-card at the top,
 * cleanly structured underneath."* — picture on the left, the story and counts
 * on the right, in ONE card.
 *
 * ⚠⚠ THE REBUILD IS NOT RE-IMPLEMENTED HERE. `CommunityWeb` already owns
 * `E600` WS-D's shared `useRebuild` + `RebuildBadge`, so the 15-second redraw
 * and its countdown come with the picture. ⚠⚠⚠ A SECOND CLOCK IN THIS COMPONENT
 * WOULD BE TWO COUNTDOWNS DISAGREEING BY A FRAME — the `teachesPathWhere`
 * mistake applied to time. ⚠ The two clocks that DO exist are deliberate and
 * are documented in `CommunityWeb`: a 15-second REDRAW and a 60-second DATA
 * refresh. **The numbers on this side do not move on either clock** — they are
 * server-rendered facts, and a score that changed under the reader four times a
 * minute would be the mockup's defect in a new form.
 *
 * ── ⚠⚠ THIS COMPONENT PRINTS NOTHING IT WAS NOT GIVEN ─────────────────────
 *
 * ⚠ No level, no XP, no "N to Level 4", no named activity unless one was
 * counted. ⚠⚠ Every branch below that could render a number instead renders a
 * sentence saying what will appear there (WS-B item 4). **No placeholder people
 * and no placeholder counts.**
 */
export function CommunityHero({ web, hero }: { web: WebData; hero: HeroData | null }) {
  return (
    <section className="pm-hero">
      {/* ⚠ THE PICTURE. It carries its own legend, its drawn-line and the
          rebuild countdown — all of it `E601` WS-A and `E600` WS-D. */}
      <div className="pm-hero-stage">
        <CommunityWeb initial={web} />
      </div>

      <div className="pm-hero-side">
        <h2 className="pm-hero-title">Grow Your Community</h2>
        <p className="pm-hero-lede">
          Every Oracle practitioner you bring in makes this a better place to buy
          and sell.
        </p>

        {hero && (
          <>
            {/* ⚠⚠ THE SCORE, AND ITS ARITHMETIC IS NOT RESTATED HERE — the Grow
                page owns the breakdown. ⚠ One number, one place it comes from. */}
            <div className="pm-hero-score">
              <span className="pm-hero-score-n">{hero.score.points}</span>
              <span className="pm-hero-score-k">
                points this month · {hero.daysLeft} days left
              </span>
            </div>

            {/* ⚠⚠⚠ THE RANK IS SHOWN ONLY WHEN THE BOARD IS (`E599` ruling 6).
                ⚠ `hero.rank` is ALREADY `null` unless the board is shown — the
                decision lives in `community-hero.ts` against the real board, not
                in this component against a count it re-derived. ⚠⚠ THE EMPTY
                BRANCH SAYS WHAT WILL APPEAR THERE, rather than rendering
                nothing and leaving a reader wondering if it failed. */}
            {hero.rank !== null ? (
              <p className="pm-hero-rank">
                Ranked <strong>#{hero.rank}</strong> this month
              </p>
            ) : (
              <p className="pm-hero-none">
                Ranking starts once three members have a score this month.
              </p>
            )}

            {/* ⚠⚠⚠ THE ACTIVITY LINE, AND NOTHING AT ALL WHEN THERE IS NONE.
                ⚠ MEASURED: zero accepted invites exist today, so this is the
                live state for everybody. ⚠⚠ IT NAMES A REAL PERSON FROM A REAL
                ACCEPTED INVITE OR IT DOES NOT RENDER — this is the line that
                said *"Raj Bhatt just joined from your invite"* in the mockup. */}
            {hero.latestJoin && (
              <p className="pm-hero-feed">
                <strong>{hero.latestJoin.name}</strong> joined from your invite.
              </p>
            )}
          </>
        )}

        {/* ⚠ Title Case on the button label (`E568` / rule 11). ⚠⚠ IT IS A
            FILLED BUTTON, as the approved mockup draws it — this is the one
            action the card exists to offer, and a text link beside a paragraph
            of text does not read as the thing to do. */}
        <Link href="/invite-colleague" className="pm-hero-cta">
          Invite a Colleague
        </Link>
      </div>
    </section>
  );
}
