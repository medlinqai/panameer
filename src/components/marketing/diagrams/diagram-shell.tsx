import type { ReactNode } from "react";

/**
 * THE SHELL BOTH SPINE DIAGRAMS SHARE (`P1-J0-E335`).
 *
 * ⚠⚠ IT EXISTS FOR ONE REASON: THE PAGE BODY MUST NEVER SCROLL SIDEWAYS. The
 * diagrams are 1110 units wide and a `StepDisclosures` panel is not — MEASURED
 * on `/integrate` before either was built:
 *
 *     viewport   panel content width
 *       1440           1128px      <- 1110 fits, 18px of slack
 *        900            828px
 *        390            318px
 *
 * ⚠ SO 1440 IS THE ONLY WIDTH WHERE THEY FIT, AND THAT IS ALMOST CERTAINLY WHY
 * SCOTT SIZED THEM 1110. Below it the DIAGRAM scrolls inside this box; the
 * document does not. `overflow-x: auto` here plus `min-w-[1110px]` on the svg is
 * the whole mechanism.
 *
 * ⚠⚠ `min-w-[1110px]` IS LOAD-BEARING AND IT IS NOT A "MINIMUM SIZE" TWEAK. The
 * `viewBox` is 1110 units wide, so at exactly 1110 CSS px the scale is 1.000 and
 * every label renders at ITS AUTHORED SIZE. Let it shrink to fit 828 or 318 and
 * the whole type scale shrinks with it — the mockup's 11px node labels become
 * 8.2px at 900 and 3.1px at 390. ⚠ THE BRIEF FORBIDS SOLVING WIDTH BY SHRINKING
 * TYPE BELOW 10px, and scaling the svg is exactly that with extra steps.
 *
 * ⚠ THE MOCKUP'S OWN `min-width` WAS 1000px, WHICH WOULD HAVE SCALED TO 0.901 AND
 * QUIETLY SHRUNK EVERY LABEL. 1110 is the faithful value; this is the one number
 * that is deliberately NOT ported as written.
 *
 * ⚠ NO NEW GLOBAL CSS. Tailwind only, and no image files — inline `<svg>` so the
 * diagrams stay sharp at any zoom and inherit nothing they should not.
 *
 * ⚠⚠ `p-2` (8px), NOT THE MOCKUP'S `padding:10px`, AND THE 2px MATTERS. At 1440
 * the panel gives 1128px; 10px of padding each side leaves 1108 for a 1110px
 * board, so THE DESIGN WIDTH ITSELF SCROLLED BY 2px. Measured, not predicted.
 * 8px leaves 1112 and it fits. ⚠ THIS IS THE SHELL'S OWN CHROME, NOT SCOTT'S
 * GEOMETRY — no coordinate inside either svg moved.
 */
export function DiagramShell({
  label,
  children,
}: {
  /** Accessible name for the scroll region — a scrollable box needs one. */
  label: string;
  children: ReactNode;
}) {
  return (
    /*
      ⚠ `tabIndex={0}` + `role="group"`: a keyboard user must be able to scroll
      this box. An `overflow-x: auto` div with no focusable content is
      unreachable without a pointer, which is a real WCAG 2.1.1 failure and not
      a cosmetic one. ⚠ IT IS NOT A CONTROL — no `onClick`, nothing inside a
      `<summary>` (`E097`), so it cannot eat the Enter that opens the panel.
    */
    <div
      role="group"
      aria-label={label}
      tabIndex={0}
      className="mt-6 overflow-x-auto rounded-[20px] border border-line bg-white p-2 shadow-[0_1px_2px_rgba(24,30,60,.05),0_14px_36px_-20px_rgba(24,30,60,.3)]"
    >
      {children}
    </div>
  );
}
