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
/**
 * The mockup's column grid: drag · caret · # · name · start · end · status ·
 * owner · row actions. At phone width it collapses to number · name · actions
 * and the fields wrap underneath.
 */
const GRID =
  "grid grid-cols-[22px_22px_44px_1fr_108px] gap-1.5 sm:grid-cols-[22px_22px_64px_minmax(200px,1fr)_124px_124px_124px_100px_126px]";
/** What a row IS, by level — the mockup's cue beside each name. */
const KIND: Record<number, string> = { 1: "PHASE", 2: "STAGE", 3: "TASK" };

/** The depth of the deepest descendant below `id`, relative to it. */
function subtreeHeightOf(rows: readonly { id: string; parent_id: string | null }[], id: string): number {
  const kids = rows.filter((r) => r.parent_id === id);
  if (kids.length === 0) return 0;
  return 1 + Math.max(...kids.map((k) => subtreeHeightOf(rows, k.id)));
}
/* 44px TALL, narrow (`E819`). The row is 44px and the glyphs fill it, so every
   control meets the touch standard without nine 44px-WIDE buttons, which would
   not fit on one line. Height is what a finger misses. */
const GRIP = "inline-flex h-11 w-6 shrink-0 items-center justify-center rounded-[3px] text-[13px] text-ink-2 transition-colors hover:bg-ink/5 disabled:opacity-25";

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
  /** The selected row. The Add buttons work relative to it, as the mockup does. */
  const [sel, setSel] = useState<string | null>(null);
  /**
   * What the pointer is over while dragging: which row, and whether the drop
   * would go INTO it (last child) or BETWEEN rows at that point. The row
   * highlights for `into` and shows a line for `before`/`after`, so the target
   * is visible before the mouse is released.
   */
  const [dropAt, setDropAt] = useState<{ id: string; where: "into" | "before" | "after" } | null>(null);
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

  /** How deep the selected row sits, 1-based; 0 when nothing is selected. */
  const selLevel = useMemo(() => {
    if (!sel) return 0;
    let depth = 0;
    let id: string | null = sel;
    while (id) {
      const r: EditorRow | undefined = rows.find((x) => x.id === id);
      if (!r) break;
      id = r.parent_id;
      depth += 1;
    }
    return depth;
  }, [sel, rows]);

  /** Levels are 1-based; a row's level is how many parents it has, plus one. */
  const levelOf = useCallback(
    (id: string) => {
      let depth = 1;
      let cursor: string | null = rows.find((r) => r.id === id)?.parent_id ?? null;
      while (cursor) {
        depth += 1;
        cursor = rows.find((r) => r.id === cursor)?.parent_id ?? null;
      }
      return depth;
    },
    [rows],
  );

  /** Every row under `id`, so a drag cannot drop a row inside itself. */
  const descendantsOf = useCallback(
    (id: string) => {
      const out = new Set<string>();
      const walk = (parentId: string) => {
        for (const r of rows) {
          if (r.parent_id !== parentId || out.has(r.id)) continue;
          out.add(r.id);
          walk(r.id);
        }
      };
      walk(id);
      return out;
    },
    [rows],
  );


  /**
   * WHERE THIS ROW COULD GO — the "Move to…" list (`P2-ALL-E813`).
   *
   * Drag is a mouse gesture; this is the same move for a keyboard, and the
   * precise one when two stages look alike on screen. It offers the top level
   * and every phase or stage that can legally hold the row — its own subtree,
   * its current parent and anything too deep are left out, so every option in
   * the list works.
   */
  const destinationsFor = useCallback(
    (id: string) => {
      const mine = descendantsOf(id);
      const height = subtreeHeightOf(rows, id);
      const current = rows.find((r) => r.id === id)?.parent_id ?? null;
      const out: { id: string | null; label: string }[] = [];
      if (current !== null && 1 + height <= 3) out.push({ id: null, label: "Top level" });
      for (const node of ordered) {
        if (node.id === id || mine.has(node.id)) continue;
        const r = byId.get(node.id);
        if (!r || r.type === "milestone") continue;
        const lvl = node.depth + 1;
        if (lvl >= 3) continue;
        if (lvl + 1 + height > 3) continue;
        if (node.id === current) continue;
        out.push({ id: node.id, label: `${node.mark} ${r.title || "Untitled"}` });
      }
      return out;
    },
    [rows, ordered, byId, descendantsOf],
  );

  /**
   * WHERE A DROP WOULD LAND (`P2-ALL-E813`).
   *
   * The top and bottom quarters of a row mean BETWEEN — insert at that point in
   * that row's own list, whichever parent that is. The middle half means INTO —
   * become that row's last child. That is the pattern every outline editor
   * uses, and it is what lets one gesture do both of the things Scott asked
   * for without a modifier key.
   *
   * Returns null when the drop is not allowed, which is also what stops
   * `preventDefault` firing, so the cursor shows "no".
   */
  const dropZone = useCallback(
    (e: React.DragEvent, targetId: string): "into" | "before" | "after" | null => {
      if (!dragId || dragId === targetId) return null;
      /* Into itself or its own subtree would detach the branch. */
      if (descendantsOf(dragId).has(targetId)) return null;

      const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const offset = (e.clientY - box.top) / Math.max(box.height, 1);
      const targetLevel = levelOf(targetId);
      const dragHeight = subtreeHeightOf(rows, dragId);

      if (offset > 0.25 && offset < 0.75) {
        /* INTO: the target becomes the parent. A milestone holds nothing, and
           the dragged row's subtree still has to fit. */
        const target = byId.get(targetId);
        if (!target || target.type === "milestone") return null;
        if (targetLevel + 1 + dragHeight > 3) return null;
        return "into";
      }
      /* BETWEEN: the row joins the TARGET's list, so it ends up at the target's
         level and must fit there. */
      if (targetLevel + dragHeight > 3) return null;
      return offset <= 0.25 ? "before" : "after";
    },
    [dragId, byId, descendantsOf, levelOf, rows],
  );

  /** Apply a drop. The server does the same checks; this one is what keeps the
   *  gesture honest while the mouse is still down. */
  const drop = useCallback(
    async (targetId: string, where: "into" | "before" | "after") => {
      const moving = dragId;
      setDragId(null);
      if (!moving) return;
      const target = byId.get(targetId);
      if (!target) return;

      if (where === "into") {
        /* Last child, as asked. */
        const kids = rows.filter((r) => r.parent_id === targetId);
        await structural("move", moving, { parentId: targetId, index: kids.length });
        setCollapsed((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        return;
      }

      const siblings = rows
        .filter((r) => r.parent_id === target.parent_id && r.id !== moving)
        .sort((a, b) => a.sort - b.sort);
      const at = siblings.findIndex((r) => r.id === targetId);
      const index = where === "before" ? Math.max(at, 0) : at + 1;
      await structural("move", moving, { parentId: target.parent_id, index });
    },
    [dragId, byId, rows, structural],
  );

  /**
   * Add a row AT a level, relative to the selection. Level 1 is top-level;
   * deeper rows walk UP from the selection to the parent that can hold them, so
   * clicking + Stage with a task selected still adds a stage to that task's
   * phase rather than refusing.
   */
  const addAt = useCallback(
    async (level: 1 | 2 | 3, milestone: boolean) => {
      const type: RowType = milestone ? "milestone" : level === 1 ? "release" : level === 2 ? "phase" : "task";
      if (level === 1) {
        await addRow({ type, parentId: null });
        return;
      }
      let id: string | null = sel;
      let depth = selLevel;
      while (id && depth >= level) {
        const r: EditorRow | undefined = rows.find((x) => x.id === id);
        if (!r) break;
        id = r.parent_id;
        depth -= 1;
      }
      await addRow({ type, parentId: id });
      if (id) {
        setCollapsed((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [addRow, rows, sel, selLevel],
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
        <div>
          {/* The column header. It goes at phone width, where the row collapses
              to number · name · actions and the fields stack. */}
          <div className={`${GRID} hidden border-b border-ink py-2 text-[10.5px] font-bold tracking-[0.09em] text-ink-3 sm:grid`}>
            <span />
            <span />
            <span>#</span>
            <span>NAME</span>
            <span>START</span>
            <span>END</span>
            <span>STATUS</span>
            <span>OWNER</span>
            <span className="text-right">ROW</span>
          </div>

          {visible.map((node) => {
            const row = byId.get(node.id)!;
            const level = node.depth + 1;
            const kids = childCount(row.id);
            const shut = collapsed.has(row.id);
            const isMilestone = row.type === "milestone";
            const selected = sel === row.id;
            return (
              <div
                key={row.id}
                data-plan-editor-row={node.mark}
                data-plan-depth={node.depth}
                onClick={() => setSel(row.id)}
                className={
                  `${GRID} relative min-h-11 items-center border-b border-line/60 ` +
                  (level === 1 ? "bg-black/[0.02] " : "") +
                  (selected ? "bg-magenta/[0.06] " : "") +
                  /* The drop target, while dragging: a ring means "inside this
                     row", a line means "at this point in its list". */
                  (dropAt?.id === row.id && dropAt.where === "into"
                    ? "outline outline-2 -outline-offset-2 outline-magenta "
                    : "")
                }
                draggable
                onDragStart={() => setDragId(row.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setDropAt(null);
                }}
                onDragOver={(e) => {
                  const where = dropZone(e, row.id);
                  if (!where) return;
                  /* `preventDefault` is what marks a valid drop target; without
                     it the browser refuses the drop and the cursor says so. */
                  e.preventDefault();
                  setDropAt({ id: row.id, where });
                }}
                onDragLeave={() => setDropAt((d) => (d?.id === row.id ? null : d))}
                onDrop={(e) => {
                  e.preventDefault();
                  const where = dropZone(e, row.id);
                  setDropAt(null);
                  if (where) void drop(row.id, where);
                }}
              >
                {/* A BUTTON, not the mockup's plain span: reordering has to be
                    reachable from the keyboard, and the arrow keys here are the
                    only way to do it without a mouse. */}
                {dropAt?.id === row.id && dropAt.where !== "into" && (
                  <span
                    aria-hidden
                    className={
                      "pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-magenta " +
                      (dropAt.where === "before" ? "top-0" : "bottom-0")
                    }
                  />
                )}
                <button
                  type="button"
                  title="Drag to reorder — or use the up and down arrows"
                  aria-label={`Reorder ${row.title || "row"} — use the up and down arrows`}
                  /* 44px tall like every other control in the row (`E819`). */
                  className="inline-flex h-11 w-full cursor-grab items-center justify-center text-[14px] text-ink-3/60"
                  onKeyDown={(e) => onHandleKey(e, row)}
                >
                  ⋮⋮
                </button>

                {kids > 0 ? (
                  <button
                    type="button"
                    aria-label={`${shut ? "Expand" : "Collapse"} ${row.title || "row"}`}
                    aria-expanded={!shut}
                    className="h-11 w-[22px] text-[12px] text-ink-2"
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
                  <span />
                )}

                <span data-plan-number className="tabular-nums text-[12px] text-ink-3">
                  {node.mark}
                </span>

                {/* NAME. The guides and the padding step 26px per level, and the
                    KIND label says what this row IS — the mockup's own cue. */}
                <span
                  className="relative flex h-11 min-w-0 items-center"
                  style={{ paddingLeft: (level - 1) * 26 }}
                >
                  {Array.from({ length: level - 1 }, (_, g) => (
                    <span
                      key={g}
                      aria-hidden
                      className="absolute inset-y-0 w-px bg-line"
                      style={{ left: g * 26 + 8 }}
                    />
                  ))}
                  {isMilestone ? (
                    <span aria-hidden className="mr-1.5 text-magenta">{MILESTONE_MARK}</span>
                  ) : (
                    <span className="mr-1.5 whitespace-nowrap text-[10px] font-bold tracking-[0.06em] text-ink-3">
                      {KIND[level] ?? ""}
                    </span>
                  )}
                  <input
                    data-plan-title={row.id}
                    value={row.title}
                    onChange={(e) => patch(row.id, "title", e.target.value, "title")}
                    onKeyDown={(e) => onTitleKey(e, row)}
                    onBlur={flush}
                    placeholder={KIND[level] ? KIND[level].toLowerCase() : "row"}
                    aria-label="Name"
                    className={
                      LINE +
                      " min-w-0 " +
                      (level === 1 ? "text-[14px] font-bold" : level === 2 ? "font-semibold" : "font-normal text-ink-2")
                    }
                  />
                  {/* An end date in the past with the work not Done. Derived,
                      never stored, so it cannot contradict the date beside it. */}
                  {isLate(toModelRow(row), today) && (
                    <span className="ml-1.5 shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-magenta">
                      Past due
                    </span>
                  )}
                </span>

                <input
                  type="date"
                  value={row.start_date}
                  onChange={(e) => patch(row.id, "start_date", e.target.value, "startDate")}
                  onBlur={flush}
                  aria-label="Start"
                  className={LINE + " tabular-nums"}
                />
                <input
                  type="date"
                  value={row.end_date}
                  onChange={(e) => patch(row.id, "end_date", e.target.value, "endDate")}
                  onBlur={flush}
                  aria-label="End"
                  /* A milestone is one day: its end follows its start, so the
                     field is not offered rather than offered and ignored. */
                  disabled={isMilestone}
                  className={LINE + " tabular-nums disabled:opacity-30"}
                />
                <select
                  value={row.status}
                  onChange={(e) => patch(row.id, "status", e.target.value as RowStatus, "status")}
                  aria-label="Status"
                  className={LINE}
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
                  aria-label="Owner"
                  className={LINE}
                />

                <span data-plan-controls={row.id} className="flex justify-end">
                  <button
                    type="button"
                    className={GRIP}
                    title="Move up a level"
                    aria-label={`Outdent ${row.title || "row"}`}
                    disabled={level === 1}
                    onClick={() => void structural("outdent", row.id)}
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    className={GRIP}
                    title="Move down a level"
                    aria-label={`Indent ${row.title || "row"}`}
                    disabled={level === 3}
                    onClick={() => void structural("indent", row.id)}
                  >
                    →
                  </button>
                  {/*
                    MOVE TO… — the same move without a mouse, and the precise
                    one when two stages look alike. It is a `select` so it is
                    reachable by keyboard and announces its options; every
                    option in it is a destination the row can legally take.
                  */}
                  <select
                    aria-label={`Move ${row.title || "row"} to…`}
                    title="Move to…"
                    value=""
                    className={GRIP + " appearance-none text-center"}
                    onChange={(e) => {
                      const value = e.target.value;
                      e.currentTarget.value = "";
                      if (!value) return;
                      const parentId = value === "__top__" ? null : value;
                      const kids = rows.filter((r) => r.parent_id === parentId);
                      void structural("move", row.id, { parentId, index: kids.length });
                    }}
                  >
                    <option value="">⇥</option>
                    {destinationsFor(row.id).map((d) => (
                      <option key={d.id ?? "__top__"} value={d.id ?? "__top__"}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={GRIP + " hover:text-magenta"}
                    title="Delete"
                    aria-label={`Delete ${row.title || "row"}`}
                    onClick={() => void removeRow(row)}
                  >
                    ×
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/*
        THE ADD BAR (`P2-ALL-E812`, the editor mockup). The buttons work on the
        SELECTED row: + Stage goes inside the selected phase, + Task inside the
        selected stage. A button that cannot act is disabled rather than
        silently doing nothing — the `E539` rule.
      */}
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <button type="button" className={BTN} onClick={() => void addAt(1, false)}>
          + Phase
        </button>
        <button
          type="button"
          className={BTN_2}
          disabled={selLevel < 1}
          title={selLevel < 1 ? "Select a phase first" : undefined}
          onClick={() => void addAt(2, false)}
        >
          + Stage
        </button>
        <button
          type="button"
          className={BTN_2}
          disabled={selLevel < 2}
          title={selLevel < 2 ? "Select a stage first" : undefined}
          onClick={() => void addAt(3, false)}
        >
          + Task
        </button>
        <button
          type="button"
          className={BTN_2}
          disabled={selLevel < 1}
          title={selLevel < 1 ? "Select a phase or stage first" : undefined}
          onClick={() => void addAt(selLevel >= 2 ? 3 : 2, true)}
        >
          + Milestone {MILESTONE_MARK}
        </button>
        <button
          type="button"
          className={BTN_2}
          onClick={() => setCollapsed(new Set())}
        >
          Expand all
        </button>
        <button
          type="button"
          className={BTN_2}
          onClick={() => setCollapsed(new Set(rows.filter((r) => childCount(r.id) > 0).map((r) => r.id)))}
        >
          Collapse all
        </button>
      </div>
    </div>
  );
}
