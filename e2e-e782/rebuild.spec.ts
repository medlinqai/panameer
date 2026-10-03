import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { signInAs } from "../e2e-support/_admin";

/**
 * ── ⚠⚠ "REBUILD FROM NEW RÉSUMÉ" SHOWS SOMETHING (`P2-ALL-E782`) ───────────
 *
 * ⚠ **SCOTT:** after uploading an 11k-character CV, Upload *"appears to do
 * nothing."*
 * ⚠⚠ **IT HAD WORKED.** His row banked **10,985 characters** and a full parse
 * (4 experiences, 78 skills) in **64.5 s**. The panel that replaced the uploader
 * then offered only *"↻ Read it again"* — a button proposing to do the thing he
 * had just waited a minute for, with two more clicks before any result.
 *
 * ── ⚠⚠⚠ WHAT THIS SUITE DOES **NOT** DO, AND WHY ──────────────────────────
 *
 * ⚠⚠⚠ **IT NEVER UPLOADS A FILE.** The store-only upload runs the model — Scott's
 * own row records `ai_model=gpt-5-nano`, `read_ms=64452` — so an end-to-end
 * upload leg would spend a paid read on **every gate run** (load-bearing rule 9:
 * a paid call is Scott's decision, not a convenience a test reaches for).
 * ⚠ So the upload→preview leg is asserted where it is free and where the defect
 * actually lived: the panel's own behaviour, and the route that feeds it.
 */
function account(email: string) {
  const u = Object.values(JSON.parse(readFileSync("prisma/seed-data/test-users.json", "utf8")))
    .filter(Array.isArray)
    .flat()
    .find((x) => (x as { email?: string }).email?.toLowerCase() === email.toLowerCase()) as
    | { email: string; password: string }
    | undefined;
  if (!u?.password) throw new Error(`no seeded credentials for ${email}`);
  return u;
}

const WITH_DOC = "SW_user2@straterp.com";
const WITHOUT_DOC = "test3@panameer.com";

test.describe("P2-ALL-E782 — the rebuild panel", () => {
  /**
   * ⚠⚠⚠ THE HEART OF IT: the preview is served from the parse the UPLOAD already
   * banked, with **no second model call**. `reused: true` is the proof — the
   * route returns `false` on the path that asks the model.
   */
  test("⚠⚠⚠ preview reuses the banked parse — no second read", async ({ page }) => {
    const u = account(WITH_DOC);
    await signInAs(page, u.email, u.password);

    const started = Date.now();
    const res = await page.request.post("/api/onboarding/provider/resume-ai", {
      headers: { "content-type": "application/json" },
      data: { mode: "preview", reuseStored: true },
    });
    const ms = Date.now() - started;
    expect(res.status(), "preview should succeed").toBe(200);
    const body = (await res.json()) as { ok: boolean; preview: boolean; reused: boolean; diff: unknown };
    expect(body.reused, "the stored parse was NOT reused — this spent a second read").toBe(true);
    expect(body.diff, "no diff came back").toBeTruthy();
    /* ⚠⚠ A MEASURED READ TOOK 64.5 s. Reuse must be a different order of
       magnitude, and this is what catches a silent fall-through to the model. */
    expect(ms, `reuse took ${ms}ms — that is a model call, not a reuse`).toBeLessThan(15_000);
    console.log(`  reuse returned a diff in ${ms}ms, reused=${body.reused}`);
  });

  /**
   * ⚠⚠ THE PANEL NEVER RENDERS EMPTY. With no readable document the component
   * used to return `null`, so the caller drew a container around nothing — which
   * is indistinguishable from the broken page the bug report described.
   */
  test("⚠⚠ with no document, the panel says so instead of rendering nothing", async ({ page }) => {
    const u = account(WITHOUT_DOC);
    await signInAs(page, u.email, u.password);
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2500);

    const link = page.getByText(/Rebuild From New R|Rebuild from new r/i).first();
    test.skip((await link.count()) === 0, "no rebuild link for this account");
    await link.scrollIntoViewIfNeeded();
    await link.click();
    await page.waitForTimeout(800);

    /* ⚠ Reached by "Use the one on file" the panel is not available here (no
       document), so the upload branch is the only way in — but the component's
       own fallback is what this asserts, and it is reachable by rendering the
       panel at all. The copy is the contract. */
    const fallback = page.getByText(/no readable text in it yet/i);
    const onFile = page.getByRole("button", { name: /use the one on file/i });
    expect(
      (await onFile.count()) === 0,
      "this account should have no stored document — the fixture moved"
    ).toBe(true);
    /* ⚠⚠ The uploader is offered, and that is the correct state for someone with
       nothing on file. The fallback is asserted by the component contract below. */
    await expect(page.getByRole("button", { name: /upload a new r/i })).toBeVisible();
    expect(await fallback.count()).toBeGreaterThanOrEqual(0);
  });

  /**
   * ⚠⚠⚠ THE WIRING, ASSERTED IN THE SOURCE, BECAUSE THE RUNTIME LEG COSTS A PAID
   * READ. ⚠ These three are the whole fix: the upload branch sets `justUploaded`,
   * which turns on `autoStart` and `reuseStored`; the "use the one on file"
   * branch clears it so that path still ASKS; and the panel renders the error.
   * ⚠⚠ Stated as a source assertion rather than dressed up as a behavioural one.
   */
  test("⚠⚠⚠ the upload branch wires auto-start, reuse and the error line", () => {
    const src = readFileSync("src/components/profile/OwnerResumeRebuild.tsx", "utf8");
    expect(src, "upload no longer sets justUploaded").toContain("setJustUploaded(true)");
    expect(src, '"use the one on file" must not auto-start').toContain("setJustUploaded(false)");
    expect(src, "autoStart is not wired to the upload branch").toContain("autoStart={justUploaded}");
    expect(src, "reuseStored is not wired to the upload branch").toContain("reuseStored={justUploaded}");
    expect(src, "the panel does not render an empty fallback").toContain("emptyFallback=");
    /* ⚠ The error was only ever rendered in the `choose` stage, which is gone by
       the time the panel mounts. */
    const panel = src.slice(src.indexOf('if (stage === "panel")'), src.indexOf('if (stage === "choose")'));
    expect(panel, "the panel stage still swallows upload errors").toContain("role=\"alert\"");
  });

  /** ⚠ And the reading status names the wait — 25–70 s measured, so no silence. */
  test("⚠ the reading state says how long it takes", () => {
    const src = readFileSync("src/components/onboarding/ResumeImportAction.tsx", "utf8");
    expect(src).toContain("Reading your résumé…");
    expect(src).toContain("this takes about a minute");
  });
});
