"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import {
  OptionCard,
  Chip,
  Field,
  TextInput,
  TextArea,
  Notice,
} from "@/components/onboarding/controls";
import {
  ExperienceEditor,
  emptyExperience,
  type ExperienceDraft,
} from "@/components/onboarding/ExperienceEditor";
import {
  EducationLanguagesEditor,
  type EducationDraft,
  type LanguageDraft,
} from "@/components/onboarding/EducationLanguagesEditor";
import { Avatar } from "@/components/Avatar";

// Screen order. The profile screens share names with the lib's ProviderStep so
// each Continue posts { step: <screen> }.
const SCREENS = [
  "exp_level",
  "goal",
  "account",
  "verify",
  "work_type",
  "skills",
  "title",
  "experience",
  "education_languages",
  "bio",
  "rate",
  "region",
  "photo",
  "review",
] as const;
type Screen = (typeof SCREENS)[number];

const EXPERIENCE_OPTIONS = [
  { value: "BEGINNER", title: "Beginner", description: "New to consulting or early in my journey." },
  { value: "MID_CAREER", title: "Mid-career", description: "Several years delivering real engagements." },
  { value: "EXPERT", title: "Expert", description: "Seasoned specialist others rely on." },
];
const GOAL_OPTIONS = [
  { value: "MAIN_HUSTLE", title: "This is my main work", description: "I want Panameer to be my primary source of engagements." },
  { value: "SIDE_HUSTLE", title: "A side hustle", description: "Extra work alongside a main job." },
  { value: "BUILD_SKILLS", title: "Build my skills & reputation", description: "Grow experience and a track record." },
  { value: "NONE", title: "Just exploring", description: "Seeing what's here for now." },
];
const WORK_TYPE_OPTIONS = [
  { value: "HOURLY", label: "Hourly" },
  { value: "PACKAGES", label: "Fixed packages" },
  { value: "AGENCY", label: "Through my agency" },
  { value: "CONTRACT_TO_HIRE", label: "Contract-to-hire" },
];

type RoleType = { id: string; code: string; display: string };
type SkillOpt = { id: string; name: string; image_url: string | null; pillar: { name: string } | null };
type Region = { id: string; name: string; description: string | null };

type ProfileState = {
  workTypes: string[];
  roleTypeId: string | null;
  skillIds: string[];
  headline: string;
  experiences: ExperienceDraft[];
  education: EducationDraft[];
  languages: LanguageDraft[];
  overview: string;
  onsiteDollars: string;
  remoteDollars: string;
  currency: string;
  regionId: string | null;
  photoUrl: string | null;
  firstName: string;
  lastName: string;
};

