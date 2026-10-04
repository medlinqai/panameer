import type { ReactNode } from "react";

export function DiagramShell({
  label,
  children,
}: {
  /** Accessible name for the scroll region — a scrollable box needs one. */
  label: string;
  children: ReactNode;
}) {
  return (
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
