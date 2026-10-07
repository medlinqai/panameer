
export type UserJobInput = {
  is_service_coordinator: boolean;
  is_service_provider: boolean;
  requesterProfile: object | null | undefined;
  buyerProfile: object | null | undefined;
};

/** Every job this person holds, in the order the grid prints them. */
export function jobsFor(p: UserJobInput): string[] {
  return [
    p.is_service_coordinator ? "Recruiter" : null,
    p.is_service_provider ? "Provider" : null,
    p.buyerProfile ? "Buyer Admin" : p.requesterProfile ? "Buyer" : null,
  ].filter((j): j is string => j !== null);
}

/** The grid's cell: the jobs joined, or an em-dash when there are none. */
export function jobLabel(p: UserJobInput): string {
  return jobsFor(p).join(" · ") || "—";
}

export const JOB_TILES: {
  key: string;
  label: string;
  tone: "neutral" | "amber" | "emerald" | "emeraldDeep" | "emeraldSolid";
}[] = [
  // R1: the user-facing word is Buyer (internal key stays REQUESTER); recruiters are hidden.
  { key: "REQUESTER", label: "Buyers", tone: "amber" },
  { key: "BUYER", label: "Buyer Admins", tone: "emerald" },
  { key: "PROVIDER", label: "Providers", tone: "emeraldSolid" },
  { key: "ADMINISTRATOR", label: "Administrators", tone: "neutral" },
];

/** What `jobsFor` returns, keyed the way `JOB_TILES` and `?job=` spell it. */
const JOB_BY_KEY: Record<string, string> = {
  REQUESTER: "Buyer",
  BUYER: "Buyer Admin",
  RECRUITER: "Recruiter",
  PROVIDER: "Provider",
};

export type AdminFlags = { isSystemAdmin: boolean; isSupport: boolean };

export function holdsJob(
  key: string,
  p: UserJobInput,
  admin: AdminFlags
): boolean {
  if (key === "ADMINISTRATOR") return admin.isSystemAdmin || admin.isSupport;
  const want = JOB_BY_KEY[key];
  return want ? jobsFor(p).includes(want) : false;
}
