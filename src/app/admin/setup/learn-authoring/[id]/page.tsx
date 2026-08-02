"use client";

import Link from "next/link";
import { use, useState } from "react";
import { useAdminFetch, AdminState } from "@/components/admin/primitives";
import { Button, StatusPill } from "@/components/admin/learn/primitives";
import { PathForm, type PathDraft } from "@/components/admin/learn/PathForm";
import {
  StructureEditor,
  isPlayable,
  urlMissing,
  type Tree,
  type TreeLesson,
  type TreeSection,
} from "@/components/admin/learn/StructureEditor";
import {
  LessonEditor,
  SectionUrlTable,
} from "@/components/admin/learn/LessonEditor";
import { PublishControls } from "@/components/admin/learn/PublishControls";

/**
 * One Learning Path — its details and its whole outline (WS2).
 *
 * Everything hangs off a single tree fetch that `reload()` re-runs after any
 * mutation. Optimistic local edits were the alternative and were rejected: an
 * ordinal rewrite touches every sibling row, so a client trying to predict the
 * result would drift from the database the first time two moves raced.
 */
export default function AdminLearnPathPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data, loading, error, reload } = useAdminFetch<Tree>(
    `/api/admin/learn/paths/${id}/tree`,
  );
  const [editing, setEditing] = useState<PathDraft | null>(null);
  const [lesson, setLesson] = useState<{
    lesson: TreeLesson;
    section: TreeSection;
  } | null>(null);
  const [urlTables, setUrlTables] = useState<Set<string>>(new Set());

  return (
    <div>
      <Link
        href="/admin/setup/learn-authoring"
        className="text-[13.5px] font-bold text-ink-2 hover:text-magenta"
      >
        ← All Learning Paths
      </Link>

      <AdminState loading={loading} error={error} />

      {data && (
        <>
          <div className="mt-3 mb-8">
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[26px] font-extrabold tracking-[-0.5px]">
                    {data.title}
                  </h1>
                  <StatusPill status={data.status} />
                </div>
                <p className="mt-1 font-mono text-[13px] text-ink-2">
                  /learn/{data.slug}
                </p>
                {data.summary && (
                  <p className="mt-2 max-w-2xl text-[14.5px] text-ink-2">
                    {data.summary}
                  </p>
                )}
                <p className="mt-2 text-[13.5px] text-ink-2">
                  {data.group ?? "No group"}
                  {data.expert ? ` · ${data.expert}` : " · No expert"}
                </p>
              </div>

              {data.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={data.coverImage}
                  alt=""
                  className="h-20 w-32 shrink-0 rounded-[10px] border border-line object-cover"
                />
              )}

              <div className="flex flex-wrap items-center gap-2">
                <PublishControls
                  pathId={data.id}
                  slug={data.slug}
                  status={data.status}
                  onChanged={reload}
                />
                <Button
                  type="button"
                  tone="ghost"
                  onClick={() =>
                    setEditing({
                      id: data.id,
                      title: data.title,
                      slug: data.slug,
                      summary: data.summary ?? "",
                      audience: data.audience,
                      group: data.group ?? "",
                      expertPersonId: data.expertPersonId,
                      expertName: data.expert,
                      coverImage: data.coverImage,
                      introVideoRef: data.introVideoRef ?? "",
                      status: data.status,
                    })
                  }
                >
                  Edit Details
                </Button>
              </div>
            </div>
          </div>

          <StructureEditor
            tree={data}
            onChanged={reload}
            renderLessonRow={(l, section) => (
              <button
                type="button"
                onClick={() => setLesson({ lesson: l, section })}
                className="block w-full text-left"
              >
                <span className="block truncate text-[14px] hover:text-magenta">
                  {l.title}
                </span>
                <span className="block text-[12.5px] text-ink-2">
                  {l.runTime ?? "—"}
                  {isPlayable(l) ? (
                    <span className="font-semibold text-emerald-700">
                      {" "}
                      · Ready
                    </span>
                  ) : urlMissing(l) ? (
                    <span className="font-semibold text-amber-700">
                      {" "}
                      · URL missing
                    </span>
                  ) : null}
                </span>
              </button>
            )}
            sectionActions={(section) => (
              <Button
                type="button"
                tone="ghost"
                onClick={() =>
                  setUrlTables((prev) => {
                    const next = new Set(prev);
                    next.has(section.id)
                      ? next.delete(section.id)
                      : next.add(section.id);
                    return next;
                  })
                }
              >
                {urlTables.has(section.id) ? "Hide URL Table" : "Paste URLs"}
              </Button>
            )}
            sectionExtras={(section) =>
              urlTables.has(section.id) ? (
                <SectionUrlTable section={section} onChanged={reload} />
              ) : null
            }
          />
        </>
      )}

      {lesson && (
        <LessonEditor
          lesson={lesson.lesson}
          section={lesson.section}
          onClose={() => setLesson(null)}
          onSaved={() => {
            setLesson(null);
            reload();
          }}
        />
      )}

      {editing && (
        <PathForm
          initial={editing}
          groups={[]}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
