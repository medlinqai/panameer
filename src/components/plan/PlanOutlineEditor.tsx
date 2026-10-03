"use client";

/**
 * ── ⚠⚠⚠ THE PLAN OUTLINE EDITOR (`P2-ALL-E784`) ────────────────────────────
 *
 * ⚠ **SCOTT:** a plan is *"set up in 5–15 minutes"*. ⚠⚠ **SO THIS IS AN OUTLINE,
 * NOT A FORM.** You type a row, press Enter, type the next one. A form with an
 * Add dialog per row is the thing that made the AIM tracker *"too complicated"*.
 *
 * ⚠⚠⚠ **IT TAKES ITS PLAN AS PROPS AND POSTS TO AN ENDPOINT IT IS GIVEN, SO
 * WORK ORDERS MOUNT THE SAME COMPONENT IN R2** (the brief's requirement). It
 * knows nothing about `/admin`, nothing about the Panameer build, and nothing
 * about who is allowed to edit — that is the route's job, and the route resolves
 * the plan from an owner key rather than trusting an id from here.
 *
 * ⚠ Numbering is NOT held here: it comes from `buildTree` in `lib/plan/model.ts`,
 * the same function `/status` renders from, so the editor and the public page
 * cannot number a plan differently (`E585`).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MILESTONE_MARK, ROW_STATUSES, buildTree, flattenTree, isLate, type PlanRowLike, type RowStatus, type RowType } from "@/lib/plan/model";
/** ⚠ `toEditorRow` is imported, not defined here: the admin SERVER page calls it
 *  too, and a function exported from a `"use client"` module cannot be called
 *  from the server. See `lib/plan/editor-row.ts`. */
import { toEditorRow, toModelRow, type EditorRow } from "@/lib/plan/editor-row";

export type ReleaseOption = { id: string; label: string };

/**
 * ⚠ 44px, not the 36px the rest of admin uses. The brief asks for it on the row
 * controls and `E789` asks for it everywhere; a 36px × on a phone is a miss.
 */
const TAP = "inline-flex h-11 w-11 items-center justify-center rounded-[4px] text-[15px] text-ink-2 transition-colors hover:bg-ink/5 disabled:opacity-30";
const BTN = "inline-flex min-h-11 items-center rounded-[4px] bg-ink px-3 text-[13px] font-bold text-surface transition-opacity hover:opacity-85 disabled:opacity-40";
const BTN_2 = "inline-flex min-h-11 items-center rounded-[4px] border border-ink bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:bg-ink/5 disabled:opacity-40";
/** ⚠ A thin underline, not a box: twenty boxed inputs read as a form. */
const LINE = "w-full border-0 border-b border-line bg-transparent px-0 py-1.5 text-[14px] text-ink outline-none focus:border-magenta";

type SaveState = "idle" | "saving" | "saved" | "error";

