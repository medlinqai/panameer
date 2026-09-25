import { Card } from "@/components/Card";

/**
 * ── ⚠⚠⚠ THE COPY CHANGED. RULING 18, 2026-09-24. ────────────────────────
 *
 * ⚠⚠ **RULING 18 BANS THIS COMPONENT'S OWN SENTENCE, IN TERMS:** *"the pages are
 * QUIET about what is unbuilt, not DISHONEST about what is countable. **No
 * "coming soon", no "we'll get there", and no fake zeros either.**"*
 * ⚠ SCOTT, 2026-09-24: *"None….we are in the process of building the
 * application…we just haven't gotten there. BUT we will get there before we
 * release to any customers."* ⚠⚠ **There are no customers. These pages are being
 * built, and a page that apologises for itself is telling a visitor about our
 * schedule instead of about their work.**
 *
 * ⚠⚠⚠ **MEASURED 2026-09-25: THIS ONE COMPONENT RENDERED THAT SENTENCE ON
 * TWENTY-FIVE PAGES.** `E611` had already removed four *"Coming soon"* sites by
 * hand — ⚠ **and the component that produces the other twenty-five was left
 * alone, which is `E585` exactly: one concept in N places, and the N+1th was the
 * shared one nobody looked at.**
 *
 * ── ⚠⚠ WHAT REPLACES IT, AND WHY IT IS THIS SHORT ───────────────────────
 *
 * ⚠ *"Nothing here yet."* is **true**, carries **no date, no promise and no
 * apology**, and is the same sentence `/orders` already uses for its honest empty
 * state — so the two stop disagreeing about how emptiness is said.
 * ⚠⚠ **IT DELIBERATELY DOES NOT SAY WHY.** The reason a given area is empty
 * differs per page — no writer, no rows, or not built — and **this component
 * cannot know which**, so a reason here would be a guess printed twenty-five
 * times. ⚠⚠⚠ A page that knows its own reason should say it ON THAT PAGE and not
 * use this component at all.
 *
 * ── ⚠⚠⚠ THE NAME IS NOW WRONG AND IS REPORTED, NOT RENAMED HERE ─────────
 *
 * ⚠ `ComingSoon` no longer says "coming soon", so the symbol lies about its own
 * copy — **the comment-contradicts-code trap, in a filename.**
 * ⚠⚠ **IT IS NOT RENAMED IN THIS BRIEF ON PURPOSE:** the rename touches all
 * twenty-five importing pages, and briefs 8, 9, 10 and 13 are queued against
 * those same files. **A twenty-five-file rename inside brief 7 is a collision
 * with four briefs to save one word.** ⚠ Recorded as owed; it is mechanical and
 * `tsc` finds every site.
 */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {/*
          ⚠ SUPERSEDED, quoted not deleted (`E164`) — banned by ruling 18:
          //   This area is coming soon.
        */}
        <p className="mt-2 text-black/60 dark:text-white/60">Nothing here yet.</p>
      </Card>
    </div>
  );
}
