"use client";

import { Chip, Field, Notice, TextInput } from "@/components/onboarding/controls";

/**
 * ── ⚠⚠ THE SPECIALIZATIONS EDITOR, EXTRACTED (`P2-A2-E597` WS-B, 4 of 5) ──
 *
 * ⚠ 335 lines — the second largest, and the first one where the local helper it
 * needed (`CascadeTier`, 70 lines) had to come with it.
 *
 * ── ⚠⚠⚠ EVERY PIECE OF STATE STAYS WITH THE CALLER, AND THAT IS THE POINT ──
 *
 * ⚠ `query` and `openTier` are the wizard's `specQuery` and `openSpecTier`,
 * passed IN rather than owned here. ⚠⚠ MOVING THEM INSIDE WOULD HAVE BEEN A
 * BEHAVIOUR CHANGE DISGUISED AS A REFACTOR: the modal unmounts on close, so
 * component-owned state would reset the search and the open tier every time it
 * reopened. That is arguably nicer, and it is NOT what this brief is for —
 * `E597` moves editors, it does not redesign them.
 * ⚠ Same for the selection: `onChange` hands a PARTIAL back and the caller owns
 * `profile`, so there is still exactly one `setProfile`.
 *
 * ⚠ PRESENTATION AND DERIVATION ONLY. No `postStep`, no navigation. The save
 * stays in `specializationsEditing()` — two save paths for one field is how the
 * two titles happened (`E595`).
 */

/**
 * ⚠⚠ MOVED WITH THE EDITOR (`P2-A2-E597` WS-B). It was `page.tsx`'s local
 * `CascadeTier` and the specializations picker is its only caller — measured.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — it lived at `page.tsx:5336`.
 */
