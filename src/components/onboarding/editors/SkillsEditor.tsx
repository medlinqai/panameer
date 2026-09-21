"use client";

import { Chip, Notice, TextInput } from "@/components/onboarding/controls";
/* ⚠ `E515`'s DISAMBIGUATION, imported not re-implemented: two skills can share
   a label under different domains, and the qualifier is what tells them apart. */
import { ambiguousSkillNames, skillQualifier } from "@/lib/skill-labels";
import { titleCase } from "@/lib/title-case";

/**
 * ── ⚠⚠ THE SKILLS EDITOR, EXTRACTED (`P2-A2-E597` WS-B, editor 5 of 5) ───
 *
 * ⚠ 468 lines — the largest, and last by WS-A's order for exactly that reason.
 * `SparkIcon` (13 lines) moved with it; it was local to the wizard.
 *
 * ── ⚠⚠⚠ THE THREE `useEffect`s DID NOT MOVE, AND THEY DID NOT NEED TO ────
 *
 * ⚠ The brief flagged them as the risk: *"Skills carries three useEffects keyed
 * on screen and editSection. If they can't move without changing when they
 * fire, STOP AND REPORT rather than rewriting them."*
 * ⚠⚠ MEASURED: `skillsEditing` CONTAINS NO `useEffect` AT ALL. The three are
 * the WIZARD's data loaders — `fieldRoles`, `specGroups` and `skillOpts` — and
 * two of them serve screens this editor has nothing to do with (`roles`,
 * `catalog`, and the specializations picker share the same effect body).
 * ⚠⚠⚠ MOVING THEM WOULD HAVE BEEN THE CHANGE SCOTT WARNED ABOUT: the
 * `fieldRoles` loader fires for `screen === "roles"` and `screen === "catalog"`
 * too, and a component that only mounts for skills could not fire for those.
 * ⚠ SO NOTHING MOVED AND NOTHING FIRES DIFFERENTLY. This component receives
 * `skillOpts` and `fieldRoles` as props, the same shape the specializations
 * editor receives `specGroups` in — one pattern for all five.
 *
 * ⚠ PRESENTATION AND DERIVATION ONLY. The save stays in `skillsEditing()`.
 */

/**
 * ⚠ MOVED WITH THE EDITOR (`P2-A2-E597` WS-B). The AI mark used wherever the
 * product attributes work to AI (WS4/E174); the skills picker is its caller.
 * ⚠ SUPERSEDED, quoted not deleted (`E164`) — it lived in `page.tsx`.
 */
