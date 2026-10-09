import type { ReactNode } from "react";

// M-E009: the L-E025 cover band — area-tone gradient with a large faded white code; reused on Home's choice cards.
export function CoverBand({ code, tone, className = "", children }: { code: string; tone: [string, string]; className?: string; children?: ReactNode }) {
  return (
    <span className={"relative flex items-end overflow-hidden px-3.5 py-3 text-white " + className} style={{ background: `linear-gradient(135deg, ${tone[0]}, ${tone[1]})` }}>
      <span aria-hidden className="absolute -right-2 -top-3 text-[72px] font-extrabold leading-none tracking-[-3px] opacity-[0.13]">{code}</span>
      {children && <span className="relative text-[11px] font-bold uppercase tracking-[0.1em]">{children}</span>}
    </span>
  );
}
