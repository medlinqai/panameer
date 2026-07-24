"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { VerifyGate } from "@/components/onboarding/VerifyGate";
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

  // Coordinator invite (brief_I): carried through as ?invite=token.
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteCtx, setInviteCtx] = useState<{ coordinatorName: string } | null>(
    null
  );

  // Profile.
  const [profile, setProfile] = useState<ProfileState>(emptyProfile());
  const [roleTypes, setRoleTypes] = useState<RoleType[]>([]);
  const [skillOpts, setSkillOpts] = useState<SkillOpt[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);

  // Completeness + visibility (brief_K). `justLive` fires the "you're live"
  // confirmation the first time completeness crosses the threshold.
  const [completeness, setCompleteness] = useState(0);
  const [threshold, setThreshold] = useState(80);
  const [visible, setVisible] = useState(false);
  const [justLive, setJustLive] = useState(false);

  const idx = SCREENS.indexOf(screen);
  const progress = idx / (SCREENS.length - 1);

  // Absorb the completeness/visibility fields from an onboarding-state response,
  // firing the one-time "you're live" moment on the first false→true crossing.
  const absorb = useCallback(
    (s: { completeness?: number; visible?: boolean; visibilityThreshold?: number }) => {
      if (typeof s.visibilityThreshold === "number") setThreshold(s.visibilityThreshold);
      if (typeof s.completeness === "number") setCompleteness(s.completeness);
      if (typeof s.visible === "boolean") {
        setVisible((prev) => {
          if (s.visible && !prev) setJustLive(true);
          return !!s.visible;
        });
      }
    },
    []
  );

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
      // Coordinator invite carried through the URL — pre-fill + lock the email.
      const token = new URLSearchParams(window.location.search).get("invite");
      if (token) {
        const inv = await fetch(
          `/api/invite/lookup?token=${encodeURIComponent(token)}`
        )
          .then((x) => x.json())
          .catch(() => null);
        if (inv?.ok) {
          setInviteToken(token);
          setInviteCtx({ coordinatorName: inv.coordinatorName });
          setAcct((a) => ({
            ...a,
            email: inv.inviteeEmail ?? a.email,
            firstName: inv.inviteeFirstName ?? a.firstName,
            lastName: inv.inviteeLastName ?? a.lastName,
          }));
        }
      }

      const r = await fetch("/api/onboarding/status");
      if (r.status === 401) {
        setScreen("exp_level");
      } else if (r.status === 404) {
        setNotProvider(true);
      } else if (r.ok) {
        const s = await r.json();
        setEmail(s.email);
        // On initial load, seed visibility without firing the "just live" toast.
        setVisible(!!s.visible);
        if (typeof s.completeness === "number") setCompleteness(s.completeness);
        if (typeof s.visibilityThreshold === "number") setThreshold(s.visibilityThreshold);
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

  // Verify-gate polling is handled by the shared <VerifyGate>.

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
      absorb(body);
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
          ...(inviteToken ? { inviteToken } : {}),
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

  // No "submit for review" anymore (brief_K) — the provider is active-on-verify
  // and visible automatically at ≥ threshold. Finishing just goes to the app.
  const finish = () => router.push("/dashboard");

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

  // Profile-build steps show a live completeness meter (brief_K). The review
  // step has its own full meter; pre-account/verify steps have no profile yet.
  const METER_STEPS: Screen[] = [
    "work_type",
    "skills",
    "title",
    "experience",
    "education_languages",
    "bio",
    "rate",
    "region",
    "photo",
  ];
  const stepBanner = METER_STEPS.includes(screen) ? (
    <div className="rounded-brand border border-line p-4">
      {justLive && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-[10px] bg-emerald-50 px-3 py-2">
          <span className="text-[14px] font-semibold text-emerald-700">
            🎉 You&apos;re live — buyers can now find you.
          </span>
          <button
            onClick={() => setJustLive(false)}
            className="text-[13px] font-bold text-emerald-700/70 hover:text-emerald-700"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold text-ink-2">
          Profile completeness
        </span>
        <span className="text-[14px] font-extrabold text-magenta">
          {completeness}%{" "}
          {visible ? (
            <span className="text-emerald-600">· live</span>
          ) : (
            <span className="text-ink-2">· {threshold}% to go live</span>
          )}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full bg-magenta transition-[width] duration-500"
          style={{ width: `${Math.min(100, completeness)}%` }}
        />
      </div>
    </div>
  ) : undefined;

  const shell = (
    props: Partial<React.ComponentProps<typeof WizardShell>> & { title: string }
  ) => ({
    progress,
    onBack: canBack ? goBack : undefined,
    canBack,
    busy,
    banner: stepBanner,
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
            {inviteCtx && (
              <Notice tone="info">
                You were invited by <b>{inviteCtx.coordinatorName}</b>. Complete
                sign-up to join their team of providers.
              </Notice>
            )}
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
            <Field
              label="Email"
              hint={inviteCtx ? "Set by your invitation" : undefined}
            >
              <TextInput
                type="email"
                value={acct.email}
                onChange={(e) => setAcct({ ...acct, email: e.target.value })}
                autoComplete="email"
                readOnly={!!inviteToken}
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
          <VerifyGate
            email={email}
            onEmailChange={setEmail}
            statusUrl="/api/onboarding/status"
            initialDevLink={devLink}
            onVerified={(s) => {
              hydrateProfile(s.profile);
              setVisible(!!s.visible);
              if (typeof s.completeness === "number") setCompleteness(s.completeness);
              setScreen((s.resumeStep as Screen) ?? "work_type");
            }}
          />
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
            title: "Review your profile",
            subtitle: visible
              ? "You're live — buyers can find you. Review anything below, then head to your dashboard."
              : `You're at ${completeness}% — reach ${threshold}% to become visible to buyers. You can keep editing anytime.`,
            onContinue: finish,
            continueLabel: "Go to dashboard",
          })}
        >
          {error && <Notice>{error}</Notice>}

          <div className="mb-6 rounded-brand border border-line p-5">
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-bold">Profile completeness</span>
              <span className="text-[16px] font-extrabold text-magenta">
                {completeness}%
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full bg-magenta transition-[width] duration-500"
                style={{ width: `${Math.min(100, completeness)}%` }}
              />
            </div>
            {visible ? (
              <p className="mt-3 text-[14px] font-semibold text-emerald-600">
                🎉 You&apos;re live — buyers can now find you.
              </p>
            ) : (
              <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-ink-2">
                Panameer is a premium marketplace — the best buyers come here for
                the best talent. Reach {threshold}% to become visible to service
                buyers. The stronger our profiles, the better the buyers we
                attract — and the better the work that finds you.
              </p>
            )}
          </div>

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
