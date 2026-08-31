"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { Avatar } from "@/components/Avatar";
import { VerifyGate } from "@/components/onboarding/VerifyGate";
import {
  canSignUp,
  SignUpForm,
  type SignUpValues,
} from "@/components/onboarding/SignUpForm";
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
  type EmployerProject,
} from "@/components/onboarding/EmployersStep";
import {
  ResumeUploadModal,
  type ImportOutcome,
} from "@/components/onboarding/ResumeUploadModal";
import { ResumeDropzone } from "@/components/onboarding/ResumeDropzone";
import { PhotoCropModal } from "@/components/onboarding/PhotoCropModal";
import {
  WorkHistoryReview,
  type JobPatch,
} from "@/components/onboarding/WorkHistoryReview";
import { SUITES, SUITE_ORDER } from "@/lib/suite";
import type { SoftwareSuite } from "@prisma/client";
import { TestimonialCard, DECK_TESTIMONIALS } from "@/components/onboarding/TestimonialCarousel";
import {
  ProfileCard,
  ProfileHero,
  SoloProjectsBody,
  LocationBody,
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
import { LANGUAGES } from "@/lib/countries";
import { LocationFields } from "@/components/onboarding/LocationFields";
import { CompanyStep } from "@/components/company/CompanyStep";
import { AiPassPanel } from "@/components/onboarding/AiPassPanel";
import { ResumeImportAction } from "@/components/onboarding/ResumeImportAction";
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
import { PhoneField } from "@/components/onboarding/PhoneField";
import { formatPhone, isPhoneComplete } from "@/lib/phone";

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

/**
 * Every step this wizard can render (PJv2 WS1 / E070). The ORDER a given user
 * walks comes from the server — a recruiter skips Education and Rate — so this
 * is the union, not the itinerary.
 */
/*
  Every screen this wizard can RENDER. The counted itinerary is a subset and
  comes from the server (`status.steps`), which is what lets the provider and
  recruiter journeys differ without this file knowing how.

  WS1 — Bio, Education, Specializations and Languages left the itinerary but not
  this list: they still render as review-page sections and Settings targets. The
  slimdown removes them as PROMPTS, not as data.
*/
const ALL_STEPS = [
  "title",
  // WS-4 — the review that replaced the Role and Skills prompts.
  "work_history",
  "roles",
  "skills",
  "catalog",
  "tell_us",
  "specializations",
  "education",
  "languages",
  "bio",
  "rate",
  "picture",
  "company",
  "finish",
] as const;
type Step = (typeof ALL_STEPS)[number];
type Screen = "signup" | "check_email" | Step;

/** Provider journey (10). The server sends the real list; this is the fallback. */
const DEFAULT_STEPS: readonly Step[] = ALL_STEPS;

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
const STEP_LABELS: Record<Step, { stepper: string }> = {
  title: { stepper: "Your Title" },
  work_history: { stepper: "Your Work History" },
  roles: { stepper: "Your Role" },
  skills: { stepper: "Your Skills" },
  catalog: { stepper: "Your Role & Skills" },
  tell_us: { stepper: "Build Your Profile" },
  specializations: { stepper: "Your Specializations" },
  education: { stepper: "Your Education" },
  languages: { stepper: "Your Languages" },
  bio: { stepper: "Your Bio" },
  rate: { stepper: "Your Rate" },
  picture: { stepper: "Your Photo" },
  company: { stepper: "Your Company" },
  finish: { stepper: "Review Your Profile" },
};

/**
 * ROLE CARD COPY (E186) — the designed content, keyed by RoleType.code.
 *
 * The cards used to be titled with the bare taxonomy name and subtitled
 * "5 areas of work" — a count of the DOMAIN tier, which is a level the UI
 * deliberately stopped showing (E030 collapsed the cascade). So the one line
 * meant to help someone choose was describing a thing they would never see,
 * and it said the same thing about every card except the number.
 *
 * Keyed on `code` rather than `name`: the codes are stable identifiers written
 * by the taxonomy seed, the names are display strings. A role with no entry here
 * falls back to the old count line rather than rendering an empty subtitle — the
 * catalog is meant to grow, and a new role type must not arrive blank.
 */
const ROLE_CARD_COPY: Record<string, string> = {
  APPLICATION_SPECIFIC:
    "Mgt Consultant, P2P, O2C, R2R, Functional Analyst, Business Process Specialist",
  TECHNOLOGY_SPECIFIC:
    "Coder, Report Writer, Integration Specialist, PaaS Developer",
  PROJECT_SPECIFIC: "Project Manager, Program Manager, Tester, Trainer",
  OPERATIONS_SPECIFIC:
    "Buyer, HR Manager, Bookkeeper, Customer Service, Contract Administrator",
};

const MIN_BIO = 100;
/**
 * Mirrors `MAX_BIO_CHARS` in onboarding.ts (E087). Kept as a local constant like
 * MIN_BIO beside it rather than imported, matching how this file already treats
 * the minimum — but the server is authoritative and rejects anything longer.
 */
const MAX_BIO = 600;
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
/** Per-group cap while SEARCHING — three groups have to share one window. */
const MAX_SPECS_PER_GROUP = 6;
/**
 * Per-tier cap while BROWSING (PJv2 WS9). Higher than the search cap because an
 * open tier owns the whole window rather than sharing it with two siblings; the
 * scroll region still bounds the height either way.
 */
const MAX_SPECS_PER_TIER = 24;

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
// Raised from 84px for E102: a single-domain basket was two rows, a
// multi-domain one is three or four, and clipping the thing that proves your
// earlier picks survived defeats the point of showing it.
const PICKED_REGION = "max-h-[132px] overflow-y-auto overscroll-contain pr-1";

/** The shape `/api/onboarding/status` returns. Only what this page reads. */
type ProfilePayload = {
  workMethod?: string | null;
  profileMethod?: string | null;
  pillarId?: string | null;
  pillarName?: string | null;
  roleTypeId?: string | null;
  roleTypeName?: string | null;
  roleTypeIds?: string[];
  roleTypes?: { id: string; name: string; display: string }[];
  specializationIds?: string[];
  specializations?: { id: string; name: string; kind: string }[];
  employers?: EmployerCard[];
  /** WS-4 — the résumé's most-recent employer, to seed the company search. */
  suggestedCompanyName?: string | null;
  /** ALL projects, including any not attached to an employer. */
  projects?: EmployerProject[];
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
  skillNames?: { id: string; name: string; area?: string | null }[];
  /** E187 — the subset of `skillIds` the résumé produced. Server-derived. */
  resumeSkillIds?: string[];
  headline?: string | null;
  overview?: string | null;
  hourlyRateCents?: number | null;
  rateMinCents?: number | null;
  rateMaxCents?: number | null;
  serviceFeeBps?: number | null;
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
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
  /** WS4 — an import on the server outlives the client's upload state. */
  imports?: { id: string; status: string }[];
  emailVerified: boolean;
  resumeStep: string;
  /** The itinerary for THIS user (recruiters get 8, providers 10) — WS1. */
  steps?: Step[];
  isRecruiter?: boolean;
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
type SkillOpt = {
  id: string;
  name: string;
  roleType: { display: string } | null;
  /** The DOMAIN. Still on every row — it disambiguates two skills that share
   *  a label under different domains — even though it left the UI as a tier. */
  pillar?: { id: string; name: string } | null;
};
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
  workMethod: string | null;
  profileMethod: string | null;
  pillarId: string | null;
  pillarName: string | null;
  roleTypeId: string | null;
  /** WS2 — every role claimed; `roleTypeId` is the first of these (primary). */
  roleTypeIds: string[];
  roleTypeName: string | null;
  specializationIds: string[];
  /** Names of the selected specializations, for chip rendering (E038). */
  specializationNames: { id: string; name: string }[];
  /** Typed-in specializations not yet in the vocabulary (E031). */
  customSpecializations: string[];
  certifications: CertificationDraft[];
  employers: EmployerCard[];
  suggestedCompanyName: string | null;
  projects: EmployerProject[];
  skillIds: string[];
  skillNames: { id: string; name: string; area?: string | null }[];
  /** E187 — which of `skillIds` the résumé produced, straight from the server. */
  resumeSkillIds: string[];
  /** Typed-in skills not yet in the catalog (E031). */
  customSkills: string[];
  headline: string;
  overview: string;
  hourlyRateCents: number | null;
  rateMinCents: number | null;
  rateMaxCents: number | null;
  serviceFeeBps: number;
  photoUrl: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
  phoneVerified: boolean;
  address: AddressDraft | null;
  education: EducationDraft[];
  languages: LanguageDraft[];
};

const emptyProfile = (): Profile => ({
  workMethod: null,
  profileMethod: null,
  pillarId: null,
  pillarName: null,
  roleTypeId: null,
  roleTypeIds: [],
  roleTypeName: null,
  specializationIds: [],
  specializationNames: [],
  customSpecializations: [],
  certifications: [],
  skillIds: [],
  skillNames: [],
  resumeSkillIds: [],
  customSkills: [],
  headline: "",
  overview: "",
  hourlyRateCents: null,
  rateMinCents: null,
  rateMaxCents: null,
  serviceFeeBps: 1000,
  photoUrl: null,
  firstName: "",
  lastName: "",
  phone: null,
  phoneVerified: false,
  address: null,
  education: [],
  languages: [],
  employers: [],
  suggestedCompanyName: null,
  projects: [],
});

const emptyAddress = (country = "United States"): AddressDraft => ({
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country,
});

/**
 * The provider title cap (WS-4). Matches the talent card's one-line soft cap in
 * `lib/explore.ts` — the two must agree, or the field promises a length the
 * card will not honour.
 */
const HEADLINE_MAX = 42;

export default function JoinProviderPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * E090 — the DOB's own error, shown ON the field. A top-of-page Notice was the
   * only surface before, and the next error to arrive replaced it, so the one
   * message that named the actual problem was the one the user never got to
   * read. Field-level errors survive because nothing else writes to them.
   */
  const [notProvider, setNotProvider] = useState(false);

  const [acct, setAcct] = useState<SignUpValues>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
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
  /**
   * E102 — which (role, domain) the SKILLS TIER is currently browsing.
   *
   * Separate from `profile.roleTypeId` / `pillarId`, which are the PRIMARY field
   * the profile leads with and which buyers filter on. Conflating the two is
   * what made the picker single-domain: browsing to a second area had to either
   * overwrite the primary or be forbidden, and it was forbidden.
   *
   * Null means "no area open" — the domain tier is showing its list.
   */
  /**
   * E118 — JUMP AND RETURN. When an edit pencil on the review sends you to a
   * step, saving that step comes BACK to the review instead of advancing into
   * the rest of the wizard.
   *
   * Without this, fixing one word in your bio at the end of registration lands
   * you on Bio 7/10 and then walks you forward through Rate, Photo & Details and
   * Review again — three screens of nothing you asked for. The user asked to
   * change a field, not to redo the tail of the flow.
   */
  const [returnToReview, setReturnToReview] = useState(false);

  const [browseArea, setBrowseArea] = useState<{
    roleTypeId: string;
    pillarId: string;
    pillarName: string;
  } | null>(null);
  const [skillQuery, setSkillQuery] = useState("");
  /*
    WS-4 — the work-history review's pending corrections, and the module lists
    it offers.

    `jobPatches` is SPARSE: only jobs the provider actually touched. Sending the
    whole history back would make an untouched job indistinguishable from one
    deliberately cleared, and the review's promise to leave the right answers
    alone depends on telling those apart.

    `suiteSkills` is loaded once per suite when the step opens rather than per
    job — six requests instead of one per card, and the card's picker has to be
    synchronous because it renders inside the list.
  */
  const [jobPatches, setJobPatches] = useState<JobPatch[]>([]);
  const [suiteSkills, setSuiteSkills] = useState<Record<string, { id: string; name: string }[]>>({});
  const [specQuery, setSpecQuery] = useState("");
  /**
   * Which specialization tier is expanded (PJv2 WS9) — null means "whichever is
   * still empty", resolved at render. Pinned as soon as the provider picks
   * something, or the tier they are working in would collapse under them the
   * instant it stopped being the first empty one.
   */
  const [openSpecTier, setOpenSpecTier] = useState<string | null>(null);
  /**
   * E057 — bumping this asks the review page's certification editor to open its
   * add-modal. A counter rather than a boolean so the "Add certification"
   * click-to-fix works the second and third time it's clicked, not just once.
   */
  const [certSignal, setCertSignal] = useState(0);
  /**
   * WS1 — the step list comes from the server, because it depends on the user
   * type chosen at the fork. Falls back to the provider journey.
   */
  const [steps, setSteps] = useState<readonly Step[]>(DEFAULT_STEPS);
  const [isRecruiter, setIsRecruiter] = useState(false);

  const [importOutcome, setImportOutcome] = useState<ImportOutcome | null>(null);
  /*
    E187 — "an import exists on this profile" is gone. It was only ever a proxy
    for "some of these skills came off a résumé", and it answered that question
    wrongly the moment the provider ticked one by hand. `profile.resumeSkillIds`
    answers it directly, so the proxy has no remaining caller.
  */
  const [uploadModal, setUploadModal] = useState(false);
  /**
   * A résumé is uploading/parsing right now (E200). Held on the WIZARD, not in
   * the dropzone, because the control that has to react to it is the step's own
   * footer Continue — which sits in `shell()`, one level up from the dropzone.
   */
  const [parsingResume, setParsingResume] = useState(false);
  /** WS5/E084 — the post-upload review shows work history the way the profile
   *  does, and swaps to the editor in place when you ask to change it. */
  const [editingWork, setEditingWork] = useState(false);
  /** WS-B — which imported-but-unmatched terms the provider has ticked. */
  const [pickedSuggestions, setPickedSuggestions] = useState<string[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestDone, setSuggestDone] = useState<string[] | null>(null);
  const [photoModal, setPhotoModal] = useState(false);

  /**
   * Phone number (E019, verification STUBBED by E036). The SMS
   * challenge/response server-side is intact (`phone-verification.ts`) — only
   * the client-side code entry is retired while the stub is in place.
   */
  const [phoneInput, setPhoneInput] = useState("");

  const stepIndex = steps.indexOf(screen as Step);

  // ---- hydration --------------------------------------------------------
  // The server owns profile state; every save returns the fresh snapshot and
  // we re-seed local form state from it rather than guessing what changed.
  const hydrate = useCallback((s: StatusPayload) => {
    if (s.steps?.length) setSteps(s.steps);
    if (typeof s.isRecruiter === "boolean") setIsRecruiter(s.isRecruiter);
    const p = s.profile;
    if (!p) return;
    setProfile({
      workMethod: p.workMethod ?? null,
      profileMethod: p.profileMethod ?? null,
      pillarId: p.pillarId ?? null,
      pillarName: p.pillarName ?? null,
      roleTypeId: p.roleTypeId ?? null,
      roleTypeIds: p.roleTypeIds ?? (p.roleTypeId ? [p.roleTypeId] : []),
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
      suggestedCompanyName: p.suggestedCompanyName ?? null,
      projects: (p.projects ?? []) as EmployerProject[],
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
      resumeSkillIds: p.resumeSkillIds ?? [],
      headline: p.headline ?? "",
      overview: p.overview ?? "",
      hourlyRateCents: p.hourlyRateCents ?? null,
      rateMinCents: p.rateMinCents ?? null,
      rateMaxCents: p.rateMaxCents ?? null,
      serviceFeeBps: p.serviceFeeBps ?? 1000,
      photoUrl: p.photoUrl ?? null,
      firstName: p.firstName ?? "",
      lastName: p.lastName ?? "",
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
    // Masked on load as well, so a number stored before E203 displays the same
    // way a freshly typed one does.
    if (p.phone) setPhoneInput(formatPhone(p.phone, p.address?.country ?? null));
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
        let s = await r.json();
        setEmail(s.email);

        /**
         * PJv2 WS1 — honour the user-type fork from `/join`.
         *
         * `?type=recruiter` is the ONLY thing that distinguishes the two
         * journeys, and it has to be persisted (as `work_method`) before the
         * step list is read, or a recruiter would be handed the 10-step
         * provider itinerary and asked for a rate. Only ever sets it when the
         * profile has no method yet, so re-entering the URL cannot silently
         * re-type an existing provider.
         */
        const wanted = new URLSearchParams(window.location.search).get("type");
        if (wanted === "recruiter" && !s.profile?.workMethod) {
          // `work_method` is a SECTION now, not a wizard step, so it goes
          // through the owner-scoped section endpoint; then re-read the state so
          // the step list reflects the recruiter itinerary.
          const saved = await fetch("/api/settings/profile/section", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              section: "work_method",
              data: { workMethod: "RECRUITER" },
            }),
          });
          if (saved.ok) {
            const again = await fetch("/api/onboarding/status");
            if (again.ok) s = await again.json();
          }
        }

        hydrate(s);
        if (!s.emailVerified) {
          setScreen("check_email");
        } else {
          // The review page's edit pencils deep-link back to a specific step
          // (?step=bio). Anything unrecognised falls back to the resume point.
          const params = new URLSearchParams(window.location.search);
          const requested = params.get("step");
          /*
            ⚠⚠ UNCOUNTED SCREENS ARE LEGAL JUMP TARGETS TOO (`P1-J1.1-E285`).
          
            ⚠ SUPERSEDED, quoted: `const target = (s.steps ?? DEFAULT_STEPS).includes(
            requested) ? requested : s.resumeStep`.
          
            `s.steps` is the COUNTED itinerary, and `tell_us` has never been in it — so
            the provider profile's two "Work History" and "Solo Projects" edit links
            (`ProviderProfileView.tsx:259` and `:321`, both
            `?step=tell_us&return=review`) silently failed the guard and dumped the owner
            on their resume step instead of the section they clicked. Two dead links that
            looked alive.
          
            ⚠ THE ITINERARY GUARD IS NOT WEAKENED. A step that is not on YOUR journey is
            still refused — a recruiter still cannot jump to `rate`. What is added is the
            set of screens that are renderable but never counted, which `PRE_STEPS`
            already names. `E283` made `tell_us` genuinely reachable, so this is the
            guard catching up with that rather than a new permission.
          */
          const jumpable = new Set<Step>([
            ...((s.steps ?? DEFAULT_STEPS) as Step[]),
            /* The uncounted-but-renderable screens. `page.tsx` keeps its own
               `Step` vocabulary (`ALL_STEPS` above) rather than importing the
               server's, so this names the screen directly instead of pulling in
               `PRE_STEPS` and coupling the two lists. */
            "tell_us" as Step,
          ]);
          const target = jumpable.has(requested as Step)
            ? (requested as Step)
            : (s.resumeStep as Step);
          // E118 — the profile view's edit links can ask for the same
          // jump-and-return the review's pencils get, so editing from the live
          // profile doesn't dump you into the middle of the wizard either.
          if (params.get("return") === "review" && target !== "finish") {
            setReturnToReview(true);
          }
          /*
            ── ⚠⚠ THE ONE-SHOT `fresh` GATE IS GONE (`P1-J1.1-E283`) ──────────────────
          
            ⚠ SUPERSEDED, quoted not deleted, because the reasoning was sound and only
            its PLACEMENT was wrong: *"WS1 — THE UPLOAD IS A PRE-STEP, not stop 1. The
            brief keeps the résumé / AI entry 'up-front, preceding the steps', so it
            renders before the counter starts and carries no number. Shown only on a
            genuinely fresh profile: nothing imported and no work history typed. A
            returning provider goes straight to wherever the server resumed them,
            because being asked to upload a CV again on every visit is exactly the
            friction this brief cuts."* The condition was:
          
                const fresh = target === "title"
                  && (s.imports?.length ?? 0) === 0
                  && (s.profile?.employers?.length ?? 0) === 0
                  && !requested;
          
            ⚠⚠ THAT GATE IS HALF OF THE LAUNCH-CLASS FATAL. It could fire ONCE, before
            the title, on a profile with nothing on it. The moment a provider typed a
            title it could never be true again, so the upload became permanently
            unreachable — and `0ae97e2` then made the next step depend on data only the
            upload produced.
          
            ⚠ AND IT COUNTED FAILED IMPORTS. `s.imports` carries `status` and `error`
            and nothing filtered on either, so ONE FAILED PARSE locked a provider out of
            the upload for good. Deleting the gate removes that bug with it — there is
            no longer any count that can lock the door.
          
            In V3 the screen sits AFTER the title and is reachable whenever the provider
            is on it, so resume simply honours the target.
          */
          setScreen(target);
        }
      }
      setReady(true);
    })();
  }, [hydrate]);

  // ---- reference data ---------------------------------------------------
  useEffect(() => {
    /*
      WS3 — the roles list is needed on THREE screens now: the Roles step, the
      Skills step (which names the roles in its subtitle and labels chips) and
      the retired combined page. Gating this on "catalog" alone left the new
      Roles step rendering an empty list with no error — the fetch simply never
      ran. Found by walking it; nothing failed, there was just nothing there.
    */
    if (
      (screen === "roles" || screen === "skills" || screen === "catalog") &&
      fieldRoles.length === 0
    ) {
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

  /*
    WS3 — the skills page shows the UNION across every claimed role.

    One request for all of them rather than one per role: the picker searches
    across the whole set, so assembling it client-side from N responses would
    only add N-1 chances for a partial list to look like a complete one.
  */
  const roleKey = profile.roleTypeIds.join(",");
  useEffect(() => {
    if (screen !== "skills" || !roleKey) return;
    fetch(`/api/catalog/skills?roleTypeIds=${encodeURIComponent(roleKey)}`)
      .then((r) => r.json())
      .then((d) => setSkillOpts(d.skills ?? []))
      .catch(() => setError("We couldn't load skills. Please refresh."));
  }, [screen, roleKey]);

  // The retired combined page is still reachable from Settings, and it loads
  // per (role, domain) as it always did.
  useEffect(() => {
    if (screen !== "catalog" || !browseArea) return;
    fetch(
      `/api/catalog/skills?roleTypeId=${browseArea.roleTypeId}&pillarId=${browseArea.pillarId}`
    )
      .then((r) => r.json())
      .then((d) => setSkillOpts(d.skills ?? []))
      .catch(() => setError("We couldn't load skills. Please refresh."));
  }, [screen, browseArea]);

  /*
    WS-4 — load each suite's module list when the review step opens.

    Keyed off the DOMAIN rows the field-role fetch already returns: for the two
    vendor roles a domain IS a software suite, so the pillar id is already in
    hand and there is nothing new to resolve. Runs once per suite, not once per
    job card, and only on this step — a provider who never reaches the review
    never pays for it.
  */
  useEffect(() => {
    if (screen !== "work_history" || fieldRoles.length === 0) return;
    const vendorRoles = fieldRoles.filter(
      (r) => r.name === "Application-Specific" || r.name === "Technology-Specific"
    );
    let live = true;
    for (const suite of SUITE_ORDER) {
      const pillarName = SUITES[suite].pillar;
      const domain = vendorRoles
        .flatMap((r) => r.domains)
        .find((d) => d.name === pillarName);
      if (!domain) continue;
      fetch(`/api/catalog/skills?pillarId=${domain.id}`)
        .then((r) => r.json())
        .then((d) => {
          if (!live) return;
          setSuiteSkills((prev) => ({
            ...prev,
            [suite]: (d.skills ?? []).map((sk: { id: string; name: string }) => ({
              id: sk.id,
              name: sk.name,
            })),
          }));
        })
        .catch(() => {
          /*
            Silent. A suite whose modules fail to load leaves that picker empty,
            which is recoverable by reloading; surfacing six possible errors on
            a review screen would bury the one thing the provider came here to
            do.
          */
        });
    }
    return () => {
      live = false;
    };
  }, [screen, fieldRoles]);

  /** The modules offered for a job, given the suite it is tagged with. */
  const skillOptionsForSuite = useCallback(
    (suite: SoftwareSuite | null) => (suite ? suiteSkills[suite] ?? [] : []),
    [suiteSkills]
  );

  // ---- navigation -------------------------------------------------------
  const goTo = (s: Screen) => {
    setError(null);
    setScreen(s);
  };
  /* WS5 — the shared company step's handles (see the `company` case below). */
  const companySubmit = useRef<null | (() => void)>(null);
  const [companyValid, setCompanyValid] = useState(false);
  const [companyBusy, setCompanyBusy] = useState(false);
  const [companyPending, setCompanyPending] = useState<string | null>(null);

  /*
    WS2/WS3 — ROLES ARE MULTI-SELECT, defaulting to one.

    The first role chosen is the PRIMARY: what `roleTypeId` means, what the
    profile leads with, and what every existing derivation reads. De-selecting
    the primary promotes the next one rather than leaving a role set with no
    primary. Hoisted to component scope because the Roles screen and the Skills
    screen are two steps now.
  */
  const toggleRole = (role: FieldRole) => {
    setProfile((p) => {
      const has = p.roleTypeIds.includes(role.id);
      const next = has
        ? p.roleTypeIds.filter((id) => id !== role.id)
        : [...p.roleTypeIds, role.id];
      const primary = next[0] ?? null;
      const primaryRole = fieldRoles.find((r) => r.id === primary);
      return {
        ...p,
        roleTypeIds: next,
        roleTypeId: primary,
        roleTypeName: primaryRole?.name ?? null,
        // The primary domain is derived server-side from the primary role;
        // clearing it stops a stale pairing surviving a role change.
        ...(primary === p.roleTypeId ? {} : { pillarId: null, pillarName: null }),
      };
    });
  };

  const goNext = () => {
    // E118 — an edit that came FROM the review goes back to it, once. The flag
    // clears on arrival so the next forward move is ordinary again.
    if (returnToReview) {
      setReturnToReview(false);
      goTo("finish");
      return;
    }
    /*
      From an UNCOUNTED screen (the upload pre-step) "next" means the first
      counted step — there is no index to add one to. Without this the pre-step's
      Continue did nothing at all, which is how a pre-step becomes a dead end.
    */
    if (stepIndex < 0) {
      /*
        ⚠ `E283` — THE RÉSUMÉ SCREEN NOW SITS AFTER THE TITLE, so "next" from it is
        the step after `title`, not `steps[0]`. Sending it to `steps[0]` would bounce
        the provider back onto the title they just filled in — a loop.
        ⚠ DERIVED FROM THE ITINERARY, not hardcoded to `roles`: a recruiter walks a
        different list and both start with `title`, so "the one after title" is right
        for either without naming a step one of them may not have.
      */
      if (screen === "tell_us") {
        goTo(steps[steps.indexOf("title") + 1] ?? steps[0] ?? "title");
        return;
      }
      goTo(steps[0] ?? "title");
      return;
    }
    if (stepIndex < steps.length - 1) goTo(steps[stepIndex + 1]);
  };
  const goBack = () => {
    if (stepIndex > 0) goTo(steps[stepIndex - 1]);
  };

  /**
   * The address draft. Hoisted to component scope in WS8 — the Photo & Details
   * step and the Review both read it now, and a copy per case is how the two
   * surfaces would start disagreeing about what is stored.
   */
  const addr = profile.address ?? emptyAddress(acct.country);
  const setAddr = (patch: Partial<AddressDraft>) =>
    setProfile((p) => ({ ...p, address: { ...addr, ...patch } }));

  /** Scroll + focus one of the identity inputs (`review-<field>`). */
  const focusReviewField = (field: string) => {
    const el = document.getElementById(`review-${field}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => (el as HTMLInputElement | null)?.focus(), 350);
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

  /**
   * WS-B — add the ticked terms as custom skills. Suggest-and-confirm: nothing
   * here was added by the import, and nothing unticked is added now.
   */
  const confirmSuggestions = async () => {
    if (pickedSuggestions.length === 0) return;
    setSuggestBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/onboarding/provider/skill-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms: pickedSuggestions }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not add those skills.");
        return;
      }
      if (body.state) hydrate(body.state as StatusPayload);
      setSuggestDone(body.added ?? []);
      setPickedSuggestions([]);
    } finally {
      setSuggestBusy(false);
    }
  };

  /**
   * WS3 — run the AI extractor over the document already uploaded and
   * repopulate the review. The heuristic result stays if this fails; the panel
   * says so rather than clearing what the provider has.
   */
  /** WS4 instrumentation — which way a low-confidence import was resolved. */
  const logResumePath = (path: string) =>
    fetch("/api/onboarding/provider/resume-path", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path }),
    }).catch(() => {});

  const publish = async () => {
    setError(null);

    setBusy(true);
    try {
      /*
        E090 — the save's RESULT is now checked. This previously ran as a
        fire-and-forget `await postStep(...)`, so when the finish handler threw
        (an invalid DOB aborts it before it writes anything — DOB, phone AND
        address all fail together) the flow carried straight on to /publish. That
        call then failed for a DIFFERENT reason — "add your date of birth", the
        gate reporting the value that never got saved — and its message
        overwrote the real one. The section looked like it "didn't save" and the
        stated cause was wrong. Stop here and let postStep's error stand.
      */
      const saved = await postStep("finish", {
        address: profile.address,
        // E036 — phone verification is stubbed: the number is saved with the
        // rest of the details and publishing no longer waits on an SMS code.
        phone: phoneInput,
      });
      // postStep has already put the server's message in `error`. Returning
      // here is what stops it being replaced by the publish call's message.
      if (!saved) return;
      const r = await fetch("/api/onboarding/provider/publish", { method: "POST" });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(body.error ?? "Could not publish your profile.");
        return;
      }
      // The review IS step 12 now (E035), so publishing lands the provider on
      /*
        E149 — publish lands on the new Provider Home, with a pop-up.

        home_v2 sent it to a "You're live" confirmation page; the MASTER brief
        RETIRES that page, and it is right to. The confirmation was a whole
        screen re-rendering the profile the provider had just spent ten minutes
        reviewing, to tell them one thing. The one thing is now a dialog on the
        page they actually want to be on, and the casing's upper-right avatar is
        what makes its instruction ("click your image in the upper right") true.
      */
      router.push("/dashboard?published=1");
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
    // max-w-2xl, not the brief's ~md/lg: brief_W/E046 MEASURED that the three
    // social buttons need 672px to fit their full labels with icons, and 576px
    // does not. Still a capped, centred form column — 672 of 1024 — so the rule
    // holds; the number comes from that measurement rather than from taste.
    return (
      <PlainShell
        compact
        contentWidth="max-w-2xl"
        /*
          ── ⚠⚠ THE ACTION BAND THIS SCREEN USED TO OPT OUT OF (`E246` §5) ────────

          This was the ONE onboarding screen passing no `footer`, so the frame's
          full-bleed band never rendered and the rule was drawn INSIDE `SignUpForm`'s
          capped `max-w-2xl` column — stopping at the form width instead of running
          edge to edge. That is what Scott filed on the walk.
          ⚠ THE SAME TWO BUTTONS, the same handlers, the same disabled logic; only
          WHERE they render moved. `SignUpForm` has no `<form>` element and never
          used `type="submit"`, so nothing about how submit fires changed — checked
          before anything was moved.
          ⚠ `canSignUp` IS IMPORTED, NOT REIMPLEMENTED. One definition of the gate,
          `tosAccepted` included; retyping it here is `P1-J4-E024`.
        */
        footer={
          <>
            <button
              onClick={() => router.push("/join")}
              disabled={busy}
              className="rounded-full border-[1.5px] border-line px-6 py-3 font-bold text-ink transition-colors hover:border-[#d9d4e2] disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={createAccount}
              disabled={!canSignUp(acct) || busy}
              className="rounded-full bg-magenta px-8 py-3 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create My Account"}
            </button>
          </>
        }
      >
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
          error={error}
          emailLocked={!!inviteToken}
          /*
            ⚠ EXPLICIT, AND IT IS LOAD-BEARING (`P1-J1.1-E234`, 2026-08-30).
            This was IMPLICIT: `SignUpForm`'s `callbackUrl` defaulted to
            "/join/provider" and this call site relied on it. `E234` changed that
            default to "/join" so no shared component pre-picks a side — which
            would have ejected a provider from the wizard they are standing in.
            Stating it here keeps THIS flow byte-identical in behaviour while the
            default stops deciding for everybody.
          */
          callbackUrl="/join/provider"
        />
      </PlainShell>
    );
  }

  if (screen === "check_email") {
    return (
      <PlainShell contentWidth="max-w-md">
        {/* E048 — centred title, same 28px as sign-up. All three pre-verify
            pages (role select, sign up, check email) share one format. */}
        <div>
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

  // ===== POST-VERIFY: the counted steps (stepper x/N) =====================
  /*
    An UNCOUNTED screen (the upload pre-step, or a review-page section opened
    for editing) is not in the itinerary, so `stepIndex` is -1. Passing 0/6 to
    the shell would render a counter for a step that does not exist — the exact
    thing pitfalls.md warns about, one level down. Undefined hides it.
  */
  const stepNumber = stepIndex >= 0 ? stepIndex + 1 : undefined;
  // Exact stepper heading + "Next: …" label per brief_S's table (E024–E035).
  const labels = STEP_LABELS[screen as Step];
  const nextStep = stepIndex >= 0 ? steps[stepIndex + 1] : undefined;
  const nextLabel = nextStep
    ? nextStep === "finish"
      ? "Next: Review Your Profile"
      : `Next: ${STEP_LABELS[nextStep].stepper}`
    : "Next: Publish Your Profile";
  const shell = (props: Partial<React.ComponentProps<typeof WizardShell>> & { title: string }) => ({
    step: stepNumber,
    totalSteps: steps.length,
    stepLabel: labels?.stepper,
    continueLabel: nextLabel,
    busy,
    onBack: stepIndex > 0 ? goBack : undefined,
    canBack: stepIndex > 0,
    ...props,
  });

  switch (screen) {
    // ---- 1/12 — Experience (E003) -------------------------------------
    case "title":
      return (
        <WizardShell
          {...shell({
            title: "Got it. Now, add a title to tell the world what you do.",
            subtitle:
              "It's the very first thing clients see, so make it count. Stand out by describing your expertise in your own words.",
            /*
              ⚠⚠ THE TITLE FORWARDS TO THE RÉSUMÉ SCREEN, NOT TO STEP 2 (`E283`).
              That is the V3 order and the deck shows it: `1/7` Your Title → "How would
              you like to tell us about yourself?" (uncounted) → the import review
              (uncounted) → `2/7` Your Role.
              ⚠ SUPERSEDED: this passed no `then`, so it used the default `goNext` and
              went straight to the next COUNTED step, leaving the upload unreachable.
              ⚠ IT IS AN OFFER, NOT A GATE — the résumé screen's own Skip for Now and
              Continue both lead on to `2/7`, which can be completed by typing.
            */
            onContinue: () =>
              saveAnd("title", { headline: profile.headline }, () => goTo("tell_us")),
            continueDisabled: profile.headline.trim() === "",
          })}
        >
          {error && <Notice>{error}</Notice>}
          {/*
            WS-4 — CAPPED AT 42 WITH A LIVE COUNTER, fixed at the source.

            This field IS the talent card's title, and the card renders it on
            ONE line with a 42-character soft cap (lib/assessment aside, see
            `cardTitle` in lib/explore.ts). It allowed 200, so a provider could
            write a title that the card would silently cut — the truncation
            being the first time anyone found out, on a page the provider never
            looks at.

            Capping the INPUT rather than widening the card is the right end:
            the constraint is real (one line, in a 380px card) and the person
            best placed to choose what survives it is the one writing it.

            The counter turns magenta over 36 so it warns before it blocks —
            a field that just stops accepting keystrokes reads as broken.
          */}
          <Field
            label="Your Title"
            hint="This is the title buyers see on your card — one line, so keep it tight."
          >
            <TextInput
              value={profile.headline}
              onChange={(e) =>
                setProfile((p) => ({ ...p, headline: e.target.value.slice(0, HEADLINE_MAX) }))
              }
              placeholder="e.g. Oracle Cloud P2P / Procurement Expert"
              maxLength={HEADLINE_MAX}
            />
          </Field>
          <p
            className={
              "mt-1.5 text-right text-[13px] font-semibold tabular-nums " +
              (profile.headline.length > HEADLINE_MAX - 6 ? "text-magenta" : "text-ink-2")
            }
          >
            {profile.headline.length} / {HEADLINE_MAX}
          </p>
        </WizardShell>
      );

    // ---- 5/12 — Tell us about yourself (E012/E029) --------------------
    case "tell_us": {
      /**
       * WS2 (E069) — once anything has been imported OR entered, this step stops
       * asking "how would you like to tell us" and becomes pure review/edit.
       * Leaving the method cards up after an upload was the single most
       * confusing thing on the step: the question was already answered.
       */
      const hasProfileData =
        importOutcome != null ||
        profile.employers.length > 0 ||
        profile.education.length > 0 ||
        profile.profileMethod != null;

      return (
        <WizardShell
          {...shell({
            title: hasProfileData
              ? "Here's what we have — check it over"
              : "How would you like to tell us about yourself?",
            subtitle: hasProfileData
              ? "Edit anything that's wrong or missing. This is what buyers will see."
              // E183 — AI-forward. E103 cut this to one line because the old
              // three-clause version repeated the cards below it; this says the
              // one thing the cards DON'T, which is that the fast path is a
              // model reading the document rather than a form filling itself.
              : "Just upload your resume and let our AI model do the rest.",
            wide: true,
            /*
              E117 — the example provider card is an INVITATION, and it stops
              being one the moment there is real data to review. Once the
              provider has uploaded or entered their own work history, showing
              "Scott W" beside it invites a comparison nobody asked for and eats
              the width their own content needs.
            */
            aside: hasProfileData ? undefined : (
              <TestimonialCard t={DECK_TESTIMONIALS[0]} />
            ),
            /*
              E201 — NO PAGE-LEVEL SKIP ONCE A RÉSUMÉ HAS BEEN READ. "Skip for
              Now" here advanced past the step without saving, which on the
              upload path means walking away from everything the parse just
              extracted — the one place on this wizard where skipping destroys
              work rather than deferring it. It stays on the empty/manual path,
              where there is nothing to lose.

              E200 — CONTINUE IS THE VISIBLE COMPLETION SIGNAL. It is disabled
              while the model reads and says so, then enables the moment the
              parse lands. Leaving it live during the parse let a click discard
              the answer that was seconds away.
            */
            secondaryLabel: importOutcome ? undefined : "Skip for Now",
            onSecondary: importOutcome ? undefined : goNext,
            onContinue: () => saveAnd("tell_us", { profileMethod: "MANUAL" }),
            continueLabel: parsingResume ? "Reading your résumé…" : "Continue",
            continueDisabled: parsingResume,
          })}
        >
          {error && <Notice>{error}</Notice>}

          {/*
            WS5/E051 — what landed is now ONE line, not a panel. The prose
            "Here's What We Captured" box plus its separate "Needs your
            attention" list said, at length, what the sections below already show
            by simply being filled in. The gaps that box carried are routed to the
            sections they belong to instead (see `gapsFor`), where they are next
            to the field that fixes them.
          */}
          {/*
            WS3/E129 — THE GATE, now the shared `AiPassPanel`. It used to be
            inline here, which meant the action existed only in the ninety
            seconds after an upload; the same panel is on the review now.
          */}
          {importOutcome?.confidence?.score === "low" && (
            <div className="mb-6">
              <AiPassPanel
                reasons={importOutcome.confidence.reasons}
                onUpload={() => {
                  void logResumePath("reupload");
                  setUploadModal(true);
                }}
                onManual={() => {
                  void logResumePath("manual");
                  setEditingWork(true);
                  setImportOutcome((o) =>
                    o ? { ...o, confidence: { score: "high", reasons: [] } } : o
                  );
                }}
                onApplied={(body) => {
                  if (body.state) hydrate(body.state as StatusPayload);
                  setImportOutcome((o) =>
                    o ? { ...o, confidence: { score: "high", reasons: [] } } : o
                  );
                }}
              />
            </div>
          )}

          {importOutcome && capturedLine(importOutcome) && (
            <p className="mb-2 text-[14.5px] text-ink-2">
              {capturedLine(importOutcome)}
            </p>
          )}

          {/*
            E184 — NAME THE READER THAT RAN.

            The product claims an AI read the document in four separate places.
            For the whole of run 7 no model ran at all, and nothing on any screen
            could have told you: an AI parse and a heuristic parse rendered
            identically, differing only in being right. One line, always present
            after an import, ends that.
          */}
          {importOutcome?.path && <ReaderLine path={importOutcome.path} />}

          {/*
            E029 — the upload control is INLINE and visible on arrival. It used
            to be hidden behind a card that opened a modal, and the Run-2 walk
            reported no control present at all. WS2 hides the whole invitation
            once there is data to review.
          */}
          {!hasProfileData && (
          <section className="mb-4 rounded-brand border-2 border-magenta bg-magenta/[0.04] p-6 shadow-brand">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[17px]">Upload Your Resume</h2>
              <span className="rounded-full bg-magenta px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-white">
                Fastest
              </span>
            </div>
            {/*
              E103 — the "We'll read it and fill in your title, experience,
              education, skills and languages" line is gone. It explained the
              feature to someone already standing on it, and the two lines it
              cost were exactly the vertical room the testimonial card needed.
              The FASTEST badge and the dropzone already say what this does.
            */}
            <ResumeDropzone
              onBusyChange={setParsingResume}
              onImported={(outcome) => {
                setImportOutcome(outcome);
                if (outcome.state) hydrate(outcome.state as StatusPayload);
              }}
            />
          </section>

          )}

          {!hasProfileData && (
            <div className="space-y-3">
              <MethodCard
                title="Fill Out Manually (15 Mins)"
                description="Type everything yourself, step by step."
                onClick={() => saveAnd("tell_us", { profileMethod: "MANUAL" })}
              />
            </div>
          )}

          {/*
            WS1/WS2 (E071) — there is no separate Employers step any more, so
            work history is edited HERE, on the step that produced it.

            E083 — but only AFTER a method is chosen. This block used to render
            unconditionally, so someone still deciding how to tell us about
            themselves was shown "Your Work History / No employers yet / + Add
            Employer" underneath the question. That is review content, and it
            leaked onto the chooser when the standalone Employers step was
            collapsed into Upload/Review (E070/E071): an empty state advertising
            a third way to answer, beneath the two cards that were supposed to be
            the answer. Relocated, not removed — picking either method sets
            `hasProfileData`, and the manual path lands straight on this editor.
          */}
          {hasProfileData && (
            <div className="mt-8">
              <ProfileCard
                title="Work History"
                edit={
                  <button
                    type="button"
                    onClick={() => setEditingWork((v) => !v)}
                    className="text-[14px] font-bold text-magenta transition-colors hover:text-magenta-dark"
                  >
                    {editingWork ? "Done" : "✏️ Edit"}
                  </button>
                }
              >
                {/* Import gaps land HERE, beside the thing they are about. */}
                {gapsFor(importOutcome, "work").map((g) => (
                  <p
                    key={g}
                    className="mb-3 rounded-[10px] border border-amber-500/30 bg-amber-50/60 px-3 py-2 text-[13.5px] text-ink-2"
                  >
                    {g}
                  </p>
                ))}

                {editingWork ? (
                  <EmployersStep
                    employers={profile.employers}
                    onChanged={(employers) =>
                      setProfile((p) => ({ ...p, employers }))
                    }
                    onError={setError}
                  />
                ) : (
                  /*
                    E084 — the SAME `WorkHistoryBody` the final Review and the
                    public profile use, so this surface cannot drift from them
                    again. It also inherits E085 for free: the entry component
                    clamps long descriptions behind "Read More", which is what
                    stops an over-extracted import (the Medlinq.ai description in
                    the walk) running the length of the page.
                  */
                  <WorkHistoryBody
                    employers={profile.employers}
                    // Without this the Projects disclosure resolves to nothing
                    // and greys out on every entry: WorkHistoryBody matches an
                    // employer's nested project IDS against this flat list, so
                    // omitting it silently empties the link rather than erroring.
                    projects={profile.projects}
                    empty="No work history yet. Providers who add work experience and projects are twice as likely to win work."
                  />
                )}
              </ProfileCard>

              {/*
                WS-B/E051-5 — SUGGEST AND CONFIRM. The import used to report "34
                skills aren't in the Panameer catalog and were not added": true,
                unactionable, and read as a verdict on the provider's CV. The
                same terms are now a tick-list. Ticking adds them as custom
                skills on this profile; leaving them unticked discards them, and
                nothing reaches the catalog that a person didn't affirm.

                Already filtered through the parser's own plausibility rule, so
                version strings and clause fragments never appear here — a
                suggestion the provider has to reject is a suggestion that
                shouldn't have been made.
              */}
              {(importOutcome?.applied.skillSuggestions?.length ?? 0) > 0 && (
                <div className="mt-4">
                  <ProfileCard title="AI Found These — They're Not in Our Catalog Yet">
                    <p className="mb-3 text-[14px] text-ink-2">
                      AI read these off your document but couldn&apos;t match
                      them to the ERP Service Catalog. Tick the ones that are
                      really yours — we&apos;ll add them to your profile.
                      Anything you leave is discarded.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {importOutcome!.applied.skillSuggestions.map((term) => {
                        const on = pickedSuggestions.includes(term);
                        return (
                          <Chip
                            key={term}
                            selected={on}
                            onClick={() =>
                              setPickedSuggestions((cur) =>
                                on ? cur.filter((t) => t !== term) : [...cur, term]
                              )
                            }
                          >
                            {term}
                          </Chip>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={confirmSuggestions}
                        disabled={pickedSuggestions.length === 0 || suggestBusy}
                        className="rounded-full bg-magenta px-6 py-2.5 font-bold text-white transition-colors hover:bg-magenta-dark disabled:opacity-40"
                      >
                        {suggestBusy
                          ? "Adding…"
                          : `Add ${pickedSuggestions.length || ""} Selected`.replace(
                              "  ",
                              " "
                            )}
                      </button>
                      {suggestDone && suggestDone.length > 0 && (
                        <span className="text-[13.5px] font-semibold text-emerald-600">
                          ✓ Added {suggestDone.join(", ")}
                        </span>
                      )}
                    </div>
                  </ProfileCard>
                </div>
              )}

              {gapsFor(importOutcome, "other").length > 0 && (
                <ul className="mt-4 space-y-1.5">
                  {gapsFor(importOutcome, "other").map((g) => (
                    <li key={g} className="text-[13.5px] text-ink-2">
                      • {g}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <ResumeUploadModal
            open={uploadModal}
            onClose={() => setUploadModal(false)}
            onImported={(outcome) => {
              setImportOutcome(outcome);
              if (outcome.state) hydrate(outcome.state as StatusPayload);
            }}
          />
        </WizardShell>
      );
    }

    // ---- 7/13 — Role → Domain → Skills, ONE cascading page (E030) ------
    // ---- ROLE(S) — WS3 step 2, its own page ---------------------------
    //
    // The Domain tier is GONE FROM THE UI. A skill still belongs to its
    // (role, domain) pair — that pair is the catalog's uniqueness key and the
    // FK is untouched — but asking a provider to navigate a taxonomy level
    // before they can name a skill was the slowest part of the old cascade.
    // The domain is derived from the role server-side (WS2).
    case "roles": {
      return (
        <WizardShell
          {...shell({
            title: "What Kind of Work Do You Do?",
            subtitle:
              "Pick the role that fits. Most people pick one — choose more if you genuinely work across them, like a techno-functional consultant.",
            onContinue: () =>
              saveAnd("roles", {
                roleTypeIds: profile.roleTypeIds,
                roleTypeId: profile.roleTypeId,
              }),
            continueDisabled: profile.roleTypeIds.length === 0,
          })}
        >
          {error && <Notice>{error}</Notice>}

          {fieldRoles.length === 0 ? (
            <p className="text-ink-2">Loading roles…</p>
          ) : (
            <>
              {/* Bounded for the same reason the skills list is: the page's
                  height must not depend on how big the taxonomy gets. */}
              <div className={`max-h-[420px] ${SCROLL_REGION}`}>
                <div className="space-y-3">
                  {fieldRoles.map((r) => {
                    const picked = profile.roleTypeIds.includes(r.id);
                    const isPrimary = profile.roleTypeIds[0] === r.id;
                    return (
                      <OptionCard
                        key={r.id}
                        selected={picked}
                        onClick={() => toggleRole(r)}
                        /*
                          E186 — "{X}-Specific Roles". `r.name` is already
                          "Application-Specific" (the taxonomy's own string), so
                          the title is that plus the noun; deriving it from
                          `display` and re-adding the suffix would have been a
                          second place for the two to disagree.
                        */
                        title={
                          `${r.name} Roles` +
                          (isPrimary && profile.roleTypeIds.length > 1
                            ? "  ·  primary"
                            : "")
                        }
                        description={
                          ROLE_CARD_COPY[r.code] ??
                          `${r.domains.length} area${r.domains.length === 1 ? "" : "s"} of work`
                        }
                      />
                    );
                  })}
                </div>
              </div>
              {profile.roleTypeIds.length > 1 && (
                <p className="mt-3 text-[14px] text-ink-2">
                  You&apos;ll pick skills from all{" "}
                  {profile.roleTypeIds.length} on the next step. The first one
                  is what your profile leads with.
                </p>
              )}
            </>
          )}
        </WizardShell>
      );
    }

    // ---- SKILLS — WS3 step 3, filtered by the chosen role(s) -----------
    case "skills": {
      const chosenSkills = new Set(profile.skillIds);
      const totalPicked = profile.skillIds.length + profile.customSkills.length;

      const q = skillQuery.trim().toLowerCase();
      // Already-picked skills are chips above, so they stop being suggestions —
      // filtering them out BEFORE the cap keeps a full set of usable options as
      // picks accumulate rather than quietly thinning it (E053).
      const matchingSkills = (
        q ? skillOpts.filter((sk) => sk.name.toLowerCase().includes(q)) : skillOpts
      ).filter((sk) => !chosenSkills.has(sk.id));
      const shownSkills = matchingSkills.slice(0, MAX_SKILL_SUGGESTIONS);
      const hiddenSkillCount = matchingSkills.length - shownSkills.length;

      const toggleSkill = (id: string) =>
        setProfile((p) => {
          const has = p.skillIds.includes(id);
          const opt = skillOpts.find((x) => x.id === id);
          return {
            ...p,
            skillIds: has ? p.skillIds.filter((x) => x !== id) : [...p.skillIds, id],
            skillNames: has
              ? p.skillNames.filter((x) => x.id !== id)
              : [
                  ...p.skillNames,
                  // The DOMAIN still rides along on every chip — it is what
                  // tells two identically-named skills apart ("Project Manager"
                  // exists under two domains), which is exactly why the FK
                  // stays even though the tier is gone.
                  { id, name: opt?.name ?? "", area: opt?.pillar?.name ?? null },
                ],
          };
        });

      const addCustomSkill = () => {
        const name = skillQuery.trim();
        if (!name) return;
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
      const fromResume = new Set(profile.resumeSkillIds);
      const aiMatchedCount = profile.skillIds.filter((id) =>
        fromResume.has(id)
      ).length;
      const cameFromResume = aiMatchedCount > 0;

      const roleNames = profile.roleTypeIds
        .map((id) => fieldRoles.find((r) => r.id === id)?.name)
        .filter(Boolean);

      return (
        <WizardShell
          {...shell({
            /*
              E202 — THE ASK IS EXPLICIT ON ARRIVAL. The old subtitle described
              the controls ("Search, or add your own") and left the actual
              instruction implicit, so the step read as a search box with no
              stated goal — and with the cap gone there is no longer a number in
              the UI implying one. Say the two things that decide what a
              provider does here: add everything true of you, and more of them
              means more ways to be found.
            */
            title: "Which Skills Do You Want to Be Found For?",
            subtitle:
              roleNames.length > 0
                ? `Add every skill you have across ${roleNames.join(" and ")} — there's no limit, and each one is another search a buyer can find you in. Search the catalog or add your own.`
                : "Add every skill you have — there's no limit, and each one is another search a buyer can find you in. Search the catalog or add your own.",
            onContinue: () =>
              saveAnd("skills", {
                skillIds: profile.skillIds,
                customSkills: profile.customSkills,
                customSkillRoleId: profile.roleTypeId,
                roleTypeIds: profile.roleTypeIds,
                roleTypeId: profile.roleTypeId,
              }),
            continueDisabled: totalPicked === 0,
          })}
        >
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
          {(profile.skillNames.length > 0 || profile.customSkills.length > 0) && (
            <div className="mb-4">
              <p className="mb-1.5 text-[13px] font-bold">
                {/* E202 — a count, not a quota. "12/15" turned a list of what
                    you can do into a budget you were spending. */}
                Your Skills{" "}
                <span className="font-normal text-ink-2">({totalPicked})</span>
              </p>
              <div className={`flex flex-wrap gap-2 ${PICKED_REGION}`}>
                {profile.skillNames.map((sk) => (
                  <Chip key={sk.id} selected onClick={() => toggleSkill(sk.id)}>
                    {sk.name}
                    {sk.area && roleNames.length > 1 && (
                      <span className="ml-1 text-[12px] font-normal opacity-75">
                        · {sk.area}
                      </span>
                    )}
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

          {/* SEARCH-FIRST. The catalog is meant to grow without limit, so the
              page must never grow with it: a capped suggestion set inside a
              fixed-height scroll region (E053/E054). */}
          <div className="flex flex-wrap items-center gap-2">
            <TextInput
              value={skillQuery}
              onChange={(e) => setSkillQuery(e.target.value)}
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
              disabled={!skillQuery.trim()}
              className="rounded-full border-[1.5px] border-line px-5 py-2.5 font-bold transition-colors hover:border-magenta hover:text-magenta disabled:opacity-40"
            >
              + Add
            </button>
          </div>

          <div className={`mt-3 max-h-[220px] ${SCROLL_REGION}`}>
            <div className="flex flex-wrap gap-2">
              {shownSkills.map((sk) => (
                <Chip key={sk.id} selected={false} onClick={() => toggleSkill(sk.id)}>
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
        </WizardShell>
      );
    }

    /*
      WS-4 — THE WORK-HISTORY REVIEW, which replaces the Role and Skills steps.

      The résumé has already tagged each job with its suite, role and modules
      (WS-3); this is where the provider scans and corrects. Two steps became
      one, and every answer is now attached to the engagement that evidences it
      rather than asserted at profile level.
    */
    case "work_history": {
      const reviewJobs = profile.employers.map((e) => ({
        id: e.id,
        name: e.name,
        roleTitle: e.roleTitle,
        startDate: e.startDate,
        endDate: e.endDate,
        suite: (e.suite ?? null) as SoftwareSuite | null,
        roleTypeId: e.roleTypeId ?? null,
        skills: e.skills ?? [],
        needsSuite: Boolean(e.needsSuite),
      }));

      return (
        <WizardShell
          {...shell({
            title: "Here's what we read from your r\u00e9sum\u00e9",
            subtitle:
              "Each job shows the system it ran on and the modules you used. Fix anything we got wrong \u2014 it only changes that job.",
            onContinue: () => saveAnd("work_history", { jobs: jobPatches }),
            // Never blocked on the AI's uncertainty: an unanswered "which
            // system?" is a nudge, not a gate. Only an empty history stops you,
            // and that is the step's own subject.
            continueDisabled: reviewJobs.length === 0,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <WorkHistoryReview
            jobs={reviewJobs}
            roleOptions={fieldRoles.map((r) => ({ id: r.id, name: r.display }))}
            skillOptionsForSuite={skillOptionsForSuite}
            onChange={setJobPatches}
          />
        </WizardShell>
      );
    }

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
      // TWO MODES, one for each job (PJv2 WS9). Browsing is a cascade — one open
      // tier at a time. Searching is a flat lookup ACROSS the tiers, because
      // someone typing "Workday" should not have to know whether we filed it
      // under a product, a methodology or an industry.
      const searching = sq.length > 0;

      // Which tier each catalog item belongs to — the cascade needs it to count
      // and label a collapsed tier, and to pin the open one on a pick.
      const kindById = new Map<string, string>();
      specGroups.forEach((g) => g.items.forEach((i) => kindById.set(i.id, g.kind)));
      const pickedNames = (kind: string) =>
        profile.specializationIds
          .filter((id) => kindById.get(id) === kind)
          .map((id) => specById.get(id) ?? "Specialization");

      /**
       * E054 — search results stay capped PER GROUP and inside ONE bounded
       * region. A single overall cap would spend its whole budget on the first
       * group and hide the later ones; three separate regions would let the page
       * (and so the Continue button) grow as you type, which is the thing E053
       * was filed about.
       *
       * Chosen items are excluded because they are already chips above — the same
       * rule the Skills tier uses, so the suggestion area only ever holds things
       * you can still act on.
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

      /**
       * The open tier: the provider's last pick if they have one, else the first
       * tier still empty, so the step opens on work to be done rather than on a
       * tier that is already answered. All three collapse once all three have
       * something — the step is optional, and a wall of open pickers is what WS9
       * was filed to remove.
       */
      const openSpecKind =
        openSpecTier ??
        specGroups.find((g) => pickedNames(g.kind).length === 0)?.kind ??
        null;

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

      const toggleSpec = (id: string) => {
        // Pin the tier this item lives in. Without this, picking the first item
        // in tier 2 makes tier 2 no-longer-the-first-empty-tier, and the cascade
        // would collapse it and jump to tier 3 mid-selection.
        const kind = kindById.get(id);
        if (kind) setOpenSpecTier(kind);
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
      };

      return (
        <WizardShell
          {...shell({
            title: "What Are Your Specializations?",
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

              {searching ? (
                /* SEARCH MODE — flat results across all three tiers, grouped so
                   you can still see WHICH tier a match came from, inside one
                   fixed-height region so typing never moves the footer. */
                <>
                  <div className={`mt-3 max-h-[320px] ${SCROLL_REGION}`}>
                    {groups.length === 0 ? (
                      <p className="text-[14px] text-ink-2">
                        No matches — use “+ Add” to create it.
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
                </>
              ) : (
                /*
                  BROWSE MODE — the RDS collapsing-cascade (WS9 / E073), now with
                  INDUSTRIES AS ITS OWN TIER rather than a third heading inside a
                  shared scroll box. Industry is a different KIND of claim from a
                  product or a method — "I know Workday" and "I know utilities"
                  are answers to different buyer questions — and burying it third
                  in one list made it the section people scrolled past.

                  Unlike Role → Domain → Skill, these tiers are INDEPENDENT: none
                  gates the next, because a provider with no product to name still
                  has an industry. So the cascade here is only the disclosure
                  shape — one tier open, the others one line each.
                */
                <div className="mt-3 space-y-2.5">
                  {specGroups.map((g, gi) => {
                    const picked = pickedNames(g.kind);
                    const summary =
                      picked.length === 0
                        ? "None yet"
                        : picked.slice(0, 2).join(", ") +
                          (picked.length > 2 ? ` +${picked.length - 2}` : "");
                    const chosenHere = g.items.filter((i) => chosenSpecs.has(i.id));
                    const avail = g.items.filter((i) => !chosenSpecs.has(i.id));
                    const hidden = Math.max(0, avail.length - MAX_SPECS_PER_TIER);

                    return (
                      <CascadeTier
                        key={g.kind}
                        index={gi + 1}
                        label={g.label}
                        // Open tier → null, which is what makes CascadeTier
                        // render the picker instead of the summary row.
                        chosen={openSpecKind === g.kind ? null : summary}
                        changeLabel={picked.length === 0 ? "Add" : "Change"}
                        onChange={() => setOpenSpecTier(g.kind)}
                      >
                        {/* Exactly THREE chip rows (38px chip + 48px pitch +
                            the region's own 12px padding). A round number like
                            132px lands mid-chip, and a chip sliced through the
                            middle reads as a rendering bug rather than as "there
                            is more below" — the tinted, bordered, scrolling box
                            already says that. */}
                        <div className={`max-h-[176px] ${SCROLL_REGION}`}>
                          <div className="flex flex-wrap gap-2">
                            {/*
                              E086 — this tier's OWN picks, first and removable.
                              An expanded section used to show only what you could
                              still add, so Industries could read "Retail +" while
                              saying nothing about the two industries you had
                              already chosen; the only evidence was the aggregate
                              row at the top and the collapsed summary you had just
                              opened. The skills tier has always shown its picks
                              in place, and this is the same rule.
                            */}
                            {chosenHere.map((item) => (
                              <Chip
                                key={item.id}
                                selected
                                onClick={() => toggleSpec(item.id)}
                              >
                                {item.name}
                              </Chip>
                            ))}
                            {avail.slice(0, MAX_SPECS_PER_TIER).map((item) => (
                              <Chip
                                key={item.id}
                                selected={false}
                                onClick={() => toggleSpec(item.id)}
                              >
                                {item.name}
                              </Chip>
                            ))}
                            {avail.length === 0 && chosenHere.length === 0 && (
                              <p className="text-[14px] text-ink-2">
                                Nothing listed here yet — use the search above to
                                add one.
                              </p>
                            )}
                            {avail.length === 0 && chosenHere.length > 0 && (
                              <p className="w-full text-[13px] text-ink-2">
                                You&apos;ve picked everything we list here.
                              </p>
                            )}
                          </div>
                        </div>
                        {hidden > 0 && (
                          <p className="mt-2 text-[13px] text-ink-2">
                            +{hidden} more — search above to find them.
                          </p>
                        )}
                      </CascadeTier>
                    );
                  })}
                </div>
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
            title: "Clients Love to Hear About Your Education",
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
            title: "What Languages Do You Speak?",
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
                /*
                  E106 — keyed by POSITION, not by value.

                  The key was `${l.name}-${i}`, so every keystroke produced a new
                  key, React threw the row away and mounted a fresh one, and the
                  input lost focus after each character — the user had to click
                  back in to type the next letter. The row's identity is its
                  place in the list; it was never the text inside it.
                */
                key={i}
                className="flex flex-wrap items-end gap-3 rounded-brand border border-line p-4"
              >
                <div className="min-w-[180px] flex-1">
                  <Field label="Language *">
                    {i === 0 ? (
                      // English is always row zero and not editable (E016).
                      <TextInput
                        value={l.name}
                        readOnly
                        className="bg-bg-soft text-ink-2"
                      />
                    ) : (
                      /*
                        E106 — a pick-list. Free text collected "spanish",
                        "Spanish (fluent)" and "Espanol" as three different
                        languages, which makes the field useless for matching
                        and is invisible to the person typing it.
                      */
                      <select
                        value={l.name}
                        onChange={(e) => update(i, { name: e.target.value })}
                        className="w-full rounded-[12px] border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta"
                      >
                        <option value="">Choose a language…</option>
                        {LANGUAGES.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    )}
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
            title: "Tell Clients What You Do",
            subtitle:
              "A few lines is all it takes — this becomes the Overview at the top of your profile. What do you do best? You can always edit it later.",
            onContinue: () => saveAnd("bio", { overview: profile.overview }),
            continueDisabled: len < MIN_BIO,
          })}
        >
          {error && <Notice>{error}</Notice>}
          <TextArea
            value={profile.overview}
            onChange={(e) => setProfile((p) => ({ ...p, overview: e.target.value }))}
            maxLength={MAX_BIO}
            // Sized to what it now holds. A 224px box invites an essay and then
            // stops accepting one at 600 characters, which reads as the field
            // breaking rather than as a limit.
            className="min-h-36"
            placeholder="I help organizations implement and optimize…"
          />
          <div className="mt-2 flex justify-between text-[13px]">
            {/* E061, same principle as E059 — AMBER while under the minimum,
                not red. Someone mid-sentence has not done anything wrong; they
                are simply not finished. Red is for genuine errors. Once the
                minimum is met the counter turns green, so the state change is
                a small reward rather than the mere absence of an alarm. */}
            <span
              className={
                len < MIN_BIO ? "text-amber-700" : "font-semibold text-emerald-600"
              }
            >
              {len < MIN_BIO
                ? `At least ${MIN_BIO} characters — ${MIN_BIO - len} to go.`
                : "✓ Looks good."}
            </span>
            {/* Amber as the ceiling comes into view, for the same reason the
                minimum is amber (E059/E061): approaching a limit is not an
                error. It only turns red once there is genuinely no room left. */}
            <span
              className={
                left === 0
                  ? "font-semibold text-red-700"
                  : left <= 80
                    ? "text-amber-700"
                    : "text-ink-2"
              }
            >
              {left} characters left
            </span>
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
            title: "Tell Clients What You Charge",
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
                <span className="font-semibold text-magenta">Learn More</span>
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

    // ---- Picture (PJv2 WS1) --------------------------------------------
    //
    // Its own step now rather than a button buried on the review. A photo is
    // worth 10 completeness points and is the single biggest driver of whether
    // a buyer opens a profile, so it gets asked for explicitly — and stays
    // skippable, because nobody should be blocked on finding a headshot.
    // ---- 9/10 — Photo & Details: the WRAPUP step (WS8/E088) -----------
    case "picture": {
      /*
        E203 — "has some characters in it" was the old test, and it passed for
        "abc". Continue now needs a phone that could actually be dialled.
      */
      const wrapupReady =
        Boolean(profile.photoUrl) && isPhoneComplete(phoneInput, addr.country);

      /**
       * Saves BOTH halves. The photo is its own step payload; phone and
       * address go through the `finish` handler, which is where those columns
       * are written. Two calls rather than one because the step handlers
       * are keyed by step, and inventing a third payload shape to merge them
       * would put the same three columns behind two different writers.
       */
      const saveWrapup = async () => {
        if (!(await postStep("picture", { photoUrl: profile.photoUrl ?? null }))) {
          return;
        }
        // E090's lesson, applied here from the start: check the result and stop,
        // rather than moving on and reporting a later failure's message.
        if (
          !(await postStep("finish", {
            address: profile.address,
            phone: phoneInput,
          }))
        ) {
          return;
        }
        goNext();
      };

      return (
        <WizardShell
          {...shell({
            title: "Last Thing — Your Photo and a Few Details",
            subtitle:
              "Profiles with a photo get noticeably more responses. We need your phone and address too — they stay private, and they're how a buyer reaches you.",
            // E188 — the ONLY change to this step's layout. Its body opens with
            // the 140px avatar panel, which is already a visual break; the
            // standard 32px title gap on top of that pushed the photo and the
            // Country field down the page for nothing.
            tightBody: true,
            onContinue: saveWrapup,
            continueDisabled: !wrapupReady,
          })}
        >
          {error && <Notice>{error}</Notice>}
          {/*
            E107 — photo BESIDE the details on a wide screen, stacked below it on
            a narrow one. The photo panel was a full-width block with a 140px
            avatar centred in it, so the page ran tall and the fields underneath
            were pushed well below the fold on a laptop. Nothing here overflows
            horizontally (measured 1280 → 320px), which was the other half of
            E107 — that was resolved when the standalone "You're Done!" page was
            folded into this step and stopped being a separate, wider layout.
          */}
          <div className="flex flex-col items-center gap-5 rounded-brand border border-line p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-7 sm:text-left">
            <Avatar
              firstName={profile.firstName}
              lastName={profile.lastName}
              photoUrl={profile.photoUrl}
              size={140}
            />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
                <button
                  type="button"
                  onClick={() => setPhotoModal(true)}
                  className="rounded-full bg-magenta px-6 py-3 font-bold text-white transition-colors hover:bg-magenta-dark"
                >
                  {profile.photoUrl ? "Change Photo" : "Upload A Photo"}
                </button>
                {profile.photoUrl && (
                  <button
                    type="button"
                    onClick={() => setProfile((p) => ({ ...p, photoUrl: null }))}
                    className="text-[14px] font-semibold text-ink-2 underline underline-offset-4 hover:text-magenta"
                  >
                    Remove
                  </button>
                )}
              </div>
              <p className="mt-2 text-[13px] text-ink-2">
                A clear headshot works best — square, and at least 200×200.
              </p>
            </div>
          </div>

          {/*
            WS8/E088 — the "You're Done!" details, now IN the counted flow. They
            used to be collected after the last numbered step, so two required
            things sat outside the 10 the provider was being counted through, and
            a returning provider was never resumed onto them. Upwork-style: the
            photo step is the wrapup catch-all.
          */}
          <div className="mt-6">
            <ProfileCard title="Your Details">
              <div className="space-y-3">
                {/*
                  DATE OF BIRTH IS GONE (WS7). It was required here and gated
                  both publish and marketplace visibility, and nothing in the
                  marketplace ever used it: a buyer needs to reach a provider,
                  not know their age. If age or legal capacity is ever needed it
                  rides the tax/payout gate, where there is a reason to ask.
                  The column stays nullable — no destructive drop.
                */}
                {/*
                  E203 — masked, digits-only, validated on blur. The country
                  comes from the address block below, whose hint has always
                  promised it "sets how we format your phone number"; this is
                  the first version where that is true.
                */}
                <PhoneField
                  id="review-phone"
                  value={phoneInput}
                  onChange={setPhoneInput}
                  country={addr.country}
                />
                {/*
                  E126 — COUNTRY FIRST, above the street line. It decides what
                  the fields under it even mean ("State" here, "Province" in
                  Canada, "County" in Ireland), so asking it last meant asking
                  the rest before knowing what they were. Same shared block as
                  the employer modal (E123), which is what stops one provider
                  meeting two different location forms in one sitting.
                */}
                <LocationFields
                  withStreet
                  countryHint="Also sets how we format your phone number."
                  value={{
                    country: addr.country,
                    line1: addr.line1,
                    city: addr.city,
                    state: addr.state,
                    postalCode: addr.postalCode,
                  }}
                  onChange={(patch) =>
                    setAddr({
                      ...(patch.country !== undefined
                        ? { country: patch.country ?? "" }
                        : {}),
                      ...(patch.line1 !== undefined
                        ? { line1: patch.line1 ?? "" }
                        : {}),
                      ...(patch.city !== undefined ? { city: patch.city ?? "" } : {}),
                      ...(patch.state !== undefined
                        ? { state: patch.state ?? "" }
                        : {}),
                      ...(patch.postalCode !== undefined
                        ? { postalCode: patch.postalCode ?? "" }
                        : {}),
                    })
                  }
                />
              </div>
            </ProfileCard>
          </div>

          <PhotoCropModal
            open={photoModal}
            onClose={() => setPhotoModal(false)}
            onUploaded={(photoUrl) => setProfile((p) => ({ ...p, photoUrl }))}
          />
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
    // ---- YOUR COMPANY (WS5) ------------------------------------------
    //
    // THE SAME COMPONENT THE BUYER SIDE USES. Every provider is a company: a
    // sole proprietor picks "Sole Proprietor / Individual" as the business type
    // and is a company of one. There is deliberately no separate individual
    // branch, because the tax type is what the payout gate reads later for
    // SSN-vs-EIN and 1099-reportability — a second path would have to answer
    // the same question anyway, in a place nobody would think to look.
    case "company": {
      if (companyPending) {
        return (
          <WizardShell
            {...shell({
              title: `Waiting on ${companyPending}.`,
              subtitle:
                "Your request went to that company's admin. You can finish your profile as soon as they approve it — nothing you've entered is lost.",
              onContinue: undefined,
            })}
          >
            <div className="mx-auto w-full max-w-xl space-y-4">
              <Notice tone="info">
                We couldn&apos;t confirm you automatically because your work
                email isn&apos;t on that company&apos;s domain. That&apos;s
                normal — it just needs a person to say yes.
              </Notice>
              <button
                type="button"
                onClick={() => setCompanyPending(null)}
                className="text-[14.5px] font-bold text-magenta hover:underline"
              >
                Pick a different company instead
              </button>
            </div>
          </WizardShell>
        );
      }
      return (
        <WizardShell
          {...shell({
            title: "Who Are You Working As?",
            subtitle:
              "Work orders and payments are between companies. Working for yourself? That's a company of one — pick Sole Proprietor as the business type.",
          })}
          /* The handlers are JSX props, not members of the `shell()` object:
             reading `submitRef.current` inside a plain object literal reads to
             the react-hooks rule as accessing a ref during render. */
          onContinue={() => companySubmit.current?.()}
          continueDisabled={!companyValid}
          busy={busy || companyBusy}
        >
          <div className="mx-auto w-full max-w-xl">
            <CompanyStep
              bounded
              suggestedName={profile.suggestedCompanyName ?? null}
              submitRef={companySubmit}
              onValidityChange={setCompanyValid}
              onBusyChange={setCompanyBusy}
              onDone={async (outcome) => {
                if (outcome.status === "PENDING") {
                  setCompanyPending(outcome.name);
                  return;
                }
                if (await postStep("company", {})) goNext();
              }}
            />
          </div>
        </WizardShell>
      );
    }

    // Deliberately WITHOUT the post-publish promo widgets (Promote with ads,
    // Boost, Buy connects, Availability badge) and without Packages: those sell
    // a profile that is already live.
    case "finish": {
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
            phone: phoneInput,
          photoUrl: profile.photoUrl,
          address: profile.address,
          employers: profile.employers,
          unclassifiedProjects: profile.employers.reduce(
            (n, e) => n + (e.projects ?? []).filter((pr) => !pr.roleType).length,
            0
          ),
          education: profile.education,
          certifications: profile.certifications,
          specializations: profile.specializationNames,
        })
      );

      /*
        WS5 — a section's own quiet note, rendered inside it.

        Non-blocking by construction: it takes its text from the `changes` list
        that used to be a panel, so the two can never disagree about what is
        suggested, and it renders as a sentence rather than a warning row.
      */
      const noteFor = (id: string) => {
        const item = changes.find((c) => c.id === id);
        if (!item) return null;
        return (
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
            {item.message}
          </p>
        );
      };

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
            /*
              WS5 — the BIO is edited on THIS page. It has no step to travel to
              any more, so sending the fix to the photo step would scroll past
              the very field it is about. Everything else still lives on the
              photo step.
            */
            if (fix.field === "overview") {
              const bio = document.getElementById("review-overview");
              bio?.scrollIntoView({ behavior: "smooth", block: "center" });
              window.setTimeout(
                () => (bio as HTMLTextAreaElement | null)?.focus(),
                350
              );
              break;
            }
            // WS8 — these inputs live on the Photo & Details step now, so the
            // click-to-fix has to travel there before it can focus anything.
            goTo("picture");
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
      // The review renders the SAME ProjectCard the published profile does.
      // Read the FULL project list — flattening employers would drop any
      // project with no `employer_id` (brief_profile_layout_v2 §4), and label
      // each with its employer for the card subtitle.
      const employerNameById = new Map(
        profile.employers.flatMap((e) =>
          (e.projects ?? []).map((pr) => [pr.id, e.name] as const)
        )
      );
      const projects = profile.projects.map((pr) => ({
        ...pr,
        employer: employerNameById.get(pr.id) ?? null,
      }));

      // E074 — Solo Projects is null-employer ONLY.
      const soloProjects = projects.filter((pr) => !employerNameById.has(pr.id));

      /*
        E130 — ONE affordance rule for every section.

        The review offered two patterns: five sections had an "✏️ Edit" pencil
        and Certifications had a "+ Add Certification" button inside its body, so
        an empty section either invited you in or didn't depending on which one
        you were looking at — and a pencil on an empty section reads as "edit
        what?".

        The rule: EMPTY sections say "+ Add X", populated ones say "✏️ Edit".
        One verb per state, applied everywhere, so the affordance describes what
        the click actually does.
      */
      const sectionAction = (title: string, step: Step, isEmpty: boolean) => (
        <EditButton
          title={title}
          label={isEmpty ? `Add ${title}` : "Edit"}
          icon={isEmpty ? "+" : "✏️"}
          onClick={() => {
            setReturnToReview(true);
            goTo(step);
          }}
        />
      );
      const editBtn = (title: string, step: Step) =>
        sectionAction(title, step, false);

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

          {/*
            WS5 / E181 — THE BIG SUGGESTIONS PANEL IS GONE.

            A wall of amber "needs attention" rows at the top of the last screen
            reads as "here is all this work, and it is still not right" — the
            opposite of a page whose whole claim is that you are two minutes
            from published. `profile_tiers.md` makes the same point: with a lot
            missing, keep the top light and let the SECTIONS carry their own
            fixes.

            So only ERRORS appear up here — and after WS6 there is usually
            exactly one candidate, an AI-written bio over the limit. The
            suggestions moved into the sections they are about, as one quiet
            line each.
          */}
          <ReviewChecklist errors={errors} changes={[]} onFix={applyFix} />

          {/* The soft page background the published profile sits on, so the
              white section cards read the same way here as they do there. */}
          <div className="mt-6 rounded-brand bg-bg-soft p-4 sm:p-5">
            <ProfileHero
              // The wizard title is the page h1; keep heading ranks sane.
              headingAs="h2"
              firstName={profile.firstName}
              lastName={profile.lastName}
              photoUrl={profile.photoUrl}
              headline={profile.headline}
              /*
                E205 — NO BIO IN THE HERO ON THIS PAGE. The published profile
                shows it here; the review page also has to EDIT it, and a
                600-character paragraph rendered twice — once read-only in the
                hero and again in the textarea below — was the single largest
                block of duplicated height on the page. The editable copy is the
                one that survives, because it is the one that does something,
                and the hero's "Edit bio" button already scrolls to it.
              */
              overview={null}
              rateMinCents={profile.rateMinCents ?? profile.hourlyRateCents}
              rateMaxCents={profile.rateMaxCents ?? profile.hourlyRateCents}
              youGetCents={youGet}
              language={profile.languages[0]?.name ?? null}
              country={addr.country?.trim() || null}
              aside={
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPhotoModal(true)}
                    className="text-[13.5px] font-bold text-magenta hover:text-magenta-dark"
                  >
                    {profile.photoUrl ? "Change Photo" : "+ Add Photo"}
                  </button>
                  <EditButton title="Title" onClick={() => goTo("title")} label="Edit title" />
                  {/* WS5 — the bio is edited on THIS page; there is no bio
                      step to travel to any more. */}
                  <EditButton
                    title="Bio"
                    onClick={() => {
                      const el = document.getElementById("review-overview");
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      window.setTimeout(
                        () => (el as HTMLTextAreaElement | null)?.focus(),
                        350
                      );
                    }}
                    label="Edit bio"
                  />
                  <EditButton title="Rate" onClick={() => goTo("rate")} label="Edit rate" />
                </div>
              }
            />

            {/*
              ---- Bio, EDITED IN PLACE (WS5) -------------------------------

              The bio stopped being a step, and nothing else on the app could
              edit it: `OverviewBody` was imported here and never rendered, so
              with the step gone an AI-written bio would have been unreachable —
              including one over the 600-character limit, which is the one hard
              error this page can still raise. The fix has to live where the
              problem is.

              Saves on blur rather than on a button: this is a review page, not
              a form, and a section that silently keeps your edit is the pattern
              every other section here already uses.
            */}
            <div className="mt-5">
              <ProfileCard
                title="Bio"
                edit={
                  <span className="text-[13px] text-ink-2">
                    {profile.overview.trim().length}/{MAX_BIO}
                  </span>
                }
              >
                <TextArea
                  id="review-overview"
                  value={profile.overview}
                  onChange={(e) =>
                    setProfile((pp) => ({ ...pp, overview: e.target.value }))
                  }
                  onBlur={() => {
                    if (profile.overview.trim().length <= MAX_BIO) {
                      void postStep("bio", { overview: profile.overview });
                    }
                  }}
                  placeholder="A few lines about what you do best."
                  className={
                    profile.overview.trim().length > MAX_BIO
                      ? "border-red-600 focus:border-red-600"
                      : ""
                  }
                />
                {noteFor("overview-empty")}
                {profile.overview.trim().length > MAX_BIO ? (
                  <p role="alert" className="mt-2 text-[13.5px] font-semibold text-red-700">
                    {profile.overview.trim().length - MAX_BIO} characters over —
                    trim it to publish.
                  </p>
                ) : (
                  <p className="mt-2 text-[13px] text-ink-2">
                    Optional, and you can add it later — buyers do read it.
                  </p>
                )}
              </ProfileCard>
            </div>

            {/* ---- pg1: Work History, full width ------------------------ */}
            <div className="mt-5">
              <ProfileCard
                title="Work History"
                edit={
                  // E132 — the import offer sits BESIDE the edit action, always,
                  // not only when the section is empty.
                  <span className="flex flex-wrap items-center gap-4">
                    <ResumeImportAction
                      onApplied={async () => {
                        // Re-read the profile so the section shows what was just
                        // imported, rather than trusting a local patch.
                        const r = await fetch("/api/onboarding/status");
                        if (r.ok) hydrate(await r.json());
                      }}
                    />
                    {sectionAction(
                      "Work History",
                      "tell_us",
                      profile.employers.length === 0
                    )}
                  </span>
                }
              >
                {/*
                  E129 — THE REACHABLE OFFER. An empty work history on the review
                  used to be a dead end: the AI pass only existed on the import
                  step, so a provider who imported last week — or whose profile
                  predates the parser, which is Marelise and Eddie — had no way
                  to ask for another read. Now the offer is where the emptiness
                  actually is.

                  Shown only when there is nothing to lose (no employers), so a
                  provider with real work history is never nudged toward a
                  re-import they didn't ask for.
                */}
                {profile.employers.length === 0 ? (
                  <AiPassPanel
                    compact
                    heading="No work history yet — want us to read your résumé again?"
                    reasons={[
                      "Your profile has no jobs or projects on it. If you uploaded a résumé, our reader may have missed a layout it couldn't follow.",
                    ]}
                    onUpload={() => {
                      void logResumePath("reupload");
                      goTo("tell_us");
                      setUploadModal(true);
                    }}
                    onManual={() => {
                      void logResumePath("manual");
                      setReturnToReview(true);
                      goTo("tell_us");
                      setEditingWork(true);
                    }}
                    onApplied={(body) => {
                      if (body.state) hydrate(body.state as StatusPayload);
                    }}
                  />
                ) : (
                  <WorkHistoryBody
                    employers={profile.employers}
                    projects={projects}
                    empty="No work history yet. Providers who add work experience and projects are twice as likely to win work."
                  />
                )}
              </ProfileCard>
            </div>

            {/*
              ---- pg2: the 2-column grid -------------------------------

              E205 — SOLO PROJECTS JOINED THE GRID. It was full-width below Work
              History, and for most providers it is empty or two lines — a whole
              screen-width band carrying one sentence, directly above a grid of
              cards the same size as its content. Bio and Work History stay full
              width because they genuinely fill it.
            */}
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <ProfileCard
                title="Solo Projects"
                edit={sectionAction("Solo Projects", "tell_us", soloProjects.length === 0)}
              >
                <SoloProjectsBody
                  projects={soloProjects}
                  empty="No solo projects yet — work you delivered outside a job goes here."
                />
              </ProfileCard>
              <ProfileCard
                title="Skills"
                edit={sectionAction("Skills", "catalog", profile.skillNames.length === 0)}
              >
                <SkillsBody
                  skills={profile.skillNames}
                  field={
                    profile.roleTypeName && profile.pillarName
                      ? { role: profile.roleTypeName, domain: profile.pillarName }
                      : null
                  }
                />
              </ProfileCard>

              <ProfileCard
                title="Specializations"
                edit={sectionAction(
                  "Specializations",
                  "specializations",
                  profile.specializationNames.length === 0
                )}
              >
                <SpecializationsBody specializations={profile.specializationNames} />
                {noteFor("specializations")}
              </ProfileCard>

              <ProfileCard
                title="Education"
                edit={sectionAction("Education", "education", profile.education.length === 0)}
              >
                <EducationBody education={profile.education} />
                {noteFor("education")}
              </ProfileCard>

                {/* E057 — cards + a proper modal. The eight-field form that
                    used to be squeezed into the sidebar column is gone. */}
                <ProfileCard
                  title="Certifications"
                  // Certifications opens a modal rather than a step, so its
                  // action bumps the modal signal — but it LOOKS and reads
                  // exactly like every other section's.
                  edit={
                    <EditButton
                      title="Certifications"
                      label={
                        profile.certifications.length === 0
                          ? "Add Certification"
                          : "Edit"
                      }
                      icon={profile.certifications.length === 0 ? "+" : "✏️"}
                      onClick={() => setCertSignal((n) => n + 1)}
                    />
                  }
                >
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


              <ProfileCard title="Location">
                <LocationBody
                  location={
                    [addr.city, addr.state, addr.country]
                      .filter((x) => x && x.trim())
                      .join(", ") || null
                  }
                  country={addr.country?.trim() || null}
                />
              </ProfileCard>

              {/* E039 — testimonials are EARNED after delivering work. */}
              <ProfileCard title="Testimonials">
                <Empty>
                  No testimonials yet — you&apos;ll collect these as you deliver
                  work.
                </Empty>
              </ProfileCard>
            </div>

            {/*
              WS8/E088 — the identity FIELDS moved to the Picture step, which is
              now the wrapup. What stays here is the read-only status: "is my
              email verified" belongs on the page you publish from.
            */}
            <div className="mt-5">
              <ProfileCard title="Verify Identity">
                <VerificationsBody
                  emailVerified
                  phoneOnFile={Boolean(phoneInput.trim())}
                  phoneVerified={profile.phoneVerified}
                />
                <p className="mt-3 text-[13.5px] text-ink-2">
                  Phone and address are collected on the{" "}
                  <button
                    type="button"
                    onClick={() => goTo("picture")}
                    className="font-bold text-magenta underline underline-offset-4 hover:text-magenta-dark"
                  >
                    Photo &amp; Details
                  </button>{" "}
                  step.
                </p>
              </ProfileCard>
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

/**
 * Pre-verification chrome: logo only, deliberately NO stepper (E001).
 *
 * E091 — on the shared frame width like every other onboarding page, with the
 * form column capped by `contentWidth`. The earlier version narrowed the whole
 * PAGE to keep the form readable, which fixed the lines and made these pages a
 * different shape from the steps either side of them. Capping the column gets
 * both.
 */
function PlainShell({
  children,
  contentWidth,
  compact = false,
  /*
    ⚠ `footer` FORWARDED (`P1-J1.1-E246` §5). `OnboardingShell` and
    `OnboardingFrame` have both accepted it all along; THIS local wrapper simply
    never passed it on, which is why the sign-up screen was the one onboarding page
    with no full-bleed action band and drew its own rule inside the form column.
    ⚠ ADDING THE PASSTHROUGH IS THE WHOLE FIX — no frame or shell change was needed.
    ⚠ OPTIONAL, so the two callers that pass nothing (`check_email`, and this one's
    sibling) render exactly as before.
  */
  footer,
}: {
  children: React.ReactNode;
  contentWidth?: string;
  compact?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <OnboardingShell
      contentWidth={contentWidth}
      compact={compact}
      footer={footer}
    >
      {children}
    </OnboardingShell>
  );
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
  changeLabel = "Change",
  children,
}: {
  index: number;
  label: string;
  chosen: string | null;
  onChange?: () => void;
  /**
   * The reopen affordance. "Change" is right for a single-pick tier that already
   * has an answer; a MULTI-pick tier that is empty needs "Add", because there is
   * nothing there to change (PJv2 WS9).
   */
  changeLabel?: string;
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
            {changeLabel}
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
      {/* E059 — MAGENTA, not red. This box is the last thing a provider sees
          before publishing, and red framed a normal, expected state (a profile
          that isn't finished yet) as a failure. Brand magenta reads as "this is
          the app talking to you"; red is reserved for genuinely destructive
          states — deleting a record, an action that loses data. */}
      {errors.length > 0 && (
        <div className="rounded-brand border border-magenta/30 bg-magenta/[0.05] p-4">
          <p className="text-[15px] font-bold text-magenta-dark">
            {errors.length === 1
              ? "Just 1 thing left before you can publish."
              : `Just ${errors.length} things left before you can publish.`}
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
      <span aria-hidden className={tone === "error" ? "text-magenta" : "text-amber-600"}>
        {tone === "error" ? "●" : "○"}
      </span>
      {/* Body copy stays ink: the tint and the bullet already carry the
          signal, and a whole paragraph in brand colour is harder to read. */}
      <span className={tone === "error" ? "text-ink" : "text-ink-2"}>
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
/**
 * One sentence naming what the import filled in (WS5/E051).
 *
 * Replaces the "Here's What We Captured" panel. That panel listed the counts in
 * prose ABOVE sections that were already showing the same information by being
 * populated — the user read it twice, once as a claim and once as a fact.
 */
function capturedLine(outcome: ImportOutcome): string | null {
  const a = outcome.applied;
  const bits: string[] = [];
  if (a.headline) bits.push("your title");
  if (a.overview) bits.push("your bio");
  // E145 — "employer", never "role". "1 role" was the phrasing the walk
  // reported, sitting directly above a section headed Work History.
  if (a.experiences)
    bits.push(`${a.experiences} employer${a.experiences === 1 ? "" : "s"}`);
  if (a.education)
    bits.push(`${a.education} education entr${a.education === 1 ? "y" : "ies"}`);
  if (a.skillsMatched)
    bits.push(`${a.skillsMatched} skill${a.skillsMatched === 1 ? "" : "s"}`);
  if (a.languages)
    bits.push(`${a.languages} language${a.languages === 1 ? "" : "s"}`);
  if (bits.length === 0) {
    return "We couldn't pull anything usable out of that file — add your details below.";
  }
  return `We filled in ${bits.join(", ")}. Check it over and fix anything that's wrong.`;
}

/**
 * WHICH READER RAN, said out loud (E184).
 *
 * Named model, not "AI" — "we read it with AI" is exactly the claim that was
 * being made while nothing ran, so the version that replaces it carries
 * something checkable. A heuristic fallback says so plainly and says why; it
 * does not apologise, because for a document the rules handle it is a perfectly
 * good answer, just not the one the rest of the page is promising.
 */
function ReaderLine({
  path,
}: {
  path: NonNullable<ImportOutcome["path"]>;
}) {
  if (path.reader === "ai") {
    return (
      <p className="mb-6 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-2">
        <SparkIcon />
        Read by Panameer AI — {path.tier} model (<code>{path.model}</code>).
      </p>
    );
  }
  return (
    <p className="mb-6 rounded-[10px] border border-dashed border-line px-3 py-2 text-[13.5px] text-ink-2">
      <b className="text-ink">AI didn&apos;t read this one</b> — {path.reason}.
      What&apos;s below came from pattern-matching, so check it closely.
      {path.configProblem && (
        <span className="mt-1 block text-[12.5px]">{path.configProblem}</span>
      )}
    </p>
  );
}

/**
 * Route an import gap to the section that can fix it (WS5/E051).
 *
 * The gaps used to pile into one "Needs your attention" list sitting apart from
 * every field it referred to, which made each item a search task. The parser
 * emits them as sentences, so they are matched on the noun they mention rather
 * than by a code the parser does not carry — imperfect by construction, so
 * anything unmatched still surfaces, just at the bottom rather than not at all.
 */
function gapsFor(
  outcome: ImportOutcome | null,
  where: "work" | "other"
): string[] {
  const gaps = outcome?.gaps ?? [];
  const isWork = (g: string) => /employer|job|role|title|dates?|position|experience/i.test(g);
  return where === "work" ? gaps.filter(isWork) : gaps.filter((g) => !isWork(g));
}

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

/** The AI mark used wherever the product attributes work to AI (WS4/E174). */
function SparkIcon() {
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
