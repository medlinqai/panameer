"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LifecycleHelp } from "@/components/lifecycle/LifecycleHelp";

// Account menu top block: "Your Path · Step N of 9" (7 for buyers) + "?", a segment bar and "Next: … Go".
type Path = { current: number; done: boolean[]; status: string; next: { label: string; href: string } | null };

export function PathMenuBlock({ onNavigate, rowClass }: { onNavigate: () => void; rowClass: string }) {
  const [path, setPath] = useState<Path | null>(null);
  useEffect(() => {
    let live = true;
    fetch("/api/your-path")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => live && setPath(b?.path ?? null))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  return (
    <>
      {path && (
        <div data-path-menu={path.current + 1} className="border-b border-line px-4 py-3">
          {path.next ? (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-ink-2">
                YOUR PATH · STEP {path.current + 1} OF {path.done.length}
                <LifecycleHelp onOpen={onNavigate} />
              </p>
              <div className={"mt-1.5 grid gap-1 " + (path.done.length === 9 ? "grid-cols-9" : "grid-cols-7")} aria-hidden>
                {path.done.map((d, i) => (
                  <span key={i} className={"h-1.5 " + (d ? "bg-magenta" : i === path.current ? "bg-ink" : "bg-line")} />
                ))}
              </div>
              <p className="mt-2 flex items-center justify-between gap-3 text-[13px]">
                <span className="min-w-0 truncate">Next: {path.next.label}</span>
                <Link href={path.next.href} onClick={onNavigate} className="shrink-0 font-bold text-magenta-dark underline underline-offset-2">
                  Go
                </Link>
              </p>
            </>
          ) : (
            <p className="flex items-center gap-1.5 text-[13px] font-bold">
              ✓ Paid — every step is done <LifecycleHelp onOpen={onNavigate} />
            </p>
          )}
        </div>
      )}
      <Link href="/your-path" onClick={onNavigate} className={rowClass} data-menu-your-path>
        Your Path
      </Link>
    </>
  );
}
