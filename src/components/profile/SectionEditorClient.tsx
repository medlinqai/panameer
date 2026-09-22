"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice, TextArea } from "@/components/onboarding/controls";
import { EmployersStep } from "@/components/onboarding/EmployersStep";
import { EducationCards } from "@/components/onboarding/EducationCards";
import { CertificationCards } from "@/components/onboarding/CertificationCards";
/* ⚠ NO TITLE SECTION HERE, AND THAT IS MEASURED NOT ASSUMED: the owner's
   profile renders NO "Edit Title" link — counted by rendering, the eight are
   Bio, Skills, Specializations, Certifications, Education, Work History, Solo
   Projects and Rates. The title is edited from the wizard's review, which still
   mounts `TitleEditor`. ⚠ Adding a slug for it here would be a door the profile
   does not have. */
import { RateEditor, rateCanSave } from "@/components/onboarding/editors/RateEditor";
/* ⚠⚠⚠ `E597` WS-B EXTRACTED THESE TWO AND THIS ROUTE NEVER MOUNTED THEM.
   `SectionEditorClient` recorded why: the profile rendered no `Edit Title`
   link, so there was nothing to open them from. ⚠ `E600` WS-F gives both a
   section and an Edit control, which is what they were extracted for. */
import { TitleEditor, titleCanSave } from "@/components/onboarding/editors/TitleEditor";
import { ContactEditor } from "@/components/onboarding/editors/ContactEditor";
import { WORK_METHOD_OPTIONS } from "@/lib/onboarding-draft";
import { PhotoUpload } from "@/components/PhotoUpload";
import { EducationLanguagesEditor } from "@/components/onboarding/EducationLanguagesEditor";
import { SkillsEditor } from "@/components/onboarding/editors/SkillsEditor";
import { SpecializationsEditor } from "@/components/onboarding/editors/SpecializationsEditor";
import {
  draftFromStatus,
  emptyDraft,
  type ProviderDraft,
  type StatusPayload,
} from "@/lib/onboarding-draft";
import { rateBreakdown } from "@/lib/display";
import { sectionFor, type SectionSlug } from "@/lib/profile-sections";

/**
 * ── ⚠⚠ ONE SECTION, IN THE PROFILE'S FRAME (`P2-A2-E597` WS-C) ───────────
 *
 * ⚠ SCOTT: *"ALL THE EDITS on this page should go to a page where the editor I
 * can just change THAT particular value."* The complaint was *"not the right
 * page, not the right menu"* — so this is a PAGE, in the app shell, with **no
 * step counter, no Next and no wizard**.
 *
 * ── ⚠⚠⚠ NO NEW EDITORS AND NO SECOND SAVE PATH ──────────────────────────
 *
 * ⚠ Every editor below is the SAME COMPONENT the wizard mounts: the five
 * extracted in WS-B, plus `EmployersStep`, `EducationCards` and
 * `CertificationCards`, which `E412` had already made shared.
 * ⚠⚠ THE SAVE IS `POST /api/onboarding/provider/step` WITH THE WIZARD'S OWN
 * STEP AND PAYLOAD, taken from `lib/profile-sections.ts`. The server `case` is
 * the save, and it has one implementation.
 * ⚠⚠⚠ THE DRAFT COMES FROM `draftFromStatus`, the same mapping the wizard
 * hydrates with — a second mapping would be `E585` in a new place.
 *
 * ── ⚠ WHY IT RETURNS TO `/profile` AND NOT `/connect` ───────────────────
 *
 * ⚠⚠ `/profile` IS THE STABLE ROUTE (`E591`). Today it REDIRECTS to `/connect`
 * for a provider; the avatar-menu brief will make it render the profile itself.
 * Returning to `/profile` is correct under both, and means none of these links
 * has to change when that lands.
 */
