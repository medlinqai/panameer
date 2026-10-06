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

/** THE THIN CHIP WS-A item 4) */
export const CLEAN_CHIP =
  "px-3 py-1 text-[12px] font-medium text-magenta-dark shadow-[inset_0_0_0_1px_var(--color-magenta)]";

/** THE CLASS IS EXPORTED SEPARATELY BECAUSE `SkillsBody` TAKES A CLASS, NOT A COMPONENT. */
export function CleanChip({ children }: { children: ReactNode }) {
  return <span className={CLEAN_CHIP}>{children}</span>;
}

/** A FLAT LEFT-COLUMN BLOCK (WS-A item 9) — Rates, Visibility, Rank Higher. */
export function CleanSide({
  title,
  titleHref,
  action,
  children,
}: {
  title: string;
  /** AN OPTIONAL DOOR ON THE LABEL */
  titleHref?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const label = "text-[12px] font-semibold uppercase tracking-[0.08em]";
  return (
    // top rule and the 28px margin are suppressed, because there the block sits BESIDE
    <div className="pm-side mt-7 border-t border-line pt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        {titleHref ? (
          // has a heading in the outline when the link is ignored, and a screen reader
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
