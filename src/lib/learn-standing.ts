/**
 * ── ⚠⚠⚠ A PURE MODULE, AND THE REASON IS A BUILD ERROR I CAUSED ─────────
 *
 * ⚠ This derivation first lived in `learn-home.ts`. ⚠⚠ **`PathCard` IS A CLIENT
 * COMPONENT, SO IMPORTING IT FROM THERE PULLED `prisma` — AND THE WHOLE `pg`
 * DRIVER — INTO THE BROWSER BUNDLE**, and the build failed with
 * *"Module not found: Can't resolve 'dns'"*.
 *
 * ⚠⚠⚠ **`tsc` WAS CLEAN. THE SCREENSHOT IS WHAT CAUGHT IT** — the page rendered
 * Next's build-error overlay, which is why the rule is *look at it*, not *trust
 * the typecheck*.
 *
 * ⚠ **SO A DERIVATION A CLIENT COMPONENT NEEDS LIVES IN A MODULE THAT TOUCHES NO
 * DATABASE.** Nothing is imported here on purpose: the type is structural, so
 * this file has no dependency on `learn-home.ts` at all and cannot acquire one
 * by accident.
 */

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠⚠⚠ THE CARD'S STANDING — brief 9 WS-B item 5
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * ⚠⚠⚠ **THE SUBSTANTIVE GAP IN THE CATALOGUE, IN SCOTT'S OWN WORDS:** *"Each
 * card states your standing (done, %, test ready, or enroll), so this page
 * doubles as 'what's next.'"*
 *
 * ⚠ Before this, a card showed a badge (`Enrolled` / `Complete`) and a bar, but
 * **no action matching where the member actually stood** — so the catalogue told
 * you where you were and not what to do about it.
 *
 * ⚠⚠ **ONE DERIVATION, ONE PLACE** (`E585`). The card, the gate and any future
 * surface ask THIS — a second copy in a component is how two screens start
 * disagreeing about whether somebody has finished.
 *
 * ── ⚠⚠⚠ `TEST_READY` IS NOT A PERMISSION (ruling 54) ───────────────────
 *
 * ⚠ SCOTT, 2026-09-25: *"we used to require you to watch the classes to get the
 * test...but that changed in this version."* ⚠⚠ **The test is open to anyone at
 * any time.** This standing means *"you have finished the lessons AND the
 * question set is published"* — it is the most useful NEXT step for that member,
 * **never a gate that has opened.** ⚠⚠⚠ A member at 0% may still sit the test;
 * `AppPath` carries that door and `E627` put it there.
 */
export type PathStanding = "done" | "in-progress" | "test-ready" | "not-started";

export type StandingView = {
  standing: PathStanding;
  /** ⚠ ONE action, matching the standing. Never two. */
  action: string;
};

export function standingFor(card: {
  enrolled: boolean;
  progress: number | null;
  testReady: boolean;
}): StandingView {
  const complete = card.progress === 100;

  /* ⚠⚠ ORDER MATTERS AND IS THE WHOLE RULE: a COMPLETE path whose test is
     published offers the TEST, not `Review`. ⚠ Reviewing is what is left when
     there is no test to sit — so the test branch must be tested first, or the
     most useful action on the page is never the one offered. */
  if (complete && card.testReady) return { standing: "test-ready", action: "Take the Test" };
  if (complete) return { standing: "done", action: "Review" };
  if (card.enrolled) return { standing: "in-progress", action: "Continue" };
  return { standing: "not-started", action: "Enroll" };
}
