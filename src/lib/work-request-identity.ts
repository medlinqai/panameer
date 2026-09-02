import { clientNameVisibility } from "@/lib/plus";

/**
 * WHO IS ASKING — identity on a work request (`P1-J4-E025`).
 *
 * **SCOTT, 2026-09-02:** *"WORK REQUEST NEEDS MORE. I SEE THEIR REQUEST… WANT TO
 * SEE WHO THEY ARE JUST LIKE I WOULD IN LINKEDIN… AND THERE IS ONLY A TITLE?
 * LOOKS LIKE A SCAM FOR A SITE I DO NOT KNOW WELL."* And: *"i am letting you
 * post for free… if you refuse to give basic details… meh, maybe it isn't the
 * place for you?"*
 *
 * This is the BUYER-SIDE HALF of the vetting argument. Everything built so far
 * asks whether the seller is real; a provider deciding whether to spend an
 * afternoon on a proposal is making the same judgement in the opposite
 * direction with less to go on.
 *
 * ── ⚠ ALMOST NONE OF THIS IS NEW DATA ────────────────────────────────────────
 *
 * `WorkRequest` already carries `buyer_person_id` and `p_account_id`, so the
 * poster's `Person` (name, photo, title), their `Company` (name, country,
 * vertical, logo) and their account all hang off the row. Nothing is invented
 * here; it is SHOWN.
 *
 * ── ⚠⚠ NO INVENTED SIGNALS. THREE THINGS ARE DELIBERATELY ABSENT ─────────────
 *
 * No trust score, no stars, no percentage, no "highly rated buyer". Facts the
 * platform can stand behind, and nothing else.
 *
 * ⚠⚠ AND "AWARDED" IS NOT AMONG THEM, WHICH IS A DEVIATION FROM THE BRIEF AND
 * IS REPORTED RATHER THAN FAKED. The brief asks for how many requests an account
 * has POSTED **and AWARDED**. Posted is a count of rows. **Awarded has no
 * source**: there is no `Proposal`, no `WorkOrder`, no `Award`, no `Contract`
 * and no `Engagement` model in the schema — the same brief's DO NOT list says
 * so itself. Deriving it would mean inventing the number this file exists to
 * refuse. So the block shows POSTED only, and the day an award model lands this
 * is where the second count goes.
 */

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
  /** ⚠ NULL WHEN CONFIDENTIAL. The redaction happens before this leaves the server. */
  companyName: string | null;
  /** The alias shown in its place. Null falls back to a neutral phrase in the UI. */
  companyCodeName: string | null;
  companyConfidential: boolean;
  /** ⚠ NEVER HIDDEN, even when confidential. */
  companyCountry: string | null;
  companyVertical: string | null;
  /** ⚠ Suppressed when confidential — a logo names the company as surely as text. */
  companyLogoUrl: string | null;
  standing: BuyerStanding;
  verification: VerificationLine[];
};

/* ────────────────────────────────────────────────────────────────────────────
   THE VERIFICATION LINES — WS-2, the load-bearing part
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠⚠ FOUR STRINGS, TWO LINES, BOTH STATES DECLARED UP FRONT.
 *
 * The rule Scott set on 2026-09-02: the platform verifies what it asserts and is
 * HONEST ABOUT WHAT IT HAS NOT CHECKED. An absent badge reads as an oversight; an
 * explicit *"we have not verified this company yet"* is information a provider
 * can act on. **So the negative is never hidden and never omitted.**
 *
 * ⚠⚠ AND THIS IS WHY BOTH STATES LIVE IN ONE TABLE. `E282` — entity validation
 * against a public register — IS NOT BUILT (verified: no secretary-of-state
 * route, no `good_standing`, no `entity_verified` anywhere in the codebase). So
 * the entity line renders NEGATIVE for everyone today. When `E282` lands, ONE
 * function below changes what it returns and the affirmative copy that is
 * already sitting here starts rendering. **No redesign, no second layout, no new
 * component — the state is data.**
 *
 * ⚠ THESE FOUR STRINGS ARE CC'S WORDS. Reported verbatim at `E025` for Scott to
 * overrule; each is one entry in this table and nothing else writes them.
 */
