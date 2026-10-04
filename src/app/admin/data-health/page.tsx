import { dataHealth } from "@/lib/admin/data-health";
import { BackLink } from "@/components/console/BackLink";

export const dynamic = "force-dynamic";

export default async function DataHealthPage() {
  const rows = await dataHealth();
  const haveHistory = rows.some((r) => r.change !== null);

  return (
    <div className="mx-auto w-full max-w-4xl">
      <BackLink href="/admin" label="Admin" />
      <h1 className="mt-1 font-display text-[26px] font-bold">Data health</h1>
      <p className="mt-0.5 max-w-[70ch] text-[13px] text-ink-2">
        What is in the database right now, and what changed since the last snapshot. Real and test
        counts are split where the table records it.
      </p>

      {!haveHistory && (
        <p className="mt-4 rounded-brand border border-line bg-white p-3 text-[13px] text-ink-2">
          No snapshot has been taken yet, so there is nothing to compare against. The change column
          fills in from the next daily snapshot.
        </p>
      )}

      <div className="mt-5 overflow-x-auto rounded-brand border border-line bg-white">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr>
              {["Table", "Rows", "Real", "Test", "Change", "Since"].map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="border-b border-line px-3 py-2 text-left text-[11px] font-bold uppercase tracking-[0.08em] text-ink-3"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.table} className="border-b border-line/60">
                <td className="px-3 py-2 font-semibold text-ink">{r.table}</td>
                <td className="px-3 py-2 tabular-nums text-ink">{r.total}</td>
                {}
                <td className="px-3 py-2 tabular-nums text-ink-2">
                  {r.real === null ? <span title="This table records no test flag">—</span> : r.real}
                </td>
                <td className="px-3 py-2 tabular-nums text-ink-2">
                  {r.test === null ? <span title="This table records no test flag">—</span> : r.test}
                </td>
                <td
                  className={
                    "px-3 py-2 tabular-nums " +
                    (r.change === null ? "text-ink-3" : r.change < 0 ? "font-bold text-magenta" : "text-ink-2")
                  }
                >
                  {r.change === null ? (
                    <span title="No earlier snapshot to compare against">—</span>
                  ) : r.change > 0 ? (
                    `+${r.change}`
                  ) : (
                    r.change
                  )}
                </td>
                <td className="px-3 py-2 tabular-nums text-ink-3">{r.since ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[12px] text-ink-3">
        A drop is shown in magenta. Deletions made by scripts are listed on the{" "}
        <a href="/admin/audit-log" className="underline underline-offset-2">
          audit log
        </a>
        .
      </p>
    </div>
  );
}
