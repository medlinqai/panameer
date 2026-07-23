import type { ReactNode } from "react";

/** A surface panel — the base container for dashboard + profile sections. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl border border-black/10 bg-black/[0.015] p-6 " +
        "dark:border-white/10 dark:bg-white/[0.02] " +
        className
      }
    >
      {children}
    </div>
  );
}
