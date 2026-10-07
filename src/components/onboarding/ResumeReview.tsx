"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChunkKey, ReviewState } from "@/lib/resume/review";
import { itemKey } from "@/lib/resume/cleanup";

// "What we got": the résumé review, fixed chunk by chunk; every change saves as you go.
const CHUNKS: { key: ChunkKey; label: string }[] = [
  { key: "companies", label: "Companies" },
  { key: "projects", label: "Projects" },
  { key: "skills", label: "Skills" },
  { key: "certs", label: "Certifications" },
  { key: "edu", label: "Education" },
  { key: "about", label: "About You" },
];
const CHIP = "inline-flex items-center gap-1.5 border border-line bg-white px-2 py-1 text-[13px]";
const X = "text-ink-3 hover:text-magenta";
const BTN = "inline-flex min-h-[34px] items-center border border-ink px-3 text-[12.5px] font-bold disabled:opacity-50";
const BTN_K = "inline-flex min-h-[40px] items-center bg-ink px-4 text-[14px] font-bold text-surface hover:bg-ink-hover disabled:opacity-50";
const INPUT = "h-[34px] border border-line px-2 text-[13px]";
const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

type Src = { kind: string; name: string };

export function ResumeReview({ onContinue, onChanged }: { onContinue?: () => void; onChanged?: () => void }) {
  const [st, setSt] = useState<ReviewState | null | undefined>(undefined);
  const [chunk, setChunk] = useState<ChunkKey>("companies");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [src, setSrc] = useState<Src | null>(null);

  useEffect(() => {
    let live = true;
    fetch("/api/onboarding/provider/review")
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (!live) return;
        const s = (b?.state ?? null) as ReviewState | null;
        setSt(s);
        const first = s && CHUNKS.find((c) => s.check[c.key] > 0);
        if (first) setChunk(first.key);
      })
      .catch(() => live && setSt(null));
    return () => {
      live = false;
    };
  }, []);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setErr(null);
    const r = await fetch("/api/onboarding/provider/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const b = (await r?.json().catch(() => ({}))) as { state?: ReviewState; error?: string };
    setBusy(false);
    if (!r?.ok) return setErr(b?.error ?? "That didn't save."), false;
    if (b.state) setSt(b.state);
    onChanged?.();
    return true;
  };

  if (!st || !st.importId) return null;

  const counts = [
    plural(st.count.companies, "company", "companies"),
    plural(st.count.projects, "project"),
    plural(st.count.skills, "skill"),
    plural(st.count.certs, "certification"),
    plural(st.count.edu, "school"),
  ].join(", ");
  const toCheck = CHUNKS.filter((c) => st.check[c.key] > 0).length;
  const statusOf = (k: ChunkKey) => {
    const n = st.check[k];
    if (!n) return null;
    if (k === "about") return "to fill in";
    if (k === "skills" || k === "companies") return `${n} to check`;
    return `${plural(n, "duplicate")}`;
  };

  return (
    <section data-resume-review className="mb-6 border-t-2 border-ink pt-5">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-magenta">WHAT WE GOT</p>
      <h2 className="mt-1 text-[22px] font-bold">We read your résumé</h2>
      <p className="mt-1 text-[14px] text-ink-2">
        {counts}.{" "}
        {toCheck ? `${plural(toCheck, "piece")} ${toCheck === 1 ? "needs" : "need"} a quick look — everything else is ready.` : "Everything is ready."}
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-[200px_1fr] lg:grid-cols-[200px_1fr_300px]">
        <ul data-review-chunks className={(open ? "hidden sm:block" : "") + " border-t border-line"}>
          {CHUNKS.map((c) => {
            const s = statusOf(c.key);
            const on = c.key === chunk;
            return (
              <li key={c.key}>
                <button
                  type="button"
                  data-chunk={c.key}
                  data-amber={s ? "" : undefined}
                  onClick={() => {
                    setChunk(c.key);
                    setOpen(true);
                    setSrc(null);
                  }}
                  className={"flex w-full items-center justify-between gap-2 border-b border-line px-2.5 py-2.5 text-left text-[14px] " + (on ? "sm:bg-ink sm:text-surface" : "hover:bg-bg-soft")}
                >
                  <span className="font-semibold">
                    {c.label} {c.key !== "about" && <span className="font-normal opacity-70">{st.count[c.key]}</span>}
                  </span>
                  {s ? <span className="bg-amber-100 px-1.5 text-[11.5px] font-bold text-amber-800">{s}</span> : <span className="text-[13px] font-bold text-[#1f8a5b]">✓</span>}
                </button>
              </li>
            );
          })}
          <li className="px-2.5 pt-2 text-[11.5px] text-ink-3">✓ = ready. Amber = take a look.</li>
        </ul>

        <div className={(open ? "" : "hidden sm:block") + " min-w-0"}>
          <button type="button" onClick={() => setOpen(false)} className="mb-2 text-[13px] font-semibold text-ink-2 sm:hidden">
            ‹ All Pieces
          </button>
          {chunk === "skills" && <Skills st={st} act={act} busy={busy} onSrc={setSrc} />}
          {chunk === "companies" && <Companies st={st} act={act} busy={busy} onSrc={setSrc} />}
          {chunk === "projects" && (
            <Rows
              title="Projects"
              kind="project"
              rows={st.projects.map((p) => ({ id: p.id, a: p.name, b: p.client, meta: p.dates, srcName: p.name }))}
              labels={["Project", "Client"]}
              dupes={st.dupes.projects}
              act={act}
              busy={busy}
              onSrc={setSrc}
              edit={(id, a, b) => act({ action: "edit", kind: "project", id, name: a, client: b })}
            />
          )}
          {chunk === "certs" && (
            <Rows
              title="Certifications"
              kind="cert"
              rows={st.certs.map((c) => ({ id: c.id, a: c.name, b: c.issuer ?? "", meta: c.year ? String(c.year) : null, srcName: c.name }))}
              labels={["Name", "Issuer"]}
              dupes={st.dupes.certs}
              act={act}
              busy={busy}
              onSrc={setSrc}
              edit={(id, a, b) => act({ action: "edit", kind: "cert", id, name: a, issuer: b })}
            />
          )}
          {chunk === "edu" && (
            <Rows
              title="Education"
              kind="edu"
              rows={st.edu.map((e) => ({ id: e.id, a: e.institution, b: e.degree ?? "", meta: e.year ? String(e.year) : null, srcName: e.institution }))}
              labels={["School", "Degree"]}
              dupes={st.dupes.edu}
              act={act}
              busy={busy}
              onSrc={setSrc}
              edit={(id, a, b) => act({ action: "edit", kind: "edu", id, institution: a, degree: b })}
            />
          )}
          {chunk === "about" && <About st={st} act={act} busy={busy} />}
        </div>

        <Source key={src ? itemKey(src.kind, src.name) : "none"} text={st.text} offsets={st.offsets} src={src} className={open ? "" : "hidden sm:block"} />
      </div>

      {err && <p role="alert" className="mt-3 text-[13px] font-semibold text-magenta-dark">{err}</p>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <span className="text-[13px] text-ink-2">
          Changes save as you go.{" "}
          <button type="button" data-review-reread disabled={busy} onClick={() => act({ action: "reread" })} className="font-bold text-magenta hover:text-magenta-dark disabled:opacity-50">
            {busy ? "Working…" : "Read My Résumé Again"}
          </button>
        </span>
        <button type="button" data-review-continue disabled={busy} onClick={async () => (await act({ action: "commit" })) && onContinue?.()} className={BTN_K}>
          Looks Good — Continue
        </button>
      </div>
    </section>
  );
}

