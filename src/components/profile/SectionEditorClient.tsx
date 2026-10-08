"use client";

import { roleLong } from "@/lib/role-labels";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Notice, TextArea } from "@/components/onboarding/controls";
import { EmployersStep } from "@/components/onboarding/EmployersStep";
import { EducationCards } from "@/components/onboarding/EducationCards";
import { CertificationCards } from "@/components/onboarding/CertificationCards";
import { RateEditor, rateCanSave, syncedHourly } from "@/components/onboarding/editors/RateEditor";
import { TitleEditor, titleCanSave } from "@/components/onboarding/editors/TitleEditor";
import { ContactEditor } from "@/components/onboarding/editors/ContactEditor";
import { WORK_METHOD_OPTIONS } from "@/lib/onboarding-draft";
import { PhotoUpload } from "@/components/PhotoUpload";
import { EducationLanguagesEditor } from "@/components/onboarding/EducationLanguagesEditor";
import { SkillsEditor } from "@/components/onboarding/editors/SkillsEditor";
import { SpecializationsEditor } from "@/components/onboarding/editors/SpecializationsEditor";
import { KeywordsEditor } from "@/components/profile/KeywordsEditor";
import {
  draftFromStatus,
  emptyDraft,
  type ProviderDraft,
  type StatusPayload,
} from "@/lib/onboarding-draft";
import { rateBreakdown } from "@/lib/display";
import { sectionFor, type SectionSlug } from "@/lib/profile-sections";

