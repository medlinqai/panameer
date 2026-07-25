"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { VerifyGate } from "@/components/onboarding/VerifyGate";
import { SignUpForm, type SignUpValues } from "@/components/onboarding/SignUpForm";
import { Logo } from "@/components/Logo";
import {
  OptionCard,
  Chip,
  Field,
  TextInput,
  TextArea,
  Notice,
} from "@/components/onboarding/controls";
import {
  EducationCards,
  type EducationDraft,
} from "@/components/onboarding/EducationCards";
import {
  ResumeUploadModal,
  type ImportOutcome,
} from "@/components/onboarding/ResumeUploadModal";
import { PhotoCropModal } from "@/components/onboarding/PhotoCropModal";
import { TestimonialCard, DECK_TESTIMONIALS } from "@/components/onboarding/TestimonialCarousel";
import { Avatar } from "@/components/Avatar";
import {
  formatCents,
  bpsToPercentLabel,
  rateBreakdown,
} from "@/lib/display";

/**
 * Provider (Seller) onboarding — journey P1-J1, rebuilt by brief_P.
 *
 * Shape:
 *   PRE-VERIFY  (no stepper, E001): sign up → "check your email"
 *   then        /verify-email → /join/provider/start ("Get Started Now!", E002)
 *   POST-VERIFY (stepper x/12, E003/E010): the 12 profile steps, ending on the
 *               "You're Done!" finish page → Publish → /join/provider/preview
 *
 * Every step saves on Continue (save-as-you-go, brief_E) and the server derives
 * the resume point, so there is no progress column to keep in sync.
 */

/** The 12 profile steps, in order. Must mirror PROVIDER_STEPS server-side. */
const STEPS = [
  "experience_level",
  "goal",
  "work_method",
  "title",
  "tell_us",
  "category",
  "skills",
  "education",
  "languages",
  "bio",
  "rate",
  "finish",
] as const;
type Step = (typeof STEPS)[number];
type Screen = "signup" | "check_email" | Step;

const TOTAL = STEPS.length; // 12

const EXPERIENCE_OPTIONS = [
  { value: "BEGINNER", title: "Beginner", description: "New to consulting or early in my journey." },
  { value: "MID_CAREER", title: "Mid-Career", description: "Several years delivering real engagements." },
  { value: "EXPERT", title: "Expert", description: "Seasoned specialist others rely on." },
];

const GOAL_OPTIONS = [
  { value: "MAIN_HUSTLE", title: "This Is My Main Work", description: "I want Panameer to be my primary source of engagements." },
  { value: "SIDE_HUSTLE", title: "A Side Hustle", description: "Extra work alongside a main job." },
  { value: "BUILD_SKILLS", title: "Build My Skills & Reputation", description: "Grow experience and a track record." },
  { value: "NONE", title: "Just Exploring", description: "Seeing what's here for now." },
];

// E009 — the third option forks the user to Recruiter (the app's Coordinator).
const WORK_METHOD_OPTIONS = [
  { value: "HOURLY", title: "I Sell My Services by the Hour", description: "Clients book your time at an hourly rate." },
  { value: "PACKAGES", title: "I Sell My Services in Packages", description: "Fixed-scope offerings at a set price." },
  { value: "RECRUITER", title: "I Sell the Services of Others (Recruiter)", description: "You represent other providers and place them on work." },
];

const LANGUAGE_LEVELS = [
  { value: "BASIC", label: "Basic" },
  { value: "CONVERSATIONAL", label: "Conversational" },
  { value: "FLUENT", label: "Fluent" },
  { value: "NATIVE_OR_BILINGUAL", label: "Native or Bilingual" },
];

const MIN_BIO = 100;
const MAX_BIO = 4500;
const MAX_SKILLS = 15;

/** The shape `/api/onboarding/status` returns. Only what this page reads. */
type ProfilePayload = {
  experienceLevel?: string | null;
  goal?: string | null;
  workMethod?: string | null;
  profileMethod?: string | null;
  pillarId?: string | null;
  pillarName?: string | null;
  skillIds?: string[];
  skillNames?: { id: string; name: string }[];
  headline?: string | null;
  overview?: string | null;
  hourlyRateCents?: number | null;
  serviceFeeBps?: number | null;
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  phoneVerified?: boolean;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  education?: {
    institution: string;
    degree: string | null;
    field: string | null;
    startYear?: number | null;
    endYear?: number | null;
    year?: number | null;
    description?: string | null;
  }[];
  languages?: { name: string; level?: string | null }[];
};

type StatusPayload = {
  email: string;
  emailVerified: boolean;
  resumeStep: string;
  completeness?: number;
  profile?: ProfilePayload;
};

