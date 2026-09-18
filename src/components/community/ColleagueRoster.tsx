"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ColleagueRowActions } from "@/components/community/ColleagueRowActions";
import "./member-row.css";

/**
 * ── ⚠⚠ THE ROSTER (`P2-J3-E558` WS-A) ─────────────────────────────────────
 *
 * ⚠⚠⚠ THE SEARCH IS AN IN-MEMORY FILTER OVER THE VIEWER'S OWN COLLEAGUES.
 * There is NO fetch in this component and no endpoint behind the box. ⚠ The
 * member-wide search that used to live on this page is the route 145 providers
 * take to reach 13 buyers; scoping it to the roster is the whole point of the
 * redesign, and doing the filter client-side over a server-scoped list means no
 * later edit can widen it by accident.
 *
 * ⚠ `USER_CLASS` IS NOT STORED, so a class-throttled member search cannot be
 * built yet. This UI does not change when it can.
 */

export type RosterRowView = {
  connectionId: string;
  userId: string;
  name: string;
  title: string | null;
  company: string | null;
  photoUrl: string | null;
  reason: string;
  reasonKind: "skills" | "learn" | "employer" | "worked" | "date";
  buySide: boolean;
};

type Filter = "all" | "skills" | "learn" | "worked";

/* ⚠ `Worked together` SHIPS READING 0 — it is the counter that fills in when
   transactions exist. A filter that appears later teaches nobody; one that sits
   at 0 tells the truth about what the product can prove today. */
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "skills", label: "Shared Skills" },
  { key: "learn", label: "From Learn" },
  { key: "worked", label: "Worked together" },
];

export function ColleagueRoster({ rows }: { rows: RosterRowView[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [asking, setAsking] = useState<RosterRowView | null>(null);

  const counts = useMemo(
    () => ({
      all: rows.length,
      skills: rows.filter((r) => r.reasonKind === "skills").length,
      learn: rows.filter((r) => r.reasonKind === "learn").length,
      worked: rows.filter((r) => r.reasonKind === "worked").length,
    }),
    [rows]
  );

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows
      .filter((r) => (filter === "all" ? true : r.reasonKind === filter))
      .filter((r) =>
        !needle
          ? true
          : [r.name, r.title, r.company].some((f) => f?.toLowerCase().includes(needle))
      );
  }, [rows, q, filter]);

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your colleagues by name, title or company"
        aria-label="Search your colleagues"
        className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[14.5px] outline-none focus:border-magenta"
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={
                "rounded-full border-[1.5px] px-3.5 py-1.5 text-[13.5px] font-semibold transition-colors " +
                (active
                  ? "border-magenta bg-magenta text-white"
                  : "border-line text-ink-2 hover:border-magenta hover:text-magenta")
              }
            >
              {f.label}{" "}
              {/* ⚠ `E433` — THE COUNT IS A FIGURE, NOT AN INTERACTIVE THING, so
                  it never carries magenta. On the active chip it inherits white
                  from the button; off it, it is ink. */}
              <span className={active ? "font-normal" : "font-normal text-ink-2"}>
                ({counts[f.key]})
              </span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-ink-2">
          {rows.length === 0
            ? "You have no colleagues yet. A colleague is someone who accepted your request — a mutual connection."
            : "No colleague matches that."}
        </p>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => (
            <div
              key={r.connectionId}
              className="pm-member-row flex flex-wrap items-center gap-3 rounded-brand border border-line bg-white p-4"
            >
              <Avatar
                firstName={r.name.split(" ")[0] ?? ""}
                lastName={r.name.split(" ").slice(1).join(" ")}
                photoUrl={r.photoUrl}
                size={44}
              />
              <div className="min-w-[180px] flex-1">
                <p className="text-[15px] font-bold">
                  {r.name}
                  {/* ⚠⚠ THE BUY-SIDE MARKER IS QUIET AND IT IS NOT A WARNING.
                      Under the class rule these are not peer connections — but
                      they are real, they are not hidden and they are not
                      deleted. ⚠ `E433`: it is a FACT, so it is ink, not
                      magenta. */}
                  {r.buySide && (
                    <span className="ml-2 rounded-full bg-black/[0.06] px-2 py-0.5 text-[11.5px] font-bold text-ink-2">
                      Buy-side
                    </span>
                  )}
                </p>
                {[r.title, r.company].filter(Boolean).length > 0 && (
                  <p className="text-[13px] text-ink-2">
                    {[r.title, r.company].filter(Boolean).join(" · ")}
                  </p>
                )}
                {/* ⚠⚠ NEVER BLANK. The lib guarantees a reason — a shared
                    employer, shared skills, shared paths, or the connection
                    date as the fallback that always computes. */}
                <p className="mt-0.5 text-[12.5px] italic leading-snug text-ink-2">
                  {r.reason}
                </p>
              </div>
              <div className="pm-member-row-actions flex flex-wrap items-center gap-2">
                <ColleagueRowActions
                  toUserId={r.userId}
                  name={r.name}
                  buySide={r.buySide}
                  onAskRecommendation={() => setAsking(r)}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {asking && <AskForRecommendation row={asking} onClose={() => setAsking(null)} />}
    </div>
  );
}

