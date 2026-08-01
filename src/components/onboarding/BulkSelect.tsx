"use client";

import { useState } from "react";

/**
 * Multi-select + delete for a section of imported entries (walk7 WS9b / E143).
 *
 * WHY THIS EXISTS: an AI import can add a dozen wrong entries at once, and the
 * only way to remove them was a trash icon per card, each behind its own
 * confirm() — twelve dialogs to undo one bad parse. The complaint was about
 * effort, so the fix has to be about effort: tick the wrong ones, delete them
 * in a single action, confirm once.
 *
 * SELECTION MODE IS OPT-IN. Checkboxes on every card all the time would clutter
 * the common case, which is a provider reviewing entries they mean to keep, and
 * would put a destructive control one stray tap from every row on a phone. The
 * bar only appears where there is more than one entry — with a single card the
 * per-card trash icon is already the shorter path.
 *
 * Generic on purpose: it takes ids and a delete callback, so Work History,
 * Education and any other section can adopt it without a second implementation.
 */
export function useBulkSelect(ids: string[]) {
  const [active, setActive] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());

  const reset = () => {
    setActive(false);
    setPicked(new Set());
  };

  const toggle = (id: string) =>
    setPicked((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Ids can disappear under us (a single-card delete, a re-hydrate), so the
  // selection is always intersected with what is actually on screen.
  const live = new Set(ids);
  const selected = [...picked].filter((id) => live.has(id));

  return {
    active,
    setActive,
    picked,
    selected,
    toggle,
    reset,
    allPicked: ids.length > 0 && selected.length === ids.length,
    pickAll: () => setPicked(new Set(ids)),
  };
}

export function BulkSelectBar({
  label,
  count,
  state,
  onDelete,
  busy = false,
}: {
  /** Plural noun for the section — "employers", "education entries". */
  label: string;
  count: number;
  state: ReturnType<typeof useBulkSelect>;
  onDelete: (ids: string[]) => void | Promise<void>;
  busy?: boolean;
}) {
  if (count < 2) return null;

  if (!state.active) {
    return (
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => state.setActive(true)}
          className="text-[13.5px] font-bold text-magenta hover:text-magenta-dark"
        >
          Select to delete
        </button>
      </div>
    );
  }

  const n = state.selected.length;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[12px] border-[1.5px] border-magenta/35 bg-magenta/[0.04] px-4 py-2.5">
      <span className="text-[13.5px] font-bold">
        {n === 0 ? `Select the ${label} to remove` : `${n} selected`}
      </span>

      <button
        type="button"
        onClick={state.allPicked ? () => state.reset() : state.pickAll}
        className="text-[13px] font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
      >
        {state.allPicked ? "Clear" : "Select all"}
      </button>

      <span className="ml-auto flex items-center gap-3">
        <button
          type="button"
          onClick={state.reset}
          className="text-[13px] font-semibold text-ink-2 hover:text-ink"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={n === 0 || busy}
          onClick={() => {
            // ONE confirm for the whole batch — the per-card flow asked twelve
            // times, which is the thing being fixed.
            if (
              confirm(
                `Remove ${n} ${label}? This can't be undone, but you can add them back by hand.`
              )
            ) {
              void onDelete(state.selected);
            }
          }}
          className="rounded-full bg-magenta px-4 py-1.5 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-40"
        >
          {busy ? "Removing…" : `Delete ${n || ""}`.trim()}
        </button>
      </span>
    </div>
  );
}

/** The tick shown on a card while selection mode is on. */
export function SelectTick({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] font-semibold text-ink-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={`Select ${label}`}
        className="h-4 w-4 accent-[var(--color-magenta)]"
      />
      Select
    </label>
  );
}
