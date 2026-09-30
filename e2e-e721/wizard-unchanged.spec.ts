import { test, expect } from "@playwright/test";
import { db } from "../e2e-shell/_db";
import bcrypt from "bcryptjs";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E721` ITEM 2 — THE WIZARD IS UNCHANGED, MEASURED BOTH SIDES ────────────────────
 *
 * ⚠ **SCOTT: *"⚠ The onboarding wizard uses the same route. Prove the wizard's behavior is
 * unchanged (before/after on a fresh sign-up)."***
 *
 * ⚠⚠⚠ **IT PRINTS A FINGERPRINT, NOT A VERDICT.** The whole point is a BEFORE/AFTER
 * comparison across two builds, so this spec's job is to emit the same measurement on trunk
 * and on the branch; the comparison is done between runs. ⚠ Assertions here only catch the
 * cases that are wrong on EITHER side (a failed read, an empty upload).
 *
 * ── ⚠⚠⚠ WHY A THROWAWAY PERSONA AND NEVER A SEEDED ONE ──────────────────────────────────
 *
 * ⚠⚠ **AN APPLY-MODE IMPORT FIRES `recomputeProviderRollup`, AND `E553` MEASURED THAT A
 * ROLLUP RUN DELETES EVERY `source: DERIVED` ROW A DATED SKILL-LINKED JOB CANNOT REBUILD —
 * 297 rows across 51 profiles, 139 of them unrecoverable.** ⚠⚠⚠ **SO RUNNING THIS AGAINST A
 * REAL PROVIDER COULD DESTROY SKILLS AS A SIDE EFFECT OF A TEST.** The persona is created
 * here, measured, and deleted here.
 * ⚠ `@example.seed` IS AN UNDELIVERABLE DOMAIN by `lib/email/undeliverable-domains.ts`, so no
 * mail can leave even if a code path tried.
 */
const EMAIL = "e721.upload.walk@example.seed";
const PASSWORD = "Panameer123";
const OUT = join(process.cwd(), "e2e-e721", "shots");

/**
 * ⚠ A SHORT, PLAIN-TEXT RÉSUMÉ. `text/plain` is in the uploader's own `ACCEPT` list.
 * ⚠⚠ **SHORT ON PURPOSE:** every run is a real paid model read (`E546` measured
 * $0.004–0.008), and load-bearing rule 9 is explicit that dev-time spend is not free. This is
 * two reads per build, not a sweep.
 * ⚠⚠⚠ **THE CONTENT IS DISTINCTIVE SO AN ASSERTION CANNOT PASS ON DATA THAT WAS ALREADY
 * THERE** — the same reason `wizard-contract.spec.ts` uses a stamp.
 */
const RESUME = `E721 WALK PERSONA
Senior Oracle Procurement Consultant

EXPERIENCE
Zelphar Systems — Lead Procurement Consultant
01/2019 - 12/2023
Led Oracle Fusion Procurement rollouts. Purchase Orders, Supplier Registration.

Quorvex Industries — Procurement Analyst
03/2015 - 12/2018
Sourcing and Negotiations across EBS.

EDUCATION
University of Zelphar — BSc Information Systems, 2014

SKILLS
Purchase Orders, Supplier Registration, Negotiations, Sourcing, Inventory Management

