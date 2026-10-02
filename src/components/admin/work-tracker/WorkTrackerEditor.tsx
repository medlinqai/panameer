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

type Task = {
  id: string;
  segment: string;
  task: string;
  status: string;
  owner: string;
  note: string;
  /** ⚠ "" = no stage set; renders no segments on the public page, not a guess. */
  stage: string;
  isJourney: boolean;
  releaseId: string;
};
type Stage = { name: string; tasks: Task[] };
type Phase = {
  name: string;
  purpose: string;
  outcome: string;
  isCurrent: boolean;
  start: string;
  end: string;
  stages: Stage[];
};
type Gate = { id: string; after: string; title: string; criteria: { index: number; text: string; value: string }[] };
type Shipped = { id: string; date: string; journeyTag: string; title: string; body: string; published: boolean };
type Release = {
  id: string;
  code: string;
  title: string;
  summary: string;
  date: string;
  status: string;
  published: boolean;
};
type CustomTask = { id: string; title: string; phase: string; status: string; releaseId: string };

const TASK_STATUSES = ["Not Started", "In Progress", "Blocked", "Done", "N/A"];
const GATE_VALUES = ["No", "Yes", "N/A"];
/** ⚠⚠ THE FOUR JOURNEY STAGES. "" clears it back to no segments (`E757`). */
const JOURNEY_STAGES = ["design", "build", "test", "live"];
const RELEASE_STATUSES = ["Planned", "In progress", "Done"];

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
  /* ⚠ `text-surface`, not `text-white` — `--color-ink` inverts in dark mode and
   `white` does not, which renders a near-white label on a near-white fill
   (measured on the share bar, `E755`). */
  "inline-flex min-h-[36px] items-center rounded-[4px] bg-ink px-3 text-[13px] font-bold text-surface transition-opacity hover:opacity-85 disabled:opacity-40";
const BTN_2 =
  "inline-flex min-h-[36px] items-center rounded-[4px] border border-ink bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:bg-ink/5 disabled:opacity-40";

