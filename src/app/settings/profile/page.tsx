"use client";

import { useEffect, useRef, useState } from "react";
import { Section } from "@/components/settings/Section";
import { Badge } from "@/components/Badge";
import { Avatar } from "@/components/Avatar";
import {
  OptionCard,
  Chip,
  Field,
  TextInput,
  TextArea,
} from "@/components/onboarding/controls";
import {
  ExperienceEditor,
  type ExperienceDraft,
} from "@/components/onboarding/ExperienceEditor";
import {
  EducationLanguagesEditor,
  type EducationDraft,
  type LanguageDraft,
} from "@/components/onboarding/EducationLanguagesEditor";
import {
  CertificationsEditor,
  type CertificationDraft,
} from "@/components/onboarding/CertificationsEditor";
import { useSettings, type ProviderSettings } from "@/components/settings/useSettings";

const EXPERIENCE_OPTIONS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "MID_CAREER", label: "Mid-Career" },
  { value: "EXPERT", label: "Expert" },
];
const GOAL_OPTIONS = [
  { value: "MAIN_HUSTLE", label: "Main Work" },
  { value: "SIDE_HUSTLE", label: "Side Hustle" },
  { value: "BUILD_SKILLS", label: "Build Skills & Reputation" },
  { value: "NONE", label: "Just Exploring" },
];
const WORK_TYPE_OPTIONS = [
  { value: "HOURLY", label: "Hourly" },
  { value: "PACKAGES", label: "Fixed Packages" },
  { value: "AGENCY", label: "Through My Agency" },
  { value: "CONTRACT_TO_HIRE", label: "Contract-to-Hire" },
];

type RoleType = { id: string; display: string };
type SkillOpt = { id: string; name: string };
type Region = { id: string; name: string; description: string | null };

const centsToDollars = (c: number | null) => (c == null ? "" : String(c / 100));