export function PlanOutlineEditor({
  rows: initialRows,
  ownerKey,
  endpoint = "/api/admin/plan",
  releases = [],
  today = new Date(),
}: {
  rows: EditorRow[];
  ownerKey: string;
  endpoint?: string;
  releases?: ReleaseOption[];
  today?: Date;
}) {
  const [rows, setRows] = useState<EditorRow[]>(initialRows);
  const [inFlight, setInFlight] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<SaveState>("idle");
  /** ⚠⚠ The last delete, held CLIENT-SIDE. A server-side undo buffer in a shared
   *  process would belong to whoever edited last. */
  const [undo, setUndo] = useState<{ rows: unknown[]; label: string } | null>(null);
  /** ⚠⚠ A REF, NOT STATE. The row to focus is written by an event handler and
   *  read by an effect; holding it in state would mean calling `setState` inside
   *  that effect, which is the `react-hooks/set-state-in-effect` error this repo
   *  carries eleven of already and adds none to. */
  const focusRef = useRef<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  /** ⚠ What each pending timer would have sent, so `flush` can send it now. */
  const payloads = useRef(new Map<string, Record<string, unknown>>());
  /**
   * ── ⚠⚠⚠ A PENDING KEYSTROKE IS UNSAVED WORK, AND THE PAGE HAS TO SAY SO ────
   *
   * ⚠⚠ **FOUND BY THE GATE, AND IT WAS A REAL DEFECT, NOT A TEST ARTEFACT.**
   * The indicator counted requests IN FLIGHT only, so between a keystroke and
   * the 500ms debounce firing it read **"All changes saved"** — about text that
   * had not left the browser. A reload in that window lost the edit silently,
   * which is the one thing `E768`'s save tick exists to prevent.
   * ⚠ So pending debounces are counted too, and the field flushes on blur.
   */
  const [pending, setPending] = useState(0);

  /**
   * ⚠⚠ KEEPING PROPS AND STATE IN STEP **WITHOUT AN EFFECT**. When the server
   * re-renders — `PlanStartFrom` applying a template, say — `initialRows` is a
   * new array and the local copy is stale.
   * ⚠ This is React's documented "adjusting state when a prop changes" pattern:
   * compare during render and set immediately, which re-renders before anything
   * is painted. ⚠⚠ The obvious `useEffect(() => setRows(initialRows))` is the
   * `set-state-in-effect` error, and the rule here is 0 NEW.
   */
  const [seenRows, setSeenRows] = useState(initialRows);
  if (initialRows !== seenRows) {
    setSeenRows(initialRows);
    /**
     * ⚠⚠ A SNAPSHOT THAT ARRIVES WHILE WORK IS UNSAVED IS STALE BY DEFINITION,
     * AND IT IS DROPPED RATHER THAN QUEUED. `seenRows` is marked either way, so
     * it cannot be applied later once the writes settle — by then the editor's
     * own read (`reload`) is newer than anything the server sent before them.
     * ⚠ This is the second half of the fix above: one stops the editor racing
     * itself, this stops any other refresh overwriting live keystrokes.
     */
    if (inFlight === 0 && pending === 0) setRows(initialRows);
  }

  const post = useCallback(
    async (payload: Record<string, unknown>): Promise<Record<string, unknown> | null> => {
      setInFlight((n) => n + 1);
      setState("saving");
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ownerKey, ...payload }),
        });
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          /** ⚠⚠ THE SERVER'S REASON IS SHOWN, NOT REPLACED. `store.ts` writes
           *  these for a person to read; a generic "couldn't save" is how a
           *  refused Tab becomes a mystery. */
          setError(typeof json.error === "string" ? json.error : "Couldn’t save that.");
          setState("error");
          return null;
        }
        setError(null);
        setState("saved");
        return json;
      } catch {
        setError("Couldn’t reach the server.");
        setState("error");
        return null;
      } finally {
        setInFlight((n) => n - 1);
      }
    },
    [endpoint, ownerKey],
  );

  /** Structural changes re-read from the server: sorts are renormalised there,
   *  and guessing them here would be a second ordering rule. */
  const reload = useCallback(async () => {
    const json = await post({ action: "read" });
    const plan = json?.plan as { rows?: PlanRowLike[] } | null | undefined;
    if (plan?.rows) setRows(plan.rows.map(toEditorRow));
    /**
     * ⚠⚠⚠ NO `router.refresh()` HERE, AND REMOVING IT FIXED A REAL DATA-LOSS BUG.
     *
     * ⚠ A refresh is ASYNCHRONOUS. One fired when a row was ADDED resolved
     * AFTER the person had typed into it, handing back a server snapshot in
     * which that row still had an empty title — and the prop-sync below applied
     * it, **blanking the input while the database held the typed value.**
     * ⚠⚠ Measured by the gate: `savedTitle` confirmed "Operate" was saved, and
     * the delete control's label still read `Delete row`, because the component
     * had reverted to "".
     * ⚠⚠⚠ **IT LOOKED LIKE A FAILED SAVE AND IT WAS A LOST RENDER.**
     *
     * ⚠ The editor owns the rows once it is mounted — it has just read them
     * itself, on the line above. The server component's job is the FIRST render
     * and whatever `PlanStartFrom` changes wholesale (template, copy, clear),
     * which still arrives through `initialRows`.
     */
  }, [post]);

  /** Typed fields save on a short debounce, per row+field. */
  const patch = useCallback(
    (rowId: string, field: keyof EditorRow, value: string | number | null, payloadKey: string) => {
      setRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
      const key = `${rowId}:${payloadKey}`;
      payloads.current.set(key, { action: "update", rowId, [payloadKey]: value });
      const existing = timers.current.get(key);
      if (existing) clearTimeout(existing);
      else setPending((n) => n + 1);
      timers.current.set(
        key,
        setTimeout(() => {
          timers.current.delete(key);
          payloads.current.delete(key);
          setPending((n) => n - 1);
          void post({ action: "update", rowId, [payloadKey]: value });
        }, 500),
      );
    },
    [post],
  );

  /** ⚠ Blur means "I am done with this field", so it writes immediately rather
   *  than leaving the last edit sitting in a timer. */
  const flush = useCallback(() => {
    for (const [, t] of timers.current) clearTimeout(t);
    const keys = [...timers.current.keys()];
    timers.current.clear();
    if (keys.length > 0) setPending(0);
    for (const key of keys) {
      const payload = payloads.current.get(key);
      if (payload) void post(payload);
    }
  }, [post]);

  const addRow = useCallback(
    async (opts: { type?: RowType; parentId?: string | null; afterId?: string | null }) => {
      const json = await post({ action: "add", type: opts.type ?? "task", parentId: opts.parentId ?? null, afterId: opts.afterId ?? null });
      const row = json?.row as PlanRowLike | undefined;
      if (row) focusRef.current = row.id;
      /** ⚠ Same rule as `structural`: a refused add leaves its reason on screen. */
      if (json) await reload();
    },
    [post, reload],
  );

  const structural = useCallback(
    async (action: "indent" | "outdent" | "move", rowId: string, extra: Record<string, unknown> = {}) => {
      /**
       * ── ⚠⚠⚠ RELOAD ONLY ON SUCCESS, OR THE REASON VANISHES ──────────────────
       *
       * ⚠⚠ **FOUND BY THE GATE, AND IT WAS A REAL DEFECT.** A refused indent set
       * the message — *"A plan is two levels deep…"* — and then this function
       * reloaded unconditionally. The read SUCCEEDED, which cleared `error` and
       * set the state back to `saved`, **wiping the explanation off the screen
       * before anyone could read it.**
       * ⚠⚠⚠ So Tab appeared to do nothing, silently — which is the exact defect
       * the message exists to prevent (`E539`'s sticky error, on a new surface).
       * ⚠ Nothing structural changed on a refusal, so there is nothing to
       * re-read either: skipping the reload is both the fix and the truth.
       */
      const ok = await post({ action, rowId, ...extra });
      if (ok) await reload();
    },
    [post, reload],
  );

  const removeRow = useCallback(
    async (row: EditorRow) => {
      const json = await post({ action: "delete", rowId: row.id });
      const removed = json?.removed;
      if (Array.isArray(removed)) {
        setUndo({ rows: removed, label: row.title.trim() || "that row" });
      }
      if (json) await reload();
    },
    [post, reload],
  );

  const runUndo = useCallback(async () => {
    if (!undo) return;
    const json = await post({ action: "restore", rows: undo.rows });
    /** ⚠⚠ THE UNDO BUFFER IS KEPT ON FAILURE. Clearing it would throw away the
     *  only copy of the deleted rows — the person would lose both the row and
     *  the way back. */
    if (!json) return;
    setUndo(null);
    await reload();
  }, [post, reload, undo]);

  /** Focus the title of a row the editor just created. ⚠ Keyed on `rows`,
   *  which is exactly when the new row first exists in the DOM. */
  useEffect(() => {
    const id = focusRef.current;
    if (!id) return;
    const el = document.querySelector<HTMLInputElement>(`[data-plan-title="${id}"]`);
    if (el) {
      el.focus();
      focusRef.current = null;
    }
  }, [rows]);

  /** ⚠⚠ UNSAVED MEANS "IN FLIGHT **OR** WAITING ON A DEBOUNCE". Either one and
   *  the screen must not claim the work is saved. */
  const busy = inFlight > 0 || pending > 0;

  const tree = useMemo(() => buildTree(rows.map(toModelRow)), [rows]);
  const ordered = useMemo(() => flattenTree(tree), [tree]);
  const byId = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  /**
   * ── ⚠⚠ KEYBOARD — AND THE ONE TRADE-OFF, STATED ───────────────────────────
   *
   * Enter makes the next row · Tab indents · Shift+Tab outdents · Backspace on
   * an empty row deletes it. That is what an outline editor does and what the
   * brief asks for.
   *
   * ⚠⚠⚠ **TAB THEREFORE DOES NOT MOVE FOCUS OUT OF A TITLE FIELD, AND THAT IS A
   * REAL COST, NOT A FREE CHOICE.** It is confined to the TITLE input — Tab
   * works normally in every date, status and owner field — and **Escape moves
   * focus to the row's own ← → × controls**, which are real buttons at 44px.
   * ⚠ So nothing here is reachable by mouse only; the outline keys live on one
   * field and there is a stated way off it.
   */
  const onTitleKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, row: EditorRow) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void addRow({ type: "task", parentId: row.parent_id, afterId: row.id });
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        void structural(e.shiftKey ? "outdent" : "indent", row.id);
        return;
      }
      if (e.key === "Backspace" && row.title === "") {
        e.preventDefault();
        void removeRow(row);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        document.querySelector<HTMLButtonElement>(`[data-plan-controls="${row.id}"] button`)?.focus();
      }
    },
    [addRow, removeRow, structural],
  );

  const onHandleKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, row: EditorRow) => {
      /** ⚠⚠ A DRAG-ONLY REORDER IS UNREACHABLE WITHOUT A MOUSE. The handle is a
       *  button, and Up/Down move the row — same action, same code path. */
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        void structural("move", row.id, { delta: e.key === "ArrowUp" ? -1 : 1 });
      }
    },
    [structural],
  );

  return (
    <div>
      {/* ⚠ One live region for the whole editor; per-row ticks would make a
          screen reader announce every keystroke's save. */}
      <p
        data-plan-save
        aria-live="polite"
        className={"text-[13px] " + (busy ? "text-ink" : state === "error" ? "text-magenta" : "text-ink-2")}
      >
        {busy
          ? "Saving…"
          : state === "error"
            ? (error ?? "Some changes didn’t save")
            : state === "idle"
              ? "Rows save as you type — there is no save button."
              : "All changes saved"}
      </p>

      {undo && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-l-2 border-magenta bg-bg-soft px-3 py-2.5 text-[13px] text-ink">
          <span>Deleted “{undo.label}”.</span>
          <button type="button" className={BTN_2} onClick={() => void runUndo()}>
            Undo
          </button>
        </div>
      )}

      {rows.length === 0 ? (
        /** ⚠⚠ AT GENUINE ZERO, NAME THE FIRST MOVE RATHER THAN REPORTING
         *  EMPTINESS (the 2026-09-23 card rule). */
        <p className="mt-6 text-[14px] leading-relaxed text-ink-2">
          No rows yet. Start with a phase, or start from the template above.
        </p>
      ) : (
        <ol className="mt-5 space-y-0">
          {ordered.map((node) => {
            const row = byId.get(node.id)!;
            const late = isLate(toModelRow(row), today);
            const isMilestone = row.type === "milestone";
            return (
              <li
                key={row.id}
                /* ⚠ The indent is the ONLY thing that shows depth on a phone,
                   so it is on the row, not on a wrapper that could be dropped
                   by a narrow breakpoint. */
                className={
                  "border-b border-line/60 py-2.5 " + (node.depth === 1 ? "pl-4 sm:pl-8" : "")
                }
                draggable
                onDragStart={() => setDragId(row.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => {
                  if (dragId && dragId !== row.id && byId.get(dragId)?.parent_id === row.parent_id) e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!dragId || dragId === row.id) return;
                  const siblings = rows.filter((r) => r.parent_id === row.parent_id).sort((a, b) => a.sort - b.sort);
                  const index = siblings.findIndex((s) => s.id === row.id);
                  setDragId(null);
                  if (index >= 0) void structural("move", dragId, { index });
                }}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    aria-label={`Reorder ${row.title || "row"} — use the up and down arrows`}
                    className={TAP + " cursor-grab"}
                    onKeyDown={(e) => onHandleKey(e, row)}
                  >
                    ⠿
                  </button>
                  <span
                    /* ⚠ A stable test hook, not debris — the same reason
                       `data-journey-desc` exists on `/status`. A class-based
                       selector would break the moment the styling changes. */
                    data-plan-number
                    className={
                      "mt-2.5 min-w-[2.5rem] shrink-0 text-[13px] font-bold tabular-nums " +
                      (isMilestone ? "text-magenta" : "text-ink-2")
                    }
                  >
                    {node.number}
                  </span>
                  <div className="min-w-0 flex-1">
                    <input
                      data-plan-title={row.id}
                      value={row.title}
                      onChange={(e) => patch(row.id, "title", e.target.value, "title")}
                      onKeyDown={(e) => onTitleKey(e, row)}
                      onBlur={flush}
                      placeholder={isMilestone ? "Milestone" : node.depth === 0 ? "Phase" : "Task"}
                      aria-label={`${node.number} title`}
                      className={LINE + " font-bold"}
                    />
                    {/* ⚠ Phone-first: the fields stack under the title and
                        become one row from `sm` up. */}
                    <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-[repeat(4,minmax(0,1fr))]">
                      <label className="block">
                        <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">Start</span>
                        <input
                          type="date"
                          value={row.start_date}
                          onChange={(e) => patch(row.id, "start_date", e.target.value, "startDate")}
                          onBlur={flush}
                          className={LINE}
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">End</span>
                        <input
                          type="date"
                          value={row.end_date}
                          onChange={(e) => patch(row.id, "end_date", e.target.value, "endDate")}
                          onBlur={flush}
                          className={LINE}
                        />
                      </label>
                      <label className="block">
                        <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">Status</span>
                        <select
                          value={row.status}
                          onChange={(e) => patch(row.id, "status", e.target.value as RowStatus, "status")}
                          className={LINE}
                        >
                          {ROW_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">Owner</span>
                        <input
                          value={row.owner}
                          onChange={(e) => patch(row.id, "owner", e.target.value, "owner")}
                          onBlur={flush}
                          className={LINE}
                        />
                      </label>
                    </div>
                    {releases.length > 0 && (
                      <label className="mt-2 block max-w-[22rem]">
                        <span className="block text-[11px] uppercase tracking-[0.08em] text-ink-2">Release</span>
                        <select
                          value={row.release_id ?? ""}
                          onChange={(e) => patch(row.id, "release_id", e.target.value || null, "releaseId")}
                          className={LINE}
                        >
                          <option value="">Not in a release</option>
                          {releases.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {late && (
                      /** ⚠⚠ `Late` IS DERIVED AND SAYS SO — it is not a status
                       *  anybody picked, and the status dropdown above still
                       *  reads what Scott set. */
                      <p className="mt-1.5 text-[12px] font-bold text-magenta">Past its end date</p>
                    )}
                  </div>
                  <div data-plan-controls={row.id} className="flex shrink-0 items-center">
                    <button
                      type="button"
                      className={TAP}
                      aria-label={`Outdent ${row.title || "row"}`}
                      disabled={!row.parent_id}
                      onClick={() => void structural("outdent", row.id)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className={TAP}
                      aria-label={`Indent ${row.title || "row"}`}
                      disabled={!!row.parent_id}
                      onClick={() => void structural("indent", row.id)}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className={TAP + " hover:text-magenta"}
                      aria-label={`Delete ${row.title || "row"}`}
                      onClick={() => void removeRow(row)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={BTN} onClick={() => void addRow({ type: "task" })}>
          + Add Row
        </button>
        <button type="button" className={BTN_2} onClick={() => void addRow({ type: "phase" })}>
          + Add Phase
        </button>
        <button type="button" className={BTN_2} onClick={() => void addRow({ type: "milestone" })}>
          + Add Milestone {MILESTONE_MARK}
        </button>
      </div>
    </div>
  );
}
