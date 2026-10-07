import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { countryName } from "@/lib/country";
import { formatPlace } from "@/lib/location";
import { companyChecklist } from "@/lib/your-path";

// Connect › Connections filters (2026-10-06): everything server-side, over the viewer's own connections only.
import { CHIPS, LABELS, parseFilters, filtersToQuery, type ConnFilters } from "@/lib/connections-query";
export { CHIPS, LABELS, parseFilters, filtersToQuery, type ConnFilters };

type Person = {
  userId: string;
  personId: string;
  connectionId: string;
  connectedAt: Date;
  name: string;
  title: string | null;
  company: string | null;
  companyId: string | null;
  photoUrl: string | null;
  buySide: boolean;
  location: string | null;
  profileHref: string | null;
  rel: Set<string>;
  how: Set<string>;
  employers: string[];
  skillIds: Set<string>;
  skillNames: Map<string, string>;
  keywords: string[];
  roles: Set<string>;
  modes: Set<string>;
  rate: number | null;
  trust: Set<string>;
  act: Set<string>;
};

const ROLE_KEYS: Record<string, string> = { APPLICATION_SPECIFIC: "func", TECHNOLOGY_SPECIFIC: "tech", PROJECT_SPECIFIC: "pm" };
const DAY = 86_400_000;

