"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ColleagueRowActions } from "@/components/community/ColleagueRowActions";
import { ConnectControls, type Relation } from "@/components/community/ConnectControls";
import "./member-row.css";

type MemberHit = {
  userId: string;
  personId: string;
  name: string;
  title: string | null;
  company: string | null;
  photoUrl: string | null;
  relation: Relation;
};

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
  skillNames: string[];
  location: string | null;
  mutualCount: number;
  profileHref: string | null;
};

type Filter = "all" | "skills" | "learn" | "worked";

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

  const matching = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) =>
      [r.name, r.title, r.company, ...r.skillNames].some((f) =>
        f?.toLowerCase().includes(needle)
      )
    );
  }, [rows, q]);

  const counts = useMemo(
    () => ({
      all: matching.length,
      skills: matching.filter((r) => r.reasonKind === "skills").length,
      learn: matching.filter((r) => r.reasonKind === "learn").length,
      worked: matching.filter((r) => r.reasonKind === "worked").length,
    }),
    [matching]
  );

  const PAGE = 10;
  const [limit, setLimit] = useState(PAGE);
  const key = `${q}|${filter}`;
  const [lastKey, setLastKey] = useState(key);
  if (key !== lastKey) {
    setLastKey(key);
    setLimit(PAGE);
  }

  const shown = useMemo(() => {
    return matching
      .filter((r) => (filter === "all" ? true : r.reasonKind === filter))
      /*
        ── ⚠⚠ NAME · TITLE · COMPANY · SKILL (`P2-A3-E596` WS-E item 3) ──────

        ⚠ SCOTT: search *"the fields a person actually remembers someone by"*.
        ⚠ SUPERSEDED, quoted not deleted (`E164`) — skill was the one missing:
        //   [r.name, r.title, r.company].some((f) => f?.toLowerCase().includes(needle))

        ⚠⚠ MEASURED AT THE GATE BEFORE BUILDING: three of the four were already
        here, so WS-E was WIRING, not building — exactly what item 1 asked to be
        checked first. ⚠ `searchMembers` in `connections.ts` is a DIFFERENT
        search over the WHOLE member directory, and it was left alone; this one
        is scoped to the viewer's own accepted colleagues by construction.
        ⚠⚠⚠ THE SKILL NAMES ARE THE **SHOWN** SET (`E517`), resolved on the
        server. A skill the colleague's own profile will not display must not
        be a way to find them, or a buyer reaches a page that cannot confirm it.
      */
      /* ⚠ THE NEEDLE HAS ALREADY BEEN APPLIED, IN `matching` ABOVE (`E721` item 1a), so this
         memo is now the chip filter alone. ⚠⚠ The field list and the reasoning for it moved
         with the code; the `E164` note above is what it said.
         ⚠ SUPERSEDED, quoted not deleted (`E164`):
         //   .filter((r) => !needle ? true
         //     : [r.name, r.title, r.company, ...r.skillNames].some((f) =>
         //         f?.toLowerCase().includes(needle)));
      */
      ;
  }, [matching, filter]);

  /* ⚠ The page actually rendered, and whether another one exists. */
  const visible = shown.slice(0, limit);
  const more = shown.length - visible.length;

  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        /* ⚠ THE PLACEHOLDER NAMES EVERY FIELD IT SEARCHES. A box that quietly
           matches more than it claims is a box people stop trusting. ⚠ SUPERSEDED,
           quoted not deleted (`E164`):
           //   placeholder="Search your colleagues by name, title or company" */
        placeholder="Search your colleagues by name, title, company or skill"
        aria-label="Search your colleagues"
        className="w-full rounded-[10px] border border-line px-3 py-2.5 text-[14.5px] outline-none focus:border-magenta"
      />

      <div className="flex flex-wrap gap-x-[22px] border-b border-line">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              aria-pressed={active}
              className={
                "-mb-px border-b-2 py-2.5 text-[14px] font-semibold transition-colors " +
                (active ? "border-magenta text-ink" : "border-transparent text-ink-2 hover:text-ink")
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
          {visible.map((r) => (
            <div
              key={r.connectionId}
              className="pm-member-row flex flex-wrap items-center gap-3 border-t border-line py-5"
            >
              {/* ⚠⚠ THE PHOTO LINKS TOO (`E742`, B2: *"Name and photo link to the
                  profile"*). ⚠ A 44px avatar is a small target, so it and the
                  name are two links to one place rather than one of them being
                  decoration. ⚠⚠⚠ NOT A LINK AT ALL when there is no profile —
                  see `profileHref`. */}
              {r.profileHref ? (
                <Link href={r.profileHref} aria-label={`${r.name} — view profile`}>
                  <Avatar
                    firstName={r.name.split(" ")[0] ?? ""}
                    lastName={r.name.split(" ").slice(1).join(" ")}
                    photoUrl={r.photoUrl}
                    size={44}
                  />
                </Link>
              ) : (
                <Avatar
                  firstName={r.name.split(" ")[0] ?? ""}
                  lastName={r.name.split(" ").slice(1).join(" ")}
                  photoUrl={r.photoUrl}
                  size={44}
                />
              )}
              <div className="min-w-[180px] flex-1">
                <p className="text-[15px] font-bold">
                  {r.profileHref ? (
                    <Link href={r.profileHref} className="hover:text-magenta hover:underline">
                      {r.name}
                    </Link>
                  ) : (
                    r.name
                  )}
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
                {/* ⚠⚠ THE DISAMBIGUATING LINE (`E742`, B2). ⚠⚠⚠ THE MUTUAL
                    COUNT IS SHOWN **ONLY ABOVE ZERO**, per the brief — a `0`
                    beside every name is noise, and on a roster where most pairs
                    share nobody it would be noise on most rows. ⚠ The whole
                    line is absent when neither fact exists, rather than
                    rendering an empty paragraph. */}
                {(r.location || r.mutualCount > 0) && (
                  <p className="text-[12.5px] text-ink-2">
                    {[
                      r.location,
                      r.mutualCount > 0
                        ? `${r.mutualCount} colleague${r.mutualCount === 1 ? "" : "s"} in common`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
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
          {/* ⚠⚠ THE REMAINDER IS A REAL COUNT, not "Show more" with nothing
              behind it. ⚠ It is a plain button, not a link: nothing is fetched,
              the rows are already here. */}
          {more > 0 && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE)}
              className="w-full rounded-brand border border-line bg-white px-4 py-2.5 text-[13.5px] font-semibold text-ink hover:border-magenta hover:text-magenta"
            >
              Show More ({more} more)
            </button>
          )}
        </div>
      )}

      {/*
        ── ⚠⚠⚠ AND THE PEOPLE WHO ARE *NOT* YET COLLEAGUES (`P2-A3-E721` item 1b) ──────────

        ⚠ **SCOTT: *"Under the roster, 'Other members matching &lt;query&gt;', from the existing
        member/provider search (don't write a second search, `E585`)."***
        ⚠⚠ **THIS WAS THE HALF THAT MADE THE DEFECT FEEL LIKE A DEAD END.** Typing a real
        member's name into a box headed *"Search your colleagues"* returned nothing and
        offered nothing — correct, and useless, because **the one thing a member wants at
        that moment is to connect to the person they just failed to find.**
      */}
      <OtherMembers query={q} excludeUserIds={rows.map((r) => r.userId)} />

      {asking && <AskForRecommendation row={asking} onClose={() => setAsking(null)} />}
    </div>
  );
}

/**
 * ── ⚠⚠⚠ `Other members matching "…"` (`P2-A3-E721` item 1b) ──────────────────────────────
 *
 * ⚠⚠⚠ **IT IMPLEMENTS NO SEARCH.** It calls `GET /api/community/members/search`, which is
 * transport over `searchMembers` (`lib/connections.ts:412`) — **the same function
 * `/community`'s own search box uses.** ⚠ Scott named `E585` in the brief, and the roster
 * file's own comment had already flagged the risk two briefs ago: *"`searchMembers` is a
 * DIFFERENT search over the WHOLE member directory, and it was left alone."* It is still
 * left alone; it is now also CALLED.
 *
 * ⚠⚠ **"OTHER" IS A PRESENTATION RULE AND IS DECIDED HERE, NOT IN THE QUERY.** The server
 * search is the member directory and must stay general; excluding the viewer's own roster is
 * this page's business, because this page is the one already showing them above. ⚠ Without
 * it a colleague appears twice on one screen, once with `Message` and once in a list headed
 * *"other members"*.
 *
 * ⚠⚠ **DEBOUNCED AT 300ms, THE SAME FIGURE `MemberSearchBox` USES**, and for the same reason:
 * one Postgres search per keystroke. ⚠⚠⚠ **AND IT NEVER RACES ITSELF** — every response
 * checks that its own query is still the live one before it renders, so a slow request for
 * `"to"` cannot land after `"tom"` and repaint the older answer. That is the failure mode a
 * plain `fetch().then(setState)` has and it only shows up on a slow connection.
 */
function OtherMembers({
  query,
  excludeUserIds,
}: {
  query: string;
  excludeUserIds: string[];
}) {
  /*
    ── ⚠⚠⚠ THE ANSWER IS STORED *WITH THE QUESTION IT ANSWERS* ───────────────────

    ⚠ One piece of state, `{ q, rows }`, rather than a `results` list beside a `loading` flag.
    ⚠⚠ **IT IS THE STALENESS GUARD, AND IT IS STRONGER THAN A `live` BOOLEAN:** render compares
    the stored `q` against the live needle, so a slow response for `"to"` cannot repaint the
    answer for `"tom"` even if it arrives after it. A cancel flag only covers the unmount case;
    this covers the overtake case too.
    ⚠⚠⚠ **AND IT IS WHAT KEEPS THIS EFFECT FREE OF SYNCHRONOUS `setState`.** The first version
    cleared state in the effect body on a short query and tripped
    `react-hooks/set-state-in-effect` — **a NEW lint ERROR against a baseline of 11**, which the
    house rule counts as a regression. `loading` is now DERIVED from whether the stored answer
    matches the current question, so there is nothing to clear.
  */
  const [hits, setHits] = useState<{ q: string; rows: MemberHit[] } | null>(null);
  const needle = query.trim();

  useEffect(() => {
    /* ⚠ THE SAME TWO-CHARACTER FLOOR `searchMembers` ENFORCES. ⚠⚠ It is repeated here ONLY to
       avoid a round trip that is guaranteed to return `[]`; the server still owns the rule,
       and a change there is honoured whatever this line says. */
    if (needle.length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      fetch(`/api/community/members/search?q=${encodeURIComponent(needle)}`)
        .then((r) => (r.ok ? r.json() : { members: [] }))
        .then((d) => live && setHits({ q: needle, rows: (d.members ?? []) as MemberHit[] }))
        /* ⚠⚠ A THROWN FETCH MUST NOT PRODUCE SILENCE (`E516`). An empty list is recorded for
           THIS query rather than a spinner that never resolves. */
        .catch(() => live && setHits({ q: needle, rows: [] }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [needle]);

  if (needle.length < 2) return null;

  /* ⚠ `null` MEANS "no answer for THIS question yet" — which is exactly what loading is. */
  const rows_ = hits && hits.q === needle ? hits.rows : null;
  const loading = rows_ === null;
  const exclude = new Set(excludeUserIds);
  const others = (rows_ ?? []).filter((m) => !exclude.has(m.userId));

  return (
    <section className="border-t border-line pt-4" data-e721-others>
      <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-ink-2">
        Other members matching “{needle}”
      </h2>
      {loading ? (
        <p className="mt-2 text-[13.5px] text-ink-2">Searching…</p>
      ) : others.length === 0 ? (
        /* ⚠⚠ A REAL ZERO, SAID PLAINLY (counting rule 2) — and it is the honest end of the
           road rather than an empty space the member has to interpret. */
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">
          Nobody else on Panameer matches that.
        </p>
      ) : (
        <div className="mt-2 space-y-2">
          {others.map((m) => (
            <div
              key={m.userId}
              className="pm-member-row flex flex-wrap items-center gap-3 border-t border-line py-5"
            >
              <Avatar
                firstName={m.name.split(" ")[0] ?? ""}
                lastName={m.name.split(" ").slice(1).join(" ")}
                photoUrl={m.photoUrl}
                size={44}
              />
              <div className="min-w-[180px] flex-1">
                <p className="text-[15px] font-bold">{m.name}</p>
                {[m.title, m.company].filter(Boolean).length > 0 && (
                  <p className="text-[13px] text-ink-2">
                    {[m.title, m.company].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <div className="pm-member-row-actions flex flex-wrap items-center gap-2">
                {/*
                  ⚠⚠ `ConnectControls` PICKS ITS OWN BUTTON FROM THE RELATION THE SERVER
                  COMPUTED — `Connect as Colleague`, `Requested`, `Accept` or `Message`. ⚠⚠⚠
                  **NO SECOND CONNECT BUTTON WAS WRITTEN HERE AND THIS SURFACE DECIDES
                  NOTHING**, which is the same rule `InviteColleagueClient` follows for the
                  already-a-member card.
                  ⚠ `part="colleague"` (`E720`): this list is about becoming colleagues, and
                  a mentor control here would offer a second, unrelated relationship on a row
                  the member has not even connected to yet.
                */}
                <ConnectControls
                  toUserId={m.userId}
                  relation={m.relation ?? null}
                  part="colleague"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
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
      <div className="w-full max-w-lg border-t border-line py-5">
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
                className="bg-ink px-5 py-2 font-semibold text-surface transition-colors hover:bg-ink-hover"
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
                className="border border-ink bg-surface px-5 py-2 font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={send}
                disabled={busy || note.trim().length < 20}
                className="bg-ink px-5 py-2 font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-50"
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
