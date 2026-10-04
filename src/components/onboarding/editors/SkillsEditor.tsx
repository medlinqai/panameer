"use client";

import { Chip, Notice, TextInput } from "@/components/onboarding/controls";
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

      const basketSkills = shownSkillNames;
      const heldNotShown = heldNotShownSkillNames;
      const basketCount = basketSkills.length + customs.length;

      const q = query.trim().toLowerCase();
      // Already-picked skills are chips above, so they stop being suggestions —
      // filtering them out BEFORE the cap keeps a full set of usable options as
      const matchingSkills = (
        q ? skillOpts.filter((sk) => sk.name.toLowerCase().includes(q)) : skillOpts
      ).filter((sk) => !chosenSkills.has(sk.id));
      const shownSkills = matchingSkills.slice(0, maxSuggestions);
      const hiddenSkillCount = matchingSkills.length - shownSkills.length;

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
                  // tells two identically-named skills apart ("Project Manager"
                  // exists under two domains), which is exactly why the FK
                  // stays even though the tier is gone.
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
            /* ⚠ ASK. Nothing is added yet — both options stay on screen. */
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

      /** Keep what they typed. ⚠ A REAL, SUPPORTED OUTCOME — Scott types real ones. */
      const keepTypedSkill = () => {
        if (!match) return;
        onChange({ customSkills: [...customs, match.typed] });
        onMatchChange(null);
        onQueryChange("");
      };

      /*
        WHICH PICKED SKILLS CAME OFF THE RÉSUMÉ (E187).

        This used to be computed from `importOutcome` — client state from the
        upload that just happened — with `hasImport && skillNames.length > 0` as
        the fallback when that state was gone. Both were wrong, in opposite
        directions and at the same time. On ARRIVAL at a freshly-hydrated Skills
        step there is no `importOutcome`, and if the import matched nothing the
        fallback is false too: no card, nothing pre-ticked, exactly what the walk
        saw. Then the provider clicks any skill by hand, `skillNames.length`
        becomes 1, and the fallback flips true — so the card finally appears,
        crediting AI for the skill they just typed.

        `resumeSkillIds` is the server's answer to the actual question, present
        on the first render and after any reload, and it never counts a manual
        pick. The pre-selection itself was always server-side (the import writes
        ProviderSkill rows); what was missing was skills worth selecting, which
        is WS-A's job, and an honest way to say where they came from, which is
        this.
      */
      const fromResume = new Set(resumeSkillIds);
      const aiMatchedCount = selectedIds.filter((id) =>
        fromResume.has(id)
      ).length;
      const cameFromResume = aiMatchedCount > 0;

      /* ⚠ `roleNames` and `totalPicked` MOVED TO THE CALLER with `canSave` and
         the step header that read them — both are the helper's contract, not
         this component's. */

  return (
        <>
          {error && <Notice>{error}</Notice>}

          {/*
            WS4 / E174 — NAME THE AI.

            The résumé→skills hunt is one of the few places the product does
            something visibly clever, and the copy didn't mention it at all: the
            skills simply appeared, pre-ticked, as if they had always been
            there. AI-native is a stated selling point; a feature nobody
            attributes is a selling point nobody hears.

            Shown only when an import actually produced matches, so it never
            claims credit for skills the provider typed themselves — and, since
            E187, shown on ARRIVAL rather than after the first manual click.
          */}
          {cameFromResume && (
            <div className="mb-4 border-l-2 border-ink py-2 pl-4">
              <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold">
                <SparkIcon />
                AI scanned your résumé against the ERP Service Catalog
              </p>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-ink-2">
                It pulled{" "}
                <b className="text-ink">
                  {aiMatchedCount} skill{aiMatchedCount === 1 ? "" : "s"}
                </b>{" "}
                and pre-selected them below. Remove anything that isn&apos;t
                yours, and add what it missed — buyers match on these.
              </p>
            </div>
          )}

          {/* The basket is always on screen and always removable. */}
          {(basketSkills.length > 0 || customs.length > 0) && (
            <div className="mb-4">
              <p className="mb-1.5 text-[13px] font-bold">
                {/* E202 — a count, not a quota. "12/15" turned a list of what
                    you can do into a budget you were spending. */}
                Your Skills{" "}
                {/* ⚠ E517 — counts what this list SHOWS. Out-of-role skills are
                    still held and are counted in their own block below. */}
                <span className="font-normal text-ink-2">({basketCount})</span>
              </p>
              <div className={`flex flex-wrap gap-2 ${pickedRegionClass}`}>
                {basketSkills.map((sk) => (
                  <Chip key={sk.id} selected onClick={() => toggleSkill(sk.id)}>
                    {sk.name}
                    {/*
                      ⚠ SUPERSEDED, quoted not deleted (`P1-A1.3-E401` WS-3):
                      `{sk.area && roleNames.length > 1 && (…)}`.

                      ⚠⚠ THAT CONDITION ASKED THE WRONG QUESTION. It qualified a
                      chip when the provider held MORE THAN ONE ROLE — but the
                      collision Scott hit was two `Recruiting` skills inside ONE
                      role (Oracle Fusion Cloud and Workday, both
                      Application-Specific), so the test was false exactly when
                      the qualifier was needed. It also qualified chips that
                      needed nothing, whenever a second role happened to be
                      claimed. Wrong in both directions.
                    */}
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
          <div className="flex flex-wrap items-center gap-2">
            <TextInput
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomSkill();
                }
              }}
              placeholder="Search skills — or type your own and press Add"
              className="max-w-md"
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

          {/*
            ── ⚠⚠ A NEAR MATCH ASKS (`P1-J1.4-E298`) ────────────────────────────

            ⚠ BOTH ANSWERS ARE REAL AND BOTH ARE ONE CLICK. The suggestion is
            offered first because it is usually right, and KEEPING WHAT THEY TYPED
            IS NOT A PENALTY — Scott types genuinely new skills and this must not
            make that feel like a mistake.
            ⚠ THE TYPED TEXT STAYS ON SCREEN, quoted, so the member can compare
            the two rather than trusting a guess about what they meant.
            ⚠ NOTHING HAS BEEN ADDED AT THIS POINT. No auto-correct, no silent
            write — a skill is a claim about what somebody can do.
          */}
          {match && (
            <div className="mt-3 max-w-md rounded-brand border border-line bg-bg-soft p-4">
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

          <div className={`mt-3 max-h-[220px] ${scrollRegionClass}`}>
            <div className="flex flex-wrap gap-2">
              {shownSkills.map((sk) => (
                <Chip key={sk.id} selected={false} onClick={() => toggleSkill(sk.id)}>
                  {sk.name}
                  {/* ⚠⚠ THE CHIP SCOTT ACTUALLY SAW. This list carried the bare
                      name and nothing else, so the two `Recruiting` options were
                      indistinguishable AT THE MOMENT OF CHOOSING — which is the
                      only moment that matters. */}
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

          {/*
            ── ⚠⚠ THE REMOVAL GAP (`P2-J1.4-E517`) ──────────────────────────────

            ⚠ SCOTT, 2026-09-17: *"a section in the skills step, below the
            picker, listing skills the provider holds that their current roles
            do not show, each with a remove control."*

            ⚠⚠ WHY IT HAS TO EXIST. Before `E517` a narrowed role DELETED these
            rows, so there was nothing to remove. Now they survive — and every
            other surface filters them out, so without this block a provider who
            genuinely wants a skill gone has no way to say so. ⚠ THAT WOULD MAKE
            "we never delete what you hold" read as "you can never remove it."

            ⚠ THE REMOVE IS REAL AND IT IS THE PROVIDER'S OWN INSTRUCTION — it
            drops the id from `skillIds`, and `applyProviderSection`'s scoped
            delete (`source: "SELF_ADDED"`, `skill_id: { notIn: skillIds }`,
            `E552`) then removes the row. ⚠⚠ THAT IS NOT THE DEFECT `E517`
            FIXED: the harm was a SAVE destroying data nobody asked it to
            destroy. A provider clicking Remove asked.

            ⚠ It reuses `toggleSkill`, so removal behaves identically here and
            in the basket — and because the row leaves `skillNames`, the chip
            leaves this block with no extra state to keep in step.

            ⚠⚠ WORDING IS PROPOSED, NOT NAMED. Scott names things; these two
            strings are placed in constants so his ruling is a one-line swap.
          */}
          {heldNotShown.length > 0 && (
            <div className="mt-6 rounded-brand border border-line bg-bg-soft p-4">
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
