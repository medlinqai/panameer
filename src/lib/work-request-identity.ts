import { buyerDisplay } from "@/lib/buyer-display";
import {
  missingIdentity,
  WORK_REQUEST_BAR,
  type IdentityField,
  type IdentitySubject,
} from "@/lib/identity-bar";

/** Never varies by viewer — the redaction below is the only viewer-dependent bit. */
export type BuyerStanding = {
  /** When the ACCOUNT began, not the person's row. ISO. */
  memberSince: string | null;
  /** Work requests this P-Account has POSTED, this one included. */
  postedCount: number;
};

export type VerificationState = "verified" | "unverified";

export type VerificationLine = {
  key: "email" | "entity";
  state: VerificationState;
  label: string;
  /** The qualifier. Always present, in BOTH states — see below. */
  detail: string;
};

export type BuyerIdentity = {
  personName: string | null;
  /** Kept split for `Avatar`, which builds initials from the two. */
  personFirstName: string;
  personLastName: string;
  personTitle: string | null;
  personPhotoUrl: string | null;
  companyName: string | null;
  /** For the company link; null whenever the name is withheld, so the link can't reveal it. */
  companyId: string | null;
  /** What to print for the company (from buyerDisplay): name, code name or "Confidential buyer". */
  companyLabel: string | null;
  /** The alias shown in its place. Null falls back to a neutral phrase in the UI. */
  companyCodeName: string | null;
  companyConfidential: boolean;
  companyCountry: string | null;
  companyVertical: string | null;
  companyLogoUrl: string | null;
  standing: BuyerStanding;
  verification: VerificationLine[];
};

export const VERIFICATION_COPY: Record<
  VerificationLine["key"],
  Record<VerificationState, { label: string; detail: string }>
> = {
  email: {
    verified: {
      label: "Email verified",
      detail: "Confirms they control this inbox. It is not proof of who they are.",
    },
    unverified: {
      label: "Email not verified",
      detail: "This account has not confirmed its email address.",
    },
  },
  entity: {
    verified: {
      label: "Company verified",
      detail: "Panameer checked this company's legal name and tax ID against a public register.",
    },
    unverified: {
      label: "Company not yet verified",
      detail: "Panameer has not checked this company against a public register yet.",
    },
  },
};

export function entityVerificationState(company: {
  id?: string;
  tin?: string | null;
  entity_validated_at?: Date | string | null;
} | null): VerificationState {
  return company?.entity_validated_at ? "verified" : "unverified";
}

export function verificationLines(input: {
  emailVerifiedAt: Date | string | null;
  company: {
    id?: string;
    tin?: string | null;
    entity_validated_at?: Date | string | null;
  } | null;
}): VerificationLine[] {
  const email: VerificationState = input.emailVerifiedAt ? "verified" : "unverified";
  const entity = entityVerificationState(input.company);
  return [
    { key: "email", state: email, ...VERIFICATION_COPY.email[email] },
    { key: "entity", state: entity, ...VERIFICATION_COPY.entity[entity] },
  ];
}

export type PostRequirementKey = IdentityField;

export const POST_REQUIREMENTS: {
  key: PostRequirementKey;
  field: string;
  reason: string;
  href: string;
}[] = [
  {
    key: "name",
    field: "Add your name",
    reason: "Providers will not answer an unnamed request, and there is no way to check one.",
    href: "/profile",
  },
  {
    key: "photo",
    field: "Add a photo",
    reason: "Providers see who is asking before they spend an afternoon on a proposal.",
    href: "/profile",
  },
  {
    key: "jobTitle",
    field: "Add your job title",
    reason: "It tells a provider whether they are talking to the person who decides.",
    href: "/profile",
  },
];

export type PostIdentityInput = IdentitySubject;

export function missingIdentityForPost(input: PostIdentityInput): PostRequirementKey[] {
  return missingIdentity(input, WORK_REQUEST_BAR);
}

export const requirementFor = (key: PostRequirementKey) =>
  POST_REQUIREMENTS.find((r) => r.key === key)!;

export function buildBuyerIdentity(input: {
  person: {
    first_name: string;
    last_name: string;
    title: string | null;
    photo_url: string | null;
    company: {
      id: string;
      name: string;
      country: string | null;
      vertical: string | null;
      logo_url: string | null;
      tin: string | null;
      entity_validated_at?: Date | string | null;
    } | null;
    user: { email_verified: Date | null } | null;
  };
  companyVisibility: string;
  companyCodeName: string | null;
  standing: BuyerStanding;
  viewer: { isOwner: boolean; isAdmin: boolean; isPlus: boolean };
}): BuyerIdentity {
  const { person, viewer } = input;
  const company = person.company;

  const shown = buyerDisplay(
    { visibility: input.companyVisibility, codeName: input.companyCodeName, company: company ?? null },
    { signedIn: true, ...viewer }
  );
  const visibleName = shown.name;
  const hidden = shown.confidential;

  const fullName = `${person.first_name} ${person.last_name}`.trim();
  return {
    personName: fullName || null,
    personFirstName: person.first_name,
    personLastName: person.last_name,
    personTitle: person.title?.trim() || null,
    personPhotoUrl: person.photo_url,
    companyName: visibleName,
    companyId: shown.companyId,
    companyLabel: shown.label,
    companyCodeName: input.companyCodeName?.trim() || null,
    companyConfidential: hidden,
    companyCountry: company?.country ?? null,
    companyVertical: company?.vertical ?? null,
    companyLogoUrl: shown.logoUrl,
    standing: input.standing,
    verification: verificationLines({
      emailVerifiedAt: person.user?.email_verified ?? null,
      // THE COLUMN IS CARRIED THROUGH EXPLICITLY . This
      company: company
        ? {
            id: company.id,
            tin: company.tin,
            entity_validated_at: company.entity_validated_at ?? null,
          }
        : null,
    }),
  };
}

/** A FIRST-TIME POSTER IS STATED, NOT WARNED ABOUT. Scott: it is honest and it */
export function standingLine(s: BuyerStanding): string {
  const parts: string[] = [];
  if (s.memberSince) {
    const d = new Date(s.memberSince);
    if (!Number.isNaN(d.getTime())) {
      parts.push(
        `Member since ${d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}`
      );
    }
  }
  parts.push(
    s.postedCount <= 1
      ? "First work request"
      : `${s.postedCount} work requests posted`
  );
  return parts.join(" · ");
}
