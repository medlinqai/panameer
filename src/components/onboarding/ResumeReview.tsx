"use client";

import { useEffect, useMemo, useState } from "react";
import type { ChunkKey, ReviewState } from "@/lib/resume/review";
import { itemKey } from "@/lib/resume/cleanup";
import { splitList } from "@/lib/resume/split-list";
import type { PieceKind, Target } from "@/lib/resume/retype";

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
  const [view, setView] = useState<"doc" | "sections">("doc");

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
      <div role="tablist" className="mt-3 inline-flex border border-ink">
        {(["doc", "sections"] as const).map((v) => (
          <button key={v} type="button" role="tab" aria-selected={view === v} data-review-view={v} onClick={() => setView(v)} className={"px-3 py-1.5 text-[12.5px] font-bold " + (view === v ? "bg-ink text-surface" : "hover:bg-bg-soft")}>
            {v === "doc" ? "Your Document" : "By Section"}
          </button>
        ))}
      </div>

      {view === "doc" ? <DocView st={st} act={act} busy={busy} /> : (
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
      )}

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

// Skills & expertise as the catalog sorted them; each chip knows how to remove itself.
type SkillChip = { key: string; name: string; from: PieceKind; id: string; remove: Record<string, unknown> };
const SPEC_GROUPS = [
  { kind: "PRODUCT", label: "Software & Platforms" },
  { kind: "METHODOLOGY", label: "Processes & Methods" },
  { kind: "INDUSTRY", label: "Industries" },
] as const;
function skillGroups(st: ReviewState): { key: string; label: string; note?: string; items: SkillChip[] }[] {
  const { skills, specs, keywords } = st.skills;
  return [
    ...SPEC_GROUPS.map((g) => ({
      key: g.kind,
      label: g.label,
      items: specs.filter((x) => x.kind === g.kind).map((x) => ({ key: `spec:${x.id}`, name: x.name, from: "spec" as const, id: x.id, remove: { action: "remove", kind: "spec", id: x.id } })),
    })),
    { key: "skills", label: "Skills", items: skills.map((x) => ({ key: `skill:${x.id}`, name: x.name, from: "skill" as const, id: x.id, remove: { action: "remove", kind: "skill", id: x.id } })) },
    { key: "keywords", label: "Keywords", note: "not in the catalog yet — kept exactly as written", items: keywords.map((k) => ({ key: `kw:${k}`, name: k, from: "keyword" as const, id: k, remove: { action: "removeKeyword", name: k } })) },
  ].filter((g) => g.items.length > 0);
}
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
  const { junk } = st.skills;
  const src = (name: string) => onSrc({ kind: "skill", name });
  return (
    <div data-review-skills>
      <Head title="Skills & expertise" line={`${st.count.skills} found · sorted by the Panameer catalog · click one to see where it came from`} />
      {skillGroups(st).map((g) => (
        <div key={g.key} data-skill-group={g.key} className="mb-4">
          <p className="mb-1.5 text-[12.5px] font-bold text-ink-2">
            {g.label} ({g.items.length}){g.note && <span className="font-normal"> {g.note}</span>}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {g.items.map((it) => (
              <Chip key={it.key} name={it.name} busy={busy} onSrc={() => src(it.name)} onRemove={() => act(it.remove)} />
            ))}
          </div>
        </div>
      ))}
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

// ── Part 1 + 2: the document in its own order, each piece colored by its type; "This is a…" moves it.
const TYPES: { key: Target; label: string; bucket: string; c: string; bg: string }[] = [
  { key: "employer", label: "Employer", bucket: "Employers", c: "#2f6fb0", bg: "#eaf2fb" },
  { key: "project", label: "Project", bucket: "Projects", c: "#1f8a5b", bg: "#eaf6f0" },
  { key: "edu", label: "Education", bucket: "Education", c: "#7a4fc0", bg: "#f2ecfb" },
  { key: "cert", label: "Certification", bucket: "Certifications", c: "#b26b00", bg: "#fff4e0" },
  { key: "skill", label: "Skill or expertise", bucket: "Skills & expertise", c: "#4a4658", bg: "#f1f0f4" },
  { key: "hidden", label: "Not needed", bucket: "Not needed", c: "#a0a0ad", bg: "#f7f7f9" },
];
const TYPE = Object.fromEntries(TYPES.map((t) => [t.key, t])) as Record<Target, (typeof TYPES)[number]>;

type Piece = { uid: string; type: Target; from: PieceKind | "hidden"; id: string; name: string; title: string | null; dates: string | null; why: string | null; group?: string; remove?: Record<string, unknown> };

function piecesOf(st: ReviewState): Piece[] {
  const p = (type: Target, from: Piece["from"], id: string, name: string, title: string | null, dates: string | null, why: string | null = null): Piece => ({ uid: `${from}:${id}`, type, from, id, name, title, dates, why });
  const listy = (n: string) => (splitList(n).length > 2 ? "looks like a list" : null);
  return [
    ...st.employers.map((e) => p("employer", "employer", e.id, e.name, e.title, e.dates, e.why)),
    ...st.projects.map((x) => (x.client ? p("project", "project", x.id, x.client, x.name !== x.client ? x.name : null, x.dates) : p("project", "project", x.id, x.name, null, x.dates))),
    ...st.edu.map((e) => p("edu", "edu", e.id, e.institution, e.degree, e.year ? String(e.year) : null)),
    ...st.certs.map((c) => p("cert", "cert", c.id, c.name, c.issuer, c.year ? String(c.year) : null, listy(c.name))),
    ...skillGroups(st).flatMap((g) => g.items.map((it) => ({ ...p("skill", it.from, it.id, it.name, null, null, listy(it.name)), group: g.label, remove: it.remove }))),
    ...st.skills.junk.map((n) => ({ ...p("skill", "term", n, n, null, null, "probably not a skill"), group: "Probably not skills", remove: { action: "dismiss", kind: "junk", names: [n] } })),
    ...st.hidden.map((h) => p("hidden", "hidden", h.id, h.name, h.title, null)),
  ];
}

/** What the piece becomes, mirroring the server's carry-over. */
function preview(x: Piece, to: Target) {
  const d = x.dates ? ` · ${x.dates}` : "";
  const parts = splitList(x.name);
  if (to === "employer") return `Name ${x.name}${x.title ? ` · Title ${x.title}` : ""}${d}`;
  if (to === "project") return `Client ${x.name} · Project ${x.title || x.name}${d}`;
  if (to === "edu") return `School ${x.name}${x.title ? ` · Degree ${x.title}` : ""}${d}`;
  if (to === "cert") return parts.length > 1 ? `split into ${parts.length}: ${parts.join(" · ")}` : `Name ${x.name}${x.title ? ` · Issuer ${x.title}` : ""}`;
  if (to === "skill") return `${parts.length > 1 ? `split into ${parts.length}: ${parts.join(" · ")}` : x.name} — the catalog files each as a skill, a specialization or a keyword`;
  return "hidden from your profile — you can restore it";
}

/** The document cut into lines; each piece claims the line its name first appears on. */
function blocks(text: string, pieces: Piece[]) {
  const lower = text.toLowerCase();
  const claims = new Map<number, { end: number; pieces: Piece[] }>();
  for (const x of pieces) {
    const n = x.name.toLowerCase().trim();
    const at = n.length > 1 ? lower.indexOf(n) : -1;
    if (at < 0) continue;
    const start = text.lastIndexOf("\n", at) + 1;
    const nl = text.indexOf("\n", at + n.length);
    const c = claims.get(start);
    if (c) c.pieces.push(x);
    else claims.set(start, { end: nl < 0 ? text.length : nl, pieces: [x] });
  }
  const out: ({ text: string } | { text: string; pieces: Piece[] })[] = [];
  let pos = 0;
  for (const [start, c] of [...claims.entries()].sort((a, b) => a[0] - b[0])) {
    if (start < pos) continue;
    if (start > pos) out.push({ text: text.slice(pos, start) });
    out.push({ text: text.slice(start, c.end), pieces: c.pieces });
    pos = c.end;
  }
  if (pos < text.length) out.push({ text: text.slice(pos) });
  return out;
}

function DocView({ st, act, busy }: { st: ReviewState; act: Act; busy: boolean }) {
  const pieces = useMemo(() => piecesOf(st), [st]);
  const parts = useMemo(() => blocks(st.text, pieces.filter((x) => x.type !== "hidden")), [st.text, pieces]);
  const [sel, setSel] = useState<string | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [more, setMore] = useState<Set<Target>>(new Set());
  const unsure = pieces.filter((x) => x.why && x.type !== "hidden").length;
  const pick = (uid: string, from: "doc" | "bucket") => {
    setSel(uid);
    const sideSel = from === "doc" ? `[data-bucket-piece="${CSS.escape(uid)}"]` : `[data-doc-pieces~="${CSS.escape(uid)}"]`;
    requestAnimationFrame(() => document.querySelector(sideSel)?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  };
  const move = async (x: Piece, to: Target) => {
    const ok = x.from === "hidden" ? await act({ action: "restore", id: x.id }) : await act({ action: "retype", from: x.from, ...(x.from === "term" ? { name: x.id } : { id: x.id }), to });
    if (ok) setMenu(null);
  };
  return (
    <div data-review-doc className="mt-4">
      <p className="text-[14px] text-ink-2">
        We split your résumé into {plural(pieces.filter((x) => x.type !== "hidden").length, "piece")}. Each color is what we think a piece is.
        {unsure > 0 && ` ${plural(unsure, "piece")} ${unsure === 1 ? "has" : "have"} a red dashed outline — we weren't sure.`} Click any piece to change it.
      </p>
      <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px]">
        {TYPES.map((t) => (
          <span key={t.key} className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-2.5" style={{ background: t.c }} />{t.label}</span>
        ))}
        <span className="inline-flex items-center gap-1"><i className="inline-block h-2.5 w-3 border border-dashed border-red-600" />not sure</span>
      </p>
      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="max-h-[640px] overflow-y-auto border border-line bg-white p-3 text-[12.5px] leading-relaxed">
          <p className="mb-2 text-[12px] font-bold text-ink-2">Your document{st.fileName ? ` · ${st.fileName}` : ""}</p>
          {parts.map((b, i) => {
            if (!("pieces" in b)) return <pre key={i} className="whitespace-pre-wrap font-sans text-ink-3">{b.text}</pre>;
            const t = TYPE[b.pieces[0].type];
            const doubt = b.pieces.some((x) => x.why);
            const on = b.pieces.some((x) => x.uid === sel);
            return (
              <button key={i} type="button" data-doc-pieces={b.pieces.map((x) => x.uid).join(" ")} onClick={() => pick(b.pieces[0].uid, "doc")} className={"my-1 block w-full border-l-4 px-2.5 py-1.5 text-left " + (doubt ? "outline-dashed outline-1 outline-red-600 " : "") + (on ? "ring-2 ring-ink" : "")} style={{ borderColor: t.c, background: t.bg }}>
                <span className="mb-0.5 inline-block px-1 text-[10px] font-bold tracking-[0.06em] text-white" style={{ background: t.c }}>
                  {t.label.toUpperCase()}{b.pieces.length > 1 ? ` · ${b.pieces.length}` : ""}{doubt ? "?" : ""}
                </span>
                <pre className="whitespace-pre-wrap font-sans">{b.text}</pre>
                {doubt && <span className="text-[11.5px] font-semibold text-red-700">not sure — {b.pieces.find((x) => x.why)!.why}</span>}
              </button>
            );
          })}
        </div>
        <div>
          <p className="mb-2 text-[12px] font-bold text-ink-2">Sorted into <span className="font-normal">click &ldquo;This is a…&rdquo; to move</span></p>
          {TYPES.map((t) => {
            const items = pieces.filter((x) => x.type === t.key);
            const shown = more.has(t.key) ? items : items.slice(0, 8);
            return (
              <div key={t.key} data-bucket={t.key} className="mb-2.5 border border-line">
                <p className="flex justify-between border-l-4 px-3 py-1.5 text-[13px] font-bold" style={{ borderColor: t.c, background: t.bg }}>
                  {t.bucket} <span>{items.length}</span>
                </p>
                {items.length === 0 && <p className="px-3 py-2 text-[12.5px] text-ink-3">Nothing here yet</p>}
                {t.key === "skill" && [...new Set(items.map((x) => x.group))].map((g) => (
                  <div key={g} className="border-t border-line px-3 py-2">
                    <p className="mb-1 text-[11.5px] font-bold text-ink-2">{g}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {items.filter((x) => x.group === g).map((x) => (
                        <span key={x.uid} data-bucket-piece={x.uid} className={"relative " + CHIP + (x.why ? " border-dashed border-red-600 bg-red-50" : "") + (x.uid === sel ? " ring-2 ring-ink" : "")}>
                          <button type="button" onClick={() => pick(x.uid, "bucket")} className="text-left hover:underline">{x.name}</button>
                          {x.why && (
                            <button type="button" data-retype aria-label={`This is a… ${x.name}`} onClick={() => { setMenu(menu === x.uid ? null : x.uid); setSel(x.uid); }} className="text-[11px] font-bold">▾</button>
                          )}
                          <button type="button" aria-label={`Remove ${x.name}`} disabled={busy} onClick={() => x.remove && act(x.remove)} className={X}>✕</button>
                          {menu === x.uid && <Retype x={x} busy={busy} onCancel={() => setMenu(null)} onMove={(to) => move(x, to)} />}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {t.key !== "skill" && shown.map((x) => (
                  <div key={x.uid} data-bucket-piece={x.uid} className={"relative flex items-center justify-between gap-2 border-t border-line px-3 py-1.5 text-[13px] " + (x.why ? "bg-red-50 " : "") + (x.uid === sel ? "ring-2 ring-inset ring-ink" : "")}>
                    <button type="button" onClick={() => pick(x.uid, "bucket")} className="min-w-0 text-left">
                      <span className="block truncate">{x.name}{x.dates ? <span className="text-ink-3"> · {x.dates}</span> : null}</span>
                      {x.why && <span className="text-[10.5px] font-bold tracking-[0.06em] text-red-700">NOT SURE</span>}
                    </button>
                    {x.from === "hidden" ? (
                      <button type="button" disabled={busy} onClick={() => move(x, "hidden")} className={BTN}>Restore</button>
                    ) : (
                      <button type="button" data-retype onClick={() => { setMenu(menu === x.uid ? null : x.uid); setSel(x.uid); }} className="shrink-0 border border-ink bg-white px-2 py-0.5 text-[12px] font-bold">
                        This Is a… ▾
                      </button>
                    )}
                    {menu === x.uid && <Retype x={x} busy={busy} onCancel={() => setMenu(null)} onMove={(to) => move(x, to)} />}
                  </div>
                ))}
                {t.key !== "skill" && items.length > 8 && !more.has(t.key) && (
                  <button type="button" onClick={() => setMore(new Set([...more, t.key]))} className="w-full border-t border-line px-3 py-1.5 text-left text-[12.5px] font-bold text-magenta">
                    + {items.length - 8} More
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-2 text-[12.5px] text-ink-3">The document recolors as you move pieces. &ldquo;Read my résumé again&rdquo; keeps every move.</p>
    </div>
  );
}

function Retype({ x, busy, onCancel, onMove }: { x: Piece; busy: boolean; onCancel: () => void; onMove: (to: Target) => void }) {
  const [to, setTo] = useState<Target | null>(null);
  return (
    <div data-retype-pop className="absolute right-0 top-full z-20 w-[300px] border-2 border-ink bg-white shadow-lg">
      <p className="border-b border-line px-3 py-2 text-[12.5px]">
        &ldquo;{x.name}&rdquo; — we filed this as {/^[AEIOU]/.test(TYPE[x.type].label) ? "an" : "a"} <b>{TYPE[x.type].label}</b>. What is it?
      </p>
      {TYPES.map((t) => (
        <button key={t.key} type="button" disabled={t.key === x.type && x.from !== "term"} onClick={() => setTo(t.key)} className={"flex w-full items-center justify-between border-b border-line px-3 py-1.5 text-left text-[13px] disabled:text-ink-3 " + (to === t.key ? "font-bold" : "")} style={to === t.key ? { background: t.bg } : undefined}>
          <span className="inline-flex items-center gap-2"><i className="inline-block h-2.5 w-2.5" style={{ background: t.c }} />{t.label}</span>
          {to === t.key && "✓"}
        </button>
      ))}
      {to && <p className="px-3 py-2 text-[12px] text-ink-2">Moves to {TYPE[to].label} as: {preview(x, to)}</p>}
      <div className="flex justify-end gap-2 border-t border-line px-3 py-2">
        <button type="button" onClick={onCancel} className="text-[12.5px] font-semibold text-ink-2">Cancel</button>
        <button type="button" disabled={busy || !to} onClick={() => to && onMove(to)} className="bg-ink px-3 py-1.5 text-[12.5px] font-bold text-surface disabled:opacity-50">Move</button>
      </div>
    </div>
  );
}
