import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// XA-E003: recruiter contacts on an external job — each with its own tracked link /r/{token}.
export async function addContact(jobId: string, input: { name?: string | null; linkedinUrl?: string | null; email?: string | null; source?: "CLIPPER" | "MANUAL" }) {
  const name = input.name?.trim().slice(0, 120) || null;
  const linkedin = input.linkedinUrl?.trim().split("?")[0].slice(0, 300) || null;
  const email = input.email?.trim().toLowerCase().slice(0, 200) || null;
  if (!name && !linkedin && !email) throw new Error("Give a name, a LinkedIn profile or an email.");
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("That email doesn't look right.");
  // The same person clipped twice stays one contact.
  const same = await prisma.externalJobContact.findFirst({ where: { external_job_id: jobId, OR: [...(linkedin ? [{ linkedin_url: linkedin }] : []), ...(email ? [{ email }] : []), ...(name && !linkedin && !email ? [{ name }] : [])] }, select: { id: true } });
  if (same) return prisma.externalJobContact.update({ where: { id: same.id }, data: { ...(name ? { name } : {}), ...(linkedin ? { linkedin_url: linkedin } : {}), ...(email ? { email } : {}) } });
  return prisma.externalJobContact.create({ data: { external_job_id: jobId, name, linkedin_url: linkedin, email, source: input.source ?? "MANUAL", token: randomBytes(12).toString("base64url") } });
}

/** "{n} Oracle consultants have applied to your '{title}' role through Panameer (rates $min–$max/hr). See their profiles and rates: {link}" */
export function outreachMessage(n: number, title: string, rates: number[], link: string) {
  const usd = (c: number) => `$${Math.round(c / 100).toLocaleString("en-US")}`;
  const range = rates.length ? ` (rates ${usd(Math.min(...rates))}–${usd(Math.max(...rates))}/hr)` : "";
  return `${n} Oracle consultant${n === 1 ? " has" : "s have"} applied to your '${title}' role through Panameer${range}. See their profiles and rates: ${link}`;
}

const BOT_RE = /bot|crawler|spider|preview|facebookexternalhit|slack|whatsapp|telegram|discord|linkedin|skype|outlook|google-?(proxy|image)|bingpreview|embedly|curl|wget|python|node-fetch/i;

/** XA-E004: the recruiter's tracked link — the job and its applicants by P-number. The first real open (not a link
 *  preview) records Opened and moves applicants to Employer Viewing; they're told. */
export async function recruiterView(token: string, userAgent: string | null) {
  const c = await prisma.externalJobContact.findUnique({ where: { token }, include: { job: { include: { company: { select: { name: true } } } } } });
  if (!c || ["REMOVED", "NOT_ORACLE"].includes(c.job.status)) return null;
  const job = c.job;
  if (!c.opened_at && !BOT_RE.test(userAgent ?? "")) {
    await prisma.externalJobContact.update({ where: { id: c.id }, data: { opened_at: new Date() } });
    const { moveApplicants } = await import("@/lib/external-apply");
    await moveApplicants(job.id, "EMPLOYER_VIEWING", { title: job.title, company: job.company.name });
  }
  const apps = await prisma.externalJobInterest.findMany({ where: { external_job_id: job.id }, orderBy: { created_at: "asc" }, select: { person_id: true, start_date: true, rate_cents: true, stage: true } });
  const profiles = await prisma.providerProfile.findMany({ where: { person_id: { in: apps.map((a) => a.person_id) } }, select: { id: true, person_id: true, skills: { select: { skill_id: true } }, credentials: { where: { kind: "CERTIFICATION" }, take: 3, select: { name: true } } } });
  const { providerNumbers, providerLabel } = await import("@/lib/provider-number");
  const { sellerRatings, ratingText } = await import("@/lib/order-reviews");
  const [nums, rated, skillNames] = await Promise.all([
    providerNumbers(profiles.map((p) => p.id)),
    sellerRatings(apps.map((a) => a.person_id)),
    job.skill_ids.length ? prisma.skill.findMany({ where: { id: { in: job.skill_ids } }, select: { id: true, name: true } }) : Promise.resolve([] as { id: string; name: string }[]),
  ]);
  const names = new Map(skillNames.map((s) => [s.id, s.name]));
  const applicants = apps.flatMap((a) => {
    const p = profiles.find((x) => x.person_id === a.person_id);
    if (!p) return [];
    const matched = p.skills.map((s) => s.skill_id).filter((id) => names.has(id)).map((id) => names.get(id)!);
    return [{ label: providerLabel(nums.get(p.id)), matched, of: names.size, rateCents: a.rate_cents, start: a.start_date, reviews: ratingText(rated.get(a.person_id)), certifications: p.credentials.map((x) => x.name) }];
  });
  return { job: { title: job.title, company: job.company.name, location: job.location, workType: job.work_type, status: job.status, claimToken: job.claim_token, claimedJobId: job.claimed_job_id }, contactName: c.name, applicants };
}
