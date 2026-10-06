
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
export type LifecycleStep = { key: string; step: string; status: string; who: LifecycleWho; gate: boolean; desc: string; unlocks?: string; href: string; next: string };

export const LIFECYCLE: LifecycleStep[] = [
  { key: "account", step: "Create Account", status: "Registered", who: "you", gate: false, desc: "One account per email.", href: "/join", next: "create your account" },
  { key: "verify", step: "Verify Account", status: "Verified", who: "you", gate: false, desc: "Click the link sent to your email.", unlocks: "Learn, Connect", href: "/join", next: "verify your account" },
  { key: "profile", step: "Complete Profile", status: "Profiled", who: "you", gate: true, desc: "No empty sections: photo, bio, 3 skills, a specialization, rate, language, location.", unlocks: "being found, posting, proposals", href: "/profile", next: "complete your profile" },
  { key: "link", step: "Link to Company", status: "Linked", who: "you", gate: false, desc: "Join yours by website, or add it — a one-person business is a company too.", href: "/company?join=1#join", next: "link to your company" },
  { key: "validate", step: "Validate Company", status: "Validated", who: "company", gate: true, desc: "Admin adds legal name, tax ID and W-9 (US) or W-8BEN-E (outside US).", unlocks: "signing work orders", href: "/company/legal", next: "validate your company" },
  { key: "contract", step: "Get Contracted", status: "Contracted", who: "both", gate: true, desc: "Two validated companies sign a work order.", href: "/orders", next: "get contracted" },
  { key: "paid", step: "Get Paid", status: "Paid", who: "both", gate: false, desc: "Paid to a bank account in the company's legal name.", href: "/company/legal#payout", next: "get paid" },
];

export const LIFECYCLE_WHO: Record<LifecycleWho, { label: string; bg: string; fg: string }> = {
  you: { label: "You", bg: "#eaf6f0", fg: "#1f8a5b" },
  company: { label: "Your company (admins)", bg: "#efeaf7", fg: "#5a3f8f" },
  both: { label: "Your company + the other company", bg: "#f3f1f7", fg: "#4a4658" },
};

export const LIFECYCLE_RULES = [
  { title: "We pay companies, not people", body: "Panameer doesn't employ people or pay individuals. Every payment goes to a company's bank account in its legal name." },
  { title: "US companies", body: "W-9 with the company's tax ID. Checked against the state registry." },
  { title: "Outside the US", body: "W-8BEN-E on file, as provided by the company. Panameer doesn't verify foreign registrations or file local reporting." },
];

export type LifecycleFacts = { verified: boolean; profiled: boolean; linked: boolean; validated: boolean; contracted: boolean; paid: boolean };

/** done[i] per step; current = first step not done (7 = all done); status = the status after the last done step. */
export function lifecycleStatus(f: LifecycleFacts) {
  const done = [true, f.verified, f.profiled, f.linked, f.validated, f.contracted, f.paid];
  const first = done.findIndex((d) => !d);
  const current = first === -1 ? 7 : first;
  return { done, current, status: LIFECYCLE[current - 1].status };
}
