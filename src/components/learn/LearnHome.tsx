"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HeroVideoBackdrop } from "@/components/media/HeroVideoBackdrop";
import { PathCard } from "@/components/learn/PathCard";
import { PatternHeader } from "@/components/casing/PatternHeader";
import { OTHER_GROUP } from "@/lib/learn";
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
        /* ⚠ `P2-A4-E611` Q5 — the `Other` chip selects the paths with NO group.
           ⚠⚠ The chip builder and this filter share `OTHER_GROUP`; two spellings
           of the same word would make the chip select nothing. */
        (!group || (c.group ?? OTHER_GROUP) === group) &&
        /*
          ── ⚠⚠⚠ ONE PREDICATE, OVER ONE FIELD (`E683` WS-D, `E585`) ─────────

          ⚠⚠ **IT NOW REACHES COURSES AND LESSONS**, because `searchText` carries
          every course and lesson title. ⚠ SUPERSEDED, quoted not deleted
          (`E164`) — it searched three fields on the PATH only, so a member who
          typed a lesson's name got nothing:
          //   c.title.toLowerCase().includes(needle) ||
          //   (c.summary ?? "").toLowerCase().includes(needle) ||
          //   c.instructors.some((i) => i.name.toLowerCase().includes(needle))
          ⚠⚠⚠ **BOTH BRANCHES RUN THIS SAME LINE** — the signed-out hero and the
          signed-in catalogue share one control and one filter, so they cannot
          search different things.
        */
        (!needle || c.searchText.includes(needle)),
    );
  }, [cards, tab, group, query]);

  /*
    ── ⚠⚠⚠ THE CATALOGUE GROUPS BY TRACK, WITH A HEAD PER TRACK (WS-D item 5) ─

    ⚠ The frame groups; the live page was a flat grid.
    ⚠⚠ **GROUPED ONLY WHEN NOTHING IS FILTERING.** A search result set is
    already a narrow answer, and slicing it into eight one-card sections buries
    the answer under headings; a chip filter has by definition selected ONE
    track, so a heading over the whole page would restate the chip.
    ⚠ The order is the order `chips` arrives in — sorted by playable weight —
    so the page and the chip row cannot disagree about which track leads.
  */
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
  /*
    ── ⚠⚠⚠ THE CATALOGUE SENTENCE LIVES HERE (`P2-A4-E617`, item 3) ────────

    ⚠⚠ RULING 3 STANDS AND MOVES. Scott, 2026-09-24: *"Show it. '11 in
    production' appears as its own labelled figure."* ⚠ `E613` put it on My
    Learning; the mockup puts the catalogue count in the **Learning Paths**
    page's own header block, and that is where it belongs: **My Learning is
    about the MEMBER, the catalogue count is about the CATALOGUE.**

    ⚠⚠⚠ AND A CONFLICT WORTH NAMING: the mockup's view 2 opens *"23 paths
    across procurement, finance, HR and implementation."* **Ruling 3 forbids
    that number** — *"the two are never summed into 23 anywhere a member can
    see"* — and ruling 3 is the newer statement (rule 13), so the two figures
    stay separate here and 23 is not printed. `check:learn-build` §7 fails the
    build on it either way.
    ⚠ Both are COUNTED from the cards this page already has; neither is typed.
  */
  const startablePaths = cards.filter((c) => c.ready).length;
  const inProduction = cards.length - startablePaths;

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
      {/*
        ── ⚠⚠⚠ RULING 36c — THE MARKETING HERO IS REPLACED FOR A MEMBER ────

        ⚠ WS-B item 1: *"Replace the marketing hero with the designed header."*
        ⚠⚠ **AND ITS OWN CONDITION: *"The hero moves to the SIGNED-OUT catalogue.
        PROVE IT RENDERS THERE BEFORE REMOVING IT HERE."*** ⚠⚠⚠ **IT IS NOT
        REMOVED — IT IS BRANCHED.** The same markup, in the same component, still
        renders for every signed-out visitor, so nothing was taken away from the
        surface that needs it. **Removing a card can remove a capability's only
        entrance**, and the proof here is that the branch below is the original.

        ⚠⚠ **THE DUPLICATION THIS ACTUALLY FIXES, WHICH IS WHY IT MATTERS:** the
        hero's three buttons — `All Learning Paths` · `My Learning Paths` ·
        `All Courses` — sat **directly above the Learn tab row**, which says
        `My Learning · Learning Paths · Courses`. **The same three destinations,
        twice, in two vocabularies, eight pixels apart.**

        ⚠⚠⚠ RULING 30's SENTENCE MOVES, IT IS NOT LOST — and all three figures
        still come from **ONE predicate**: `card.ready` (`pathIsOpenTo`), with
        the total being `cards.length` and never a third count. ⚠ The shape
        holds by construction: `total = startable + inProduction`.
      */}
      {signedIn ? (
        <PatternHeader
          /* ⚠⚠ NOT `LEARNING PATHS` — THAT DUPLICATED THE HEADLINE WORD FOR
             WORD, which is the one thing an eyebrow must not do: its job is to
             say which of several near-identical pages you are on, and repeating
             the title says nothing. ⚠ Caught by looking at the screenshot, not
             by a gate. ⚠⚠⚠ `THE CATALOGUE` is the BRIEF'S OWN WORD for this page
             (*"the catalogue that doubles as 'what's next'"*), so it is not
             invented copy. ⚠ The application eyebrow `LEARN` already sits in the
             tab row directly above, exactly as `CONNECT` does on Community. */
          eyebrow="THE CATALOGUE"
          headline="Learning Paths"
          lede="Paths across procurement, finance, HR and implementation."
          figures={[
            { label: "Paths", value: cards.length },
            { label: "You Can Start", value: startablePaths },
            { label: "In Production", value: inProduction },
          ]}
          move={
            <>
              {/* ⚠ Ruling 30's sentence, moved verbatim in meaning. */}
              {cards.length} paths — {startablePaths} you can start today,{" "}
              {inProduction} in production.
            </>
          }
        />
      ) : (

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
                {/* ⚠ TWO SENTENCES, DELIBERATELY. Inside one clause a reader adds
                    the figures, and their sum is the number ruling 3 exists to stop
                    anyone printing. A full stop is the mechanism.
                    ⚠ The second renders only above zero — once every path is shot it
                    is a sentence about nothing.
                    ⚠ SUPERSEDED, quoted not deleted (`E164`):
                    //   {cards.length} learning paths, {totalLessons.toLocaleString()} lessons — free, and taught by working consultants. */}
                {/*
                  ── ⚠⚠⚠ RULING 30 — 23 IS THE CATALOGUE'S SIZE, WITH ITS SPLIT ────

                  ⚠⚠ SCOTT, 2026-09-24: **"Print 23 as the catalogue's size, and print
                  the split with it."** Shape: *"23 paths — 12 you can start today, 11
                  in production."*

                  ⚠⚠⚠ WHAT RULING 3 STILL FORBIDS, AND WHY THIS IS NOT THAT: a page
                  presenting **23 as the STARTABLE count** — *"23 paths you can start
                  today"* — overstates what a member can do by almost half.
                  `check:learn-build` §7 still fails the build on it. ⚠ **The test is
                  whether the sentence tells the member what they can DO**, and here
                  the arithmetic is SHOWN rather than invited: a reader has nothing
                  left to reconcile.

                  ⚠ ALL THREE FIGURES COME FROM ONE PREDICATE — `card.ready`, which is
                  `pathIsOpenTo` — and the total is `cards.length`, not a third count.
                  **Never three literals** (`E587`).
                  ⚠ SUPERSEDED, quoted not deleted (`E164`):
                  //   {startablePaths} paths you can start today, {totalLessons} lessons
                  //   you can watch — free, and taught by working consultants.
                  //   {inProduction > 0 ? ` Another ${inProduction} are in production.` : ""}
                */}
                <p className="mt-3 max-w-xl text-[15.5px] text-white/80">
                  {cards.length} paths — {startablePaths} you can start today,{" "}
                  {inProduction} in production. {totalLessons.toLocaleString()} lessons
                  you can watch, free, and taught by working consultants.
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
                    className="px-5 py-2 text-[14px] font-bold text-white/80 transition-colors hover:text-white"
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
                    {/*
                      ── ⚠⚠⚠ EVERY TRACK, NOT SIX (`E683` WS-D item 4) ────────
                      ⚠⚠ **11 CHIPS EXISTED AND 6 RENDERED, SO 5 TRACKS HAD NO
                      WAY IN AT ALL** — and the cut was by playable weight, so
                      the hidden five were exactly the emptiest.
                      ⚠ SCOTT, 2026-09-26, ruling 1: *"Show all 11 chips with
                      their real counts. An empty chip is not `E579` — the
                      filter returns zero, which is true. Clicking an empty
                      track lands on an honest empty state."*
                      ⚠ SUPERSEDED, quoted not deleted (`E164`):
                      //   {chips.slice(0, 6).map((c) => {
                    */}
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
                          {/* ⚠⚠ THE COUNT `groupChips` HAS ALWAYS COMPUTED AND
                              NOTHING EVER READ (WS-D item 4). ⚠ It is a
                              measured number, so it prints even at 0 — ruling
                              53c: a counted zero renders as 0, in ink. */}
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

      {/*
        ── ⚠⚠⚠ THE SIGNED-IN MEMBER GETS THE SEARCH TOO (`E683` WS-D) ────────

        ⚠⚠⚠ **IT LIVED ENTIRELY IN THE `!signedIn` BRANCH, SO A MEMBER GOT
        NEITHER THE FIELD NOR THE CHIPS** — measured at the premise check:
        `signedIn ?` at :177, the else at :203, closing at :367, with the input
        and the chip row inside it. ⚠ **SCOTT: *"really just let them search."*
        THIS IS THE PRIMARY PATH, NOT A FEATURE.**

        ⚠⚠ **IT IS THE SAME `query` AND `group` STATE AND THE SAME FILTER** —
        one implementation, two skins (`E585`). The hero's copy is white-on-dark
        because it sits on the gradient; this one is the page's own ink. **The
        predicate above is shared and cannot drift between them.**
      */}
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
        /*
          ── ⚠⚠ GROUPED BY TRACK, WITH A HEAD PER TRACK (WS-D item 5) ────────
          ⚠ SUPERSEDED, quoted not deleted (`E164`) — the flat grid:
          //   <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          //     {visible.map((c) => <PathCard key={c.id} card={c} />)}
          //   </div>
          ⚠⚠ `grouped` is null while a search or a chip is filtering, and the
          flat grid is used then — see where it is computed for why.
        */
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
