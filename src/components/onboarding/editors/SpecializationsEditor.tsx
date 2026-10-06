"use client";

import { Chip, Field, Notice, TextInput } from "@/components/onboarding/controls";

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
  changeLabel?: string;
  children: React.ReactNode;
}) {
  // a three-line box (heading row, then the value on its own line) that spent
  if (chosen) {
    return (
      <section className="flex items-center gap-3 border border-line px-4 py-2.5">
        <span
          aria-hidden
          className="grid h-6 w-6 flex-none place-items-center rounded-full bg-ink text-[12px] font-black text-surface"
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
    <section className="border border-line p-4">
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
  onChange: (patch: {
    specializationIds?: string[];
    specializationNames?: { id: string; name: string }[];
    customSpecializations?: string[];
  }) => void;
  onRemoveCustom: (name: string) => void;
  error?: string | null;
  maxPerGroup: number;
  pickedRegionClass: string;
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
      const searching = sq.length > 0;

      // Which tier each catalog item belongs to — the cascade needs it to count
      // and label a collapsed tier, and to pin the open one on a pick.
      const kindById = new Map<string, string>();
      groups0.forEach((g) => g.items.forEach((i) => kindById.set(i.id, g.kind)));
      const pickedNames = (kind: string) =>
        selectedIds
          .filter((id) => kindById.get(id) === kind)
          .map((id) => specById.get(id) ?? "Specialization");

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
              {}
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
                  className="mb-[2px] border border-ink bg-surface px-5 py-3 font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-40"
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
                // BROWSE MODE — the RDS collapsing-cascade (WS9 / E073), now with
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
                        {/* Exactly THREE chip rows (38px chip + 48px pitch + */}
                        <div className={`max-h-[176px] ${scrollRegionClass}`}>
                          <div className="flex flex-wrap gap-2">
                            {/* E086 — this tier's OWN picks, first and removable. */}
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
