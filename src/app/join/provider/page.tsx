"use client";

import { roleLong } from "@/lib/role-labels";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { AiLine } from "@/components/onboarding/AiLine";
import { formatCents } from "@/lib/display";
import { Avatar } from "@/components/Avatar";
import { VerifyGate } from "@/components/onboarding/VerifyGate";
import {
  canSignUp,
  SignUpForm,
  type SignUpValues,
} from "@/components/onboarding/SignUpForm";
import { OnboardingShell } from "@/components/onboarding/OnboardingShell";
// WS-B) — 's disambiguation belongs with the picker that
import { isSkillShown } from "@/lib/shown-skills";
/* THE ONE DEFINITION of the five proficiencies (`E723`, `E585`). */
import { PROFICIENCY_OPTIONS } from "@/lib/languages";

import {
  OptionCard,
  Chip,
  Field,
  TextInput,
  TextArea,
  Notice,
} from "@/components/onboarding/controls";
// it now. type EducationDraft
import { EducationCards } from "@/components/onboarding/EducationCards";
import { type CertificationDraft } from "@/components/onboarding/CertificationsEditor";
// THE DRAFT, ITS SHAPE AND ITS ONE MAPPING MOVED TO `lib/onboarding-draft.ts`
import {
  type ProviderDraft as Profile,
  type StatusPayload,
  type AddressDraft,
  type LanguageDraft,
  type Step,
  ALL_STEPS,
  emptyDraft as emptyProfile,
  draftFromStatus,
  WORK_METHOD_OPTIONS,
} from "@/lib/onboarding-draft";
import { CertificationCards } from "@/components/onboarding/CertificationCards";
import {
  EmployersStep,
  /* `EmployerCard` and `EmployerProject` moved with the draft (`E164`). */
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
// that applies it.
import type { SoftwareSuite } from "@prisma/client";
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
// longer mounted here.
import { CompanyFinder } from "@/components/company/CompanyFinder";
import { ResumeReview } from "@/components/onboarding/ResumeReview";
import { AiPassPanel } from "@/components/onboarding/AiPassPanel";
import { ResumeImportAction } from "@/components/onboarding/ResumeImportAction";
import { Modal } from "@/components/Modal";
import { formatLocality } from "@/lib/locality";
import {
  reviewItems,
  splitReviewItems,
  type ReviewItem,
  type ReviewFix,
} from "@/lib/review-validation";
import {
  // WS-B) — the fee panel that used them is there now.
  rateBreakdown,
  displayFirstName,
  /* `DEFAULT_SERVICE_FEE_BPS` moved with `emptyDraft` (`E164`). */
} from "@/lib/display";
// import { PhoneField } from "@/components/onboarding/PhoneField"
// EDITOR 1 OF 5 WS-B). One component, mounted by the step and
// the field that enforces it, and nothing left in this file reads it — an
import { TitleEditor, titleCanSave } from "@/components/onboarding/editors/TitleEditor";
// EDITOR 2 OF 5 WS-B). Both fields it mounts were already
import { ContactEditor } from "@/components/onboarding/editors/ContactEditor";
/* EDITOR 3 OF 5 (`P2-A2-E597` WS-B). The wizard's local `Row` moved with it. */
import { RateEditor, rateCanSave, syncedHourly } from "@/components/onboarding/editors/RateEditor";
// EDITOR 4 OF 5 WS-B). `CascadeTier` moved with it; every
import { SpecializationsEditor } from "@/components/onboarding/editors/SpecializationsEditor";
// EDITOR 5 OF 5 WS-B). `SparkIcon` moved with it; the three
import { SkillsEditor, SparkIcon } from "@/components/onboarding/editors/SkillsEditor";
import { formatPhone, isPhoneComplete, parseStoredPhone, toE164 } from "@/lib/phone";

/** Provider (Seller) onboarding — journey P1-J1 (brief_P, extended by brief_R). */

/** Every step this wizard can render (PJv2 WS1 / E070). The ORDER a given user */
// Every screen this wizard can RENDER. The counted itinerary is a subset and
// imported above — the section route names the same steps when it saves, so the
// It has to ask the question WITHOUT touching `RECRUITER_STEPS`
type Screen = "signup" | "check_email" | "work_method" | Step;

/** The review screen's in-place editors WS-1). Each value names a */
type EditSection =
  | null
  | "title"
  | "roles"
  | "rate"
  | "work"
  | "skills"
  | "specializations"
  | "education"
  | "location";

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

// TWO CARDS, BECAUSE THERE WERE ONLY EVER TWO QUESTIONS ( WS-3)
// MOVED TO `lib/onboarding-draft.ts` WS-F) so

// THE SIGN-UP STEP'S PICKLIST READS THE ONE DEFINITION ( item 10, ).
const LANGUAGE_LEVELS = PROFICIENCY_OPTIONS;

/** Stepper heading + forward-button label per step — the exact strings from */
const RAIL_LABELS: Partial<Record<Step, string>> = {
  tell_us: "Résumé",
  title: "Title",
  roles: "Roles",
  skills: "Skills",
  rate: "Rates",
  picture: "Photo",
};

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
  /* "Overview", matching the column and the rest of the UI (`P1-A1.4-E399`). */
  bio: { stepper: "Your Overview" },
  rate: { stepper: "Your Rate" },
  picture: { stepper: "Your Photo" },
  company: { stepper: "Your Company" },
  finish: { stepper: "Review Your Profile" },
};

/** ROLE CARD COPY (E186) — the designed content, keyed by RoleType.code. */
const ROLE_CARD_COPY: Record<string, string> = {
  APPLICATION_SPECIFIC:
    "Mgt Consultant, P2P, O2C, R2R, Functional Analyst, Business Process Specialist",
  TECHNOLOGY_SPECIFIC:
    "Coder, Report Writer, Integration Specialist, PaaS Developer",
  PROJECT_SPECIFIC: "Project Manager, Program Manager, Tester, Trainer",
  OPERATIONS_SPECIFIC:
    "Buyer, HR Manager, Bookkeeper, Customer Service, Contract Administrator",
  AI_SPECIALIST: "AI Agent Builder, Prompt Engineer, AI Process Analyst, AI Implementation Lead",
};

const MIN_BIO = 100;
/** Mirrors `MAX_BIO_CHARS` in onboarding.ts (E087). Kept as a local constant like */
const MAX_BIO = 600;
/** E030 — never show more than ~15 options at once on the cascade page. */
const MAX_VISIBLE_OPTIONS = 15;

/** Bounded pickers (brief_Y / E053+E054). */
const MAX_SKILL_SUGGESTIONS = 12;

// NAMED BY SCOTT, 2026-09-17
const HELD_NOT_SHOWN_HEADING = "Not on your profile right now";
const HELD_NOT_SHOWN_EXPLANATION =
  "These are still yours — your current roles just don't put them in front of buyers. Widen your roles to show them again, or remove any you no longer want.";

// NAMED BY SCOTT, 2026-09-17 — the roles step's one-liner.
const ROLE_STEP_HIDDEN_NOTE = (n: number) =>
  `${n} of your skills sit under roles you haven't picked. They stay on your record — they just won't be offered to buyers.`;
/** Per GROUP, so every specialization section stays represented (E054). */
/** Per-group cap while SEARCHING — three groups have to share one window. */
const MAX_SPECS_PER_GROUP = 6;
/** Per-tier cap while BROWSING (PJv2 WS9). Higher than the search cap because an */
const MAX_SPECS_PER_TIER = 24;

/** A fixed-height scroll region. `overscroll-contain` keeps a scroll gesture */
const SCROLL_REGION =
  "overflow-y-auto overscroll-contain border border-line/70 bg-bg-soft/40 p-3";

/** The PICKED chips wrap (brief_Y keeps them wrapping) — but inside a bound, or */
// Raised from 84px for E102: a single-domain basket was two rows, a
// multi-domain one is three or four, and clipping the thing that proves your
// earlier picks survived defeats the point of showing it.
const PICKED_REGION = "max-h-[132px] overflow-y-auto overscroll-contain pr-1";

/** The shape `/api/onboarding/status` returns. Only what this page reads. */
;

;

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
;

;

// imported above under its old name.

const emptyAddress = (country = "United States"): AddressDraft => ({
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country,
});

/** The provider title cap (WS-4). Matches the talent card's one-line soft cap in */
// re-exported through the import below — the cap and the input that enforces it

