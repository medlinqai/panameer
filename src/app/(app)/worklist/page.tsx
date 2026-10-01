import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { findCategory } from "@/lib/notification-categories";
import { getActList, getActCounts } from "@/lib/worklist";
import { shortTime } from "@/lib/short-time";
import "@/components/notifications/triage.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Worklist · Panameer" };

/**
 * ── ⚠⚠⚠ THE WORKLIST (`P2-A1.1-E736` WS-B) ──────────────────────────────────────────────
 *
 * ⚠ **SCOTT: the ACT view — *"only rows that need action; complete them."*** Ruling 86's
 * second view of the one table.
 *
 * ⚠⚠ **IT IS A SERVER-RENDERED TABLE WITH URL STATE, NOT A CLIENT GRID.** Every control —
 * the saved view, the search box, the status dropdown — is a link or a `GET` form, so a
 * filtered worklist is shareable, bookmarkable and survives the back button, and the page
 * needs no JavaScript to be usable. ⚠ The same call `/community/grow` and the Groups views
 * made, and the same one the triage chips make next door.
 *
 * ── ⚠⚠⚠ "DUE SOON" IS NOT HERE, AND THAT IS MEASURED ────────────────────────────────────
 *
 * ⚠ The brief asked for a `Due Soon` saved view. ⚠⚠ **THERE IS NO DUE-DATE FIELD ON
 * `Notification` — the only temporal columns are event stamps** (`delivered_in_app_at`,
 * `email_sent_at`, `read_at`, `resolved_at`, `created_at`), none of them a future date.
 * ⚠⚠⚠ **SCOTT DROPPED THE VIEW WHEN THE PREMISE REPORTED IT.** A view sorted on a column
 * that does not exist would have had to invent one. ⚠ `milestone.due` is a CATEGORY KEY,
 * not a date — the one thing in the tree that could be mistaken for a due field.
 *
 * ⚠⚠ **`Past Day` AND `Past Week` MEAN "WAITING LONGER THAN", NOT "CREATED WITHIN".** A
 * worklist measures how long something has been owed; the other reading would make the
 * view EMPTY OUT as things got worse.
 *
 * ── ⚠⚠ COMPLETING ─────────────────────────────────────────────────────────────────────
 *
 * ⚠⚠⚠ **THERE IS NO "MARK DONE" BUTTON, AND THAT IS DELIBERATE.** `resolved_at` means *the
 * thing it asked for is done*, and only the domain that owns the thing can know that — the
 * six existing writers are all side effects of a real decision (a group request answered, a
 * proposal accepted). ⚠ **A button that marked an obligation complete without doing it
 * would be a lie the member tells themselves.** So the Action column opens the row's own
 * `href`, the member does the thing, and the row leaves Open by itself.
 * ⚠ **Dismiss is the honest alternative** and it lives on the triage list: it hides the row
 * there and leaves it standing here.
 */
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

  /* ⚠ The age views filter the SAME list rather than re-querying: the rail's counts come
     from the database, and the rows are already in hand. */
  /* ⚠⚠ SERVER COMPONENT — see the note in `/notifications/page.tsx`. `Date.now()` is the
     request time, which is the one clock the age views and every row share. */
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
          {/* ⚠ One view per category that HAS action rows — from the registry, like the
              triage chips. Never a hard-coded list. */}
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
          {/* ⚠ A plain GET form — no JavaScript, and the result is a real URL. */}
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
            /* ⚠ SCOTT'S WORDS, verbatim. */
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
                        /* ⚠ A row with no href has nowhere to send anybody. ⚠⚠ The cell
                           says so rather than rendering a button that refuses — a door
                           onto a wall (`E579`). */
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
