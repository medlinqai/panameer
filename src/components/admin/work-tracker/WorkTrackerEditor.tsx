"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * The Work Tracker Builder (`P2-ALL-E752`).
 *
 * ⚠⚠ **THE OPEN PAGE PATTERN** (`phase_3_ui.md`, `P2-A1.1-E745`): no boxes, thin
 * `border-line` rules, the page paints `bg-surface` — ⚠⚠⚠ **never `bg-white`
 * (`E723`)** — square 4px actions in solid ink, and **magenta for links and
 * eyebrows only** (`E433`).
 *
 * ⚠ Every write posts to one route and then `router.refresh()`s, so the server
 * component re-reads and the screen shows what the DATABASE holds, not what this
 * component hoped it wrote. ⚠⚠ No optimistic local state for statuses: a tracker
 * whose screen disagrees with its own table is the defect it exists to prevent.
 */

type Task = { id: string; segment: string; task: string; status: string; owner: string; note: string };
type Stage = { name: string; tasks: Task[] };
type Phase = { name: string; purpose: string; outcome: string; start: string; end: string; stages: Stage[] };
type Gate = { id: string; after: string; title: string; criteria: { index: number; text: string; value: string }[] };
type Shipped = { id: string; date: string; journeyTag: string; title: string; body: string; published: boolean };

const TASK_STATUSES = ["Not Started", "In Progress", "Blocked", "Done", "N/A"];
const GATE_VALUES = ["No", "Yes", "N/A"];

/** ⚠ `N/A` leaves the denominator — see `percentDone` in `catalog.ts`, which is
 *  the server-side half of this same rule. Two copies would drift (`E585`), so
 *  this one does nothing the other does not. */
function pct(tasks: Task[]): number | null {
  const counted = tasks.filter((t) => t.status !== "N/A");
  if (counted.length === 0) return null;
  return Math.round((counted.filter((t) => t.status === "Done").length / counted.length) * 100);
}

const FIELD =
  "w-full border border-line bg-surface px-2 py-1.5 text-[13px] text-ink focus:border-ink focus:outline-none";
const BTN =
  "inline-flex min-h-[36px] items-center rounded-[4px] bg-ink px-3 text-[13px] font-bold text-white transition-opacity hover:opacity-85 disabled:opacity-40";
const BTN_2 =
  "inline-flex min-h-[36px] items-center rounded-[4px] border border-ink bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:bg-ink/5 disabled:opacity-40";

