import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The console button standard (E217).
 *
 * ONE RULE, AND IT IS A RULE ABOUT ROWS, NOT ABOUT BUTTONS: a row of actions
 * has AT MOST ONE solid magenta. Everything else in it is a ghost outline or a
 * plain text link. Two solid primaries side by side is not emphasis, it is the
 * absence of a decision — the reader has to work out which one you meant, which
 * is the job the fill was doing.
 *
 * The failure mode this was written for is subtler than two identical buttons:
 * it is a DISABLED primary sitting next to a live one, faded to 35% and still
 * the loudest thing in the row. A control that is both unavailable and dominant
 * is worse than either. Disabled goes ghost.
 *
 * This exists so the rule has a home. It is not a migration of every button in
 * the app — most are already correct, and rewriting hundreds of working call
 * sites to prove a point is how you introduce regressions in surfaces nobody
 * asked you to touch. New action rows use this; the existing ones that violated
 * the rule were fixed where they were.
 */
export type ButtonVariant = "primary" | "ghost" | "quiet";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 " +
  "text-[14.5px] font-bold transition-colors disabled:cursor-not-allowed";

const TONE: Record<ButtonVariant, string> = {
  /** At most one of these per row. */
  primary:
    "bg-magenta text-white hover:bg-magenta-dark disabled:bg-magenta/40 disabled:hover:bg-magenta/40",
  ghost:
    "border-[1.5px] border-line text-ink hover:border-magenta hover:text-magenta disabled:opacity-60 disabled:hover:border-line disabled:hover:text-ink-2",
  /** A text link that happens to be a button — the third-choice action. */
  quiet:
    "px-0 text-ink-2 underline underline-offset-4 hover:text-magenta disabled:opacity-60",
};

export function Button({
  children,
  href,
  variant = "primary",
  disabled,
  onClick,
  type = "button",
  title,
  className = "",
}: {
  children: ReactNode;
  href?: string;
  variant?: ButtonVariant;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  title?: string;
  className?: string;
}) {
  const cls = `${BASE} ${TONE[variant]} ${className}`;

  /*
    A disabled LINK is rendered as a disabled button, not as an <a> with a
    handler swallowed. An anchor with href still navigates on middle-click and
    still reads as a link to a screen reader, however much CSS says otherwise.
  */
  if (href && !disabled) {
    return (
      <Link href={href} title={title} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={cls}>
      {children}
    </button>
  );
}
