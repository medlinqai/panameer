import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { isWorkDomain } from "@/lib/tos";
import { companyKey } from "@/lib/external-jobs";

// EX-E005: Claim This Job — 1 confirm the work email (a link to it; the domain must match the company, else an admin
// approves), 2 check the job (pre-filled from the listing), 3 publish free → a normal Panameer job owned by the buyer.
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const domainOf = (email: string) => email.trim().toLowerCase().split("@")[1] ?? "";

/** Does the email's domain belong to this company? Known domain → exact; otherwise the name must appear in the domain. */
export function domainMatches(companyName: string, companyDomain: string | null, email: string): boolean {
  const d = domainOf(email);
  if (!d || !isWorkDomain(d)) return false;
  if (companyDomain) return d === companyDomain || d.endsWith(`.${companyDomain}`);
  const label = d.split(".").slice(-2, -1)[0] ?? "";
  const name = companyKey(companyName).replace(/\s+/g, "");
  return label.length >= 3 && name.length >= 3 && (name.includes(label) || label.includes(name));
}

export async function startClaim(token: string, input: { email: string; name: string; role?: string | null }, origin: string): Promise<{ sent: boolean; needsAdmin: boolean }> {
  const job = await prisma.externalJob.findUnique({ where: { claim_token: token }, select: { id: true, title: true, status: true, company: { select: { name: true, domain: true } } } });
  if (!job || job.status === "REMOVED") throw new Error("This listing is no longer available.");
  if (job.status === "CLAIMED") throw new Error("This job has already been posted on Panameer.");
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter your work email.");
  if (!isWorkDomain(domainOf(email))) throw new Error("Use your work email (not a personal address).");
  const needsAdmin = !domainMatches(job.company.name, job.company.domain, email);
  const raw = randomBytes(24).toString("base64url");
  await prisma.externalJobClaim.create({ data: { external_job_id: job.id, email, name: input.name.trim().slice(0, 120), role: input.role?.trim().slice(0, 120) || null, verify_hash: hash(raw), needs_admin: needsAdmin } });
  const { sendEmail } = await import("@/lib/resend");
  const { emailShell, paragraph, primaryButton, escapeHtml } = await import("@/lib/email/shell");
  const link = `${origin.replace(/\/$/, "")}/claim/${token}?v=${raw}`;
  await sendEmail({ to: email, subject: `Confirm your email to post "${job.title}" free on Panameer`, template: "external-job-claim", category: "account.registration",
    html: emailShell({ bodyHtml: paragraph(`Hi ${escapeHtml(input.name.trim() || "there")},`) + paragraph(`Confirm this is your work email to post <b>${escapeHtml(job.title)}</b> for ${escapeHtml(job.company.name)} on Panameer — free.`) + primaryButton(link, "Confirm and Continue") + (needsAdmin ? paragraph("We'll also check that this email belongs to the company; that's usually quick.") : "") }),
    text: `Confirm your email to post "${job.title}" on Panameer: ${link}` });
  return { sent: true, needsAdmin };
}

/** The link from the email → the claim is verified. Returns it (or null). */
export async function verifyClaim(raw: string) {
  const c = await prisma.externalJobClaim.findUnique({ where: { verify_hash: hash(raw) } });
  if (!c) return null;
  if (!c.verified_at) await prisma.externalJobClaim.update({ where: { id: c.id }, data: { verified_at: new Date() } });
  return { ...c, verified_at: c.verified_at ?? new Date() };
}

/** The signed-in buyer's verified, approved claim on this job (their sign-in email must be the claimed one). */
export async function claimFor(token: string, userEmail: string | null | undefined) {
  if (!userEmail) return null;
  const job = await prisma.externalJob.findUnique({ where: { claim_token: token }, select: { id: true } });
  if (!job) return null;
  return prisma.externalJobClaim.findFirst({ where: { external_job_id: job.id, email: userEmail.trim().toLowerCase(), verified_at: { not: null } }, orderBy: { created_at: "desc" } });
}

