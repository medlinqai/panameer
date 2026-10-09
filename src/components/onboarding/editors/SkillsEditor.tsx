"use client";

import { Chip, Notice, TextInput } from "@/components/onboarding/controls";
import { AiLine } from "@/components/onboarding/AiLine";
import { ambiguousSkillNames, skillQualifier } from "@/lib/skill-labels";
import { titleCase } from "@/lib/title-case";

export function SparkIcon() {
  return (
    <span
      aria-hidden
      className="grid h-6 w-6 flex-none place-items-center rounded-full bg-ink/10 text-ink"
    >
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
        <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
        <path d="M18.5 14l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
      </svg>
    </span>
  );
}

export type SkillName = {
  id: string;
  name: string;
  area?: string | null;
  roleTypeId?: string | null;
};

export type SkillOpt = {
  id: string;
  name: string;
  roleType: { display: string } | null;
  pillar?: { id: string; name: string } | null;
};

export function SkillsEditor({
  selectedIds,
  selectedNames,
  customs,
  resumeSkillIds,
  skillOpts,
  query,
  onQueryChange,
  match,
  onMatchChange,
  shownSkillNames,
  heldNotShownSkillNames,
  maxSuggestions,
  onChange,
  onRemoveCustom,
  scrollRegionClass,
  pickedRegionClass,
  error,
  heldNotShownHeading,
  heldNotShownExplanation,
}: {
  selectedIds: string[];
  selectedNames: SkillName[];
  customs: string[];
  resumeSkillIds: string[];
  skillOpts: SkillOpt[];
  shownSkillNames: SkillName[];
  heldNotShownSkillNames: SkillName[];
  maxSuggestions: number;
  query: string;
  onQueryChange: (next: string) => void;
  match: { typed: string; prompt: string; skill: { id: string; name: string } } | null;
  onMatchChange: (
    next: { typed: string; prompt: string; skill: { id: string; name: string } } | null
  ) => void;
  onChange: (patch: {
    skillIds?: string[];
    skillNames?: SkillName[];
    customSkills?: string[];
  }) => void;
  onRemoveCustom: (name: string) => void;
  scrollRegionClass: string;
  pickedRegionClass: string;
  error?: string | null;
  heldNotShownHeading: string;
  heldNotShownExplanation: string;
}) {
      const chosenSkills = new Set(selectedIds);
      // One chip per skill name (the same name can sit under two ids); removing it drops every id.
      const basketSkills = shownSkillNames.filter(
        (sk, i, a) => a.findIndex((x) => x.name.toLowerCase() === sk.name.toLowerCase()) === i
      );
      const idsNamed = (name: string) =>
        selectedNames.filter((x) => x.name.toLowerCase() === name.toLowerCase()).map((x) => x.id);
      const heldNotShown = heldNotShownSkillNames;
      const basketCount = basketSkills.length + customs.length;

      const q = query.trim().toLowerCase();
      // Already-picked skills are chips above, so they stop being suggestions —
      // filtering them out BEFORE the cap keeps a full set of usable options as
      const pickedNames = new Set(selectedNames.map((x) => x.name.toLowerCase()));
      const open = skillOpts.filter((sk) => !chosenSkills.has(sk.id) && !pickedNames.has(sk.name.toLowerCase()));
      // No query: 10–15 suggestions from the member's software (pillars of skills they hold). Typing searches all.
      const areas = new Set(selectedNames.map((x) => x.area).filter(Boolean) as string[]);
      const related = [...open].sort(
        (a, b) => Number(areas.has(b.pillar?.name ?? "")) - Number(areas.has(a.pillar?.name ?? ""))
      );
      const matchingSkills = q ? open.filter((sk) => sk.name.toLowerCase().includes(q)) : related;
      const shownSkills = matchingSkills.slice(0, maxSuggestions);
      const hiddenSkillCount = q ? matchingSkills.length - shownSkills.length : 0;
      const suggestFor = [...areas].slice(0, 2).join(" / ");

      const ambiguousSkills = ambiguousSkillNames(
        skillOpts.map((sk) => ({ name: sk.name, area: sk.pillar?.name ?? null }))
      );

      const toggleSkill = (id: string) => {
        {
          const has = selectedIds.includes(id);
          const opt = skillOpts.find((x) => x.id === id);
          onChange({
            skillIds: has ? selectedIds.filter((x) => x !== id) : [...selectedIds, id],
            skillNames: has
              ? selectedNames.filter((x) => x.id !== id)
              : [
                  ...selectedNames,
                  // The DOMAIN still rides along on every chip — it is what
                  { id, name: opt?.name ?? "", area: opt?.pillar?.name ?? null },
                ],
          });
        }
      };

      const addCustomSkill = () => {
        void addSkillMatched(titleCase(query.trim()));
      };

      const addSkillMatched = async (name: string) => {
        if (!name) return;
        if (
          customs.some((c) => c.toLowerCase() === name.toLowerCase()) ||
          selectedNames.some((c) => c.name.toLowerCase() === name.toLowerCase())
        ) {
          onQueryChange("");
          return;
        }
        onMatchChange(null);
        try {
          const r = await fetch(
            `/api/onboarding/provider/skill-match?q=${encodeURIComponent(name)}`
          );
          const m = r.ok ? await r.json() : { kind: "none" };
          if (m.kind === "exact" && m.skill?.id) {
            /* Already in the catalog — link the real row, create nothing. */
            if (!selectedIds.includes(m.skill.id)) {
              onChange({
                skillIds: [...selectedIds, m.skill.id],
                skillNames: [
                  ...selectedNames,
                  { id: m.skill.id, name: m.skill.name, area: null },
                ],
              });
            }
            onQueryChange("");
            return;
          }
          if (m.kind === "near" && m.skill?.id) {
            /* ASK. Nothing is added yet — both options stay on screen. */
            onMatchChange({ typed: name, prompt: m.prompt, skill: m.skill });
            return;
          }
        } catch {
          /* fall through to adding it as typed */
        }
        onChange({ customSkills: [...customs, name] });
        onQueryChange("");
      };

      /** Take the suggestion — link the catalog row instead of the typed text. */
      const acceptSkillMatch = () => {
        if (!match) return;
        const { skill } = match;
        if (!selectedIds.includes(skill.id)) {
          onChange({
            skillIds: [...selectedIds, skill.id],
            skillNames: [...selectedNames, { id: skill.id, name: skill.name, area: null }],
          });
        }
        onMatchChange(null);
        onQueryChange("");
      };

      /** Keep what they typed. A REAL, SUPPORTED OUTCOME — Scott types real ones. */
      const keepTypedSkill = () => {
        if (!match) return;
        onChange({ customSkills: [...customs, match.typed] });
        onMatchChange(null);
        onQueryChange("");
      };

      // WHICH PICKED SKILLS CAME OFF THE RÉSUMÉ (E187).
      const fromResume = new Set(resumeSkillIds);
      const aiMatchedCount = basketSkills.filter((sk) => idsNamed(sk.name).some((id) => fromResume.has(id))).length;
      const cameFromResume = aiMatchedCount > 0;

      // the step header that read them — both are the helper's contract, not

  return (
        <>
          {error && <Notice>{error}</Notice>}

          {/* WS4 / E174 — NAME THE AI. */}
          {cameFromResume && (
            <AiLine className="mb-4">
              {aiMatchedCount} skill{aiMatchedCount === 1 ? "" : "s"}, pre-selected below. Remove anything that isn&apos;t yours.
            </AiLine>
          )}

          {/* The basket is always on screen and always removable. */}
          {(basketSkills.length > 0 || customs.length > 0) && (
            <div className="mb-4">
              <p className="mb-2.5 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2">
                {/* E202 — a count, not a quota. "12/15" turned a list of what
                    you can do into a budget you were spending. */}
                Your Skills{" "}
                {/* E517 — counts what this list SHOWS. Out-of-role skills are */}
                <span>({basketCount})</span>
              </p>
              <div className={`flex flex-wrap gap-2 ${pickedRegionClass}`}>
                {basketSkills.map((sk) => (
                  <Chip
                    key={sk.id}
                    selected
                    onClick={() => {
                      const ids = new Set(idsNamed(sk.name));
                      onChange({
                        skillIds: selectedIds.filter((x) => !ids.has(x)),
                        skillNames: selectedNames.filter((x) => !ids.has(x.id)),
                      });
                    }}
                  >
                    {sk.name}
                    {/* THAT CONDITION ASKED THE WRONG QUESTION. It qualified a */}
                    {skillQualifier(sk, ambiguousSkills) && (
                      <span className="ml-1 text-[12px] font-normal opacity-75">
                        · {skillQualifier(sk, ambiguousSkills)}
                      </span>
                    )}
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

          {/* SEARCH-FIRST. The catalog is meant to grow without limit, so the
              page must never grow with it: a capped suggestion set inside a
              fixed-height scroll region (E053/E054). */}
          <div className="flex max-w-[560px] items-stretch gap-2">
            <TextInput
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSkill();
                }
              }}
              placeholder="Search the full taxonomy, or type your own"
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={addCustomSkill}
              disabled={!query.trim()}
              className="border border-ink bg-surface px-5 py-2.5 font-semibold transition-colors hover:bg-surface-hover disabled:opacity-40 text-ink"
            >
              + Add
            </button>
          </div>

          {/* A NEAR MATCH ASKS */}
          {match && (
            <div className="mt-3 max-w-md border border-line bg-bg-soft p-4">
              <p className="text-[14px] font-bold">{match.prompt}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                It&apos;s already in the catalog, so buyers already search for it.
                You typed &ldquo;{match.typed}&rdquo;.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={acceptSkillMatch}
                  className="bg-ink px-4 py-2 text-[13.5px] font-semibold text-surface transition-colors hover:bg-ink-hover"
                >
                  Use {match.skill.name}
                </button>
                <button
                  type="button"
                  onClick={keepTypedSkill}
                  className="border border-ink bg-surface px-4 py-2 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-hover"
                >
                  Keep &ldquo;{match.typed}&rdquo;
                </button>
              </div>
            </div>
          )}

          {!q && shownSkills.length > 0 && (
            <p className="mb-2.5 mt-5 text-[12px] font-bold uppercase tracking-[0.12em] text-ink-2" data-skill-suggestions>
              Suggested{suggestFor ? ` · ${suggestFor}` : ""}
            </p>
          )}
          <div className={q ? `mt-3 max-h-[220px] ${scrollRegionClass}` : "mt-1"}>
            <div className="flex flex-wrap gap-2">
              {shownSkills.map((sk) => (
                <Chip key={sk.id} selected={false} onClick={() => toggleSkill(sk.id)}>
                  {sk.name}
                  {/* THE CHIP SCOTT ACTUALLY SAW. This list carried the bare */}
                  {skillQualifier({ name: sk.name, area: sk.pillar?.name ?? null }, ambiguousSkills) && (
                    <span className="ml-1 text-[12px] font-normal opacity-75">
                      · {sk.pillar?.name}
                    </span>
                  )}
                </Chip>
              ))}
              {shownSkills.length === 0 && (
                <p className="text-[14px] text-ink-2">
                  {matchingSkills.length === 0 && q
                    ? "No matches — use “+ Add” to create it."
                    : "You've picked every skill we list here."}
                </p>
              )}
            </div>
          </div>
          {hiddenSkillCount > 0 && (
            <p className="mt-2 text-[13px] text-ink-2">
              +{hiddenSkillCount} more — keep typing to narrow the list.
            </p>
          )}
          {!q && <p className="mt-2 text-[12.5px] text-ink-2">The full catalog ({skillOpts.length} skills) shows as you type.</p>}

          {/* THE REMOVAL GAP */}
          {heldNotShown.length > 0 && (
            <div className="mt-6 border border-line bg-bg-soft p-4">
              <p className="text-[14px] font-bold">{heldNotShownHeading}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-2">
                {heldNotShownExplanation}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {heldNotShown.map((sk) => (
                  <span
                    key={sk.id}
                    className="inline-flex items-center gap-1.5 border border-ink bg-surface bg-white px-3.5 py-1.5 text-[13.5px] font-semibold text-ink-2 text-ink"
                  >
                    {sk.name}
                    <button
                      type="button"
                      onClick={() => toggleSkill(sk.id)}
                      aria-label={`Remove ${sk.name}`}
                      className="text-[15px] leading-none text-ink-2 transition-colors hover:text-magenta"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      
  );
}
