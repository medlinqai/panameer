"use client";

import { useMemo, useState } from "react";

// /glossary: search (term, definition, also called), category filter, A–Z jump.
type Term = { id: string; term: string; category: string | null; type: string | null; definition: string; alsoCalled: string | null };
const letterOf = (t: string) => (/^[a-z]/i.test(t) ? t[0].toUpperCase() : "#");

export function GlossaryBrowser({ terms }: { terms: Term[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const cats = useMemo(() => [...new Set(terms.map((t) => t.category).filter((c): c is string => !!c))].sort(), [terms]);
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return terms.filter((t) => (!cat || t.category === cat) && (!n || [t.term, t.definition, t.alsoCalled ?? ""].some((x) => x.toLowerCase().includes(n))));
  }, [terms, q, cat]);
  const letters = [...new Set(shown.map((t) => letterOf(t.term)))];
  return (
    <div data-glossary className="mt-8">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms, definitions and other names…" aria-label="Search the glossary" className="h-11 min-w-[240px] flex-1 border border-line bg-surface px-3 text-[15px] focus:border-ink focus:outline-none" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Category" className="h-11 border border-line bg-surface px-2 text-[14px]">
          <option value="">All categories</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <nav aria-label="Jump to letter" className="mt-4 flex flex-wrap gap-1">
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) =>
          letters.includes(l) ? (
            <a key={l} href={`#letter-${l}`} className="grid h-8 w-8 place-items-center border border-ink text-[13px] font-bold hover:bg-ink hover:text-surface">{l}</a>
          ) : (
            <span key={l} className="grid h-8 w-8 place-items-center border border-line text-[13px] text-ink-3">{l}</span>
          ),
        )}
      </nav>
      <p className="mt-4 text-[13px] text-ink-2">{shown.length} term{shown.length === 1 ? "" : "s"}</p>
      {letters.map((l) => (
        <section key={l} id={`letter-${l}`} className="scroll-mt-24">
          <h2 className="mt-6 border-b-2 border-ink pb-1 text-[20px] font-bold">{l}</h2>
          <dl>
            {shown.filter((t) => letterOf(t.term) === l).map((t) => (
              <div key={t.id} data-term={t.term} className="border-b border-line py-3">
                <dt className="flex flex-wrap items-baseline gap-2">
                  <b className="text-[16px]">{t.term}</b>
                  {t.category && <span className="text-[12px] text-ink-3">{t.category}{t.type === "Acronym" ? " · acronym" : ""}</span>}
                </dt>
                <dd className="mt-1 text-[14.5px] leading-relaxed text-ink-2">{t.definition}</dd>
                {t.alsoCalled && <dd className="mt-1 text-[13px] text-ink-2"><span className="font-semibold text-ink">Also called:</span> {t.alsoCalled}</dd>}
              </div>
            ))}
          </dl>
        </section>
      ))}
      {shown.length === 0 && <p className="mt-6 text-[14px] text-ink-2">No terms match.</p>}
    </div>
  );
}
