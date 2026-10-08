"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/Avatar";
import { ColleagueRowActions } from "@/components/community/ColleagueRowActions";
import { ConnectControls, type Relation } from "@/components/community/ConnectControls";
import "./member-row.css";
import { TitleAndCompany } from "@/components/company/CompanyLink";

type MemberHit = {
  userId: string;
  personId: string;
  name: string;
  title: string | null;
  company: string | null;
  companyId: string | null;
  photoUrl: string | null;
  relation: Relation;
};

export type RosterRowView = {
  connectionId: string;
  userId: string;
  name: string;
  title: string | null;
  company: string | null;
  companyId: string | null;
  photoUrl: string | null;
  reason: string;
  reasonKind: "skills" | "learn" | "employer" | "worked" | "date";
  buySide: boolean;
  skillNames: string[];
  location: string | null;
  mutualCount: number;
  profileHref: string | null;
  // Connections filters: relationship tags, how you know them, the skill that matched.
  tags?: string[];
  how?: string;
  matched?: string | null;
};

type Filter = "all" | "skills" | "learn" | "worked";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "skills", label: "Shared Skills" },
  { key: "learn", label: "From Learn" },
  { key: "worked", label: "Worked together" },
];

export function ColleagueRoster({ rows, bare = false }: { rows: RosterRowView[]; bare?: boolean }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [asking, setAsking] = useState<RosterRowView | null>(null);

  const matching = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (bare || !needle) return rows;
    return rows.filter((r) =>
      [r.name, r.title, r.company, ...r.skillNames].some((f) =>
        f?.toLowerCase().includes(needle)
      )
    );
  }, [rows, q, bare]);

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
      .filter((r) => (bare || filter === "all" ? true : r.reasonKind === filter))
      // NAME · TITLE · COMPANY · SKILL WS-E item 3)
      // THE NEEDLE HAS ALREADY BEEN APPLIED, IN `matching` ABOVE ( item 1a), so this
      ;
  }, [matching, filter, bare]);

  /* The page actually rendered, and whether another one exists. */
  const visible = shown.slice(0, limit);
  const more = shown.length - visible.length;

  return (
    <div className="space-y-4">
      {!bare && (
      <>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        // THE PLACEHOLDER NAMES EVERY FIELD IT SEARCHES. A box that quietly
        placeholder="Search your connections…"
        aria-label="Search your connections"
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
              {/* — THE COUNT IS A FIGURE, NOT AN INTERACTIVE THING, so */}
              <span className={active ? "font-normal" : "font-normal text-ink-2"}>
                ({counts[f.key]})
              </span>
            </button>
          );
        })}
      </div>

      </>
      )}
      {shown.length === 0 ? (
        <p className="text-[14px] leading-relaxed text-ink-2">
          {bare
            ? "No one in your connections matches these filters."
            : rows.length === 0
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
              {/* THE PHOTO LINKS TOO ( , B2: *"Name and photo link to the */}
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
                  {/* THE BUY-SIDE MARKER IS QUIET AND IT IS NOT A WARNING. */}
                  {r.buySide && (
                    <span className="ml-2 rounded-full bg-black/[0.06] px-2 py-0.5 text-[11.5px] font-bold text-ink-2">
                      Buy-side
                    </span>
                  )}
                </p>
                {[r.title, r.company].filter(Boolean).length > 0 && (
                  <p className="text-[13px] text-ink-2">
                    <TitleAndCompany title={r.title} company={r.company} companyId={r.companyId} />
                  </p>
                )}
                {/* THE DISAMBIGUATING LINE ( , B2). THE MUTUAL */}
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
                {/* NEVER BLANK. The lib guarantees a reason — a shared */}
                {r.how !== undefined ? (
                  <p data-why className="mt-1 flex flex-wrap items-center gap-1.5 text-[12.5px] leading-snug text-ink-2">
                    {r.tags?.map((t) => (
                      <span key={t} className="border border-line px-1.5 text-[11px] font-semibold text-ink">{t}</span>
                    ))}
                    <span className="italic">{r.how}</span>
                    {r.matched && <span className="bg-magenta/10 px-1.5 text-[11.5px] font-semibold text-ink">{r.matched}</span>}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[12.5px] italic leading-snug text-ink-2">
                    {r.reason}
                  </p>
                )}
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
          {/* THE REMAINDER IS A REAL COUNT, not "Show more" with nothing */}
          {more > 0 && (
            <button
              type="button"
              onClick={() => setLimit((n) => n + PAGE)}
              className="w-full border border-line bg-white px-4 py-2.5 text-[13.5px] font-semibold text-ink hover:border-magenta hover:text-magenta"
            >
              Show More ({more} more)
            </button>
          )}
        </div>
      )}

      {/* AND THE PEOPLE WHO ARE *NOT* YET COLLEAGUES item 1b) */}
      {!bare && <OtherMembers query={q} excludeUserIds={rows.map((r) => r.userId)} />}

      {asking && <AskForRecommendation row={asking} onClose={() => setAsking(null)} />}
    </div>
  );
}

