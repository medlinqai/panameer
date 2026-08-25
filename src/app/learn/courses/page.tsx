import Link from "next/link";
import { getLearnHome } from "@/lib/learn-home";
import { PathCard } from "@/components/learn/PathCard";

/**
 * ── ⚠⚠ THE SIGNED-OUT CATALOG (`P1-J0-E316`, and it revisits `P1-J3-E223`) ──
 *
 * Scott clicked `Browse the Catalog` on `/learn` and got *"This area is coming
 * soon."* ⚠ BY HIS OWN RULE THAT IS THE WORST CLASS OF DEFECT ON THE SITE: a
 * visitor disproves a live button in four seconds and then distrusts the page.
 * This file WAS `return <ComingSoon title="All Courses" />`.
 *
 * ── ⚠ IT REVISITS A RECORDED CONSTRAINT RATHER THAN ROUTING AROUND IT ───────
 *
 * `app/learn/page.tsx` records `E223`: *"Signed out it is a SALES PAGE… and A
 * VISITOR NEVER SEES A CATALOG QUERY."* ⚠ THAT IS EXACTLY WHAT THIS PAGE DOES, so
 * it is a REVERSAL and it is deliberate — `brief_walk_fixes` WS8 calls for it and
 * the reason E223 gave (a sales page should sell, not browse) does not survive a
 * hero button that PROMISES the catalog. ⚠ `/learn` ITSELF IS UNCHANGED and is
 * still the sales page; this is the destination its button always claimed.
 *
 * ── ⚠ NO SECOND CARD COMPONENT, AND NO NEW QUERY ───────────────────────────
 *
 * `getLearnHome(userId)` ALREADY TAKES `string | null` — the signed-out case was
 * always supported, so this needed no new lib and no new type. `PathCard` is the
 * same card `/learn/paths` renders signed in, at `variant="full"`.
 *
 * ⚠ EVERY NUMBER ON THIS PAGE IS A LIVE READ. No seed counts, no invented copy,
 * and no certification claim — `P1-J3-E030`: 0 of 23 paths have a sittable test.
 *
 * ⚠ STATIC. It reads the database but never the request, so it prerenders `○`.
 */
export const metadata = {
  title: "All Courses · Panameer",
  description:
    "Every Panameer learning path, course and lesson — free, taught by the people who implement this software.",
};

export default async function AllCoursesPage() {
  /* ⚠ `null` IS THE SIGNED-OUT VIEWER. No enrolment state, no progress — the
     cards render their catalog face, which is what a visitor should see. */
  const cards = await getLearnHome(null);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <p className="font-body text-[19px] font-bold uppercase leading-[28.5px] tracking-[2.66px] text-magenta-ink">
        The Catalog
      </p>
      {/*
        ⚠ THE HEADLINE STATES THE ONE CLAIM THAT IS UNCONDITIONALLY TRUE — free.
        Every path, course and lesson is free today. The COUNTS come off the array
        this page just read, never from a constant, so the sentence cannot drift
        from what is rendered below it.
      */}
      <h1 className="mt-6 max-w-[1040px] text-wrap font-display text-[28px] font-bold leading-[1.14] tracking-[-0.5px] text-ink min-[900px]:text-[34px] min-[900px]:leading-[38.76px]">
        {cards.length} learning paths, taught by the people who implement this
        software — all free.
      </h1>

      {cards.length === 0 ? (
        /* ⚠ THE HONEST ZERO. It cannot happen today (23 paths are published) and
           it is here so the page degrades to a sentence rather than to a blank
           grid if the catalog is ever emptied. */
        <p className="mt-8 text-[17px] text-ink-2">
          No learning paths are published yet.
        </p>
      ) : (
        <div className="mt-9 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <PathCard
              key={card.slug}
              card={card}
              href={`/learn/${card.slug}`}
            />
          ))}
        </div>
      )}

      <Link
        href="/learn"
        className="mt-10 inline-block text-[15px] font-bold text-magenta-ink hover:text-magenta-ink-hover"
      >
        &larr; Back to Learn
      </Link>
    </div>
  );
}
