
/** The lifecycle, in order. The index IS the progression. */
export const USER_LEVELS = ["Registered", "Verified", "User", "Company", "Payee"] as const;
export type UserLevel = (typeof USER_LEVELS)[number];

export const LEVEL_TILES: {
  label: string;
  level: UserLevel | "TOTAL";
  hint: string;
  tone: "neutral" | "amber" | "emerald" | "emeraldDeep" | "emeraldSolid";
}[] = [
  { label: "Total Users", level: "TOTAL", hint: "Accounts on the board", tone: "neutral" },
  { label: "Verified Users", level: "Verified", hint: "Email confirmed", tone: "amber" },
  { label: "L1 Users (Profiles)", level: "User", hint: "Can learn, connect, search, post", tone: "emerald" },
  { label: "L2 Users (Companies)", level: "Company", hint: "Company details on file", tone: "emeraldDeep" },
  { label: "L3 Users (Payees)", level: "Payee", hint: "Can be paid", tone: "emeraldSolid" },
];

export type LevelSubject = {
  firstName: string | null | undefined;
  lastName: string | null | undefined;
  emailVerified: Date | null | undefined;
  tosAcceptedAt: Date | null | undefined;
  phone: string | null | undefined;
  title: string | null | undefined;
  /** Owns a RequesterProfile or a ProviderProfile — the Level 1 "profile". */
  hasProfile: boolean;
  companyTaxType: string | null | undefined;
  companyTin: string | null | undefined;
  companyRegisteredAddress: boolean;
  /** Level 3 — any payout method on file. */
  payoutMethodCount: number;
};

const filled = (v: string | null | undefined) => Boolean(v && v.trim());

/** Each level's own requirements, ignoring the ones below it. */
const MEETS: Record<Exclude<UserLevel, "Registered">, (s: LevelSubject) => boolean> = {
  Verified: (s) => s.emailVerified != null,
  User: (s) =>
    filled(s.firstName) &&
    filled(s.lastName) &&
    filled(s.phone) &&
    filled(s.title) &&
    s.hasProfile &&
    s.tosAcceptedAt != null,
  Company: (s) =>
    filled(s.companyTaxType) && filled(s.companyTin) && s.companyRegisteredAddress,
  Payee: (s) => s.payoutMethodCount > 0,
};

export function levelFor(s: LevelSubject): UserLevel {
  let reached: UserLevel = "Registered";
  for (const level of ["Verified", "User", "Company", "Payee"] as const) {
    if (!MEETS[level](s)) break;
    reached = level;
  }
  return reached;
}

/** Has this person reached `level` (or further)? */
export function hasReached(s: LevelSubject, level: UserLevel): boolean {
  return USER_LEVELS.indexOf(levelFor(s)) >= USER_LEVELS.indexOf(level);
}

export function levelCounts(subjects: LevelSubject[]): Record<string, number> {
  const counts: Record<string, number> = { TOTAL: subjects.length };
  for (const level of ["Verified", "User", "Company", "Payee"] as const) {
    counts[level] = subjects.filter((s) => hasReached(s, level)).length;
  }
  return counts;
}

export function blockingFor(s: LevelSubject): string[] {
  const reached = levelFor(s);
  const next = USER_LEVELS[USER_LEVELS.indexOf(reached) + 1];
  if (!next || next === "Registered") return [];
  const gaps: string[] = [];
  if (next === "Verified" && s.emailVerified == null) gaps.push("email not verified");
  if (next === "User") {
    if (!filled(s.firstName) || !filled(s.lastName)) gaps.push("name");
    if (!filled(s.phone)) gaps.push("phone");
    if (!filled(s.title)) gaps.push("job title");
    if (!s.hasProfile) gaps.push("profile");
    if (s.tosAcceptedAt == null) gaps.push("terms not accepted");
  }
  if (next === "Company") {
    if (!filled(s.companyTaxType)) gaps.push("tax type");
    if (!filled(s.companyTin)) gaps.push("tax id");
    if (!s.companyRegisteredAddress) gaps.push("registered address");
  }
  if (next === "Payee") gaps.push("no payout method");
  return gaps;
}

