import Link from "next/link";
import { guardPage } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { getActList, getActCounts, settleStale } from "@/lib/worklist";
import { actionsFor } from "@/lib/worklist-actions";
import { APP_FILTER, CATEGORY_APP, filterFor } from "@/lib/todo";
import { TILE_GROUPS } from "@/lib/tile-actions";
import { WorklistRow } from "@/components/notifications/RowActions";
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
  searchParams: Promise<{ view?: string; q?: string; status?: string; cat?: string; group?: string; app?: string; tile?: string }>;
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

  await settleStale(person.id);
  // WK-E008: bring the Things You Need to Do lines up to date first, so both places agree.
  const pp = await prisma.providerProfile.findUnique({ where: { person_id: person.id }, select: { id: true } });
  const side = pp ? "provider" : "buyer";
  await (await import("@/lib/attention")).appCounts(viewer, side).catch(() => null);
  const [all, counts] = await Promise.all([
    getActList(person.id, { status, q, category: sp.cat, group: sp.group }),
    getActCounts(person.id),
  ]);

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const filtered =
    view === "day"
      ? all.filter((r) => now - r.at.getTime() > 86_400_000)
      : view === "week"
        ? all.filter((r) => now - r.at.getTime() > 7 * 86_400_000)
        : all;
  // One row per person for messages: "2 new messages from Linus Erley".
  const rows: (typeof filtered[number] & { n?: number })[] = [];
  const bySender = new Map<string, number>();
  for (const r of filtered) {
    if (r.category === "message.received" && !r.resolved) {
      const i = bySender.get(r.title);
      if (i !== undefined) { rows[i].n = (rows[i].n ?? 1) + 1; continue; }
      bySender.set(r.title, rows.length);
    }
    rows.push({ ...r });
  }
  // NC-E005: one row per record (a derived line beats an older event row for the same page); ?app= and ?tile= filters;
  // grouped by app, overdue first (past due or due within 24 h), then by due date.
  const derived = new Set(rows.filter((r) => r.eventKey === "todo.item").map((r) => r.href));
  const appOf = (r: (typeof rows)[number]) => filterFor(r.app ?? CATEGORY_APP[r.category] ?? "connect", side);
  const soon = now + 86_400_000;
  const overdue = (r: (typeof rows)[number]) => !!r.dueAt && r.dueAt.getTime() < soon;
  const tileGroups = sp.tile ? TILE_GROUPS[sp.tile] ?? [] : null;
  const shown = rows
    .filter((r) => r.eventKey === "todo.item" || !r.href || !derived.has(r.href))
    .filter((r) => !sp.app || appOf(r) === sp.app)
    .filter((r) => !tileGroups || tileGroups.includes(r.group ?? ""))
    .filter((r) => !sp.group || sp.group.split(",").includes(r.group ?? ""))
    .sort((a, b) => Number(overdue(b)) - Number(overdue(a)) || (a.dueAt?.getTime() ?? Infinity) - (b.dueAt?.getTime() ?? Infinity) || a.at.getTime() - b.at.getTime());
  const byApp = Object.keys(APP_FILTER).map((k) => ({ key: k, label: APP_FILTER[k].label, rows: shown.filter((r) => appOf(r) === k) })).filter((g) => g.rows.length);
  const appCountsAll = Object.keys(APP_FILTER).map((k) => ({ key: k, label: APP_FILTER[k].label, n: rows.filter((r) => (r.eventKey === "todo.item" || !r.href || !derived.has(r.href)) && appOf(r) === k).length })).filter((a) => a.n);
  const actions = await actionsFor(shown);

  const href = (next: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { view, status, q, cat: sp.cat, app: sp.app, tile: sp.tile, group: sp.group, ...next };
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
                href={href({ view: v.key, cat: undefined, app: undefined, tile: undefined, group: undefined })}
                className="pm-wl-view"
                data-on={view === v.key && !sp.cat && !sp.app ? "yes" : "no"}
                aria-current={view === v.key && !sp.cat && !sp.app ? "page" : undefined}
              >
                <span>{v.label}</span>
                <span className="pm-wl-view-n">
                  {v.key === "open" ? counts.open : v.key === "day" ? counts.pastDay : counts.pastWeek}
                </span>
              </Link>
            </li>
          ))}
          {/* NC-E005: one view per app. */}
          {appCountsAll.map((c) => (
            <li key={c.key}>
              <Link href={href({ app: c.key, view: "open", cat: undefined, tile: undefined, group: undefined })} className="pm-wl-view" data-on={sp.app === c.key ? "yes" : "no"} aria-current={sp.app === c.key ? "page" : undefined}>
                <span>{c.label}</span>
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
            {sp.app && <input type="hidden" name="app" value={sp.app} />}
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

          {shown.length === 0 ? (
            /* SCOTT'S WORDS, verbatim. */
            <p className="pm-wl-empty">This queue is clear.</p>
          ) : byApp.map((g) => (
            <section key={g.key} className="mb-6" data-worklist-app={g.key}>
              <h2 className="mb-1 border-b border-ink pb-1.5 text-[12px] font-extrabold uppercase tracking-[0.1em]">{g.label} <span className="text-state-pending">{g.rows.length}</span></h2>
              <table className="pm-wl-table">
                <tbody>
                  {g.rows.map((r) => (
                    <WorklistRow key={r.id} id={r.id} resolved={r.resolved} action={actions[r.id] ?? null} href={r.href}>
                      <td data-label="Item">
                        <strong>{r.n && r.n > 1 ? r.title.replace(/^New message from /, `${r.n} new messages from `) : r.title}</strong>
                      </td>
                      <td data-label="Due" className="whitespace-nowrap">
                        {r.dueAt ? <span className={overdue(r) ? "font-semibold text-state-declined" : "text-ink-2"}>{r.dueAt.getTime() < now ? "Overdue" : shortTime(r.dueAt, now)}</span> : <time dateTime={r.at.toISOString()} className="text-ink-3">{shortTime(r.at, now)}</time>}
                      </td>
                    </WorklistRow>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