export function SectionEditorClient({ slug }: { slug: SectionSlug }) {
  /*
    ⚠⚠ THE SPEC IS READ HERE, NOT HANDED DOWN. `SectionSpec.payload` is a
    FUNCTION, and a function cannot be serialised across the server→client
    boundary — passing the whole spec 500ed every section that has one.
    ⚠ `sectionFor` returns a row of a module-level `const` array, so this is the
    SAME object reference on every render and the hook deps below stay stable.
    ⚠⚠ THE REGISTRY IS STILL THE ONE DEFINITION of what a section posts; only
    who reads it moved.
  */
  const section = sectionFor(slug)!;
  const router = useRouter();
  const [draft, setDraft] = useState<ProviderDraft>(emptyDraft());
  /* ⚠⚠⚠ THE ROLE PICKER NEEDS THE CATALOG, AND THE STATUS PAYLOAD IS NOT IT.
     ⚠ SUPERSEDED, quoted not deleted (`E164`) — the premise was WRONG:
     //  ⚠⚠ THE ROLE PICKER NEEDS THE CATALOG'S ROLE TYPES, and they live on the
     //  STATUS payload, not on the draft — `draftFromStatus` maps what a provider
     //  HAS, not what they can choose from. ⚠ Kept alongside rather than widened
     //  into `ProviderDraft`, which every other caller shares.
     ⚠⚠ `status.profile.roleTypes` IS `pp.roles` — THE ROLES THE PROVIDER ALREADY
     HOLDS (`onboarding.ts`, the `roleTypes:` key). Rendering the picker from it
     offered Priya exactly ONE option, the one she was already on: a control that
     looks like a choice and cannot change anything, which is `E579`.
     ⚠ MEASURED AT THE WS-F GATE from the rendered page, not from the type — the
     field name is identical either way, so nothing but a render could catch it.
     ⚠⚠⚠ THE CATALOG COMES FROM `/api/catalog/role-types`, the same endpoint
     `ProjectModal` already uses. The HELD roles stay where they were — they are
     the DRAFT's pre-selection (`draft.roleTypeIds`), not the option list. */
  const [roleTypes, setRoleTypes] = useState<
    { id: string; name: string; display: string }[]
  >([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ⚠ Catalog data the pickers need. The WIZARD loads these from effects keyed
     on its own screen state; this page has one section and loads only what that
     section needs, on mount. */
  const [specGroups, setSpecGroups] = useState<
    { kind: string; label: string; items: { id: string; name: string }[] }[]
  >([]);
  const [skillOpts, setSkillOpts] = useState<
    { id: string; name: string; roleType: { display: string } | null; pillar?: { id: string; name: string } | null }[]
  >([]);
  const [specQuery, setSpecQuery] = useState("");
  const [openSpecTier, setOpenSpecTier] = useState<string | null>(null);
  const [skillQuery, setSkillQuery] = useState("");
  const [skillMatch, setSkillMatch] = useState<{
    typed: string;
    prompt: string;
    skill: { id: string; name: string };
  } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/onboarding/status");
        if (!r.ok) {
          setError("We couldn't load your profile. Please refresh.");
          setLoaded(true);
          return;
        }
        const s = (await r.json()) as StatusPayload;
        if (!alive) return;
        if (s.profile) setDraft(draftFromStatus(s.profile));
        setLoaded(true);
      } catch {
        if (alive) {
          setError("We couldn't reach Panameer. Check your connection.");
          setLoaded(true);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ⚠⚠ THE ROLE CATALOG — the list to CHOOSE FROM, not the list already held.
     ⚠ Same endpoint `ProjectModal` uses, so there is one source of role types
     rather than a second that can drift. */
  useEffect(() => {
    if (section.slug !== "role") return;
    fetch("/api/catalog/role-types")
      .then((r) => r.json())
      .then((d) => setRoleTypes(d.roleTypes ?? []))
      .catch(() => setError("We couldn't load roles. Please refresh."));
  }, [section.slug]);

  useEffect(() => {
    if (section.slug !== "specializations") return;
    fetch("/api/catalog/specializations")
      .then((r) => r.json())
      .then((d) => setSpecGroups(d.groups ?? []))
      .catch(() => setError("We couldn't load specializations. Please refresh."));
  }, [section.slug]);

  const roleKey = draft.roleTypeIds.join(",");
  useEffect(() => {
    if (section.slug !== "skills" || !roleKey) return;
    fetch(`/api/catalog/skills?roleTypeIds=${encodeURIComponent(roleKey)}`)
      .then((r) => r.json())
      .then((d) => setSkillOpts(d.skills ?? []))
      .catch(() => setError("We couldn't load skills. Please refresh."));
  }, [section.slug, roleKey]);

  /*
    ⚠⚠ BACK TO THE PROFILE, SCROLLED TO THE SECTION. The slug is the anchor, so
    a member who edited Specializations lands looking at Specializations rather
    than at the top of a long page. ⚠ `router.push` then `refresh` so the
    server re-renders with the new value — without the refresh the profile would
    show the value it had when it was last rendered.
  */
  const back = useCallback(() => {
    router.push(`/profile#${section.slug}`);
    router.refresh();
  }, [router, section.slug]);

  /*
    ⚠⚠ THE ONE POST. Both the page's Save button and `CertificationCards`'
    own `onSave` go through it, so the section has a single place that talks to
    `/api/onboarding/provider/step`.
  */
  const postSection = useCallback(
    async (data: Record<string, unknown>): Promise<boolean> => {
      if (!section.step) return true;
      setBusy(true);
      setError(null);
      try {
        const r = await fetch("/api/onboarding/provider/step", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ step: section.step, data }),
        });
        const body = await r.json().catch(() => ({}));
        if (!r.ok) {
          setError(body.error ?? "Could not save.");
          return false;
        }
        return true;
      } catch {
        /* ⚠ A HUMAN SENTENCE, never `err.message` — `E516`'s rule, and the same
           copy the wizard uses for the same failure. */
        setError("Couldn't reach Panameer to save that. Check your connection and try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [section]
  );

  const save = useCallback(async () => {
    /* ⚠ `EmployersStep` COMMITS AS IT GOES (`E411`) — there is nothing to post
       for Work History or Solo Projects, and posting anything would be a second
       save path for rows that are already saved. */
    if (!section.step || !section.payload) {
      back();
      return;
    }
    if (await postSection(section.payload(draft))) back();
  }, [section, draft, back, postSection]);

  const patch = (p: Partial<ProviderDraft>) => setDraft((d) => ({ ...d, ...p }));

  if (!loaded) {
    return <p className="text-[14px] text-ink-2">Loading…</p>;
  }

  let body: React.ReactNode = null;
  let canSave = true;

  switch (section.slug) {
    case "bio":
      /* ⚠ THE SAME FIELD THE REVIEW EDITS IN PLACE. The review keeps its inline
         textarea (`#review-overview`); this is the same control and the same
         `bio` step, not a second bio editor. */
      body = (
        <TextArea
          id="profile-edit-overview"
          rows={8}
          value={draft.overview}
          onChange={(e) => patch({ overview: e.target.value })}
          placeholder="What you do, who you do it for, and what a buyer gets."
        />
      );
      canSave = draft.overview.trim().length > 0;
      break;
    /*
      ── ⚠⚠⚠ THE SIX `E600` WS-F EDITORS ─────────────────────────────────────

      ⚠ Each mounts a component that ALREADY EXISTS and saves through the step
      its field already uses. ⚠⚠ NO NEW EDITORS AND NO SECOND SAVE PATH (`E595`)
      — `TitleEditor` and `ContactEditor` were extracted by `E597` WS-B and were
      unused by this route until now; `PhotoUpload` and
      `EducationLanguagesEditor` are the wizard's own.
    */
    case "title":
      body = (
        <TitleEditor
          value={draft.headline}
          onChange={(next) => patch({ headline: next })}
        />
      );
      canSave = titleCanSave(draft.headline);
      break;
    case "contact":
      /* ⚠⚠ ONE EDITOR, TWO SCORE LINES — `identity` (address + phone) and
         `location` (the address's city/state/country). One address, one save. */
      body = (
        <ContactEditor
          address={
            draft.address ?? { country: "", line1: "", line2: "", city: "", state: "", postalCode: "" }
          }
          onAddressChange={(p2) =>
            patch({
              address: {
                ...(draft.address ?? {
                  country: "", line1: "", line2: "", city: "", state: "", postalCode: "",
                }),
                ...p2,
              },
            })
          }
          phone={draft.phone ?? ""}
          onPhoneChange={(next) => patch({ phone: next })}
          /* ⚠ NULLABLE ON PURPOSE (`E126`): `PhoneField` refuses to validate
             against a country it has not been told. */
          phoneCountry={draft.address?.country || null}
          onPhoneCountryChange={(next) =>
            patch({
              address: {
                ...(draft.address ?? {
                  country: "", line1: "", line2: "", city: "", state: "", postalCode: "",
                }),
                country: next ?? "",
              },
            })
          }
        />
      );
      /* ⚠ THE ADDRESS IS THE SCORED FACT. A phone with no address answers
         neither line, and the server's `finish` case persists both. */
      canSave = Boolean(draft.address?.country?.trim());
      break;
    case "photo":
      /* ⚠⚠⚠ `PhotoUpload` TALKS TO `POST /api/profile/photo` ITSELF and hands
         back a URL once the server confirms. This step then persists that URL
         onto the profile — the same two-step shape the wizard uses, not a
         second save path. */
      body = (
        <PhotoUpload
          firstName={draft.firstName}
          lastName={draft.lastName}
          photoUrl={draft.photoUrl}
          onChange={(next) => patch({ photoUrl: next })}
          size={120}
        />
      );
      /* ⚠ A PHOTO CAN BE CLEARED BACK TO INITIALS, so `null` is a legitimate
         save — the gate is that the step can run, not that a photo exists. */
      canSave = true;
      break;
    case "languages":
      /* ⚠ `EducationLanguagesEditor` OWNS BOTH LISTS and this section edits only
         the languages half — `education` is passed straight back unchanged, so
         nothing this editor touches can write the other list. */
      body = (
        <EducationLanguagesEditor
          /* ⚠ CAST, AND DELIBERATELY SO. `EducationCards` and
             `EducationLanguagesEditor` each declare their own `EducationDraft`;
             this section never touches education — `onEducation` is a no-op and
             the payload carries only `languages` — so the list is passed
             straight through. ⚠⚠ UNIFYING THE TWO TYPES IS A REAL TIDY-UP WITH
             ITS OWN BLAST RADIUS and is not this brief. */
          education={draft.education as never}
          /*
            ⚠⚠ TWO `LanguageDraft` SHAPES, AND THE DIFFERENCE IS HISTORICAL.
            `onboarding-draft.ts` has `{ name, level }`; the editor's has
            `{ name, proficiency, level? }`, whose own comment records that
            `level` is canonical since `E016` and `proficiency` is *"the
            pre-brief_P free text"*.
            ⚠⚠⚠ SO `level` IS THE FIELD THAT MATTERS and it is carried both
            ways; `proficiency` is filled from it on the way in and dropped on
            the way out. ⚠ Unifying the two types is a real tidy-up with its own
            blast radius and is not this brief.
          */
          languages={draft.languages.map((l) => ({
            name: l.name,
            proficiency: l.level ?? null,
            level: l.level,
          }))}
          /* ⚠ THE EDUCATION HALF IS HIDDEN — this section saves languages only,
             and an `+ Add Education` button here would add a row nothing saves. */
          showEducation={false}
          onEducation={() => {}}
          onLanguages={(next) =>
            patch({
              languages: next.map((l) => ({
                name: l.name,
                level: l.level ?? l.proficiency ?? null,
              })),
            })
          }
        />
      );
      canSave = draft.languages.some((l) => l.name.trim() !== "");
      break;
    case "role":
      /*
        ⚠⚠ MULTIPLE ROLES, NOT ONE (`WS2` / `E172`, `E173`). A techno-functional
        consultant genuinely works as both, and forcing one meant the skills
        step could only ever offer half their catalog.
        ⚠⚠⚠ `roleTypeId` IS KEPT IN STEP WITH THE LIST — the server's `category`
        case reads both, and leaving the single id stale would make the primary
        role disagree with the set. The wizard does the same.
      */
      body = (
        <div className="flex flex-col gap-2">
          {roleTypes.length === 0 ? (
            <p className="text-[13.5px] text-ink-2">Loading roles…</p>
          ) : (
            roleTypes.map((r) => {
              const on = draft.roleTypeIds.includes(r.id);
              return (
                <button
                  key={r.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on
                      ? draft.roleTypeIds.filter((x) => x !== r.id)
                      : [...draft.roleTypeIds, r.id];
                    patch({ roleTypeIds: next, roleTypeId: next[0] ?? null });
                  }}
                  className={
                    "rounded-[12px] border px-4 py-3 text-left text-[14px] font-semibold transition-colors " +
                    (on ? "border-magenta bg-magenta/[0.06] text-magenta-dark" : "border-line hover:border-magenta/40")
                  }
                >
                  {r.display || r.name}
                </button>
              );
            })
          )}
        </div>
      );
      /* ⚠ AT LEAST ONE — the same floor the wizard's Continue enforces. */
      canSave = draft.roleTypeIds.length > 0;
      break;
    case "work-method":
      /*
        ⚠⚠⚠ `RECRUITER` IS NOT JUST A LABEL. The server's `work_method` case
        grants the COORDINATOR actor flag on it and `RECRUITER_STEPS` forks the
        wizard — so this is a real capability change made from a small screen.
        ⚠ The options come from `WORK_METHOD_OPTIONS`, the wizard's own list,
        shared rather than copied.
      */
      body = (
        <div className="flex flex-col gap-2">
          {WORK_METHOD_OPTIONS.map((o) => {
            const on = draft.workMethod === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={on}
                onClick={() => patch({ workMethod: o.value })}
                className={
                  "rounded-[12px] border px-4 py-3 text-left transition-colors " +
                  (on ? "border-magenta bg-magenta/[0.06]" : "border-line hover:border-magenta/40")
                }
              >
                <span className="block text-[14px] font-bold">{o.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-ink-2">
                  {o.description}
                </span>
              </button>
            );
          })}
        </div>
      );
      canSave = Boolean(draft.workMethod);
      break;
    case "rates":
      body = (
        <RateEditor
          hourlyRateCents={draft.hourlyRateCents}
          onChange={(hourlyRateCents) => patch({ hourlyRateCents })}
          serviceFeeBps={draft.serviceFeeBps}
          breakdown={rateBreakdown(draft.hourlyRateCents, draft.serviceFeeBps)}
        />
      );
      canSave = rateCanSave(draft.hourlyRateCents);
      break;
    case "skills":
      body = (
        <SkillsEditor
          selectedIds={draft.skillIds}
          selectedNames={draft.skillNames}
          customs={draft.customSkills}
          resumeSkillIds={draft.resumeSkillIds}
          skillOpts={skillOpts}
          query={skillQuery}
          onQueryChange={setSkillQuery}
          match={skillMatch}
          onMatchChange={setSkillMatch}
          /* ⚠ `E517`'s shown/held split is the WIZARD's one rule; this page has
             no role picker, so everything held is shown here. */
          shownSkillNames={draft.skillNames}
          heldNotShownSkillNames={[]}
          maxSuggestions={12}
          onChange={(p) => patch(p)}
          onRemoveCustom={(name) =>
            patch({ customSkills: draft.customSkills.filter((c) => c !== name) })
          }
          scrollRegionClass="overflow-y-auto overscroll-contain rounded-[12px] border border-line/70 bg-bg-soft/40 p-3"
          pickedRegionClass="max-h-[132px] overflow-y-auto overscroll-contain pr-1"
          error={error}
          heldNotShownHeading="Not on your profile right now"
          heldNotShownExplanation="These are still yours — your current roles just don't put them in front of buyers."
        />
      );
      canSave = draft.skillIds.length + draft.customSkills.length > 0;
      break;
    case "specializations":
      body = (
        <SpecializationsEditor
          groups0={specGroups}
          selectedIds={draft.specializationIds}
          selectedNames={draft.specializationNames}
          customs={draft.customSpecializations}
          query={specQuery}
          onQueryChange={setSpecQuery}
          openTier={openSpecTier}
          onOpenTierChange={setOpenSpecTier}
          onChange={(p) => patch(p)}
          onRemoveCustom={(name) =>
            patch({
              customSpecializations: draft.customSpecializations.filter((c) => c !== name),
            })
          }
          error={error}
          maxPerGroup={6}
          pickedRegionClass="max-h-[132px] overflow-y-auto overscroll-contain pr-1"
          maxPerTier={24}
          scrollRegionClass="overflow-y-auto overscroll-contain rounded-[12px] border border-line/70 bg-bg-soft/40 p-3"
        />
      );
      break;
    case "certifications":
      body = (
        /*
          ⚠⚠ `CertificationCards` SAVES ITSELF. Its contract is
          `onSave: (next) => Promise<boolean>` — it commits each card and reads
          the answer, which is why it has no `onChange`. ⚠ So the handler posts
          the SAME `certifications` step through the SAME endpoint, and the
          page's own Save button becomes `Done`: there is nothing left to post.
        */
        <CertificationCards
          items={draft.certifications}
          busy={busy}
          onSave={async (certifications) => {
            patch({ certifications });
            return postSection({ certifications });
          }}
        />
      );
      break;
    case "education":
      body = (
        <EducationCards
          items={draft.education}
          onChange={(education) => patch({ education })}
        />
      );
      break;
    case "work-history":
    case "solo-projects":
      body = (
        <EmployersStep
          employers={draft.employers}
          projects={draft.projects}
          onChanged={(employers) => patch({ employers })}
          onError={setError}
        />
      );
      break;
  }

  return (
    <div className="space-y-5">
      {error && <Notice tone="error">{error}</Notice>}
      {body}
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-5">
        {/* ⚠⚠ `Done`, NOT `Save`, FOR THE TWO THAT COMMIT AS THEY GO. A Save
            button on a surface that has already saved is a promise about what
            the click does that is not true. */}
        <button
          type="button"
          onClick={save}
          disabled={busy || !canSave}
          className="rounded-full bg-magenta px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : section.step ? "Save" : "Done"}
        </button>
        <button
          type="button"
          onClick={back}
          className="rounded-full border border-line px-6 py-2.5 text-[14px] font-semibold text-ink-2 transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