/** R2-E003: five boxes, each person counted where they are now (levelFor), so the boxes sum to the total. */
export const PROGRESSION: { level: UserLevel; label: string; hint: string }[] = [
  { level: "Registered", label: "Waiting to Verify", hint: "Signed up, email not confirmed" },
  { level: "Verified", label: "Verified · No Profile", hint: "Email confirmed, profile not built" },
  { level: "User", label: "Profile · No Company", hint: "Profile live, no company yet" },
  { level: "Company", label: "Company · Not Payee", hint: "Company set, payout not ready" },
  { level: "Payee", label: "Ready to Be Paid", hint: "Payee: can sell and get paid" },
];

export function currentCounts(subjects: LevelSubject[]): Record<UserLevel, number> {
  const out = Object.fromEntries(USER_LEVELS.map((l) => [l, 0])) as Record<UserLevel, number>;
  for (const s of subjects) out[levelFor(s)]++;
  return out;
}

/** Share of people at or past step i who got past it (all time); null when nobody reached step i. */
export function passRate(subjects: LevelSubject[], i: number): number | null {
  const at = subjects.filter((s) => hasReached(s, USER_LEVELS[i])).length;
  if (!at || i + 1 >= USER_LEVELS.length) return null;
  return Math.round((subjects.filter((s) => hasReached(s, USER_LEVELS[i + 1])).length / at) * 100);
}

// ── Lifecycle (2026-10-06): 7 steps, 7 statuses, same for buyers and sellers. The one definition.
export type LifecycleWho = "you" | "company" | "both";
export type RoadPhase = "join" | "win" | "paid";
export type LifecycleStep = { key: string; phase?: RoadPhase; step: string; status: string; who: LifecycleWho; gate: boolean; admin?: boolean; desc: string; unlocks?: string; href: string; next: string; time?: string; lockBefore?: string; /** Scott 10-15: hand-split three-line road label when the word split reads badly. */ lines?: [string, string, string] };

export const LIFECYCLE: LifecycleStep[] = [
  { key: "account", step: "Create Your Account", status: "Registered", who: "you", gate: false, desc: "One account per email.", href: "/join", next: "Create Your Account" },
  { key: "verify", step: "Verify Account", status: "Verified", who: "you", gate: false, desc: "Click the link sent to your email.", unlocks: "Learn, Connect", href: "/join", next: "Verify Your Account" },
  { key: "profile", step: "Complete Your Profile", status: "Profiled", who: "you", gate: true, desc: "No empty sections: photo, bio, 3 skills, a specialization, rate, language, location.", unlocks: "being found, posting, responses", href: "/profile", next: "Complete Your Profile" },
  { key: "link", step: "Add Company", status: "Linked", who: "you", gate: false, desc: "Add your company, or join it by website — a one-person business is a company too.", href: "/company?join=1#join", next: "Add Your Company" },
  { key: "validate", step: "Validate Company", status: "Validated", who: "company", gate: true, desc: "Admin adds legal name, tax ID and W-9 (US) or W-8BEN-E (outside US).", unlocks: "signing orders", href: "/company/legal", next: "Validate Your Company" },
  { key: "contract", step: "Get Contracted", status: "Contracted", who: "both", gate: true, desc: "Two validated companies sign an order.", href: "/orders", next: "Get Contracted" },
  { key: "paid", step: "Get Paid", status: "Paid", who: "both", gate: false, desc: "Paid to a bank account in the company's legal name.", href: "/company/legal#payout", next: "Get Paid" },
];

