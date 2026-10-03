/**
 * ── ⚠⚠⚠ RETIRED BY `P2-ALL-E785`, QUOTED NOT DELETED (`E164`) ───────────────
 *
 * ⚠ **ITS SUBJECT IS GONE FROM THE PAGE IT GUARDED.** `E774` hid the internal
 * `Panameer Build` stage from the public current-phase stage list on `/status`.
 * `E785` removed that whole section: `/status` renders the Build Plan now, and a
 * plan row has a STATUS, not a stage — so there is no stage list to hide a stage
 * from.
 *
 * ⚠⚠ **WHAT IT ASSERTED IS NOT LEFT UNGUARDED, AND THAT MATTERED MORE THAN THE
 * FILE.** `PUBLIC_HIDDEN_STAGES` and the filter in `public-view.ts` are
 * BYTE-UNCHANGED, `/api/status` still serves `currentPhaseStages`, and
 * `e2e-tracker/lane-b.spec.ts` still asserts that payload and still runs the
 * leak tests over it. ⚠ So the rule survives its gate (ruling 14).
 *
 * ⚠ RETIRED RATHER THAN DELETED so the reasoning reads, and so nobody
 * reintroduces the stage on a future public surface believing it was never
 * hidden. ⚠⚠ The body below is the whole original file, as LINE comments — a
 * nested block comment would end this one early (load-bearing rule 12).
 *
 * ⚠ Scott approved the retirement explicitly, 2026-10-03.
 */

// import { test, expect } from "@playwright/test";
// import { adminAccount, signInAs } from "../e2e-support/_admin";
// import { openPhase } from "../e2e-tracker/_open";
// 
// /**
//  * ── ⚠⚠ `Panameer Build` LEAVES THE PUBLIC STAGE LIST (`P2-ALL-E774`) ───────
//  *
//  * ⚠ Scott: it reads *"0% · In Progress"* and is the one row that says nothing.
//  * ⚠⚠⚠ **IT IS HIDDEN BECAUSE EVERYTHING IN IT IS ALREADY ON THE PAGE** — 12
//  * tasks, all `PNM-*`: the ten journeys (own grid) and the Milestones pair (own
//  * section). Not because 0% looks bad.
//  */
// test.describe("P2-ALL-E774 — the hidden stage", () => {
//   test("⚠⚠ it is absent from the public list, and the figures do not move", async ({
//     request,
//   }) => {
//     const body = (await (await request.get("/api/status")).json()) as {
//       currentPhaseStages: { name: string }[];
//       taskCount: number;
//       doneCount: number;
//       movingCount: number;
//       overallPercent: number | null;
//     };
//     const names = body.currentPhaseStages.map((s) => s.name);
//     expect(names, "Panameer Build is still in the public stage list").not.toContain("Panameer Build");
//     /* ⚠⚠⚠ A HIDDEN STAGE STILL COUNTS. Its twelve tasks are real work, so they
//        stay in every figure; if hiding the row ever starts subtracting from the
//        totals, this is what catches it. */
//     expect(body.taskCount, "the whole catalog is still counted").toBe(212);
//     expect(body.doneCount + body.movingCount, "done + moving unchanged by hiding a row")
//       .toBeGreaterThan(0);
//     console.log(
//       `  stages ${JSON.stringify(names)} · taskCount ${body.taskCount} · overall ${body.overallPercent}%`
//     );
//   });
// 
//   test("⚠ the page does not render it either", async ({ page }) => {
//     await page.setViewportSize({ width: 1440, height: 1200 });
//     await page.goto("/status", { waitUntil: "domcontentloaded" });
//     await expect(page.getByText("Panameer Build", { exact: true })).toHaveCount(0);
//   });
// 
//   /**
//    * ⚠⚠⚠ THE HALF THAT MAKES IT A HIDE AND NOT A DELETE. Scott: *"Admin keeps
//    * it."* `stagesForPhase()` is shared, so the filter had to live at the public
//    * read — and this is what proves it did.
//    */
//   test("⚠⚠⚠ the admin Builder still has it", async ({ page }) => {
//     const a = adminAccount();
//     await signInAs(page, a.email, a.password);
//     await page.setViewportSize({ width: 1440, height: 1200 });
//     await page.goto("/admin/work-tracker", { waitUntil: "domcontentloaded" });
//     await openPhase(page, "Build");
//     await expect(page.getByText("Panameer Build").first()).toBeVisible();
//   });
// });