/** Publish free: a normal Panameer job owned by the claiming buyer and company; interested sellers are told first. */
export async function publishClaim(viewer: Viewer, token: string, input: { title: string; description: string; location?: string | null; workType?: string | null }): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: viewer.userId }, select: { email: true } });
  const claim = await claimFor(token, user?.email);
  if (!claim) throw new Error("Confirm your work email first (use the link we sent).");
  if (claim.needs_admin && !claim.admin_approved_at) throw new Error("We're still checking that this email belongs to the company. You'll get an email once it's approved.");
  const ext = await prisma.externalJob.findUnique({ where: { claim_token: token }, select: { id: true, status: true, external_company_id: true, skill_ids: true, company: { select: { name: true } } } });
  if (!ext || ext.status === "CLAIMED" || ext.status === "REMOVED") throw new Error("This job can't be claimed any more.");
  const { createDraft } = await import("@/lib/work-request");
  const draft = await createDraft(viewer);
  const ws = input.workType === "Remote" ? "OFFSITE" : input.workType === "Onsite" ? "ONSITE" : input.workType === "Hybrid" ? "HYBRID" : null;
  const job = await prisma.job.update({ where: { id: draft.id }, data: { title: input.title.trim().slice(0, 200), description: input.description.trim().slice(0, 20000), worksite: ws, city: input.location?.trim() || null, status: "OPEN", posted_at: new Date(), skills: ext.skill_ids.length ? { create: ext.skill_ids.slice(0, 20).map((skill_id) => ({ skill_id })) } : undefined }, select: { id: true, buyer: { select: { company_id: true } } } }).catch(async () =>
    prisma.job.update({ where: { id: draft.id }, data: { title: input.title.trim().slice(0, 200), description: input.description.trim().slice(0, 20000), worksite: ws, city: input.location?.trim() || null, status: "OPEN", posted_at: new Date() }, select: { id: true, buyer: { select: { company_id: true } } } }));
  await prisma.$transaction([
    prisma.externalJob.update({ where: { id: ext.id }, data: { status: "CLAIMED", claimed_job_id: job.id, claimed_at: new Date() } }),
    prisma.externalCompany.update({ where: { id: ext.external_company_id }, data: { claimed_company_id: job.buyer?.company_id ?? null } }),
    prisma.externalJobClaim.update({ where: { id: claim.id }, data: { published_job_id: job.id } }),
  ]);
  // XA-E004: every applicant carries over as a response on the new job (Compare / Responses), stage Sent to Employer.
  const { notify } = await import("@/lib/notifications");
  const applicants = await prisma.externalJobInterest.findMany({ where: { external_job_id: ext.id }, select: { id: true, person_id: true, rate_cents: true, start_date: true, note: true, proposal_id: true } });
  const now = new Date();
  for (const a of applicants) {
    if (!a.proposal_id) {
      const p = await prisma.proposal.create({ data: { proposal_number: `PRO-${now.getTime().toString(36).toUpperCase()}-${a.person_id.slice(0, 4)}-${a.id.slice(0, 3)}`, job_id: job.id, provider_person_id: a.person_id, cover_note: a.note, status: "SUBMITTED", submitted_at: now, ...(a.rate_cents || a.start_date ? { lines: { create: { line_number: 1, basis: "RATE", uom: "HOUR", unit_price_cents: a.rate_cents, available_from: a.start_date } } } : {}) }, select: { id: true } }).catch(() => null);
      if (p) await prisma.externalJobInterest.update({ where: { id: a.id }, data: { proposal_id: p.id } });
    }
    await notify({ event: "work.external_claimed", personId: a.person_id, entityType: "job", entityId: job.id, dedupeKey: `work.external_claimed:${ext.id}:${a.person_id}`, vars: { company: ext.company.name, title: input.title.trim(), jobId: job.id } });
  }
  await prisma.externalJobInterest.updateMany({ where: { external_job_id: ext.id, stage: { in: ["APPLIED", "EMPLOYER_VIEWING"] } }, data: { stage: "SENT_TO_EMPLOYER", stage_at: now } });
  return job.id;
}

export async function approveClaim(claimId: string) {
  const c = await prisma.externalJobClaim.update({ where: { id: claimId }, data: { admin_approved_at: new Date() }, select: { email: true, external_job_id: true } });
  const job = await prisma.externalJob.findUnique({ where: { id: c.external_job_id }, select: { title: true, claim_token: true } });
  if (!job) return;
  const { sendEmail } = await import("@/lib/resend");
  const { emailShell, paragraph, primaryButton, escapeHtml } = await import("@/lib/email/shell");
  const link = `${(process.env.NEXT_PUBLIC_APP_URL ?? "https://app.panameer.com").replace(/\/$/, "")}/claim/${job.claim_token}`;
  await sendEmail({ to: c.email, subject: `You can post "${job.title}" on Panameer now`, template: "external-job-claim-approved", category: "account.registration", html: emailShell({ bodyHtml: paragraph(`Your email is confirmed for <b>${escapeHtml(job.title)}</b>.`) + primaryButton(link, "Check and Publish") }), text: `You can post "${job.title}" on Panameer now: ${link}` }).catch(() => null);
}
