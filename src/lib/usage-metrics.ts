export type AreaKey = "profile" | "learn" | "connect" | "work" | "shop" | "pay";

export type MetricDef = {
  area: AreaKey;
  label: string;
  /** Column D — the plain definition, shown on hover. */
  hint: string;
  /** Column G — full scale. */
  goal: number;
  uncounted?: string;
};

export const AREA_META: Record<AreaKey, { label: string; href: string; go: string }> = {
  profile: { label: "Profile", href: "/profile", go: "Go to Profile" },
  learn: { label: "Learn", href: "/learn", go: "Go to Learn" },
  connect: { label: "Connect", href: "/connect/community", go: "Go to Connect" },
  work: { label: "Work", href: "/find-work", go: "Go to Work" },
  shop: { label: "Shop", href: "/shop", go: "Go to Shop" },
  pay: { label: "Pay", href: "/payments", go: "Go to Payments" },
};

/** The 24 sheet metrics, in sheet order. The Work row here is the BUYER's. */
export const METRICS: MetricDef[] = [
  { area: "profile", label: "Skills Added", hint: "Skills on your profile", goal: 20 },
  { area: "profile", label: "Specializations", hint: "Specializations on your profile", goal: 10 },
  { area: "profile", label: "Certifications", hint: "Certifications on your profile (self-reported + earned)", goal: 5 },
  { area: "profile", label: "Search Score", hint: "Profile score out of 100", goal: 100 },

  { area: "learn", label: "Paths Enrolled", hint: "Learning paths you're enrolled in", goal: 5 },
  { area: "learn", label: "Paths Completed", hint: "Paths where every lesson is done", goal: 3 },
  { area: "learn", label: "Instructors Messaged", hint: "Instructors you've messaged", goal: 5, uncounted: "Messaging is colleague-only, so there is no writer for this" },
  { area: "learn", label: "Paths Created", hint: "Learning paths you created", goal: 3 },

  { area: "connect", label: "Invites Sent", hint: "Invitations to people not yet on Panameer", goal: 10 },
  { area: "connect", label: "Colleagues", hint: "Accepted colleague connections", goal: 25 },
  /* "Check" → YES: `GroupMembership` exists and is written when you join. */
  { area: "connect", label: "Groups Joined", hint: "Groups you belong to", goal: 5 },
  { area: "connect", label: "Total Community", hint: "Colleagues + their colleagues you can reach", goal: 100 },

  { area: "work", label: "Job Postings", hint: "Work requests you posted (as a buyer)", goal: 5 },
  { area: "work", label: "Interviews", hint: "Interviews held", goal: 5 },
  { area: "work", label: "Hires", hint: "Work orders you created by hiring", goal: 5 },
  { area: "work", label: "People Billing", hint: "People currently billing on your orders", goal: 5, uncounted: "Needs an active order with a timesheet or settlement — neither exists yet" },

  { area: "shop", label: "Service Products Posted", hint: "Service products you published", goal: 10 },
  { area: "shop", label: "Offers", hint: "Offers received on your products", goal: 10 },
  /* "Check" → YES: `ServiceProductOffer.status` carries ACCEPTED. */
  { area: "shop", label: "Accepts", hint: "Offers you accepted", goal: 5 },
  /* Sheet says NO: checkout → order line does not exist. */
  { area: "shop", label: "Products Deployed / Billing", hint: "Purchased products now delivering or billing", goal: 5, uncounted: "Needs checkout to create an order line, which is not built" },

  /* "Check" → YES: `SettlementRequest` rows exist and are written on submit. */
  { area: "pay", label: "Settlement Requests", hint: "Settlement requests submitted", goal: 5 },
  { area: "pay", label: "Earnings", hint: "Money paid to you", goal: 10000, uncounted: "A settlement reaches APPROVED and nothing writes PAID" },
  /* "Check" → YES: settlements not yet APPROVED is a real count. */
  { area: "pay", label: "Awaiting Approval", hint: "Settlements waiting on the buyer", goal: 5 },
  /* Sheet says NO: no payout writer. */
  { area: "pay", label: "Paid Out", hint: "Payouts received in your account", goal: 5000, uncounted: "There is no payout writer yet" },
];

export const PROVIDER_WORK: MetricDef[] = [
  { area: "work", label: "Proposals Sent", hint: "Proposals you have sent on work requests", goal: 10 },
  { area: "work", label: "Interviews", hint: "Interviews held", goal: 5 },
  { area: "work", label: "Contracts Won", hint: "Work orders where you are the provider", goal: 5 },
  { area: "work", label: "Active Engagements", hint: "Orders you are currently working", goal: 5, uncounted: "Nothing marks an order as being worked yet" },
];

/** The six rows, with the Work row swapped for a provider. */
export function rowsFor(isProvider: boolean): { area: AreaKey; metrics: MetricDef[] }[] {
  const areas: AreaKey[] = ["profile", "learn", "connect", "work", "shop", "pay"];
  return areas.map((area) => ({
    area,
    metrics:
      area === "work" && isProvider
        ? PROVIDER_WORK
        : METRICS.filter((m) => m.area === area),
  }));
}
