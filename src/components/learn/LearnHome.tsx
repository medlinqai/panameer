"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { PathCard } from "@/components/learn/PathCard";
import { PatternHeader } from "@/components/casing/PatternHeader";
import { OTHER_GROUP } from "@/lib/learn";
import type { LearnCard } from "@/lib/learn-home";

/** The signed-in Learn Home (WS1; design ref E136-learn-signedin-design.png). */
export function LearnHome({
  cards,
  chips,
  signedIn,
  initialTab = "all",
}: {
  cards: LearnCard[];
  chips: { group: string; paths: number; lessons: number }[];
  signedIn: boolean;
  /** Which tab to open on (WS1-B). */
  initialTab?: "all" | "mine";
}) {
  const [tab, setTab] = useState<"all" | "mine">(initialTab);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);

  const enrolledCount = cards.filter((c) => c.enrolled).length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return cards.filter(
      (c) =>
        (tab === "all" || c.enrolled) &&
        // Q5 — the `Other` chip selects the paths with NO group.
        (!group || (c.group ?? OTHER_GROUP) === group) &&
        // ONE PREDICATE, OVER ONE FIELD ( WS-D, )
        (!needle || c.searchText.includes(needle)),
    );
  }, [cards, tab, group, query]);

  // THE CATALOG GROUPS BY TRACK, WITH A HEAD PER TRACK (WS-D item 5)
  const grouped = useMemo(() => {
    if (query.trim() || group) return null;
    const byGroup = new Map<string, LearnCard[]>();
    for (const c of visible) {
      const k = c.group ?? OTHER_GROUP;
      const list = byGroup.get(k);
      if (list) list.push(c);
      else byGroup.set(k, [c]);
    }
    const order = chips.map((c) => c.group);
    return [...byGroup.entries()].sort(
      (a, b) => order.indexOf(a[0]) - order.indexOf(b[0])
    );
  }, [visible, query, group, chips]);

  // PLAYABLE LESSONS, NOT ALL LESSONS
  const totalLessons = cards.reduce((n, c) => n + c.playable, 0);
  // THE CATALOG SENTENCE LIVES HERE , item 3)
  const startablePaths = cards.filter((c) => c.ready).length;
  const totalCourses = cards.reduce((n, c) => n + c.courses, 0);
  const totalLessonsAll = cards.reduce((n, c) => n + c.lessons, 0);
  const inProduction = cards.length - startablePaths;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      {/* E026 — THE LEARN HERO PLAYS THE LEARN CLIP. Same footage as the Learn */}
      {/* RULING 36c — THE MARKETING HERO IS REPLACED FOR A MEMBER */}
      {signedIn ? (
        <PatternHeader
          // NOT `LEARNING PATHS` — THAT DUPLICATED THE HEADLINE WORD FOR
          eyebrow="THE CATALOG"
          headline="Learning Paths"
          lede="Paths across procurement, finance, HR and implementation."
          figures={[
            { label: "Learning Paths", value: cards.length },
            { label: "Courses", value: totalCourses },
            { label: "Lessons", value: totalLessonsAll },
          ]}
          move={
            <>
              {startablePaths} learning paths you can start today · {inProduction} in production.
            </>
          }
        />
      ) : (

            <section className="relative overflow-hidden rounded-brand bg-[linear-gradient(115deg,var(--color-learn-deep)_0%,var(--color-learn-card)_38%,var(--color-learn-mid)_62%,var(--color-learn-hot)_100%)] px-7 py-8 text-white sm:px-10 sm:py-10">
              {/* The clip + the re-laid ramp now live in HeroVideoBackdrop, because the */}
              <HeroVideoBackdrop
                src="/learn.mp4"
                poster="/posters/learn.svg"
                videoClassName="absolute inset-0 h-full w-full object-cover opacity-40"
                scrimClassName="absolute inset-0 bg-[linear-gradient(115deg,rgba(15,11,28,0.82)_0%,rgba(40,20,80,0.62)_45%,rgba(215,44,214,0.30)_100%)]"
              />

              <div className="relative z-[2]">
                <h1 className="max-w-2xl font-display text-[28px] font-bold leading-tight tracking-[-0.5px] sm:text-[34px]">
                  Learn Oracle Cloud from the people who implement it
                </h1>
                {/* TWO SENTENCES, DELIBERATELY. Inside one clause a reader adds */}
                {/* RULING 30 — 23 IS THE CATALOG'S SIZE, WITH ITS SPLIT */}
                <p className="mt-3 max-w-xl text-[15.5px] text-white/80">
                  {cards.length} paths — {startablePaths} you can start today,{" "}
                  {inProduction} in production. {totalLessons.toLocaleString()} lessons
                  you can watch, free, and taught by working consultants.
                </p>

                {/* WRAPS AT NARROW WIDTHS (WS-5 audit). Four pills in an `inline-flex` */}
                <div className="mt-6 inline-flex flex-wrap justify-start rounded-[26px] border border-white/30 p-1 sm:rounded-full">
                  <button
                    type="button"
                    onClick={() => setTab("all")}
                    className={
                      "px-5 py-2 text-[14px] font-bold transition-colors " +
                      (tab === "all"
                        ? "bg-white text-learn-card"
                        : "text-white/80 hover:text-white")
                    }
                  >
                    All Learning Paths
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("mine")}
                    className={
                      "px-5 py-2 text-[14px] font-bold transition-colors " +
                      (tab === "mine"
                        ? "bg-white text-learn-card"
                        : "text-white/80 hover:text-white")
                    }
                  >
                    My Learning Paths{enrolledCount > 0 ? ` (${enrolledCount})` : ""}
                  </button>

                  {/* E216 — THE COURSE VIEWS JOIN THIS ROW rather than getting a second */}
                </div>

                <div className="mt-4 max-w-md">
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search learning paths"
                    aria-label="Search learning paths"
                    className="w-full rounded-full border border-white/30 bg-white/10 px-5 py-2.5 text-[14.5px] text-white outline-none placeholder:text-white/60 focus:border-white/70"
                  />
                </div>

                {chips.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {/* EVERY TRACK, NOT SIX ( WS-D item 4) */}
                    {chips.map((c) => {
                      const active = group === c.group;
                      return (
                        <button
                          key={c.group}
                          type="button"
                          onClick={() => setGroup(active ? null : c.group)}
                          aria-pressed={active}
                          className={
                            "border px-4 py-1.5 text-[13.5px] font-semibold transition-colors " +
                            (active
                              ? "border-white bg-white text-learn-card"
                              : "border-white/35 text-white/90 hover:border-white")
                          }
                        >
                          {/* THE COUNT `groupChips` HAS ALWAYS COMPUTED AND */}
                          {c.group} <span className="opacity-70">({c.paths})</span>
                        </button>
                      );
                    })}
                    {group && (
                      <button
                        type="button"
                        onClick={() => setGroup(null)}
                        className="px-3 py-1.5 text-[13.5px] font-semibold text-white/70 underline underline-offset-4 hover:text-white"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>
      )}

      {/* THE SIGNED-IN MEMBER GETS THE SEARCH TOO ( WS-D) */}
      {signedIn && (
        <div className="mt-6">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search paths, courses and lessons"
            aria-label="Search paths, courses and lessons"
            className="w-full max-w-md rounded-full border border-line bg-white px-5 py-2.5 text-[14.5px] outline-none focus:border-magenta"
          />
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {chips.map((c) => {
                const active = group === c.group;
                return (
                  <button
                    key={c.group}
                    type="button"
                    onClick={() => setGroup(active ? null : c.group)}
                    aria-pressed={active}
                    className={
                      "border px-4 py-1.5 text-[13.5px] font-semibold transition-colors " +
                      (active
                        ? "border-magenta bg-magenta text-white"
                        : "border-line text-ink-2 hover:border-ink/25")
                    }
                  >
                    {c.group} <span className="opacity-70">({c.paths})</span>
                  </button>
                );
              })}
              {group && (
                <button
                  type="button"
                  onClick={() => setGroup(null)}
                  className="px-3 py-1.5 text-[13.5px] font-semibold text-ink-2 underline underline-offset-4 hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      )}


      {tab === "mine" && enrolledCount === 0 ? (
        <div className="mt-8 rounded-brand border border-line p-8 text-center">
          <p className="text-[16px] font-bold">
            You haven&apos;t enrolled in anything yet.
          </p>
          <p className="mx-auto mt-2 max-w-md text-[14.5px] text-ink-2">
            {signedIn
              ? "Enrolling is free and just keeps your place — pick a path and it'll show up here."
              : "Sign in to keep track of what you've finished."}
          </p>
          <button
            type="button"
            onClick={() => setTab("all")}
            className="mt-4 bg-magenta px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Browse All Paths
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-8 rounded-brand border border-line p-8 text-center text-[14.5px] text-ink-2">
          Nothing matches that. Try a different search or clear the filters.
        </p>
      ) : (
        // GROUPED BY TRACK, WITH A HEAD PER TRACK (WS-D item 5)
        <div className="mt-8">
          {grouped ? (
            grouped.map(([track, list]) => (
              <section key={track} className="mb-9 last:mb-0">
                <h2 className="font-display text-[18px] font-bold tracking-[-0.3px]">
                  {track}{" "}
                  <span className="font-normal text-ink-2">({list.length})</span>
                </h2>
                <div className="mt-3 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((c) => (
                    <PathCard key={c.id} card={c} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((c) => (
                <PathCard key={c.id} card={c} />
              ))}
            </div>
          )}
        </div>
      )}

      {!signedIn && (
        <p className="mt-8 text-center text-[14px] text-ink-2">
          <Link
            href="/login"
            className="font-bold text-magenta hover:underline"
          >
            Sign in
          </Link>{" "}
          to track your progress and earn certificates.
        </p>
      )}
    </div>
  );
}
