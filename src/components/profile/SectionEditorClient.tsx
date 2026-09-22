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
