import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// EX-E001: one intake for every route (forwarded alert email · CSV/XLSX · Job Clipper · agent key). Each job: clean link,
// duplicates removed (source + job ID, then title + company + location), Oracle check (unsure → Needs Review), skills
// matched, owned by an unclaimed company record. Panameer is never the buyer.
export type Via = "EMAIL" | "CSV" | "CLIPPER" | "AGENT";
export type RawJob = { title: string; company?: string | null; location?: string | null; url?: string | null; description?: string | null; salary?: string | null; workType?: string | null; tags?: string[]; alertName?: string | null; hiringName?: string | null; hiringUrl?: string | null; source?: string | null };
export type IntakeResult = { received: number; listed: number; duplicates: number; notOracle: number; needsReview: number; blocked: number };

const DAY = 86_400_000;
const EXPIRES_DAYS = 30;
/** The Job Clipper's keyword list, kept in step with 8. Sales/job-clipper/popup.js. */
export const ORACLE_RE = /oracle|fusion|\bebs\b|peoplesoft|netsuite|jd edwards|\bjde\b|\boic\b|\botbi\b|\bbip\b|fbdi|hcm cloud|erp cloud|scm cloud/i;
const MAYBE_RE = /\berp\b|\bscm\b|\bhcm\b|\bepm\b|financials|procure|supply chain|finance systems|cloud consultant/i;

/** LinkedIn / Indeed links become their clean form; anything else keeps only scheme + host + path (no tracking). */
export function cleanLink(raw: string | null | undefined): { url: string; source: string; id: string | null } | null {
  if (!raw) return null;
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  if (host.endsWith("linkedin.com")) {
    const id = u.pathname.match(/jobs\/view\/(?:[^/]*-)?(\d{6,})/)?.[1] ?? u.searchParams.get("currentJobId");
    return id ? { url: `https://www.linkedin.com/jobs/view/${id}/`, source: "LinkedIn", id } : null;
  }
  if (host.includes("indeed.")) {
    const jk = u.searchParams.get("jk") ?? u.searchParams.get("vjk");
    return jk ? { url: `https://www.indeed.com/viewjob?jk=${jk}`, source: "Indeed", id: jk } : null;
  }
  return { url: `${u.protocol}//${u.hostname}${u.pathname}`, source: host, id: null };
}

