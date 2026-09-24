"use client";

import { useMemo } from "react";
import { RebuildBadge, useRebuild } from "@/components/motion/Rebuild";
import type { GroupCircle } from "@/lib/groups-home";

/**
 * ── ⚠⚠⚠ THE LIVE PICTURE — ONE CIRCLE PER GROUP (`P2-A3-E619` WS-A 1) ────
 *
 * ⚠ THE BRIEF: *"one circle per group, **sized by members**, dashed outline
 * while a group is quiet, solid once it has posts."*
 *
 * ── ⚠⚠⚠ THE REBUILD IS BORROWED, NEVER RE-IMPLEMENTED ───────────────────
 *
 * ⚠⚠ `E600` WS-D's `useRebuild` + `RebuildBadge` are the ONE clock, and
 * `CommunityWeb` already states why: **a second clock in a second component is
 * two countdowns disagreeing by a frame.** ⚠ This component calls the shared
 * hook and renders the shared badge; it owns no timer of its own.
 *
 * ⚠⚠⚠ AND THE BRIEF'S HARD RULE: **THE NUMBERS NEVER CHANGE ON A REBUILD.**
 * `cycle` is used ONLY as a React `key` to replay the draw-in animation. It is
 * not in any arithmetic below, and no figure is recomputed from it — a count
 * that moved every fifteen seconds under a reader would be the defect the
 * rebuild exists to avoid, not a feature.
 */

/* ⚠ Geometry only — no figure is derived from these. */
const MIN_R = 13;
const MAX_R = 34;

export function GroupCircles({ circles }: { circles: GroupCircle[] }) {
  const { cycle, secondsLeft } = useRebuild();

  /*
    ⚠⚠⚠ SIZED BY MEMBERS — AND MEASURED, EVERY GROUP HOLDS 0 TODAY.
    ⚠ `GroupMembership` holds ONE row in the whole table, so every circle sits
    at `MIN_R`. **That is the honest picture, not a broken one**: 20 equal
    circles say *"nobody has joined anything yet"*, which is true.
    ⚠⚠ THE SCALE IS GUARDED AGAINST ITS OWN DEGENERATE CASE: when every group
    has the same member count the denominator is zero, and a `0/0` would put
    every circle at `NaN` and render nothing at all. **A picture that silently
    disappears at the exact state the product is in today is worse than no
    picture** — so an equal field resolves to `MIN_R` explicitly.
  */
  const sized = useMemo(() => {
    const max = Math.max(...circles.map((c) => c.members), 0);
    const min = Math.min(...circles.map((c) => c.members), 0);
    const span = max - min;
    return circles.map((c) => ({
      ...c,
      r: span === 0 ? MIN_R : MIN_R + ((c.members - min) / span) * (MAX_R - MIN_R),
    }));
  }, [circles]);

  if (circles.length === 0) {
    /* ⚠⚠ NOTHING INVENTED AT ZERO. The empty branch says what will appear here
       rather than drawing a decorative field of circles that mean nothing. */
    return (
      <p className="pm-groups-pic-empty">
        Your groups will appear here — one circle each, sized by how many people
        are in them.
      </p>
    );
  }

  const quiet = sized.filter((c) => c.quiet).length;

  return (
    <div className="pm-groups-pic">
      {/* ⚠ `key={cycle}` REPLAYS THE DRAW. It is the only thing `cycle` does. */}
      <div key={cycle} className="pm-groups-field">
        {sized.map((c, i) => (
          <span
            key={c.slug}
            className={c.quiet ? "pm-groups-dot is-quiet" : "pm-groups-dot"}
            style={{
              width: `${c.r * 2}px`,
              height: `${c.r * 2}px`,
              /* ⚠ A stagger so the field draws in rather than snapping. It is
                 presentation, and it carries no meaning. */
              animationDelay: `${Math.min(i * 40, 800)}ms`,
            }}
            /* ⚠⚠ THE TITLE CARRIES THE COUNT, so the picture is readable to
               somebody who cannot judge area — and to a screen reader. */
            title={`${c.title} — ${c.members} ${c.members === 1 ? "member" : "members"}, ${
              c.posts === 0 ? "no posts yet" : `${c.posts} posted`
            }`}
          />
        ))}
      </div>

      {/* ⚠⚠ THE LEGEND IS COUNTED, NOT DESCRIBED. `E433` — figures in ink.
          ⚠⚠⚠ WHEN EVERY GROUP IS QUIET THE NUMBER IS NOT REPEATED. The first
          build rendered *"9 groups · 9 all quiet"* — caught in the 390px
          screenshot, not by an assertion, because every assertion about it was
          true. ⚠ `all` ALREADY CARRIES THE COUNT; printing it twice reads as
          two different facts that happen to share a number. */}
      <p className="pm-groups-legend">
        <span className="pm-groups-legend-n">{circles.length}</span>{" "}
        {circles.length === 1 ? "group" : "groups"}
        {quiet > 0 &&
          (quiet === circles.length ? (
            <> · all quiet</>
          ) : (
            <>
              {" · "}
              <span className="pm-groups-legend-n">{quiet}</span> quiet
            </>
          ))}
      </p>

      <RebuildBadge secondsLeft={secondsLeft} />
    </div>
  );
}
