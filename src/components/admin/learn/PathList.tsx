"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SearchBox, useAdminFetch, AdminState } from "@/components/admin/primitives";
import {
  AUDIENCES,
  Button,
  Select,
  StatusPill,
} from "@/components/admin/learn/primitives";
import { PathForm, EMPTY_PATH, type PathDraft } from "@/components/admin/learn/PathForm";

type Row = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  audience: string;
  group: string | null;
  status: string;
  coverImage: string | null;
  expert: string | null;
  expertPersonId: string | null;
  counts: { courses: number; lessons: number; withUrl: number };
};

const AUDIENCE_LABEL = Object.fromEntries(AUDIENCES.map((a) => [a.value, a.label]));

/**
 * The Learning Path list (WS1) — filter, search, create, edit, delete.
 *
 * "n of m ready" per row is the column that matters: it is the same
 * playable-lesson count the public catalog shows, so an admin can see at a
 * glance which paths would disappoint a learner who clicked them. A path with
 * 40 lessons and 0 ready looks complete everywhere except here.
 */
export function PathList() {
  const { data, loading, error, reload } = useAdminFetch<{
    paths: Row[];
    groups: string[];
  }>("/api/admin/learn/paths");

  const [q, setQ] = useState("");
  const [audience, setAudience] = useState("");
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<PathDraft | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data?.paths ?? []).filter(
      (p) =>
        (!needle || p.title.toLowerCase().includes(needle)) &&
        (!audience || p.audience === audience) &&
        (!group || p.group === group) &&
        (!status || p.status === status)
    );
  }, [data, q, audience, group, status]);

  const remove = async (row: Row) => {
    setDeleteError(null);
    const r = await fetch(`/api/admin/learn/paths/${row.id}`, { method: "DELETE" });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      setDeleteError(body.error ?? "Could not delete that path.");
      return;
    }
    setDeleting(null);
    reload();
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-[20px] font-extrabold tracking-[-0.4px]">Learning Paths</h2>
        <Button
          type="button"
          className="ml-auto"
          onClick={() => setEditing({ ...EMPTY_PATH })}
        >
          + New Learning Path
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <SearchBox value={q} onChange={setQ} placeholder="Search titles…" />
        <Select
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          inline
        >
          <option value="">All Audiences</option>
          {AUDIENCES.map((a) => (
            <option key={a.value} value={a.value}>
              {a.label}
            </option>
          ))}
        </Select>
        <Select
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          inline
        >
          <option value="">All Groups</option>
          {(data?.groups ?? []).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          inline
        >
          <option value="">Any Status</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
        </Select>
      </div>

      <AdminState loading={loading} error={error} />

      {data && rows.length === 0 && (
        <p className="rounded-brand border border-line p-6 text-[14px] text-ink-2">
          {data.paths.length === 0
            ? "No learning paths yet. Create one to start building the curriculum."
            : "No paths match those filters."}
        </p>
      )}

      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-brand border border-line">
          <table className="w-full min-w-[820px] text-left text-[14px]">
            <thead className="border-b border-line bg-black/[0.02] text-[12.5px] uppercase tracking-wide text-ink-2">
              <tr>
                <th className="w-[30%] px-4 py-3 font-bold">Path</th>
                <th className="px-4 py-3 font-bold">Audience</th>
                <th className="px-4 py-3 font-bold">Group</th>
                <th className="px-4 py-3 font-bold">Expert</th>
                <th className="px-4 py-3 font-bold">Content</th>
                <th className="px-4 py-3 font-bold">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/learn/${p.id}`}
                      className="font-bold hover:text-magenta"
                    >
                      {p.title}
                    </Link>
                    <p className="truncate font-mono text-[12px] text-ink-2">/learn/{p.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {AUDIENCE_LABEL[p.audience] ?? p.audience}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{p.group ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-2">{p.expert ?? "—"}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className="text-ink-2">
                      {p.counts.courses} course{p.counts.courses === 1 ? "" : "s"} ·{" "}
                      {p.counts.lessons} lesson{p.counts.lessons === 1 ? "" : "s"}
                    </span>
                    <br />
                    <span
                      className={
                        p.counts.withUrl > 0
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-amber-700"
                      }
                    >
                      {p.counts.withUrl} of {p.counts.lessons} ready
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() =>
                        setEditing({
                          id: p.id,
                          title: p.title,
                          slug: p.slug,
                          summary: p.summary ?? "",
                          audience: p.audience,
                          group: p.group ?? "",
                          expertPersonId: p.expertPersonId,
                          expertName: p.expert,
                          coverImage: p.coverImage,
                          introVideoRef: "",
                          status: p.status,
                        })
                      }
                      className="text-[13px] font-bold text-magenta hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(p);
                      }}
                      className="ml-3 text-[13px] font-bold text-ink-2 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <PathForm
          initial={editing}
          groups={data?.groups ?? []}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}

      {deleting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setDeleting(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-brand bg-white p-6 shadow-xl"
          >
            <h2 className="text-[19px] font-extrabold">Delete &ldquo;{deleting.title}&rdquo;?</h2>
            <p className="mt-2 text-[14px] text-ink-2">
              This can&apos;t be undone.
            </p>
            {deleteError && (
              <p className="mt-3 rounded-[10px] bg-red-500/5 px-4 py-3 text-[14px] text-red-700">
                {deleteError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <Button type="button" tone="ghost" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button type="button" tone="danger" onClick={() => remove(deleting)}>
                Delete Path
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