export function WorkTrackerEditor({
  phases,
  gates,
  releases,
  customTasks,
  shipped,
}: {
  phases: Phase[];
  gates: Gate[];
  releases: Release[];
  customTasks: CustomTask[];
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
                  {/*
                    ⚠⚠⚠ THE ADMIN NAMES THE CURRENT PHASE (Scott, 2026-10-02).
                    ⚠ It is the FIRST of three sources — admin, then the dates,
                    then the first phase under 100%. ⚠⚠ The old page had only the
                    third, which returns `Define` the moment one Define task is
                    open, and it had been saying `Define` while the work was in
                    `Build`. ⚠ A radio, not a checkbox: exactly one phase is
                    current, and the writer clears the others in one transaction.
                  */}
                  <label className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-2">
                    <input
                      type="radio"
                      name="current-phase"
                      checked={p.isCurrent}
                      disabled={pending}
                      onChange={() => post({ action: "current-phase", phase: p.name })}
                    />
                    Current
                  </label>
                  <label className="flex items-center gap-1.5 text-[12px] text-ink-2">
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
                        {/* ⚠⚠ BULK ASSIGN BY STAGE — Scott's example was *"all of
                            Prototype 2 → R1."* ⚠ It writes only the tasks the
                            CATALOG puts in this stage, in ONE transaction: a bulk
                            write that half-lands leaves a release's percentage
                            wrong and nobody knows which half. */}
                        <label className="ml-auto flex items-center gap-1.5 text-[12px] text-ink-2">
                          → release
                          <select
                            value=""
                            disabled={pending}
                            onChange={(e) => {
                              if (!e.target.value) return;
                              void post({
                                action: "bulk-release",
                                phase: p.name,
                                stage: s.name,
                                releaseId: e.target.value === "none" ? null : e.target.value,
                              });
                            }}
                            className="border border-line bg-surface px-1.5 py-1 text-[12px] text-ink"
                          >
                            <option value="">…</option>
                            <option value="none">No release</option>
                            {releases.map((r) => (
                              <option key={r.id} value={r.id}>
                                {r.code || r.title}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex items-center gap-1.5 text-[12px] text-ink-2">
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
                            className="grid grid-cols-1 gap-2 border-t border-line py-2 sm:grid-cols-[88px_1fr_132px_110px_1fr_110px_110px]"
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
                            {/* ⚠⚠ THE STAGE PICKER IS ONLY ON THE TEN JOURNEY ROWS
                                (`E757`). An ordinary AIM task has no four-segment
                                bar on the public page, so offering it one here
                                would invite data that nothing renders. */}
                            {/* ⚠⚠ THE RELEASE PICKER IS ON EVERY TASK, not only
                                journeys — Scott assigns ordinary catalog work to
                                R1 too. ⚠ "No release" is selectable because
                                unassigning is a real action: the task stops
                                counting toward that release's percentage. */}
                            <select
                              defaultValue={t.releaseId}
                              disabled={pending}
                              onChange={(e) =>
                                post({ action: "task-release", taskId: t.id, releaseId: e.target.value })
                              }
                              className={FIELD}
                              aria-label={`${t.id} release`}
                            >
                              <option value="">No release</option>
                              {releases.map((r) => (
                                <option key={r.id} value={r.id}>
                                  {r.code || r.title}
                                </option>
                              ))}
                            </select>
                            {t.isJourney && (
                              <select
                                defaultValue={t.stage}
                                disabled={pending}
                                onChange={(e) => post({ action: "task", taskId: t.id, stage: e.target.value })}
                                className={FIELD}
                                aria-label={`${t.id} journey stage`}
                              >
                                {/* ⚠ "No stage" is selectable, because clearing must
                                    be possible — null renders no segments, which is
                                    an honest "not started", not a guess. */}
                                <option value="">No stage</option>
                                {JOURNEY_STAGES.map((j) => (
                                  <option key={j} value={j}>
                                    {j}
                                  </option>
                                ))}
                              </select>
                            )}
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
                        {/* ⚠⚠⚠ "Not answered" IS SELECTABLE (Scott, 2026-10-02:
                            *"yes, an admin can clear one"*). Picking it DELETES the
                            row, which is the only way back to unanswered — and
                            unanswered is a different fact from `No`, so it cannot be
                            represented by writing a value.
                            ⚠ SUPERSEDED, quoted not deleted (`E164`):
                            //   "Unanswered" is not a stored value - picking it is
                            //   not offered, because un-deciding is not a decision. */}
                        <option value="">Not answered</option>
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

      {/* ── MILESTONES ──────────────────────────────────────────────────── */}
      <section className="mt-9">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Releases</h2>
        {/* ⚠⚠ THEIR OWN LIST, NOT JOURNEYS (Scott, 2026-10-02). The Build Line's
            flags and the public Milestones section both read from this table —
            `PNM-011`/`PNM-012` stay catalog tasks and leave the Journeys grid. */}
        <p className="mt-1 text-[13px] text-ink-2">
          Releases carry scope: assign tasks to one and the page shows its own percentage. A new release is a draft until you publish it.
        </p>

        <ReleaseForm onCreate={post} pending={pending} />

        <div className="mt-5 border-t border-line">
          {releases.length === 0 ? (
            <p className="py-4 text-[13px] text-ink-2">No releases yet.</p>
          ) : (
            releases.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-1 gap-2 border-b border-line py-3 sm:grid-cols-[72px_104px_1fr_132px_auto]"
              >
                {/* ⚠ `code` is what Scott says out loud — R1, R2. */}
                <input
                  defaultValue={m.code}
                  placeholder="R1"
                  onBlur={(e) => post({ action: "release-update", id: m.id, code: e.target.value })}
                  className={FIELD}
                  aria-label="Release code"
                />
                <input
                  type="date"
                  defaultValue={m.date}
                  onBlur={(e) => post({ action: "release-update", id: m.id, date: e.target.value })}
                  className={FIELD}
                  aria-label="Target date"
                />
                <span className="grid gap-1">
                  <input
                    defaultValue={m.title}
                    onBlur={(e) => post({ action: "release-update", id: m.id, title: e.target.value })}
                    className={FIELD}
                  />
                  {/* ⚠ `summary` is the PUBLIC line; the admin note stays private. */}
                  <input
                    defaultValue={m.summary}
                    placeholder="One public line"
                    onBlur={(e) => post({ action: "release-update", id: m.id, summary: e.target.value })}
                    className={FIELD}
                  />
                </span>
                <select
                  defaultValue={m.status}
                  disabled={pending}
                  onChange={(e) => post({ action: "release-update", id: m.id, status: e.target.value })}
                  className={FIELD}
                  aria-label={`${m.title} status`}
                >
                  {RELEASE_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <span className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => post({ action: "release-update", id: m.id, published: !m.published })}
                    className={m.published ? BTN_2 : BTN}
                  >
                    {m.published ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => post({ action: "release-delete", id: m.id })}
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

      {/* ── ADMIN-ADDED TASKS ───────────────────────────────────────────── */}
      <section className="mt-9">
        <h2 className="text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">Your own tasks</h2>
        {/*
          ⚠⚠⚠ WORK THE AIM CATALOG DOES NOT HAVE (`P2-ALL-E765`). The catalog is a
          STATIC FILE and deliberately so — it is the published method — so adding
          Panameer's own work to it would turn the method into a scratchpad.
          ⚠⚠ **THE TITLE IS ADMIN-ONLY.** These count toward a release's percentage
          exactly like catalog tasks, and the public page shows the COUNT and never
          the title. The leak test asserts it.
        */}
        <p className="mt-1 text-[13px] text-ink-2">
          These count toward a release like catalog tasks. Their titles never leave this page.
        </p>

        <CustomTaskForm onCreate={post} pending={pending} phases={phases.map((p) => p.name)} releases={releases} />

        <div className="mt-5 border-t border-line">
          {customTasks.length === 0 ? (
            <p className="py-4 text-[13px] text-ink-2">None yet.</p>
          ) : (
            customTasks.map((c) => (
              <div
                key={c.id}
                className="grid grid-cols-1 gap-2 border-b border-line py-3 sm:grid-cols-[1fr_120px_132px_110px_auto]"
              >
                <input
                  defaultValue={c.title}
                  onBlur={(e) => post({ action: "custom-update", id: c.id, title: e.target.value })}
                  className={FIELD}
                />
                <span className="text-[13px] text-ink-2">{c.phase}</span>
                <select
                  defaultValue={c.status}
                  disabled={pending}
                  onChange={(e) => post({ action: "custom-update", id: c.id, status: e.target.value })}
                  className={FIELD}
                  aria-label={`${c.title} status`}
                >
                  {TASK_STATUSES.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
                <select
                  defaultValue={c.releaseId}
                  disabled={pending}
                  onChange={(e) => post({ action: "custom-update", id: c.id, releaseId: e.target.value })}
                  className={FIELD}
                  aria-label={`${c.title} release`}
                >
                  <option value="">No release</option>
                  {releases.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code || r.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => post({ action: "custom-delete", id: c.id })}
                  className={BTN_2}
                >
                  Delete
                </button>
              </div>
            ))
          )}
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

function CustomTaskForm({
  onCreate,
  pending,
  phases,
  releases,
}: {
  onCreate: (p: Record<string, unknown>) => Promise<boolean>;
  pending: boolean;
  phases: string[];
  releases: Release[];
}) {
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState(phases[0] ?? "");
  const [releaseId, setReleaseId] = useState("");

  return (
    <form
      className="mt-3 grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-[1fr_140px_140px_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onCreate({ action: "custom-create", title, phase, releaseId });
        /* ⚠ Clears only on SUCCESS — a failed save must not throw away what was
           typed and say nothing. */
        if (ok) setTitle("");
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="A task the catalog does not have"
        required
        className={FIELD}
      />
      <select value={phase} onChange={(e) => setPhase(e.target.value)} className={FIELD} aria-label="Phase">
        {phases.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </select>
      <select
        value={releaseId}
        onChange={(e) => setReleaseId(e.target.value)}
        className={FIELD}
        aria-label="Release"
      >
        <option value="">No release</option>
        {releases.map((r) => (
          <option key={r.id} value={r.id}>
            {r.code || r.title}
          </option>
        ))}
      </select>
      <button type="submit" disabled={pending || title.trim() === ""} className={BTN}>
        Add Task
      </button>
    </form>
  );
}

function ReleaseForm({
  onCreate,
  pending,
}: {
  onCreate: (p: Record<string, unknown>) => Promise<boolean>;
  pending: boolean;
}) {
  const [code, setCode] = useState("");
  const [date, setDate] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  return (
    <form
      className="mt-3 grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-[72px_132px_1fr_auto]"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await onCreate({ action: "release-create", code, date, title, summary: description });
        /* ⚠ Clears only on SUCCESS — a failed save must not throw away what the
           admin typed and tell them nothing. */
        if (ok) {
          setCode("");
          setTitle("");
          setDescription("");
        }
      }}
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="R2"
        className={FIELD}
        aria-label="Release code"
      />
      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={FIELD} />
      <span className="grid gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Name, e.g. Public beta"
          required
          className={FIELD}
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="One line, optional"
          className={FIELD}
        />
      </span>
      {/* ⚠ `Add Release`, not `Add Draft` — the Shipped form already owns that
          label and two identical buttons on one page is ambiguous to a person and
          to a locator (it broke the gate as a strict-mode violation). */}
      <button type="submit" disabled={pending || title.trim() === "" || date === ""} className={BTN}>
        Add Release
      </button>
    </form>
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
