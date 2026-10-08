"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LifecycleHelp } from "@/components/lifecycle/LifecycleHelp";

// Account menu top block: "Your Path · Step N of 9" (7 for buyers) + "?", a segment bar and "Next: … Go".
type Path = { current: number; done: boolean[]; status: string; next: { label: string; href: string } | null };

// Fetched once per page load (prefetched when the header mounts), so the
// menu opens with the path already in place instead of popping in and
// shifting the rows under the cursor.
let cached: Path | null | undefined;
let inflight: Promise<Path | null> | null = null;
export function prefetchPath(): Promise<Path | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  inflight ??= fetch("/api/your-path")
    .then((r) => (r.ok ? r.json() : null))
    .then((b) => (cached = (b?.path ?? null) as Path | null))
    .catch(() => (cached = null));
  return inflight;
}

export function PathMenuBlock({ onNavigate, rowClass }: { onNavigate: () => void; rowClass: string }) {
  const [path, setPath] = useState<Path | null | undefined>(cached);
  useEffect(() => {
    let live = true;
    void prefetchPath().then((p) => live && setPath(p));
    // Quietly refresh in case the member moved a step since the page loaded.
    if (cached !== undefined) {
      fetch("/api/your-path")
        .then((r) => (r.ok ? r.json() : null))
        .then((b) => { if (b) { cached = (b.path ?? null) as Path | null; if (live) setPath(cached); } })
        .catch(() => {});
    }
    return () => {
      live = false;
    };
  }, []);
  return (
    <>
      {/* Same height as the block while it loads — nothing below moves. */}
      {path === undefined && <div aria-hidden className="h-[86px] border-b border-line" />}
      {path && (
        <div data-path-menu={path.current + 1} className="border-b border-line px-4 py-3">
          {path.next ? (
            <>
              <p className="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.1em] text-ink-2">
                {/* The graphic is the Your Path entry — its title opens the full page (no separate menu row). */}
                <Link href="/your-path" onClick={onNavigate} className="hover:underline">YOUR PATH · STEP {path.current + 1} OF {path.done.length}</Link>
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
              <Link href="/your-path" onClick={onNavigate} className="hover:underline">✓ Paid — every step is done</Link> <LifecycleHelp onOpen={onNavigate} />
            </p>
          )}
        </div>
      )}
    </>
  );
}
