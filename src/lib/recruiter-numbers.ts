import { prisma } from "@/lib/prisma";

// MR-E003: the two numbers recruiters ask for — Oracle Cloud years and full Implementations.
// The provider's own numbers win; else derived from projects on Oracle Cloud (own suite or the employer's).
export type RecruiterNumbers = { years: number | null; yearsDerived: boolean; implementations: number | null; implementationsDerived: boolean };
const SUITE = "ORACLE_FUSION_CLOUD" as const;
const YEAR = 365.25 * 86_400_000;

/** Merged span of intervals in years (overlaps counted once). */
function spanYears(ranges: [number, number][]): number {
  const sorted = ranges.filter(([a, b]) => b > a).sort((x, y) => x[0] - y[0]);
  let total = 0, cur: [number, number] | null = null;
  for (const r of sorted) {
    if (cur && r[0] <= cur[1]) cur[1] = Math.max(cur[1], r[1]);
    else { if (cur) total += cur[1] - cur[0]; cur = [r[0], r[1]]; }
  }
  if (cur) total += cur[1] - cur[0];
  return Math.floor(total / YEAR);
}

export async function recruiterNumbers(profileIds: string[]): Promise<Map<string, RecruiterNumbers>> {
  const ids = [...new Set(profileIds)];
  if (!ids.length) return new Map();
  const [profiles, employers, projects] = await Promise.all([
    prisma.providerProfile.findMany({ where: { id: { in: ids } }, select: { id: true, oracle_cloud_years: true, implementations_count: true } }),
    prisma.employer.findMany({ where: { provider_profile_id: { in: ids } }, select: { id: true, provider_profile_id: true, software_suite: true, start_date: true, end_date: true, is_current: true } }),
    prisma.project.findMany({ where: { provider_profile_id: { in: ids } }, select: { provider_profile_id: true, software_suite: true, employer_id: true, start_date: true, end_date: true, is_current: true } }),
  ]);
  const suiteOf = new Map(employers.map((e) => [e.id, e.software_suite]));
  const now = Date.now();
  const range = (r: { start_date: Date | null; end_date: Date | null; is_current: boolean }): [number, number] | null =>
    r.start_date ? [r.start_date.getTime(), r.end_date?.getTime() ?? (r.is_current ? now : r.start_date.getTime())] : null;
  const out = new Map<string, RecruiterNumbers>();
  for (const p of profiles) {
    const oc = projects.filter((x) => x.provider_profile_id === p.id && (x.software_suite ?? (x.employer_id ? suiteOf.get(x.employer_id) : null)) === SUITE);
    // No Oracle Cloud projects listed → the Oracle Cloud employers' spans stand in for years.
    const spans = (oc.length ? oc : employers.filter((e) => e.provider_profile_id === p.id && e.software_suite === SUITE)).map(range).filter((r): r is [number, number] => !!r);
    const derivedYears = spans.length ? spanYears(spans) : 0;
    out.set(p.id, {
      years: p.oracle_cloud_years ?? (derivedYears || null), yearsDerived: p.oracle_cloud_years == null,
      implementations: p.implementations_count ?? (oc.length || null), implementationsDerived: p.implementations_count == null,
    });
  }
  return out;
}

export const yearsBadge = (n: RecruiterNumbers | undefined) => (n?.years ? `${n.yearsDerived ? "≈" : ""}${n.years} yrs Oracle Cloud` : null);
export const implementationsBadge = (n: RecruiterNumbers | undefined) => (n?.implementations ? `${n.implementationsDerived ? "≈" : ""}${n.implementations} Implementation${n.implementations === 1 ? "" : "s"}` : null);

// MR-E002: credential badges on a match row — Panameer Certified (green), Oracle Cloud certifications, years, implementations.
export type MatchBadge = { label: string; certified?: boolean; title?: string };
const isOracleCloud = (name: string) => /oracle/i.test(name) && /cloud|fusion|\boci\b/i.test(name);

export async function matchBadges(rows: { profileId: string; personId: string; certifications: string[] }[], numbers: Map<string, RecruiterNumbers>): Promise<Map<string, MatchBadge[]>> {
  const persons = await prisma.person.findMany({ where: { id: { in: rows.map((r) => r.personId) } }, select: { id: true, user_id: true } });
  const userIds = persons.map((p) => p.user_id).filter((u): u is string => !!u);
  const passed = new Set((await prisma.certificationAttempt.findMany({ where: { user_id: { in: userIds }, passed: true, is_preview: false }, distinct: ["user_id"], select: { user_id: true } })).map((a) => a.user_id));
  const userOf = new Map(persons.map((p) => [p.id, p.user_id]));
  return new Map(rows.map((r) => {
    const oc = r.certifications.filter(isOracleCloud).sort((a, b) => a.localeCompare(b));
    const n = numbers.get(r.profileId);
    const out: MatchBadge[] = [];
    if (passed.has(userOf.get(r.personId) ?? "")) out.push({ label: "Panameer Certified", certified: true });
    if (oc.length) out.push({ label: `${oc[0].replace(/^Oracle\s+/i, "Oracle ")}${oc.length > 1 ? ` +${oc.length - 1}` : ""}`, title: oc.join("\n") });
    const y = yearsBadge(n), i = implementationsBadge(n);
    if (y) out.push({ label: y });
    if (i) out.push({ label: i });
    return [r.profileId, out];
  }));
}
