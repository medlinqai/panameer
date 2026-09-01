/**
 * Client-facing shapes for the JSON returned by our API routes. These mirror
 * the lib return types (getMe, getPublicProviderProfile) after JSON transport
 * (Dates become ISO strings). Kept here so components share one source of truth.
 */

export type Rates = {
  currency: string;
  onsiteCents: number | null;
  remoteCents: number | null;
};

export type Me = {
  /** `P1-ALL` — unread AND delivered. Drives the bell badge. */
  notificationsUnread: number;
  /**
   * ⚠ NULLABLE — A SIGNED-IN USER WITH NO `Person` IS A STATE THE APP CAN REACH
   * (P1-ALL-E002).
   *
   * `/assess/claim` creates a `User` AND NOTHING ELSE, by design: "a Person needs
   * a Company, and inventing an org record for someone who has answered eight
   * questions would put a half-built tenant in the backbone for every curious
   * visitor." `/api/me` used to answer 404 for exactly that person, so the shell
   * degraded for a state its own funnel produces.
   *
   * It is not merely "the admin before onboarding" either: `P1-J1.2-E003` is the
   * proof that Person-related state in this codebase DOES drift from what
   * onboarding assumes, so "every account has a Person" is precisely the kind of
   * invariant that should be typed rather than believed.
   */
  person: {
    id: string;
    firstName: string;
    lastName: string;
    title: string | null;
    phone: string | null;
    photoUrl: string | null;
    status: string;
    roles: {
      isServiceBuyer: boolean;
      /**
       * USER_JOB Requester — owns a RequesterProfile. `getMe` has always sent
       * this and the type never declared it, so every client reading `roles`
       * was blind to the one flag that separates the person who asks for work
       * from the one who administers the company's buying.
       */
      isRequester: boolean;
      isServiceProvider: boolean;
      isServiceCoordinator: boolean;
      isSupport: boolean;
    };
    site: { id: string; name: string } | null;
  } | null;
  /** Null whenever `person` is — a Company is reached through the Person. */
  company: {
    id: string;
    name: string;
    vertical: string | null;
    website: string | null;
    logoUrl: string | null;
    /** True when this person administers the company (E214). */
    isAdmin: boolean;
  } | null;
  /** Null whenever `person` is — same reason. */
  pAccount: { id: string; name: string; kind: string } | null;
  providerProfile: {
    id: string;
    status: "PENDING" | "ACTIVE";
    validationStatus: "NOT_REQUESTED" | "REQUESTED" | "VALIDATED" | "REJECTED";
    completeness: number;
    paused: boolean;
    /** `E306` — `onboarding_completed_at != null`. Gates the marketing nav. */
    published: boolean;
    /** J2.4 WS-B — the persona menu's "Online for messages" state. */
    availableForMessages: boolean;
    visible: boolean;
    rating: number | null;
    rates: Rates;
  } | null;
  buyerProfile: {
    id: string;
    subscriptionTier: "BASIC" | "BUSINESS_PLUS";
  } | null;
  orgCompanyCount: number;
};

export type PublicProviderProfile = {
  id: string;
  validated: boolean;
  headline: string;
  overview: string | null;
  /** Null until the provider answers step 1 of the wizard (brief_P / E003). */
  /** Cross-cutting specializations (brief_R). */
  specializations: { id: string; name: string; kind: string }[];
  workTypes: string[];
  rates: Rates;
  rating: number | null;
  idBadge: string | null;
  region: { id: string; name: string } | null;
  person: {
    firstName: string;
    lastName: string;
    title: string | null;
    photoUrl: string | null;
  };
  skills: { id: string; name: string; roleType: string }[];
  experience: {
    id: string;
    employer: string;
    roleTitle: string;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    projects: { id: string; name: string; description: string | null }[];
  }[];
  certifications: {
    id: string;
    name: string;
    issuer: string | null;
    year: number | null;
  }[];
  education: {
    id: string;
    institution: string;
    degree: string | null;
    field: string | null;
    year: number | null;
  }[];
  languages: { id: string; name: string; proficiency: string | null }[];
};

/** Format integer cents as an hourly rate, e.g. 12500 → "$125/hr". */
export function formatRate(cents: number | null, currency = "USD"): string | null {
  if (cents === null || cents === undefined) return null;
  const symbol = currency === "USD" ? "$" : `${currency} `;
  const amount = cents / 100;
  const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `${symbol}${text}/hr`;
}

/** Turn an ENUM_LIKE token into "Enum Like" for display. */
export function humanizeToken(token: string): string {
  return token
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