const emptyProfile = (): ProfileState => ({
  workTypes: [],
  roleTypeId: null,
  skillIds: [],
  headline: "",
  experiences: [],
  education: [],
  languages: [],
  overview: "",
  onsiteDollars: "",
  remoteDollars: "",
  currency: "USD",
  regionId: null,
  photoUrl: null,
  firstName: "",
  lastName: "",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function centsToDollars(c: any): string {
  return c == null ? "" : String(c / 100);
}

export default function JoinPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("exp_level");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notProvider, setNotProvider] = useState(false);

  // Pre-account answers (held in client state until Step 3 persists them).
  const [expLevel, setExpLevel] = useState<string | null>(null);
  const [goal, setGoal] = useState<string | null>(null);

  // Account form.
  const [acct, setAcct] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirm: "",
  });

  // Verify gate.
  const [email, setEmail] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");

  // Profile.
  const [profile, setProfile] = useState<ProfileState>(emptyProfile());
  const [roleTypes, setRoleTypes] = useState<RoleType[]>([]);
  const [skillOpts, setSkillOpts] = useState<SkillOpt[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  const idx = SCREENS.indexOf(screen);
  const progress = idx / (SCREENS.length - 1);

  // ---- hydrate from server state ----------------------------------------
  const hydrateProfile = useCallback((p: Record<string, unknown>) => {
    setProfile({
      workTypes: (p.workTypes as string[]) ?? [],
      roleTypeId: (p.roleTypeId as string) ?? null,
      skillIds: (p.skillIds as string[]) ?? [],
      headline: (p.headline as string) ?? "",
      experiences: ((p.experiences as ExperienceDraft[]) ?? []).map((e) => ({
        ...e,
        description: e.description ?? "",
        projects: e.projects ?? [],
      })),
      education: (p.education as EducationDraft[]) ?? [],
      languages: (p.languages as LanguageDraft[]) ?? [],
      overview: (p.overview as string) ?? "",
      onsiteDollars: centsToDollars(p.onsiteRateCents),
      remoteDollars: centsToDollars(p.remoteRateCents),
      currency: (p.currency as string) ?? "USD",
      regionId: (p.regionId as string) ?? null,
      photoUrl: (p.photoUrl as string) ?? null,
      firstName: (p.firstName as string) ?? "",
      lastName: (p.lastName as string) ?? "",
    });
  }, []);

  // ---- mount: figure out where to land ----------------------------------
  useEffect(() => {
    (async () => {
      const r = await fetch("/api/onboarding/status");
      if (r.status === 401) {
        setScreen("exp_level");
      } else if (r.status === 404) {
        setNotProvider(true);
      } else if (r.ok) {
        const s = await r.json();
        setEmail(s.email);
        if (!s.emailVerified) {
          setScreen("verify");
        } else {
          hydrateProfile(s.profile);
          setScreen(s.resumeStep as Screen);
        }
      }
      setReady(true);
    })();
  }, [hydrateProfile]);

  // ---- verify gate polling ----------------------------------------------
  useEffect(() => {
    if (screen !== "verify") return;
    const check = async () => {
      const r = await fetch("/api/onboarding/status");
      if (!r.ok) return;
      const s = await r.json();
      if (s.emailVerified) {
        hydrateProfile(s.profile);
        setScreen((s.resumeStep as Screen) ?? "work_type");
      }
    };
    const t = setInterval(check, 4000);
    return () => clearInterval(t);
  }, [screen, hydrateProfile]);

  // ---- reference data ---------------------------------------------------
  useEffect(() => {
    if (screen === "skills" && roleTypes.length === 0) {
      fetch("/api/catalog/role-types")
        .then((r) => r.json())
        .then((d) => setRoleTypes(d.roleTypes ?? []));
    }
    if (screen === "region" && regions.length === 0) {
      fetch("/api/catalog/regions")
        .then((r) => r.json())
        .then((d) => setRegions(d.regions ?? []));
    }
  }, [screen, roleTypes.length, regions.length]);

  useEffect(() => {
    if (!profile.roleTypeId) {
      setSkillOpts([]);
      return;
    }
    fetch(`/api/catalog/skills?roleTypeId=${profile.roleTypeId}`)
      .then((r) => r.json())
      .then((d) => setSkillOpts(d.skills ?? []));
  }, [profile.roleTypeId]);

  // ---- navigation helpers ----------------------------------------------
  const goNext = () => setScreen(SCREENS[Math.min(SCREENS.length - 1, idx + 1)]);
  const goto = (s: Screen) => setScreen(s);

  const canBack = !["exp_level", "verify", "work_type"].includes(screen);
  const goBack = () => {
    if (!canBack) return;
    setError(null);
    // Never step back across the verify gate.
    const prev = SCREENS[idx - 1];
    setScreen(prev === "verify" ? "work_type" : prev);
  };

  // ---- save a profile step, then advance --------------------------------
  const postStep = async (step: Screen, data: unknown) => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/onboarding/provider/step", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, data }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not save.");
        return false;
      }
      if (body.profile) hydrateProfile(body.profile);
      return true;
    } finally {
      setBusy(false);
    }
  };

  // ---- account creation -------------------------------------------------
  const createAccount = async () => {
    setError(null);
    if (acct.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (acct.password !== acct.confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch("/api/onboarding/provider/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...acct,
          experienceLevel: expLevel,
          goal,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not create account.");
        return;
      }
      // Sign in with the same credentials so the session cookie is set.
      const signInRes = await signIn("credentials", {
        email: acct.email,
        password: acct.password,
        redirect: false,
      });
      if (signInRes?.error) {
        setError("Account created, but sign-in failed. Please log in.");
        return;
      }
      setEmail(body.email);
      if (body.devLink) setDevLink(body.devLink);
      setScreen("verify");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setResendMsg(null);
    const r = await fetch("/api/onboarding/resend-verification", { method: "POST" });
    const body = await r.json().catch(() => ({}));
    if (r.status === 429) {
      setResendMsg("Please wait a moment before requesting another email.");
    } else if (r.ok) {
      if (body.devLink) setDevLink(body.devLink);
      setResendMsg("Sent! Check your inbox.");
    } else {
      setResendMsg("Could not resend right now.");
    }
  };

  const saveNewEmail = async () => {
    setError(null);
    const r = await fetch("/api/onboarding/update-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail }),
    });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) {
      setError(body.error ?? "Could not update email.");
      return;
    }
    setEmail(body.email);
    if (body.devLink) setDevLink(body.devLink);
    setEditingEmail(false);
    setResendMsg("Verification sent to your new address.");
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/onboarding/provider/submit", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not submit.");
        return;
      }
      router.push("/dashboard");
    } finally {
      setBusy(false);
    }
  };

  // ----------------------------------------------------------------------
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-body text-ink-2">
        Loading…
      </div>
    );
  }

  if (notProvider) {
    return (
      <div className="grid min-h-screen place-items-center bg-white px-6 text-center font-body text-ink">
        <div>
          <h1 className="text-2xl font-extrabold">You&apos;re already signed in</h1>
          <p className="mt-2 text-ink-2">
            This account isn&apos;t a provider profile.
          </p>
          <a href="/dashboard" className="mt-4 inline-block font-bold text-magenta">
            Go to dashboard →
          </a>
        </div>
      </div>
    );
  }

  const shell = (
    props: Partial<React.ComponentProps<typeof WizardShell>> & { title: string }
  ) => ({
    progress,
    onBack: canBack ? goBack : undefined,
    canBack,
    busy,
    ...props,
  });

  // ---- render per screen ------------------------------------------------
  switch (screen) {
    case "exp_level":
      return (
        <WizardShell
          {...shell({
            title: "What's your experience level?",
            subtitle: "This helps us match you to the right work.",
            onContinue: () => {
              if (!expLevel) return;
              goNext();
            },
            continueDisabled: !expLevel,
          })}
        >
          <div className="space-y-3">
            {EXPERIENCE_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={expLevel === o.value}
                onClick={() => setExpLevel(o.value)}
                title={o.title}
                description={o.description}
              />
            ))}
          </div>
        </WizardShell>
      );

    case "goal":
      return (
        <WizardShell
          {...shell({
            title: "What do you want out of Panameer?",
            onContinue: () => {
              if (!goal) return;
              goNext();
            },
            continueDisabled: !goal,
          })}
        >
          <div className="space-y-3">
            {GOAL_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={goal === o.value}
                onClick={() => setGoal(o.value)}
                title={o.title}
                description={o.description}
              />
            ))}
          </div>
        </WizardShell>
      );

    case "account":
      return (
        <WizardShell
          {...shell({
            title: "Create your account",
            subtitle: "You'll verify your email next.",
            onContinue: createAccount,
            continueLabel: "Create account",
            continueDisabled:
              !acct.firstName || !acct.lastName || !acct.email || !acct.password,
          })}
        >
          <div className="space-y-4">
            {error && <Notice>{error}</Notice>}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <TextInput
                  value={acct.firstName}
                  onChange={(e) => setAcct({ ...acct, firstName: e.target.value })}
                  autoComplete="given-name"
                />
              </Field>
              <Field label="Last name">
                <TextInput
                  value={acct.lastName}
                  onChange={(e) => setAcct({ ...acct, lastName: e.target.value })}
                  autoComplete="family-name"
                />
              </Field>
            </div>
            <Field label="Email">
              <TextInput
                type="email"
                value={acct.email}
                onChange={(e) => setAcct({ ...acct, email: e.target.value })}
                autoComplete="email"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Password" hint="At least 8 characters">
                <TextInput
                  type="password"
                  value={acct.password}
                  onChange={(e) => setAcct({ ...acct, password: e.target.value })}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm password">
                <TextInput
                  type="password"
                  value={acct.confirm}
                  onChange={(e) => setAcct({ ...acct, confirm: e.target.value })}
                  autoComplete="new-password"
                />
              </Field>
            </div>
          </div>
        </WizardShell>
      );

    case "verify":
      return (
        <WizardShell
          {...shell({
            title: "Verify your email",
            canBack: false,
            onBack: undefined,
            hideFooter: true,
          })}
        >
          <div className="space-y-5">
            <p className="text-[17px] text-ink-2">
              We sent a link to <b className="text-ink">{email}</b>. Click it to
              continue. This page updates automatically once you&apos;re verified.
            </p>

            {devLink && (
              <Notice tone="info">
                Dev mode (no RESEND_API_KEY): open your verification link{" "}
                <a href={devLink} className="font-bold underline">
                  here
                </a>
                .
              </Notice>
            )}
            {resendMsg && <Notice tone="info">{resendMsg}</Notice>}
            {error && <Notice>{error}</Notice>}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  fetch("/api/onboarding/status")
                    .then((r) => r.json())
                    .then((s) => {
                      if (s.emailVerified) {
                        hydrateProfile(s.profile);
                        setScreen((s.resumeStep as Screen) ?? "work_type");
                      } else {
                        setResendMsg("Not verified yet — click the email link first.");
                      }
                    });
                }}
                className="rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
              >
                I&apos;ve verified — continue
              </button>
              <button
                onClick={resend}
                className="rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2]"
              >
                Resend email
              </button>
            </div>

            {!editingEmail ? (
              <button
                onClick={() => {
                  setNewEmail(email);
                  setEditingEmail(true);
                }}
                className="text-[14px] font-bold text-ink-2 hover:text-magenta"
              >
                Wrong email? Change it
              </button>
            ) : (
              <div className="max-w-sm space-y-2">
                <Field label="New email">
                  <TextInput
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </Field>
                <div className="flex gap-2">
                  <button
                    onClick={saveNewEmail}
                    className="rounded-full bg-magenta px-5 py-2.5 font-bold text-white hover:bg-magenta-dark"
                  >
                    Save & resend
                  </button>
                  <button
                    onClick={() => setEditingEmail(false)}
                    className="rounded-full px-4 py-2.5 font-bold text-ink-2 hover:text-ink"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* TODO(brief_E): phone verification is stubbed for V1 — no real SMS. */}
            <p className="border-t border-line pt-4 text-[13px] text-ink-2">
              Phone verification: <b>skipped for now</b> (coming later).
            </p>
          </div>
        </WizardShell>
      );

    case "work_type":
      return (
        <WizardShell
          {...shell({
            title: "How do you want to work?",
            subtitle: "Pick all that apply.",
            onContinue: async () => {
              if (profile.workTypes.length === 0) return;
              if (await postStep("work_type", { workTypes: profile.workTypes }))
                goNext();
            },
            continueDisabled: profile.workTypes.length === 0,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="mt-2 flex flex-wrap gap-3">
            {WORK_TYPE_OPTIONS.map((w) => {
              const on = profile.workTypes.includes(w.value);
              return (
                <Chip
                  key={w.value}
                  selected={on}
                  onClick={() =>
                    setProfile((p) => ({
                      ...p,
                      workTypes: on
                        ? p.workTypes.filter((x) => x !== w.value)
                        : [...p.workTypes, w.value],
                    }))
                  }
                >
                  {w.label}
                </Chip>
              );
            })}
          </div>
        </WizardShell>
      );

    case "skills":
      return (
        <WizardShell
          {...shell({
            title: "Your skills",
            subtitle:
              "Pick one main category, then the skills you offer within it.",
            onContinue: async () => {
              if (!profile.roleTypeId || profile.skillIds.length === 0) return;
              if (
                await postStep("skills", {
                  roleTypeId: profile.roleTypeId,
                  skillIds: profile.skillIds,
                })
              )
                goNext();
            },
            continueDisabled:
              !profile.roleTypeId || profile.skillIds.length === 0,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-6">
            <div>
              <p className="mb-2 text-[14px] font-bold">Main category (pick one)</p>
              <div className="flex flex-wrap gap-2">
                {roleTypes.map((rt) => (
                  <Chip
                    key={rt.id}
                    selected={profile.roleTypeId === rt.id}
                    onClick={() =>
                      setProfile((p) => ({
                        ...p,
                        roleTypeId: rt.id,
                        // Switching category clears skills (one-main-category).
                        skillIds: p.roleTypeId === rt.id ? p.skillIds : [],
                      }))
                    }
                  >
                    {rt.display}
                  </Chip>
                ))}
              </div>
            </div>

            {profile.roleTypeId && (
              <div>
                <p className="mb-2 text-[14px] font-bold">
                  Skills {skillOpts.length > 0 && `(${profile.skillIds.length} selected)`}
                </p>
                <div className="flex flex-wrap gap-2">
                  {skillOpts.map((s) => {
                    const on = profile.skillIds.includes(s.id);
                    return (
                      <Chip
                        key={s.id}
                        selected={on}
                        onClick={() =>
                          setProfile((p) => ({
                            ...p,
                            skillIds: on
                              ? p.skillIds.filter((x) => x !== s.id)
                              : [...p.skillIds, s.id],
                          }))
                        }
                      >
                        {s.name}
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
        </WizardShell>
      );

    case "title":
      return (
        <WizardShell
          {...shell({
            title: "Give yourself a title",
            subtitle: "This headline appears at the top of your profile.",
            onContinue: async () => {
              if (!profile.headline.trim()) return;
              if (await postStep("title", { headline: profile.headline }))
                goNext();
            },
            continueDisabled: !profile.headline.trim(),
          })}
        >
          {error && <Notice>{error}</Notice>}
          <Field label="Professional title">
            <TextInput
              value={profile.headline}
              onChange={(e) =>
                setProfile((p) => ({ ...p, headline: e.target.value }))
              }
              placeholder="e.g. Oracle Cloud Procurement Expert"
            />
          </Field>
        </WizardShell>
      );

    case "experience":
      return (
        <WizardShell
          {...shell({
            title: "Your experience",
            subtitle: "Add the employers and projects you want to showcase.",
            onContinue: async () => {
              const valid = profile.experiences.filter(
                (e) => e.employer.trim() && e.roleTitle.trim()
              );
              if (valid.length === 0) {
                setError("Add at least one employer with a role title.");
                return;
              }
              if (await postStep("experience", { experiences: profile.experiences }))
                goNext();
            },
            continueDisabled: profile.experiences.length === 0,
          })}
        >
          {error && <Notice>{error}</Notice>}
          {profile.experiences.length === 0 ? (
            <button
              onClick={() =>
                setProfile((p) => ({ ...p, experiences: [emptyExperience()] }))
              }
              className="rounded-full bg-magenta px-6 py-3 font-bold text-white hover:bg-magenta-dark"
            >
              + Add your first employer
            </button>
          ) : (
            <ExperienceEditor
              value={profile.experiences}
              onChange={(experiences) => setProfile((p) => ({ ...p, experiences }))}
            />
          )}
        </WizardShell>
      );

    case "education_languages":
      return (
        <WizardShell
          {...shell({
            title: "Education & languages",
            subtitle: "Optional — add what you'd like, or skip for now.",
            onContinue: async () => {
              if (
                await postStep("education_languages", {
                  education: profile.education,
                  languages: profile.languages,
                })
              )
                goNext();
            },
            secondaryLabel: "Skip for now",
            onSecondary: goNext,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <EducationLanguagesEditor
            education={profile.education}
            languages={profile.languages}
            onEducation={(education) => setProfile((p) => ({ ...p, education }))}
            onLanguages={(languages) => setProfile((p) => ({ ...p, languages }))}
          />
        </WizardShell>
      );

    case "bio":
      return (
        <WizardShell
          {...shell({
            title: "Write a short bio",
            subtitle: "A few sentences on what you do and the outcomes you drive.",
            onContinue: async () => {
              if (!profile.overview.trim()) return;
              if (await postStep("bio", { overview: profile.overview })) goNext();
            },
            continueDisabled: !profile.overview.trim(),
          })}
        >
          {error && <Notice>{error}</Notice>}
          <Field label="Overview">
            <TextArea
              value={profile.overview}
              onChange={(e) =>
                setProfile((p) => ({ ...p, overview: e.target.value }))
              }
              placeholder="15+ years implementing Oracle Cloud Procurement…"
            />
          </Field>
        </WizardShell>
      );

    case "rate":
      return (
        <WizardShell
          {...shell({
            title: "Set your rates",
            subtitle: "Enter at least one. You can change these anytime.",
            onContinue: async () => {
              if (!profile.onsiteDollars && !profile.remoteDollars) {
                setError("Enter at least one rate.");
                return;
              }
              if (
                await postStep("rate", {
                  onsiteDollars: profile.onsiteDollars || null,
                  remoteDollars: profile.remoteDollars || null,
                  currency: profile.currency,
                })
              )
                goNext();
            },
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="grid max-w-md gap-4 sm:grid-cols-2">
            <Field label="Remote rate (USD/hr)">
              <TextInput
                type="number"
                min="0"
                value={profile.remoteDollars}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, remoteDollars: e.target.value }))
                }
                placeholder="90"
              />
            </Field>
            <Field label="Onsite rate (USD/hr)">
              <TextInput
                type="number"
                min="0"
                value={profile.onsiteDollars}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, onsiteDollars: e.target.value }))
                }
                placeholder="125"
              />
            </Field>
          </div>
        </WizardShell>
      );

    case "region":
      return (
        <WizardShell
          {...shell({
            title: "Where are you based?",
            onContinue: async () => {
              if (!profile.regionId) return;
              if (await postStep("region", { regionId: profile.regionId }))
                goNext();
            },
            continueDisabled: !profile.regionId,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-3">
            {regions.map((r) => (
              <OptionCard
                key={r.id}
                selected={profile.regionId === r.id}
                onClick={() => setProfile((p) => ({ ...p, regionId: r.id }))}
                title={r.name}
                description={r.description ?? undefined}
              />
            ))}
          </div>
        </WizardShell>
      );

    case "photo":
      return (
        <WizardShell
          {...shell({
            title: "Add a photo",
            subtitle:
              "Optional. Without one, we'll use your initials. Uploads are coming soon.",
            onContinue: goNext,
            continueLabel: "Continue",
            secondaryLabel: "Skip for now",
            onSecondary: goNext,
          })}
        >
          <div className="flex items-center gap-4">
            <Avatar
              firstName={profile.firstName}
              lastName={profile.lastName}
              photoUrl={profile.photoUrl}
              size={80}
            />
            <p className="text-[14px] text-ink-2">
              {/* TODO(brief_E): real photo upload (Supabase Storage) is out of
                  scope; initials placeholder only. */}
              Your initials placeholder will show until photo upload ships.
            </p>
          </div>
        </WizardShell>
      );

    case "review": {
      const roleTypeLabel =
        roleTypes.find((r) => r.id === profile.roleTypeId)?.display ?? null;
      const regionLabel =
        regions.find((r) => r.id === profile.regionId)?.name ?? null;
      return (
        <WizardShell
          {...shell({
            title: "Review & submit",
            subtitle:
              "Check everything over. After you submit, your profile goes to review before it's published.",
            onContinue: submit,
            continueLabel: "Submit for review",
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-4">
            <ReviewRow label="Title" value={profile.headline} onEdit={() => goto("title")} />
            <ReviewRow
              label="Work types"
              value={profile.workTypes.join(", ")}
              onEdit={() => goto("work_type")}
            />
            <ReviewRow
              label="Category & skills"
              value={`${roleTypeLabel ?? "—"} · ${profile.skillIds.length} skills`}
              onEdit={() => goto("skills")}
            />
            <ReviewRow
              label="Experience"
              value={`${profile.experiences.length} employer(s)`}
              onEdit={() => goto("experience")}
            />
            <ReviewRow
              label="Bio"
              value={profile.overview ? `${profile.overview.slice(0, 80)}…` : "—"}
              onEdit={() => goto("bio")}
            />
            <ReviewRow
              label="Rates"
              value={[
                profile.remoteDollars && `Remote $${profile.remoteDollars}/hr`,
                profile.onsiteDollars && `Onsite $${profile.onsiteDollars}/hr`,
              ]
                .filter(Boolean)
                .join(" · ")}
              onEdit={() => goto("rate")}
            />
            <ReviewRow label="Region" value={regionLabel ?? "—"} onEdit={() => goto("region")} />
          </div>
        </WizardShell>
      );
    }
  }
}

function ReviewRow({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-brand border border-line p-4">
      <div className="min-w-0">
        <p className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
          {label}
        </p>
        <p className="mt-0.5 truncate font-medium">{value || "—"}</p>
      </div>
      <button
        onClick={onEdit}
        className="shrink-0 text-[14px] font-bold text-magenta hover:text-magenta-dark"
      >
        Edit
      </button>
    </div>
  );
}
