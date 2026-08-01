"use client";

import Link from "next/link";
import { AdminHeading, useAdminFetch, AdminState, StatTile } from "@/components/admin/primitives";

type Stats = {
  paths: number;
  publishedPaths: number;
  courses: number;
  sections: number;
  lessons: number;
  playable: number;
  urlMissing: number;
};

/**
 * Learn console landing (brief_learn_admin_authoring WS0).
 *
 * NO NEW GATE. `/admin/learn` sits under the `/admin` prefix, which is already
 * covered three times over — the edge proxy matcher, `route-access.ts`, and
 * `guardPage("canAdminister")` in the admin layout. Adding a fourth check here
 * would be a second place to get it wrong, not a second line of defence.
 *
 * The tiles lead with the number this whole brief exists to move: lessons whose
 * production status claims a URL was added but which have no `vimeo_ref`. That
 * is the gap the spreadsheet left, and it is the difference between a catalog
 * that looks finished and one that plays.
 */
export default function AdminLearnPage() {
  const { data, loading, error } = useAdminFetch<Stats>("/api/admin/learn/stats");

  return (
    <div>
      <AdminHeading
        title="Learn"
        subtitle="Author the curriculum — paths, courses, sections, lessons, and the video URLs that make them playable."
      />
      <AdminState loading={loading} error={error} />

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Learning Paths"
              value={data.paths}
              hint={`${data.publishedPaths} published · ${data.paths - data.publishedPaths} draft`}
            />
            <StatTile label="Courses" value={data.courses} hint={`${data.sections} sections`} />
            <StatTile
              label="Lessons"
              value={data.lessons}
              hint={`${data.playable} playable`}
              tone={data.playable > 0 ? "green" : "default"}
            />
            <StatTile
              label="URL Missing"
              value={data.urlMissing}
              hint="Marked done, no video attached"
              tone={data.urlMissing > 0 ? "amber" : "green"}
            />
          </div>

          {data.urlMissing > 0 && (
            <div className="mt-6 rounded-brand border border-amber-500/30 bg-amber-500/5 p-5">
              <p className="text-[15px] font-bold">
                {data.urlMissing} lesson{data.urlMissing === 1 ? "" : "s"} are marked
                as having a URL but don&apos;t have one.
              </p>
              <p className="mt-1 text-[14px] text-ink-2">
                These show as &ldquo;coming soon&rdquo; to learners. Fill them in one
                at a time from a path&apos;s lesson table, or load a batch from CSV.
              </p>
              <Link
                href="/admin/learn/bulk-urls"
                className="mt-3 inline-block text-[14px] font-bold text-magenta hover:underline"
              >
                Load URLs From CSV →
              </Link>
            </div>
          )}

          <div className="mt-8">
            <PathList />
          </div>
        </>
      )}
    </div>
  );
}

/** Filled in by WS1 — the Learning Path list, filters and CRUD. */
function PathList() {
  return null;
}
