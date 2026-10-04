import type { ReactNode } from "react";

export function LegalLink({
  href,
  children,
  className = "font-semibold text-magenta hover:underline",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}
