import { test, expect, type Page } from "@playwright/test";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { db } from "../e2e-shell/_db";
import { PASSWORD, signIn } from "./_fixture";

// check:company-domain-join (company-v2 lane 3), steps a–d. Throwaway people on Resend's test sink
// (delivered+…@resend.dev), so SentEmail rows can say "sent" without mailing a person.
test.describe.configure({ mode: "serial" });
const tag = `cdj${Date.now()}`;
const SINK = (who: string) => `delivered+${tag}-${who}@resend.dev`;
const ids: { users: string[]; persons: string[]; companies: string[]; paccounts: string[] } = { users: [], persons: [], companies: [], paccounts: [] };
let co = { id: "", admin: "", member: "" };

async function mkCompany(name: string) {
  const pa = await db().pAccount.create({ data: { kind: "BOTH", name }, select: { id: true } });
  const c = await db().company.create({ data: { p_account_id: pa.id, name }, select: { id: true } });
  const s = await db().site.create({ data: { company_id: c.id, name: "HQ" }, select: { id: true } });
  ids.paccounts.push(pa.id);
  ids.companies.push(c.id);
  return { id: c.id, site: s.id };
}
async function mkPerson(email: string, home: { id: string; site: string }, verified: boolean) {
  const u = await db().user.create({
    data: { email, password_hash: await bcrypt.hash(PASSWORD, 10), email_verified: verified ? new Date() : null, first_name: email.split("-").pop()!.split("@")[0], last_name: "DomainTest" },
    select: { id: true },
  });
  const p = await db().person.create({
    data: { user_id: u.id, first_name: email.split("-").pop()!.split("@")[0], last_name: "DomainTest", company_id: home.id, site_id: home.site, is_service_provider: true },
    select: { id: true },
  });
  ids.users.push(u.id);
  ids.persons.push(p.id);
  return { userId: u.id, personId: p.id };
}
async function verifyThroughPage(page: Page, userId: string) {
  const raw = randomBytes(24).toString("hex");
  await db().verificationToken.create({ data: { user_id: userId, token_hash: createHash("sha256").update(raw).digest("hex"), expires_at: new Date(Date.now() + 3600_000) } });
  // The server render consumes the token and files the request; no client redirect involved.
  const r = await page.request.get(`/verify-email?token=${raw}`);
  expect(await r.text()).toContain("Email Verified");
}
const sent = async (to: string, after: Date) => {
  for (let i = 0; i < 30; i++) {
    const r = await db().sentEmail.findFirst({ where: { to_email: to, created_at: { gte: after } }, orderBy: { created_at: "desc" }, select: { status: true, template: true } });
    if (r) return r;
    await new Promise((res) => setTimeout(res, 1000));
  }
  return null;
};

test.beforeAll(async () => {
  const c = await mkCompany(`DomainJoin ${tag}`);
  const admin = await mkPerson(SINK("admin"), c, true);
  const member = await mkPerson(SINK("member"), c, true);
  await db().companyMembership.createMany({
    data: [
      { person_id: admin.personId, company_id: c.id, role: "ADMIN", status: "APPROVED" },
      { person_id: member.personId, company_id: c.id, role: "MEMBER", status: "APPROVED" },
    ],
  });
  co = { id: c.id, admin: SINK("admin"), member: SINK("member") };
});
test.afterAll(async () => {
  await db().notification.deleteMany({ where: { person_id: { in: ids.persons } } });
  await db().sentEmail.deleteMany({ where: { to_email: { contains: tag } } });
  await db().person.deleteMany({ where: { id: { in: ids.persons } } });
  await db().user.deleteMany({ where: { id: { in: ids.users } } });
  await db().company.deleteMany({ where: { id: { in: ids.companies } } });
  await db().pAccount.deleteMany({ where: { id: { in: ids.paccounts } } });
});

test("a — only an admin can claim the domain, and only their own verified work domain", async ({ page }) => {
  await signIn(page, co.member);
  expect((await page.request.post("/api/company/domain", { data: { domain: "resend.dev" } })).status(), "member").toBe(403);
  await signIn(page, co.admin);
  expect((await page.request.post("/api/company/domain", { data: { domain: "gmail.com" } })).status(), "free mail").toBe(400);
  expect((await page.request.post("/api/company/domain", { data: { domain: "example.org" } })).status(), "not own").toBe(400);
  expect((await page.request.post("/api/company/domain", { data: { domain: "resend.dev" } })).status(), "own").toBe(200);
  expect((await db().company.findUniqueOrThrow({ where: { id: co.id }, select: { email_domain: true } })).email_domain).toBe("resend.dev");
});

test("b+c — a verified matching email creates a request; the admin is notified in-app and by email", async ({ page }) => {
  const home = await mkCompany(`Joiner home ${tag}`);
  const joiner = await mkPerson(SINK("joiner"), home, false);
  const other = await mkPerson(`${tag}-other@example.seed`, home, false);
  const t0 = new Date();
  await verifyThroughPage(page, joiner.userId);
  await verifyThroughPage(page, other.userId);
  const req = await db().companyMembership.findFirst({ where: { person_id: joiner.personId, company_id: co.id }, select: { status: true, auto_approved: true } });
  expect(req, "request created for the matching domain").toEqual({ status: "PENDING", auto_approved: false });
  expect(await db().companyMembership.count({ where: { person_id: other.personId, company_id: co.id } }), "no request for another domain").toBe(0);
  const adminPerson = await db().person.findFirstOrThrow({ where: { user: { email: co.admin } }, select: { id: true } });
  expect(await db().notification.count({ where: { person_id: adminPerson.id, event_key: "company.join_requested" } }), "admin in-app").toBeGreaterThan(0);
  expect((await sent(co.admin, t0))?.status, "admin email").toBe("sent");
});

test("c+d — approve: member appears in People, joiner emailed; decline: nothing created, joiner emailed", async ({ page }) => {
  const home = await mkCompany(`Decliner home ${tag}`);
  const decliner = await mkPerson(SINK("decliner"), home, false);
  await verifyThroughPage(page, decliner.userId);
  await signIn(page, co.admin);
  await page.goto("/company/people", { waitUntil: "networkidle" });
  await expect(page.locator(`[data-co-section="asking"]`)).toBeVisible();
  const t1 = new Date();
  const rows = page.locator("[data-join-request]");
  await expect(rows).toHaveCount(2);
  await rows.filter({ hasText: SINK("joiner") }).getByRole("button", { name: "Approve" }).click();
  await expect(page.locator("[data-member]")).toHaveCount(3, { timeout: 20_000 });
  await page.locator("[data-join-request]").filter({ hasText: SINK("decliner") }).getByRole("button", { name: "Decline" }).click();
  await expect(page.locator("[data-join-request]")).toHaveCount(0, { timeout: 20_000 });
  expect((await sent(SINK("joiner"), t1))?.status, "approved email").toBe("sent");
  expect((await sent(SINK("decliner"), t1))?.status, "declined email").toBe("sent");
  const dec = await db().person.findFirstOrThrow({ where: { user: { email: SINK("decliner") } }, select: { id: true } });
  expect(await db().companyMembership.count({ where: { person_id: dec.id, company_id: co.id, status: "APPROVED" } }), "decline creates nothing").toBe(0);
  await page.screenshot({ path: "e2e-r1/.artifacts/people-after-decisions.png", fullPage: true });
});
