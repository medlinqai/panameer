"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { CatCourse } from "@/lib/learn-catalog";
import { timeLabel } from "@/lib/learn-time";
import { StatusMark } from "@/components/learn/StatusMark";

// What's Inside: courses as rows with marks; the current course open; click to open/close in place (#course-<slug> opens one).
export function WhatsInside({ slug, courses, nextLessonId, canPlay }: { slug: string; courses: CatCourse[]; nextLessonId: string | null; canPlay: boolean }) {
  const current = courses.find((c) => c.lessons.some((l) => l.id === nextLessonId))?.slug ?? null;
  const [open, setOpen] = useState<Set<string>>(new Set(current ? [current] : []));
  useEffect(() => {
    const fromHash = () => {
      const m = window.location.hash.match(/^#course-(.+)$/);
      if (m) setOpen((o) => new Set([...o, decodeURIComponent(m[1])]));
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  const toggle = (s: string) => setOpen((o) => { const n = new Set(o); if (n.has(s)) n.delete(s); else n.add(s); return n; });
  return (
    <ol data-whats-inside className="mt-2">
      {courses.map((c, ci) => {
        const state = c.lessons.length && c.done === c.lessons.length ? "done" : c.slug === current ? "now" : "todo";
        const isOpen = open.has(c.slug);
        return (
          <li key={c.id} id={`course-${c.slug}`} className="scroll-mt-24 border-b border-line">
            <button type="button" aria-expanded={isOpen} onClick={() => toggle(c.slug)} className="flex w-full items-center gap-3 py-3 text-left">
              <StatusMark state={state} />
              <span className="min-w-0 flex-1">
                <b className="block text-[14.5px]">{ci + 1} · {c.title}</b>
                <span className="block text-[12.5px] text-ink-3">{c.done} of {c.lessons.length}{c.minutes ? ` · ${timeLabel(c.minutes)}` : ""}{c.teacher ? ` · ${c.teacher}` : ""}</span>
              </span>
              <span aria-hidden className="text-ink-3">{isOpen ? "▴" : "▾"}</span>
            </button>
            {isOpen && (
              <ul className="mb-3 ml-[30px]">
                {c.lessons.map((l) => {
                  const st = l.done ? "done" : l.id === nextLessonId ? "now" : "todo";
                  const body = (
                    <>
                      <StatusMark state={st} size={15} />
                      <span className={"min-w-0 flex-1 truncate " + (st === "now" ? "font-bold text-magenta-dark" : l.playable ? "" : "text-ink-3")}>{l.title}</span>
                      <span className="shrink-0 text-[12px] text-ink-3">{l.playable ? (l.minutes ? `${l.minutes} min` : "") : "coming soon"}</span>
                    </>
                  );
                  return (
                    <li key={l.id}>
                      {l.playable && canPlay ? (
                        <Link href={`/learn/${slug}/${l.id}`} className="flex items-center gap-2.5 py-1.5 text-[13.5px] hover:underline">{body}</Link>
                      ) : (
                        <span className="flex items-center gap-2.5 py-1.5 text-[13.5px]">{body}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