const norm = (s: string | null | undefined) => (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export const companyKey = (name: string) => norm(name).replace(/\b(the|inc|llc|ltd|limited|corp|corporation|co|company|plc|gmbh|group)\b/g, " ").replace(/\s+/g, " ").trim() || norm(name);
export const dedupeKey = (j: RawJob) => [norm(j.title), companyKey(j.company ?? ""), norm(j.location).split(" ").slice(0, 3).join(" ")].join("|");
const workTypeOf = (j: RawJob) => j.workType ?? (/\bremote\b/i.test(j.location ?? "") ? "Remote" : /\bhybrid\b/i.test(j.location ?? "") ? "Hybrid" : /on-?site/i.test(j.location ?? "") ? "Onsite" : null);

export function oracleCheck(j: RawJob): "YES" | "NO" | "UNSURE" {
  const text = [j.title, j.company, j.description].join(" ");
  if (ORACLE_RE.test(text)) return "YES";
  if (!j.description && MAYBE_RE.test(j.title)) return "UNSURE";
  return MAYBE_RE.test(text) && !j.description ? "UNSURE" : "NO";
}

let skillCache: { at: number; list: { id: string; re: RegExp }[] } | null = null;
/** Skills named in the job text (names of 4+ letters, whole words). */
export async function matchSkills(text: string): Promise<string[]> {
  if (!skillCache || skillCache.at < Date.now() - 10 * 60_000) {
    const skills = await prisma.skill.findMany({ select: { id: true, name: true } });
    skillCache = { at: Date.now(), list: skills.filter((s) => s.name.length >= 4).map((s) => ({ id: s.id, re: new RegExp(`\\b${s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i") })) };
  }
  return skillCache.list.filter((s) => s.re.test(text)).map((s) => s.id).slice(0, 40);
}

async function companyFor(name: string) {
  const key = companyKey(name) || "unknown";
  return prisma.externalCompany.upsert({ where: { name_key: key }, create: { name: name.trim() || "Unknown Company", name_key: key }, update: {}, select: { id: true, blocked_at: true } });
}

/** XA-E003: the Clipper's "Meet the hiring team" person becomes a recruiter contact on the matching job. */
async function attachHirer(jobId: string, j: RawJob, via: Via) {
  const { addContact } = await import("@/lib/external-contacts");
  await addContact(jobId, { name: j.hiringName, linkedinUrl: cleanLink(j.hiringUrl)?.url ?? j.hiringUrl ?? null, source: via === "CLIPPER" ? "CLIPPER" : "MANUAL" }).catch(() => null);
}

/** Run jobs through the intake. Returns the counts for this batch; every job is logged on the intake page. */
export async function intakeJobs(jobs: RawJob[], via: Via): Promise<IntakeResult> {
  const r: IntakeResult = { received: 0, listed: 0, duplicates: 0, notOracle: 0, needsReview: 0, blocked: 0 };
  const log = (j: RawJob, source: string | null, result: string, id: string | null) => prisma.externalJobIntakeItem.create({ data: { came_in_via: via, title: j.title.slice(0, 300), company_name: j.company ?? null, source, result, external_job_id: id } });
  for (const j of jobs) {
    if (!j.title?.trim()) continue;
    r.received++;
    const link = cleanLink(j.url);
    const source = link?.source ?? j.source ?? "Other";
    const key = dedupeKey(j);
    // 1) Duplicates: source + job ID, then title + company + location. Fill in anything the copy adds.
    const dup = (link?.id ? await prisma.externalJob.findFirst({ where: { source, source_job_id: link.id }, select: { id: true, description: true, salary: true, hiring_name: true } }) : null)
      ?? await prisma.externalJob.findFirst({ where: { dedupe_key: key }, select: { id: true, description: true, salary: true, hiring_name: true } });
    if (dup) {
      await prisma.externalJob.update({ where: { id: dup.id }, data: { ...(!dup.description && j.description ? { description: j.description.slice(0, 20000) } : {}), ...(!dup.salary && j.salary ? { salary: j.salary } : {}), ...(!dup.hiring_name && j.hiringName ? { hiring_name: j.hiringName, hiring_url: cleanLink(j.hiringUrl)?.url ?? null } : {}) } });
      if (j.hiringName || j.hiringUrl) await attachHirer(dup.id, j, via);
      r.duplicates++; await log(j, source, "DUPLICATE", dup.id); continue;
    }
    // 2) Oracle check.
    const oracle = oracleCheck(j);
    if (oracle === "NO") { r.notOracle++; await log(j, source, "NOT_ORACLE", null); continue; }
    // 3) The unclaimed company record (blocked on request → not listed).
    const co = await companyFor(j.company ?? "Unknown Company");
    if (co.blocked_at) { r.blocked++; await log(j, source, "BLOCKED", null); continue; }
    const job = await prisma.externalJob.create({
      data: {
        external_company_id: co.id, source, source_job_id: link?.id ?? null, url: link?.url ?? (j.url ?? ""), title: j.title.trim().slice(0, 300),
        location: j.location?.trim() || null, work_type: workTypeOf(j), salary: j.salary?.trim() || null, tags: j.tags ?? [], alert_name: j.alertName ?? null,
        description: j.description?.trim().slice(0, 20000) || null, hiring_name: j.hiringName ?? null, hiring_url: cleanLink(j.hiringUrl)?.url ?? null,
        came_in_via: via, status: oracle === "YES" ? "LISTED" : "NEEDS_REVIEW", skill_ids: await matchSkills([j.title, j.description].join(" ")),
        dedupe_key: key, claim_token: randomBytes(18).toString("base64url"), expires_at: new Date(Date.now() + EXPIRES_DAYS * DAY),
      },
      select: { id: true },
    });
    if (j.hiringName || j.hiringUrl) await attachHirer(job.id, j, via);
    if (oracle === "YES") r.listed++; else r.needsReview++;
    await log(j, source, oracle === "YES" ? "LISTED" : "NEEDS_REVIEW", job.id);
  }
  return r;
}

// ── Agent / Clipper keys ────────────────────────────────────────────────────────────────────────────────────────
export const hashKey = (k: string) => createHash("sha256").update(k).digest("hex");
export async function createKey(label: string): Promise<string> {
  const key = `PNM-EXT-${randomBytes(18).toString("base64url")}`;
  await prisma.externalJobKey.create({ data: { label: label.trim().slice(0, 80) || "Agent", key_hash: hashKey(key), key_hint: key.slice(-4) } });
  return key;
}
export async function keyIsValid(key: string | null | undefined): Promise<boolean> {
  if (!key?.startsWith("PNM-EXT-")) return false;
  return !!(await prisma.externalJobKey.findFirst({ where: { key_hash: hashKey(key), revoked_at: null }, select: { id: true } }));
}

// ── Parsers ─────────────────────────────────────────────────────────────────────────────────────────────────────
const decode = (s: string) => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)));

/**
 * A LinkedIn or Indeed job-alert email (or any email with job links) → jobs. Each job link becomes a marker; the lines
 * after it (until the next job) are company · location · salary · tags.
 */
export function parseAlertEmail(html: string | null, text: string | null, subject: string | null): RawJob[] {
  const alertName = subject?.match(/[“"]([^”"]+)[”"]/)?.[1] ?? subject?.replace(/^(fwd?|fw):\s*/i, "").trim() ?? null;
  let body = html ?? (text ?? "").replace(/(https?:\/\/\S+)/g, '<a href="$1">$1</a>');
  body = body.replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, "");
  const marked = body.replace(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, inner: string) => {
    const l = cleanLink(decode(href));
    const label = decode(inner.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
    // XA-E001: a logo link has no text — its alt is the company.
    const alt = !label ? decode(inner.match(/\balt="([^"]*)"/i)?.[1] ?? "").trim() : "";
    return l && (l.source === "LinkedIn" || l.source === "Indeed") ? `\n@@JOB ${l.url}@@ ${label}${alt ? `\n@@LOGO ${alt}` : ""}\n` : ` ${label} `;
  });
  const lines = decode(marked.replace(/<br\s*\/?>|<\/(p|div|tr|td|li|h\d|table)>/gi, "\n").replace(/<[^>]+>/g, " ")).split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  const out = new Map<string, RawJob & { logo?: string }>();
  let cur: (RawJob & { logo?: string }) | null = null;
  const NOISE = /^(view job|apply|see all jobs|unsubscribe|manage|job alert|linkedin|indeed|easy apply$|promoted|new$|\d+ (company )?alumni|see more|sponsored|\d+ (applicants?|connections?)|viewed|reposted)/i;
  // XA-E001: LinkedIn's footer and promos — parsing stops at the first one.
  const FOOTER = /job search smarter with premium|get the new linkedin|try premium|this email was intended for|learn why we included this|you are receiving|unsubscribe|help:|©\s*\d{4}|linkedin corporation|see all jobs on linkedin|manage alerts|search other jobs/i;
  for (let line of lines) {
    if (FOOTER.test(line)) { cur = null; if (out.size) break; continue; }
    const m = line.match(/^@@JOB (\S+)@@\s*(.*)$/);
    if (m) {
      const existing = out.get(m[1]);
      if (!existing) { cur = { title: m[2], url: m[1], tags: [], alertName, company: null, location: null }; out.set(m[1], cur); continue; }
      cur = existing;
      if (!existing.title) { existing.title = m[2]; continue; }
      // The "Company · Location" line links to the same job — read it as a line.
      line = m[2];
      if (!line) continue;
    }
    const logo = line.match(/^@@LOGO (.*)$/);
    if (logo) { if (cur) cur.logo = logo[1]; continue; }
    if (!cur) continue;
    if (/actively recruiting|easy apply|be an early applicant|urgently hiring|responsive employer/i.test(line)) { for (const t of ["Actively Recruiting", "Easy Apply", "Early Applicant", "Urgently Hiring"]) if (new RegExp(t.split(" ")[0], "i").test(line) && !cur.tags!.includes(t)) cur.tags!.push(t); continue; }
    if (/\$\s?\d/.test(line) && !cur.salary) { cur.salary = line.slice(0, 120); continue; }
    if (NOISE.test(line) || line.length > 160) continue;
    if (!cur.title) { cur.title = line; continue; }
    if (!cur.company && /\s·\s/.test(line)) {
      const [c, ...rest] = line.split(/\s+·\s+/);
      cur.company = c;
      const loc = rest.join(" · ");
      if (loc) { cur.location = loc; const wt = loc.match(/\((remote|hybrid|on-?site)\)/i)?.[1]; if (wt) cur.workType = /remote/i.test(wt) ? "Remote" : /hybrid/i.test(wt) ? "Hybrid" : "Onsite"; }
      continue;
    }
    if (!cur.company) { cur.company = line; continue; }
    if (!cur.location) { cur.location = line; continue; }
  }
  return [...out.values()].filter((j) => j.title).map(({ logo, ...j }) => ({ ...j, company: j.company ?? logo ?? null, description: null, workType: j.workType ?? workTypeOf(j) }));
}

const HEADERS: Record<keyof Pick<RawJob, "title" | "company" | "location" | "url" | "description" | "salary" | "source">, RegExp> = {
  title: /^(job )?title$|^position$|^role$|^job$/i, company: /^company( name)?$|^employer$|^organi[sz]ation$|^hiring company$/i, location: /^location$|^city$|^place$/i,
  url: /^(job )?(link|url)$|^apply( url| link)?$|^job url$/i, description: /^description$|^summary$|^details$|^job description$/i, salary: /^salary$|^pay$|^rate$|^compensation$/i, source: /^source$|^site$|^board$/i,
};
/** CSV or XLSX from an agent → jobs; the column names are matched for you. */
export async function parseSheet(bytes: ArrayBuffer, filename: string): Promise<RawJob[]> {
  let rows: string[][] = [];
  if (/\.xlsx$/i.test(filename)) {
    const ExcelJS = (await import("exceljs")).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(bytes);
    const ws = wb.worksheets[0];
    ws?.eachRow((row) => { rows.push((row.values as unknown[]).slice(1).map((v) => (v && typeof v === "object" && "text" in (v as object) ? String((v as { text: unknown }).text) : v && typeof v === "object" && "hyperlink" in (v as object) ? String((v as { hyperlink: unknown }).hyperlink) : String(v ?? "")))); });
  } else {
    const text = new TextDecoder().decode(bytes);
    rows = csvRows(text);
  }
  const [head, ...data] = rows;
  if (!head) return [];
  const col = Object.fromEntries(Object.entries(HEADERS).map(([k, re]) => [k, head.findIndex((h) => re.test(h.trim()))])) as Record<keyof typeof HEADERS, number>;
  const get = (r: string[], k: keyof typeof HEADERS) => (col[k] >= 0 ? (r[col[k]] ?? "").trim() : "");
  return data.map((r) => ({ title: get(r, "title"), company: get(r, "company") || null, location: get(r, "location") || null, url: get(r, "url") || null, description: get(r, "description") || null, salary: get(r, "salary") || null, source: get(r, "source") || null })).filter((j) => j.title);
}
function csvRows(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], f = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true; else if (c === ",") { row.push(f); f = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

// ── EX-E002/E003: what a seller sees ─────────────────────────────────────────────────────────────────────────────
export type ExternalCard = { id: string; title: string; company: string; source: string; url: string; location: string | null; workType: string | null; salary: string | null; receivedAt: string; matched: number; interested: boolean; interestedCount: number;
  /** XA-E002: your application's stage label (Applied … Chosen, Not Selected, Closed), or null before you apply. */ stage: string | null; stageKey: string | null; claimedJobId: string | null };
const LIVE = () => ({ status: "LISTED", expires_at: { gt: new Date() } });

/** Listed external jobs for a seller — strongest skill match first, then newest — plus any job they applied to (Closed once it's gone). */
export async function externalForPerson(personId: string | null, take = 300): Promise<ExternalCard[]> {
  const mine0 = personId ? await prisma.externalJobInterest.findMany({ where: { person_id: personId }, select: { external_job_id: true, stage: true, proposal_id: true } }) : [];
  // XA-E004: once claimed, the buyer's actions on the response move the stage on (Interview · Chosen · Not Selected).
  const props = await prisma.proposal.findMany({ where: { id: { in: mine0.map((m) => m.proposal_id).filter((x): x is string => !!x) } }, select: { id: true, status: true, job_id: true } });
  const ivJobs = new Set(props.length && personId ? (await prisma.interviewRequest.findMany({ where: { provider_person_id: personId, job_id: { in: props.map((p) => p.job_id) } }, select: { job_id: true } })).map((i) => i.job_id) : []);
  const mine = mine0.map((m) => {
    const p = props.find((x) => x.id === m.proposal_id);
    const stage = !p ? m.stage : p.status === "AWARDED" ? "CHOSEN" : ["NOT_SELECTED", "DECLINED", "WITHDRAWN"].includes(p.status) ? "NOT_SELECTED" : ivJobs.has(p.job_id) ? "INTERVIEW" : m.stage;
    return { external_job_id: m.external_job_id, stage };
  });
  const [jobs, pp] = await Promise.all([
    prisma.externalJob.findMany({ where: { OR: [LIVE(), { id: { in: mine.map((m) => m.external_job_id) }, status: { not: "NOT_ORACLE" } }] }, orderBy: { received_at: "desc" }, take, select: { id: true, title: true, status: true, expires_at: true, claimed_job_id: true, source: true, url: true, location: true, work_type: true, salary: true, received_at: true, skill_ids: true, company: { select: { name: true } }, _count: { select: { interests: true } } } }),
    personId ? prisma.providerProfile.findUnique({ where: { person_id: personId }, select: { skills: { select: { skill_id: true } } } }) : null,
  ]);
  const { EXT_STAGE_LABEL } = await import("@/lib/external-apply");
  const skills = new Set(pp?.skills.map((s) => s.skill_id) ?? []);
  const stageOf = new Map(mine.map((m) => [m.external_job_id, m.stage]));
  return jobs.map((j) => {
    const raw = stageOf.get(j.id) ?? null;
    const gone = j.status === "REMOVED" || (j.status === "LISTED" && j.expires_at <= new Date());
    const key = raw && gone && !["CHOSEN", "NOT_SELECTED"].includes(raw) ? "CLOSED" : raw;
    return { id: j.id, title: j.title, company: j.company.name, source: j.source, url: j.url, location: j.location, workType: j.work_type, salary: j.salary, receivedAt: j.received_at.toISOString(), matched: j.skill_ids.filter((s) => skills.has(s)).length, interested: !!raw, interestedCount: j._count.interests, stageKey: key, stage: key ? EXT_STAGE_LABEL[key as keyof typeof EXT_STAGE_LABEL] ?? key : null, claimedJobId: j.claimed_job_id };
  }).sort((a, b) => b.matched - a.matched || b.receivedAt.localeCompare(a.receivedAt));
}

/** XA-E006: "via LinkedIn" — a host like dice.com reads "Dice". */
export const sourceName = (source: string) => (/\./.test(source) ? source.replace(/^www\./, "").split(".")[0].replace(/^./, (c) => c.toUpperCase()) : source);
export const sourceLabel = (source: string) => `External · via ${sourceName(source)}`;

