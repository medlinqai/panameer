import Link from "next/link";
import type { ReactNode } from "react";

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
