import Link from "next/link";

// WK-E003: no second row of tabs — "← {App}" at the top, stage chips across a list, "Also in {App}" at the bottom.
export function AppCrumb({ app, href, page }: { app: string; href: string; page?: string }) {
  return (
    <p className="mb-3 text-[13px] font-semibold text-ink-2" data-app-crumb>
      <Link href={href} className="hover:text-ink">← {app}</Link>{page && <span className="text-ink-3"> › {page}</span>}
    </p>
  );
}

export function StageChips({ stages, current, base, param = "stage" }: { stages: [string, string, number | null][]; current: string; base: string; param?: string }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <nav aria-label="Stages" className="mb-4 flex flex-wrap gap-1.5 text-[12.5px]" data-stage-chips>
      {stages.map(([k, l, n]) => (
        <Link key={k} href={k === "all" ? base : `${base}${sep}${param}=${encodeURIComponent(k)}`} aria-current={current === k ? "page" : undefined}
          className={current === k ? "rounded-full border border-ink bg-ink px-3 py-1 font-semibold text-surface" : "rounded-full border border-line px-3 py-1 font-semibold hover:border-ink"}>
          {l}{n != null && <span className="ml-1.5 tabular-nums opacity-70">{n}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function AlsoIn({ app, links }: { app: string; links: [string, string][] }) {
  return (
    <p className="mt-8 border-t border-line pt-4 text-[13px] text-ink-2" data-also-in>
      Also in {app}: {links.map(([l, h], i) => <span key={h}>{i > 0 && " · "}<Link href={h} className="font-semibold text-ink hover:underline">{l}</Link></span>)}
    </p>
  );
}

/** What You Can Do — the column count fits the number of cards, so none sits alone in a row. */
const COLS: Record<number, string> = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4", 5: "sm:grid-cols-5", 6: "sm:grid-cols-3" };
export type ActionCard = { label: string; detail: string; href: string };
export function ActionCards({ cards }: { cards: ActionCard[] }) {
  return (
    <div className={`grid gap-3 ${COLS[cards.length] ?? "sm:grid-cols-3"}`} data-action-cards>
      {cards.map((c) => (
        <Link key={c.label} href={c.href} className="rounded-[12px] border border-line bg-white p-4 hover:border-ink" data-action-card={c.label}>
          <b className="block text-[14.5px]">{c.label}</b>
          <span className="mt-1 block text-[12.5px] text-ink-2">{c.detail}</span>
        </Link>
      ))}
    </div>
  );
}
