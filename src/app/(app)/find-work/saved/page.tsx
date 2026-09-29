import { guardPage } from "@/lib/guard";
import { redirect } from "next/navigation";

/**
 * ── ⚠⚠⚠ NOT BUILT, AND THE REASON IS A MISSING WRITER (`P2-ALL-E708`) ───────
 *
 * ⚠⚠⚠ **THERE IS NO MODEL THAT RECORDS A SAVE. MEASURED 2026-09-29: NO `Saved*`
 * MODEL IN THE SCHEMA AND NO WRITER ANYWHERE IN `src/`** — `work-feed.ts` already
 * verified this **by behaviour** rather than by name, and it is the one of its three
 * claims that turned out **TRUE**: *"saved — nothing records a save."*
 *
 * ⚠⚠ **SO THIS PAGE IS DELIBERATELY NOT BUILT, PER THE BRIEF'S OWN RULE:** *"a page
 * whose data has no writer must not be built to show an empty list dressed as a
 * feature — report it and skip it."* ⚠ Building it would need a new model, and **only
 * item 1 of this run touches the schema**, so a migration here is a finding, not a
 * task.
 *
 * ── ⚠ WHY IT STILL REDIRECTS RATHER THAN KEEPING THE PLACEHOLDER ────────────
 *
 * ⚠ **`E216` ALREADY GAVE THIS VIEW A TAB** — *"'My Work Requests (Saved)' IS Saved
 * Work"* — and that tab renders `UNBACKED_TABS.saved`, the string **"Not listed
 * yet"**. ⚠⚠ **THAT IS THE SAME HONEST EMPTY STATE THE PLACEHOLDER GAVE, INSIDE THE
 * REAL FEED INSTEAD OF INSTEAD OF IT**, so the member lands among the five views that
 * do work rather than on a dead card.
 * ⚠⚠⚠ **THE REDIRECT CREATES NO CAPABILITY AND CLAIMS NONE.** Nothing here implies a
 * save is possible; the tab says it is not listed, and that remains true until
 * somebody rules on a save model.
 * ⚠ Ruling 18 governs that string — no roadmap confession, no promise, no date, and
 * nothing that blames the member. **Do not "improve" it into an apology.**
 * ⚠ Full reasoning for the redirect pattern: `find-work/for-my-skills/page.tsx`.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`):
 * //   export const metadata = { title: "My Work Requests (Saved) · Panameer" };
 * //   return <ComingSoon title="My Work Requests (Saved)" />;
 */
export default async function Page() {
  await guardPage("canProvideServices");
  redirect("/find-work?tab=saved");
}