export default function SettingsProfilePage() {
  const { settings, loading, notProvider, setSettings } = useSettings();
  const initialized = useRef(false);

  // Editable draft (initialised once so section saves don't wipe other edits).
  const [d, setD] = useState<{
    headline: string;
    overview: string;
    experienceLevel: string;
    goal: string;
    workTypes: string[];
    roleTypeId: string | null;
    skillIds: string[];
    experiences: ExperienceDraft[];
    education: EducationDraft[];
    languages: LanguageDraft[];
    certifications: CertificationDraft[];
    onsiteDollars: string;
    remoteDollars: string;
    regionId: string | null;
  } | null>(null);

  const [paused, setPaused] = useState(false);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [roleTypes, setRoleTypes] = useState<RoleType[]>([]);
  const [skillOpts, setSkillOpts] = useState<SkillOpt[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  useEffect(() => {
    if (settings && !initialized.current) {
      initialized.current = true;
      setPaused(settings.paused);
      setD({
        headline: settings.headline,
        overview: settings.overview,
        experienceLevel: settings.experienceLevel,
        goal: settings.goal,
        workTypes: settings.workTypes,
        roleTypeId: settings.roleTypeId,
        skillIds: settings.skillIds,
        experiences: settings.experiences.map((e) => ({
          ...e,
          description: e.description ?? "",
          projects: e.projects ?? [],
        })),
        education: settings.education,
        languages: settings.languages,
        certifications: settings.certifications,
        onsiteDollars: centsToDollars(settings.onsiteRateCents),
        remoteDollars: centsToDollars(settings.remoteRateCents),
        regionId: settings.regionId,
      });
    }
  }, [settings]);

  useEffect(() => {
    fetch("/api/catalog/role-types")
      .then((r) => r.json())
      .then((x) => setRoleTypes(x.roleTypes ?? []));
    fetch("/api/catalog/regions")
      .then((r) => r.json())
      .then((x) => setRegions(x.regions ?? []));
  }, []);

  useEffect(() => {
    if (!d?.roleTypeId) {
      setSkillOpts([]);
      return;
    }
    fetch(`/api/catalog/skills?roleTypeId=${d.roleTypeId}`)
      .then((r) => r.json())
      .then((x) => setSkillOpts(x.skills ?? []));
  }, [d?.roleTypeId]);

  if (loading) return <p className="text-ink-2">Loading…</p>;
  if (notProvider || !settings || !d)
    return (
      <p className="text-ink-2">
        No provider profile found for your account.
      </p>
    );

  const save = async (section: string, data: unknown) => {
    setSavingKey(section);
    setSavedKey(null);
    setErrors((m) => {
      const n = { ...m };
      delete n[section];
      return n;
    });
    try {
      const r = await fetch("/api/settings/profile/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section, data }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrors((m) => ({ ...m, [section]: body.error ?? "Could not save." }));
        return;
      }
      setSettings(body as ProviderSettings);
      setSavedKey(section);
    } finally {
      setSavingKey(null);
    }
  };

  const togglePause = async () => {
    setSavingKey("pause");
    setErrors((m) => {
      const n = { ...m };
      delete n.pause;
      return n;
    });
    try {
      const r = await fetch("/api/settings/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !paused }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrors((m) => ({ ...m, pause: body.error ?? "Could not update." }));
        return;
      }
      setPaused(body.paused);
      setSettings(body as ProviderSettings);
    } finally {
      setSavingKey(null);
    }
  };

  const requestValidation = async () => {
    setSavingKey("validation");
    setErrors((m) => {
      const n = { ...m };
      delete n.validation;
      return n;
    });
    try {
      const r = await fetch("/api/settings/request-validation", {
        method: "POST",
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setErrors((m) => ({ ...m, validation: body.error ?? "Could not request." }));
        return;
      }
      setSettings(body as ProviderSettings);
    } finally {
      setSavingKey(null);
    }
  };

  const s = (k: string) => ({
    saving: savingKey === k,
    saved: savedKey === k,
    error: errors[k] ?? null,
  });

  const pct = settings.completeness;
  const threshold = settings.visibilityThreshold;
  const isExpert = settings.experienceLevel === "EXPERT";

  return (
    <div className="space-y-6">
      {/* Completeness + visibility */}
      <section className="rounded-brand border border-line p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[18px] font-bold">Profile Completeness</h2>
          <span className="text-[18px] font-extrabold text-magenta">{pct}%</span>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-line">
          <div
            className="h-full bg-magenta transition-[width] duration-500"
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {settings.paused ? (
            <Badge tone="amber">Paused — hidden from buyers</Badge>
          ) : settings.visible ? (
            <Badge tone="green">Live — buyers can find you</Badge>
          ) : (
            <Badge>Not Visible Yet</Badge>
          )}
        </div>

        {pct < threshold ? (
          <p className="mt-4 max-w-2xl text-[14px] leading-relaxed text-ink-2">
            Panameer is a premium marketplace — the best buyers come here for the
            best talent. Reach {threshold}% to become visible to service buyers.
            The stronger our profiles, the better the buyers we attract — and the
            better the work that finds you.
          </p>
        ) : (
          <p className="mt-4 text-[14px] text-ink-2">
            You&apos;re at {pct}% — over the {threshold}% bar. Keep it fresh; you
            can pause anytime below.
          </p>
        )}
      </section>

      {/* Pause my profile */}
      <Section
        title="Pause My Profile"
        description="Temporarily hide your profile from the marketplace. This is a pause, not a delete — unpause anytime and your profile returns exactly as it was."
        onSave={togglePause}
        saving={savingKey === "pause"}
        saveLabel={paused ? "Unpause My Profile" : "Pause My Profile"}
        error={errors.pause ?? null}
      >
        <p className="text-[14px] text-ink-2">
          {paused
            ? "Your profile is currently paused and hidden from buyers."
            : "Your profile is active. Pausing hides it regardless of completeness."}
        </p>
      </Section>

      {/* Request Validation */}
      <section className="rounded-brand border border-line p-6">
        <div className="flex items-center gap-3">
          <h2 className="text-[18px] font-bold">Validation</h2>
          {settings.validationStatus === "VALIDATED" && (
            <Badge tone="green">✓ Validated</Badge>
          )}
          {settings.validationStatus === "REQUESTED" && (
            <Badge tone="amber">Under review</Badge>
          )}
        </div>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-2">
          Validation is our merit badge for top experts. Validated providers get
          seen by buyers on the Premium plan. It&apos;s granted on merit by our
          team — never purchased.
        </p>

        {settings.validationStatus === "VALIDATED" && (
          <p className="mt-3 text-[14px] font-semibold text-emerald-600">
            You&apos;re Validated — the badge shows on your public profile.
          </p>
        )}
        {settings.validationStatus === "REQUESTED" && (
          <p className="mt-3 text-[14px] text-ink-2">
            Validation requested — under review. We&apos;ll let you know.
          </p>
        )}
        {(settings.validationStatus === "NOT_REQUESTED" ||
          settings.validationStatus === "REJECTED") && (
          <div className="mt-4">
            {settings.validationStatus === "REJECTED" && (
              <p className="mb-3 text-[14px] text-ink-2">
                Not validated yet. Validation favors Expert-level providers with a
                strong, complete profile — strengthen yours and request again.
              </p>
            )}
            {errors.validation && (
              <p className="mb-2 text-[14px] text-red-600">{errors.validation}</p>
            )}
            <button
              onClick={requestValidation}
              disabled={savingKey === "validation"}
              className={
                "rounded-full px-6 py-2.5 font-bold transition-colors disabled:opacity-50 " +
                (isExpert
                  ? "bg-magenta text-white hover:bg-magenta-dark"
                  : "border-[1.5px] border-line text-ink hover:border-[#d9d4e2]")
              }
            >
              {savingKey === "validation" ? "Requesting…" : "Request Validation"}
            </button>
            {!isExpert && (
              <p className="mt-2 text-[13px] text-ink-2">
                Validation is aimed at Expert-level providers, but you&apos;re
                welcome to request — our team decides.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Headline */}
      <Section
        title="Headline"
        onSave={() => save("title", { headline: d.headline })}
        saveDisabled={!d.headline.trim()}
        {...s("title")}
      >
        <Field label="Professional Title">
          <TextInput
            value={d.headline}
            onChange={(e) => setD({ ...d, headline: e.target.value })}
          />
        </Field>
      </Section>

      {/* Overview */}
      <Section
        title="Overview"
        onSave={() => save("bio", { overview: d.overview })}
        saveDisabled={!d.overview.trim()}
        {...s("bio")}
      >
        <Field label="Bio">
          <TextArea
            value={d.overview}
            onChange={(e) => setD({ ...d, overview: e.target.value })}
          />
        </Field>
      </Section>

      {/* Experience level & goal */}
      <Section
        title="Experience & Goal"
        onSave={async () => {
          await save("experience_level", { experienceLevel: d.experienceLevel });
          await save("goal", { goal: d.goal });
        }}
        {...s("goal")}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[14px] font-bold">Experience Level</p>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  selected={d.experienceLevel === o.value}
                  onClick={() => setD({ ...d, experienceLevel: o.value })}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[14px] font-bold">Goal</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((o) => (
                <Chip
                  key={o.value}
                  selected={d.goal === o.value}
                  onClick={() => setD({ ...d, goal: o.value })}
                >
                  {o.label}
                </Chip>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* Work types */}
      <Section
        title="Work Types"
        onSave={() => save("work_type", { workTypes: d.workTypes })}
        saveDisabled={d.workTypes.length === 0}
        {...s("work_type")}
      >
        <div className="flex flex-wrap gap-2">
          {WORK_TYPE_OPTIONS.map((w) => {
            const on = d.workTypes.includes(w.value);
            return (
              <Chip
                key={w.value}
                selected={on}
                onClick={() =>
                  setD({
                    ...d,
                    workTypes: on
                      ? d.workTypes.filter((x) => x !== w.value)
                      : [...d.workTypes, w.value],
                  })
                }
              >
                {w.label}
              </Chip>
            );
          })}
        </div>
      </Section>

      {/* Skills (one main category enforced server-side) */}
      <Section
        title="Skills"
        description="Pick one main category, then the skills you offer within it."
        onSave={() =>
          save("skills", { roleTypeId: d.roleTypeId, skillIds: d.skillIds })
        }
        saveDisabled={!d.roleTypeId || d.skillIds.length === 0}
        {...s("skills")}
      >
        <div className="space-y-5">
          <div>
            <p className="mb-2 text-[14px] font-bold">Main Category (Pick One)</p>
            <div className="flex flex-wrap gap-2">
              {roleTypes.map((rt) => (
                <Chip
                  key={rt.id}
                  selected={d.roleTypeId === rt.id}
                  onClick={() =>
                    setD({
                      ...d,
                      roleTypeId: rt.id,
                      skillIds: d.roleTypeId === rt.id ? d.skillIds : [],
                    })
                  }
                >
                  {rt.display}
                </Chip>
              ))}
            </div>
          </div>
          {d.roleTypeId && (
            <div>
              <p className="mb-2 text-[14px] font-bold">
                Skills ({d.skillIds.length} selected)
              </p>
              <div className="flex flex-wrap gap-2">
                {skillOpts.map((sk) => {
                  const on = d.skillIds.includes(sk.id);
                  return (
                    <Chip
                      key={sk.id}
                      selected={on}
                      onClick={() =>
                        setD({
                          ...d,
                          skillIds: on
                            ? d.skillIds.filter((x) => x !== sk.id)
                            : [...d.skillIds, sk.id],
                        })
                      }
                    >
                      {sk.name}
                    </Chip>
                  );
                })}
                {skillOpts.length === 0 && (
                  <p className="text-[14px] text-ink-2">Loading skills…</p>
                )}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Work experience */}
      <Section
        title="Work Experience"
        onSave={() => save("experience", { experiences: d.experiences })}
        {...s("experience")}
      >
        <ExperienceEditor
          value={d.experiences}
          onChange={(experiences) => setD({ ...d, experiences })}
        />
      </Section>

      {/* Education & languages */}
      <Section
        title="Education & Languages"
        onSave={() =>
          save("education_languages", {
            education: d.education,
            languages: d.languages,
          })
        }
        {...s("education_languages")}
      >
        <EducationLanguagesEditor
          education={d.education}
          languages={d.languages}
          onEducation={(education) => setD({ ...d, education })}
          onLanguages={(languages) => setD({ ...d, languages })}
        />
      </Section>

      {/* Certifications */}
      <Section
        title="Certifications"
        onSave={() => save("certifications", { certifications: d.certifications })}
        {...s("certifications")}
      >
        <CertificationsEditor
          value={d.certifications}
          onChange={(certifications) => setD({ ...d, certifications })}
        />
      </Section>

      {/* Rates */}
      <Section
        title="Rates"
        onSave={() =>
          save("rate", {
            onsiteDollars: d.onsiteDollars || null,
            remoteDollars: d.remoteDollars || null,
          })
        }
        saveDisabled={!d.onsiteDollars && !d.remoteDollars}
        {...s("rate")}
      >
        <div className="grid max-w-md gap-4 sm:grid-cols-2">
          <Field label="Remote Rate (USD/hr)">
            <TextInput
              type="number"
              min="0"
              value={d.remoteDollars}
              onChange={(e) => setD({ ...d, remoteDollars: e.target.value })}
            />
          </Field>
          <Field label="Onsite Rate (USD/hr)">
            <TextInput
              type="number"
              min="0"
              value={d.onsiteDollars}
              onChange={(e) => setD({ ...d, onsiteDollars: e.target.value })}
            />
          </Field>
        </div>
      </Section>

      {/* Region */}
      <Section
        title="Region"
        onSave={() => save("region", { regionId: d.regionId })}
        saveDisabled={!d.regionId}
        {...s("region")}
      >
        <div className="space-y-3">
          {regions.map((r) => (
            <OptionCard
              key={r.id}
              selected={d.regionId === r.id}
              onClick={() => setD({ ...d, regionId: r.id })}
              title={r.name}
              description={r.description ?? undefined}
            />
          ))}
        </div>
      </Section>

      {/* Photo (initials placeholder; upload later) */}
      <Section title="Photo">
        <div className="flex items-center gap-4">
          <Avatar
            firstName={settings.firstName}
            lastName={settings.lastName}
            photoUrl={settings.photoUrl}
            size={72}
          />
          <p className="text-[14px] text-ink-2">
            {/* TODO(brief_H): real photo upload out of scope; initials only. */}
            We use your initials until photo upload ships.
          </p>
        </div>
      </Section>
    </div>
  );
}
