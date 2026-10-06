import { prisma } from "@/lib/prisma";
import { emailConfigured } from "@/lib/email-status";
import { notifyCatalogReview, waitingCounts } from "@/lib/catalog-review";

// check:catalog-finder (digest): one notice per admin per day; a second new term updates the count, no second email.
// Throwaway company, person and skills only; refuses to run unless mail is captured.
async function main() {
  if (process.env.MAIL_CAPTURE?.trim() !== "1") throw new Error("MAIL_CAPTURE=1 required — this check must never send real mail");
  const tag = `cfdigest-${Date.now()}`;
  const pa = await prisma.pAccount.create({ data: { kind: "BOTH", name: `CF Test ${tag}` } });
  const co = await prisma.company.create({ data: { p_account_id: pa.id, name: `CF Test ${tag}` } });
  const site = await prisma.site.create({ data: { company_id: co.id, name: "HQ" } });
  const user = await prisma.user.create({ data: { email: `${tag}@example.seed`, first_name: "Cat", last_name: "Digest" } });
  const person = await prisma.person.create({ data: { user_id: user.id, first_name: "Cat", last_name: "Digest", company_id: co.id, site_id: site.id } });
  const base = await prisma.skill.findFirst({ select: { catalog_id: true, role_type_id: true } });
  const skills: string[] = [];
  const mk = async (n: string) => skills.push((await prisma.skill.create({ data: { catalog_id: base!.catalog_id, role_type_id: base!.role_type_id, name: `${n} ${tag}`, origin: "PROVIDER", is_custom: true } })).id);
  const fails: string[] = [];
  try {
    await mk("Alpha");
    await notifyCatalogReview([person.id]);
    let rows = await prisma.notification.findMany({ where: { person_id: person.id, event_key: "catalog.review_new" } });
    const c1 = await waitingCounts();
    if (rows.length !== 1) fails.push(`expected 1 notice, got ${rows.length}`);
    if (!rows[0]?.title.includes(`${c1.skills} new skill`)) fails.push(`title "${rows[0]?.title}" lacks ${c1.skills} new skills`);
    if (rows[0]?.href !== "/admin/skill-catalog?tab=compare&status=new") fails.push(`href ${rows[0]?.href}`);
    // example.seed is refused by the mail layer, so "attempted" = sent or refused.
    const tried = (r?: { email_sent_at: Date | null; suppressed_reason: string | null }) => !!r?.email_sent_at || r?.suppressed_reason === "email_refused";
    if (emailConfigured() && !tried(rows[0])) fails.push(`first notice not emailed (${rows[0]?.suppressed_reason})`);
    const firstSent = rows[0]?.email_sent_at?.getTime();
    const firstReason = rows[0]?.suppressed_reason;

    await mk("Beta");
    await notifyCatalogReview([person.id]);
    rows = await prisma.notification.findMany({ where: { person_id: person.id, event_key: "catalog.review_new" } });
    if (rows.length !== 1) fails.push(`second term made ${rows.length} notices`);
    if (!rows[0]?.title.includes(`${c1.skills + 1} new skill`)) fails.push(`count not refreshed: "${rows[0]?.title}"`);
    if (rows[0]?.email_sent_at?.getTime() !== firstSent || rows[0]?.suppressed_reason !== firstReason) fails.push("second term re-sent the email");
  } finally {
    await prisma.notification.deleteMany({ where: { person_id: person.id } });
    await prisma.skill.deleteMany({ where: { id: { in: skills } } });
    await prisma.person.delete({ where: { id: person.id } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.site.delete({ where: { id: site.id } });
    await prisma.company.delete({ where: { id: co.id } });
    await prisma.pAccount.delete({ where: { id: pa.id } });
  }
  console.log(`check:catalog-digest — ${fails.length ? fails.length + " problem(s)" : "one notice per day, count refreshed, one email"}`);
  for (const f of fails) console.log(`  ✗ ${f}`);
  process.exit(fails.length ? 1 : 0);
}
main().catch((e) => { console.error(e); process.exit(1); });