export function SparkIcon() {
  return (
    <span
      aria-hidden
      className="grid h-6 w-6 flex-none place-items-center rounded-full bg-magenta/15 text-magenta"
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
  /*
    ⚠⚠ `roleTypeId`, `roleTypeIds` AND `fieldRoles` ARE NOT PROPS, and finding
    that out is worth recording: the component NEVER READS ANY OF THEM.
    `roleTypeId` is the caller's, for `customSkillRoleId` in the save;
    `roleTypeIds` and `fieldRoles` were only ever used to build `roleNames` and
    `canSave`, both of which belong to the helper's contract and stayed there.
    ⚠ An unused prop is a claim about what a component needs that is not true —
    and here it would have implied the skills editor depends on the catalog's
    role list, which is exactly the false coupling this extraction is removing.
  */
  /** ⚠ LOADED BY THE WIZARD'S EFFECT, passed in — see the note above. */
  /** ⚠ THE WIZARD'S OWN `SkillOpt`. `pillar` is the DOMAIN and stays on every
   *  row — it disambiguates two skills sharing a label (`E515`). */
  skillOpts: SkillOpt[];
  /*
    ⚠⚠ `E517`'s SHOWN/HELD SPLIT IS COMPUTED BY THE CALLER AND PASSED IN.
    `isSkillShown` is the ONE rule and the wizard already applies it for three
    surfaces; re-deriving it here would be the `E585` mistake — two computations
    of one concept, kept in step by hand.
  */
  shownSkillNames: SkillName[];
  heldNotShownSkillNames: SkillName[];
  maxSuggestions: number;
  query: string;
  onQueryChange: (next: string) => void;
  /* ⚠ THE PENDING "DID YOU MEAN…?" (`E298`). Non-null means the matcher found a
     NEAR row and nothing has been added — the member has to answer. */
  match: { typed: string; prompt: string; skill: { id: string; name: string } } | null;
  onMatchChange: (
    next: { typed: string; prompt: string; skill: { id: string; name: string } } | null
  ) => void;
  /** ⚠ A PARTIAL. The caller owns `profile` and merges it — one `setProfile`. */
  onChange: (patch: {
    skillIds?: string[];
    skillNames?: SkillName[];
    customSkills?: string[];
  }) => void;
  onRemoveCustom: (name: string) => void;
  scrollRegionClass: string;
  pickedRegionClass: string;
  /** ⚠ The wizard's save error, rendered above the picker as it always was. */
  error?: string | null;
  /*
    ⚠⚠⚠ `E517`'s COPY, PASSED IN — NOT COPIED. Scott NAMED these two strings on
    2026-09-17 and the brief says in terms: "DO NOT RE-OPEN IT." They keep their
    home in the wizard, where their REJECTED ALTERNATIVES are quoted beside them
    under `E164` — a second copy here would be a second place to edit wording
    that is settled, and the rejected options would not travel with it.
    ⚠ What the copy must never say is also recorded there: that the skill is
    gone, expired, wrong or unverified. It is held, it is theirs.
  */
  heldNotShownHeading: string;
  heldNotShownExplanation: string;
}) {
      const chosenSkills = new Set(selectedIds);

      /*
        ── ⚠⚠ HELD, BUT NOT SHOWN (`P2-J1.4-E517`) ─────────────────────────────

        ⚠⚠ THE STEP READS WHAT IS HELD. `E517` stopped the role step DELETING
        out-of-role skills and moved the filter to the offer-side reads, which
        means a provider can now hold a skill that appears on no surface they
        can see. ⚠ THE ONLY PLACE TO REMOVE IT IS HERE, so this is the one list
        that must not filter.

        ⚠ Split, not hidden: every held skill appears EXACTLY ONCE — in the
        basket if their roles show it, in the block below the picker if they do
        not. Listing it twice would make one chip look like two skills.

        ⚠⚠ COMPUTED AGAINST `roleTypeIds` — the roles IN THE WIZARD, not
        the roles last saved — so unticking a role on the previous step moves
        skills into this block immediately, which is the whole point: the
        provider sees the consequence before it reaches their profile.

        ⚠ `isSkillShown` is the same function the profile, the provider cards
        and the matcher read. One rule, gated by `check:shown-skills`.
      */
      const basketSkills = shownSkillNames;
      const heldNotShown = heldNotShownSkillNames;
      /* ⚠ The basket counts what it lists. `canSave` still counts everything
         HELD (`totalPicked`), so a provider whose skills are all out-of-role is
         never trapped on this step by a number they cannot see. */
      const basketCount = basketSkills.length + customs.length;

      const q = query.trim().toLowerCase();
      // Already-picked skills are chips above, so they stop being suggestions —
      // filtering them out BEFORE the cap keeps a full set of usable options as
      // picks accumulate rather than quietly thinning it (E053).
      const matchingSkills = (
        q ? skillOpts.filter((sk) => sk.name.toLowerCase().includes(q)) : skillOpts
      ).filter((sk) => !chosenSkills.has(sk.id));
      const shownSkills = matchingSkills.slice(0, maxSuggestions);
      const hiddenSkillCount = matchingSkills.length - shownSkills.length;

      /*
        ── ⚠⚠ WHICH LABELS ARE NOT UNIQUE HERE (`P1-A1.3-E401` WS-3) ───────────

        Computed over `skillOpts` — EVERY option for this provider's roles, not
        just the ones currently on screen. ⚠ THE SEARCH BOX WOULD OTHERWISE HIDE
        THE COLLISION: typing "recr" narrows the list, and if ambiguity were
        judged on `shownSkills` a name could gain and lose its qualifier as the
        provider types. The set is a property of what they may pick, not of what
        is visible this keystroke.
        ⚠ AND IT DRIVES THE PICKED CHIPS BELOW TOO, so a chip reads the same
        after it is clicked as it did before.
      */
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
        /*
          ⚠⚠ TITLE-CASED ON SAVE (`P1-J1.4-E298`, 2026-08-31). Scott's own chip read
          `purchase requisitons` — lower-case, and the page prints the stakes right
          below it: *"each one is another search a buyer can find you in."*
      
          ⚠ `titleCase` IS THE SHARED HELPER (`lib/title-case.ts`) and this is its
          first caller. ⚠ THE BRIEF SAID TO REUSE THE ONE FROM THE `e96cd2e` SWEEP —
          THERE WASN'T ONE. That pass was a static rewrite of 60 literals by an
          uncommitted scanner, so no runtime function existed. Reported; the helper
          is created ONCE so the instruction's real intent — never two
          implementations — holds from here.
      
          ⚠⚠ CAPITALISATION IS THE SMALL HALF AND IT SHIPS ALONE, DELIBERATELY.
          `purchase requisitons` becomes `Purchase Requisitons` — still misspelled,
          still unmatchable, now looking deliberate. The fuzzy-match-before-create
          that would actually fix it ("Did you mean Purchase Requisitions?") is
          CHAT'S ADDITION, not Scott's ask, and `E298` says capitalisation ships
          alone unless he says yes. Surfaced in the report; NOT BUILT HERE.
        */
        void addSkillMatched(titleCase(query.trim()));
      };

      /*
        ── ⚠⚠ MATCH BEFORE CREATE (`P1-J1.4-E298`) ─────────────────────────────

        SCOTT: *"i added a new skill - purchase requisitions… but that is as i
        typed it… that means we will get misspellings and non-capitalizations."*

        ⚠ SUPERSEDED, quoted: `addCustomSkill` used to title-case the text and push
        it straight into `customSkills`, and its own comment admitted the gap —
        *"still misspelled, still unmatchable, now looking deliberate"*. It now
        asks `api/onboarding/provider/skill-match`, which runs THE SAME
        `matchSkill` the save path runs, against the WHOLE catalog rather than the
        current role's `skillOpts`.

        ⚠⚠ EXACT-ISH LINKS SILENTLY. NEAR ASKS. `Purchase Requisitions` typed by
        hand now selects the catalog row; `purchase requisitons` offers *"Did you
        mean Purchase Requisitions?"* and CHANGES NOTHING until answered. A skill
        is a claim about what somebody can do — auto-correcting it would put words
        in their mouth, and if the guess is wrong it is a false claim with their
        name on it.

        ⚠ THE DEDUPE WITHIN THEIR OWN LIST IS KEPT AND RUNS FIRST — it is cheap,
        local, and stops a round trip for something already on screen.
        ⚠ AND IF THE LOOKUP FAILS FOR ANY REASON THE OLD BEHAVIOUR STANDS: the
        custom skill is added as typed. A network blip must not silently swallow
        a skill somebody just asked for.
      */
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
            <div className="mb-4 rounded-brand border border-magenta/25 bg-magenta/[0.04] p-4">
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
              className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold transition-colors hover:border-magenta hover:text-magenta disabled:opacity-40"
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
                  className="rounded-full bg-magenta px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-magenta-dark"
                >
                  Use {match.skill.name}
                </button>
                <button
                  type="button"
                  onClick={keepTypedSkill}
                  className="rounded-full border-[1.5px] border-line px-4 py-2 text-[13.5px] font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
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
                    className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line bg-white px-3.5 py-1.5 text-[13.5px] font-bold text-ink-2"
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
