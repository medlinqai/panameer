"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { VerifyGate } from "@/components/onboarding/VerifyGate";
import { SignUpForm, type SignUpValues } from "@/components/onboarding/SignUpForm";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
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
import { type CertificationDraft } from "@/components/onboarding/CertificationsEditor";
import { CertificationCards } from "@/components/onboarding/CertificationCards";
import {
  EmployersStep,
  type EmployerCard,
} from "@/components/onboarding/EmployersStep";
import {
  ResumeUploadModal,
  type ImportOutcome,
} from "@/components/onboarding/ResumeUploadModal";
import { ResumeDropzone } from "@/components/onboarding/ResumeDropzone";
import { PhotoCropModal } from "@/components/onboarding/PhotoCropModal";
import { TestimonialCard, DECK_TESTIMONIALS } from "@/components/onboarding/TestimonialCarousel";
import {
  ProfileCard,
  ProfileHeaderCard,
  EditButton,
  Empty,
  VerificationsBody,
  LanguagesBody,
  EducationBody,
  SpecializationsBody,
  OverviewBody,
  SkillsBody,
  ProjectsBody,
  WorkHistoryBody,
} from "@/components/profile/sections";
import {
  reviewItems,
  splitReviewItems,
  type ReviewItem,
  type ReviewFix,
} from "@/lib/review-validation";
import {
  formatCents,
  bpsToPercentLabel,
  rateBreakdown,
  displayFirstName,
} from "@/lib/display";

/**
 * Provider (Seller) onboarding — journey P1-J1 (brief_P, extended by brief_R).
 *
 * Shape:
 *   PRE-VERIFY  (no stepper, E001): sign up → "check your email"
 *   then        /verify-email → /join/provider/start ("Get Started Now!", E002)
 *   POST-VERIFY (stepper x/13, E003/E010): the 13 profile steps, ending on the
 *               one-page review (step 12) → Publish → the live Profile View
 *
 * brief_R added the Specializations step at position 8, taking the count from
 * 12 to 13.
 *
 * Every step saves on Continue (save-as-you-go, brief_E) and the server derives
 * the resume point, so there is no progress column to keep in sync.
 */

/** The 13 profile steps, in order. Must mirror PROVIDER_STEPS server-side. */
const STEPS = [
  "experience_level",
  "goal",
  "work_method",
  "title",
  "tell_us",
  "employers",
  "catalog",
  "specializations",
  "education",
  "languages",
  "bio",
  "rate",
  "finish",
] as const;
type Step = (typeof STEPS)[number];
type Screen = "signup" | "check_email" | Step;

const TOTAL = STEPS.length; // 13 (brief_U — employers step added)

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

/**
 * Stepper heading + forward-button label per step — the exact strings from
 * brief_S's table. Mirrors PROVIDER_STEP_LABELS in onboarding.ts.
 */
const STEP_LABELS: Record<Step, { stepper: string; next: string }> = {
  experience_level: { stepper: "Your Experience", next: "Next: Your Goal" },
  goal: { stepper: "Your Goal", next: "Next: What Do You Sell" },
  work_method: { stepper: "What Do You Sell", next: "Next: Your Title" },
  title: { stepper: "Your Title", next: "Next: Create Your Profile" },
  tell_us: { stepper: "Create Your Profile", next: "Next: Your Employers" },
  employers: { stepper: "Your Employers", next: "Next: Role → Domain → Skills" },
  catalog: { stepper: "Role → Domain → Skills", next: "Next: Your Specializations" },
  specializations: { stepper: "Your Specializations", next: "Next: Education" },
  education: { stepper: "Your Education", next: "Next: Languages" },
  languages: { stepper: "Your Languages", next: "Next: Your Bio" },
  bio: { stepper: "Your Bio", next: "Next: Your Rate" },
  rate: { stepper: "Your Rate", next: "Next: Profile Review" },
  finish: { stepper: "Review Your Profile", next: "Next: Publish Your Profile" },
};

const MIN_BIO = 100;
const MAX_BIO = 4500;
const MAX_SKILLS = 15;
/** E030 — never show more than ~15 options at once on the cascade page. */
const MAX_VISIBLE_OPTIONS = 15;

/**
 * Bounded pickers (brief_Y / E053+E054).
 *
 * THE RULE: a wizard step's height must not depend on how big the catalog is.
 * The service catalog is meant to grow without limit — Scott's "race without a
 * finish" — so any step that renders it needs TWO independent bounds:
 *
 *   1. a COUNT cap on how many suggestions are rendered, with a
 *      "+N more — keep typing to narrow" affordance, and
 *   2. a fixed-height, internally-scrolling region, so even the capped set
 *      cannot push the footer and its Continue button off-screen.
 *
 * Either alone is insufficient: a cap with no height bound still grows when
 * chips wrap onto more lines, and a height bound with no cap renders hundreds
 * of nodes the provider will never scroll through.
 */
const MAX_SKILL_SUGGESTIONS = 12;
/** Per GROUP, so every specialization section stays represented (E054). */
const MAX_SPECS_PER_GROUP = 6;

/**
 * A fixed-height scroll region. `overscroll-contain` keeps a scroll gesture
 * that reaches the end of this list from continuing on to scroll the page —
 * otherwise bounding the height just moves the jumpiness somewhere else.
 */
const SCROLL_REGION =
  "overflow-y-auto overscroll-contain rounded-[12px] border border-line/70 bg-bg-soft/40 p-3";

/**
 * The PICKED chips wrap (brief_Y keeps them wrapping) — but inside a bound, or
 * the step just moves its growth problem from the suggestion list to the
 * selection list: 15 skills wrap to five rows and push the footer off-screen
 * exactly as the unbounded catalog did. Capped at ~2 rows, unpadded so a single
 * row costs nothing.
 */
