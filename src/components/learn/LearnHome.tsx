"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { PathCard } from "@/components/learn/PathCard";
import type { LearnCard } from "@/lib/learn-home";

/**
 * The signed-in Learn Home (WS1; design ref E136-learn-signedin-design.png).
 *
 * TONE. The design's headline was "Learn to use Oracle Cloud for free!!!" and
 * the brief asks for the credible line instead. Free is still here — it is a
 * genuine differentiator and burying it would be its own mistake — but as a
 * calm subhead. Three exclamation marks read as a discount banner, and the
 * claim this platform is actually making is that the people teaching are the
 * people who implement this for a living. That claim is worth more than the
 * price, and it is the same line the public page leads with, so a visitor who
 * signs up doesn't feel handed to a different product.
 */
export function LearnHome({
  cards,
  chips,
  signedIn,
  initialTab = "all",
}: {
  cards: LearnCard[];
  chips: { group: string; paths: number; lessons: number }[];
  signedIn: boolean;
  /**
   * Which tab to open on (WS1-B).
   *
   * The rail's Start Learning submenu has "All Learning Paths" and "My Learning
   * Paths" as separate entries, and they are the same page with this filter
   * flipped — the tabs were already a filter over one catalog rather than two
   * pages, which is why this is an initial value and not a second route. Read
   * from `?tab=` by the server component so a link can land on either.
   */
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
        (!group || c.group === group) &&
        (!needle ||
          c.title.toLowerCase().includes(needle) ||
          (c.summary ?? "").toLowerCase().includes(needle) ||
          c.instructors.some((i) => i.name.toLowerCase().includes(needle))),
    );
  }, [cards, tab, group, query]);

  /*
    ── ⚠⚠ PLAYABLE LESSONS, NOT ALL LESSONS (`P1-J3-E362`) ────────────────────

    ⚠ SUPERSEDED: `cards.reduce((n, c) => n + c.lessons, 0)`.

    ⚠⚠ THE TWO SURFACES DISAGREED IN PRODUCTION. `E362` filtered the PATH list at
    the data layer, so both pages agreed on 12 paths — but this line kept summing
    every lesson INSIDE those twelve, so `/learn` said 305 lessons and
    `/learn/paths` said 446. Same catalogue, two numbers, and the bigger one was
    the wrong one.

    ⚠ `c.playable` IS ALREADY ON THE CARD — `learn-home.ts` computes it per path
    off `isPlayable`, and `PathCard` has been rendering it as "· N ready" all
    along. Nothing new is computed here; this line was just reading the wrong
    field.
    ⚠ THE PER-CARD "N lessons · N ready" IS DELIBERATE AND UNCHANGED. A card
    describes what a path COVERS; a headline total claims what a learner can
    WATCH. Those are different questions and only the total was lying.
  */
  const totalLessons = cards.reduce((n, c) => n + c.playable, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8">
      {/*
        E026 — THE LEARN HERO PLAYS THE LEARN CLIP. Same footage as the Learn
        tile on the marketing home (hands typing), so arriving here from that
        tile feels like following a thread rather than landing on a different
        product.

        THE GRADIENT STAYS AND IS NOT DECORATION. It paints before the video
        arrives, it is what a reduced-motion visitor sees, and it is the only
        reason the white headline is guaranteed legible — the learn-* tokens are
        a real dark ramp, where footage is whatever the camera saw.
      */}
      <section className="relative overflow-hidden rounded-brand bg-[linear-gradient(115deg,var(--color-learn-deep)_0%,var(--color-learn-card)_38%,var(--color-learn-mid)_62%,var(--color-learn-hot)_100%)] px-7 py-8 text-white sm:px-10 sm:py-10">
        {/*
          The clip + the re-laid ramp now live in HeroVideoBackdrop, because the
          marketing home's dark hero card renders the same treatment and a
          second hand-written <video> would drift from this one. Same footage,
          same opacity, same scrim — only the reduced-motion switch changed,
          from the `usePrefersReducedMotion` hook to the CSS rule already in
          globals.css, so a static caller doesn't need an island to use it.
        */}
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
          <p className="mt-3 max-w-xl text-[15.5px] text-white/80">
            {cards.length} learning paths, {totalLessons.toLocaleString()}{" "}
            lessons — free, and taught by working consultants.
          </p>

          {/*
          WRAPS AT NARROW WIDTHS (WS-5 audit). Four pills in an `inline-flex`
          pill group need ~470px; at 390 the fourth ran off the right edge of
          the hero. `flex-wrap` lets them fall onto a second row instead, and
          `justify-start` keeps them left-aligned with everything above.
        */}
          <div className="mt-6 inline-flex flex-wrap justify-start rounded-[26px] border border-white/30 p-1 sm:rounded-full">
            <button
              type="button"
              onClick={() => setTab("all")}
              className={
                "rounded-full px-5 py-2 text-[14px] font-bold transition-colors " +
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
                "rounded-full px-5 py-2 text-[14px] font-bold transition-colors " +
                (tab === "mine"
                  ? "bg-white text-learn-card"
                  : "text-white/80 hover:text-white")
              }
            >
              My learning paths{enrolledCount > 0 ? ` (${enrolledCount})` : ""}
            </button>

            {/*
            E216 — THE COURSE VIEWS JOIN THIS ROW rather than getting a second
            one. The rail's Start Learning flyout listed four children: these
            two filters, which this row already was, and two course routes. The
            brief's rule is fold in, don't stack.

            ── ⚠ ONE OF THE TWO IS GONE (`P1-J3-E362`) ────────────────────────

            ⚠ SUPERSEDED: a second `<Link href="/learn/my-courses">My Courses`
            pill. That route was a `ComingSoon` while the `My learning paths`
            pill directly above already did the job, so it now redirects to
            `?tab=mine` and the duplicate control is removed.

            ⚠⚠ `/learn/courses` STAYS A LINK, AND THAT IS NOT AN OVERSIGHT.
            `E362` called it a duplicate of this page and asked for a redirect.
            It cannot have one: `/learn/courses` is PUBLIC (`P1-J0-E316`) and
            `/learn/paths` REDIRECTS SIGNED-OUT VISITORS TO `/login`
            (`P1-J3-E036`) — so pointing the public route at this one would turn
            the public hero's `Browse the Catalog` back into a login wall.
            REPORTED at `E362` rather than resolved here.
            ⚠ THE WRAP NOTE ABOVE MEASURED FOUR PILLS. There are three.
          */}
            <Link
              href="/learn/courses"
              className="rounded-full px-5 py-2 text-[14px] font-bold text-white/80 transition-colors hover:text-white"
            >
              All Courses
            </Link>
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
              {chips.slice(0, 6).map((c) => {
                const active = group === c.group;
                return (
                  <button
                    key={c.group}
                    type="button"
                    onClick={() => setGroup(active ? null : c.group)}
                    aria-pressed={active}
                    className={
                      "rounded-full border px-4 py-1.5 text-[13.5px] font-semibold transition-colors " +
                      (active
                        ? "border-white bg-white text-learn-card"
                        : "border-white/35 text-white/90 hover:border-white")
                    }
                  >
                    {c.group} <span aria-hidden>→</span>
                  </button>
                );
              })}
              {group && (
                <button
                  type="button"
                  onClick={() => setGroup(null)}
                  className="rounded-full px-3 py-1.5 text-[13.5px] font-semibold text-white/70 underline underline-offset-4 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </section>

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
            className="mt-4 rounded-full bg-magenta px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark"
          >
            Browse All Paths
          </button>
        </div>
      ) : visible.length === 0 ? (
        <p className="mt-8 rounded-brand border border-line p-8 text-center text-[14.5px] text-ink-2">
          Nothing matches that. Try a different search or clear the filters.
        </p>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <PathCard key={c.id} card={c} />
          ))}
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