export function SectionEditorClient({ slug }: { slug: SectionSlug }) {
  const section = sectionFor(slug)!;
  const router = useRouter();
  const [draft, setDraft] = useState<ProviderDraft>(emptyDraft());
  const [roleTypes, setRoleTypes] = useState<
    { id: string; name: string; display: string }[]
  >([]);
  const [certSignal, setCertSignal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // BACK TO THE PROFILE, SCROLLED TO THE SECTION. The slug is the anchor, so
  const back = useCallback(() => {
    router.push(`/profile#${section.slug}`);
    router.refresh();
  }, [router, section.slug]);

  // THE ONE POST. Both the page's Save button and `CertificationCards`'
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
        // A HUMAN SENTENCE, never `err.message` — 's rule, and the same
        setError("Couldn't reach Panameer to save that. Check your connection and try again.");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [section]
  );

  const save = useCallback(async () => {
    // for Work History or Solo Projects, and posting anything would be a second
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
      // THE SAME FIELD THE REVIEW EDITS IN PLACE. The review keeps its inline
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
    // THE SIX WS-F EDITORS
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
      // ONE EDITOR, TWO SCORE LINES — `identity` (address + phone) and
      body = (
        <ContactEditor
          address={
            draft.address ?? { country: "", line1: "", line2: "", city: "", state: "", postalCode: "" }
          }
          onAddressChange={(p2) =>
            // Functional merge: autofill sends several fields in one tick.
            setDraft((d) => ({
              ...d,
              address: {
                ...(d.address ?? { country: "", line1: "", line2: "", city: "", state: "", postalCode: "" }),
                ...p2,
              },
            }))
          }
          phone={draft.phone ?? ""}
          onPhoneChange={(next) => patch({ phone: next })}
          // NULLABLE ON PURPOSE : `PhoneField` refuses to validate
          phoneCountry={draft.address?.country || null}
          onPhoneCountryChange={(next) =>
            setDraft((d) => ({
              ...d,
              address: {
                ...(d.address ?? { country: "", line1: "", line2: "", city: "", state: "", postalCode: "" }),
                country: next ?? "",
              },
            }))
          }
        />
      );
      // THE ADDRESS IS THE SCORED FACT. A phone with no address answers
      canSave = Boolean(draft.address?.country?.trim());
      break;
    case "photo":
      // back a URL once the server confirms. This step then persists that URL
      body = (
        <PhotoUpload
          firstName={draft.firstName}
          lastName={draft.lastName}
          photoUrl={draft.photoUrl}
          onChange={(next) => patch({ photoUrl: next })}
          size={120}
        />
      );
      // A PHOTO CAN BE CLEARED BACK TO INITIALS, so `null` is a legitimate
      canSave = true;
      break;
    case "languages":
      // the languages half — `education` is passed straight back unchanged, so
      body = (
        <EducationLanguagesEditor
          // CAST, AND DELIBERATELY SO. `EducationCards` and
          education={draft.education as never}
          // TWO `LanguageDraft` SHAPES, AND THE DIFFERENCE IS HISTORICAL.
          // editor's picklist reads and writes `level` alone.
          languages={draft.languages.map((l) => ({
            name: l.name,
            proficiency: null,
            level: l.level,
          }))}
          // THE EDUCATION HALF IS HIDDEN — this section saves languages only
          showEducation={false}
          onEducation={() => {}}
          onLanguages={(next) =>
            patch({
              // THE BUG SCOTT FOUND, AT ITS SOURCE item 11)
              languages: next.map((l) => ({
                name: l.name,
                level: l.level && l.level !== "" ? l.level : null,
              })),
            })
          }
        />
      );
      // BOTH FIELDS, AND AT LEAST ONE ROW ( items 10 + 12). Scott: proficiency is
      canSave =
        draft.languages.length > 0 &&
        draft.languages.every((l) => l.name.trim() !== "" && !!l.level && l.level !== "");
      break;
    case "role":
      // MULTIPLE ROLES, NOT ONE (`WS2` / , ). A techno-functional
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
                    "border px-4 py-3 text-left text-[14px] font-semibold transition-colors " +
                    (on ? "border-magenta bg-magenta/[0.06] text-magenta-dark" : "border-line hover:border-magenta/40")
                  }
                >
                  {roleLong(r.display || r.name)}
                </button>
              );
            })
          )}
        </div>
      );
      /* AT LEAST ONE — the same floor the wizard's Continue enforces. */
      canSave = draft.roleTypeIds.length > 0;
      break;
    case "work-method":
      // grants the COORDINATOR actor flag on it and `RECRUITER_STEPS` forks the
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
                  "border px-4 py-3 text-left transition-colors " +
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
          onsiteRateCents={draft.onsiteRateCents ?? null}
          remoteRateCents={draft.remoteRateCents ?? null}
          onOnsiteChange={(onsiteRateCents) =>
            patch({ onsiteRateCents, hourlyRateCents: syncedHourly(onsiteRateCents, draft.remoteRateCents) })
          }
          onRemoteChange={(remoteRateCents) =>
            patch({ remoteRateCents, hourlyRateCents: syncedHourly(draft.onsiteRateCents, remoteRateCents) })
          }
        />
      );
      canSave = rateCanSave(draft.onsiteRateCents, draft.remoteRateCents);
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
          // no role picker, so everything held is shown here.
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
    case "keywords":
      body = <KeywordsEditor />;
      break;
    case "certifications":
      body = (
        // the answer, which is why it has no `onChange`. So the handler posts
        <div className="space-y-3">
          {/* Title Case on the label (rule 11), and the `+` is the same */}
          <button
            type="button"
            onClick={() => setCertSignal((n) => n + 1)}
            className="text-[13.5px] font-bold text-magenta hover:underline"
          >
            + Add Credential
          </button>
          <CertificationCards
            items={draft.certifications}
            busy={busy}
            openSignal={certSignal}
            onSave={async (certifications) => {
              patch({ certifications });
              return postSection({ certifications });
            }}
          />
        </div>
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
        {/* button on a surface that has already saved is a promise about what */}
        <button
          type="button"
          onClick={save}
          disabled={busy || !canSave}
          className="bg-magenta px-6 py-2.5 text-[14px] font-bold text-white transition-colors hover:bg-magenta-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Saving…" : section.step ? "Save" : "Done"}
        </button>
        <button
          type="button"
          onClick={back}
          className="border border-line px-6 py-2.5 text-[14px] font-semibold text-ink-2 transition-colors hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