type Field_ = { id: string; code: string; name: string; skillCount: number };
type SkillOpt = { id: string; name: string; roleType: { display: string } | null };
type LanguageDraft = { name: string; level: string | null };
type AddressDraft = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type Profile = {
  experienceLevel: string | null;
  goal: string | null;
  workMethod: string | null;
  profileMethod: string | null;
  pillarId: string | null;
  pillarName: string | null;
  skillIds: string[];
  skillNames: { id: string; name: string }[];
  headline: string;
  overview: string;
  hourlyRateCents: number | null;
  serviceFeeBps: number;
  photoUrl: string | null;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  phone: string | null;
  phoneVerified: boolean;
  address: AddressDraft | null;
  education: EducationDraft[];
  languages: LanguageDraft[];
};

const emptyProfile = (): Profile => ({
  experienceLevel: null,
  goal: null,
  workMethod: null,
  profileMethod: null,
  pillarId: null,
  pillarName: null,
  skillIds: [],
  skillNames: [],
  headline: "",
  overview: "",
  hourlyRateCents: null,
  serviceFeeBps: 1000,
  photoUrl: null,
  firstName: "",
  lastName: "",
  dateOfBirth: null,
  phone: null,
  phoneVerified: false,
  address: null,
  education: [],
  languages: [],
});

const emptyAddress = (country = "United States"): AddressDraft => ({
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country,
});

