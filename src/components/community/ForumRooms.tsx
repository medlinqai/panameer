"use client";

import { useState } from "react";
import Link from "next/link";
import "./member-row.css";

export type RoomView = {
  slug: string;
  title: string;
  threadCount: number;
  relation: "teach" | "enrolled" | "general";
};

function Room({ r }: { r: RoomView }) {
  return (
    <li>
      <Link
        href={`/community/groups/${r.slug}`}
        className="flex items-baseline justify-between gap-2 py-1.5 text-[13.5px] hover:text-magenta"
      >
        <span className="font-semibold">{r.title}</span>
        <span className="shrink-0 text-[12px] text-ink-2">
          {/* ⚠ `Teach` IS THE ONLY RELATION WORTH MARKING. "Enrolled" is the
              default way to be in a room, and labelling the common case adds
              noise to every line to explain the rare one. */}
          {r.relation === "teach" ? "Teach" : null}
        </span>
      </Link>
    </li>
  );
}

export function ForumRooms({ rooms }: { rooms: RoomView[] }) {
  const [showQuiet, setShowQuiet] = useState(false);
  const active = rooms.filter((r) => r.threadCount > 0);
  const quiet = rooms.filter((r) => r.threadCount === 0);

  return (
    <div className="border-t border-line py-5">
      {/* ⚠⚠ `P2-A3-E612` Q17 — `Groups`, matching the page it sits on. Leaving
          this as `Forums` under a page headed `Groups` would be the same
          two-words-for-one-thing defect Q17 exists to remove (`E459`).
          ⚠ SUPERSEDED, quoted not deleted (`E164`):
          //   <h2 …>Your Forums</h2> */}
      <h2 className="font-display text-[15px] font-bold">Your Groups</h2>

      {rooms.length === 0 ? (
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
          You are not in any groups yet. Enrol in a learning path and its group
          opens with it.
        </p>
      ) : (
        <>
          {active.length > 0 && (
            <ul className="mt-2 divide-y divide-line/60">
              {active.map((r) => (
                <Room key={r.slug} r={r} />
              ))}
            </ul>
          )}

          {quiet.length > 0 && (
            <div className={active.length > 0 ? "mt-3" : "mt-2"}>
              {showQuiet ? (
                <ul className="divide-y divide-line/60">
                  {quiet.map((r) => (
                    <Room key={r.slug} r={r} />
                  ))}
                </ul>
              ) : (
                /* ⚠ ONE LINK, NOT A LIST. The count is a figure and stays ink
                    (`E433`); the control is the words around it. */
                <button
                  type="button"
                  onClick={() => setShowQuiet(true)}
                  className="text-[13px] font-semibold text-magenta hover:underline"
                >
                  Show <span className="text-ink-2">{quiet.length}</span> quiet{" "}
                  {/* ⚠ Ruling 1 — SUPERSEDED (`E164`): "room" : "rooms" */}
                  {quiet.length === 1 ? "group" : "groups"}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
