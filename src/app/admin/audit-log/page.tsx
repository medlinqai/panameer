import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/console/BackLink";

export const dynamic = "force-dynamic";

/**
 * ADMIN → AUDIT LOG (`P2-ALL-E814`).
 *
 * Every admin change and every system deletion. Filterable by actor, table and
 * date; the same rows download as CSV from `/admin/audit-log/export`.
 */
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ actor?: string; table?: string; from?: string; to?: string }>;
}) {
  const q = await searchParams;
  const where = {
    ...(q.actor ? { actor_email: { contains: q.actor, mode: "insensitive" as const } } : {}),
    ...(q.table ? { target_table: q.table } : {}),
    ...(q.from || q.to
      ? {
          created_at: {
            ...(q.from ? { gte: new Date(`${q.from}T00:00:00Z`) } : {}),
            ...(q.to ? { lte: new Date(`${q.to}T23:59:59Z`) } : {}),
          },
        }
      : {}),
  };
  const [rows, tables, total] = await Promise.all([
    prisma.adminAudit.findMany({ where, orderBy: { created_at: "desc" }, take: 200 }),
    prisma.adminAudit.findMany({ distinct: ["target_table"], select: { target_table: true } }),
    prisma.adminAudit.count({ where }),
  ]);

  const query = new URLSearchParams(
    Object.entries(q).filter(([, v]) => !!v) as [string, string][],
  ).toString();

  return (
    <div className="mx-auto w-full max-w-5xl">
      <BackLink href="/admin" label="Admin" />
      <h1 className="mt-1 font-display text-[26px] font-bold">Audit log</h1>
      <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-2">
        Every admin change and every deletion a script reports. Newest first, 200 at a time.
      </p>

      <form className="mt-4 flex flex-wrap items-end gap-3" method="get">
        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">Actor</span>
          <input
            name="actor"
            defaultValue={q.actor ?? ""}
            placeholder="email"
            className="min-h-11 border border-line bg-surface px-2 text-[14px]"
          />
        </label>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">Table</span>
          <select
            name="table"
            defaultValue={q.table ?? ""}
            className="min-h-11 border border-line bg-surface px-2 text-[14px]"
          >
            <option value="">All</option>
            {tables.map((t) => (
              <option key={t.target_table} value={t.target_table}>
                {t.target_table}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">From</span>
          <input type="date" name="from" defaultValue={q.from ?? ""} className="min-h-11 border border-line bg-surface px-2 text-[14px]" />
        </label>
        <label className="block">
          <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">To</span>
          <input type="date" name="to" defaultValue={q.to ?? ""} className="min-h-11 border border-line bg-surface px-2 text-[14px]" />
        </label>
        <button type="submit" className="inline-flex min-h-11 items-center bg-ink px-3 text-[13px] font-bold text-surface">
          Filter
        </button>
        <Link
          href={`/admin/audit-log/export${query ? `?${query}` : ""}`}
          className="inline-flex min-h-11 items-center border border-ink bg-surface px-3 text-[13px] font-bold text-ink"
        >
          Export to Excel
        </Link>
      </form>

      <p className="mt-3 text-[13px] text-ink-2">
        <span className="font-bold text-ink tabular-nums">{total}</span> matching{" "}
        {total === 1 ? "entry" : "entries"}
      </p>

      <div className="mt-3 overflow-x-auto rounded-brand border border-line bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["When", "Actor", "Action", "Table", "Rows", "Detail"].map((h) => (
                <th key={h} scope="col" className="border-b border-line px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-[13px] text-ink-2">
                  Nothing matches. An empty log means no admin change and no reported deletion in
                  this range — not that nothing happened to the data.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60 align-top">
                  <td className="px-3 py-2 tabular-nums text-ink-2">
                    {r.created_at.toISOString().replace("T", " ").slice(0, 16)}
                  </td>
                  <td className="px-3 py-2 text-ink-2">{r.actor_email ?? "system"}</td>
                  <td className="px-3 py-2 font-semibold text-ink">{r.action}</td>
                  <td className="px-3 py-2 text-ink-2">{r.target_table ?? "—"}</td>
                  <td className="px-3 py-2 tabular-nums text-ink-2">{r.row_count ?? "—"}</td>
                  <td className="max-w-[28rem] px-3 py-2 text-[12px] text-ink-3">
                    {r.detail ? JSON.stringify(r.detail).slice(0, 220) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