// Provider road v6 (RV-E001, 2026-10-13): 8 stops in three phases; payout details are a gate before Get Paid ("if required").
export const ROAD_TITLE = "From Creating Your Account to Getting Paid";
export const PROVIDER_ROAD: LifecycleStep[] = [
  { key: "register", phase: "join", step: "Create Your Account", status: "Registered", who: "you", gate: false, desc: "You and your company, in one go. A one-person business is a company too.", href: "/company?join=1#join", next: "Create Your Account", time: "about 3 min · you + your company" },
  { key: "verify", phase: "join", step: "Verify Your Email", status: "Verified", who: "you", gate: false, desc: "Click the link sent to your email.", unlocks: "Learn, Connect", href: "/join", next: "Validate Your Email", time: "1 min" },
  // Scott 10-16: Register swallows the profile — you, your company and its locations. Done when registration is finished.
  { key: "profile", phase: "join", step: "Complete Your Profile", status: "Profiled", who: "you", gate: false, desc: "You, your company and its locations. Done when you finish registering; people can see you and connect.", unlocks: "Connect, Learn", href: "/profile", next: "Complete Your Profile", time: "about 3 min" },
  // Scott 10-16: what you sell — résumé and skills (so buyers find you), rates, products — ends with Go Live.
  { key: "list", phase: "join", step: "Create What You Sell", status: "Live", who: "you", gate: true, desc: "Your résumé and skills so buyers can find you, your rates and your products. Ends with Enable Catalog.", unlocks: "being found, responses, selling", href: "/catalog/create", next: "Create What You Sell", time: "about 10 min" },
  { key: "sell", phase: "win", step: "Sell Products & Services", status: "Contracted", who: "both", gate: false, desc: "Win work three ways: a product bought, your rate accepted, or an estimate accepted. Each ends in a signed order.", href: "/orders", next: "Sell Services & Products", time: "signed order" },
  { key: "deliver", phase: "win", step: "Deliver Products & Services", status: "Delivered", who: "both", gate: false, desc: "Work the signed order: tracker updates, then the buyer accepts the deliverable or the timesheet.", href: "/orders", next: "Deliver the Work", time: "per order" },
  { key: "request", phase: "paid", step: "Request Your Payment", status: "Requested", who: "you", gate: false, desc: "Send a payment request against accepted work — a timesheet, a milestone…", href: "/orders", next: "Request Payment", time: "5 min each" },
  { key: "paid", phase: "paid", step: "Receive Your Payment", status: "Paid", who: "both", gate: false, lockBefore: "if required", desc: "Paid to the company's account in its legal name. Before the first payout: a payout account, plus a tax form where your country needs one.", href: "/company/legal#payout", next: "Get Paid", time: "automatic" },
];

// BD-E005 (2026-10-15): the buyer road — 6 stops, same graphic as the provider road.
export const BUYER_ROAD_TITLE = "From Signing Up to Getting the Work Done";
export const BUYER_ROAD: LifecycleStep[] = [
  { key: "account", phase: "join", step: "Create Your Account", status: "Registered", who: "you", gate: false, desc: "You, your company and its addresses, in one go.", href: "/profile", next: "Create Your Account", time: "about 3 min" },
  { key: "link", phase: "join", step: "Add Your Company", status: "Linked", who: "you", gate: false, desc: "Add your company, or ask to join it if it's already here. Its admin approves you.", href: "/company?join=1#join", next: "Add Your Company", time: "1 min" },
  { key: "find", phase: "win", lines: ["Post", "a Job", "or Shop"], step: "Post a Job or Shop", status: "Sourcing", who: "you", gate: false, desc: "Post a job and ask who is available, shop products and rates, or ask a provider for an estimate.", href: "/hire", next: "Post a Job or Shop", time: "minutes" },
  { key: "order", phase: "win", lines: ["Hire", "Your", "Provider"], step: "Hire Your Provider", status: "Filled", who: "both", gate: false, desc: "Hire from a job's responses or submit your request: one order per provider. Ordering needs your company's legal name, billing address and invoice email.", href: "/hire", next: "Hire Your Provider", time: "5 min" },
  { key: "approve", phase: "win", step: "Approve the Delivery", status: "Approved", who: "you", gate: false, desc: "Accept the deliverable, or approve the timesheet for time-based work.", href: "/orders", next: "Approve the Delivery", time: "per order" },
  { key: "pay", phase: "paid", step: "Pay the Invoice", status: "Paid", who: "company", gate: false, desc: "Pay the payment request. Panameer pays the provider's company.", href: "/pay", next: "Pay the Invoice", time: "automatic" },
];

