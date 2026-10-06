import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { findCategory } from "@/lib/notification-categories";
import { getActList, getActCounts } from "@/lib/worklist";
import { shortTime } from "@/lib/short-time";
import "@/components/notifications/triage.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Worklist · Panameer" };

const VIEWS = [
  { key: "open", label: "All Open" },
  { key: "day", label: "Past Day" },
  { key: "week", label: "Past Week" },
] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; q?: string; status?: string; cat?: string }>;
}) {
  const viewer = await guardPage("authenticated");
  const person = await prisma.person.findUnique({
    where: { user_id: viewer.userId },
    select: { id: true },
  });
  if (!person) return null;

  const sp = await searchParams;
  const view = sp.view ?? "open";
  const status = (sp.status === "completed" || sp.status === "any" ? sp.status : "open") as
    | "open"
    | "completed"
    | "any";
  const q = sp.q ?? "";

  const [all, counts] = await Promise.all([
    getActList(person.id, { status, q, category: sp.cat }),
    getActCounts(person.id),
  ]);

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const rows =
    view === "day"
      ? all.filter((r) => now - r.at.getTime() > 86_400_000)
      : view === "week"
        ? all.filter((r) => now - r.at.getTime() > 7 * 86_400_000)
        : all;

  const href = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { view, status, q, cat: sp.cat, ...next };
    for (const [k, v] of Object.entries(merged)) {
      if (v && !(k === "view" && v === "open") && !(k === "status" && v === "open")) p.set(k, v);
    }
    const s = p.toString();
    return s ? `/worklist?${s}` : "/worklist";
  };

  return (
    <div className="account-surface px-4 py-6 sm:px-6">
      <div className="mx-auto mb-4 flex max-w-[1100px] flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-[22px] font-bold">Worklist</h1>
        <Link href="/notifications" className="pm-triage-btn pm-triage-btn-s">
          &larr; All Notifications
        </Link>
      </div>

      <div className="pm-wl">
        {/* ── THE SAVED VIEWS ──────────────────────────────────────────────── */}
        <ul className="pm-wl-rail" aria-label="Saved views">
          {VIEWS.map((v) => (
            <li key={v.key}>
              <Link
                href={href({ view: v.key, cat: undefined })}
                className="pm-wl-view"
                data-on={view === v.key && !sp.cat ? "yes" : "no"}
                aria-current={view === v.key && !sp.cat ? "page" : undefined}
              >
                <span>{v.label}</span>
                <span className="pm-wl-view-n">
                  {v.key === "open" ? counts.open : v.key === "day" ? counts.pastDay : counts.pastWeek}
                </span>
              </Link>
            </li>
          ))}
          {/* One view per category that HAS action rows — from the registry, like the */}
          {counts.byCategory.map((c) => (
            <li key={c.key}>
              <Link
                href={href({ cat: c.key, view: "open" })}
                className="pm-wl-view"
                data-on={sp.cat === c.key ? "yes" : "no"}
                aria-current={sp.cat === c.key ? "page" : undefined}
              >
                <span>{findCategory(c.key)?.label ?? c.key}</span>
                <span className="pm-wl-view-n">{c.n}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div>
          {/* A plain GET form — no JavaScript, and the result is a real URL. */}
          <form className="pm-wl-tools" method="get" action="/worklist">
            {view !== "open" && <input type="hidden" name="view" value={view} />}
            {sp.cat && <input type="hidden" name="cat" value={sp.cat} />}
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search title and body"
              aria-label="Search the worklist"
            />
            <select name="status" defaultValue={status} aria-label="Status">
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="any">Any</option>
            </select>
            <button type="submit" className="pm-triage-btn pm-triage-btn-s">
              Search
            </button>
          </form>

          {rows.length === 0 ? (
            /* SCOTT'S WORDS, verbatim. */
            <p className="pm-wl-empty">This queue is clear.</p>
          ) : (
            <table className="pm-wl-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Title</th>
                  <th>Queue</th>
                  <th>Created</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} data-row={r.id} data-resolved={r.resolved ? "yes" : "no"}>
                    <td data-label="Status">
                      <span className="pm-wl-status">{r.resolved ? "Completed" : "Open"}</span>
                    </td>
                    <td data-label="Title">
                      <strong>{r.title}</strong>
                      {r.body && <div className="text-[12.5px] text-ink-2">{r.body}</div>}
                    </td>
                    <td data-label="Queue">{findCategory(r.category)?.label ?? r.category}</td>
                    <td data-label="Created">
                      <time dateTime={r.at.toISOString()}>{shortTime(r.at, now)}</time>
                    </td>
                    <td data-label="Action">
                      {r.href ? (
                        <Link href={r.href} className="pm-triage-btn pm-triage-btn-p">
                          Open
                        </Link>
                      ) : (
                        // A row with no href has nowhere to send anybody. The cell
                        <span className="text-[12.5px] text-ink-3">No link</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