function CascadeTier({
  index,
  label,
  chosen,
  onChange,
  changeLabel = "Change",
  children,
}: {
  index: number;
  label: string;
  chosen: string | null;
  onChange?: () => void;
  /**
   * The reopen affordance. "Change" is right for a single-pick tier that already
   * has an answer; a MULTI-pick tier that is empty needs "Add", because there is
   * nothing there to change (PJv2 WS9).
   */
  changeLabel?: string;
  children: React.ReactNode;
}) {
  // brief_Y / E053 — a COLLAPSED tier is genuinely one line now. It used to be
  // a three-line box (heading row, then the value on its own line) that spent
  // ~100px to recap a single word; two of those ate a quarter of the viewport
  // before the step's actual work began, which is most of why the footer sat
  // below the fold. Expanded tiers are unchanged.
  if (chosen) {
    return (
      <section className="flex items-center gap-3 rounded-brand border border-line px-4 py-2.5">
        <span
          aria-hidden
          className="grid h-6 w-6 flex-none place-items-center rounded-full bg-magenta text-[12px] font-black text-white"
        >
          {index}
        </span>
        <span className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
          {label}
        </span>
        <span className="min-w-0 flex-1 truncate text-[16px] font-bold">
          {chosen}
        </span>
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            className="flex-none text-[14px] font-bold text-magenta hover:text-magenta-dark"
          >
            {changeLabel}
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-brand border border-line p-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-wide text-ink-2">
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-full bg-bg-soft text-[12px] font-black text-ink-2"
          >
            {index}
          </span>
          {label}
        </h2>
      </div>
      {children}
    </section>
  );
}

export type SpecGroup = {
  kind: string;
  label: string;
  items: { id: string; name: string }[];
};

/** ⚠ The caller's own caps, passed in so the numbers keep one home. */
export function SpecializationsEditor({
  groups0,
  selectedIds,
  selectedNames,
  customs,
  query,
  onQueryChange,
  openTier,
  onOpenTierChange,
  onChange,
  onRemoveCustom,
  error,
  maxPerGroup,
  pickedRegionClass,
  maxPerTier,
  scrollRegionClass,
}: {
  groups0: SpecGroup[];
  selectedIds: string[];
  selectedNames: { id: string; name: string }[];
  customs: string[];
  query: string;
  onQueryChange: (next: string) => void;
  openTier: string | null;
  onOpenTierChange: (next: string | null) => void;
  /** ⚠ A PARTIAL of the profile's specialization fields. The caller merges it. */
  onChange: (patch: {
    specializationIds?: string[];
    specializationNames?: { id: string; name: string }[];
    customSpecializations?: string[];
  }) => void;
  onRemoveCustom: (name: string) => void;
  error?: string | null;
  maxPerGroup: number;
  pickedRegionClass: string;
  /* ⚠ THE CAPS AND THE SCROLL BOX COME FROM THE CALLER. They are the wizard's
     measured numbers (`E053`/`E054`) and keeping them there means one home for
     each, not a second copy that drifts. */
  maxPerTier: number;
  scrollRegionClass: string;
}) {
      const chosenSpecs = new Set(selectedIds);

      // Every loaded specialization, by id — so a SELECTED chip can be named
      // even when the search or the per-group cap has hidden its source row.
      const specById = new Map<string, string>();
      groups0.forEach((g) =>
        g.items.forEach((i) => specById.set(i.id, i.name))
      );
      selectedNames.forEach((s) => {
        if (!specById.has(s.id)) specById.set(s.id, s.name);
      });

      const sq = query.trim().toLowerCase();
      // TWO MODES, one for each job (PJv2 WS9). Browsing is a cascade — one open
      // tier at a time. Searching is a flat lookup ACROSS the tiers, because
      // someone typing "Workday" should not have to know whether we filed it
      // under a product, a methodology or an industry.
      const searching = sq.length > 0;

      // Which tier each catalog item belongs to — the cascade needs it to count
      // and label a collapsed tier, and to pin the open one on a pick.
      const kindById = new Map<string, string>();
      groups0.forEach((g) => g.items.forEach((i) => kindById.set(i.id, g.kind)));
      const pickedNames = (kind: string) =>
        selectedIds
          .filter((id) => kindById.get(id) === kind)
          .map((id) => specById.get(id) ?? "Specialization");

      /**
       * E054 — search results stay capped PER GROUP and inside ONE bounded
       * region. A single overall cap would spend its whole budget on the first
       * group and hide the later ones; three separate regions would let the page
       * (and so the Continue button) grow as you type, which is the thing E053
       * was filed about.
       *
       * Chosen items are excluded because they are already chips above — the same
       * rule the Skills tier uses, so the suggestion area only ever holds things
       * you can still act on.
       */
      const groups = groups0
        .map((g) => {
          const matches = g.items.filter(
            (i) =>
              !chosenSpecs.has(i.id) && (!sq || i.name.toLowerCase().includes(sq))
          );
          return {
            ...g,
            shown: matches.slice(0, maxPerGroup),
            hidden: Math.max(0, matches.length - maxPerGroup),
          };
        })
        .filter((g) => g.shown.length > 0);

      const hiddenSpecCount = groups.reduce((n, g) => n + g.hidden, 0);
      const totalSpecs =
        selectedIds.length + customs.length;

      /**
       * The open tier: the provider's last pick if they have one, else the first
       * tier still empty, so the step opens on work to be done rather than on a
       * tier that is already answered. All three collapse once all three have
       * something — the step is optional, and a wall of open pickers is what WS9
       * was filed to remove.
       */
      const openSpecKind =
        openTier ??
        groups0.find((g) => pickedNames(g.kind).length === 0)?.kind ??
        null;

      const addCustomSpec = () => {
        const name = query.trim();
        if (!name) return;
        const dup =
          customs.some(
            (c) => c.toLowerCase() === name.toLowerCase()
          ) ||
          [...specById.entries()].some(
            ([id, n]) => n.toLowerCase() === name.toLowerCase() && chosenSpecs.has(id)
          );
        if (!dup) {
          onChange({ customSpecializations: [...customs, name] });
        }
        onQueryChange("");
      };

      const toggleSpec = (id: string) => {
        // Pin the tier this item lives in. Without this, picking the first item
        // in tier 2 makes tier 2 no-longer-the-first-empty-tier, and the cascade
        // would collapse it and jump to tier 3 mid-selection.
        const kind = kindById.get(id);
        if (kind) onOpenTierChange(kind);
        {
          const has = selectedIds.includes(id);
          const name = specById.get(id) ?? "";
          onChange({
            specializationIds: has
              ? selectedIds.filter((x) => x !== id)
              : [...selectedIds, id],
            // Keep the display names in step with the ids. The server resends
            // both on save, but until then the Review page reads these — and a
            // name list that lags its id list renders the wrong chips.
            specializationNames: has
              ? selectedNames.filter((x) => x.id !== id)
              : [...selectedNames, { id, name }],
          });
        }
      };

    
  return (

        <>
          {error && <Notice>{error}</Notice>}
          {groups0.length === 0 ? (
            <p className="text-ink-2">Loading specializations…</p>
          ) : (
            <div>
              {/* Picked, always visible and always removable — it sits OUTSIDE
                  the scroll region so a selection can never be scrolled or
                  filtered out of reach. */}
              {totalSpecs > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[13px] font-bold">
                    Your Specializations{" "}
                    <span className="font-normal text-ink-2">({totalSpecs})</span>
                  </p>
                  <div className={`flex flex-wrap gap-2 ${pickedRegionClass}`}>
                    {selectedIds.map((id) => (
                      <Chip key={id} selected onClick={() => toggleSpec(id)}>
                        {specById.get(id) ?? "Specialization"}
                      </Chip>
                    ))}
                    {customs.map((name) => (
                      <Chip
                        key={`custom:${name}`}
                        selected
                        onClick={() => onRemoveCustom(name)}
                      >
                        {name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {/* One control for both jobs, matching the Skills tier: type to
                  narrow, or type something we don't have and add it (E031). */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label="Search or Add a Specialization">
                    <TextInput
                      value={query}
                      onChange={(e) => onQueryChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomSpec();
                        }
                      }}
                      placeholder="Start typing… e.g. Workday"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={addCustomSpec}
                  disabled={!query.trim()}
                  className="mb-[2px] rounded-full border-[1.5px] border-line px-5 py-3 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta disabled:opacity-40"
                >
                  + Add
                </button>
              </div>

              {searching ? (
                /* SEARCH MODE — flat results across all three tiers, grouped so
                   you can still see WHICH tier a match came from, inside one
                   fixed-height region so typing never moves the footer. */
                <>
                  <div className={`mt-3 max-h-[320px] ${scrollRegionClass}`}>
                    {groups.length === 0 ? (
                      <p className="text-[14px] text-ink-2">
                        No matches — use “+ Add” to create it.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {groups.map((g) => (
                          <div key={g.kind}>
                            <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-2">
                              {g.label}
                              {g.hidden > 0 && (
                                <span className="ml-2 font-normal normal-case tracking-normal">
                                  +{g.hidden} more
                                </span>
                              )}
                            </h2>
                            <div className="flex flex-wrap gap-2">
                              {g.shown.map((item) => (
                                <Chip
                                  key={item.id}
                                  selected={false}
                                  onClick={() => toggleSpec(item.id)}
                                >
                                  {item.name}
                                </Chip>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {hiddenSpecCount > 0 && (
                    <p className="mt-2 text-[13px] text-ink-2">
                      +{hiddenSpecCount} more — keep typing to narrow the list.
                    </p>
                  )}
                </>
              ) : (
                /*
                  BROWSE MODE — the RDS collapsing-cascade (WS9 / E073), now with
                  INDUSTRIES AS ITS OWN TIER rather than a third heading inside a
                  shared scroll box. Industry is a different KIND of claim from a
                  product or a method — "I know Workday" and "I know utilities"
                  are answers to different buyer questions — and burying it third
                  in one list made it the section people scrolled past.

                  Unlike Role → Domain → Skill, these tiers are INDEPENDENT: none
                  gates the next, because a provider with no product to name still
                  has an industry. So the cascade here is only the disclosure
                  shape — one tier open, the others one line each.
                */
                <div className="mt-3 space-y-2.5">
                  {groups0.map((g, gi) => {
                    const picked = pickedNames(g.kind);
                    const summary =
                      picked.length === 0
                        ? "None yet"
                        : picked.slice(0, 2).join(", ") +
                          (picked.length > 2 ? ` +${picked.length - 2}` : "");
                    const chosenHere = g.items.filter((i) => chosenSpecs.has(i.id));
                    const avail = g.items.filter((i) => !chosenSpecs.has(i.id));
                    const hidden = Math.max(0, avail.length - maxPerTier);

                    return (
                      <CascadeTier
                        key={g.kind}
                        index={gi + 1}
                        label={g.label}
                        // Open tier → null, which is what makes CascadeTier
                        // render the picker instead of the summary row.
                        chosen={openSpecKind === g.kind ? null : summary}
                        changeLabel={picked.length === 0 ? "Add" : "Change"}
                        onChange={() => onOpenTierChange(g.kind)}
                      >
                        {/* Exactly THREE chip rows (38px chip + 48px pitch +
                            the region's own 12px padding). A round number like
                            132px lands mid-chip, and a chip sliced through the
                            middle reads as a rendering bug rather than as "there
                            is more below" — the tinted, bordered, scrolling box
                            already says that. */}
                        <div className={`max-h-[176px] ${scrollRegionClass}`}>
                          <div className="flex flex-wrap gap-2">
                            {/*
                              E086 — this tier's OWN picks, first and removable.
                              An expanded section used to show only what you could
                              still add, so Industries could read "Retail +" while
                              saying nothing about the two industries you had
                              already chosen; the only evidence was the aggregate
                              row at the top and the collapsed summary you had just
                              opened. The skills tier has always shown its picks
                              in place, and this is the same rule.
                            */}
                            {chosenHere.map((item) => (
                              <Chip
                                key={item.id}
                                selected
                                onClick={() => toggleSpec(item.id)}
                              >
                                {item.name}
                              </Chip>
                            ))}
                            {avail.slice(0, maxPerTier).map((item) => (
                              <Chip
                                key={item.id}
                                selected={false}
                                onClick={() => toggleSpec(item.id)}
                              >
                                {item.name}
                              </Chip>
                            ))}
                            {avail.length === 0 && chosenHere.length === 0 && (
                              <p className="text-[14px] text-ink-2">
                                Nothing listed here yet — use the search above to
                                add one.
                              </p>
                            )}
                            {avail.length === 0 && chosenHere.length > 0 && (
                              <p className="w-full text-[13px] text-ink-2">
                                You&apos;ve picked everything we list here.
                              </p>
                            )}
                          </div>
                        </div>
                        {hidden > 0 && (
                          <p className="mt-2 text-[13px] text-ink-2">
                            +{hidden} more — search above to find them.
                          </p>
                        )}
                      </CascadeTier>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      
  );
}