/** Every person the viewer is connected to (or has a pending invite with), with what each filter needs. */
async function loadPeople(viewer: Viewer): Promise<Person[]> {
  const me = viewer.userId;
  const edges = await prisma.connection.findMany({
    where: { OR: [{ from_user_id: me }, { to_user_id: me }], status: { in: ["ACCEPTED", "PENDING"] } },
    select: { id: true, from_user_id: true, to_user_id: true, kind: true, status: true, created_at: true },
    orderBy: { created_at: "desc" },
  });
  const relOf = new Map<string, { rel: Set<string>; id: string; at: Date }>();
  for (const e of edges) {
    const other = e.from_user_id === me ? e.to_user_id : e.from_user_id;
    const r = relOf.get(other) ?? { rel: new Set<string>(), id: e.id, at: e.created_at };
    if (e.kind === "COLLEAGUE" && e.status === "ACCEPTED") r.rel.add("colleague");
    if (e.kind === "COLLEAGUE" && e.status === "PENDING") r.rel.add(e.to_user_id === me ? "invin" : "invout");
    if (e.kind === "MENTOR" && e.status === "ACCEPTED") r.rel.add(e.from_user_id === me ? "mentor" : "mentee");
    if (r.rel.has("colleague") || r.rel.has("mentor") || r.rel.has("mentee")) r.rel.add("connected");
    relOf.set(other, r);
  }
  const ids = [...relOf.keys()];
  if (!ids.length) return [];
  const [people, mine] = await Promise.all([
    prisma.person.findMany({
      where: { user: { is: { id: { in: ids }, is_active: true, is_test: false } } },
      select: {
        id: true, first_name: true, last_name: true, title: true, photo_url: true, is_service_buyer: true, is_service_provider: true, created_at: true,
        company: { select: { id: true, name: true, show_on_profiles: true } },
        companyMemberships: { where: { status: "APPROVED" }, select: { company_id: true }, take: 1 },
        site: { select: { addresses: { select: { city: true, state: true, country: true, country_code: true }, take: 1 } } },
        user: { select: { id: true, last_login: true } },
        providerProfile: {
          select: {
            id: true, completeness: true, coordinator_person_id: true, onsite_rate_cents: true, remote_rate_cents: true, hourly_rate_cents: true, rate_min_cents: true,
            skills: { select: { skill_id: true, skill: { select: { name: true } } } },
            keywords: true,
            employers: { select: { name: true } },
            roles: { select: { roleType: { select: { code: true } } } },
          },
        },
      },
    }),
    prisma.person.findUnique({
      where: { user_id: me },
      select: { id: true, companyMemberships: { where: { status: "APPROVED" }, select: { company_id: true }, take: 1 }, providerProfile: { select: { coordinator_person_id: true } } },
    }),
  ]);
  const personIds = people.map((p) => p.id);
  const companyIds = [...new Set(people.map((p) => p.companyMemberships[0]?.company_id).filter((x): x is string => !!x))];
  const [orders, enrol, creds, msgs, validated] = await Promise.all([
    prisma.workOrder.findMany({
      where: { OR: [{ provider_person_id: { in: personIds } }, { buyer_person_id: { in: personIds } }], status: { not: "CANCELLED" } },
      select: { buyer_person_id: true, provider_person_id: true, status: true },
    }),
    prisma.learnEnrollment.findMany({ where: { user_id: { in: [me, ...ids] } }, select: { user_id: true, learning_path_id: true } }),
    prisma.certification.findMany({ where: { user_id: { in: ids }, learning_path_id: { not: null } }, select: { user_id: true } }),
    prisma.message.findMany({ where: { OR: [{ from_user_id: me, to_user_id: { in: ids } }, { to_user_id: me, from_user_id: { in: ids } }] }, select: { from_user_id: true, to_user_id: true, created_at: true }, orderBy: { created_at: "desc" } }),
    Promise.all(companyIds.map(async (id) => [id, !!(await companyChecklist(id))?.ready] as const)),
  ]);
  const okCompany = new Map(validated);
  const myPaths = new Set(enrol.filter((e) => e.user_id === me).map((e) => e.learning_path_id));
  const lastMsg = new Map<string, Date>();
  for (const m of msgs) {
    const other = m.from_user_id === me ? m.to_user_id : m.from_user_id;
    if (!lastMsg.has(other)) lastMsg.set(other, m.created_at);
  }
  const myCompany = mine?.companyMemberships[0]?.company_id ?? null;
  const now = new Date().getTime();
  const out: Person[] = [];
  for (const p of people) {
    const uid = p.user!.id;
    const r = relOf.get(uid)!;
    const pp = p.providerProfile;
    const how = new Set<string>();
    if (mine && orders.some((o) => (o.buyer_person_id === mine.id && o.provider_person_id === p.id) || (o.provider_person_id === mine.id && o.buyer_person_id === p.id))) how.add("worked");
    if (myCompany && p.companyMemberships[0]?.company_id === myCompany) how.add("samecompany");
    if (enrol.some((e) => e.user_id === uid && myPaths.has(e.learning_path_id))) how.add("course");
    const myCoord = mine?.providerProfile?.coordinator_person_id ?? null;
    if (mine && pp && ((pp.coordinator_person_id && (pp.coordinator_person_id === myCoord || pp.coordinator_person_id === mine.id)) || myCoord === p.id)) how.add("team");
    const roles = new Set((pp?.roles ?? []).map((x) => ROLE_KEYS[x.roleType.code]).filter(Boolean));
    if (roles.has("func") && roles.has("tech")) roles.add("techfunc");
    const modes = new Set<string>();
    if (pp?.onsite_rate_cents != null) modes.add("onsite");
    if (pp?.remote_rate_cents != null) modes.add("remote");
    if (modes.has("onsite") && modes.has("remote")) modes.add("hybrid");
    const rates = [pp?.onsite_rate_cents, pp?.remote_rate_cents, pp?.hourly_rate_cents, pp?.rate_min_cents].filter((x): x is number => x != null);
    const trust = new Set<string>();
    if (p.companyMemberships[0] && okCompany.get(p.companyMemberships[0].company_id)) trust.add("verified");
    if ((pp?.completeness ?? 0) >= 70) trust.add("score70");
    if (creds.some((c) => c.user_id === uid)) trust.add("creds");
    if (orders.some((o) => (o.provider_person_id === p.id || o.buyer_person_id === p.id) && o.status === "CLOSED")) trust.add("work");
    const act = new Set<string>();
    if (p.user?.last_login && now - p.user.last_login.getTime() < 7 * DAY) act.add("week");
    if (now - p.created_at.getTime() < 30 * DAY) act.add("month");
    const lm = lastMsg.get(uid);
    if (!lm || now - lm.getTime() > 90 * DAY) act.add("quiet");
    const a = p.site?.addresses[0];
    out.push({
      userId: uid,
      personId: p.id,
      connectionId: r.id,
      connectedAt: r.at,
      name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "(unnamed)",
      title: p.title,
      company: p.company?.show_on_profiles ? p.company.name : null,
      companyId: p.company?.show_on_profiles ? p.company.id : null,
      photoUrl: p.photo_url,
      buySide: p.is_service_buyer && !p.is_service_provider,
      location: formatPlace(a?.city, countryName(a?.country_code, a?.country)) || [a?.city, a?.state, a?.country].filter(Boolean).join(", ") || null,
      profileHref: pp ? `/providers/${pp.id}` : null,
      rel: r.rel,
      how,
      employers: (pp?.employers ?? []).map((e) => e.name ?? "").filter(Boolean),
      skillIds: new Set((pp?.skills ?? []).map((s) => s.skill_id)),
      skillNames: new Map((pp?.skills ?? []).map((s) => [s.skill_id, s.skill.name])),
      keywords: pp?.keywords ?? [],
      roles,
      modes,
      rate: rates.length ? Math.min(...rates) / 100 : null,
      trust,
      act,
    });
  }
  return out;
}

const chipMatch = (p: Person, chip: string) =>
  chip === "invites" ? p.rel.has("invin") || p.rel.has("invout")
  : chip === "colleagues" ? p.rel.has("colleague")
  : chip === "mentors" ? p.rel.has("mentor")
  : chip === "mentees" ? p.rel.has("mentee")
  : chip === "worked" ? p.rel.has("connected") && p.how.has("worked")
  : chip === "samecompany" ? p.rel.has("connected") && p.how.has("samecompany")
  : chip === "learn" ? p.rel.has("connected") && p.how.has("course")
  : p.rel.has("connected");