/** IT IMPLEMENTS NO SEARCH. It calls `GET /api/community/members/search`, which is */
function OtherMembers({
  query,
  excludeUserIds,
}: {
  query: string;
  excludeUserIds: string[];
}) {
  // THE ANSWER IS STORED *WITH THE QUESTION IT ANSWERS*
  const [hits, setHits] = useState<{ q: string; rows: MemberHit[] } | null>(null);
  const needle = query.trim();

  useEffect(() => {
    // THE SAME TWO-CHARACTER FLOOR `searchMembers` ENFORCES. It is repeated here ONLY to
    if (needle.length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      fetch(`/api/community/members/search?q=${encodeURIComponent(needle)}`)
        .then((r) => (r.ok ? r.json() : { members: [] }))
        .then((d) => live && setHits({ q: needle, rows: (d.members ?? []) as MemberHit[] }))
        // A THROWN FETCH MUST NOT PRODUCE SILENCE . An empty list is recorded for
        .catch(() => live && setHits({ q: needle, rows: [] }));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [needle]);

  if (needle.length < 2) return null;

  /* `null` MEANS "no answer for THIS question yet" — which is exactly what loading is. */
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
        // A REAL ZERO, SAID PLAINLY (counting rule 2) — and it is the honest end of the
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
                    <TitleAndCompany title={m.title} company={m.company} companyId={m.companyId} />
                  </p>
                )}
              </div>
              <div className="pm-member-row-actions flex flex-wrap items-center gap-2">
                {/* COMPUTED — `Connect as Colleague`, `Requested`, `Accept` or `Message`. */}
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

/** Starter notes for the ask (Scott 2026-10-08) — tap one, then edit the [brackets]. */
const RECO_FORMATS: { label: string; text: (first: string) => string }[] = [
  {
    label: "A Project We Did",
    text: (f) =>
      `Hi ${f}, we worked together on [project] at [company]. Could you write a few lines on what I did on it — [my part] — and how it turned out?`,
  },
  {
    label: "My Skills",
    text: (f) =>
      `Hi ${f}, could you speak to my work in [skill 1] and [skill 2] — for example how I handled [a challenge] when we worked together?`,
  },
  {
    label: "Working With Me",
    text: (f) =>
      `Hi ${f}, could you say what I'm like to work with — how I communicate, whether I deliver on time, and how I handle pressure?`,
  },
];

/** THE ASK WS-A) */
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
        // THE SERVER'S OWN SENTENCE IS SHOWN — "you've reached the limit" and
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()} className="w-full max-w-lg border border-line bg-surface p-6 shadow-[0_18px_48px_-12px_rgba(23,30,62,0.35)]">
        <h2 className="font-display text-[18px] font-bold">
          Ask {row.name} for a Recommendation
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
              {/* DERIVED AND STATED, so the requester can see what will be */}
              This will be recorded as a <span className="font-bold text-ink">Colleague</span>{" "}
              recommendation.
            </p>
            <label className="mt-4 block">
              <span className="text-[13.5px] font-bold">
                What should they talk about?
              </span>
            </label>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-ink-2">Start from:</span>
              {RECO_FORMATS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setNote(f.text(row.name.split(" ")[0] ?? ""))}
                  className="border border-line px-2.5 py-1 text-[12.5px] font-semibold text-ink-2 transition-colors hover:border-ink hover:text-ink"
                >
                  {f.label}
                </button>
              ))}
            </div>
            <label className="mt-2 block">
              <span className="sr-only">Your note</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={5}
                placeholder="Pick a starting point above, or write your own: what you worked on together and what would be useful to mention."
                className="mt-1 w-full border border-line bg-surface px-3 py-2.5 text-[14.5px] leading-relaxed outline-none focus:border-magenta"
              />
            </label>
            {error && (
              <p className="mt-2 text-[13.5px] font-semibold text-red-700">{error}</p>
            )}
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {/* reasoning Scott ruled for the invitation confirm step. */}
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
