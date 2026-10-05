import type { ReactNode } from "react";

// My Company section (mockup my_company 2026-10-05): thin top rule, title + count, actions right. No box.
export function CompanySection({ id, title, count, actions, children }: { id: string; title: string; count?: number; actions?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} data-co-section={id} className="mt-[22px] scroll-mt-6 border-t border-line pt-[18px]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[19px] font-bold">
          {title}
          {count !== undefined && <small className="ml-1 text-[13px] font-medium text-ink-3">({count})</small>}
        </h2>
        {actions && <div className="flex items-center gap-3.5 text-[12px] font-bold text-magenta-dark">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/** Label / value rows; a missing value shows grey italic "Add …". */
export function KV({ rows }: { rows: { k: string; v: ReactNode | null; add?: string }[] }) {
  return (
    <dl className="mt-2.5 grid sm:grid-cols-[200px_1fr]">
      {rows.map((r) => (
        <div key={r.k} className="contents">
          <dt className="border-b border-line/60 py-[9px] text-[14px] font-semibold text-ink-3 max-sm:border-b-0 max-sm:pb-0">{r.k}</dt>
          <dd className="border-b border-line/60 py-[9px] text-[14px] text-ink">
            {r.v ?? <span className="italic text-ink-3">{r.add ?? `Add ${r.k.toLowerCase()}`}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export const initials = (first?: string | null, last?: string | null) =>
  `${(first ?? "").trim()[0] ?? ""}${(last ?? "").trim()[0] ?? ""}`.toUpperCase() || "?";
