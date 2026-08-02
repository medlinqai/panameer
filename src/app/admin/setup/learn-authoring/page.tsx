"use client";

import Link from "next/link";
import { AdminHeading, useAdminFetch, AdminState, StatTile } from "@/components/admin/primitives";
import { PathList } from "@/components/admin/learn/PathList";

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
          {/*
            E010 — the T1–T5 row is ACTION ITEMS, not a restatement of the
            catalog. Scott's template says these tiles should prompt work, and
            "how many lessons exist" prompts none. What an admin can act on here
            is the gap: paths still in draft, and lessons whose status claims a
            URL they don't have.
          */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile
              label="Drafts to Publish"
              value={data.paths - data.publishedPaths}
              hint="Paths not yet live"
              tone={data.paths - data.publishedPaths > 0 ? "amber" : "green"}
            />
            <StatTile
              label="URL Missing"
              value={data.urlMissing}
              hint="Marked done, no video"
              tone={data.urlMissing > 0 ? "amber" : "green"}
            />
            <StatTile
              label="Lessons Ready"
              value={data.playable}
              hint={`of ${data.lessons}`}
              tone={data.playable > 0 ? "green" : "default"}
            />
            <StatTile label="Instructors to Approve" value="—" hint="Needs a queue" />
            <StatTile label="Tests to Review" value="—" hint="Needs a review flag" />
          </div>

          {data.urlMissing > 0 && (
            <div className="mt-6 rounded-brand border border-amber-500/30 bg-amber-500/5 p-5">
              <p className="text-[15px] font-bold">
                {data.urlMissing} lesson{data.urlMissing === 1 ? " is" : "s are"}{" "}
                marked as having a URL but don&apos;t have one.
              </p>
              <p className="mt-1 text-[14px] text-ink-2">
                These show as &ldquo;coming soon&rdquo; to learners. Fill them in one
                at a time from a path&apos;s lesson table, or load a batch from CSV.
              </p>
              <Link
                href="/admin/setup/learn-authoring/bulk-urls"
                className="mt-3 inline-block text-[14px] font-bold text-magenta hover:underline"
              >
                Load URLs From CSV →
              </Link>
            </div>
          )}

          <div className="mt-8">
            <PathList />
          </div>

          {/* Volume Over Time — the console footer, per the template. */}
          <div className="mt-8">
            <h2 className="mb-2 text-[11.5px] font-bold uppercase tracking-wide text-ink-2">
              Volume Over Time
            </h2>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { label: "Learning Paths", value: String(data.paths) },
                { label: "Courses", value: String(data.courses) },
                { label: "Lessons", value: String(data.lessons) },
                { label: "Tests", value: "—" },
                { label: "Certifications", value: "—" },
              ].map((t) => (
                <div key={t.label} className="rounded-brand border border-line bg-white p-4">
                  <p className="text-[12px] font-semibold text-ink-2">{t.label}</p>
                  <p
                    className={
                      "mt-1 font-display text-[20px] font-bold leading-none " +
                      (t.value === "—" ? "text-ink-2/30" : "text-ink")
                    }
                  >
                    {t.value}
                  </p>
                  <p className="mt-1 text-[11px] text-ink-2/70">
                    {t.value === "—" ? "No series yet" : "Total to date"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
