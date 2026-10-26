"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// WK-E004/E005: an app without a tab row — "← {App} › {Page}" on top, "Also in {App}: …" at the bottom; the home shows neither.
export function AppFrame({ app, home, pages, children }: { app: string; home: string; pages: [string, string][]; children: ReactNode }) {
  const path = usePathname() ?? "";
  const here = pages.find(([, h]) => path === h || path.startsWith(`${h}/`));
  if (path === home || !here) return <>{children}</>;
  const others = pages.filter(([, h]) => h !== here[1]);
  return (
    <>
      <p className="mx-auto w-full max-w-6xl px-4 pt-4 text-[13px] font-semibold text-ink-2 sm:px-6" data-app-crumb>
        <Link href={home} className="hover:text-ink">← {app}</Link><span className="text-ink-3"> › {here[0]}</span>
      </p>
      {children}
      <p className="mx-auto mt-8 w-full max-w-6xl border-t border-line px-4 pb-6 pt-4 text-[13px] text-ink-2 sm:px-6" data-also-in>
        Also in {app}: {others.map(([l, h], i) => <span key={h}>{i > 0 && " · "}<Link href={h} className="font-semibold text-ink hover:underline">{l}</Link></span>)}
      </p>
    </>
  );
}
