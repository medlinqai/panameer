"use client";

import Link from "next/link";
import { useAdminFetch } from "@/components/admin/primitives";

// Possible duplicates (view only; merging is a later brief): companies sharing a domain or tax ID.
type Group = { key: string; kind: string; ids: { id: string; account: string; name: string; note: string | null }[] };

export function PossibleDuplicates() {
  const { data } = useAdminFetch<{ groups: Group[] }>("/api/admin/companies/duplicates");
  const groups = data?.groups ?? [];
  return (
    <section className="mb-8" data-possible-duplicates>
      <h2 className="text-[17px] font-bold">Possible duplicates {data && <span className="text-[13px] font-normal text-ink-2">({groups.length})</span>}</h2>
      {data && groups.length === 0 && <p className="mt-1 text-[13.5px] text-ink-2">No two companies share a website domain or tax ID.</p>}
      <ul className="mt-2 border-t border-line">
        {groups.map((g) => (
          <li key={`${g.kind}:${g.key}`} className="border-b border-line py-2.5 text-[13.5px]" data-dup-group={g.key}>
            <span className="mr-2 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">Same {g.kind}</span>
            <span className="font-mono text-[12.5px]">{g.kind === "tax ID" ? `…${g.key.slice(-4)}` : g.key}</span>
            <span className="ml-2">
              {g.ids.map((c, i) => (
                <span key={c.id}>
                  {i > 0 && " · "}
                  <Link href={`/admin/companies/${c.account}`} className="font-semibold text-magenta-dark hover:underline">{c.name}</Link>
                  {c.note && <span className="text-[12px] text-ink-3"> (flagged: {c.note})</span>}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
