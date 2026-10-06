"use client";

import { useMemo } from "react";
import { RebuildBadge, useRebuild } from "@/components/motion/Rebuild";
import type { GroupCircle } from "@/lib/groups-home";

const MIN_R = 13;
const MAX_R = 34;

export function GroupCircles({ circles }: { circles: GroupCircle[] }) {
  const { cycle, secondsLeft } = useRebuild();

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
      {}
      <div key={cycle} className="pm-groups-field">
        {sized.map((c, i) => (
          <span
            key={c.slug}
            className={c.quiet ? "pm-groups-dot is-quiet" : "pm-groups-dot"}
            style={{
              width: `${c.r * 2}px`,
              height: `${c.r * 2}px`,
              // A stagger so the field draws in rather than snapping. It is
              animationDelay: `${Math.min(i * 40, 800)}ms`,
            }}
            // THE TITLE CARRIES THE COUNT, so the picture is readable to
            title={`${c.title} — ${c.members} ${c.members === 1 ? "member" : "members"}, ${
              c.posts === 0 ? "no posts yet" : `${c.posts} posted`
            }`}
          />
        ))}
      </div>

      {}
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
