
import { missingRequired, type RequiredSetInput } from "@/lib/completeness";

export type IdentityField = "name" | "photo" | "jobTitle";

/** Community: three fields, no company. */
export const COMMUNITY_BAR: IdentityField[] = ["name", "photo", "jobTitle"];

export const WORK_REQUEST_BAR: IdentityField[] = [...COMMUNITY_BAR];

export type IdentitySubject = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  photoUrl: string | null | undefined;
  jobTitle: string | null | undefined;
  hasApprovedCompanyMembership: boolean;
  companyName: string | null | undefined;
  companyCountry: string | null | undefined;
};

const filled = (v: string | null | undefined) => Boolean(v && v.trim());

const SATISFIED: Record<IdentityField, (s: IdentitySubject) => boolean> = {
  name: (s) => filled(s.firstName) && filled(s.lastName),
  photo: (s) => filled(s.photoUrl),
  jobTitle: (s) => filled(s.jobTitle),
};

export function missingIdentity(
  subject: IdentitySubject,
  bar: IdentityField[]
): IdentityField[] {
  return bar.filter((f) => !SATISFIED[f](subject));
}

export function subjectFromPerson(person: {
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  title: string | null;
  company?: { name: string | null; country: string | null } | null;
}, hasApprovedCompanyMembership = false): IdentitySubject {
  return {
    firstName: person.first_name,
    lastName: person.last_name,
    photoUrl: person.photo_url,
    jobTitle: person.title,
    hasApprovedCompanyMembership,
    companyName: person.company?.name,
    companyCountry: person.company?.country,
  };
}

/** The columns either bar needs. Reused by both callers' Prisma selects. */
export const IDENTITY_PERSON_SELECT = {
  first_name: true,
  last_name: true,
  photo_url: true,
  title: true,
} as const;

/** Every rung's own key space, so a reason can be attached to each field. */
export type GateField =
  | IdentityField
  /** `LEARN` adds exactly one. */
  | "skill"
  /* `SEARCHABLE`'s keys mirror `missingRequired()`'s returned phrases 1:1. */
  | "title"
  | "role"
  | "rate"
  | "address"
  | "phone"
  /** `SELL` adds one on top of `SEARCHABLE`. */
  | "payoutMethod";

export type GateSetName = "IDENTITY" | "LEARN" | "SEARCHABLE" | "SELL";

export type GateGap = {
  key: GateField;
  /** The imperative. Becomes the link text. */
  field: string;
  reason: string;
  href: string;
};

export const GATE_REASONS: Record<GateField, { field: string; reason: string; href: string }> = {
  name: {
    field: "Add your name",
    reason: "People answer people, and buyers don't hire someone they can't name.",
    href: "/settings/profile",
  },
  photo: {
    field: "Add a photo",
    reason: "A face gets more replies than an avatar, and buyers see who they'd be working with.",
    href: "/settings/profile",
  },
  jobTitle: {
    field: "Add your job title",
    reason: "It tells people why your answer is worth reading.",
    href: "/settings/profile",
  },
  skill: {
    field: "Add a skill",
    reason: "It's how we know which courses to tell you about.",
    href: "/settings/profile",
  },
  title: {
    field: "Add a headline",
    reason: "It's the first line a buyer reads about you, and it's what search matches on.",
    href: "/settings/profile",
  },
  role: {
    field: "Pick your role",
    reason: "Buyers browse by role — without one you're not in any of those lists.",
    href: "/settings/profile",
  },
  rate: {
    field: "Add a rate",
    reason: "Buyers filter by rate, and without one you won't appear in search.",
    href: "/settings/profile",
  },
  address: {
    field: "Add your address",
    reason: "Buyers filter by where you are, and on-site work needs to know you're reachable.",
    href: "/settings/profile",
  },
  phone: {
    field: "Add your phone number",
    reason: "It's how a buyer reaches you once they've decided, without waiting on email.",
    href: "/settings/profile",
  },
  payoutMethod: {
    field: "Add a withdrawal method",
    reason: "Panameer can't pay you for a sale until there's somewhere to send the money.",
    href: "/settings/withdrawals",
  },
};

export const gateGap = (key: GateField): GateGap => ({ key, ...GATE_REASONS[key] });

const isIdentityField = (f: GateField): f is IdentityField =>
  Object.prototype.hasOwnProperty.call(SATISFIED, f);

export const LEARN_BAR: GateField[] = ["name"];

export const LEARN_REASON_OVERRIDES: Partial<Record<GateField, string>> = {
  name: "Your certificate is issued in your name, so we need one before you enrol.",
};

export type LearnSubject = IdentitySubject & { skillCount: number };

export function missingForLearn(subject: LearnSubject): GateGap[] {
  const gaps: GateGap[] = missingIdentity(
    subject,
    LEARN_BAR.filter(isIdentityField)
  ).map((f) => {
    const gap = gateGap(f);
    const override = LEARN_REASON_OVERRIDES[f];
    return override ? { ...gap, reason: override } : gap;
  });
  if (LEARN_BAR.includes("skill") && subject.skillCount < 1) {
    gaps.push(gateGap("skill"));
  }
  return gaps;
}

export const REQUIRED_PHRASE_TO_FIELD: Record<string, GateField> = {
  "a title": "title",
  "a role": "role",
  "at least one skill": "skill",
  "your rate": "rate",
  "a photo": "photo",
  "your address": "address",
  "your phone number": "phone",
};

export function missingForSearchable(input: RequiredSetInput): GateGap[] {
  return missingRequired(input).map((phrase) => {
    const key = REQUIRED_PHRASE_TO_FIELD[phrase];
    if (!key) {
      throw new Error(
        `missingRequired() returned "${phrase}", which has no entry in REQUIRED_PHRASE_TO_FIELD. ` +
          `Add its key and its member-interest reason — a required field without a reason is not allowed.`
      );
    }
    return gateGap(key);
  });
}

export type SellSubject = RequiredSetInput & { payoutMethodCount: number };

export function missingForSell(subject: SellSubject): GateGap[] {
  const gaps = missingForSearchable(subject);
  if (subject.payoutMethodCount < 1) gaps.push(gateGap("payoutMethod"));
  return gaps;
}

/** The rungs, for the harness and for anything that needs to enumerate them. */
export const GATE_SETS: Record<GateSetName, GateField[]> = {
  IDENTITY: COMMUNITY_BAR,
  LEARN: LEARN_BAR,
  SEARCHABLE: Object.values(REQUIRED_PHRASE_TO_FIELD),
  SELL: [...Object.values(REQUIRED_PHRASE_TO_FIELD), "payoutMethod"],
};