export const VERIFICATION_COPY: Record<
  VerificationLine["key"],
  Record<VerificationState, { label: string; detail: string }>
> = {
  email: {
    verified: {
      label: "Email verified",
      /* ⚠ DELIBERATELY UNDERCLAIMS. A confirmed inbox is a confirmed inbox. */
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

/**
 * ⚠⚠ THE ONE LINE THAT CHANGES WHEN `E282` LANDS.
 *
 * It takes the company so the signature does not change later, and it returns
 * `"unverified"` unconditionally because there is nothing to read: no field
 * records an entity check because no code performs one. ⚠ THIS IS NOT A STUB
 * STANDING IN FOR DATA — it is the honest answer to "has this been checked", and
 * the answer is no.
 */
export function entityVerificationState(_company: {
  id?: string;
  tin?: string | null;
} | null): VerificationState {
  void _company;
  return "unverified";
}

export function verificationLines(input: {
  emailVerifiedAt: Date | string | null;
  company: { id?: string; tin?: string | null } | null;
}): VerificationLine[] {
  const email: VerificationState = input.emailVerifiedAt ? "verified" : "unverified";
  const entity = entityVerificationState(input.company);
  return [
    { key: "email", state: email, ...VERIFICATION_COPY.email[email] },
    { key: "entity", state: entity, ...VERIFICATION_COPY.entity[entity] },
  ];
}

/* ────────────────────────────────────────────────────────────────────────────
   WS-3 — WHAT YOU MUST GIVE TO POST
   ──────────────────────────────────────────────────────────────────────────── */

export type PostRequirementKey =
  | "personName"
  | "personPhoto"
  | "personTitle"
  | "approvedCompany"
  | "companyName"
  | "companyCountry";

/**
 * ⚠⚠ ONE REASON PER FIELD, WRITTEN IN THE PROVIDER'S INTEREST, NOT THE
 * PLATFORM'S — and the refusal NAMES the field and LINKS to it. Not "complete
 * your profile". Scott's example, followed literally: *"Add a photo — providers
 * see who is asking before they spend an afternoon on a proposal."*
 *
 * ⚠ THESE SIX STRINGS ARE CC'S WORDS except the photo one, which is Scott's
 * verbatim. Reported at `E025`.
 *
 * ⚠ `approvedCompany` IS NOT A NEW RULE. It is the SAME requirement provider
 * publish already enforces, for the reason `lib/onboarding.ts:2360` states in
 * its own words: *"a work order is between companies, so a provider without an
 * approved membership cannot be contracted."* Same query shape
 * (`status: "APPROVED"`), same justification, pointed the other way.
 */
export const POST_REQUIREMENTS: {
  key: PostRequirementKey;
  field: string;
  reason: string;
  href: string;
}[] = [
  {
    key: "personName",
    field: "Add your name",
    reason: "Providers will not answer an unnamed request, and there is no way to check one.",
    href: "/settings/profile",
  },
  {
    key: "personPhoto",
    field: "Add a photo",
    reason: "Providers see who is asking before they spend an afternoon on a proposal.",
    href: "/settings/profile",
  },
  {
    key: "personTitle",
    field: "Add your job title",
    reason: "It tells a provider whether they are talking to the person who decides.",
    href: "/settings/profile",
  },
  {
    key: "approvedCompany",
    field: "Get your company membership approved",
    reason: "A work order is between companies, so a provider cannot be contracted by a person alone.",
    href: "/settings/company",
  },
  {
    key: "companyName",
    field: "Add your company name",
    reason: "A provider needs to know which company would be hiring them, even if you post confidentially.",
    href: "/settings/company",
  },
  {
    key: "companyCountry",
    field: "Add your company's country",
    reason: "Providers filter by where the work is, and it decides how they would be paid.",
    href: "/settings/company",
  },
];

export type PostIdentityInput = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  photoUrl: string | null | undefined;
  jobTitle: string | null | undefined;
  hasApprovedCompanyMembership: boolean;
  companyName: string | null | undefined;
  companyCountry: string | null | undefined;
};

/**
 * The identity half of the post gate. PURE, so `check:work-request-identity`
 * drives every field without a fixture account.
 *
 * ⚠ A CONFIDENTIAL REQUEST STILL HAS TO SATISFY ALL OF THIS. Confidentiality
 * governs what a PROVIDER is shown, not what the buyer has to give Panameer.
 */
export function missingIdentityForPost(input: PostIdentityInput): PostRequirementKey[] {
  const has = (v: string | null | undefined) => Boolean(v && v.trim());
  const missing: PostRequirementKey[] = [];
  if (!has(input.firstName) || !has(input.lastName)) missing.push("personName");
  if (!has(input.photoUrl)) missing.push("personPhoto");
  if (!has(input.jobTitle)) missing.push("personTitle");
  if (!input.hasApprovedCompanyMembership) missing.push("approvedCompany");
  if (!has(input.companyName)) missing.push("companyName");
  if (!has(input.companyCountry)) missing.push("companyCountry");
  return missing;
}

export const requirementFor = (key: PostRequirementKey) =>
  POST_REQUIREMENTS.find((r) => r.key === key)!;

/* ────────────────────────────────────────────────────────────────────────────
   WS-4 — CONFIDENTIAL HIRING
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * ⚠⚠ THE REDACTION REUSES `clientNameVisibility` FROM `lib/plus.ts` VERBATIM —
 * the exact function `Project.client_visibility` already runs through, on the
 * exact same `ClientVisibility` enum. There is no second mechanism and no second
 * set of semantics to drift: PUBLIC everyone · PLUS_ONLY owner, staff and Plus
 * buyers · CONFIDENTIAL owner and staff only.
 *
 * ⚠⚠ IT HIDES THE COMPANY NAME AND THE COMPANY LOGO. NOTHING ELSE. The person,
 * their photo, their job title, the country, the industry, the standing counts
 * and BOTH verification lines are untouched — *"a verified company in Oil & Gas,
 * hiring confidentially"* still tells a provider what they need, and a request
 * that hid all of it would be exactly the scam this whole brief is about.
 * ⚠ THE LOGO GOES WITH THE NAME because a logo names a company as surely as text
 * does. That is the same reasoning `provider-profile-view.ts:320` records for
 * `client_domain` — a redaction that leaves an identifying field behind is not a
 * redaction.
 */
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

  const { clientName: visibleName } = clientNameVisibility({
    visibility: input.companyVisibility,
    isOwner: viewer.isOwner,
    isAdmin: viewer.isAdmin,
    isPlus: viewer.isPlus,
    clientName: company?.name ?? null,
  });
  const hidden = Boolean(company?.name) && visibleName === null;

  const fullName = `${person.first_name} ${person.last_name}`.trim();
  return {
    personName: fullName || null,
    personFirstName: person.first_name,
    personLastName: person.last_name,
    personTitle: person.title?.trim() || null,
    personPhotoUrl: person.photo_url,
    companyName: visibleName,
    companyCodeName: input.companyCodeName?.trim() || null,
    companyConfidential: hidden,
    companyCountry: company?.country ?? null,
    companyVertical: company?.vertical ?? null,
    companyLogoUrl: hidden ? null : (company?.logo_url ?? null),
    standing: input.standing,
    verification: verificationLines({
      emailVerifiedAt: person.user?.email_verified ?? null,
      company: company ? { id: company.id, tin: company.tin } : null,
    }),
  };
}

/**
 * "Member since March 2025 · First work request".
 *
 * ⚠ A FIRST-TIME POSTER IS STATED, NOT WARNED ABOUT. Scott: it is honest and it
 * is not a warning. No "new account" pill, no amber, no caution icon —
 * everybody's first request is somebody's first request.
 */
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
