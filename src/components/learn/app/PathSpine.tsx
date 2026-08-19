"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronDown, Play } from "lucide-react";
import { InstructorAvatar } from "@/components/learn/InstructorBadge";
import { SectionIcon } from "@/components/learn/app/SectionIcon";
import type { AppCourse, AppPathView } from "@/lib/learn-path-app";

/**
 * THE CURRICULUM SPINE — a vertical connector with a numbered node per course
 * (brief_learn_app_shell WS3).
 *
 * Node state: green check = every lesson watched · magenta with a glow = the
 * course they are standing in · grey outline = not started.
 *
 * ── ONE COURSE OPEN AT A TIME, AND THE CURRENT ONE OPEN ON LOAD ──────────────
 *
 * A 6-course path with all six expanded is 105 rows, which is not an outline. The
 * current course is the one with the next unwatched lesson in it, resolved on the
 * server so the page arrives already open in the right place rather than jumping
 * after hydration.
 *
 * ⚠ A SINGLE-COURSE PATH IS THE COMMON CASE, NOT THE EDGE. 17 of 23 paths have
 * exactly one course, and three of those have exactly ONE LESSON
 * (`end-user-beginners`, `end-user-erp`, `end-user-implementers`). The node is
 * still numbered 1 and still opens; what it must not do is render a collapsed
 * accordion over a single row, so a one-course path opens and cannot be closed.
 *
 * ── ⚠ `Section` IS A SUBHEADING, NEVER A LEVEL ───────────────────────────────
 *
 * 170 real rows with titles, so they are shown — but with no progress bar, no
 * tracking and no number. Scott's "sections inside the video" are a different,
 * unbuilt thing and must be called CHAPTERS when they arrive.
 */