LANGUAGES
English, Afrikaans
`;

type Fingerprint = Record<string, number | string | boolean | null>;

async function resetPersona(): Promise<{ profileId: string; personId: string }> {
  const prisma = db();
  /* ⚠ TORN DOWN FIRST, NOT LAST — a previous run that failed mid-way must not let this one
     measure against its leftovers. The same order `wizard-contract.spec.ts` uses. */
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, person: { select: { id: true } } },
  });
  if (existing?.person) await prisma.person.delete({ where: { id: existing.person.id } });
  if (existing) await prisma.user.delete({ where: { id: existing.id } });

  /* ⚠ BORROWED COMPANY AND SITE — this walk is about the IMPORT, not company binding. */
  const host = await prisma.person.findFirst({
    where: { company_id: { not: undefined } },
    select: { company_id: true, site_id: true },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  if (!host) throw new Error("no Person to borrow a company/site from");

  const user = await prisma.user.create({
    data: {
      email: EMAIL,
      password_hash: await bcrypt.hash(PASSWORD, 10),
      email_verified: new Date(),
      first_name: "Upload",
      last_name: "Walk",
    },
    select: { id: true },
  });
  const person = await prisma.person.create({
    data: {
      user_id: user.id,
      first_name: "Upload",
      last_name: "Walk",
      is_service_provider: true,
      company_id: host.company_id,
      site_id: host.site_id,
    },
    select: { id: true },
  });
  const profile = await prisma.providerProfile.create({
    data: { person_id: person.id, status: "ACTIVE", currency: "USD" },
    select: { id: true },
  });
  return { profileId: profile.id, personId: person.id };
}

/** ⚠ Everything the import can write, counted for ONE profile. */
async function fingerprint(profileId: string, personId: string): Promise<Fingerprint> {
  const p = db();
  const [
    employers, projects, education, certifications, skills, languages, specs, imports,
  ] = await Promise.all([
    p.employer.count({ where: { provider_profile_id: profileId } }),
    p.project.count({ where: { provider_profile_id: profileId } }),
    p.education.count({ where: { provider_profile_id: profileId } }),
    p.certification.count({ where: { provider_profile_id: profileId } }),
    p.providerSkill.count({ where: { provider_profile_id: profileId } }),
    p.language.count({ where: { provider_profile_id: profileId } }),
    p.providerProfileSpecialization.count({ where: { provider_profile_id: profileId } }),
    p.profileImport.count({ where: { provider_profile_id: profileId } }),
  ]);
  const prof = await p.providerProfile.findUnique({
    where: { id: profileId },
    select: { overview: true, profile_method: true, completeness: true },
  });
  const person = await p.person.findUnique({
    where: { id: personId },
    select: { title: true },
  });
  return {
    employers, projects, education, certifications, skills, languages, specs, imports,
    /* ⚠ PRESENCE, NOT CONTENT — the model's exact prose varies between reads and would make
       a byte comparison fail for a reason that has nothing to do with this change. */
    overviewSet: Boolean(prof?.overview),
    profileMethod: prof?.profile_method ?? null,
    completeness: prof?.completeness ?? null,
    personTitleSet: Boolean(person?.title),
  };
}

async function teardown() {
  const prisma = db();
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, person: { select: { id: true } } },
  });
  if (existing?.person) await prisma.person.delete({ where: { id: existing.person.id } });
  if (existing) await prisma.user.delete({ where: { id: existing.id } });
}

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.waitForSelector('input[type="email"]');
  await page.waitForTimeout(1200);
  await page.click('input[type="email"]');
  await page.type('input[type="email"]', EMAIL, { delay: 5 });
  await page.click('input[type="password"]');
  await page.type('input[type="password"]', PASSWORD, { delay: 5 });
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
    page.click('button[type="submit"]'),
  ]);
  expect(res.ok(), `sign-in returned ${res.status()}`).toBe(true);
  await page.waitForURL((u) => new URL(u).pathname !== "/login", { timeout: 20_000 }).catch(() => {});
}

/**
 * Upload through the browser with EXACTLY the form fields the wizard sends.
 *
 * ⚠⚠⚠ **THE WIZARD SENDS `file` AND `source` AND NOTHING ELSE** — `ResumeUploadModal` appends
 * `mode` only when it is `"store-only"`, so a default upload puts no extra field on the wire.
 * ⚠ Driving the real modal would add wizard-navigation flakiness to a measurement about the
 * ROUTE; this issues the identical request from the signed-in page instead, which is what the
 * modal's `XMLHttpRequest` does.
 */
async function upload(
  page: import("@playwright/test").Page,
  text: string,
  mode: "wizard-default" | "store-only"
) {
  return page.evaluate(
    async ([body, m]) => {
      const form = new FormData();
      form.append("file", new File([body as string], "e721-walk.txt", { type: "text/plain" }));
      form.append("source", "RESUME");
      if (m === "store-only") form.append("mode", "store-only");
      const r = await fetch("/api/onboarding/provider/import", { method: "POST", body: form });
      const j = await r.json().catch(() => ({}));
      return { status: r.status, applied: j.applied ?? null, hasState: Boolean(j.state), importStatus: j.status ?? null, error: j.error ?? null };
    },
    [text, mode] as const
  );
}

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

test("E721 item 2 — a WIZARD-DEFAULT upload on a fresh sign-up (the before/after fingerprint)", async ({
  browser,
}) => {
  const { profileId, personId } = await resetPersona();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await signIn(page);

  const before = await fingerprint(profileId, personId);
  const res = await upload(page, RESUME, "wizard-default");
  const after = await fingerprint(profileId, personId);

  const report = {
    label: "WIZARD DEFAULT (no mode field — exactly what join/provider sends)",
    httpStatus: res.status,
    importStatus: res.importStatus,
    hasState: res.hasState,
    applied: res.applied,
    before,
    after,
  };
  console.log(`\n══════ E721 · WIZARD FINGERPRINT ══════\n${JSON.stringify(report, null, 2)}`);
  writeFileSync(join(OUT, "wizard-fingerprint.json"), JSON.stringify(report, null, 2));

  /*
    ⚠⚠⚠ THESE ASSERT THE WIZARD STILL *WORKS*, WHICH IS TRUE ON BOTH SIDES. ⚠ The
    before/after comparison is the fingerprint file, not an assertion — a test that hard-coded
    trunk's numbers would be asserting a snapshot of the model's output, which varies per read.
  */
  expect(res.status, "the wizard's own upload stopped returning 200").toBe(200);
  expect(res.importStatus, "the read failed — this measures nothing").toBe("PARSED");
  /* ⚠ `state` IS WHAT THE WIZARD CALLS `hydrate()` WITH. Losing it would break the step. */
  expect(res.hasState, "the response lost `state`, which the wizard hydrates from").toBe(true);
  /* ⚠⚠ AND IT APPLIED: a default upload must still WRITE, or the wizard silently stops
     capturing anything. This is the assertion that would have caught a default flipped the
     wrong way. */
  expect(after.employers as number, "a default upload wrote no employers").toBeGreaterThan(0);
  expect(after.imports as number, "no ProfileImport row was written").toBeGreaterThan(0);

  await page.close();
  await teardown();
});

test("E721 item 2 — a STORE-ONLY upload writes the document and NOTHING else", async ({
  browser,
}) => {
  const { profileId, personId } = await resetPersona();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await signIn(page);

  const before = await fingerprint(profileId, personId);
  const res = await upload(page, RESUME, "store-only");
  const after = await fingerprint(profileId, personId);

  const report = {
    label: "STORE-ONLY (mode=store-only)",
    httpStatus: res.status,
    importStatus: res.importStatus,
    applied: res.applied,
    before,
    after,
  };
  console.log(`\n══════ E721 · STORE-ONLY FINGERPRINT ══════\n${JSON.stringify(report, null, 2)}`);
  writeFileSync(join(OUT, "store-only-fingerprint.json"), JSON.stringify(report, null, 2));

  expect(res.status, "store-only did not return 200").toBe(200);
  expect(res.importStatus, "the read failed — this measures nothing").toBe("PARSED");

  /*
    ── ⚠⚠⚠ THE DOCUMENT LANDS; THE PROFILE DOES NOT ─────────────────────────────────────

    ⚠ The `ProfileImport` row is REQUIRED — the preview reads `raw_text` back off it, and the
    apply route requires `parsed` non-null. ⚠⚠ Without it the whole point (upload → preview)
    would produce a preview of nothing.
  */
  expect(after.imports as number, "store-only wrote no ProfileImport row to preview from").toBe(
    (before.imports as number) + 1
  );

  /* ⚠⚠⚠ AND EVERY PROFILE COUNTER IS UNMOVED. This is the item. */
  for (const k of [
    "employers", "projects", "education", "certifications", "skills", "languages", "specs",
  ] as const) {
    expect(after[k], `store-only WROTE ${k} — it must write nothing to the profile`).toBe(before[k]);
  }
  expect(after.overviewSet, "store-only wrote an overview").toBe(before.overviewSet);
  expect(after.personTitleSet, "store-only wrote Person.title").toBe(before.personTitleSet);
  expect(after.profileMethod, "store-only wrote profile_method").toBe(before.profileMethod);
  /* ⚠⚠ COMPLETENESS IS THE PROOF `recomputeCompleteness` DID NOT RUN. */
  expect(after.completeness, "store-only recomputed completeness").toBe(before.completeness);

  /* ⚠ AND THE RECEIPT IS HONEST: every `applied` counter is zero, because nothing was
     applied. A non-zero one here would mean the route reported writes it did not make. */
  const applied = (res.applied ?? {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(applied)) {
    if (typeof v === "number") {
      expect(v, `applied.${k} is ${v} on a store-only run — it must be 0`).toBe(0);
    }
    if (typeof v === "boolean") {
      expect(v, `applied.${k} is true on a store-only run`).toBe(false);
    }
  }

  await page.close();
  await teardown();
});