export default function JoinProviderPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [screen, setScreen] = useState<Screen>("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** E090 — the DOB's own error, shown ON the field. A top-of-page Notice was the */
  const [notProvider, setNotProvider] = useState(false);
  /** The answer to the work-method screen, held before it is saved */
  const [workMethodPick, setWorkMethodPick] = useState<string | null>(null);

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
  const [unsorted, setUnsorted] = useState(0);
  /** E102 — which (role, domain) the SKILLS TIER is currently browsing. */
  /** E118 — JUMP AND RETURN. When an edit pencil on the review sends you to a */
  const [returnToReview, setReturnToReview] = useState(false);

  const [browseArea, setBrowseArea] = useState<{
    roleTypeId: string;
    pillarId: string;
    pillarName: string;
  } | null>(null);
  const [skillQuery, setSkillQuery] = useState("");
  // THE PENDING "DID YOU MEAN…?" . Non-null means the matcher
  const [skillMatch, setSkillMatch] = useState<{
    typed: string;
    prompt: string;
    skill: { id: string; name: string };
  } | null>(null);
  // WS-4 — the work-history review's pending corrections, and the module lists
  const [jobPatches, setJobPatches] = useState<JobPatch[]>([]);
  const [suiteSkills, setSuiteSkills] = useState<Record<string, { id: string; name: string }[]>>({});
  const [specQuery, setSpecQuery] = useState("");
  /** Which specialization tier is expanded (PJv2 WS9) — null means "whichever is */
  const [openSpecTier, setOpenSpecTier] = useState<string | null>(null);
  /** E057 — bumping this asks the review page's certification editor to open its */
  const [certSignal, setCertSignal] = useState(0);
  /** WS1 — the step list comes from the server, because it depends on the user */
  const [steps, setSteps] = useState<readonly Step[]>(DEFAULT_STEPS);
  // FALLS BACK TO THE COUNTED ITINERARY + 1 until `status` answers, so the
  const [wizardTotal, setWizardTotal] = useState<number>(DEFAULT_STEPS.length + 1);
  const [isRecruiter, setIsRecruiter] = useState(false);

  const [importOutcome, setImportOutcome] = useState<ImportOutcome | null>(null);
  // E187 — "an import exists on this profile" is gone. It was only ever a proxy
  const [uploadModal, setUploadModal] = useState(false);
  /** A résumé is uploading/parsing right now (E200). Held on the WIZARD, not in */
  const [parsingResume, setParsingResume] = useState(false);
  /** WS5/E084 — the post-upload review shows work history the way the profile
   *  does, and swaps to the editor in place when you ask to change it. */
  const [editingWork, setEditingWork] = useState(false);

  // WHICH SECTION THE REVIEW IS EDITING IN PLACE WS-1)
  const [editSection, setEditSection] = useState<EditSection>(null);
  /** WS-B — which imported-but-unmatched terms the provider has ticked. */
  const [pickedSuggestions, setPickedSuggestions] = useState<string[]>([]);
  const [suggestBusy, setSuggestBusy] = useState(false);
  const [suggestDone, setSuggestDone] = useState<string[] | null>(null);
  // PART 1 — this card's own error, because the page-level Notice is a
  const [suggestError, setSuggestError] = useState<string | null>(null);
  // THE REVIEW STEP'S PER-CARD ERRORS PART 2)
  const [bioError, setBioError] = useState<string | null>(null);
  const [workImportError, setWorkImportError] = useState<string | null>(null);
  const [certError, setCertError] = useState<string | null>(null);
  const [photoModal, setPhotoModal] = useState(false);

  /** Phone number (E019, verification STUBBED by E036). The SMS */
  const [phoneInput, setPhoneInput] = useState("");
  // THE PHONE'S OWN COUNTRY WS-2a)
  const [phoneCountry, setPhoneCountry] = useState<string | null>(null);
  // WHAT GETS PERSISTED IS E.164 , so the country travels with
  const phoneToSave = toE164(phoneInput, phoneCountry) ?? phoneInput;

  const stepIndex = steps.indexOf(screen as Step);

  // ---- hydration --------------------------------------------------------
  // The server owns profile state; every save returns the fresh snapshot and
  // we re-seed local form state from it rather than guessing what changed.
  const hydrate = useCallback((s: StatusPayload) => {
    if (s.steps?.length) setSteps(s.steps);
    if (s.displayTotalSteps) setWizardTotal(s.displayTotalSteps);
    if (typeof s.isRecruiter === "boolean") setIsRecruiter(s.isRecruiter);
    const p = s.profile;
    if (!p) return;
    // ONE MAPPING, IMPORTED WS-C). The 90-line object literal
    setProfile(draftFromStatus(p));
    // Masked on load as well, so a number stored before E203 displays the same
    // way a freshly typed one does.
    // THE STORED NUMBER NAMES ITS OWN COUNTRY . A number this field
    if (p.phone) {
      const stored = parseStoredPhone(p.phone);
      const seeded = stored.country ?? p.address?.country ?? null;
      setPhoneCountry((prev) => prev ?? seeded);
      setPhoneInput(stored.country ? stored.display : formatPhone(p.phone, seeded));
    } else {
      setPhoneCountry((prev) => prev ?? p.address?.country ?? null);
    }
  }, []);

  /** WHERE THE WIZARD OPENS — the deep-link-aware resume point. */
  const resumeInto = useCallback((s: StatusPayload) => {
    // The review page's edit pencils deep-link back to a specific step
    // (?step=bio). Anything unrecognised falls back to the resume point.
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("step");
    // UNCOUNTED SCREENS ARE LEGAL JUMP TARGETS TOO .
    const jumpable = new Set<Step>([
      ...((s.steps ?? DEFAULT_STEPS) as Step[]),
      // The uncounted-but-renderable screens. `page.tsx` keeps its own
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
    // THE ONE-SHOT `fresh` GATE IS GONE
setScreen(target);
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

        /** PJv2 WS1 — honour the user-type fork from `/join`. */
        const wanted = new URLSearchParams(window.location.search).get("type");
        // R1: recruiters are off — the ?type=recruiter fork no longer sets anyone up as one.
        if (wanted === "recruiter-r2" && !s.profile?.workMethod) {
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
          // A FAILED WRITE MUST SURFACE, NOT FALL THROUGH ( WS-1)
          if (saved.ok) {
            const again = await fetch("/api/onboarding/status");
            if (again.ok) s = await again.json();
          } else {
            setError(
              "We couldn't set you up as a recruiter. Please pick how you work below."
            );
          }
        }

        // R1: one way to work (services), so it's set silently instead of asked.
        if (s.emailVerified && !s.profile?.workMethod) {
          const saved = await fetch("/api/settings/profile/section", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ section: "work_method", data: { workMethod: "SERVICES" } }),
          });
          if (saved.ok) {
            const again = await fetch("/api/onboarding/status");
            if (again.ok) s = await again.json();
          }
        }
        hydrate(s);
        if (!s.emailVerified) {
          setScreen("check_email");
        } else if (!s.profile?.workMethod) {
          // Only if the silent save failed.
          setScreen("work_method");
        } else {
          resumeInto(s);
        }
      }
      setReady(true);
    })();
  }, [hydrate, resumeInto]);

  // ---- reference data ---------------------------------------------------
  useEffect(() => {
    // WS3 — the roles list is needed on THREE screens now: the Roles step, the
    // THE EDITOR CAN NOW BE OPEN ON A DIFFERENT `screen` ( WS-1)
    if (
      (screen === "roles" ||
        screen === "skills" ||
        screen === "catalog" ||
        editSection === "skills") &&
      fieldRoles.length === 0
    ) {
      fetch("/api/catalog/fields")
        .then((r) => r.json())
        .then((d) => setFieldRoles(d.roles ?? []))
        .catch(() => setError("We couldn't load the categories. Please refresh."));
    }
    if (
      (screen === "specializations" || editSection === "specializations") &&
      specGroups.length === 0
    ) {
      fetch("/api/catalog/specializations")
        .then((r) => r.json())
        .then((d) => setSpecGroups(d.groups ?? []))
        .catch(() =>
          setError("We couldn't load specializations. Please refresh.")
        );
    }
  }, [screen, editSection, fieldRoles.length, specGroups.length]);

  // WS3 — the skills page shows the UNION across every claimed role.
  // Review flag: companies from the résumé not yet sorted into Employer / Project client.
  useEffect(() => {
    if (screen !== "finish") return;
    fetch("/api/onboarding/provider/company-sort")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { state?: { rows: { current: string | null }[] } | null } | null) =>
        setUnsorted(d?.state?.rows.filter((x) => !x.current).length ?? 0)
      )
      .catch(() => setUnsorted(0));
  }, [screen, profile.employers.length]);
  const roleKey = profile.roleTypeIds.join(",");
  useEffect(() => {
    if ((screen !== "skills" && editSection !== "skills") || !roleKey) return;
    fetch(`/api/catalog/skills?roleTypeIds=${encodeURIComponent(roleKey)}`)
      .then((r) => r.json())
      .then((d) => setSkillOpts(d.skills ?? []))
      .catch(() => setError("We couldn't load skills. Please refresh."));
  }, [screen, editSection, roleKey]);

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

  // WS-4 — load each suite's module list when the review step opens.
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
          // Silent. A suite whose modules fail to load leaves that picker empty
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

  // WS2/WS3 — ROLES ARE MULTI-SELECT, defaulting to one.
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

  // SHOWN vs HELD, ONCE, FOR THE WHOLE WIZARD
  const shownSkillNames = profile.skillNames.filter((sk) =>
    isSkillShown(profile.roleTypeIds, sk.roleTypeId)
  );
  const heldNotShownSkillNames = profile.skillNames.filter(
    (sk) => !isSkillShown(profile.roleTypeIds, sk.roleTypeId)
  );

  const goNext = () => {
    // E118 — an edit that came FROM the review goes back to it, once. The flag
    // clears on arrival so the next forward move is ordinary again.
    if (returnToReview) {
      setReturnToReview(false);
      goTo("finish");
      return;
    }
    // From an UNCOUNTED screen (the upload pre-step) "next" means the first
    if (stepIndex < 0) {
      // — THE RÉSUMÉ SCREEN NOW SITS AFTER THE TITLE, so "next" from it is
      // Résumé comes first now (2026-10-05): it leads on to Title.
      if (screen === "tell_us") {
        goTo("title");
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

  /** The address draft. Hoisted to component scope in WS8 — the Photo & Details */
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
    } catch {
      // THERE WAS NO `catch`
      // THIS IS THE WIZARD'S GENERIC SAVE, so it is EVERY STEP. It returns
      setError("Couldn't reach Panameer to save that. Check your connection and try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveAnd = async (step: Step, data: unknown, then: () => void = goNext) => {
    if (await postStep(step, data)) then();
  };

  /** Certifications are a profile SECTION, not one of the 13 wizard steps, so */
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
    } catch {
      // THERE WAS NO `catch`
      setError(
        "Couldn't reach Panameer to save your certifications. Check your connection and try again."
      );
      return false;
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
    } catch {
      // THERE WAS NO `catch`
      // THIS ONE IS SIGNUP. A silent failure here is A REGISTRATION WALL —
      setError(
        "Couldn't reach Panameer to create your account. Check your connection and try again."
      );
    } finally {
      setBusy(false);
    }
  };

  /** WS-B — add the ticked terms as custom skills. Suggest-and-confirm: nothing */
  const confirmSuggestions = async () => {
    if (pickedSuggestions.length === 0) return;
    setSuggestBusy(true);
    setError(null);
    /* `E511` PART 1 — the card's OWN error slot, cleared on every attempt. */
    setSuggestError(null);
    try {
      const r = await fetch("/api/onboarding/provider/skill-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms: pickedSuggestions }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) {
        // THE FAILURE RENDERS ON THE CARD PART 1)
        const msg = body.error ?? "Could not add those skills.";
        setError(msg);
        setSuggestError(msg);
        return;
      }
      if (body.state) hydrate(body.state as StatusPayload);
      setSuggestDone(body.added ?? []);
      setPickedSuggestions([]);
    } catch {
      // THERE WAS NO `catch` ( PART 2)
      const msg = "Couldn't reach Panameer to add those. Check your connection and try again.";
      setError(msg);
      setSuggestError(msg);
    } finally {
      setSuggestBusy(false);
    }
  };

  /** WS3 — run the AI extractor over the document already uploaded and */
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
      // E090 — the save's RESULT is now checked. This previously ran as a
      const saved = await postStep("finish", {
        address: profile.address,
        // E036 — phone verification is stubbed: the number is saved with the
        // rest of the details and publishing no longer waits on an SMS code.
        phone: phoneToSave,
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
      // E149 — publish lands on the new Provider Home, with a pop-up.
      router.push("/dashboard?published=1");
    } catch {
      // THERE WAS NO `catch`
      // request but FAILED as an operation, and `postStep`'s message still
      setError(
        "Couldn't reach Panameer to publish your profile. Check your connection and try again."
      );
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
          <h1 className="text-2xl font-extrabold">Start Selling</h1>
          <p className="mt-2 text-ink-2">Turn on the selling side of your account — your buying stays as it is.</p>
          <button
            type="button"
            data-start-selling
            onClick={async () => {
              const r = await fetch("/api/onboarding/provider/backbone", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enableSelling: true }) }).catch(() => null);
              if (r?.ok) window.location.reload();
            }}
            className="mt-4 inline-flex min-h-[44px] items-center bg-ink px-5 font-bold text-surface"
          >
            Start Selling
          </button>
          <a href="/dashboard" className="mt-3 block font-bold text-magenta">
            Go to Dashboard →
          </a>
        </div>
      </div>
    );
  }

  // ===== PRE-VERIFY (no stepper, E001) ====================================
  if (screen === "signup") {
    // compact — the sign-up form is the one pre-verify page long enough to run
    return (
      <PlainShell
        compact
        contentWidth="max-w-2xl"
        // THE ACTION BAND THIS SCREEN USED TO OPT OUT OF ( §5)
        footer={
          <>
            <button
              onClick={() => router.push("/join")}
              disabled={busy}
              className="border border-ink bg-surface px-6 py-3 font-semibold text-ink transition-colors hover:bg-surface-hover disabled:opacity-50"
            >
              Back
            </button>
            <button
              onClick={createAccount}
              disabled={!canSignUp(acct) || busy}
              className="bg-ink px-8 py-3 font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-50"
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
          // SCOTT'S WORDS, VERBATIM . Was inherited from the removed
          title="Sign Up to Sell Services and/or Service Products"
          values={acct}
          onChange={(patch) => setAcct((a) => ({ ...a, ...patch }))}
          error={error}
          emailLocked={!!inviteToken}
          // EXPLICIT, AND IT IS LOAD-BEARING , 2026-08-30).
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
              onVerified={() => router.push("/join/provider/path")}
              initialDevLink={devLink}
            />
          </div>
        </div>
      </PlainShell>
    );
  }

  // THE WORK-METHOD SCREEN — UNCOUNTED, AND ASKED ONLY WHEN UNKNOWN
  if (screen === "work_method") {
    const choose = async () => {
      if (!workMethodPick) return;
      setBusy(true);
      setError(null);
      try {
        // THE SAME OWNER-SCOPED SECTION ENDPOINT the `?type=recruiter` block
        const saved = await fetch("/api/settings/profile/section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section: "work_method",
            data: { workMethod: workMethodPick },
          }),
        });
        if (!saved.ok) {
          setError("We couldn't save that. Please try again.");
          return;
        }
        // RE-READ RATHER THAN ASSUME THE ITINERARY. The step list is the
        const again = await fetch("/api/onboarding/status");
        if (!again.ok) {
          setError("We couldn't save that. Please try again.");
          return;
        }
        const s2 = await again.json();
        hydrate(s2);
        resumeInto(s2);
      } catch {
      // THERE WAS NO `catch`
        setError(
          "Couldn't reach Panameer to save that. Check your connection and try again."
        );
      } finally {
        setBusy(false);
      }
    };

    // SCOTT: *"this whole page is a different style. It is not consistent with
    return (
      <WizardShell
        // IT CARRIES A NUMBER NOW WS-1)
        onboardingChrome
        title="How do you work?"
        // WHY IT IS BEING ASKED, in one line — somebody who arrived by a
        subtitle="This sets up the rest of your profile — you can change it later in Settings."
        // BACK GOES TO `/join`, THE ROLE PICKER, and that is the only truthful
        onBack={() => router.push("/join")}
        canBack
        // IT DOES NOT MIRROR THE REQUESTER'S EMAIL: that side also posts
        secondaryLabel="Finish later"
        onSecondary={() => router.push("/dashboard")}
        onContinue={choose}
        continueDisabled={!workMethodPick}
        continueLabel="Continue"
        busy={busy}
      >
        <div className="mx-auto w-full max-w-2xl">
          {error && (
            <div className="mb-5">
              <Notice>{error}</Notice>
            </div>
          )}

          <div className="grid gap-3">
            {WORK_METHOD_OPTIONS.map((o) => (
              <OptionCard
                key={o.value}
                selected={workMethodPick === o.value}
                onClick={() => setWorkMethodPick(o.value)}
                title={o.title}
                description={o.description}
              />
            ))}
          </div>
        </div>
      </WizardShell>
    );
  }

  // ===== POST-VERIFY: the counted steps (stepper x/N) =====================
  // An UNCOUNTED screen (the upload pre-step, or a review-page section opened
  // OFFSET BY ONE WS-1).
  const stepNumber = stepIndex >= 0 ? stepIndex + 2 : undefined;
  // Exact stepper heading + "Next: …" label per brief_S's table (E024–E035).
  const labels = STEP_LABELS[screen as Step];
  const nextStep = stepIndex >= 0 ? steps[stepIndex + 1] : undefined;
  // One count everywhere (2026-10-05): Résumé + the member's own itinerary; Review after, unnumbered.
  const railKeys = ["tell_us", ...steps.filter((s) => s !== "finish")] as Step[];
  const railSteps = railKeys.map((k) => ({ key: k, label: RAIL_LABELS[k] ?? STEP_LABELS[k]?.stepper ?? k }));
  const railIndex = screen === "finish" ? railKeys.length : railKeys.indexOf(screen as Step);
  const railNext = railIndex >= 0 && railIndex < railKeys.length ? railKeys[railIndex + 1] : undefined;
  const nextLabel =
    screen === "finish"
      ? "Publish profile"
      : railNext
        ? `Next: ${RAIL_LABELS[railNext] ?? STEP_LABELS[railNext].stepper}`
        : "Next: Review";
  const shell = (props: Partial<React.ComponentProps<typeof WizardShell>> & { title: string }) => ({
    rail: railIndex >= 0 ? { steps: railSteps, current: railIndex } : undefined,
    eyebrow:
      screen === "finish"
        ? "Review"
        : railIndex >= 0
          ? `Step ${railIndex + 1} of ${railKeys.length} · ${railSteps[railIndex].label}`
          : undefined,
    onboardingChrome: true,
    step: stepNumber,
    totalSteps: wizardTotal,
    stepLabel: labels?.stepper,
    continueLabel: nextLabel,
    busy,
    // THE FIRST COUNTED STEP HAS A BACK NOW ( WS-3)
    // BACK HONOURS `returnToReview` FIRST WS-1)
    onBack: returnToReview
      ? () => {
          setReturnToReview(false);
          goTo("finish");
        }
      : screen === "title"
        ? () => goTo("tell_us")
        : stepIndex > 0
          ? goBack
          : () => router.push("/join/provider/path"),
    canBack: true,
    // SCOTT, 2026-09-10: *"'Finish Later' — do it."* WS-2 stopped here
    leaveLabel: "Finish later",
    onLeave: () => router.push("/dashboard"),
    ...props,
  });


  // ONE EDITOR, TWO MOUNTS WS-1)

  // THE TITLE FIELD ( WS-1). `case "title"` renders this and so does the
  // SAVE, THEN CLOSE — AND ONLY IF THE SAVE WORKED ( WS-1)
  const saveEditSection = async () => {
    switch (editSection) {
      case "title":
        if (await postStep("title", { headline: profile.headline })) setEditSection(null);
        return;
      case "rate":
        if (
          await postStep("rate", {
            hourlyDollars:
              profile.hourlyRateCents != null ? profile.hourlyRateCents / 100 : "",
          })
        )
          setEditSection(null);
        return;
      case "education":
        if (await postStep("education", { education: profile.education })) setEditSection(null);
        return;
      case "roles":
        if (await postStep("roles", { roleTypeIds: profile.roleTypeIds, roleTypeId: profile.roleTypeId })) setEditSection(null);
        return;
      case "skills":
        if (
          await postStep("skills", {
            skillIds: profile.skillIds,
            customSkills: profile.customSkills,
            customSkillRoleId: profile.roleTypeId,
            roleTypeIds: profile.roleTypeIds,
            roleTypeId: profile.roleTypeId,
          })
        )
          setEditSection(null);
        return;
      case "specializations":
        if (
          await postStep("specializations", {
            specializationIds: profile.specializationIds,
            customSpecializations: profile.customSpecializations,
          })
        )
          setEditSection(null);
        return;
      case "location":
        if (await postStep("finish", { address: profile.address, phone: phoneToSave }))
          setEditSection(null);
        return;
      /* `work` has no Save — `EmployersStep` commits as it goes. */
      default:
        return;
    }
  };

  // THE SAME CONDITION THE STEP'S `continueDisabled` USES, section by section
  const sectionEditorCanSave =
    editSection === "title"
      ? profile.headline.trim() !== ""
      : editSection === "roles"
        ? profile.roleTypeIds.length > 0
      : editSection === "rate"
        ? Boolean(profile.hourlyRateCents)
        : editSection === "skills"
          ? profile.skillIds.length + profile.customSkills.length > 0
          : true;

  // EXTRACTED WS-B, editor 1 of 5)
  // Role rows: shared by the Roles step and the review's Roles editor.
  const roleRows = () => (
    <div className="mt-2 border-t border-line" data-role-rows>
      {fieldRoles.map((r) => {
        const picked = profile.roleTypeIds.includes(r.id);
        const leads = profile.roleTypeIds[0] === r.id && profile.roleTypeIds.length > 1;
        const fromCv = picked && profile.derivedRoleTypeIds.includes(r.id);
        return (
          <button
            key={r.id}
            type="button"
            aria-pressed={picked}
            onClick={() => toggleRole(r)}
            className="flex w-full items-start gap-3.5 border-b border-line px-1 py-3.5 text-left hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-ink"
          >
            <span
              aria-hidden
              className={
                "mt-0.5 grid h-[18px] w-[18px] flex-none place-items-center border-[1.5px] border-ink text-[12px] " +
                (picked ? "bg-ink text-surface" : "")
              }
            >
              {picked ? "✓" : ""}
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-bold">
                {roleLong(`${r.name} Roles`)}
                {leads && <span className="ml-2 text-[11px] font-bold uppercase tracking-[0.08em] text-magenta">Leads profile</span>}
                {fromCv && <span className="ml-2 border border-line px-1.5 py-px text-[11px] font-semibold text-ink-2">from résumé</span>}
              </span>
              <span className="mt-0.5 block text-[13.5px] text-ink-2">{ROLE_CARD_COPY[r.code] ?? r.domains.map((d) => d.name).join(", ")}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
  const titleEditing = () => ({
    canSave: titleCanSave(profile.headline),
    save: () => saveAnd("title", { headline: profile.headline }, () => goTo(steps[steps.indexOf("title") + 1] ?? "roles")),
    body: (
      <TitleEditor
        value={profile.headline}
        onChange={(headline) => setProfile((p) => ({ ...p, headline }))}
      />
    ),
  });

  // EXTRACTED WS-B, editor 3 of 5)
  const rateEditing = () => ({
    canSave: rateCanSave(profile.onsiteRateCents, profile.remoteRateCents),
    save: () => {
      const dollars = (c: number | null | undefined) => (c != null ? c / 100 : "");
      return saveAnd("rate", {
        hourlyDollars: dollars(syncedHourly(profile.onsiteRateCents, profile.remoteRateCents)),
        onsiteDollars: dollars(profile.onsiteRateCents),
        remoteDollars: dollars(profile.remoteRateCents),
      });
    },
    body: (
      <RateEditor
        onsiteRateCents={profile.onsiteRateCents ?? null}
        remoteRateCents={profile.remoteRateCents ?? null}
        onOnsiteChange={(onsiteRateCents) =>
          setProfile((p) => ({ ...p, onsiteRateCents, hourlyRateCents: syncedHourly(onsiteRateCents, p.remoteRateCents) }))
        }
        onRemoteChange={(remoteRateCents) =>
          setProfile((p) => ({ ...p, remoteRateCents, hourlyRateCents: syncedHourly(p.onsiteRateCents, remoteRateCents) }))
        }
      />
    ),
  });

  // PHONE + ADDRESS, ONE BLOCK ( WS-1/WS-4).
  // EXTRACTED WS-B, editor 2 of 5)
  const contactEditing = () => ({
    save: () =>
      postStep("finish", { address: profile.address, phone: phoneToSave }),
    body: (
      <ContactEditor
        address={{
          country: addr.country,
          line1: addr.line1,
          city: addr.city,
          state: addr.state,
          postalCode: addr.postalCode,
        }}
        onAddressChange={(patch) => setAddr(patch)}
        phone={phoneInput}
        onPhoneChange={setPhoneInput}
        phoneCountry={phoneCountry}
        onPhoneCountryChange={setPhoneCountry}
      />
    ),
  });

  // EXTRACTED WS-B, editor 5 of 5)
  const skillsEditing = () => ({
    // component's: the STEP's header prints the role names and its Continue
    roleNames: profile.roleTypeIds
      .map((id) => fieldRoles.find((r) => r.id === id)?.name)
      .filter(Boolean) as string[],
    canSave: profile.skillIds.length + profile.customSkills.length > 0,
    // THE FULL PAYLOAD, RESTORED. An earlier pass of this extraction reduced
    save: () =>
      saveAnd("skills", {
        skillIds: profile.skillIds,
        customSkills: profile.customSkills,
        customSkillRoleId: profile.roleTypeId,
        roleTypeIds: profile.roleTypeIds,
        roleTypeId: profile.roleTypeId,
      }),
    body: (
      <SkillsEditor
        selectedIds={profile.skillIds}
        selectedNames={profile.skillNames}
        customs={profile.customSkills}
        resumeSkillIds={profile.resumeSkillIds}
        skillOpts={skillOpts}
        query={skillQuery}
        onQueryChange={setSkillQuery}
        match={skillMatch}
        onMatchChange={setSkillMatch}
        shownSkillNames={shownSkillNames}
        heldNotShownSkillNames={heldNotShownSkillNames}
        maxSuggestions={MAX_SKILL_SUGGESTIONS}
        onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))}
        onRemoveCustom={(name) =>
          setProfile((p) => ({
            ...p,
            customSkills: p.customSkills.filter((c) => c !== name),
          }))
        }
        scrollRegionClass={SCROLL_REGION}
        pickedRegionClass={PICKED_REGION}
        error={error}
        heldNotShownHeading={HELD_NOT_SHOWN_HEADING}
        heldNotShownExplanation={HELD_NOT_SHOWN_EXPLANATION}
      />
    ),
  });

  // EXTRACTED WS-B, editor 4 of 5)
  const specializationsEditing = () => ({
    save: () =>
      saveAnd("specializations", {
        specializationIds: profile.specializationIds,
        customSpecializations: profile.customSpecializations,
      }),
    body: (
      <SpecializationsEditor
        groups0={specGroups}
        selectedIds={profile.specializationIds}
        selectedNames={profile.specializationNames}
        customs={profile.customSpecializations}
        query={specQuery}
        onQueryChange={setSpecQuery}
        openTier={openSpecTier}
        onOpenTierChange={setOpenSpecTier}
        onChange={(patch) => setProfile((p) => ({ ...p, ...patch }))}
        onRemoveCustom={(name) =>
          setProfile((p) => ({
            ...p,
            customSpecializations: p.customSpecializations.filter((c) => c !== name),
          }))
        }
        error={error}
        maxPerGroup={MAX_SPECS_PER_GROUP}
        pickedRegionClass={PICKED_REGION}
        maxPerTier={MAX_SPECS_PER_TIER}
        scrollRegionClass={SCROLL_REGION}
      />
    ),
  });

  switch (screen) {
    // ---- 1/12 — Experience (E003) -------------------------------------
    case "title":
      return (
        <WizardShell
          {...shell({
            title: "Let's start by telling the world what you do.",
            subtitle:
              "It's the very first thing clients see, so make it count. Stand out by describing your expertise in your own words.",
            // THE TITLE FORWARDS TO THE RÉSUMÉ SCREEN, NOT TO STEP 2 .
            onContinue: () =>
              saveAnd("title", { headline: profile.headline }, () => goTo(steps[steps.indexOf("title") + 1] ?? "roles")),
            continueDisabled: profile.headline.trim() === "",
          })}
        >
          {error && <Notice>{error}</Notice>}
          {titleEditing().body}
        </WizardShell>
      );

    // ---- 5/12 — Tell us about yourself (E012/E029) --------------------
    case "tell_us": {
      /** WS2 (E069) — once anything has been imported OR entered, this step stops */
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
              : "Just upload your resume and let our AI model do the rest.",
            wide: true,
            // E201 — NO PAGE-LEVEL SKIP ONCE A RÉSUMÉ HAS BEEN READ. "Skip for
            secondaryLabel: importOutcome ? undefined : "Skip for Now",
            onSecondary: importOutcome ? undefined : goNext,
            onContinue: () => saveAnd("tell_us", { profileMethod: "MANUAL" }),
            continueLabel: parsingResume ? "Reading your résumé…" : nextLabel,
            continueDisabled: parsingResume,
          })}
        >
          {error && <Notice>{error}</Notice>}

          {/* WS5/E051 — what landed is now ONE line, not a panel. The prose */}
          {/* WS3/E129 — THE GATE, now the shared `AiPassPanel`. It used to be */}
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

          {/* E184 — NAME THE READER THAT RAN. */}
          {importOutcome?.path && <ReaderLine path={importOutcome.path} />}

          {/* "What we got": the read, fixed chunk by chunk (2026-10-07). */}
          {hasProfileData && (
            <ResumeReview
              onChanged={async () => {
                const r = await fetch("/api/onboarding/status");
                if (r.ok) hydrate(await r.json());
              }}
              onContinue={goNext}
            />
          )}

          {/* E029 — the upload control is INLINE and visible on arrival. It used */}
          {!hasProfileData && (
          <section className="mb-4 border-t-2 border-ink pb-2 pt-6">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[17px]">Upload Your Resume</h2>
              <span className="border border-ink px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink">
                Fastest
              </span>
            </div>
            {/* E103 — the "We'll read it and fill in your title, experience */}
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

          {/* WS1/WS2 (E071) — there is no separate Employers step any more, so */}
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
                    className="mb-3 border border-amber-500/30 bg-amber-50/60 px-3 py-2 text-[13.5px] text-ink-2"
                  >
                    {g}
                  </p>
                ))}

                {editingWork ? (
                  <EmployersStep
                    employers={profile.employers}
                    // THE FLAT PROJECT LIST . `listEmployers`
                    projects={profile.projects}
                    onChanged={(employers) =>
                      setProfile((p) => ({ ...p, employers }))
                    }
                    onError={setError}
                  />
                ) : (
                  // E084 — the SAME `WorkHistoryBody` the final Review and the
                  <WorkHistoryBody
                    employers={profile.employers}
                    // Without this the Projects disclosure resolves to nothing
                    projects={profile.projects}
                    empty="No work history yet. Providers who add work experience and projects are twice as likely to win work."
                  />
                )}
              </ProfileCard>

              {/* WS-B/E051-5 — SUGGEST AND CONFIRM. The import used to report "34 */}
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
                    {/* IT SAYS WHY IT CANNOT RUN, BEFORE IT IS CLICKED */}
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={confirmSuggestions}
                        disabled={
                          pickedSuggestions.length === 0 ||
                          suggestBusy ||
                          !profile.roleTypeIds.length
                        }
                        className="bg-ink px-6 py-2.5 font-semibold text-surface transition-colors hover:bg-ink-hover disabled:opacity-40"
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
                      {/* THE REASON, BEFORE THE CLICK — not an error after it. */}
                      {!profile.roleTypeIds.length && (
                        <span className="text-[13.5px] text-ink-2">
                          Available once you choose your role.
                        </span>
                      )}
                    </div>
                    {/* THE FAILURE, ON THE CARD (`E511` PART 1). */}
                    {suggestError && (
                      <p data-ai-line className="mt-3 border-l-2 border-magenta py-2 pl-3.5 text-[13.5px] text-ink">
                        {suggestError}
                      </p>
                    )}
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

    // 7/13 — Role → Domain → Skills, ONE cascading page (E030) ------
    case "roles": {
      return (
        <WizardShell
          {...shell({
            title: "What kind of work do you do?",
            /* `E297` — `tightBody` closes the 32px gap under the title block to 16.
               It is the opt-in `WizardShell` already provides (`E188`), used here
               to buy back height without touching the shared card. */
            tightBody: true,
            subtitle:
              "Pick every role that fits. The first one leads your profile.",
            onContinue: () =>
              saveAnd("roles", {
                roleTypeIds: profile.roleTypeIds,
                roleTypeId: profile.roleTypeId,
              }),
            continueDisabled: profile.roleTypeIds.length === 0,
          })}
        >
          {error && <Notice>{error}</Notice>}

          {/* A DERIVED ROLE IS A SUGGESTION, AND IT SAYS SO ( WS-A) */}
          {profile.derivedFromSkills > 0 && profile.derivedRoleTypeIds.length > 0 && (
            <AiLine>
              we pre-selected {profile.derivedRoleTypeIds.length === 1 ? "1 role" : `${profile.derivedRoleTypeIds.length} roles`} based on
              the {profile.derivedFromSkills} skill{profile.derivedFromSkills === 1 ? "" : "s"} we read. Change anything — you decide.
            </AiLine>
          )}

          {fieldRoles.length === 0 ? (
            <p className="text-ink-2">Loading roles…</p>
          ) : (
            <>
              {/* NO WRAPPER. THE CARDS SIT ON THE PAGE , 2026-09-01) */}
              {/* to, but all on one page."* Tightening the GAP is in scope; tightening the */}
              {roleRows()}

              {/* THE WARNING, BACK AS INFORMATION */}
              {(() => {
                const n = profile.skillNames.filter(
                  (sk) => !isSkillShown(profile.roleTypeIds, sk.roleTypeId)
                ).length;
                return n > 0 ? (
                  <p className="mt-3 text-[14px] text-ink-2">
                    {ROLE_STEP_HIDDEN_NOTE(n)}
                  </p>
                ) : null;
              })()}
            </>
          )}
        </WizardShell>
      );
    }

    // ---- SKILLS — WS3 step 3, filtered by the chosen role(s) -----------
    case "skills": {
      const ed = skillsEditing();
      return (
        <WizardShell
          {...shell({
            // E202 — THE ASK IS EXPLICIT ON ARRIVAL. The old subtitle described
            title: "Which skills do you want to be found for?",
            subtitle: "Buyers search and match on these.",
            onContinue: ed.save,
            continueDisabled: !ed.canSave,
          })}
        >
          {error && <Notice>{error}</Notice>}
          {ed.body}
        </WizardShell>
      );
    }

    // WS-4 — THE WORK-HISTORY REVIEW, which replaces the Role and Skills steps.
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
            roleOptions={fieldRoles.map((r) => ({ id: r.id, name: roleLong(r.display) }))}
            skillOptionsForSuite={skillOptionsForSuite}
            onChange={setJobPatches}
          />
        </WizardShell>
      );
    }

    case "specializations": {
      const ed = specializationsEditing();
      return (
        <WizardShell
          {...shell({
            title: "What Are Your Specializations?",
            // E054 — one line. The old three-sentence version explained the
            // feature to someone who had already understood it from the title.
            subtitle: "The systems, processes and industries you've worked in.",
            secondaryLabel: "Skip for Now",
            onSecondary: goNext,
            onContinue: ed.save,
          })}
        >
          {error && <Notice>{error}</Notice>}
          {ed.body}
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
      // ENGLISH · FLUENT, PRE-FILLED item 1a)
      const langs =
        profile.languages.length > 0
          ? profile.languages
          : [{ name: "English", level: "FLUENT" }];

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
                // E106 — keyed by POSITION, not by value.
                key={i}
                className="flex flex-wrap items-end gap-3 border border-line p-4"
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
                      // E106 — a pick-list. Free text collected "spanish"
                      <select
                        value={l.name}
                        onChange={(e) => update(i, { name: e.target.value })}
                        className="w-full border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta"
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
                      className="w-full border border-line bg-white px-4 py-3 text-[15px] text-ink outline-none transition-colors focus:border-magenta"
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
                {/* REMOVABLE ONCE A SECOND LANGUAGE EXISTS ( item 1a) */}
                {langs.length > 1 && (
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
            className="mt-4 border border-ink bg-surface px-5 py-2.5 font-semibold text-ink transition-colors hover:bg-surface-hover"
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
            {/* E061, same principle as E059 — AMBER while under the minimum */}
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
      return (
        <WizardShell
          {...shell({
            title: "What do you charge?",
            subtitle: "Set one or both. You can change them any time.",
            onContinue: rateEditing().save,
            continueDisabled: !rateEditing().canSave,
          })}
        >
          {error && <Notice>{error}</Notice>}
          {rateEditing().body}
        </WizardShell>
      );
    }


    // Picture (PJv2 WS1) --------------------------------------------
    case "picture": {
      // E203 — "has some characters in it" was the old test, and it passed for
      const wrapupReady =
        /* `E417` — judged against the PHONE's country, not the address's. */
        Boolean(profile.photoUrl) && isPhoneComplete(phoneInput, phoneCountry);

      /** Saves BOTH halves. The photo is its own step payload; phone and */
      const saveWrapup = async () => {
        if (!(await postStep("picture", { photoUrl: profile.photoUrl ?? null }))) {
          return;
        }
        // E090's lesson, applied here from the start: check the result and stop,
        // rather than moving on and reporting a later failure's message.
        if (
          !(await postStep("finish", {
            address: profile.address,
            phone: phoneToSave,
          }))
        ) {
          return;
        }
        goNext();
      };

      return (
        <WizardShell
          {...shell({
            title: "Add your photo and contact details",
            subtitle:
              "Profiles with a photo get noticeably more responses. We need your phone and address too — they stay private, and they're how a buyer reaches you.",
            // E188 — the ONLY change to this step's layout. Its body opens with
            tightBody: true,
            onContinue: saveWrapup,
            continueDisabled: !wrapupReady,
          })}
        >
          {error && <Notice>{error}</Notice>}
          {/* E107 — photo BESIDE the details on a wide screen, stacked below it on */}
          <div className="flex flex-col items-center gap-5 border border-line p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-7 sm:text-left">
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
                  className="bg-ink px-6 py-3 font-semibold text-surface transition-colors hover:bg-ink-hover"
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

          {/* WS8/E088 — the "You're Done!" details, now IN the counted flow. They */}
          <div className="mt-6">
            <ProfileCard title="Your Details">
              {contactEditing().body}
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

    // 13/13 — Review + publish (E035, rebuilt by brief_X / E056) ----
    case "company": {
      if (companyPending) {
        return (
          <WizardShell
            {...shell({
              title: `Request sent to ${companyPending}.`,
              subtitle: `An admin there will review it — you'll get a notice when they answer. Nothing you've entered is lost.`,
              onContinue: undefined,
            })}
          >
            <div className="mx-auto w-full max-w-xl space-y-4">
              <button
                type="button"
                onClick={() => setCompanyPending(null)}
                className="text-[14.5px] font-bold text-magenta hover:underline"
              >
                Pick a Different Company Instead
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
            <CompanyFinder
              bounded
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
            phone: phoneToSave,
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

      // WS5 — a section's own quiet note, rendered inside it.
      const noteFor = (id: string) => {
        const item = changes.find((c) => c.id === id);
        if (!item) return null;
        return (
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2">
            {item.message}
          </p>
        );
      };

      // CLICK-TO-FIX IS AN EDIT AFFORDANCE TOO WS-1)
      const FIX_STEP_TO_SECTION: Record<string, Exclude<EditSection, null>> = {
        title: "title",
        rate: "rate",
        catalog: "skills",
        education: "education",
        specializations: "specializations",
        tell_us: "work",
        roles: "roles",
      };

      /** Click-to-fix: open the section's editor, focus the field, or open the modal. */
      const applyFix = (fix: ReviewFix) => {
        switch (fix.kind) {
          case "step": {
            const section = FIX_STEP_TO_SECTION[fix.step];
            if (section) setEditSection(section);
            else setError("We couldn't open that section — please refresh.");
            break;
          }
          case "photo":
            setPhotoModal(true);
            break;
          case "sortCompanies":
            document.querySelector("[data-testid=company-sort]")?.scrollIntoView({ behavior: "smooth", block: "start" });
            break;
          case "certifications":
            setCertSignal((n) => n + 1);
            break;
          case "field": {
            // WS5 — the BIO is edited on THIS page. It has no step to travel to
            if (fix.field === "overview") {
              const bio = document.getElementById("review-overview");
              bio?.scrollIntoView({ behavior: "smooth", block: "center" });
              window.setTimeout(
                () => (bio as HTMLTextAreaElement | null)?.focus(),
                350
              );
              break;
            }
            // field the old `goTo("picture")` was travelling for. THE FOCUS
            setEditSection("location");
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

      // CITY AND REGION ONLY — NO POSTAL CODE, AND THAT IS THE WHOLE POINT
      const reviewLocality = formatLocality({ city: addr.city, state: addr.state });

      // E130 — ONE affordance rule for every section.
      // EDIT HAS TO OPEN EDIT MODE, NOT JUST NAVIGATE
      // SCOTT'S RULE: *"A PERSON ON THE REVIEW SCREEN NEVER LEAVES IT TO
      const sectionAction = (
        title: string,
        section: Exclude<EditSection, null>,
        isEmpty: boolean
      ) => (
        <EditButton
          title={title}
          label={isEmpty ? `Add ${title}` : "Edit"}
          icon={isEmpty ? "+" : "✏️"}
          onClick={() => setEditSection(section)}
        />
      );

      return (
        <WizardShell
          {...shell({
            title: "Here's your profile. Check it, then publish.",
            subtitle: "This is what buyers will see. Edit any line before you go live.",
            wide: true,
            onContinue: publish,
            // The gate itself is unchanged and still enforced server-side by
            // `publishProfile`; this only stops the provider from submitting a
            // request the server is certain to refuse.
            continueDisabled: busy || errors.length > 0,
          })}
        >
          {error && <Notice>{error}</Notice>}

          {/* WS5 / E181 — THE BIG SUGGESTIONS PANEL IS GONE. */}
          <ReviewChecklist
            errors={errors}
            changes={[
              ...(unsorted > 0
                ? [{
                    id: "sort-companies",
                    severity: "change" as const,
                    message: `${unsorted} compan${unsorted === 1 ? "y" : "ies"} found in your résumé — mark each Employer, Project client or Remove.`,
                    fixLabel: "Sort",
                    fix: { kind: "sortCompanies" as const },
                  }]
                : []),
              ...(profile.roleTypeIds.length === 0
                ? [{
                    id: "pick-roles",
                    severity: "change" as const,
                    message: "Pick your roles so buyers can find you.",
                    fixLabel: "Pick roles",
                    fix: { kind: "step" as const, step: "roles" },
                  }]
                : []),
            ]}
            onFix={applyFix}
          />
          {/* The summary table is gone: the review IS the profile template.
              What still needs attention is listed in the box above. */}

          {/* The soft page background the published profile sits on, so the
              white section cards read the same way here as they do there. */}
          <div className="mt-6 grid gap-x-12 gap-y-6 lg:grid-cols-[300px_minmax(0,1fr)]">
            <ProfileHero
              // The wizard title is the page h1; keep heading ranks sane.
              headingAs="h2"
              firstName={profile.firstName}
              lastName={profile.lastName}
              photoUrl={profile.photoUrl}
              headline={profile.headline}
              // E205 — NO BIO IN THE HERO ON THIS PAGE. The published profile
              // overview yet."* directly above the card holding 420 characters of
              overviewShownElsewhere
              /* `E823` (R-E002) — two rates, not a derived range. */
              onsiteCents={profile.onsiteRateCents}
              remoteCents={profile.remoteRateCents}
              youGetCents={youGet}
              language={profile.languages[0]?.name ?? null}
              country={addr.country?.trim() || null}
              // THE REVIEW PASSES ITS OWN DRAFT SKILLS WS-C
              skills={shownSkillNames}
              aside={
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setPhotoModal(true)}
                    className="text-[13.5px] font-bold text-magenta hover:text-magenta-dark"
                  >
                    {profile.photoUrl ? "Change Photo" : "+ Add Photo"}
                  </button>
                  {/* SUPERSEDED, quoted (`E412` WS-1): `onClick={() => goTo("title")}` */}
                  <EditButton
                    title="Title"
                    onClick={() => setEditSection("title")}
                    label="Edit title"
                  />
                  {/* WS5 — the bio is edited on THIS page; there is no bio
                      step to travel to any more. */}
                  <EditButton
                    title="Overview"
                    onClick={() => {
                      const el = document.getElementById("review-overview");
                      el?.scrollIntoView({ behavior: "smooth", block: "center" });
                      window.setTimeout(
                        () => (el as HTMLTextAreaElement | null)?.focus(),
                        350
                      );
                    }}
                    label="Edit overview"
                  />
                  {/* SUPERSEDED, quoted (`E412` WS-1): `onClick={() => goTo("rate")}` */}
                  <EditButton
                    title="Rate"
                    onClick={() => setEditSection("rate")}
                    label="Edit rate"
                  />
                </div>
              }
            />
            <div className="min-w-0">

            {/* Bio, EDITED IN PLACE (WS5) ------------------------------- */}
            <div>
              <ProfileCard
                title="Overview"
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
                  onBlur={async () => {
                    if (profile.overview.trim().length > MAX_BIO) return;
                    // returns whether the save worked, and this threw it away —
                    setBioError(null);
                    const saved = await postStep("bio", { overview: profile.overview });
                    if (!saved) {
                      setBioError(
                        "That didn't save. Check your connection — your text is still here."
                      );
                    }
                  }}
                  placeholder="A few lines about what you do best."
                  className={
                    profile.overview.trim().length > MAX_BIO
                      ? "border-red-600 focus:border-red-600"
                      : ""
                  }
                />
                {/* THE FAILURE, ON THE CARD (`E516` PART 2). */}
                {bioError && (
                  <p data-ai-line className="mt-3 border-l-2 border-magenta py-2 pl-3.5 text-[13.5px] text-ink">
                    {bioError}
                  </p>
                )}
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
            <div>
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
                        // THIS `fetch` HAD NO `catch` AT ALL ( PART 2) —
                        setWorkImportError(null);
                        try {
                          const r = await fetch("/api/onboarding/status");
                          if (r.ok) {
                            hydrate(await r.json());
                            return;
                          }
                          setWorkImportError(
                            "Your résumé was imported, but this section couldn't refresh. Reload the page to see it."
                          );
                        } catch {
                          setWorkImportError(
                            "Your résumé was imported, but this section couldn't refresh. Check your connection and reload."
                          );
                        }
                      }}
                    />
                    {sectionAction(
                      "Work History",
                      "work",
                      profile.employers.length === 0
                    )}
                  </span>
                }
              >
                {/* THE FAILURE, ON THE CARD ( PART 2). It sits at the */}
                {workImportError && (
                  <p data-ai-line className="mb-3 border-l-2 border-magenta py-2 pl-3.5 text-[13.5px] text-ink">
                    {workImportError}
                  </p>
                )}
                {/* E129 — THE REACHABLE OFFER. An empty work history on the review */}
                {profile.employers.length === 0 && projects.length === 0 ? (
                  <AiPassPanel
                    compact
                    heading="No work history yet — want us to read your résumé again?"
                    reasons={[
                      "Your profile has no jobs or projects on it. If you uploaded a résumé, our reader may have missed a layout it couldn't follow.",
                    ]}
                    onUpload={() => {
                      void logResumePath("reupload");
                      setUploadModal(true);
                    }}
                    onManual={() => {
                      void logResumePath("manual");
                      setEditSection("work");
                    }}
                    onApplied={(body) => {
                      if (body.state) hydrate(body.state as StatusPayload);
                    }}
                  />
                ) : (
                  <WorkHistoryBody
                    employers={profile.employers}
                    projects={projects}
                    empty={
                      projects.length
                        ? "No employers yet — your engagements are under Solo Projects. Sort them below."
                        : "No work history yet. Providers who add work experience and projects are twice as likely to win work."
                    }
                  />
                )}
              </ProfileCard>
            </div>

            {/* pg1b: Solo Projects, FULL WIDTH ------------------------ */}
            <div>
              <ProfileCard
                title="Solo Projects"
                // THE SAME EDITOR AS WORK HISTORY, and that is 's finding
                edit={sectionAction(
                  "Solo Projects",
                  "work",
                  soloProjects.length === 0
                )}
              >
                <SoloProjectsBody
                  projects={soloProjects}
                  empty="No solo projects yet — work you delivered outside a job goes here."
                />
              </ProfileCard>
            </div>

            {/* pg2: the 2-column grid ------------------------------- */}
            <div>
              {/* THE REVIEW CARD SHOWS WHAT THE PROFILE SHOWS . */}
              <ProfileCard
                title="Skills"
                edit={sectionAction("Skills", "skills", shownSkillNames.length === 0)}
              >
                <SkillsBody
                  skills={shownSkillNames}
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
                  edit={
                    <EditButton
                      title="Certifications"
                      label="Add Certification"
                      icon="+"
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
                      setProfile((pp) => ({ ...pp, certifications: next }));
                      // PART 2 — the failure lands ON THIS CARD. The
                      setCertError(null);
                      const saved = await saveCertifications(next);
                      if (!saved) {
                        setCertError(
                          "That didn't save. Check your connection and try again."
                        );
                      }
                      return saved;
                    }}
                  />
                  {/* THE FAILURE, ON THE CARD (`E516` PART 2). */}
                  {certError && (
                    <p data-ai-line className="mt-3 border-l-2 border-magenta py-2 pl-3.5 text-[13.5px] text-ink">
                      {certError}
                    </p>
                  )}
                </ProfileCard>


              {/* IT HAD NO EDIT AT ALL ( WS-1 measured it, WS-4 names it). */}
              <ProfileCard
                title="Location"
                edit={sectionAction(
                  "Location",
                  "location",
                  !reviewLocality && !addr.country?.trim()
                )}
              >
                <LocationBody
                  location={reviewLocality}
                  country={addr.country?.trim() || null}
                />
              </ProfileCard>

              {/* E039 — testimonials are EARNED after delivering work. */}
              <ProfileCard title="Recommendations">
                <Empty>
                  No recommendations yet — you&apos;ll collect these as you
                  deliver work.
                </Empty>
              </ProfileCard>
            </div>

            {/* WS8/E088 — the identity FIELDS moved to the Picture step, which is */}
            <div>
              <ProfileCard title="Verify Identity">
                <VerificationsBody
                  emailVerified
                  phoneOnFile={Boolean(phoneInput.trim())}
                  phoneVerified={profile.phoneVerified}
                />
                {/* Phone and address are collected on the */}
                <p className="mt-3 text-[13.5px] text-ink-2">
                  <button
                    type="button"
                    onClick={() => setEditSection("location")}
                    className="font-bold text-magenta underline underline-offset-4 hover:text-magenta-dark"
                  >
                    Update Your Phone or Address
                  </button>{" "}
                  — they stay private.
                </p>
              </ProfileCard>
            </div>
            </div>
          </div>

          <PhotoCropModal
            open={photoModal}
            onClose={() => setPhotoModal(false)}
            onUploaded={(photoUrl) => setProfile((p) => ({ ...p, photoUrl }))}
          />

          {/* MOUNTED HERE TOO ( WS-1). The résumé upload modal lives in */}
          <ResumeUploadModal
            open={uploadModal}
            onClose={() => setUploadModal(false)}
            onImported={(outcome) => {
              setImportOutcome(outcome);
              if (outcome.state) hydrate(outcome.state as StatusPayload);
            }}
          />

          {/* THE IN-PLACE SECTION EDITOR WS-1) */}
          <Modal
            open={editSection !== null}
            onClose={() => setEditSection(null)}
            title={editSection ? EDIT_SECTION_TITLES[editSection] : ""}
            width={
              editSection === "work" ||
              editSection === "skills" ||
              editSection === "specializations"
                ? "max-w-4xl"
                : "max-w-lg"
            }
          >
            {/* THE ERROR STICKS TO THE TOP OF THE MODAL */}
            {error && (
              <div className="sticky top-0 z-10 -mx-6 mb-2 bg-white px-6 pb-2 sm:-mx-7 sm:px-7">
                <Notice>{error}</Notice>
              </div>
            )}

            {editSection === "title" && titleEditing().body}
            {editSection === "roles" && roleRows()}
            {editSection === "rate" && rateEditing().body}
            {editSection === "location" && contactEditing().body}
            {editSection === "education" && (
              <EducationCards
                items={profile.education}
                onChange={(education) => setProfile((p) => ({ ...p, education }))}
              />
            )}
            {editSection === "skills" && skillsEditing().body}
            {editSection === "specializations" && specializationsEditing().body}
            {editSection === "work" && (
              // THE SAME COMPONENT `case "tell_us"` MOUNTS, with the same four
              <EmployersStep
                employers={profile.employers}
                projects={profile.projects}
                onChanged={(employers) => setProfile((p) => ({ ...p, employers }))}
                onError={setError}
              />
            )}

            {/* REAL. It commits each employer and project through its own */}
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-line pt-4">
              <button
                type="button"
                onClick={() => setEditSection(null)}
                className="border border-ink bg-surface px-5 py-2.5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-hover"
              >
                {editSection === "work" ? "Done" : "Cancel"}
              </button>
              {editSection !== "work" && (
                <button
                  type="button"
                  disabled={busy || !sectionEditorCanSave}
                  onClick={saveEditSection}
                  className="bg-ink px-5 py-2.5 text-[14px] font-semibold text-surface transition-colors hover:bg-ink-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Saving…" : "Save"}
                </button>
              )}
            </div>
          </Modal>
        </WizardShell>
      );
    }
  }

  return null;
}

/** What the in-place editor calls itself WS-1). */
const EDIT_SECTION_TITLES: Record<Exclude<EditSection, null>, string> = {
  title: "Your Title",
  roles: "Your Roles",
  rate: "Your Rates",
  work: "Work History & Projects",
  skills: "Your Skills",
  specializations: "Your Specializations",
  education: "Your Education",
  location: "Contact & Location",
};

/** Pre-verification chrome: logo only, deliberately NO stepper (E001). */
function PlainShell({
  children,
  contentWidth,
  compact = false,
  // never passed it on, which is why the sign-up screen was the one onboarding page
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

/** One tier of the Role → Domain → Skills cascade (E030). */
// it was local to this file and the specializations picker was its only caller.


/** The review page's validation surface (brief_X / E056) — Scott's framing */
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
      <div className="border-l-2 border-ink py-2 pl-4">
        <p className="text-[15px] font-bold text-ink">
          ✓ Everything checks out — you&apos;re ready to publish.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* E059 — MAGENTA, not red. This box is the last thing a provider sees */}
      {errors.length > 0 && (
        <div className="border-l-2 border-ink py-2 pl-4">
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
        <div className="border border-amber-500/30 bg-amber-50/60 p-4">
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
        "w-full border p-5 text-left transition-colors hover:bg-surface-hover " +
        (primary ? "border-ink" : "border-line")
      }
    >
      <span className="flex items-center gap-2">
        <span className="font-bold">{title}</span>
        {badge && (
          <span className="border border-ink px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-ink">
            {badge}
          </span>
        )}
      </span>
      <span className="mt-0.5 block text-[14.5px] text-ink-2">{description}</span>
    </button>
  );
}

/** The anti-drop-off lever is that the remaining steps become a REVIEW. Showing */
/** One sentence naming what the import filled in (WS5/E051). */
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

/** WHICH READER RAN, said out loud (E184). */
function ReaderLine({
  path,
}: {
  path: NonNullable<ImportOutcome["path"]>;
}) {
  if (path.reader === "ai") {
    // SAY WHICH SECTION FELL BACK, NOT "AI DIDN'T READ THIS"
    if (path.employersFromHeuristic) {
      return (
        <p className="mb-6 flex flex-wrap items-center gap-2 border-l-2 border-magenta py-2 pl-3.5 text-[13.5px] text-ink-2">
          <SparkIcon />
          <span>
            <b className="text-ink">Panameer AI read this</b> — but it couldn&apos;t
            make out your work history, so those jobs came from pattern-matching.
            Everything else below is what the AI read. Check the jobs closely.
          </span>
        </p>
      );
    }
    return (
      <p className="mb-6 flex flex-wrap items-center gap-2 text-[13.5px] text-ink-2">
        <SparkIcon />
        Read by Panameer AI — {path.tier} model (<code>{path.model}</code>).
      </p>
    );
  }
  return (
    <p className="mb-6 border-l-2 border-magenta py-2 pl-3.5 text-[13.5px] text-ink-2">
      <b className="text-ink">AI didn&apos;t read this one</b> — {path.reason}.
      What&apos;s below came from pattern-matching, so check it closely.
      {/* {path.configProblem && ( */}
    </p>
  );
}

/** Route an import gap to the section that can fix it (WS5/E051). */
function gapsFor(
  outcome: ImportOutcome | null,
  where: "work" | "other"
): string[] {
  const gaps = outcome?.gaps ?? [];
  const isWork = (g: string) => /employer|job|role|title|dates?|position|experience/i.test(g);
  return where === "work" ? gaps.filter(isWork) : gaps.filter((g) => !isWork(g));
}

// file and the rate panel was its only remaining caller.

/** The AI mark used wherever the product attributes work to AI (WS4/E174). */
// IMPORTED BACK — it has TWO OTHER CALLERS in this file (the AI-pass panel)

// Review (onboarding frame): one line per step + Work history, each with Edit.
function ReviewRows({ rows }: { rows: { k: string; v: string; warn?: string; small?: string; onEdit: () => void; edit?: string }[] }) {
  return (
    <div data-review-rows className="mt-5 border-t border-line">
      {rows.map((r) => (
        <div key={r.k} data-review-row={r.k} className="grid grid-cols-[1fr_auto] items-start gap-x-4 gap-y-1 border-b border-line px-1 py-3.5 sm:grid-cols-[150px_1fr_auto]">
          <p className="text-[14px] font-bold">{r.k}</p>
          <p className="order-3 col-span-2 text-[14px] leading-relaxed sm:order-none sm:col-span-1">
            {r.warn ? <span className="font-semibold text-magenta-dark">{r.warn}</span> : r.v}
            {r.small && <small className="block text-[12.5px] text-ink-2">{r.small}</small>}
          </p>
          <button type="button" onClick={r.onEdit} className="text-[13px] font-bold underline underline-offset-[3px] focus-visible:outline-2 focus-visible:outline-ink">
            {r.edit ?? "Edit"}
          </button>
        </div>
      ))}
    </div>
  );
}
