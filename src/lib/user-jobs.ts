
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
    p.buyerProfile ? "Buyer" : p.requesterProfile ? "Requester" : null,
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
  { key: "REQUESTER", label: "Requesters", tone: "amber" },
  { key: "BUYER", label: "Buyers", tone: "emerald" },
  { key: "RECRUITER", label: "Recruiters", tone: "emeraldDeep" },
  { key: "PROVIDER", label: "Providers", tone: "emeraldSolid" },
  { key: "ADMINISTRATOR", label: "Administrators", tone: "neutral" },
];

/** What `jobsFor` returns, keyed the way `JOB_TILES` and `?job=` spell it. */
const JOB_BY_KEY: Record<string, string> = {
  REQUESTER: "Requester",
  BUYER: "Buyer",
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
