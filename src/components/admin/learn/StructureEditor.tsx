"use client";

import { useState } from "react";
import {
  Button,
  COURSE_STYLES,
  CLAIMS_URL,
  Field,
  ImageField,
  Modal,
  Select,
  TextArea,
  TextInput,
  VideoField,
} from "@/components/admin/learn/primitives";

export type TreeLesson = {
  id: string;
  title: string;
  description: string | null;
  runTime: string | null;
  vimeoRef: string | null;
  thumbnailUrl: string | null;
  productionStatus: string;
  sortOrder: number;
  expertPersonId: string | null;
  expert: string | null;
};

export type TreeSection = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  sortOrder: number;
  lessons: TreeLesson[];
};

export type TreeCourse = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  style: string | null;
  sortOrder: number;
  thumbnailUrl: string | null;
  introVideoRef: string | null;
  sections: TreeSection[];
};

export type Tree = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  audience: string;
  group: string | null;
  status: string;
  coverImage: string | null;
  introVideoRef: string | null;
  expertPersonId: string | null;
  expert: string | null;
  courses: TreeCourse[];
};

const STYLE_LABEL = Object.fromEntries(COURSE_STYLES.map((s) => [s.value, s.label]));

/** A lesson plays only with BOTH halves — mirrors `isPlayable` in learn.ts. */
export const isPlayable = (l: TreeLesson) =>
  Boolean(l.vimeoRef?.trim()) && CLAIMS_URL.includes(l.productionStatus);

/** Claims a URL on the ladder but hasn't got one — the gap this brief closes. */
export const urlMissing = (l: TreeLesson) =>
  CLAIMS_URL.includes(l.productionStatus) && !l.vimeoRef?.trim();

export function countLessons(c: TreeCourse) {
  const lessons = c.sections.flatMap((s) => s.lessons);
  return {
    total: lessons.length,
    playable: lessons.filter(isPlayable).length,
    missing: lessons.filter(urlMissing).length,
  };
}

/**
 * The nested outline editor (WS2).
 *
 * COLLAPSED BY DEFAULT, and that is the whole design. The biggest path in the
 * catalog is 105 lessons across 6 courses and 30-odd sections; rendered flat
 * that is a wall no one can work in. Courses open one at a time, sections open
 * inside them, and every level carries its counts so an admin can decide what to
 * open WITHOUT opening it. The tree is loaded in a single query, so expanding is
 * instant — collapsing is about what a person can hold, not about bytes.
 */
