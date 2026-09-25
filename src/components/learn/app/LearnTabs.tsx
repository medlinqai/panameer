import Link from "next/link";

/**
 * ── ⚠⚠⚠ LEARN'S TAB ROW — ONE COMPONENT, THREE PAGES (brief 9 WS-A) ─────
 *
 * ⚠ SCOTT, of `/learn/paths` and `/learn/<slug>`: *"It is wrong and there are
 * ZERO tabs."* ⚠⚠ **A member who clicks into the catalogue or a path loses
 * Learn's navigation entirely.**
 *
 * ── ⚠⚠⚠ THE PREMISE WAS OFF BY ONE STEP, AND IT MATTERS ────────────────
 *
 * ⚠ WS-A says *"`E617` built it for `/learn`. Do not write a second."* ⚠⚠
 * **MEASURED 2026-09-25: `E617` DID NOT BUILD A COMPONENT.** The row was
 * **hand-rolled inline inside `MyLearning.tsx`** — a `<nav>` with five children
 * written directly into one page's markup.
 * ⚠⚠⚠ **SO THE ROW WAS NEVER "MISSING" FROM THE OTHER TWO PAGES: THERE WAS
 * NOTHING TO MOUNT.** That is not a layout boundary and not an omission — it is
 * `E585` again, the same shape as the pattern header: one concept, written in
 * place, and therefore unavailable to the next page that needed it.
 * ⚠ **The extraction had to happen before the mounting could.** Reported rather
 * than quietly done, because the brief's own instruction assumed otherwise.
 *
 * ── ⚠⚠ WHAT IS PRESERVED EXACTLY ───────────────────────────────────────
 *
 * ⚠ Every class, the `LEARN` eyebrow with its `border-right` divider, the
 * `overflow-x-auto` that lets five tabs scroll on a phone, and the rule that
 * ⚠⚠ **THE ACTIVE TAB IS A `<span>`, NOT A `<Link>` TO ITSELF** — a link to the
 * page you are standing on is the defect `E023` named.
 * ⚠⚠ **`Teaching` RENDERS ONLY FOR SOMEBODY WHO TEACHES** — rule 5: a card hides
 * when the CAPABILITY is absent, never when a count is zero.
 *
 * ⚠⚠⚠ **`Certificates` AND `Teaching` ARE IN-PAGE ANCHORS AND ONLY EXIST ON
 * `/learn`.** ⚠ On the catalogue and a path there is no `#certificates` to jump
 * to, so they are rendered as LINKS BACK to `/learn#certificates` rather than as
 * anchors into a page that has no such section — **an anchor to an id that is not
 * on the page is a control that does nothing, which is `E579`.**
 */
export type LearnTab = "my-learning" | "paths" | "courses";

const TAB = "shrink-0 whitespace-nowrap border-b-2 py-[14px] text-[13.5px] font-semibold";
const IDLE = `${TAB} border-transparent text-ink-2 hover:text-magenta`;
const ACTIVE = `${TAB} border-magenta text-magenta-ink`;

export function LearnTabs({
  active,
  /** ⚠ Capability, not a count — see the docblock. */
  teaches,
  /**
   * ⚠⚠ TRUE ONLY ON `/learn`, where the two anchored sections actually exist.
   * ⚠ Off it, the same two become links back to that page.
   */
  onLearnHome = false,
}: {
  active: LearnTab;
  teaches: boolean;
  onLearnHome?: boolean;
}) {
  const anchor = (id: string) => (onLearnHome ? `#${id}` : `/learn#${id}`);

  return (
    /*
      ── ⚠⚠⚠ IT WRAPS. `E609`, AND THE ACTIVE TAB IS WHY (brief 9, 53d) ──────

      ⚠⚠ **MEASURED AT 390px ON `/learn/courses`: THE ACTIVE TAB WAS OFF-SCREEN.**
      The row is `LEARN · My Learning · Learning Paths · Courses · Certificates`
      and only the first three fitted — so on the page whose own tab is fourth,
      **the member saw a tab row with nothing lit in it.**
      ⚠⚠⚠ **THAT IS WORSE THAN THE SLICED WORD `E609` RULED ON.** A cut-off label
      is a legibility problem; **a row where the current tab is invisible is a row
      that answers "where am I" with silence** — and `E625` is this same run
      fixing a row that answered it with the WRONG page.
      ⚠ `PageTabs` keeps its scroller and has a recorded reason: it relies on the
      browser scrolling the active tab into view, and making it a client
      component to do that in JS was rejected at `E378` WS-5. ⚠⚠ **WRAPPING GETS
      THE SAME OUTCOME WITH NO JAVASCRIPT AT ALL** — every tab is on screen, so
      there is nothing to scroll to.
      ⚠ SUPERSEDED, quoted not deleted (`E164`):
      //   className="flex items-center gap-[26px] overflow-x-auto border-b border-line bg-white px-5 sm:px-6"
    */
    <nav className="flex flex-wrap items-center gap-x-[26px] border-b border-line bg-white px-5 sm:px-6">
      <span className="shrink-0 border-r border-line py-[14px] pr-[22px] font-display text-[12px] font-bold tracking-[0.12em] text-ink">
        LEARN
      </span>

      {active === "my-learning" ? (
        <span className={ACTIVE}>My Learning</span>
      ) : (
        <Link href="/learn" className={IDLE}>
          My Learning
        </Link>
      )}

      {active === "paths" ? (
        <span className={ACTIVE}>Learning Paths</span>
      ) : (
        <Link href="/learn/paths" className={IDLE}>
          Learning Paths
        </Link>
      )}

      {active === "courses" ? (
        <span className={ACTIVE}>Courses</span>
      ) : (
        <Link href="/learn/courses" className={IDLE}>
          Courses
        </Link>
      )}

      <a href={anchor("certificates")} className={IDLE}>
        Certificates
      </a>

      {teaches && (
        <a href={anchor("teaching")} className={IDLE}>
          Teaching
        </a>
      )}
    </nav>
  );
}
