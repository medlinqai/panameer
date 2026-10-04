import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-1.5 inline-flex items-center gap-1 text-[14px] font-semibold text-magenta-ink transition-colors hover:text-magenta-ink-hover hover:underline"
    >
      <span aria-hidden>‹</span>
      Back to {label}
    </Link>
  );
}