/**
 * ── ⚠⚠ THE ASK (`P2-J3-E558` WS-A) ────────────────────────────────────────
 *
 * ⚠ THE RELATIONSHIP IS DERIVED, NOT TYPED. LinkedIn asks the requester to
 * declare it, which is where inflation enters. ⚠⚠ IT ALWAYS READS `Colleague`
 * HERE — `USER_CLASS` is not stored, so `Client` is a label the data cannot
 * prove yet.
 * ⚠ THE NOTE IS STILL ASKED FOR. A specific ask produces a specific
 * recommendation; a blank one produces a generic one.
 * ⚠ The POST sends `toUserId`, NEVER an email — the address is resolved
 * server-side from a connection the viewer demonstrably has.
 */
function AskForRecommendation({
  row,
  onClose,
}: {
  row: RosterRowView;
  onClose: () => void;
}) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: row.userId, message: note }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        /* ⚠ THE SERVER'S OWN SENTENCE IS SHOWN — "you've reached the limit" and
           "they aren't a colleague" are different answers and collapsing them
           into "couldn't send" is what makes a wall. */
        setError(data?.error ?? "We couldn't send that just now.");
        return;
      }
      setDone(true);
    } catch {
      setError("We couldn't send that just now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-brand border border-line bg-white p-5">
        <h2 className="font-display text-[18px] font-bold">
          Ask {row.name} for a recommendation
        </h2>
        {done ? (
          <>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-2">
              Sent. {row.name.split(" ")[0]} will get an email with your note and a
              link to write it.
            </p>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-magenta px-5 py-2 font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-[13.5px] text-ink-2">
              {/* ⚠ DERIVED AND STATED, so the requester can see what will be
                  recorded rather than choosing it. */}
              This will be recorded as a <span className="font-bold text-ink">Colleague</span>{" "}
              recommendation.
            </p>
            <label className="mt-4 block">
              <span className="text-[13.5px] font-bold">
                What should they talk about?
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                placeholder="Remind them what you worked on together, and what would be useful to mention."
                className="mt-1 w-full rounded-[10px] border border-line px-3 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-magenta"
              />
            </label>
            {error && (
              <p className="mt-2 text-[13.5px] font-semibold text-red-700">{error}</p>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {/* ⚠ `Back`, not `Cancel` — nothing has happened yet. The same
                  reasoning Scott ruled for the invitation confirm step. */}
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-full border-[1.5px] border-line px-5 py-2 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={send}
                disabled={busy || note.trim().length < 20}
                className="rounded-full bg-magenta px-5 py-2 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
              >
                {busy ? "Sending…" : "Send Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