export function WorkTrackerEditor({
  phases,
  gates,
  shipped,
}: {
  phases: Phase[];
  gates: Gate[];
  shipped: Shipped[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openPhase, setOpenPhase] = useState<string>(phases[0]?.name ?? "");

  async function post(payload: Record<string, unknown>) {
    setError(null);
    const res = await fetch("/api/admin/work-tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      /* ⚠ The route's message names the field or id it refused; showing a generic
         "could not save" would make an admin retype a whole form to find out. */
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setError(j.error ?? "Could not save");
      return false;
    }
    start(() => router.refresh());
    return true;
  }

  const allTasks = phases.flatMap((p) => p.stages.flatMap((s) => s.tasks));
  const overall = pct(allTasks);

  return (
    <div className="bg-surface">
      <header className="border-b border-line pb-5">
        <p className="text-[12px] font-bold uppercase tracking-[0.12em] text-magenta">Work Tracker</p>
        <h1 className="mt-1 font-display text-[26px] font-bold tracking-[-0.3px] text-ink">
          The build, as it stands
        </h1>
        <p className="mt-1.5 max-w-[70ch] text-[14px] leading-relaxed text-ink-2">
          This is the admin side of status.panameer.com. Task text and gate criteria are shown here and
          never leave this page — the public view carries phases, gates and stages only.
        </p>
        <p className="mt-3 text-[13px] text-ink-2">
          {/* ⚠⚠ A REAL ZERO AND AN UNCOUNTABLE FIGURE MUST NOT LOOK THE SAME
              (`decisions_2026-09-23.md` §1). `null` here means every task is
              `N/A`, so the dash carries its reason rather than reading as 0%. */}
          {overall === null ? (
            <>
              <span className="font-bold text-ink">—</span> overall · nothing countable yet (every task is
              N/A)
            </>
          ) : (
            <>
              <span className="font-bold text-ink">{overall}%</span> overall ·{" "}
              {allTasks.filter((t) => t.status === "Done").length} of{" "}
              {allTasks.filter((t) => t.status !== "N/A").length} tasks done
            </>
          )}
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-4 border-l-2 border-magenta pl-3 text-[13px] text-ink">
          {error}
        </p>
      )}

      {/* ── PHASES → STAGES → TASKS ─────────────────────────────────────── */}
      <section className="mt-7">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Phases</h2>

        <div className="mt-3 border-t border-line">
          {phases.map((p) => {
            const tasks = p.stages.flatMap((s) => s.tasks);
            const phasePct = pct(tasks);
            const isOpen = openPhase === p.name;
            return (
              <div key={p.name} className="border-b border-line">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
                  <button
                    type="button"
                    onClick={() => setOpenPhase(isOpen ? "" : p.name)}
                    aria-expanded={isOpen}
                    className="text-left font-display text-[17px] font-bold text-ink"
                  >
                    {p.name}
                  </button>
                  <span className="text-[13px] text-ink-2">
                    {phasePct === null ? "— not countable" : `${phasePct}%`} · {tasks.length} tasks ·{" "}
                    {p.stages.length} stages
                  </span>
                  <label className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-2">
                    Start
                    <input
                      type="date"
                      defaultValue={p.start}
                      onBlur={(e) => post({ action: "phase-dates", phase: p.name, start: e.target.value })}
                      className="border border-line bg-surface px-1.5 py-1 text-[12px] text-ink"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-[12px] text-ink-2">
                    End
                    <input
                      type="date"
                      defaultValue={p.end}
                      onBlur={(e) => post({ action: "phase-dates", phase: p.name, end: e.target.value })}
                      className="border border-line bg-surface px-1.5 py-1 text-[12px] text-ink"
                    />
                  </label>
                </div>

                {isOpen &&
                  p.stages.map((s) => (
                    <div key={s.name} className="border-t border-line py-3 pl-3">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h3 className="text-[14px] font-bold text-ink">{s.name}</h3>
                        <span className="text-[12px] text-ink-2">
                          {pct(s.tasks) === null ? "— not countable" : `${pct(s.tasks)}%`} · {s.tasks.length}
                        </span>
                        {/* ⚠ BULK SET BY STAGE — the brief's one bulk affordance. It
                            writes only the tasks the CATALOG puts in this stage. */}
                        <label className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-2">
                          Set all
                          <select
                            value=""
                            disabled={pending}
                            onChange={(e) => {
                              if (!e.target.value) return;
                              void post({
                                action: "stage",
                                phase: p.name,
                                stage: s.name,
                                status: e.target.value,
                              });
                            }}
                            className="border border-line bg-surface px-1.5 py-1 text-[12px] text-ink"
                          >
                            <option value="">…</option>
                            {TASK_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <ul className="mt-2">
                        {s.tasks.map((t) => (
                          <li
                            key={t.id}
                            className="grid grid-cols-1 gap-2 border-t border-line py-2 sm:grid-cols-[88px_1fr_132px_120px_1fr]"
                          >
                            <span className="font-mono text-[12px] text-ink-2">{t.id}</span>
                            <span className="text-[13px] text-ink">
                              {t.task}
                              <span className="ml-2 text-[12px] text-ink-2">{t.segment}</span>
                            </span>
                            <select
                              defaultValue={t.status}
                              disabled={pending}
                              onChange={(e) => post({ action: "task", taskId: t.id, status: e.target.value })}
                              className={FIELD}
                            >
                              {TASK_STATUSES.map((st) => (
                                <option key={st} value={st}>
                                  {st}
                                </option>
                              ))}
                            </select>
                            <input
                              defaultValue={t.owner}
                              placeholder="Owner"
                              onBlur={(e) => post({ action: "task", taskId: t.id, owner: e.target.value })}
                              className={FIELD}
                            />
                            <input
                              defaultValue={t.note}
                              placeholder="Note"
                              onBlur={(e) => post({ action: "task", taskId: t.id, note: e.target.value })}
                              className={FIELD}
                            />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── GATES ───────────────────────────────────────────────────────── */}
      <section className="mt-9">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Gates</h2>
        <div className="mt-3 border-t border-line">
          {gates.map((g) => {
            const answered = g.criteria.filter((c) => c.value !== "").length;
            const passed = g.criteria.every((c) => c.value === "Yes" || c.value === "N/A");
            return (
              /* ⚠ `data-testid` IS DELIBERATE, NOT DEBRIS. The gate block has no
                 stable wrapper otherwise, and a locator that walks up from the
                 heading to a guessed `div` matches the inner flex row instead —
                 it went green-by-absence on the first run. Same reasoning as
                 `PageTabs`' own testid. */
              <div key={g.id} data-testid={`gate-${g.id.replace(/\s+/g, "-").toLowerCase()}`} className="border-b border-line py-3">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h3 className="font-display text-[16px] font-bold text-ink">{g.id}</h3>
                  <span className="text-[14px] text-ink">{g.title}</span>
                  <span className="text-[12px] text-ink-2">
                    after {g.after} · {answered} of {g.criteria.length} answered ·{" "}
                    {passed ? "passed" : "open"}
                  </span>
                </div>
                <ul className="mt-2">
                  {g.criteria.map((c) => (
                    <li
                      key={c.index}
                      className="grid grid-cols-1 items-center gap-2 border-t border-line py-2 sm:grid-cols-[1fr_120px]"
                    >
                      <span className="text-[13px] text-ink">{c.text}</span>
                      <select
                        defaultValue={c.value}
                        disabled={pending}
                        onChange={(e) =>
                          post({
                            action: "gate",
                            gateId: g.id,
                            criterionIndex: c.index,
                            value: e.target.value,
                          })
                        }
                        className={FIELD}
                      >
                        {/* ⚠ "Unanswered" is not a stored value — picking it is not
                            offered, because un-deciding is not a decision. It shows
                            only while nothing has been chosen. */}
                        {c.value === "" && <option value="">Unanswered</option>}
                        {GATE_VALUES.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SHIPPED ─────────────────────────────────────────────────────── */}
      <section className="mt-9 pb-10">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Shipped</h2>
        <p className="mt-1 text-[13px] text-ink-2">
          New entries are drafts. Nothing reaches the public page until you publish it.
        </p>

        <ShippedForm onCreate={post} pending={pending} />

        <div className="mt-5 border-t border-line">
          {shipped.length === 0 ? (
            <p className="py-4 text-[13px] text-ink-2">No entries yet. The first one is the form above.</p>
          ) : (
            shipped.map((s) => (
              <div
                key={s.id}
                className="grid grid-cols-1 gap-2 border-b border-line py-3 sm:grid-cols-[104px_120px_1fr_auto]"
              >
                <span className="text-[13px] text-ink-2">{s.date}</span>
                <span className="text-[13px] text-ink-2">{s.journeyTag || "—"}</span>
                <span className="text-[13px] text-ink">
                  <span className="font-bold">{s.title}</span>
                  {s.body && <span className="block text-ink-2">{s.body}</span>}
                </span>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => post({ action: "shipped-update", id: s.id, published: !s.published })}
                    className={s.published ? BTN_2 : BTN}
                  >
                    {s.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => post({ action: "shipped-delete", id: s.id })}
                    className={BTN_2}
                  >
                    Delete
                  </button>
                </span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ShippedForm({
  onCreate,
  pending,
}: {
  onCreate: (p: Record<string, unknown>) => Promise<boolean>;
  pending: boolean;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [journeyTag, setJourneyTag] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  return (
    <form
      className="mt-3 grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-[132px_140px_1fr_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onCreate({ action: "shipped-create", date, journeyTag, title, body });
        /* ⚠ The form clears only on SUCCESS. Clearing on failure would throw away
           what the admin typed and tell them nothing. */
        if (ok) {
          setTitle("");
          setBody("");
          setJourneyTag("");
        }
      }}
    >
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={FIELD} />
      <input
        value={journeyTag}
        onChange={(e) => setJourneyTag(e.target.value)}
        placeholder="Tag"
        className={FIELD}
      />
      <span className="grid gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What shipped"
          required
          className={FIELD}
        />
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A sentence, optional"
          className={FIELD}
        />
      </span>
      <button type="submit" disabled={pending || title.trim() === ""} className={BTN}>
        Add Draft
      </button>
    </form>
  );
}