type Act = (body: Record<string, unknown>) => Promise<boolean>;
type PanelProps = { st: ReviewState; act: Act; busy: boolean; onSrc: (s: Src) => void };

function Head({ title, line }: { title: string; line: string }) {
  return (
    <p className="mb-3 text-[16px] font-bold">
      {title} <span className="text-[13px] font-normal text-ink-2">{line}</span>
    </p>
  );
}

function Chip({ name, onSrc, onRemove, busy }: { name: string; onSrc: () => void; onRemove: () => void; busy: boolean }) {
  return (
    <span className={CHIP}>
      <button type="button" onClick={onSrc} className="text-left hover:underline">{name}</button>
      <button type="button" aria-label={`Remove ${name}`} disabled={busy} onClick={onRemove} className={X}>✕</button>
    </span>
  );
}

function Skills({ st, act, busy, onSrc }: PanelProps) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return;
    let live = true;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/onboarding/provider/review?skillq=${encodeURIComponent(q.trim())}`).catch(() => null);
      const b = (await r?.json().catch(() => null)) as { skills?: { id: string; name: string }[] } | null;
      if (live) setHits(b?.skills ?? []);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);
  const { catalog, mine, fresh, junk } = st.skills;
  const src = (name: string) => onSrc({ kind: "skill", name });
  return (
    <div data-review-skills>
      <Head title="Skills" line={`${st.count.skills} found · click one to see where it came from`} />
      <p className="mb-1.5 text-[12.5px] font-bold text-ink-2">In the Panameer catalog ({catalog.length + mine.length})</p>
      <div className="flex flex-wrap gap-1.5">
        {[...catalog, ...mine].map((s) => (
          <Chip key={s.id} name={s.name} busy={busy} onSrc={() => src(s.name)} onRemove={() => act({ action: "remove", kind: "skill", id: s.id })} />
        ))}
      </div>
      {fresh.length > 0 && (
        <>
          <p className="mb-1.5 mt-4 text-[12.5px] font-bold text-ink-2">
            New to Panameer ({fresh.length}) <span className="font-normal">we&apos;ll suggest them to the catalog</span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {fresh.map((n) => (
              <Chip key={n} name={n} busy={busy} onSrc={() => src(n)} onRemove={() => act({ action: "dismiss", kind: "newSkill", names: [n] })} />
            ))}
          </div>
        </>
      )}
      {junk.length > 0 && (
        <div data-review-junk className="mt-4 border-l-2 border-amber-500 bg-amber-50 p-3">
          <p className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-bold text-amber-900">
            Probably not skills ({junk.length})
            <button type="button" disabled={busy} onClick={() => act({ action: "dismiss", kind: "junk", names: junk })} className={BTN}>
              Remove All {junk.length}
            </button>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {junk.map((n) => (
              <Chip key={n} name={n} busy={busy} onSrc={() => src(n)} onRemove={() => act({ action: "dismiss", kind: "junk", names: [n] })} />
            ))}
          </div>
        </div>
      )}
      <div className="relative mt-4 max-w-sm">
        <input value={q} onChange={(e) => { setQ(e.target.value); if (e.target.value.trim().length < 2) setHits([]); }} placeholder="Add a skill… (type to search the catalog)" aria-label="Add a skill" className={INPUT + " w-full"} />
        {hits.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-[200px] w-full overflow-y-auto border border-line bg-white shadow">
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" disabled={busy} onClick={async () => (await act({ action: "addSkill", skillId: h.id })) && (setQ(""), setHits([]))} className="w-full px-2 py-1.5 text-left text-[13px] hover:bg-bg-soft">
                  {h.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Companies({ st, act, busy, onSrc }: PanelProps) {
  return (
    <div data-review-companies>
      <Head title="Companies" line={`${st.companies.length} found · is each one where you worked, or a client project?`} />
      <ul className="border-t border-line">
        {st.companies.map((c) => (
          <li key={c.name} className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5">
            <button type="button" onClick={() => onSrc({ kind: "company", name: c.name })} className="min-w-0 text-left">
              <b className="block text-[14px]">{c.name}</b>
              <span className="block text-[12.5px] text-ink-2">
                {[c.detail, c.dates].filter(Boolean).join(" · ")}
                {c.unsure && <span className="ml-1 font-semibold text-amber-800">we weren&apos;t sure</span>}
              </span>
            </button>
            <span role="group" aria-label={`${c.name} is`} className="inline-flex border border-ink">
              {(["EMPLOYER", "PROJECT", "REMOVE"] as const).map((k) => (
                <button key={k} type="button" disabled={busy} aria-pressed={c.choice === k} onClick={() => c.choice !== k && act({ action: "company", name: c.name, choice: k })} className={"px-2.5 py-1 text-[12.5px] font-bold " + (c.choice === k ? "bg-ink text-surface" : "hover:bg-bg-soft")}>
                  {k === "EMPLOYER" ? "Employer" : k === "PROJECT" ? "Project" : "Remove"}
                </button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      {st.lookalikes.map(([a, b]) => (
        <div key={a + b} data-lookalike className="mt-3 flex flex-wrap items-center justify-between gap-2 border-l-2 border-amber-500 bg-amber-50 p-3 text-[13px]">
          <span>
            Same company? &ldquo;{a}&rdquo; and &ldquo;{b}&rdquo;
          </span>
          <span className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => act({ action: "keepBoth", a, b })} className={BTN}>Keep Both</button>
            <button type="button" disabled={busy} onClick={() => act({ action: "companyMerge", keep: a, drop: b })} className={BTN}>Merge</button>
          </span>
        </div>
      ))}
    </div>
  );
}

type Row = { id: string; a: string; b: string; meta: string | null; srcName: string };
function Rows({ title, kind, rows, labels, dupes, act, busy, onSrc, edit }: { title: string; kind: "project" | "cert" | "edu"; rows: Row[]; labels: [string, string]; dupes: string[][]; act: Act; busy: boolean; onSrc: (s: Src) => void; edit: (id: string, a: string, b: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState<{ id: string; a: string; b: string } | null>(null);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);
  return (
    <div data-review-rows={kind}>
      <Head title={title} line={`${rows.length} found`} />
      {dupes.map((g) => (
        <div key={g.join()} data-duplicate className="mb-3 flex flex-wrap items-center justify-between gap-2 border-l-2 border-amber-500 bg-amber-50 p-3 text-[13px]">
          <span>
            Listed {g.length} times: &ldquo;{byId.get(g[0])?.a}&rdquo;
          </span>
          <span className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => act({ action: "merge", kind, keepId: g[0], dropIds: g.slice(1) })} className={BTN}>Merge</button>
          </span>
        </div>
      ))}
      <ul className="border-t border-line">
        {rows.map((r) =>
          editing?.id === r.id ? (
            <li key={r.id} className="flex flex-wrap items-center gap-2 border-b border-line py-2.5">
              <input value={editing.a} onChange={(e) => setEditing({ ...editing, a: e.target.value })} aria-label={labels[0]} placeholder={labels[0]} className={INPUT + " min-w-0 flex-1"} />
              <input value={editing.b} onChange={(e) => setEditing({ ...editing, b: e.target.value })} aria-label={labels[1]} placeholder={labels[1]} className={INPUT + " min-w-0 flex-1"} />
              <button type="button" disabled={busy || !editing.a.trim()} onClick={async () => (await edit(r.id, editing.a, editing.b)) && setEditing(null)} className={BTN}>Save</button>
              <button type="button" onClick={() => setEditing(null)} className="text-[12.5px] font-semibold text-ink-2">Cancel</button>
            </li>
          ) : (
            <li key={r.id} className="flex items-center justify-between gap-2 border-b border-line py-2.5">
              <button type="button" onClick={() => onSrc({ kind, name: r.srcName })} className="min-w-0 text-left">
                <b className="block text-[14px]">{r.a}</b>
                <span className="block text-[12.5px] text-ink-2">{[r.b, r.meta].filter(Boolean).join(" · ")}</span>
              </button>
              <span className="flex shrink-0 items-center gap-3">
                <button type="button" onClick={() => setEditing({ id: r.id, a: r.a, b: r.b })} className="text-[12.5px] font-bold text-ink-2 hover:text-magenta">Edit</button>
                <button type="button" aria-label={`Remove ${r.a}`} disabled={busy} onClick={() => act({ action: "remove", kind, id: r.id })} className={X}>✕</button>
              </span>
            </li>
          ),
        )}
        {rows.length === 0 && <li className="py-3 text-[13px] text-ink-2">None found in your résumé.</li>}
      </ul>
    </div>
  );
}

function About({ st, act, busy }: { st: ReviewState; act: Act; busy: boolean }) {
  const [title, setTitle] = useState(st.about.title);
  const [overview, setOverview] = useState(st.about.overview);
  const dirty = title !== st.about.title || overview !== st.about.overview;
  return (
    <div data-review-about>
      <Head title="About You" line="your title and a short bio" />
      <label className="block text-[12.5px] font-bold text-ink-2">
        Title
        <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT + " mt-1 block w-full font-normal"} />
      </label>
      <label className="mt-3 block text-[12.5px] font-bold text-ink-2">
        Bio
        <textarea value={overview} onChange={(e) => setOverview(e.target.value)} rows={6} className="mt-1 block w-full border border-line p-2 text-[13px] font-normal" />
      </label>
      <button type="button" disabled={busy || !dirty} onClick={() => act({ action: "edit", kind: "about", title, overview })} className={BTN + " mt-3"}>
        Save
      </button>
    </div>
  );
}

/** The lines of the document an item came from, with "found in N places · next". */
function Source({ text, offsets, src, className }: { text: string; offsets: Record<string, number[]>; src: Src | null; className: string }) {
  const [i, setI] = useState(0);
  const hits = useMemo(() => {
    if (!src) return [];
    const stored = offsets[itemKey(src.kind, src.name)];
    if (stored?.length) return stored;
    const lower = text.toLowerCase(), n = src.name.toLowerCase().trim(), out: number[] = [];
    for (let k = n ? lower.indexOf(n) : -1; k >= 0 && out.length < 20; k = lower.indexOf(n, k + n.length)) out.push(k);
    return out;
  }, [src, offsets, text]);
  const at = hits[i % Math.max(hits.length, 1)];
  const len = src?.name.length ?? 0;
  const start = at == null ? 0 : Math.max(0, text.lastIndexOf("\n", Math.max(0, at - 160)) + 1);
  const endNl = at == null ? -1 : text.indexOf("\n", Math.min(text.length, at + len + 200));
  const end = endNl < 0 ? text.length : endNl;
  return (
    <aside data-review-source className={className + " border border-line bg-bg-soft p-3 sm:col-span-2 lg:col-span-1"}>
      <p className="text-[12.5px] font-bold text-ink-2">From your document</p>
      {!src ? (
        <p className="mt-2 text-[12.5px] text-ink-3">Click any item to see where it came from.</p>
      ) : at == null ? (
        <p className="mt-2 text-[12.5px] text-ink-3">We couldn&apos;t find &ldquo;{src.name}&rdquo; word for word in your document.</p>
      ) : (
        <>
          <pre className="mt-2 max-h-[320px] overflow-y-auto whitespace-pre-wrap font-sans text-[12.5px] leading-relaxed">
            {text.slice(start, at)}
            <mark className="bg-amber-200">{text.slice(at, at + len)}</mark>
            {text.slice(at + len, end)}
          </pre>
          <p className="mt-2 text-[12px] text-ink-2">
            Found in {plural(hits.length, "place")}
            {hits.length > 1 && (
              <>
                {" · "}
                <button type="button" onClick={() => setI((x) => x + 1)} className="font-bold text-magenta">Next ›</button>
              </>
            )}
          </p>
        </>
      )}
    </aside>
  );
}