export default function JoinProviderPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notProvider, setNotProvider] = useState(false);

  const [acct, setAcct] = useState<SignUpValues>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    country: "United States",
    marketingOptIn: false,
    tosAccepted: false,
  });

  const [email, setEmail] = useState("");
  const [devLink, setDevLink] = useState<string | null>(null);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteCtx, setInviteCtx] = useState<{ coordinatorName: string } | null>(null);

  const [profile, setProfile] = useState<Profile>(emptyProfile());
  const [fields, setFields] = useState<Field_[]>([]);
  const [skillOpts, setSkillOpts] = useState<SkillOpt[]>([]);
  const [skillQuery, setSkillQuery] = useState("");

  const [importOutcome, setImportOutcome] = useState<ImportOutcome | null>(null);
  const [uploadModal, setUploadModal] = useState<null | "RESUME" | "LINKEDIN_PDF">(null);
  const [photoModal, setPhotoModal] = useState(false);

  // Phone verification (E019).
  const [phoneInput, setPhoneInput] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [phoneMsg, setPhoneMsg] = useState<string | null>(null);

  const stepIndex = STEPS.indexOf(screen as Step);

  // ---- hydration --------------------------------------------------------
  // The server owns profile state; every save returns the fresh snapshot and
  // we re-seed local form state from it rather than guessing what changed.
  const hydrate = useCallback((s: StatusPayload) => {
    const p = s.profile;
    if (!p) return;
    setProfile({
      experienceLevel: p.experienceLevel ?? null,
      goal: p.goal ?? null,
      workMethod: p.workMethod ?? null,
      profileMethod: p.profileMethod ?? null,
      pillarId: p.pillarId ?? null,
      pillarName: p.pillarName ?? null,
      skillIds: p.skillIds ?? [],
      skillNames: p.skillNames ?? [],
      headline: p.headline ?? "",
      overview: p.overview ?? "",
      hourlyRateCents: p.hourlyRateCents ?? null,
      serviceFeeBps: p.serviceFeeBps ?? 1000,
      photoUrl: p.photoUrl ?? null,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
      dateOfBirth: p.dateOfBirth ?? null,
      phone: p.phone ?? null,
      phoneVerified: !!p.phoneVerified,
      address: p.address
        ? {
            line1: p.address.line1 ?? "",
            line2: p.address.line2 ?? "",
            city: p.address.city ?? "",
            state: p.address.state ?? "",
            postalCode: p.address.postalCode ?? "",
            country: p.address.country ?? "United States",
          }
        : null,
      education: (p.education ?? []).map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        startYear: e.startYear ?? null,
        endYear: e.endYear ?? e.year ?? null,
        description: e.description ?? null,
      })),
      languages: (p.languages ?? []).map((l) => ({
        name: l.name,
        level: l.level ?? null,
      })),
    });
    if (p.phone) setPhoneInput(p.phone);
    if (p.phoneVerified) setCodeSent(false);
  }, []);

  // ---- mount ------------------------------------------------------------
  useEffect(() => {
    (async () => {
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

      let r = await fetch("/api/onboarding/status");

      // Signed in with no provider profile — the one-click OAuth path (brief_Q).
      // `linkOAuthUser` creates the User only, because a Google login carries no
      // buyer/provider intent; THIS page is where that intent is known, so build
      // the backbone now and re-read. A 409 means they're a buyer — that really
      // is "not a provider".
      if (r.status === 404) {
        const made = await fetch("/api/onboarding/provider/backbone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...(token ? { inviteToken: token } : {}) }),
        });
        if (made.ok) {
          r = await fetch("/api/onboarding/status");
        }
      }

      if (r.status === 401) {
        setScreen("signup");
      } else if (r.status === 404) {
        setNotProvider(true);
      } else if (r.ok) {
        const s = await r.json();
        setEmail(s.email);
        hydrate(s);
        if (!s.emailVerified) {
          setScreen("check_email");
        } else {
          // The review page's edit pencils deep-link back to a specific step
          // (?step=bio). Anything unrecognised falls back to the resume point.
          const requested = new URLSearchParams(window.location.search).get("step");
          const target = STEPS.includes(requested as Step)
            ? (requested as Step)
            : (s.resumeStep as Step);
          setScreen(target);
        }
      }
      setReady(true);
    })();
  }, [hydrate]);

  // ---- reference data ---------------------------------------------------
  useEffect(() => {
    if (screen === "category" && fields.length === 0) {
      fetch("/api/catalog/fields")
        .then((r) => r.json())
        .then((d) => setFields(d.fields ?? []))
        .catch(() => setError("We couldn't load the categories. Please refresh."));
    }
  }, [screen, fields.length]);

  useEffect(() => {
    if (screen !== "skills" || !profile.pillarId) return;
    fetch(`/api/catalog/skills?pillarId=${profile.pillarId}`)
      .then((r) => r.json())
      .then((d) => setSkillOpts(d.skills ?? []))
      .catch(() => setError("We couldn't load skills. Please refresh."));
  }, [screen, profile.pillarId]);

  // ---- navigation -------------------------------------------------------
  const goTo = (s: Screen) => {
    setError(null);
    setScreen(s);
  };
  const goNext = () => {
    if (stepIndex >= 0 && stepIndex < STEPS.length - 1) goTo(STEPS[stepIndex + 1]);
  };
  const goBack = () => {
    if (stepIndex > 0) goTo(STEPS[stepIndex - 1]);
  };

  const postStep = async (step: Step, data: unknown): Promise<boolean> => {
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
      hydrate(body);
      return true;
    } finally {
      setBusy(false);
    }
  };

  const saveAnd = async (step: Step, data: unknown, then: () => void = goNext) => {
    if (await postStep(step, data)) then();
  };

  // ---- account creation -------------------------------------------------
  const createAccount = async () => {
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/onboarding/provider/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: acct.firstName,
          lastName: acct.lastName,
          email: acct.email,
          password: acct.password,
          country: acct.country,
          marketingOptIn: acct.marketingOptIn,
          tosAccepted: acct.tosAccepted,
          ...(inviteToken ? { inviteToken } : {}),
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not create account.");
        return;
      }
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
      setProfile((p) => ({
        ...p,
        firstName: acct.firstName,
        lastName: acct.lastName,
        address: emptyAddress(acct.country),
      }));
      goTo("check_email");
    } finally {
      setBusy(false);
    }
  };

  // ---- phone verification (E019) ----------------------------------------
  const sendCode = async () => {
    setPhoneMsg(null);
    setBusy(true);
    try {
      const r = await fetch("/api/onboarding/provider/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", phone: phoneInput }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setPhoneMsg(body.error ?? "Could not send the code.");
        return;
      }
      setCodeSent(true);
      setDevCode(body.devCode ?? null);
      setPhoneMsg(
        body.sent
          ? `We texted a 6-digit code to ${body.masked}.`
          : "SMS isn't configured on this environment — use the code below."
      );
      setProfile((p) => ({ ...p, phoneVerified: false }));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setPhoneMsg(null);
    setBusy(true);
    try {
      const r = await fetch("/api/onboarding/provider/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", code: codeInput }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setPhoneMsg(body.error ?? "That code isn't right.");
        return;
      }
      if (body.state) hydrate(body.state);
      setCodeSent(false);
      setCodeInput("");
      setDevCode(null);
      setPhoneMsg("Phone verified.");
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    setError(null);
    setBusy(true);
    try {
      // Persist whatever the finish page holds before the required-field gate.
      await postStep("finish", {
        dateOfBirth: profile.dateOfBirth,
        address: profile.address,
      });
      const r = await fetch("/api/onboarding/provider/publish", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not publish your profile.");
        return;
      }
      router.push("/join/provider/preview");
    } finally {
      setBusy(false);
    }
  };

  // ---- render -----------------------------------------------------------
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
          <p className="mt-2 text-ink-2">This account isn&apos;t a provider profile.</p>
          <a href="/dashboard" className="mt-4 inline-block font-bold text-magenta">
            Go to Dashboard →
          </a>
        </div>
      </div>
    );
  }

  // ===== PRE-VERIFY (no stepper, E001) ====================================
  if (screen === "signup") {
    return (
      <PlainShell>
        {inviteCtx && (
          <div className="mx-auto mb-6 max-w-md">
            <Notice tone="info">
              <b>{inviteCtx.coordinatorName}</b> invited you to join Panameer.
            </Notice>
          </div>
        )}
        <SignUpForm
          values={acct}
          onChange={(patch) => setAcct((a) => ({ ...a, ...patch }))}
          onSubmit={createAccount}
          onBack={() => router.push("/join")}
          busy={busy}
          error={error}
          emailLocked={!!inviteToken}
        />
      </PlainShell>
    );
  }

  if (screen === "check_email") {
    return (
      <PlainShell>
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-[28px] font-extrabold tracking-[-0.6px] sm:text-[34px]">
            Check Your Email
          </h1>
          <div className="mt-6">
            <VerifyGate
              email={email}
              onEmailChange={setEmail}
              statusUrl="/api/onboarding/status"
              onVerified={() => router.push("/join/provider/start")}
              initialDevLink={devLink}
            />
          </div>
        </div>
      </PlainShell>
    );
  }

  // ===== POST-VERIFY: the 12 steps (stepper x/12) =========================
  const stepNumber = stepIndex + 1;
  const shell = (props: Partial<React.ComponentProps<typeof WizardShell>> & { title: string }) => ({
    step: stepNumber,
    totalSteps: TOTAL,
    busy,
    onBack: stepIndex > 0 ? goBack : undefined,
    canBack: stepIndex > 0,
    ...props,
  });

  switch (screen) {
    // ---- 1/12 — Experience (E003) --------------------------------------
    case "experience_level":
      return (
        <WizardShell
          {...shell({
            title: "What's Your Experience Level?",
            subtitle: "This helps us set expectations with clients. You can change it later.",
            onContinue: () =>
              saveAnd("experience_level", { experienceLevel: profile.experienceLevel }),
            continueDisabled: !profile.experienceLevel,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-3">
            {EXPERIENCE_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={profile.experienceLevel === o.value}
                onClick={() => setProfile((p) => ({ ...p, experienceLevel: o.value }))}
                title={o.title}
                description={o.description}
              />
            ))}
          </div>
        </WizardShell>
      );

    // ---- 2/12 — Goal (E004: "Got it!" + "while") ------------------------
    case "goal":
      return (
        <WizardShell
          {...shell({
            title: "Got it! What's your biggest goal while providing services/freelancing?",
            onContinue: () => saveAnd("goal", { goal: profile.goal }),
            continueDisabled: !profile.goal,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-3">
            {GOAL_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={profile.goal === o.value}
                onClick={() => setProfile((p) => ({ ...p, goal: o.value }))}
                title={o.title}
                description={o.description}
              />
            ))}
          </div>
        </WizardShell>
      );

    // ---- 3/12 — How Do You Work? (E009) --------------------------------
    case "work_method":
      return (
        <WizardShell
          {...shell({
            title: "How Do You Work?",
            subtitle: "Tell us how you sell your services so we can match you to the right work.",
            onContinue: () => saveAnd("work_method", { workMethod: profile.workMethod }),
            continueDisabled: !profile.workMethod,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-3">
            {WORK_METHOD_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={profile.workMethod === o.value}
                onClick={() => setProfile((p) => ({ ...p, workMethod: o.value }))}
                title={o.title}
                description={o.description}
              />
            ))}
          </div>
          {profile.workMethod === "RECRUITER" && (
            <div className="mt-5">
              <Notice tone="info">
                Recruiters get the coordinator tools for representing other
                providers, alongside your own profile.
              </Notice>
            </div>
          )}
        </WizardShell>
      );

    // ---- 4/12 — Title (E011) -------------------------------------------
    case "title":
      return (
        <WizardShell
          {...shell({
            title: "Got it. Now, add a title to tell the world what you do.",
            subtitle:
              "It's the very first thing clients see, so make it count. Stand out by describing your expertise in your own words.",
            onContinue: () => saveAnd("title", { headline: profile.headline }),
            continueDisabled: profile.headline.trim() === "",
          })}
        >
          {error && <Notice>{error}</Notice>}
          <Field label="Your Title">
            <TextInput
              value={profile.headline}
              onChange={(e) => setProfile((p) => ({ ...p, headline: e.target.value }))}
              placeholder="e.g. Oracle Cloud P2P / Procurement Expert"
              maxLength={200}
            />
          </Field>
        </WizardShell>
      );

    // ---- 5/12 — Tell us about yourself (E012) --------------------------
    case "tell_us":
      return (
        <WizardShell
          {...shell({
            title: "How would you like to tell us about yourself?",
            subtitle:
              "We need to get a sense of your education, experience and skills. It's quickest to import your information — you can edit it before your profile goes live.",
            wide: true,
            aside: <TestimonialCard t={DECK_TESTIMONIALS[0]} />,
            secondaryLabel: "Skip for Now",
            onSecondary: goNext,
            onContinue: () => saveAnd("tell_us", { profileMethod: "MANUAL" }),
            continueLabel: "Continue",
          })}
        >
          {error && <Notice>{error}</Notice>}

          {/* Confirm-or-fix summary (brief_Q): show exactly what landed, so the
              next steps are a review rather than a retype. */}
          {importOutcome && (
            <div className="mb-6">
              <ImportSummary outcome={importOutcome} />
            </div>
          )}

          <div className="space-y-3">
            {/* Résumé upload is the PRIMARY path (brief_Q) — manual entry is
                where people drop out, so the fastest route leads. */}
            <MethodCard
              title="Upload Your Resume"
              description="PDF, Word or rich text, up to 5 MB. We'll read it and fill in your title, experience, education, skills and languages — you just confirm."
              onClick={() => setUploadModal("RESUME")}
              primary
              badge="Fastest"
            />
            <MethodCard
              title="Import From LinkedIn"
              description="LinkedIn doesn't let apps read your profile directly, so export it: open your profile → More → Save to PDF, then upload that file here."
              onClick={() => setUploadModal("LINKEDIN_PDF")}
            />
            <MethodCard
              title="Fill Out Manually (15 Mins)"
              description="Type everything yourself, step by step."
              onClick={() => saveAnd("tell_us", { profileMethod: "MANUAL" })}
            />
          </div>

          <ResumeUploadModal
            open={uploadModal !== null}
            source={uploadModal ?? "RESUME"}
            onClose={() => setUploadModal(null)}
            onImported={(outcome) => {
              setImportOutcome(outcome);
              if (outcome.state) hydrate(outcome.state as StatusPayload);
            }}
          />
        </WizardShell>
      );

    // ---- 6/12 — Category / field (E013) --------------------------------
    case "category":
      return (
        <WizardShell
          {...shell({
            title: "Nearly there! What work are you here to do?",
            subtitle:
              "Your skills show clients what you can offer and help us choose which jobs to recommend to you. Add or remove the ones we've suggested or start typing to pick more. It's up to you.",
            onContinue: () => saveAnd("category", { pillarId: profile.pillarId }),
            continueDisabled: !profile.pillarId,
          })}
        >
          {error && <Notice>{error}</Notice>}
          {fields.length === 0 ? (
            <p className="text-ink-2">Loading categories…</p>
          ) : (
            <div className="space-y-3">
              {fields.map((f) => (
                <OptionCard
                  key={f.id}
                  selected={profile.pillarId === f.id}
                  onClick={() =>
                    setProfile((p) => ({ ...p, pillarId: f.id, pillarName: f.name }))
                  }
                  title={f.name}
                  description={`${f.skillCount} skill${f.skillCount === 1 ? "" : "s"} in this field`}
                />
              ))}
            </div>
          )}
        </WizardShell>
      );

    // ---- 7/12 — Skills (E014) ------------------------------------------
    case "skills": {
      const chosen = new Set(profile.skillIds);
      const q = skillQuery.trim().toLowerCase();
      const matching = q
        ? skillOpts.filter((s) => s.name.toLowerCase().includes(q))
        : skillOpts;
      const suggested = matching.filter((s) => !chosen.has(s.id)).slice(0, 24);
      const atMax = profile.skillIds.length >= MAX_SKILLS;

      const toggle = (id: string) =>
        setProfile((p) => {
          const has = p.skillIds.includes(id);
          if (!has && p.skillIds.length >= MAX_SKILLS) return p;
          const name = skillOpts.find((s) => s.id === id)?.name ?? "";
          return {
            ...p,
            skillIds: has ? p.skillIds.filter((x) => x !== id) : [...p.skillIds, id],
            skillNames: has
              ? p.skillNames.filter((x) => x.id !== id)
              : [...p.skillNames, { id, name }],
          };
        });

      return (
        <WizardShell
          {...shell({
            title: "And what skills do you use in that work?",
            subtitle: `Pick up to ${MAX_SKILLS} from ${profile.pillarName ?? "your field"}.`,
            onContinue: () =>
              saveAnd("skills", {
                pillarId: profile.pillarId,
                skillIds: profile.skillIds,
              }),
            continueDisabled: profile.skillIds.length === 0,
          })}
        >
          {error && <Notice>{error}</Notice>}

          <div className="mb-5">
            <p className="mb-2 text-[14px] font-bold">
              Your Skills{" "}
              <span className="font-normal text-ink-2">
                ({profile.skillIds.length}/{MAX_SKILLS})
              </span>
            </p>
            {profile.skillNames.length === 0 ? (
              <p className="text-[14px] text-ink-2">Nothing picked yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skillNames.map((s) => (
                  <Chip key={s.id} selected onClick={() => toggle(s.id)}>
                    {s.name}
                  </Chip>
                ))}
              </div>
            )}
          </div>

          <Field label="Search Skills">
            <TextInput
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
              placeholder="Start typing to filter…"
            />
          </Field>

          <div className="mt-5">
            <p className="mb-2 text-[14px] font-bold">Suggested Skills</p>
            {atMax && (
              <div className="mb-3">
                <Notice tone="info">
                  That&apos;s {MAX_SKILLS} — remove one to add another.
                </Notice>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {suggested.map((s) => (
                <Chip key={s.id} selected={false} onClick={() => toggle(s.id)}>
                  {s.name}
                </Chip>
              ))}
              {suggested.length === 0 && (
                <p className="text-[14px] text-ink-2">No matches.</p>
              )}
            </div>
          </div>
        </WizardShell>
      );
    }

    // ---- 8/12 — Education (E015, optional + Skip) ----------------------
    case "education":
      return (
        <WizardShell
          {...shell({
            title: "Clients love to hear about your education",
            subtitle: "Even if you're still studying, or didn't finish — it all counts.",
            secondaryLabel: "Skip for Now",
            onSecondary: goNext,
            onContinue: () => saveAnd("education", { education: profile.education }),
          })}
        >
          {error && <Notice>{error}</Notice>}
          <EducationCards
            items={profile.education}
            onChange={(education) => setProfile((p) => ({ ...p, education }))}
          />
        </WizardShell>
      );

    // ---- 9/12 — Languages (E016, English default) ----------------------
    case "languages": {
      const langs =
        profile.languages.length > 0
          ? profile.languages
          : [{ name: "English", level: null }];

      const update = (i: number, patch: Partial<LanguageDraft>) =>
        setProfile((p) => ({
          ...p,
          languages: langs.map((l, n) => (n === i ? { ...l, ...patch } : l)),
        }));

      return (
        <WizardShell
          {...shell({
            title: "What languages do you speak?",
            subtitle: "All profiles include English. Add any others you work in.",
            onContinue: () => saveAnd("languages", { languages: langs }),
            continueDisabled: langs.length === 0,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="space-y-3">
            {langs.map((l, i) => (
              <div
                key={`${l.name}-${i}`}
                className="flex flex-wrap items-end gap-3 rounded-brand border border-line p-4"
              >
                <div className="min-w-[180px] flex-1">
                  <Field label={i === 0 ? "Language" : "Language"}>
                    <TextInput
                      value={l.name}
                      readOnly={i === 0}
                      className={i === 0 ? "bg-bg-soft text-ink-2" : ""}
                      onChange={(e) => update(i, { name: e.target.value })}
                      placeholder="Spanish"
                    />
                  </Field>
                </div>
                <div className="min-w-[180px] flex-1">
                  <Field label="Proficiency">
                    <select
                      value={l.level ?? ""}
                      onChange={(e) => update(i, { level: e.target.value || null })}
                      className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta"
                    >
                      <option value="">Select…</option>
                      {LANGUAGE_LEVELS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                {i > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setProfile((p) => ({
                        ...p,
                        languages: langs.filter((_, n) => n !== i),
                      }))
                    }
                    className="pb-3 text-[14px] font-bold text-ink-2 hover:text-red-600"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() =>
              setProfile((p) => ({
                ...p,
                languages: [...langs, { name: "", level: null }],
              }))
            }
            className="mt-4 rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
          >
            + Add a Language
          </button>
        </WizardShell>
      );
    }

    // ---- 10/12 — Bio (E017, min length) --------------------------------
    case "bio": {
      const len = profile.overview.trim().length;
      const left = MAX_BIO - profile.overview.length;
      return (
        <WizardShell
          {...shell({
            title: "Tell clients what you do",
            subtitle:
              "Help people get to know you. What work do you do best? Tell them clearly, using paragraphs or bullet points. You can always edit later; just make sure you proofread now.",
            onContinue: () => saveAnd("bio", { overview: profile.overview }),
            continueDisabled: len < MIN_BIO,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <TextArea
            value={profile.overview}
            onChange={(e) => setProfile((p) => ({ ...p, overview: e.target.value }))}
            maxLength={MAX_BIO}
            className="min-h-56"
            placeholder="I help organizations implement and optimize…"
          />
          <div className="mt-2 flex justify-between text-[13px]">
            <span className={len < MIN_BIO ? "text-red-700" : "text-ink-2"}>
              {len < MIN_BIO
                ? `At least ${MIN_BIO} characters — ${MIN_BIO - len} to go.`
                : "Looks good."}
            </span>
            <span className="text-ink-2">{left} characters left</span>
          </div>
        </WizardShell>
      );
    }

    // ---- 11/12 — Rate (E018) -------------------------------------------
    case "rate": {
      const { rate, fee, youGet } = rateBreakdown(
        profile.hourlyRateCents,
        profile.serviceFeeBps
      );
      return (
        <WizardShell
          {...shell({
            title: "Tell clients what you charge",
            subtitle: "You can change your rate any time.",
            onContinue: () =>
              saveAnd("rate", {
                hourlyDollars:
                  profile.hourlyRateCents != null ? profile.hourlyRateCents / 100 : "",
              }),
            continueDisabled: !profile.hourlyRateCents,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <div className="max-w-md space-y-5">
            <Field
              label="Hourly Rate"
              hint="Total amount the client will see."
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[15px] font-bold text-ink-2">
                  $
                </span>
                <TextInput
                  type="number"
                  min="0"
                  step="0.01"
                  className="pl-8"
                  value={
                    profile.hourlyRateCents != null
                      ? String(profile.hourlyRateCents / 100)
                      : ""
                  }
                  onChange={(e) =>
                    setProfile((p) => ({
                      ...p,
                      hourlyRateCents:
                        e.target.value === ""
                          ? null
                          : Math.round(Number(e.target.value) * 100),
                    }))
                  }
                  placeholder="125.00"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] text-ink-2">
                  /hr
                </span>
              </div>
            </Field>

            <div className="rounded-brand border border-line p-5">
              <Row
                label={`Service fee (${bpsToPercentLabel(profile.serviceFeeBps)})`}
                value={fee != null ? `−${formatCents(fee)}` : "—"}
              />
              <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
                This helps us run the platform and provide services like payment
                protection and customer support. Fees vary and are shown before
                contract acceptance.{" "}
                <span className="font-semibold text-magenta">Learn more</span>
              </p>
              <div className="mt-4 border-t border-line pt-4">
                <Row
                  label="You'll get"
                  value={youGet != null ? `${formatCents(youGet)}/hr` : "—"}
                  strong
                />
                <p className="mt-1 text-[13px] text-ink-2">
                  The estimated amount you&apos;ll receive after service fees.
                </p>
              </div>
              {rate != null && (
                <p className="mt-3 text-[13px] text-ink-2">
                  Clients see {formatCents(rate)}/hr.
                </p>
              )}
            </div>
          </div>
        </WizardShell>
      );
    }

    // ---- 12/12 — "You're Done!" finish page (E019) ---------------------
    case "finish": {
      const addr = profile.address ?? emptyAddress(acct.country);
      const setAddr = (patch: Partial<AddressDraft>) =>
        setProfile((p) => ({ ...p, address: { ...addr, ...patch } }));

      return (
        <WizardShell
          {...shell({
            title: "You're Done!",
            subtitle: "Add a few more details and publish your profile.",
            onContinue: publish,
            continueLabel: "Publish Profile",
            continueDisabled: busy,
          })}
        >
          {error && <Notice>{error}</Notice>}

          <div className="space-y-8">
            {/* Photo */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold">Add Your Photo</h2>
              <div className="flex items-center gap-5">
                <Avatar
                  firstName={profile.firstName}
                  lastName={profile.lastName}
                  photoUrl={profile.photoUrl}
                  size={80}
                />
                <div>
                  <button
                    type="button"
                    onClick={() => setPhotoModal(true)}
                    className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta"
                  >
                    {profile.photoUrl ? "Replace Photo" : "Add Your Photo"}
                  </button>
                  <p className="mt-2 max-w-sm text-[13px] text-ink-2">
                    Must be an actual photo of you — no logos, clip-art, group
                    photos, or altered images.
                  </p>
                </div>
              </div>
            </section>

            {/* Date of birth */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold">Date of Birth *</h2>
              <div className="max-w-xs">
                <TextInput
                  type="date"
                  value={profile.dateOfBirth ?? ""}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, dateOfBirth: e.target.value || null }))
                  }
                />
              </div>
            </section>

            {/* Address */}
            <section>
              <h2 className="mb-3 text-[16px] font-bold">Where You&apos;re Based</h2>
              <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Field label="Country *">
                    <TextInput
                      value={addr.country}
                      onChange={(e) => setAddr({ country: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Street Address *">
                    <TextInput
                      value={addr.line1}
                      onChange={(e) => setAddr({ line1: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Apt / Suite">
                    <TextInput
                      value={addr.line2}
                      onChange={(e) => setAddr({ line2: e.target.value })}
                    />
                  </Field>
                </div>
                <Field label="City *">
                  <TextInput
                    value={addr.city}
                    onChange={(e) => setAddr({ city: e.target.value })}
                  />
                </Field>
                <Field label="State / Province *">
                  <TextInput
                    value={addr.state}
                    onChange={(e) => setAddr({ state: e.target.value })}
                  />
                </Field>
                <Field label="ZIP / Postal Code *">
                  <TextInput
                    value={addr.postalCode}
                    onChange={(e) => setAddr({ postalCode: e.target.value })}
                  />
                </Field>
              </div>
            </section>

            {/* Phone + SMS verification */}
            <section>
              <h2 className="mb-1 text-[16px] font-bold">Phone *</h2>
              <p className="mb-3 text-[14px] text-ink-2">
                Please verify your phone number.
              </p>
              <div className="max-w-md space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="min-w-[220px] flex-1">
                    <Field label="Phone Number">
                      <TextInput
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+1 555 010 4477"
                        disabled={profile.phoneVerified}
                        className={profile.phoneVerified ? "bg-bg-soft text-ink-2" : ""}
                      />
                    </Field>
                  </div>
                  {profile.phoneVerified ? (
                    <button
                      type="button"
                      onClick={() => {
                        setProfile((p) => ({ ...p, phoneVerified: false }));
                        setPhoneMsg(null);
                      }}
                      className="mb-[2px] rounded-full border-[1.5px] border-line px-5 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2]"
                    >
                      Change
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={sendCode}
                      disabled={busy || phoneInput.trim() === ""}
                      className="mb-[2px] rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
                    >
                      Send Code
                    </button>
                  )}
                </div>

                {profile.phoneVerified && (
                  <p className="text-[14px] font-semibold text-emerald-600">
                    ✓ Phone Verified
                  </p>
                )}

                {codeSent && !profile.phoneVerified && (
                  <div className="flex flex-wrap items-end gap-3">
                    <div className="min-w-[160px]">
                      <Field label="6-Digit Code">
                        <TextInput
                          inputMode="numeric"
                          maxLength={6}
                          value={codeInput}
                          onChange={(e) => setCodeInput(e.target.value)}
                          placeholder="000000"
                        />
                      </Field>
                    </div>
                    <button
                      type="button"
                      onClick={verifyCode}
                      disabled={busy || codeInput.length < 6}
                      className="mb-[2px] rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
                    >
                      Verify
                    </button>
                  </div>
                )}

                {devCode && (
                  <Notice tone="info">
                    SMS isn&apos;t configured on this environment. Your code is{" "}
                    <b>{devCode}</b>.
                  </Notice>
                )}
                {phoneMsg && !devCode && <Notice tone="info">{phoneMsg}</Notice>}
              </div>
            </section>
          </div>

          <PhotoCropModal
            open={photoModal}
            onClose={() => setPhotoModal(false)}
            onUploaded={(photoUrl) => setProfile((p) => ({ ...p, photoUrl }))}
          />
        </WizardShell>
      );
    }
  }

  return null;
}

/** Pre-verification chrome: logo only, deliberately NO stepper (E001). */
function PlainShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white font-body text-ink">
      <header className="border-b border-line px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center">
          <Logo priority />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10 sm:py-14">
        {children}
      </main>
    </div>
  );
}

function MethodCard({
  title,
  description,
  onClick,
  primary = false,
  badge,
}: {
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "w-full rounded-brand border-2 p-5 text-left transition-all hover:border-magenta hover:shadow-brand " +
        (primary ? "border-magenta bg-magenta/[0.04] shadow-brand" : "border-line")
      }
    >
      <span className="flex items-center gap-2">
        <span className="font-bold">{title}</span>
        {badge && (
          <span className="rounded-full bg-magenta px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
            {badge}
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-[14.5px] text-ink-2">{description}</span>
    </button>
  );
}

/**
 * "Here's what we captured — confirm or fix" (brief_Q / E012+E019).
 *
 * The anti-drop-off lever is that the remaining steps become a REVIEW. Showing
 * the counts and the gaps immediately after the upload — rather than only on
 * the final review page — tells the user what they still need to touch.
 */
function ImportSummary({ outcome }: { outcome: ImportOutcome }) {
  const a = outcome.applied;
  const captured: string[] = [];
  if (a.headline) captured.push("your title");
  if (a.overview) captured.push("your bio");
  if (a.experienceLevel) {
    captured.push(
      `experience level (${a.experienceYears ?? "?"} yrs → ${LEVEL_LABELS[a.experienceLevel] ?? a.experienceLevel})`
    );
  }
  if (a.experiences) captured.push(`${a.experiences} role${a.experiences === 1 ? "" : "s"}`);
  if (a.education)
    captured.push(`${a.education} education entr${a.education === 1 ? "y" : "ies"}`);
  if (a.skillsMatched)
    captured.push(`${a.skillsMatched} skill${a.skillsMatched === 1 ? "" : "s"}`);
  if (a.languages)
    captured.push(`${a.languages} language${a.languages === 1 ? "" : "s"}`);

  return (
    <div className="rounded-brand border border-line p-5">
      <h2 className="text-[16px] font-bold">Here&apos;s What We Captured</h2>
      {captured.length > 0 ? (
        <p className="mt-1.5 text-[14.5px] text-ink-2">
          We filled in {captured.join(", ")}. Continue through the next steps to
          confirm or fix anything.
        </p>
      ) : (
        <p className="mt-1.5 text-[14.5px] text-ink-2">
          We couldn&apos;t pull anything usable out of that file — the steps
          ahead will let you enter your details directly.
        </p>
      )}

      {a.skillsMatchedNames.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {a.skillsMatchedNames.slice(0, 12).map((s) => (
            <span
              key={s}
              className="rounded-full border border-line px-3 py-1 text-[13px] font-semibold text-ink-2"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      {outcome.gaps.length > 0 && (
        <div className="mt-4 rounded-[10px] border border-amber-500/30 bg-amber-50/60 p-4">
          <p className="text-[14px] font-bold">Needs your attention</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-[13.5px] text-ink-2">
            {outcome.gaps.map((g, i) => (
              <li key={i}>{g}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

const LEVEL_LABELS: Record<string, string> = {
  BEGINNER: "Beginner",
  MID_CAREER: "Mid-Career",
  EXPERT: "Expert",
};

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={strong ? "font-bold" : "text-ink-2"}>{label}</span>
      <span className={strong ? "text-[18px] font-extrabold" : "font-semibold"}>
        {value}
      </span>
    </div>
  );
}
