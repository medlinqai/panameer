import Link from "next/link";
import type { ReactNode } from "react";

export function CleanSection({
  title,
  action,
  id,
  open = true,
  /** A quiet right-hand fact — a count — where there is no action. */
  note,
  isEmpty = false,
  showWhenEmpty = false,
  count,
  children,
}: {
  title: string;
  action?: ReactNode;
  id?: string;
  open?: boolean;
  note?: string;
  isEmpty?: boolean;
  showWhenEmpty?: boolean;
  count?: number;
  children: ReactNode;
}) {
  const empty = count !== undefined ? count === 0 : isEmpty;
  if (empty && !showWhenEmpty) return null;
  return (
    <div className="relative">
    <details
      id={id}
      open={open}
      className="pm-clean-sec relative scroll-mt-24 border-t border-line"
    >
      <summary
        className="flex cursor-pointer list-none items-center gap-4 py-[22px] pr-24 [&::-webkit-details-marker]:hidden"
      >
        <h2 className="text-[19px] font-semibold tracking-[-0.01em]">
          {title}
          {}
          {count !== undefined && (
            <>
              {" "}
              <span data-count className="text-[15px] font-normal text-ink-2">
                ({count})
              </span>
            </>
          )}
        </h2>
        {}
        {}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="pm-clean-chev absolute right-0 top-[24px] h-4 w-4 shrink-0 stroke-ink-2"
          fill="none"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>
      <div className="pb-7">{children}</div>
    </details>
      {}
      {(action || note) && (
        <div className="absolute right-[34px] top-[23px] flex items-center gap-[18px]">
          {note && <span className="text-[13px] text-ink-2">{note}</span>}
          {action}
        </div>
      )}
    </div>
  );
}

export function CleanEdit({
  href,
  title,
  label = "Edit",
}: {
  href: string;
  title: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${label} ${title}`}
      className="text-[12px] font-semibold text-magenta-dark hover:underline"
    >
      {label}
    </Link>
  );
}

/**
 * ── ⚠⚠ THE THIN CHIP (`P2-A2-E713` WS-A item 4) ────────────────────────────
 *
 * ⚠ **Scott: *"thinner chips: 1px outline, small type"*.** ⚠⚠ Still magenta — **ruling
 * `31e` is unchanged and this does not reopen it.**
 * ⚠⚠⚠ **THE OUTLINE IS AN INSET `box-shadow`, NOT A `border`, AND THAT IS THE MOCKUP'S OWN
 * CHOICE:** a border adds 2px to the chip's box and shifts every neighbour, so a row of
 * chips reflows the moment the outline changes weight. An inset shadow paints inside the
 * same box. ⚠ Tailwind's arbitrary `shadow-[inset_0_0_0_1px_…]` is the direct translation.
 */
export const CLEAN_CHIP =
  "px-3 py-1 text-[12px] font-medium text-magenta-dark shadow-[inset_0_0_0_1px_var(--color-magenta)]";

/**
 * ⚠⚠ THE CLASS IS EXPORTED SEPARATELY BECAUSE `SkillsBody` TAKES A CLASS, NOT A COMPONENT.
 * ⚠ One string, two consumers (`E585`): this component for markup that draws its own chips,
 * and `chipClass` for the shared body that already has a `<span>` of its own.
 */
export function CleanChip({ children }: { children: ReactNode }) {
  return <span className={CLEAN_CHIP}>{children}</span>;
}

/**
 * ⚠⚠ A FLAT LEFT-COLUMN BLOCK (WS-A item 9) — Rates, Visibility, Rank Higher.
 *
 * ⚠ **Scott: those four *"lose their boxes too, and are separated by thin lines."***
 * ⚠⚠ The heading is a 12px uppercase eyebrow, and it carries its own optional `Edit` on
 * the right — the mockup's `.side h4` with `justify-content: space-between`.
 */
export function CleanSide({
  title,
  titleHref,
  action,
  children,
}: {
  title: string;
  /**
   * ── ⚠⚠ AN OPTIONAL DOOR ON THE LABEL (`P2-A2-E716`) ──────────────────────────
   *
   * ⚠ **SCOTT: the `SEARCH SCORE` label becomes a link to the Score tab.** ⚠⚠ **THE
   * SMALL-CAPS TREATMENT IS KEPT AND THAT IS EXPLICIT IN THE INSTRUCTION** — it stays a
   * 12px uppercase eyebrow and becomes magenta-ink, the colour `CleanEdit` already uses, so
   * every link in this column says *"link"* the same way (`E433`).
   * ⚠⚠⚠ **OPTIONAL, SO `Rates` IS UNTOUCHED.** `CleanSide` renders the Rates block too, and
   * its label is not a door — it has an `Edit` control instead. A required href would have
   * forced a destination on a block that does not want one.
   */
  titleHref?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const label = "text-[12px] font-semibold uppercase tracking-[0.08em]";
  return (
    /* ⚠ `pm-side` is the stable hook the phone layout needs: inside `pm-rail-top` the
       top rule and the 28px margin are suppressed, because there the block sits BESIDE
       the photo rather than under a divider (`E718` item 1). */
    <div className="pm-side mt-7 border-t border-line pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        {titleHref ? (
          /* ⚠ `<h4>` WRAPS THE LINK RATHER THAN THE LINK WRAPPING THE HEADING: the block still
             has a heading in the outline when the link is ignored, and a screen reader
             announces a link inside a heading rather than a heading that happens to be one. */
          <h4 className={label}>
            <Link href={titleHref} className="text-magenta-dark hover:underline">
              {title}
            </Link>
          </h4>
        ) : (
          <h4 className={`${label} text-ink-2`}>{title}</h4>
        )}
        {action}
      </div>
      {children}
    </div>
  );
}
