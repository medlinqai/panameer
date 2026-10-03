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
/* `TAP` left with the stacked field cards (`E808`); `GRIP` replaced it. */
const BTN = "inline-flex min-h-11 items-center rounded-[4px] bg-ink px-3 text-[13px] font-bold text-surface transition-opacity hover:opacity-85 disabled:opacity-40";
const BTN_2 = "inline-flex min-h-11 items-center rounded-[4px] border border-ink bg-surface px-3 text-[13px] font-bold text-ink transition-colors hover:bg-ink/5 disabled:opacity-40";
/** ⚠ A thin underline, not a box: twenty boxed inputs read as a form. */
const LINE = "w-full border-0 border-b border-line bg-transparent px-0 py-1.5 text-[14px] text-ink outline-none focus:border-magenta";
/* A compact glyph button. The ROW is the 44px target; eight 44px buttons on one
   line would not fit, so these are 28px inside a 44px-tall row. */
const GRIP = "inline-flex h-7 w-6 shrink-0 items-center justify-center rounded-[3px] text-[13px] text-ink-2 transition-colors hover:bg-ink/5 disabled:opacity-25";

type SaveState = "idle" | "saving" | "saved" | "error";

export function PlanOutlineEditor({
  rows: initialRows,
  ownerKey,
  endpoint = "/api/admin/plan",
  today = new Date(),
}: {
  rows: EditorRow[];
  ownerKey: string;
  endpoint?: string;
  /**
   * SUPERSEDED (`E808`): a row's release is the release it SITS UNDER now that
   * releases are top-level rows, so the per-row dropdown is gone. The prop is
   * still DECLARED — the admin page passes it — and deliberately unread.
   */
  releases?: ReleaseOption[];
  today?: Date;
}) {
  const [rows, setRows] = useState<EditorRow[]>(initialRows);
  /** Folded parents, while editing. Nothing persists — a reload opens it all. */
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
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
    async (opts: { type?: RowType; parentId?: string | null; afterId?: string | null; top?: boolean }) => {
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

  const childCount = useCallback(
    (id: string) => rows.filter((r) => r.parent_id === id).length,
    [rows],
  );

  /**
   * The rows on screen: everything whose ancestors are all expanded. Walked up
   * the chain rather than tracked as a flag, so collapsing a release hides its
   * tasks too without a second bookkeeping path.
   */
  const visible = useMemo(() => {
    if (collapsed.size === 0) return ordered;
    const hidden = (id: string | null): boolean => {
      let parentId = id;
      while (parentId) {
        if (collapsed.has(parentId)) return true;
        parentId = byId.get(parentId)?.parent_id ?? null;
      }
      return false;
    };
    return ordered.filter((n) => !hidden(byId.get(n.id)?.parent_id ?? null));
  }, [ordered, collapsed, byId]);

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
        <ol className="mt-5">
          {visible.map((node) => {
            const row = byId.get(node.id)!;
            const late = isLate(toModelRow(row), today);
            const isMilestone = row.type === "milestone";
            const isRelease = row.type === "release";
            const kids = childCount(row.id);
            const shut = collapsed.has(row.id);
            return (
              <li
                key={row.id}
                data-plan-editor-row={node.number || row.title}
                data-plan-depth={node.depth}
                /* 28px per level, on the ROW rather than a wrapper, so a narrow
                   breakpoint cannot drop the only thing that shows depth. */
                style={{ paddingLeft: node.depth * 28 }}
                className="relative border-b border-line/60"
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
                {/* A thin guide per ancestor level, so a child reads as
                    belonging to the row above it rather than merely sitting
                    further right. */}
                {Array.from({ length: node.depth }, (_, i) => (
                  <span
                    key={i}
                    aria-hidden
                    className="absolute inset-y-0 w-px bg-line"
                    style={{ left: i * 28 + 13 }}
                  />
                ))}

                <div
                  /* `min-h-11` — the ROW is the 44px target; the glyph buttons
                     inside it are 28px because eight 44px buttons would not fit
                     on one line. Measured 43px at `py-1`. */
                  className="flex min-h-11 flex-wrap items-center gap-x-1.5 gap-y-1 py-1 sm:flex-nowrap"
                >
                  <button
                    type="button"
                    aria-label={`Reorder ${row.title || "row"} — use the up and down arrows`}
                    className={GRIP + " cursor-grab"}
                    onKeyDown={(e) => onHandleKey(e, row)}
                  >
                    ⠿
                  </button>

                  {/* ▸/▾ while editing — a parent can be folded away so a long
                      plan stays navigable. Leaves get a spacer, or the numbers
                      would not line up. */}
                  {kids > 0 ? (
                    <button
                      type="button"
                      aria-label={`${shut ? "Expand" : "Collapse"} ${row.title || "row"}`}
                      aria-expanded={!shut}
                      className={GRIP}
                      onClick={() =>
                        setCollapsed((prev) => {
                          const next = new Set(prev);
                          if (next.has(row.id)) next.delete(row.id);
                          else next.add(row.id);
                          return next;
                        })
                      }
                    >
                      {shut ? "▸" : "▾"}
                    </button>
                  ) : (
                    <span aria-hidden className="inline-block w-6 shrink-0" />
                  )}

                  <span
                    data-plan-number
                    className="w-10 shrink-0 tabular-nums text-[11px] text-ink-3"
                  >
                    {node.number}
                  </span>

                  <input
                    data-plan-title={row.id}
                    value={row.title}
                    onChange={(e) => patch(row.id, "title", e.target.value, "title")}
                    onKeyDown={(e) => onTitleKey(e, row)}
                    onBlur={flush}
                    placeholder={
                      isRelease ? "Release" : isMilestone ? "Milestone" : node.depth === 0 ? "Phase" : "Task"
                    }
                    aria-label={`${node.number || row.title} title`}
                    /* Weight by level: a release or top phase bold, a phase
                       inside a release semibold, a task regular. */
                    className={
                      LINE +
                      " min-w-0 flex-1 basis-full sm:basis-auto " +
                      (node.depth === 0 ? "font-bold" : node.depth === 1 ? "font-semibold" : "font-normal")
                    }
                  />

                  <input
                    type="date"
                    value={row.start_date}
                    onChange={(e) => patch(row.id, "start_date", e.target.value, "startDate")}
                    onBlur={flush}
                    aria-label={`${node.number || row.title} start`}
                    className={LINE + " w-[8.5rem] shrink-0 tabular-nums"}
                  />
                  <input
                    type="date"
                    value={row.end_date}
                    onChange={(e) => patch(row.id, "end_date", e.target.value, "endDate")}
                    onBlur={flush}
                    aria-label={`${node.number || row.title} end`}
                    className={LINE + " w-[8.5rem] shrink-0 tabular-nums"}
                  />
                  <select
                    value={row.status}
                    onChange={(e) => patch(row.id, "status", e.target.value as RowStatus, "status")}
                    aria-label={`${node.number || row.title} status`}
                    className={LINE + " w-[7.5rem] shrink-0"}
                  >
                    {ROW_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                  <input
                    value={row.owner}
                    onChange={(e) => patch(row.id, "owner", e.target.value, "owner")}
                    onBlur={flush}
                    placeholder="Owner"
                    aria-label={`${node.number || row.title} owner`}
                    className={LINE + " w-[7rem] shrink-0"}
                  />
                  {late && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-magenta">
                      Past due
                    </span>
                  )}

                  <span data-plan-controls={row.id} className="flex shrink-0 items-center">
                    <button
                      type="button"
                      className={GRIP}
                      aria-label={`Outdent ${row.title || "row"}`}
                      /* Any nested row can come out one level — milestones
                         included (Scott, 2026-10-03). */
                      disabled={!row.parent_id}
                      onClick={() => void structural("outdent", row.id)}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className={GRIP}
                      aria-label={`Indent ${row.title || "row"}`}
                      /* Up to the third level, at any depth below the cap. It
                         was `!!row.parent_id`, which refused every nested row
                         and every milestone under a phase. */
                      disabled={node.depth >= 2}
                      onClick={() => void structural("indent", row.id)}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className={GRIP + " hover:text-magenta"}
                      aria-label={`Delete ${row.title || "row"}`}
                      onClick={() => void removeRow(row)}
                    >
                      ×
                    </button>
                  </span>
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
        {/* A release is always top-level — it is the container the phases sit
            in, so it cannot be created inside one (Scott, 2026-10-03). */}
        <button type="button" className={BTN_2} onClick={() => void addRow({ type: "release", top: true })}>
          + Add Release
        </button>
      </div>
    </div>
  );
}
