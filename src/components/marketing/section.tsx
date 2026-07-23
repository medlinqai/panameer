import type { ReactNode } from "react";

/** Shared marketing typography bits, matching the mockup. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-2.5 text-[13px] font-extrabold uppercase tracking-[0.06em] text-magenta">
      {children}
    </p>
  );
}

export function H2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-3 text-[28px] font-extrabold tracking-[-0.8px] sm:text-[36px]">
      {children}
    </h2>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return (
    <p className="mb-[34px] max-w-[640px] text-[18px] text-ink-2">{children}</p>
  );
}
