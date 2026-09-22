/**
 * ── ⚠⚠ THE PROVIDER DRAFT, SHARED (`P2-A2-E597` WS-C) ────────────────────
 *
 * ⚠ The wizard's in-flight shape, its empty value, and the ONE mapping from
 * `/api/onboarding/status` onto it.
 *
 * ⚠⚠⚠ IT MOVED OUT OF `join/provider/page.tsx` BECAUSE `/profile/edit/[section]`
 * NEEDS THE SAME DRAFT. The alternative was a second mapping in the route, and a
 * second computation of one concept kept in step by hand is `E585` exactly —
 * the defect this brief's whole family exists to remove. ⚠ One shape, one
 * mapping, two mounts.
 *
 * ⚠ SUPERSEDED, quoted not deleted (`E164`): `type ProfilePayload`, `type
 * Profile`, `const emptyProfile` and the body of `hydrate`'s `setProfile(…)`
 * call all lived in the wizard page.
 * ⚠⚠ `hydrate` ITSELF STAYED THERE. It also sets `steps`, `displayTotalSteps`
 * and `isRecruiter` — wizard state the route has no use for — so only the
 * PROFILE MAPPING moved, as `draftFromStatus`.
 */

import { type CertificationDraft } from "@/components/onboarding/CertificationsEditor";
import { type EducationDraft } from "@/components/onboarding/EducationCards";
import { DEFAULT_SERVICE_FEE_BPS } from "@/lib/display";
import {
  type EmployerCard,
  type EmployerProject,
} from "@/components/onboarding/EmployersStep";

/* ⚠ These three moved with the draft they describe. ⚠ SUPERSEDED, quoted not
   deleted (`E164`): `type StatusPayload`, `type AddressDraft` and
   `type LanguageDraft` lived in `join/provider/page.tsx`. */
export type StatusPayload = {
  email: string;
  /** WS4 — an import on the server outlives the client's upload state. */
  imports?: { id: string; status: string }[];
  emailVerified: boolean;
  resumeStep: string;
  /** The itinerary for THIS user (recruiters get 8, providers 10) — WS1. */
  steps?: Step[];
  /**
   * ⚠ THE DISPLAYED DENOMINATOR, DERIVED SERVER-SIDE (`P1-A1.4-E406` WS-1) —
   * `PROVIDER_STEPS.length + 1`. ⚠⚠ IT IS SENT RATHER THAN IMPORTED because this
   * is a `"use client"` file and `lib/onboarding` reaches Prisma: importing the
   * array pulls `dns`/`fs`/`net`/`tls` into the browser bundle and the route
   * 500s. Measured — `tsc` and every gate stayed green while the page was dead.
   */
  displayTotalSteps?: number;
  isRecruiter?: boolean;
  completeness?: number;
  profile?: ProfilePayload;
};

export type AddressDraft = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

export type LanguageDraft = { name: string; level: string | null };


/* ⚠ THE STEP VOCABULARY, SHARED. `StatusPayload.steps` is typed on it, and the
   section route names the same steps when it saves. ⚠ SUPERSEDED, quoted not
   deleted (`E164`): `ALL_STEPS` and `type Step` lived in the wizard page, which
   now re-exports them from here so there is one list. */
export const ALL_STEPS = [
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
  /* ⚠ RENDERABLE, NOT COUNTED (`P1-A1.4-E418`). No server itinerary contains
     `company` any more — provider or recruiter — so its `case` below is
     unreachable. It stays in this union for the same reason `work_history`
     does: the screen still exists on disk for work order acceptance. */
  "company",
  "finish",
] as const;

export type Step = (typeof ALL_STEPS)[number];

export type ProfilePayload = {
  workMethod?: string | null;
  profileMethod?: string | null;
  pillarId?: string | null;
  pillarName?: string | null;
  roleTypeId?: string | null;
  roleTypeName?: string | null;
  roleTypeIds?: string[];
  roleTypes?: { id: string; name: string; display: string }[];
  /**
   * ⚠⚠ THE RÉSUMÉ'S OPINION, NOT THE PROVIDER'S ANSWER (`P2-J1.4-E509` WS-A).
   * Derived server-side by counting THIS provider's matched skills by role.
   * ⚠ A PREFILL ONLY — `roleTypeIds` above is the stored answer and always wins.
   */
  derivedRoleTypeIds?: string[];
  derivedFromSkills?: number;
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
  /** ⚠ `roleTypeId` — E517, so the step can name what the roles do not show. */
  skillNames?: { id: string; name: string; area?: string | null; roleTypeId?: string | null }[];
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
}

export type ProviderDraft = {
  workMethod: string | null;
  profileMethod: string | null;
  /** ⚠ `E509` WS-A — the résumé's suggestion, kept alongside the answer so the
   *  page can say the role was PREFILLED rather than silently assigning it. */
  derivedRoleTypeIds: string[];
  derivedFromSkills: number;
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
  skillNames: { id: string; name: string; area?: string | null; roleTypeId?: string | null }[];
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
}

export const emptyDraft = (): ProviderDraft => ({
  workMethod: null,
  profileMethod: null,
  derivedRoleTypeIds: [],
  derivedFromSkills: 0,
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
  /* ⚠ ONE CONSTANT, NOT A LITERAL (`P1-J4-E388`) — see its docblock. */
  serviceFeeBps: DEFAULT_SERVICE_FEE_BPS,
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
/**
 * The status payload's `profile`, mapped onto the draft the editors render.
 *
 * ⚠ EVERY `?? null` AND `?? []` HERE IS LOAD-BEARING: the endpoint omits what a
 * provider has not answered, and an editor handed `undefined` where it expects
 * `null` renders a controlled input as uncontrolled and loses the value on the
 * first keystroke.
 */
export function draftFromStatus(p: NonNullable<StatusPayload["profile"]>): ProviderDraft {
  return {
      workMethod: p.workMethod ?? null,
      profileMethod: p.profileMethod ?? null,
      pillarId: p.pillarId ?? null,
      pillarName: p.pillarName ?? null,
      roleTypeId: p.roleTypeId ?? null,
      /*
        ── ⚠⚠ PREFILLED, NEVER REPLACED (`E509` WS-A) ────────────────────────

        > **SCOTT:** *"we use the skills to derive the role(s). For those who do
        > not or their resume cannot use the parser… they will need to add their
        > RDS manually."*

        ⚠ THE STORED ANSWER WINS WHENEVER THERE IS ONE. The derivation only
        fills an EMPTY selection, so it can never overwrite a role the provider
        chose — which is the whole reason `Technology-Specific · Salesforce`
        survived unnoticed: it was assigned, not suggested.
        ⚠⚠ NO RÉSUMÉ MEANS NO SKILLS MEANS NOTHING TO DERIVE. The answer is then
        an EMPTY SET and the page asks, rather than guessing.
      */
      roleTypeIds:
        p.roleTypeIds && p.roleTypeIds.length
          ? p.roleTypeIds
          : p.roleTypeId
            ? [p.roleTypeId]
            : (p.derivedRoleTypeIds ?? []),
      derivedRoleTypeIds: p.derivedRoleTypeIds ?? [],
      derivedFromSkills: p.derivedFromSkills ?? 0,
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
      serviceFeeBps: p.serviceFeeBps ?? DEFAULT_SERVICE_FEE_BPS,
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
    };
}
