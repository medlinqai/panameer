
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

// ── Your Path (2026-10-06): six steps, unverified to paid. The one definition; menu, page, admin and gate use it.
export type PathRole = "provider" | "buyer";
export type PathKey = "verify" | "profile" | "company" | "verified" | "work" | "done";
export type PathStep = { key: PathKey; title: string; short: string; desc: string; unlocks: string; href: string; next: string; locked?: boolean };

const BASE: PathStep[] = [
  { key: "verify", title: "Verify Email", short: "Verify", desc: "Click the link we sent.", unlocks: "your account", href: "/join", next: "verify your email" },
  { key: "profile", title: "Build Your Profile", short: "Profile", desc: "Résumé, skills, rate.", unlocks: "Learn, Connect, being found", href: "/profile", next: "build your profile" },
  { key: "company", title: "Join or Add Your Company", short: "Company", desc: "Who pays you: your business or your employer.", unlocks: "sending proposals, listing services", href: "/company?join=1#join", next: "join or add your company" },
];
export const PATH_STEPS: Record<PathRole, PathStep[]> = {
  provider: [
    ...BASE,
    { key: "verified", title: "Get Verified", short: "Get Verified", desc: "Legal name, state, tax ID. Admins only.", unlocks: "signing work orders", href: "/company/legal", next: "get your company verified", locked: true },
    { key: "work", title: "Win & Sign Work", short: "Win & Sign", desc: "A buyer awards you; both sides sign the work order.", unlocks: "doing paid work", href: "/find-work", next: "win and sign your first work order" },
    { key: "done", title: "Get Paid", short: "Get Paid", desc: "Add a payout account. Money waits until it's there.", unlocks: "payouts", href: "/company/legal#payout", next: "add a payout account" },
  ],
  buyer: [
    { ...BASE[0] },
    { ...BASE[1], desc: "Who you are and what you buy.", unlocks: "Learn, Connect, posting work" },
    { ...BASE[2], desc: "The company you buy for.", unlocks: "posting work requests" },
    { key: "verified", title: "Get Verified", short: "Get Verified", desc: "Legal name, state, tax ID and a billing method. Admins only.", unlocks: "signing work orders", href: "/company/legal", next: "get your company verified", locked: true },
    { key: "work", title: "Post Work", short: "Post Work", desc: "Post a work request; providers send proposals.", unlocks: "proposals from providers", href: "/create-work", next: "post your first work request" },
    { key: "done", title: "Award & Sign", short: "Award & Sign", desc: "Pick a proposal; both sides sign the work order.", unlocks: "work starting", href: "/orders", next: "award and sign your first work order" },
  ],
};

export type PathFacts = { emailVerified: boolean; profileDone: boolean; inCompany: boolean; companyVerified: boolean; work: boolean; done: boolean };

/** Which steps are done, and the first one that isn't ("You are here"; 6 = all done). */
export function pathStatus(f: PathFacts) {
  const done = [f.emailVerified, f.profileDone, f.inCompany, f.companyVerified, f.work, f.done];
  const current = done.findIndex((d) => !d);
  return { done, current: current === -1 ? 6 : current };
}
