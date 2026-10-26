import type { ReactNode } from "react";

// WS-E002 / WK-E003: the Work area — a white page; no tab row (← Work and Also in Work replace it).
export default function WorkLayout({ children }: { children: ReactNode }) {
  return <div className="pm-white-page">{children}</div>;
}
