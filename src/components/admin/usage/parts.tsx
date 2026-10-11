import Link from "next/link";

// A-E002: tiles (value + change vs previous, linking to the list behind), bars, funnel and a plain table.
export function Tile({ label, value, delta, href }: { label: string; value: React.ReactNode; delta?: string | null; href?: string }) {
  const body = (
    <>
      <span className="block text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-2">{label}</span>
      <b className="mt-1 block text-[26px] font-semibold tabular-nums">{value}</b>
      {delta && <span className={"block text-[12px] " + (delta.startsWith("▲") ? "text-ink" : "text-ink-2")}>{delta}</span>}
    </>
  );
  return href ? <Link href={href} data-usage-tile className="block border border-line bg-white p-4 hover:border-ink">{body}</Link> : <div data-usage-tile className="border border-line bg-white p-4">{body}</div>;
}

export function Tiles({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{children}</div>;
}

export function Bars({ title, subtitle, rows }: { title: string; subtitle?: string; rows: { label: string; n: number; href?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  return (
    <section className="border border-line bg-white p-4">
      <h2 className="text-[17px] font-bold">{title}</h2>
      {subtitle && <p className="text-[12.5px] text-ink-2">{subtitle}</p>}
      <ul className="mt-3 space-y-1.5">
        {rows.map((r) => (
          <li key={r.label} className="grid grid-cols-[120px_1fr_44px] items-center gap-2 text-[13px]">
            <span className="truncate">{r.label}</span>
            <span className="h-3.5 bg-[#ECEEF4]"><span className="block h-full bg-[#C93BD0]" style={{ width: `${(r.n / max) * 100}%` }} /></span>
            {r.href ? <Link href={r.href} className="text-right font-semibold tabular-nums underline underline-offset-2">{r.n}</Link> : <span className="text-right tabular-nums">{r.n}</span>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Funnel({ title, subtitle, steps }: { title: string; subtitle?: string; steps: { label: string; n: number; href?: string }[] }) {
  const top = Math.max(1, steps[0]?.n ?? 1);
  return (
    <section className="border border-line bg-white p-4">
      <h2 className="text-[17px] font-bold">{title}</h2>
      {subtitle && <p className="text-[12.5px] text-ink-2">{subtitle}</p>}
      <ol className="mt-3 space-y-1.5">
        {steps.map((s) => (
          <li key={s.label} className="grid grid-cols-[150px_1fr_80px] items-center gap-2 text-[13px]">
            <span className="truncate">{s.label}</span>
            <span className="h-3.5 bg-[#ECEEF4]"><span className="block h-full bg-ink" style={{ width: `${(s.n / top) * 100}%` }} /></span>
            <span className="text-right tabular-nums">{s.href ? <Link href={s.href} className="font-semibold underline underline-offset-2">{s.n}</Link> : s.n} <span className="text-ink-3">{Math.round((s.n / top) * 100)}%</span></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

export function DataTable({ title, subtitle, head, rows, id }: { title: string; subtitle?: string; head: string[]; rows: { cells: React.ReactNode[]; href?: string }[]; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 border border-line bg-white p-4">
      <h2 className="text-[17px] font-bold">{title}</h2>
      {subtitle && <p className="text-[12.5px] text-ink-2">{subtitle}</p>}
      {rows.length === 0 ? (
        <p className="mt-2 text-[13px] text-ink-2">Nothing here.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead><tr className="text-ink-3">{head.map((h, i) => <th key={h} className={"py-1 " + (i ? "text-right" : "")}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {r.cells.map((c, j) => <td key={j} className={"py-1.5 " + (j ? "text-right tabular-nums" : "")}>{j === 0 && r.href ? <Link href={r.href} className="underline underline-offset-2">{c}</Link> : c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export const Grid2 = ({ children }: { children: React.ReactNode }) => <div className="grid gap-3 lg:grid-cols-2">{children}</div>;