export function PathSpine({ path }: { path: AppPathView }) {
  const single = path.courses.length === 1;
  const [openId, setOpenId] = useState<string | null>(
    path.courses.find((c) => c.current)?.id ?? path.courses[0]?.id ?? null
  );

  return (
    <div className="relative">
      {/*
        The connector. Inset from the top of the first node and stopping short of
        the test node, so it reads as joining the courses rather than as a border.
      */}
      {path.courses.length > 1 && (
        <span
          className="pointer-events-none absolute top-[26px] bottom-[64px] left-[19px] w-[2px] bg-line"
          aria-hidden
        />
      )}

      {path.courses.length === 0 && (
        <p className="rounded-brand border border-line bg-white p-6 text-[14px] text-ink-2">
          This path is still being built.
        </p>
      )}

      {path.courses.map((c, i) => {
        const open = single || openId === c.id;
        const complete = c.lessons > 0 && c.completed === c.lessons;
        return (
          <div key={c.id} className="relative mb-3 pl-[46px] sm:pl-[52px]">
            <span
              className={
                "absolute top-[14px] left-0 z-[2] grid h-10 w-10 place-items-center rounded-[13px] font-display text-[14px] font-bold " +
                (complete
                  ? "border-2 border-transparent bg-[linear-gradient(140deg,var(--color-learn-green),#0b7a46)] text-white"
                  : c.current
                    ? "border-2 border-transparent bg-[linear-gradient(140deg,var(--color-magenta),#8b1fa8)] text-white shadow-[0_0_0_5px_rgba(215,44,214,0.16)]"
                    : "border-2 border-line bg-white text-ink-2")
              }
              aria-hidden
            >
              {complete ? <Check className="h-[18px] w-[18px]" strokeWidth={3} /> : i + 1}
            </span>

            <div
              className={
                "overflow-hidden rounded-[15px] border bg-white shadow-[0_14px_32px_-26px_rgba(23,30,62,0.45)] " +
                (c.current ? "border-magenta/40 shadow-[0_18px_40px_-26px_rgba(163,20,162,0.45)]" : "border-line")
              }
            >
              <CourseHead
                course={c}
                open={open}
                toggleable={!single}
                onToggle={() => setOpenId(open ? null : c.id)}
                pathSlug={path.slug}
              />
              <span className="block h-[5px] bg-bg-soft">
                <span
                  className={
                    "block h-full " +
                    (complete
                      ? "bg-[linear-gradient(90deg,var(--color-learn-green),#0b7a46)]"
                      : "bg-[linear-gradient(90deg,var(--color-magenta),#8b1fa8)]")
                  }
                  style={{ width: `${c.percent}%` }}
                />
              </span>

              {open && (
                <div className="border-t border-line px-3.5 pt-1.5 pb-3.5 sm:px-4">
                  {c.sections.map((s) => (
                    <div key={s.id} className="pt-2.5 pb-1">
                      <div className="mb-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <SectionIcon title={s.title} />
                        <b className="text-[12.5px]">{s.title}</b>
                        <span className="text-[10.5px] text-ink-2">
                          {s.lessons.length} lesson{s.lessons.length === 1 ? "" : "s"}
                        </span>
                        {/*
                          ⚠ A STATUS, NEVER A PROGRESS BAR. Sections are not
                          tracked; this is a count of the rows below it.
                        */}
                        <span className="ml-auto text-[10.5px] text-ink-2">
                          {s.completed === 0
                            ? "Not started"
                            : s.completed === s.lessons.length
                              ? "Done"
                              : `${s.completed} of ${s.lessons.length}`}
                        </span>
                      </div>
                      {/* The section indent is 33px on desktop and 16 on a
                          phone: at 390 the node's own 46px inset plus 33 left
                          the lesson titles wrapping every two words. */}
                      <div className="ml-4 sm:ml-[33px]">
                        {s.lessons.map((l) => (
                          <Link
                            key={l.id}
                            href={`/learn/${path.slug}/${l.id}`}
                            className={
                              "flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 " +
                              (l.current
                                ? "border border-magenta/30 bg-magenta/10"
                                : "border border-transparent hover:bg-bg-soft")
                            }
                          >
                            <span
                              className={
                                "grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] " +
                                (l.completed
                                  ? "border-learn-green bg-learn-green"
                                  : l.current
                                    ? "border-magenta bg-magenta"
                                    : "border-line bg-white")
                              }
                              aria-hidden
                            >
                              {l.completed && <Check className="h-3 w-3 text-white" strokeWidth={4} />}
                              {!l.completed && l.current && (
                                <Play className="ml-[1px] h-2.5 w-2.5 fill-white text-white" />
                              )}
                            </span>
                            <p
                              className={
                                "min-w-0 flex-1 text-[12.5px] " +
                                (l.current ? "font-semibold text-ink" : "text-ink-2")
                              }
                            >
                              {l.title}
                            </p>
                            {/*
                              ⚠ VERBATIM AS STORED, RIGHT-ALIGNED, OMITTED WHEN
                              NULL. 290 of 522 rows are null and the non-null ones
                              include "Intro" and "NA" — showing one row's own
                              string is honest, adding them up is not.
                            */}
                            {l.runTime && (
                              <span className="shrink-0 text-[11px] text-ink-2 tabular-nums">
                                {l.runTime}
                              </span>
                            )}
                            {!l.playable && (
                              <span className="shrink-0 rounded-full bg-bg-soft px-2 py-[2px] text-[9.5px] font-semibold text-ink-2">
                                Soon
                              </span>
                            )}
                            {l.instructor && (
                              <InstructorAvatar
                                instructor={l.instructor}
                                className="h-[22px] w-[22px] ring-[1.5px] ring-white"
                              />
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CourseHead({
  course,
  open,
  toggleable,
  onToggle,
  pathSlug,
}: {
  course: AppCourse;
  open: boolean;
  toggleable: boolean;
  onToggle: () => void;
  pathSlug: string;
}) {
  const complete = course.lessons > 0 && course.completed === course.lessons;
  const lead = course.instructors[0] ?? null;

  const body = (
    <>
      <span className="min-w-0 flex-1 text-left">
        {/*
          ⚠ THREE COURSES IN THE CATALOG HAVE AN EMPTY TITLE — the ones on
          `end-user-beginners`, `end-user-erp` and `end-user-implementers`, where
          the XLS collapsed "Learning Path = Course" and left the course name
          blank. Rendering the element anyway produced an empty bold line above
          the counts. The row is omitted rather than back-filled with the path's
          title, which would assert a name the catalog does not have. Flagged as a
          fourth catalog data bug.
        */}
        {course.title.trim() && (
          <span className="block font-display text-[15.5px] font-bold leading-[1.25]">
            {course.title}
          </span>
        )}
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-ink-2">
          <span>
            {course.sectionCount} section{course.sectionCount === 1 ? "" : "s"}
          </span>
          <i className="inline-block h-[3px] w-[3px] rounded-full bg-line" aria-hidden />
          <span>
            {course.lessons} lesson{course.lessons === 1 ? "" : "s"}
          </span>
          {lead && (
            <>
              <i className="inline-block h-[3px] w-[3px] rounded-full bg-line" aria-hidden />
              <InstructorAvatar instructor={lead} className="h-[18px] w-[18px]" />
              <span>{lead.name}</span>
            </>
          )}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <b
          className={
            "block font-display text-[13px] font-bold " + (complete ? "text-learn-green" : "")
          }
        >
          {complete ? "Complete" : `${course.completed} / ${course.lessons}`}
        </b>
        <span className="text-[10.5px] text-ink-2">
          {complete
            ? `${course.lessons} / ${course.lessons}`
            : course.completed === 0
              ? "Not started"
              : `${course.percent}%`}
        </span>
      </span>
    </>
  );

  if (!toggleable) {
    /* One-course path: nothing to collapse, so nothing pretends to be a button. */
    return (
      <div className="flex items-center gap-3.5 px-4 py-3.5">
        {body}
        <Link
          href={`/learn/${pathSlug}/course/${course.slug}`}
          className="shrink-0 rounded-[8px] bg-bg-soft px-2.5 py-1.5 text-[11px] font-semibold text-ink-2 hover:text-magenta"
        >
          Open
        </Link>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className="flex w-full items-center gap-3.5 px-4 py-3.5 text-left"
    >
      {body}
      <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] bg-bg-soft" aria-hidden>
        <ChevronDown
          className={"h-3.5 w-3.5 text-ink-2 transition-transform " + (open ? "rotate-180" : "")}
        />
      </span>
    </button>
  );
}