export function StructureEditor({
  tree,
  onChanged,
  renderLessonRow,
  sectionExtras,
  sectionActions,
}: {
  tree: Tree;
  onChanged: () => void;
  /** WS3 supplies the lesson row (editor + inline URL); WS2 renders a summary. */
  renderLessonRow?: (lesson: TreeLesson, section: TreeSection) => React.ReactNode;
  /** WS3 supplies the per-section URL table. */
  sectionExtras?: (section: TreeSection) => React.ReactNode;
  /** WS3 supplies the "Paste URLs" toggle that reveals that table. */
  sectionActions?: (section: TreeSection) => React.ReactNode;
}) {
  const [openCourses, setOpenCourses] = useState<Set<string>>(new Set());
  const [openSections, setOpenSections] = useState<Set<string>>(new Set());
  const [courseForm, setCourseForm] = useState<Partial<TreeCourse> | null>(null);
  const [sectionForm, setSectionForm] = useState<
    (Partial<TreeSection> & { courseId?: string }) | null
  >(null);
  const [lessonForm, setLessonForm] = useState<{ sectionId: string } | null>(null);
  const [confirm, setConfirm] = useState<{
    kind: "course" | "section" | "lesson";
    id: string;
    title: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = (set: Set<string>, id: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    next.has(id) ? next.delete(id) : next.add(id);
    apply(next);
  };

  const move = async (
    kind: "course" | "section" | "lesson",
    id: string,
    direction: "up" | "down"
  ) => {
    setBusy(true);
    try {
      const r = await fetch("/api/admin/learn/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, id, direction }),
      });
      if (r.ok) onChanged();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm) return;
    setError(null);
    const endpoint =
      confirm.kind === "course"
        ? "courses"
        : confirm.kind === "section"
          ? "sections"
          : "lessons";
    const r = await fetch(`/api/admin/learn/${endpoint}/${confirm.id}`, {
      method: "DELETE",
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(body.error ?? "Could not delete that.");
      return;
    }
    setConfirm(null);
    onChanged();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-[20px] font-extrabold tracking-[-0.4px]">Structure</h2>
        <span className="text-[13.5px] text-ink-2">
          {tree.courses.length} course{tree.courses.length === 1 ? "" : "s"}
        </span>
        <div className="ml-auto flex gap-2">
          {tree.courses.length > 0 && (
            <Button
              type="button"
              tone="ghost"
              onClick={() =>
                setOpenCourses(
                  openCourses.size === tree.courses.length
                    ? new Set()
                    : new Set(tree.courses.map((c) => c.id))
                )
              }
            >
              {openCourses.size === tree.courses.length ? "Collapse All" : "Expand All"}
            </Button>
          )}
          <Button type="button" onClick={() => setCourseForm({})}>
            + Add Course
          </Button>
        </div>
      </div>

      {tree.courses.length === 0 && (
        <p className="rounded-brand border border-line p-6 text-[14px] text-ink-2">
          No courses yet. A path needs at least one course → section → lesson before
          it can be published. A single course is fine — not every path needs more.
        </p>
      )}

      <div className="space-y-2">
        {tree.courses.map((course, ci) => {
          const counts = countLessons(course);
          const open = openCourses.has(course.id);
          return (
            <div key={course.id} className="rounded-brand border border-line">
              <div className="flex flex-wrap items-center gap-2 p-3">
                <button
                  type="button"
                  onClick={() => toggle(openCourses, course.id, setOpenCourses)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="w-4 shrink-0 text-ink-2">{open ? "▾" : "▸"}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-bold">{course.title}</span>
                    <span className="block text-[12.5px] text-ink-2">
                      {course.sections.length} section
                      {course.sections.length === 1 ? "" : "s"} · {counts.total} lesson
                      {counts.total === 1 ? "" : "s"} ·{" "}
                      <span
                        className={
                          counts.playable > 0 ? "text-emerald-700" : "text-amber-700"
                        }
                      >
                        {counts.playable} ready
                      </span>
                      {counts.missing > 0 && (
                        <span className="text-amber-700">
                          {" "}
                          · {counts.missing} URL missing
                        </span>
                      )}
                      {course.style && ` · ${STYLE_LABEL[course.style] ?? course.style}`}
                    </span>
                  </span>
                </button>

                <div className="flex shrink-0 items-center gap-1">
                  <OrdinalButtons
                    disabled={busy}
                    canUp={ci > 0}
                    canDown={ci < tree.courses.length - 1}
                    onMove={(d) => move("course", course.id, d)}
                  />
                  <RowAction onClick={() => setCourseForm(course)}>Edit</RowAction>
                  <RowAction
                    danger
                    onClick={() => {
                      setError(null);
                      setConfirm({ kind: "course", id: course.id, title: course.title });
                    }}
                  >
                    Delete
                  </RowAction>
                </div>
              </div>

              {open && (
                <div className="border-t border-line bg-black/[0.015] p-3">
                  <div className="mb-2 flex justify-end">
                    <Button
                      type="button"
                      tone="ghost"
                      onClick={() => setSectionForm({ courseId: course.id })}
                    >
                      + Add Section
                    </Button>
                  </div>

                  {course.sections.length === 0 && (
                    <p className="px-1 pb-2 text-[13.5px] text-ink-2">
                      No sections yet.
                    </p>
                  )}

                  <div className="space-y-2">
                    {course.sections.map((section, si) => {
                      const sOpen = openSections.has(section.id);
                      const missing = section.lessons.filter(urlMissing).length;
                      const ready = section.lessons.filter(isPlayable).length;
                      return (
                        <div
                          key={section.id}
                          className="rounded-[12px] border border-line bg-white"
                        >
                          <div className="flex flex-wrap items-center gap-2 p-3">
                            <button
                              type="button"
                              onClick={() =>
                                toggle(openSections, section.id, setOpenSections)
                              }
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              <span className="w-4 shrink-0 text-ink-2">
                                {sOpen ? "▾" : "▸"}
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-[14.5px] font-semibold">
                                  {section.title}
                                </span>
                                <span className="block text-[12.5px] text-ink-2">
                                  {section.lessons.length} lesson
                                  {section.lessons.length === 1 ? "" : "s"} · {ready} ready
                                  {missing > 0 && (
                                    <span className="font-semibold text-amber-700">
                                      {" "}
                                      · {missing} URL missing
                                    </span>
                                  )}
                                </span>
                              </span>
                            </button>
                            <div className="flex shrink-0 items-center gap-1">
                              <OrdinalButtons
                                disabled={busy}
                                canUp={si > 0}
                                canDown={si < course.sections.length - 1}
                                onMove={(d) => move("section", section.id, d)}
                              />
                              <RowAction onClick={() => setSectionForm(section)}>
                                Edit
                              </RowAction>
                              <RowAction
                                danger
                                onClick={() => {
                                  setError(null);
                                  setConfirm({
                                    kind: "section",
                                    id: section.id,
                                    title: section.title,
                                  });
                                }}
                              >
                                Delete
                              </RowAction>
                            </div>
                          </div>

                          {sOpen && (
                            <div className="border-t border-line p-3">
                              <div className="mb-2 flex flex-wrap justify-end gap-2">
                                {sectionActions?.(section)}
                                <Button
                                  type="button"
                                  tone="ghost"
                                  onClick={() => setLessonForm({ sectionId: section.id })}
                                >
                                  + Add Lesson
                                </Button>
                              </div>
                              {sectionExtras?.(section)}
                              {section.lessons.length === 0 ? (
                                <p className="text-[13.5px] text-ink-2">
                                  No lessons in this section yet.
                                </p>
                              ) : (
                                <ul className="divide-y divide-line">
                                  {section.lessons.map((lesson, li) => (
                                    <li
                                      key={lesson.id}
                                      className="flex flex-wrap items-center gap-2 py-2"
                                    >
                                      <span className="min-w-0 flex-1">
                                        {renderLessonRow ? (
                                          renderLessonRow(lesson, section)
                                        ) : (
                                          <LessonSummary lesson={lesson} />
                                        )}
                                      </span>
                                      <span className="flex shrink-0 items-center gap-1">
                                        <OrdinalButtons
                                          disabled={busy}
                                          canUp={li > 0}
                                          canDown={li < section.lessons.length - 1}
                                          onMove={(d) => move("lesson", lesson.id, d)}
                                        />
                                        <RowAction
                                          danger
                                          onClick={() => {
                                            setError(null);
                                            setConfirm({
                                              kind: "lesson",
                                              id: lesson.id,
                                              title: lesson.title,
                                            });
                                          }}
                                        >
                                          Delete
                                        </RowAction>
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {courseForm && (
        <CourseForm
          learningPathId={tree.id}
          initial={courseForm}
          onClose={() => setCourseForm(null)}
          onSaved={() => {
            setCourseForm(null);
            onChanged();
          }}
        />
      )}

      {sectionForm && (
        <SectionForm
          initial={sectionForm}
          onClose={() => setSectionForm(null)}
          onSaved={() => {
            setSectionForm(null);
            onChanged();
          }}
        />
      )}

      {lessonForm && (
        <NewLessonForm
          sectionId={lessonForm.sectionId}
          onClose={() => setLessonForm(null)}
          onSaved={() => {
            setLessonForm(null);
            onChanged();
          }}
        />
      )}

      {confirm && (
        <Modal title={`Delete "${confirm.title}"?`} onClose={() => setConfirm(null)}>
          <p className="text-[14px] text-ink-2">This can&apos;t be undone.</p>
          {error && (
            <p className="mt-3 rounded-[10px] bg-red-500/5 px-4 py-3 text-[14px] text-red-700">
              {error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <Button type="button" tone="ghost" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button type="button" tone="danger" onClick={remove}>
              Delete
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LessonSummary({ lesson }: { lesson: TreeLesson }) {
  return (
    <span className="block">
      <span className="block truncate text-[14px]">{lesson.title}</span>
      <span className="block text-[12.5px] text-ink-2">
        {lesson.runTime ?? "—"}
        {isPlayable(lesson) ? (
          <span className="font-semibold text-emerald-700"> · Ready</span>
        ) : urlMissing(lesson) ? (
          <span className="font-semibold text-amber-700"> · URL missing</span>
        ) : null}
      </span>
    </span>
  );
}

function RowAction({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-2.5 py-1 text-[12.5px] font-bold transition-colors " +
        (danger
          ? "text-ink-2 hover:bg-red-500/5 hover:text-red-700"
          : "text-magenta hover:bg-magenta/[0.06]")
      }
    >
      {children}
    </button>
  );
}

/**
 * Up/down ordinals rather than drag-and-drop. The brief allows either for v1,
 * and ordinals work with a keyboard, survive a 105-row list, and can't drop an
 * item into the wrong course by accident.
 */
function OrdinalButtons({
  canUp,
  canDown,
  onMove,
  disabled,
}: {
  canUp: boolean;
  canDown: boolean;
  onMove: (d: "up" | "down") => void;
  disabled?: boolean;
}) {
  return (
    <span className="flex items-center">
      <button
        type="button"
        aria-label="Move up"
        disabled={!canUp || disabled}
        onClick={() => onMove("up")}
        className="rounded px-1.5 py-1 text-[13px] text-ink-2 hover:text-magenta disabled:opacity-25"
      >
        ↑
      </button>
      <button
        type="button"
        aria-label="Move down"
        disabled={!canDown || disabled}
        onClick={() => onMove("down")}
        className="rounded px-1.5 py-1 text-[13px] text-ink-2 hover:text-magenta disabled:opacity-25"
      >
        ↓
      </button>
    </span>
  );
}

function CourseForm({
  learningPathId,
  initial,
  onClose,
  onSaved,
}: {
  learningPathId: string;
  initial: Partial<TreeCourse>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [summary, setSummary] = useState(initial.summary ?? "");
  const [style, setStyle] = useState(initial.style ?? "");
  const [thumb, setThumb] = useState<string | null>(initial.thumbnailUrl ?? null);
  const [video, setVideo] = useState(initial.introVideoRef ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setError("A course needs a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(
        initial.id ? `/api/admin/learn/courses/${initial.id}` : "/api/admin/learn/courses",
        {
          method: initial.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(initial.id ? {} : { learningPathId }),
            title,
            summary: summary || null,
            style: style || null,
            thumbnailUrl: thumb,
            introVideoRef: video || null,
          }),
        }
      );
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not save that course.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={initial.id ? "Edit Course" : "New Course"} onClose={onClose} wide>
      <div className="space-y-5">
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Summary">
          <TextArea value={summary} onChange={(e) => setSummary(e.target.value)} />
        </Field>
        <Field label="Style">
          <Select value={style} onChange={(e) => setStyle(e.target.value)}>
            {COURSE_STYLES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <ImageField
          label="Thumbnail"
          value={thumb}
          onChange={setThumb}
          hint="Falls back to the path's cover image when empty."
        />
        <VideoField
          label="Intro Video"
          value={video}
          onChange={setVideo}
          hint="Optional — an intro clip for the course. Not a lesson."
        />
        {error && (
          <p className="rounded-[10px] bg-red-500/5 px-4 py-3 text-[14px] text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? "Saving…" : initial.id ? "Save Changes" : "Add Course"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function SectionForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: Partial<TreeSection> & { courseId?: string };
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initial.title ?? "");
  const [description, setDescription] = useState(initial.description ?? "");
  const [thumb, setThumb] = useState<string | null>(initial.thumbnailUrl ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setError("A section needs a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(
        initial.id ? `/api/admin/learn/sections/${initial.id}` : "/api/admin/learn/sections",
        {
          method: initial.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...(initial.id ? {} : { courseId: initial.courseId }),
            title,
            description: description || null,
            thumbnailUrl: thumb,
          }),
        }
      );
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not save that section.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={initial.id ? "Edit Section" : "New Section"} onClose={onClose}>
      <div className="space-y-5">
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Description">
          <TextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What this group of lessons is for."
          />
        </Field>
        <ImageField label="Thumbnail" value={thumb} onChange={setThumb} />
        {error && (
          <p className="rounded-[10px] bg-red-500/5 px-4 py-3 text-[14px] text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? "Saving…" : initial.id ? "Save Changes" : "Add Section"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Creating a lesson asks for the title and nothing else.
 *
 * Everything else — description, run time, URL, expert, thumbnail — is edited
 * afterwards in the lesson editor, which is where an admin is looking at one
 * lesson rather than adding twelve. Front-loading those fields would make
 * building out a section slower for no benefit, since none of them are required
 * for the lesson to exist.
 */
function NewLessonForm({
  sectionId,
  onClose,
  onSaved,
}: {
  sectionId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [runTime, setRunTime] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!title.trim()) {
      setError("A lesson needs a title.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/learn/lessons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId, title, runTime: runTime || null }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not add that lesson.");
        return;
      }
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="New Lesson" onClose={onClose}>
      <div className="space-y-5">
        <Field label="Title">
          <TextInput value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </Field>
        <Field label="Run Time" hint="Optional — add it later if you don't know it yet.">
          <TextInput
            value={runTime}
            onChange={(e) => setRunTime(e.target.value)}
            placeholder="12:34"
          />
        </Field>
        {error && (
          <p className="rounded-[10px] bg-red-500/5 px-4 py-3 text-[14px] text-red-700">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3 border-t border-line pt-5">
          <Button type="button" tone="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={busy}>
            {busy ? "Adding…" : "Add Lesson"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