const PICKED_REGION = "max-h-[84px] overflow-y-auto overscroll-contain pr-1";

/** The shape `/api/onboarding/status` returns. Only what this page reads. */
type ProfilePayload = {
  experienceLevel?: string | null;
  goal?: string | null;
  workMethod?: string | null;
  profileMethod?: string | null;
  pillarId?: string | null;
  pillarName?: string | null;
  roleTypeId?: string | null;
  roleTypeName?: string | null;
  specializationIds?: string[];
  specializations?: { id: string; name: string; kind: string }[];
  employers?: EmployerCard[];
  /**
   * The FULL certification row. brief_X / E057 — this used to list only half
   * the columns the server sends, so `hydrate` re-seeded the draft without
   * `issuedOn`, `notes` or the attachment. Because certifications save by
   * replacing the whole collection, the next save then wrote those columns back
   * as null: attach a certificate, edit anything else, and the attachment was
   * gone. Every column the server returns is mirrored here.
   */
  certifications?: {
    id: string;
    name: string;
    issuer: string | null;
    year: number | null;
    issuedOn: string | null;
    credentialId: string | null;
    url: string | null;
    expiresOn: string | null;
    attachmentPath: string | null;
    attachmentName: string | null;
    notes: string | null;
  }[];
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

/** The Role → Domain tree behind step 6 (brief_R). */
type FieldDomain = { id: string; code: string; name: string; skillCount: number };
type FieldRole = {
  id: string;
  code: string;
  name: string;
  display: string;
  domains: FieldDomain[];
};
type SpecializationGroup = {
  kind: string;
  label: string;
  items: { id: string; name: string; kind: string }[];
};
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
  roleTypeId: string | null;
  roleTypeName: string | null;
  specializationIds: string[];
  /** Names of the selected specializations, for chip rendering (E038). */
  specializationNames: { id: string; name: string }[];
  /** Typed-in specializations not yet in the vocabulary (E031). */
  customSpecializations: string[];
  certifications: CertificationDraft[];
  employers: EmployerCard[];
  skillIds: string[];
  skillNames: { id: string; name: string }[];
  /** Typed-in skills not yet in the catalog (E031). */
  customSkills: string[];
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
  roleTypeId: null,
  roleTypeName: null,
  specializationIds: [],
  specializationNames: [],
  customSpecializations: [],
  certifications: [],
  skillIds: [],
  skillNames: [],
  customSkills: [],
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
  employers: [],
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
  const [fieldRoles, setFieldRoles] = useState<FieldRole[]>([]);
  const [specGroups, setSpecGroups] = useState<SpecializationGroup[]>([]);
  const [skillOpts, setSkillOpts] = useState<SkillOpt[]>([]);
  const [skillQuery, setSkillQuery] = useState("");
  const [specQuery, setSpecQuery] = useState("");
  /**
   * E057 — bumping this asks the review page's certification editor to open its
   * add-modal. A counter rather than a boolean so the "Add certification"
   * click-to-fix works the second and third time it's clicked, not just once.
   */
  const [certSignal, setCertSignal] = useState(0);

  const [importOutcome, setImportOutcome] = useState<ImportOutcome | null>(null);
  const [uploadModal, setUploadModal] = useState<null | "RESUME" | "LINKEDIN_PDF">(null);
  const [photoModal, setPhotoModal] = useState(false);

  /**
   * Phone number (E019, verification STUBBED by E036). The SMS
   * challenge/response server-side is intact (`phone-verification.ts`) — only
   * the client-side code entry is retired while the stub is in place.
   */
  const [phoneInput, setPhoneInput] = useState("");

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
      roleTypeId: p.roleTypeId ?? null,
      roleTypeName: p.roleTypeName ?? null,
      specializationIds: p.specializationIds ?? [],
      specializationNames: (p.specializations ?? []).map((x) => ({
        id: x.id,
        name: x.name,
      })),
      // Server-side these have been folded into the real vocabularies.
      customSpecializations: [],
      customSkills: [],
      employers: (p.employers ?? []) as EmployerCard[],
      // E057 — carry EVERY column through. See the payload type above: a
      // partial map here is a silent delete on the next save.
      certifications: (p.certifications ?? []).map((c) => ({
        name: c.name,
        issuer: c.issuer,
        year: c.year,
        issuedOn: c.issuedOn,
        credentialId: c.credentialId,
        url: c.url,
        expiresOn: c.expiresOn,
        attachmentPath: c.attachmentPath,
        attachmentName: c.attachmentName,
        notes: c.notes,
      })),
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
    if (screen === "catalog" && fieldRoles.length === 0) {
      fetch("/api/catalog/fields")
        .then((r) => r.json())
        .then((d) => setFieldRoles(d.roles ?? []))
        .catch(() => setError("We couldn't load the categories. Please refresh."));
    }
    if (screen === "specializations" && specGroups.length === 0) {
      fetch("/api/catalog/specializations")
        .then((r) => r.json())
        .then((d) => setSpecGroups(d.groups ?? []))
        .catch(() =>
          setError("We couldn't load specializations. Please refresh.")
        );
    }
  }, [screen, fieldRoles.length, specGroups.length]);

  useEffect(() => {
    // Skills load as soon as a (Role, Domain) is chosen on the combined page.
    if (screen !== "catalog" || !profile.pillarId || !profile.roleTypeId) return;
    fetch(
      `/api/catalog/skills?roleTypeId=${profile.roleTypeId}&pillarId=${profile.pillarId}`
    )
      .then((r) => r.json())
      .then((d) => setSkillOpts(d.skills ?? []))
      .catch(() => setError("We couldn't load skills. Please refresh."));
  }, [screen, profile.pillarId, profile.roleTypeId]);

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

  /**
   * Certifications are a profile SECTION, not one of the 13 wizard steps, so
   * they save through the owner-scoped section endpoint (the step route
   * deliberately only accepts PROVIDER_STEPS). Optional — a failure here never
   * blocks publishing.
   *
   * E057 — takes the list to write as an ARGUMENT. It used to read
   * `profile.certifications` out of the closure, which is only correct while
   * the save is a separate click from the edit; the modal saves in the same
   * handler that produces the new list, and a closure read there would persist
   * the version before the edit.
   */
  const saveCertifications = async (
    certifications: CertificationDraft[]
  ): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/settings/profile/section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "certifications",
          data: { certifications },
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(body.error ?? "Could not save certifications.");
        return false;
      }
      // Refresh from the server so the list reflects what was actually stored.
      const status = await fetch("/api/onboarding/status");
      if (status.ok) hydrate(await status.json());
      return true;
    } finally {
      setBusy(false);
    }
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

  const publish = async () => {
    setError(null);
    setBusy(true);
    try {
      // Persist whatever the finish page holds before the required-field gate.
      await postStep("finish", {
        dateOfBirth: profile.dateOfBirth,
        address: profile.address,
        // E036 — phone verification is stubbed: the number is saved with the
        // rest of the details and publishing no longer waits on an SMS code.
        phone: phoneInput,
      });
      const r = await fetch("/api/onboarding/provider/publish", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not publish your profile.");
        return;
      }
      // The review IS step 12 now (E035), so publishing lands the provider on
      // their live Profile View — which is the dashboard (E037).
      router.push("/dashboard");
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
    // compact — the sign-up form is the one pre-verify page long enough to run
    // off the bottom of a laptop screen (E047).
    return (
      <PlainShell compact>
        {inviteCtx && (
          <div className="mx-auto mb-4 max-w-xl">
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
        {/* E048 — centred title, same 28px as sign-up. All three pre-verify
            pages (role select, sign up, check email) share one format. */}
        <div className="mx-auto w-full max-w-md">
          <h1 className="text-center text-[28px] font-extrabold tracking-[-0.6px]">
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
  // Exact stepper heading + "Next: …" label per brief_S's table (E024–E035).
  const labels = STEP_LABELS[screen as Step];
  const shell = (props: Partial<React.ComponentProps<typeof WizardShell>> & { title: string }) => ({
    step: stepNumber,
    totalSteps: TOTAL,
    stepLabel: labels?.stepper,
    continueLabel: labels?.next,
    busy,
    onBack: stepIndex > 0 ? goBack : undefined,
    canBack: stepIndex > 0,
    ...props,
  });

  switch (screen) {
    // ---- 1/12 — Experience (E003) -------------------------------------
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

    // ---- 2/12 — Goal (E004) -------------------------------------------
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

    // ---- 3/12 — How Do You Work? (E009) -------------------------------
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

    // ---- 4/12 — Title (E011) ------------------------------------------
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

    // ---- 5/12 — Tell us about yourself (E012/E029) --------------------
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

          {/*
            E029 — the upload control is INLINE and visible on arrival. It used
            to be hidden behind a card that opened a modal, and the Run-2 walk
            reported no control present at all.
          */}
          <section className="mb-6 rounded-brand border-2 border-magenta bg-magenta/[0.04] p-5 shadow-brand">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[17px]">Upload Your Resume</h2>
              <span className="rounded-full bg-magenta px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
                Fastest
              </span>
            </div>
            <p className="mb-4 text-[14.5px] text-ink-2">
              We&apos;ll read it and fill in your title, experience, education,
              skills and languages — you just confirm.
            </p>
            <ResumeDropzone
              onImported={(outcome) => {
                setImportOutcome(outcome);
                if (outcome.state) hydrate(outcome.state as StatusPayload);
              }}
            />
          </section>

          <div className="space-y-3">
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

    // ---- 6/13 — Your Employers (brief_U capture step) ------------------
    case "employers":
      return (
        <WizardShell
          {...shell({
            title:
              "Here's what you've told us about your employers (click the employer to add projects within the job).",
            subtitle:
              "The more you tell us, the better: service providers who add work experience and projects are twice as likely to win work.",
            wide: true,
            secondaryLabel: "Skip for Now",
            onSecondary: goNext,
            onContinue: () => saveAnd("employers", {}),
          })}
        >
          {error && <Notice>{error}</Notice>}
          <EmployersStep
            employers={profile.employers}
            onChanged={(employers) => setProfile((p) => ({ ...p, employers }))}
            onError={setError}
          />
        </WizardShell>
      );

    // ---- 7/13 — Role → Domain → Skills, ONE cascading page (E030) ------
    case "catalog": {
      const chosenSkills = new Set(profile.skillIds);
      const atMaxSkills = profile.skillIds.length >= MAX_SKILLS;
      const activeRole = fieldRoles.find((r) => r.id === profile.roleTypeId);

      const q = skillQuery.trim().toLowerCase();
      // Already-picked skills are shown as chips above, so they are not
      // suggestions any more — filtering them out BEFORE the cap means the
      // suggestion set stays a full 12 usable options as picks accumulate,
      // instead of quietly thinning out.
      const matchingSkills = (
        q ? skillOpts.filter((s) => s.name.toLowerCase().includes(q)) : skillOpts
      ).filter((s) => !chosenSkills.has(s.id));
      // E053 — hard cap; the rest stay behind "keep typing to narrow".
      const shownSkills = matchingSkills.slice(0, MAX_SKILL_SUGGESTIONS);
      const hiddenSkillCount = matchingSkills.length - shownSkills.length;

      const pickRole = (role: FieldRole) =>
        setProfile((p) => ({
          ...p,
          roleTypeId: role.id,
          roleTypeName: role.name,
          // Changing role invalidates the domain and everything below it.
          pillarId: null,
          pillarName: null,
          skillIds: [],
          skillNames: [],
        }));

      const pickDomain = (d: FieldDomain) =>
        setProfile((p) => ({
          ...p,
          pillarId: d.id,
          pillarName: d.name,
          skillIds: [],
          skillNames: [],
        }));

      const toggleSkill = (id: string) =>
        setProfile((p) => {
          const has = p.skillIds.includes(id);
          if (!has && p.skillIds.length >= MAX_SKILLS) return p;
          const name = skillOpts.find((x) => x.id === id)?.name ?? "";
          return {
            ...p,
            skillIds: has ? p.skillIds.filter((x) => x !== id) : [...p.skillIds, id],
            skillNames: has
              ? p.skillNames.filter((x) => x.id !== id)
              : [...p.skillNames, { id, name }],
          };
        });

      const addCustomSkill = () => {
        const name = skillQuery.trim();
        if (!name || atMaxSkills) return;
        if (
          profile.customSkills.some((c) => c.toLowerCase() === name.toLowerCase()) ||
          profile.skillNames.some((c) => c.name.toLowerCase() === name.toLowerCase())
        ) {
          setSkillQuery("");
          return;
        }
        setProfile((p) => ({ ...p, customSkills: [...p.customSkills, name] }));
        setSkillQuery("");
      };

      const totalPicked = profile.skillIds.length + profile.customSkills.length;

      return (
        <WizardShell
          {...shell({
            title: "What work are you here to do?",
            onContinue: () =>
              saveAnd("catalog", {
                roleTypeId: profile.roleTypeId,
                pillarId: profile.pillarId,
                skillIds: profile.skillIds,
                customSkills: profile.customSkills,
              }),
            continueDisabled:
              !profile.roleTypeId || !profile.pillarId || totalPicked === 0,
          })}
        >
          {error && <Notice>{error}</Notice>}

          {/*
            E030 — a cascade, not three long lists: Role reveals its Domains,
            Domain reveals its Skills. Each tier collapses to a summary row once
            chosen, so the page never shows more than one open list at a time.
          */}
          <div className="space-y-2.5">
            <CascadeTier
              index={1}
              label="Role"
              chosen={activeRole?.name ?? null}
              onChange={() =>
                setProfile((p) => ({
                  ...p,
                  roleTypeId: null,
                  roleTypeName: null,
                  pillarId: null,
                  pillarName: null,
                  skillIds: [],
                  skillNames: [],
                }))
              }
            >
              {fieldRoles.length === 0 ? (
                <p className="text-ink-2">Loading roles…</p>
              ) : (
                // Bounded for the same reason as the Skills tier. With today's
                // four roles nothing scrolls and this is invisible; it is what
                // keeps the step single-page when the taxonomy grows.
                <div className={`max-h-[320px] ${SCROLL_REGION}`}>
                  <div className="space-y-3">
                    {fieldRoles.map((r) => (
                      <OptionCard
                        key={r.id}
                        selected={profile.roleTypeId === r.id}
                        onClick={() => pickRole(r)}
                        title={r.name}
                        description={`${r.domains.length} area${r.domains.length === 1 ? "" : "s"} of work`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </CascadeTier>

            {profile.roleTypeId && (
              <CascadeTier
                index={2}
                label="Domain"
                chosen={profile.pillarName}
                onChange={() =>
                  setProfile((p) => ({
                    ...p,
                    pillarId: null,
                    pillarName: null,
                    skillIds: [],
                    skillNames: [],
                  }))
                }
              >
                <div className={`max-h-[320px] ${SCROLL_REGION}`}>
                  <div className="space-y-3">
                    {(activeRole?.domains ?? [])
                      .slice(0, MAX_VISIBLE_OPTIONS)
                      .map((d) => (
                        <OptionCard
                          key={d.id}
                          selected={profile.pillarId === d.id}
                          onClick={() => pickDomain(d)}
                          title={d.name}
                          description={`${d.skillCount} skill${d.skillCount === 1 ? "" : "s"}`}
                        />
                      ))}
                  </div>
                </div>
              </CascadeTier>
            )}

            {profile.roleTypeId && profile.pillarId && (
              <CascadeTier index={3} label="Skills" chosen={null}>
                {(profile.skillNames.length > 0 ||
                  profile.customSkills.length > 0) && (
                  <div className="mb-2">
                    <p className="mb-1.5 text-[13px] font-bold">
                      Your Skills{" "}
                      <span className="font-normal text-ink-2">
                        ({totalPicked}/{MAX_SKILLS})
                      </span>
                    </p>
                    <div className={`flex flex-wrap gap-2 ${PICKED_REGION}`}>
                      {profile.skillNames.map((sk) => (
                        <Chip key={sk.id} selected onClick={() => toggleSkill(sk.id)}>
                          {sk.name}
                        </Chip>
                      ))}
                      {profile.customSkills.map((name) => (
                        <Chip
                          key={`custom:${name}`}
                          selected
                          onClick={() =>
                            setProfile((p) => ({
                              ...p,
                              customSkills: p.customSkills.filter((c) => c !== name),
                            }))
                          }
                        >
                          {name}
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Field label={`Search or Add a Skill (up to ${MAX_SKILLS})`}>
                      <TextInput
                        value={skillQuery}
                        onChange={(e) => setSkillQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomSkill();
                          }
                        }}
                        placeholder="Start typing…"
                      />
                    </Field>
                  </div>
                  <button
                    type="button"
                    onClick={addCustomSkill}
                    disabled={!skillQuery.trim() || atMaxSkills}
                    className="mb-[2px] rounded-full border-[1.5px] border-line px-5 py-3 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta disabled:opacity-40"
                  >
                    + Add
                  </button>
                </div>

                {atMaxSkills && (
                  <div className="mt-3">
                    <Notice tone="info">
                      That&apos;s {MAX_SKILLS} — remove one to add another.
                    </Notice>
                  </div>
                )}

                {/* E053 — the suggestion set is BOUNDED in both directions:
                    capped to 12 chips, inside a fixed-height scroll region. An
                    80-skill domain and an 800-skill one render the same height,
                    so the Continue button never moves. */}
                <div className={`mt-3 max-h-[116px] ${SCROLL_REGION}`}>
                  <div className="flex flex-wrap gap-2">
                    {shownSkills.map((sk) => (
                      <Chip
                        key={sk.id}
                        selected={false}
                        onClick={() => toggleSkill(sk.id)}
                      >
                        {sk.name}
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
              </CascadeTier>
            )}
          </div>
        </WizardShell>
      );
    }


    // ---- 7/12 — Specializations (E031, optional + add-on-the-fly) -----
    case "specializations": {
      const chosenSpecs = new Set(profile.specializationIds);

      // Every loaded specialization, by id — so a SELECTED chip can be named
      // even when the search or the per-group cap has hidden its source row.
      const specById = new Map<string, string>();
      specGroups.forEach((g) =>
        g.items.forEach((i) => specById.set(i.id, i.name))
      );
      profile.specializationNames.forEach((s) => {
        if (!specById.has(s.id)) specById.set(s.id, s.name);
      });

      const sq = specQuery.trim().toLowerCase();

      /**
       * E054 — search-first and capped PER GROUP rather than overall. A single
       * overall cap would spend its whole budget on the first section and hide
       * the later ones completely; the sections are the part Scott singled out
       * as working, so each one keeps its own window into its list.
       *
       * Chosen items are excluded here because they are already rendered as
       * chips above — the same rule the Skills tier uses, so the suggestion
       * area stays full of things you can still act on.
       */
      const groups = specGroups
        .map((g) => {
          const matches = g.items.filter(
            (i) =>
              !chosenSpecs.has(i.id) && (!sq || i.name.toLowerCase().includes(sq))
          );
          return {
            ...g,
            shown: matches.slice(0, MAX_SPECS_PER_GROUP),
            hidden: Math.max(0, matches.length - MAX_SPECS_PER_GROUP),
          };
        })
        .filter((g) => g.shown.length > 0);

      const hiddenSpecCount = groups.reduce((n, g) => n + g.hidden, 0);
      const totalSpecs =
        profile.specializationIds.length + profile.customSpecializations.length;

      const addCustomSpec = () => {
        const name = specQuery.trim();
        if (!name) return;
        const dup =
          profile.customSpecializations.some(
            (c) => c.toLowerCase() === name.toLowerCase()
          ) ||
          [...specById.entries()].some(
            ([id, n]) => n.toLowerCase() === name.toLowerCase() && chosenSpecs.has(id)
          );
        if (!dup) {
          setProfile((p) => ({
            ...p,
            customSpecializations: [...p.customSpecializations, name],
          }));
        }
        setSpecQuery("");
      };

      const toggleSpec = (id: string) =>
        setProfile((p) => {
          const has = p.specializationIds.includes(id);
          const name = specById.get(id) ?? "";
          return {
            ...p,
            specializationIds: has
              ? p.specializationIds.filter((x) => x !== id)
              : [...p.specializationIds, id],
            // Keep the display names in step with the ids. The server resends
            // both on save, but until then the Review page reads these — and a
            // name list that lags its id list renders the wrong chips.
            specializationNames: has
              ? p.specializationNames.filter((x) => x.id !== id)
              : [...p.specializationNames, { id, name }],
          };
        });

      return (
        <WizardShell
          {...shell({
            title: "What are your specializations?",
            // E054 — one line. The old three-sentence version explained the
            // feature to someone who had already understood it from the title.
            subtitle: "The systems, processes and industries you've worked in.",
            secondaryLabel: "Skip for Now",
            onSecondary: goNext,
            onContinue: () =>
              saveAnd("specializations", {
                specializationIds: profile.specializationIds,
                customSpecializations: profile.customSpecializations,
              }),
          })}
        >
          {error && <Notice>{error}</Notice>}
          {specGroups.length === 0 ? (
            <p className="text-ink-2">Loading specializations…</p>
          ) : (
            <div>
              {/* Picked, always visible and always removable — it sits OUTSIDE
                  the scroll region so a selection can never be scrolled or
                  filtered out of reach. */}
              {totalSpecs > 0 && (
                <div className="mb-4">
                  <p className="mb-2 text-[13px] font-bold">
                    Your Specializations{" "}
                    <span className="font-normal text-ink-2">({totalSpecs})</span>
                  </p>
                  <div className={`flex flex-wrap gap-2 ${PICKED_REGION}`}>
                    {profile.specializationIds.map((id) => (
                      <Chip key={id} selected onClick={() => toggleSpec(id)}>
                        {specById.get(id) ?? "Specialization"}
                      </Chip>
                    ))}
                    {profile.customSpecializations.map((name) => (
                      <Chip
                        key={`custom:${name}`}
                        selected
                        onClick={() =>
                          setProfile((p) => ({
                            ...p,
                            customSpecializations: p.customSpecializations.filter(
                              (c) => c !== name
                            ),
                          }))
                        }
                      >
                        {name}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}

              {/* One control for both jobs, matching the Skills tier: type to
                  narrow, or type something we don't have and add it (E031). */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Field label="Search or Add a Specialization">
                    <TextInput
                      value={specQuery}
                      onChange={(e) => setSpecQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomSpec();
                        }
                      }}
                      placeholder="Start typing… e.g. Workday"
                    />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={addCustomSpec}
                  disabled={!specQuery.trim()}
                  className="mb-[2px] rounded-full border-[1.5px] border-line px-5 py-3 font-bold text-ink transition-colors hover:border-magenta hover:text-magenta disabled:opacity-40"
                >
                  + Add
                </button>
              </div>

              {/* The sections Scott liked, kept — but inside one fixed-height
                  scroll region so 24 specializations and 240 are the same
                  height on screen. */}
              <div className={`mt-3 max-h-[320px] ${SCROLL_REGION}`}>
                {groups.length === 0 ? (
                  <p className="text-[14px] text-ink-2">
                    {sq
                      ? "No matches — use “+ Add” to create it."
                      : "You've picked everything we list here."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {groups.map((g) => (
                      <div key={g.kind}>
                        <h2 className="mb-2 text-[13px] font-bold uppercase tracking-wide text-ink-2">
                          {g.label}
                          {g.hidden > 0 && (
                            <span className="ml-2 font-normal normal-case tracking-normal">
                              +{g.hidden} more
                            </span>
                          )}
                        </h2>
                        <div className="flex flex-wrap gap-2">
                          {g.shown.map((item) => (
                            <Chip
                              key={item.id}
                              selected={false}
                              onClick={() => toggleSpec(item.id)}
                            >
                              {item.name}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {hiddenSpecCount > 0 && (
                <p className="mt-2 text-[13px] text-ink-2">
                  +{hiddenSpecCount} more — keep typing to narrow the list.
                </p>
              )}
            </div>
          )}
        </WizardShell>
      );
    }

    // ---- 8/12 — Education (E015/E033, optional + Skip) ----------------
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

    // ---- 9/12 — Languages (E016/E034, both fields required) -----------
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
            // E034 — BOTH fields required: every row needs a name AND a level.
            continueDisabled:
              langs.length === 0 ||
              langs.some((l) => !l.name.trim() || !l.level),
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
                  <Field label="Language *">
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
                  <Field label="Proficiency *">
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

    // ---- 10/12 — Bio (E017, min length) -------------------------------
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

    // ---- 11/12 — Rate (E018, "You'll Get") -----------------------------
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
                  label="You'll Get"
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

    // ---- 13/13 — Review + publish (E035, rebuilt by brief_X / E056) ----
    //
    // The review IS the Profile View. E056: the old two-column card grid was a
    // second, thinner design for the same content, so what the provider
    // approved at the end of onboarding was not what buyers would see. It now
    // renders the SAME sections, from `components/profile/sections`, as the
    // published page — plus the two things only a pre-publish screen has:
    // per-section edit controls, and the errors/changes checklist that gates
    // Publish.
    //
    // Deliberately WITHOUT the post-publish promo widgets (Promote with ads,
    // Boost, Buy connects, Availability badge) and without Packages: those sell
    // a profile that is already live.
    case "finish": {
      const addr = profile.address ?? emptyAddress(acct.country);
      const setAddr = (patch: Partial<AddressDraft>) =>
        setProfile((p) => ({ ...p, address: { ...addr, ...patch } }));
      const { youGet } = rateBreakdown(
        profile.hourlyRateCents,
        profile.serviceFeeBps
      );

      const { errors, changes } = splitReviewItems(
        reviewItems({
          headline: profile.headline,
          overview: profile.overview,
          hourlyRateCents: profile.hourlyRateCents,
          pillarId: profile.pillarId,
          roleTypeId: profile.roleTypeId,
          skillIds: profile.skillIds,
          languages: profile.languages,
          dateOfBirth: profile.dateOfBirth,
          phone: phoneInput,
          photoUrl: profile.photoUrl,
          address: profile.address,
          employers: profile.employers,
          education: profile.education,
          certifications: profile.certifications,
          specializations: profile.specializationNames,
        })
      );

      /** Click-to-fix: jump to the step, focus the field, or open the modal. */
      const applyFix = (fix: ReviewFix) => {
        switch (fix.kind) {
          case "step":
            goTo(fix.step as Step);
            break;
          case "photo":
            setPhotoModal(true);
            break;
          case "certifications":
            setCertSignal((n) => n + 1);
            break;
          case "field": {
            const el = document.getElementById(`review-${fix.field}`);
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
            // The scroll is what makes the fix findable; the focus is what
            // makes it typeable. Delayed so it doesn't fight the smooth scroll.
            window.setTimeout(() => (el as HTMLInputElement | null)?.focus(), 350);
            break;
          }
        }
      };

      // The wizard draft has no standalone projects — during onboarding every
      // project is captured under the employer it was delivered for, which is
      // the same `Project` row the published page reads. Flatten them so the
      // review shows the Projects section the live profile shows.
      // The review renders the SAME ProjectCard the published profile does, so
      // every v2 field has to survive the flatten — including the visibility
      // rule, or a confidential client would show here and be redacted there.
      const projects = profile.employers.flatMap((e) =>
        (e.projects ?? []).map((pr) => ({
          ...pr,
          employer: e.name,
        }))
      );

      const editBtn = (title: string, step: Step) => (
        <EditButton title={title} onClick={() => goTo(step)} />
      );

      return (
        <WizardShell
          {...shell({
            title: `Looking good, ${displayFirstName(profile.firstName)}!`,
            subtitle:
              "This is exactly what buyers will see. Fix anything flagged below, then publish.",
            wide: true,
            onContinue: publish,
            // The gate itself is unchanged and still enforced server-side by
            // `publishProfile`; this only stops the provider from submitting a
            // request the server is certain to refuse.
            continueDisabled: busy || errors.length > 0,
          })}
        >
          {error && <Notice>{error}</Notice>}

          <ReviewChecklist errors={errors} changes={changes} onFix={applyFix} />

          {/* The soft page background the published profile sits on, so the
              white section cards read the same way here as they do there. */}
          <div className="mt-6 rounded-brand bg-bg-soft p-4 sm:p-5">
            <ProfileHeaderCard
              firstName={profile.firstName}
              lastName={profile.lastName}
              photoUrl={profile.photoUrl}
              headline={profile.headline}
              location={
                [addr.city, addr.state, addr.country]
                  .filter((x) => x && x.trim())
                  .join(", ") || null
              }
              field={
                profile.roleTypeName && profile.pillarName
                  ? { role: profile.roleTypeName, domain: profile.pillarName }
                  : null
              }
              experienceLevel={profile.experienceLevel}
              hourlyCents={profile.hourlyRateCents}
              youGetCents={youGet}
              aside={
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPhotoModal(true)}
                    className="text-[13.5px] font-bold text-magenta hover:text-magenta-dark"
                  >
                    {profile.photoUrl ? "Change Photo" : "+ Add Photo"}
                  </button>
                  <EditButton
                    title="Title and rate"
                    onClick={() => goTo("title")}
                    label="Edit title"
                  />
                  <EditButton
                    title="Rate"
                    onClick={() => goTo("rate")}
                    label="Edit rate"
                  />
                </div>
              }
            />

            <div className="mt-5 grid gap-5 lg:grid-cols-[260px_1fr] lg:items-start">
              {/* ---- Left rail ------------------------------------------ */}
              <aside className="space-y-5">
                {/* Verify identity. On the published profile this is a
                    read-only Verifications card; pre-publish it is where the
                    required identity fields are actually entered, so the
                    inputs live here rather than in a separate "Details" box
                    that has no counterpart on the live page. */}
                <ProfileCard title="Verify Identity">
                  <div className="space-y-3">
                    <Field label="Date of Birth *">
                      <TextInput
                        id="review-dateOfBirth"
                        type="date"
                        value={profile.dateOfBirth ?? ""}
                        onChange={(e) =>
                          setProfile((p) => ({
                            ...p,
                            dateOfBirth: e.target.value || null,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Phone *">
                      <TextInput
                        id="review-phone"
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+1 555 010 4477"
                      />
                    </Field>
                    <Field label="Street Address">
                      <TextInput
                        id="review-line1"
                        value={addr.line1}
                        onChange={(e) => setAddr({ line1: e.target.value })}
                      />
                    </Field>
                    <Field label="City">
                      <TextInput
                        id="review-city"
                        value={addr.city}
                        onChange={(e) => setAddr({ city: e.target.value })}
                      />
                    </Field>
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="State">
                        <TextInput
                          id="review-state"
                          value={addr.state}
                          onChange={(e) => setAddr({ state: e.target.value })}
                        />
                      </Field>
                      <Field label="ZIP">
                        <TextInput
                          id="review-postalCode"
                          value={addr.postalCode}
                          onChange={(e) =>
                            setAddr({ postalCode: e.target.value })
                          }
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-line pt-3">
                    <VerificationsBody
                      emailVerified
                      phoneOnFile={Boolean(phoneInput.trim())}
                      phoneVerified={profile.phoneVerified}
                    />
                  </div>
                </ProfileCard>

                <ProfileCard
                  title="Languages"
                  edit={editBtn("Languages", "languages")}
                >
                  <LanguagesBody languages={profile.languages} />
                </ProfileCard>

                <ProfileCard
                  title="Education"
                  edit={editBtn("Education", "education")}
                >
                  <EducationBody education={profile.education} />
                </ProfileCard>

                <ProfileCard
                  title="Specializations"
                  edit={editBtn("Specializations", "specializations")}
                >
                  <SpecializationsBody
                    specializations={profile.specializationNames}
                  />
                </ProfileCard>
              </aside>

              {/* ---- Main column ---------------------------------------- */}
              <div className="space-y-5">
                <ProfileCard title="Overview" edit={editBtn("Overview", "bio")}>
                  <OverviewBody
                    overview={profile.overview}
                    empty="No bio yet — buyers read this first."
                  />
                </ProfileCard>

                <ProfileCard
                  title="Projects"
                  edit={editBtn("Projects", "employers")}
                >
                  <ProjectsBody
                    projects={projects}
                    empty="No projects yet. Adding a few is the fastest way to show buyers what you've delivered."
                  />
                </ProfileCard>

                <ProfileCard title="Skills" edit={editBtn("Skills", "catalog")}>
                  <SkillsBody
                    skills={profile.skillNames}
                    field={
                      profile.roleTypeName && profile.pillarName
                        ? {
                            role: profile.roleTypeName,
                            domain: profile.pillarName,
                          }
                        : null
                    }
                  />
                </ProfileCard>

                <ProfileCard
                  title="Work History"
                  edit={editBtn("Work History", "employers")}
                >
                  <WorkHistoryBody
                    employers={profile.employers}
                    empty="No work history yet. Providers who add work experience and projects are twice as likely to win work."
                  />
                </ProfileCard>

                {/* E057 — cards + a proper modal. The eight-field form that
                    used to be squeezed into the sidebar column is gone. */}
                <ProfileCard title="Certifications">
                  <CertificationCards
                    items={profile.certifications}
                    busy={busy}
                    openSignal={certSignal}
                    onSave={async (next) => {
                      // Optimistic locally so the card list updates with the
                      // modal close; `saveCertifications` re-hydrates from the
                      // server immediately after, so a rejected write cannot
                      // leave the page showing something that wasn't stored.
                      setProfile((pp) => ({ ...pp, certifications: next }));
                      return saveCertifications(next);
                    }}
                  />
                </ProfileCard>

                {/* E039 — testimonials are EARNED after delivering work, so
                    this is an honest empty state, not a capture form. */}
                <ProfileCard title="Testimonials">
                  <Empty>
                    No testimonials yet — you&apos;ll collect these as you
                    deliver work.
                  </Empty>
                </ProfileCard>
              </div>
            </div>
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
function PlainShell({
  children,
  compact = false,
}: {
  children: React.ReactNode;
  compact?: boolean;
}) {
  return <OnboardingShell compact={compact}>{children}</OnboardingShell>;
}

/**
 * One tier of the Role → Domain → Skills cascade (E030).
 *
 * Collapses to a one-line summary with a Change link once a choice is made, so
 * only the tier the provider is actually working on is expanded — that is what
 * keeps the page short instead of three stacked lists.
 */
function CascadeTier({
  index,
  label,
  chosen,
  onChange,
  children,
}: {
  index: number;
  label: string;
  chosen: string | null;
  onChange?: () => void;
  children: React.ReactNode;
}) {
  // brief_Y / E053 — a COLLAPSED tier is genuinely one line now. It used to be
  // a three-line box (heading row, then the value on its own line) that spent
  // ~100px to recap a single word; two of those ate a quarter of the viewport
  // before the step's actual work began, which is most of why the footer sat
  // below the fold. Expanded tiers are unchanged.
  if (chosen) {
    return (
      <section className="flex items-center gap-3 rounded-brand border border-line px-4 py-2.5">
        <span
          aria-hidden
          className="grid h-6 w-6 flex-none place-items-center rounded-full bg-magenta text-[12px] font-black text-white"
        >
          {index}
        </span>
        <span className="text-[13px] font-bold uppercase tracking-wide text-ink-2">
          {label}
        </span>
        <span className="min-w-0 flex-1 truncate text-[16px] font-bold">
          {chosen}
        </span>
        {onChange && (
          <button
            type="button"
            onClick={onChange}
            className="flex-none text-[14px] font-bold text-magenta hover:text-magenta-dark"
          >
            Change
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="rounded-brand border border-line p-4">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="flex items-center gap-2.5 text-[13px] font-bold uppercase tracking-wide text-ink-2">
          <span
            aria-hidden
            className="grid h-6 w-6 place-items-center rounded-full bg-bg-soft text-[12px] font-black text-ink-2"
          >
            {index}
          </span>
          {label}
        </h2>
      </div>
      {children}
    </section>
  );
}

/**
 * The review page's validation surface (brief_X / E056) — Scott's framing:
 *
 *   ERRORS  block Publish. Red, listed first, each with a click-to-fix.
 *   CHANGES don't. Amber, collapsed under a summary line, same click-to-fix.
 *
 * The two are deliberately different colours, different headings and different
 * weights: the whole point of the split is that a provider can tell at a glance
 * which list they are *required* to clear and which is advice. A single
 * undifferentiated "needs attention" list is what the old page had.
 *
 * When both are empty this renders the green all-clear — the end of onboarding
 * should say so plainly rather than showing nothing.
 */
function ReviewChecklist({
  errors,
  changes,
  onFix,
}: {
  errors: ReviewItem[];
  changes: ReviewItem[];
  onFix: (fix: ReviewFix) => void;
}) {
  if (errors.length === 0 && changes.length === 0) {
    return (
      <div className="rounded-brand border border-emerald-500/30 bg-emerald-50/60 p-4">
        <p className="text-[15px] font-bold text-emerald-800">
          ✓ Everything checks out — you&apos;re ready to publish.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {errors.length > 0 && (
        <div className="rounded-brand border border-red-600/25 bg-red-600/[0.04] p-4">
          <p className="text-[15px] font-bold text-red-700">
            {errors.length === 1
              ? "1 thing must be fixed before you can publish"
              : `${errors.length} things must be fixed before you can publish`}
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {errors.map((it) => (
              <ChecklistRow key={it.id} item={it} onFix={onFix} tone="error" />
            ))}
          </ul>
        </div>
      )}

      {changes.length > 0 && (
        <div className="rounded-brand border border-amber-500/30 bg-amber-50/60 p-4">
          <p className="text-[15px] font-bold text-ink">
            {changes.length === 1
              ? "1 suggested change"
              : `${changes.length} suggested changes`}
            <span className="ml-2 font-semibold text-ink-2">
              — optional, you can publish without these
            </span>
          </p>
          <ul className="mt-2.5 space-y-1.5">
            {changes.map((it) => (
              <ChecklistRow key={it.id} item={it} onFix={onFix} tone="change" />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function ChecklistRow({
  item,
  onFix,
  tone,
}: {
  item: ReviewItem;
  onFix: (fix: ReviewFix) => void;
  tone: "error" | "change";
}) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[14px]">
      <span aria-hidden className={tone === "error" ? "text-red-600" : "text-amber-600"}>
        {tone === "error" ? "●" : "○"}
      </span>
      <span className={tone === "error" ? "text-red-800" : "text-ink-2"}>
        {item.message}
      </span>
      <button
        type="button"
        onClick={() => onFix(item.fix)}
        className="font-bold text-magenta underline underline-offset-4 transition-colors hover:text-magenta-dark"
      >
        {item.fixLabel} →
      </button>
    </li>
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