function panelMatch(p: Person, f: ConnFilters) {
  const lc = (s: string) => s.toLowerCase();
  if (f.q) {
    const n = lc(f.q);
    if (![p.name, p.title ?? "", p.company ?? "", ...p.skillNames.values(), ...p.keywords].some((x) => lc(x).includes(n))) return false;
  }
  if (f.rel.length && !f.rel.some((r) => p.rel.has(r))) return false;
  if (f.how.length && !f.how.some((h) => p.how.has(h))) return false;
  if (f.pastco && !p.employers.some((e) => lc(e).includes(lc(f.pastco)))) return false;
  if (f.skills.length && !f.skills.some((s) => p.skillIds.has(s))) return false;
  if (f.roles.length && !f.roles.some((r) => p.roles.has(r))) return false;
  if (f.modes.length && !f.modes.some((m) => p.modes.has(m))) return false;
  if ((f.rmin != null || f.rmax != null) && (p.rate == null || (f.rmin != null && p.rate < f.rmin) || (f.rmax != null && p.rate > f.rmax))) return false;
  if (f.loc && !lc(p.location ?? "").includes(lc(f.loc))) return false;
  if (f.trust.some((t) => !p.trust.has(t))) return false;
  if (f.act.some((a) => !p.act.has(a))) return false;
  return true;
}

/** Why this person is in the list: relationship, how you know them, the skill that matched. */
function why(p: Person, f: ConnFilters) {
  const tags = (["colleague", "mentor", "mentee", "invin", "invout"] as const).filter((r) => p.rel.has(r)).map((r) => ({ colleague: "Colleague", mentor: "Your mentor", mentee: "You mentor them", invin: "Invited you", invout: "You invited" })[r]);
  const how =
    p.how.has("worked") ? "Worked together"
    : p.how.has("samecompany") ? "Same company now"
    : f.pastco && p.employers.find((e) => e.toLowerCase().includes(f.pastco.toLowerCase())) ? `Past company: ${p.employers.find((e) => e.toLowerCase().includes(f.pastco.toLowerCase()))}`
    : p.how.has("course") ? "From Learn · same course"
    : p.how.has("team") ? "Same team"
    : `Connected ${p.connectedAt.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
  const skill = f.skills.map((s) => p.skillNames.get(s)).find(Boolean) ?? (f.q ? [...p.skillNames.values()].find((n) => n.toLowerCase().includes(f.q.toLowerCase())) : undefined);
  return { tags, how, skill: skill ?? null };
}

export async function connectionsView(viewer: Viewer, f: ConnFilters, savedQueries: string[] = []) {
  const all = await loadPeople(viewer);
  const panel = all.filter((p) => panelMatch(p, f));
  const chipCounts = Object.fromEntries(CHIPS.map((c) => [c.key, panel.filter((p) => chipMatch(p, c.key)).length])) as Record<string, number>;
  const invites = { in: panel.filter((p) => p.rel.has("invin")).length, out: panel.filter((p) => p.rel.has("invout")).length };
  // A Relationship filter for invites widens the base past "connected".
  const rows = panel
    .filter((p) => (f.rel.some((r) => r === "invin" || r === "invout") && f.chip === "all" ? true : chipMatch(p, f.chip)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((p) => ({ ...p, why: why(p, f) }));
  const savedCounts = savedQueries.map((q) => {
    const sf = parseFilters(Object.fromEntries(new URLSearchParams(q)));
    return all.filter((p) => panelMatch(p, sf) && (sf.rel.some((r) => r === "invin" || r === "invout") && sf.chip === "all" ? true : chipMatch(p, sf.chip))).length;
  });
  return { rows, chipCounts, invites, total: all.filter((p) => p.rel.has("connected")).length, savedCounts };
}

/** Applied filters as removable chips (label + the query without it). */
export function appliedChips(f: ConnFilters, skillName: (id: string) => string | undefined) {
  const out: { label: string; query: string }[] = [];
  const without = (patch: Partial<ConnFilters>) => filtersToQuery({ ...f, ...patch });
  if (f.chip !== "all") out.push({ label: CHIPS.find((c) => c.key === f.chip)?.label ?? f.chip, query: without({ chip: "all" }) });
  for (const k of ["rel", "how", "roles", "modes", "trust", "act"] as const)
    for (const v of f[k]) out.push({ label: LABELS[v] ?? v, query: without({ [k]: f[k].filter((x) => x !== v) }) });
  for (const s of f.skills) out.push({ label: skillName(s) ?? "Skill", query: without({ skills: f.skills.filter((x) => x !== s) }) });
  if (f.pastco) out.push({ label: `Past company: ${f.pastco}`, query: without({ pastco: "" }) });
  if (f.loc) out.push({ label: `Location: ${f.loc}`, query: without({ loc: "" }) });
  if (f.rmin != null || f.rmax != null) out.push({ label: `Rate $${f.rmin ?? 0}–${f.rmax ?? "∞"}/hr`, query: without({ rmin: null, rmax: null }) });
  if (f.q) out.push({ label: `"${f.q}"`, query: without({ q: "" }) });
  return out;
}
