import { prisma } from "@/lib/prisma";
import { externalForPerson, sourceLabel, type ExternalCard } from "@/lib/external-jobs";

// EX-E004: the Panameer Job Agent — What I Want (pre-filled from the profile), Today's Finds (new since the last visit,
// by match strength), the counts for the banner and the Work tile, and the optional morning digest.
export type Want = { skills: string[]; modules: string[]; rateFloorCents: number | null; workTypes: string[]; contractTypes: string[]; countries: string[]; digest: boolean };

export async function wantFor(personId: string): Promise<{ want: Want; lastSeen: Date | null; saved: boolean }> {
  const p = await prisma.jobAgentPref.findUnique({ where: { person_id: personId } });
  if (p) return { want: { skills: p.skills, modules: p.modules, rateFloorCents: p.rate_floor_cents, workTypes: p.work_types, contractTypes: p.contract_types, countries: p.countries, digest: p.digest }, lastSeen: p.last_seen_at, saved: true };
  const pp = await prisma.providerProfile.findUnique({ where: { person_id: personId }, select: { onsite_rate_cents: true, remote_rate_cents: true, skills: { take: 15, select: { skill: { select: { name: true } } } }, specializations: { take: 10, select: { specialization: { select: { name: true } } } } } });
  const rates = [pp?.onsite_rate_cents, pp?.remote_rate_cents].filter((x): x is number => x != null);
  return { want: { skills: pp?.skills.map((s) => s.skill.name) ?? [], modules: pp?.specializations.map((s) => s.specialization.name) ?? [], rateFloorCents: rates.length ? Math.min(...rates) : null, workTypes: [], contractTypes: [], countries: [], digest: false }, lastSeen: null, saved: false };
}

/** Does a job fit What I Want? Work type and country only filter when set; skills/modules raise the match. */
function fits(j: ExternalCard, w: Want) {
  if (w.workTypes.length && j.workType && !w.workTypes.includes(j.workType)) return false;
  if (w.countries.length && j.location && !w.countries.some((c) => j.location!.toLowerCase().includes(c.toLowerCase())) && j.workType !== "Remote") return false;
  return true;
}
const score = (j: ExternalCard, w: Want) => j.matched * 2 + [...w.skills, ...w.modules].filter((k) => k && j.title.toLowerCase().includes(k.toLowerCase())).length;

/** Today's Finds: new since the last visit (or the last 24 h), fitting What I Want, strongest first. */
export async function todaysFinds(personId: string, filters?: import("@/lib/job-filters").JobFilters) {
  const { want, lastSeen } = await wantFor(personId);
  // Everything since the last visit — but never less than today's, so a refresh doesn't empty the list.
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const since = lastSeen && lastSeen < today ? lastSeen : today;
  const all = await externalForPerson(personId);
  // XA-E005: the bar's filters when given (they start from the saved criteria).
  const { applyFilters } = await import("@/lib/job-filters");
  const fresh = all.filter((j) => new Date(j.receivedAt) > since);
  const finds = (filters ? applyFilters(fresh, filters) : fresh.filter((j) => fits(j, want))).sort((a, b) => score(b, want) - score(a, want) || b.receivedAt.localeCompare(a.receivedAt));
  return { finds, want, since };
}

/** The banner and the Work tile: Oracle jobs that came in today, and from how many sites. */
export async function newToday(): Promise<{ n: number; sites: number }> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const rows = await prisma.externalJob.groupBy({ by: ["source"], where: { status: "LISTED", received_at: { gte: start } }, _count: { _all: true } });
  return { n: rows.reduce((t, r) => t + r._count._all, 0), sites: rows.length };
}

export async function markSeen(personId: string) {
  await prisma.jobAgentPref.upsert({ where: { person_id: personId }, create: { person_id: personId, last_seen_at: new Date() }, update: { last_seen_at: new Date() } });
}

export async function saveWant(personId: string, w: Want) {
  const data = { skills: w.skills.slice(0, 40), modules: w.modules.slice(0, 40), rate_floor_cents: w.rateFloorCents, work_types: w.workTypes.filter((x) => ["Remote", "Hybrid", "Onsite"].includes(x)), contract_types: w.contractTypes.filter((x) => ["Contract", "Full-Time"].includes(x)), countries: w.countries.slice(0, 20), digest: w.digest };
  await prisma.jobAgentPref.upsert({ where: { person_id: personId }, create: { person_id: personId, ...data }, update: data });
}

/** Sources: the sites jobs came from (listed now). */
export async function agentSources() {
  return (await prisma.externalJob.groupBy({ by: ["source"], where: { status: "LISTED", expires_at: { gt: new Date() } }, _count: { _all: true } })).map((r) => ({ source: r.source, n: r._count._all })).sort((a, b) => b.n - a.n);
}

/** EX-E004: the Daily Digest — top 5 finds from the last day, only for people who turned it on (off by default). */
export async function runDigest(opts: { dry?: boolean } = {}) {
  const rows = await prisma.jobAgentPref.findMany({ where: { digest: true }, select: { person_id: true } });
  const people = new Map((await prisma.person.findMany({ where: { id: { in: rows.map((r) => r.person_id) } }, select: { id: true, first_name: true, user: { select: { id: true, email: true } } } })).map((p) => [p.id, p]));
  const prefs = rows.map((r) => ({ person_id: r.person_id, person: people.get(r.person_id) }));
  const { sendEmail } = await import("@/lib/resend");
  const { emailShell, greeting, paragraph, primaryButton, escapeHtml } = await import("@/lib/email/shell");
  const app = (process.env.NEXT_PUBLIC_APP_URL ?? "https://app.panameer.com").replace(/\/$/, "");
  let sent = 0;
  for (const p of prefs) {
    const to = p.person?.user?.email;
    if (!to) continue;
    const { want } = await wantFor(p.person_id);
    const day = new Date(Date.now() - 86_400_000);
    const top = (await externalForPerson(p.person_id)).filter((j) => new Date(j.receivedAt) > day && fits(j, want)).sort((a, b) => score(b, want) - score(a, want)).slice(0, 5);
    if (!top.length) continue;
    sent++;
    if (opts.dry) continue;
    const list = top.map((j) => `<p style="margin:0 0 12px"><a href="${app}/work/external/${j.id}"><b>${escapeHtml(j.title)}</b></a><br><span style="color:#5C6485">${escapeHtml([sourceLabel(j.source), j.company, j.workType ?? j.location, j.salary].filter(Boolean).join(" · "))}</span></p>`).join("");
    await sendEmail({ to, subject: `Your Job Agent: ${top.length} new Oracle job${top.length === 1 ? "" : "s"}`, template: "job-agent-digest", category: "work_request.matched", userId: p.person?.user?.id,
      html: emailShell({ bodyHtml: greeting(p.person?.first_name ?? "") + paragraph("Your top finds since yesterday:") + list + primaryButton(`${app}/work/job-agent`, "See Today's Finds") }),
      text: top.map((j) => `${j.title} — ${app}/work/external/${j.id}`).join("\n") }).catch(() => null);
  }
  return { people: prefs.length, sent };
}