/** Scott 10-15: the buyer road names its phases from the buyer's side (the provider's say "Get Found" / "Get Paid"). */
export const BUYER_PHASE_LABELS: Record<RoadPhase, string> = { join: "Set Up", win: "Find & Order", paid: "Approve & Pay" };

/** The road's three phases — each its own color on the road, rings, label and band. */
export const ROAD_PHASES: Record<RoadPhase, { label: string; color: string; band: string; track: string }> = {
  join: { label: "Join & Get Found", color: "#5C6485", band: "#F6F7FB", track: "#E2E5EF" },
  win: { label: "Win & Do the Work", color: "#C93BD0", band: "#FDF5FD", track: "#F5DDF5" },
  paid: { label: "Get Paid", color: "#6B2F9A", band: "#F8F4FC", track: "#E9DFF3" },
};

/** Graphic labels are short and split on " & " ("Add Services" / "& Products"). */
/** Scott 10-13: every road label is three lines — verb / middle / noun ("Add / Products & / Services"). */
export const roadLabelThree = (step: string): [string, string, string] => {
  const w = step.split(" ");
  return [w[0], w.slice(1, -1).join(" "), w[w.length - 1]];
};
export const roadLabelLines = (step: string): [string, string] => {
  const i = step.indexOf(" & ");
  return i > 0 ? [step.slice(0, i), step.slice(i + 1)] : [step, ""];
};

/** Stop 5's three lanes; each ends in "Work Order Signed". */
export const ROAD_LANES: { id: string; name: string; steps: string[] }[] = [
  { id: "5.A", name: "Product Bought", steps: ["Product Located", "Added to Cart", "Order Placed"] },
  { id: "5.B", name: "Rate Accepted", steps: ["Provider Invited", "Available", "Rate Accepted"] },
  { id: "5.C", name: "Estimate Accepted", steps: ["Estimate Requested", "Provider Estimates", "Estimate Accepted"] },
];

export const LIFECYCLE_WHO: Record<LifecycleWho, { label: string; bg: string; fg: string }> = {
  // Brand neutrals (Panameer brand guide): sunken / borders / canvas.
  you: { label: "You", bg: "#E8EAF1", fg: "#3A4166" },
  company: { label: "Your company (admins)", bg: "#C9CDDC", fg: "#272334" },
  both: { label: "Your company + the other company", bg: "#F7F7F5", fg: "#5C6485" },
};

export const LIFECYCLE_RULES = [
  { title: "We pay companies, not people", body: "Panameer doesn't employ people or pay individuals. Every payment goes to a company's bank account in its legal name." },
  { title: "US companies", body: "W-9 with the company's tax ID. Checked against the state registry." },
  { title: "Outside the US", body: "W-8BEN-E on file, as provided by the company. Panameer doesn't verify foreign registrations or file local reporting." },
];

/** One fact per step key (account is always done; the provider's register = a linked company); a road's steps read only their own keys. */
export type LifecycleFacts = Partial<Record<"register" | "verify" | "profile" | "link" | "list" | "validate" | "contract" | "sell" | "deliver" | "request" | "paid" | "find" | "order" | "approve" | "pay", boolean>>;

/** done[i] per step; current = first step not done (steps.length = all done); status = the status after the last done step. */
export function lifecycleStatus(f: LifecycleFacts, road: LifecycleStep[] = LIFECYCLE) {
  const done = road.map((s) => s.key === "account" || !!f[s.key as keyof LifecycleFacts]);
  const first = done.findIndex((d) => !d);
  const current = first === -1 ? road.length : first;
  // A provider with an account but no company is still before stop 1 (Register needs the company).
  return { done, current, status: current > 0 ? road[current - 1].status : "Signed Up" };
}
