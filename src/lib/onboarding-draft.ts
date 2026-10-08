
import { type CertificationDraft } from "@/components/onboarding/CertificationsEditor";
import { type EducationDraft } from "@/components/onboarding/EducationCards";
import { DEFAULT_SERVICE_FEE_BPS } from "@/lib/display";
import {
  type EmployerCard,
  type EmployerProject,
} from "@/components/onboarding/EmployersStep";

export type StatusPayload = {
  email: string;
  /** WS4 — an import on the server outlives the client's upload state. */
  imports?: { id: string; status: string }[];
  emailVerified: boolean;
  resumeStep: string;
  /** The itinerary for THIS user (recruiters get 8, providers 10) — WS1. */
  steps?: Step[];
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
  derivedRoleTypeIds?: string[];
  derivedFromSkills?: number;
  specializationIds?: string[];
  specializations?: { id: string; name: string; kind: string }[];
  employers?: EmployerCard[];
  /** WS-4 — the résumé's most-recent employer, to seed the company search. */
  suggestedCompanyName?: string | null;
  /** ALL projects, including any not attached to an employer. */
  projects?: EmployerProject[];
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
    kind?: string | null;
  }[];
  skillIds?: string[];
  skillNames?: { id: string; name: string; area?: string | null; roleTypeId?: string | null }[];
  resumeSkillIds?: string[];
  headline?: string | null;
  overview?: string | null;
  hourlyRateCents?: number | null;
  rateMinCents?: number | null;
  rateMaxCents?: number | null;
  onsiteRateCents?: number | null;
  remoteRateCents?: number | null;
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
  derivedRoleTypeIds: string[];
  derivedFromSkills: number;
  pillarId: string | null;
  pillarName: string | null;
  roleTypeId: string | null;
  /** WS2 — every role claimed; `roleTypeId` is the first of these (primary). */
  roleTypeIds: string[];
  roleTypeName: string | null;
  specializationIds: string[];
  specializationNames: { id: string; name: string }[];
  customSpecializations: string[];
  certifications: CertificationDraft[];
  employers: EmployerCard[];
  suggestedCompanyName: string | null;
  projects: EmployerProject[];
  skillIds: string[];
  skillNames: { id: string; name: string; area?: string | null; roleTypeId?: string | null }[];
  resumeSkillIds: string[];
  customSkills: string[];
  headline: string;
  overview: string;
  hourlyRateCents: number | null;
  rateMinCents: number | null;
  rateMaxCents: number | null;
  onsiteRateCents: number | null;
  remoteRateCents: number | null;
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
  onsiteRateCents: null,
  remoteRateCents: null,
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
export function draftFromStatus(p: NonNullable<StatusPayload["profile"]>): ProviderDraft {
  return {
      workMethod: p.workMethod ?? null,
      profileMethod: p.profileMethod ?? null,
      pillarId: p.pillarId ?? null,
      pillarName: p.pillarName ?? null,
      roleTypeId: p.roleTypeId ?? null,
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
        kind: c.kind ?? "CERTIFICATION",
      })),
      skillIds: p.skillIds ?? [],
      skillNames: p.skillNames ?? [],
      resumeSkillIds: p.resumeSkillIds ?? [],
      headline: p.headline ?? "",
      overview: p.overview ?? "",
      hourlyRateCents: p.hourlyRateCents ?? null,
      rateMinCents: p.rateMinCents ?? null,
      rateMaxCents: p.rateMaxCents ?? null,
      onsiteRateCents: p.onsiteRateCents ?? null,
      remoteRateCents: p.remoteRateCents ?? null,
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

export const WORK_METHOD_OPTIONS = [
  {
    value: "SERVICES",
    title: "I Sell Services and/or Service Products",
    description:
      "You sell your time by the hour/month or pre-defined deliverables.",
  },
  // R1: the Recruiter option is hidden (data kept): { value: "RECRUITER", title: "I Sell the Services of Others (Recruiter)" }.
];
