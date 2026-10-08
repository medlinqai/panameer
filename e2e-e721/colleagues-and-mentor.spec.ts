import { test, expect } from "@playwright/test";
import { signInAsSeeded } from "../e2e-shell/_auth";
import { db } from "../e2e-shell/_db";
import bcrypt from "bcryptjs";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ── ⚠⚠⚠ `E721` ITEMS 1 AND 3 ────────────────────────────────────────────────────────────
 *
 * ⚠ **THE PERSONA IS `test4@panameer.com` — Michael Star, who has EXACTLY ONE COLLEAGUE**
 * (Dana Whitfield). ⚠⚠ That is deliberate: Scott's report is *"'tom' shows All (1) and no
 * result"*, and a viewer with one colleague is the shape that produces it.
 * ⚠⚠⚠ **`Tomas Herrera` IS A REAL MEMBER WHO IS *NOT* ONE OF HIS COLLEAGUES**, so the three
 * screenshots Scott asked for are a colleague, a non-colleague member, and nobody — with real
 * data rather than a contrived fixture.
 */
const OUT = join(process.cwd(), "e2e-e721", "shots");
const VIEWER = "test4@panameer.com";
const COLLEAGUE_NEEDLE = "Dana";
const MEMBER_NEEDLE = "Tomas";
const NOBODY_NEEDLE = "zzqqxx";

/** ⚠ A throwaway target for the mentor proof. `@example.seed` cannot receive mail. */
const MENTOR_EMAIL = "e721.mentor.target@example.seed";

test.beforeAll(() => mkdirSync(OUT, { recursive: true }));

async function readState(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const chips = [...document.querySelectorAll("button[aria-pressed]")].map((b) =>
      (b.textContent ?? "").replace(/\s+/g, " ").trim()
    );
    const roster = document.querySelectorAll(".pm-member-row").length;
    const others = document.querySelector("[data-e721-others]");
    const otherRows = others ? others.querySelectorAll(".pm-member-row").length : 0;
    return {
      chips,
      rosterRows: roster - otherRows,
      othersHeading: others
        ? (others.querySelector("h2")?.textContent ?? "").replace(/\s+/g, " ").trim()
        : null,
      otherRows,
      otherNames: others
        ? [...others.querySelectorAll(".pm-member-row p")]
            .map((p) => (p.textContent ?? "").trim())
            .filter((t) => t.length > 0)
            .slice(0, 6)
        : [],
      otherButtons: others
        ? [...others.querySelectorAll("button")].map((b) => (b.textContent ?? "").trim())
        : [],
      emptyLine: others ? (others.querySelector("p")?.textContent ?? "").trim() : null,
    };
  });
}

test("E721 item 1 — the chips follow the search, and strangers appear below the roster", async ({
  browser,
}) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });
  await signInAsSeeded(page, VIEWER);
  await page.goto("/connect/connections", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2200);

  const idle = await readState(page);
  console.log(`\n══ E721 ITEM 1 · no query ══\n   chips: ${idle.chips.join("  ")}  · roster rows: ${idle.rosterRows}`);
  /* ⚠⚠ THE DEFAULT VIEW IS UNCHANGED — the strangers list must not exist until somebody
     types. This is the assertion that keeps `E558`'s scoping ruling intact. */
  expect(idle.othersHeading, "the strangers list rendered with no query").toBeNull();

  /* ── (1) A COLLEAGUE'S NAME ─────────────────────────────────────────────────────────── */
  await page.fill('input[aria-label="Search your colleagues"]', COLLEAGUE_NEEDLE);
  await page.waitForTimeout(1400);
  const a = await readState(page);
  console.log(`\n══ E721 · searching a COLLEAGUE'S name ("${COLLEAGUE_NEEDLE}") ══`);
  console.log(`   chips: ${a.chips.join("  ")}\n   roster rows: ${a.rosterRows} · others: ${a.otherRows}`);
  await page.screenshot({ path: join(OUT, "search-colleague.png"), fullPage: true });
  expect(a.rosterRows, "a colleague's own name found nothing in the roster").toBeGreaterThan(0);
  /* ⚠⚠⚠ THE DEFECT ITSELF: the `All` chip must equal the number of roster rows shown. */
  expect(a.chips[0], `All does not match the ${a.rosterRows} rows shown`).toContain(
    `(${a.rosterRows})`
  );

  /* ── (2) A NON-COLLEAGUE MEMBER'S NAME — THE CASE SCOTT REPORTED ────────────────────── */
  await page.fill('input[aria-label="Search your colleagues"]', MEMBER_NEEDLE);
  await page.waitForTimeout(1600);
  const b = await readState(page);
  console.log(`\n══ E721 · searching a NON-COLLEAGUE MEMBER'S name ("${MEMBER_NEEDLE}") ══`);
  console.log(`   chips: ${b.chips.join("  ")}`);
  console.log(`   roster rows: ${b.rosterRows}`);
  console.log(`   heading: ${b.othersHeading}`);
  console.log(`   other rows: ${b.otherRows} → ${b.otherNames.join(" | ")}`);
  console.log(`   their controls: ${b.otherButtons.join(", ")}`);
  await page.screenshot({ path: join(OUT, "search-member.png"), fullPage: true });

  /* ⚠⚠⚠ (a) THE CHIP TELLS THE TRUTH. Before this brief it read `All (1)` here. */
  expect(b.chips[0], "the All chip still counts the unsearched roster").toContain("(0)");
  expect(b.rosterRows, "a non-colleague appeared in the roster").toBe(0);
  /* ⚠⚠⚠ (b) AND THE STRANGER IS OFFERED, WITH A REAL CONTROL. */
  expect(b.othersHeading, "no 'Other members matching' section").toContain(MEMBER_NEEDLE);
  expect(b.otherRows, "the member search found nobody it should have").toBeGreaterThan(0);
  expect(
    b.otherButtons.join(" "),
    "the stranger row offers no way to connect"
  ).toContain("Connect as Colleague");

  /* ── (3) A NAME THAT MATCHES NOBODY ─────────────────────────────────────────────────── */
  await page.fill('input[aria-label="Search your colleagues"]', NOBODY_NEEDLE);
  await page.waitForTimeout(1600);
  const c = await readState(page);
  console.log(`\n══ E721 · searching a name that matches NOBODY ("${NOBODY_NEEDLE}") ══`);
  console.log(`   chips: ${c.chips.join("  ")}\n   roster rows: ${c.rosterRows} · others: ${c.otherRows}`);
  console.log(`   line: ${c.emptyLine}`);
  await page.screenshot({ path: join(OUT, "search-nobody.png"), fullPage: true });
  expect(c.chips[0], "All is non-zero for a query that matches nobody").toContain("(0)");
  expect(c.otherRows, "a query that matches nobody returned rows").toBe(0);
  /* ⚠ A REAL ZERO IS SAID OUT LOUD (counting rule 2) rather than leaving a blank space. */
  expect(c.emptyLine ?? "", "no sentence explains the empty result").toMatch(/matches that/i);

  await page.close();
});

test("E721 item 3 — followMentor refuses a member who has not opted in, and allows one who has", async ({
  browser,
}) => {
  const prisma = db();
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await signInAsSeeded(page, VIEWER);

  /*
    ── ⚠⚠⚠ BOTH DIRECTIONS, BECAUSE ONE DIRECTION IS NOT A PROOF (ruling 90) ─────────────

    ⚠ A refusal on its own is satisfied by a route that refuses EVERYTHING. ⚠⚠ So this
    measures a CLOSED target (must fail) and an OPEN one (must succeed), and the only
    difference between them is the column.
  */
  const closed = await prisma.providerProfile.findFirst({
    where: { open_for_mentoring: false, person: { user: { isNot: null } } },
    select: { person: { select: { user_id: true, first_name: true, last_name: true } } },
  });
  expect(closed?.person.user_id, "no closed provider to test against").toBeTruthy();

  const post = (toUserId: string, action: "mentor" | "unmentor") =>
    page.evaluate(
      async ([id, act]) => {
        const r = await fetch("/api/community/connections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: act, toUserId: id }),
        });
        return { status: r.status, body: (await r.text()).slice(0, 160) };
      },
      [toUserId, action] as const
    );

  const refused = await post(closed!.person.user_id!, "mentor");
  console.log(
    `\n══ E721 ITEM 3 · CLOSED target (${closed!.person.first_name} ${closed!.person.last_name}) ══\n` +
      `   POST mentor → ${refused.status} ${refused.body}`
  );
  expect(refused.status, "a closed provider could still be followed as a mentor").toBe(403);
  expect(refused.body, "the refusal gives no reason").toMatch(/accepting mentees/i);
  /* ⚠⚠ AND NO ROW WAS WRITTEN. A 403 that still wrote would be the worst of both. */
  const leaked = await prisma.connection.count({
    where: { kind: "MENTOR", to_user_id: closed!.person.user_id! },
  });
  console.log(`   MENTOR rows against that closed target: ${leaked}`);
  expect(leaked, "the refusal still created a MENTOR row").toBe(0);

  /* ── THE OPEN DIRECTION, on a throwaway target that is deleted at the end ───────────── */
  const existing = await prisma.user.findUnique({
    where: { email: MENTOR_EMAIL },
    select: { id: true, person: { select: { id: true } } },
  });
  if (existing?.person) await prisma.person.delete({ where: { id: existing.person.id } });
  if (existing) await prisma.user.delete({ where: { id: existing.id } });

  const host = await prisma.person.findFirst({
    where: { company_id: { not: undefined } },
    select: { company_id: true, site_id: true },
    orderBy: [{ created_at: "asc" }, { id: "asc" }],
  });
  const openUser = await prisma.user.create({
    data: {
      email: MENTOR_EMAIL,
      password_hash: await bcrypt.hash("Panameer123", 10),
      email_verified: new Date(),
      first_name: "Open",
      last_name: "Mentor",
    },
    select: { id: true },
  });
  const openPerson = await prisma.person.create({
    data: {
      user_id: openUser.id,
      first_name: "Open",
      last_name: "Mentor",
      is_service_provider: true,
      company_id: host!.company_id,
      site_id: host!.site_id,
    },
    select: { id: true },
  });
  await prisma.providerProfile.create({
    data: {
      person_id: openPerson.id,
      status: "ACTIVE",
      currency: "USD",
      /* ⚠⚠⚠ THE ONE FIELD THAT DIFFERS FROM THE CLOSED CASE. */
      open_for_mentoring: true,
    },
  });

  const allowed = await post(openUser.id, "mentor");
  console.log(
    `══ E721 ITEM 3 · OPEN target (open_for_mentoring = true) ══\n` +
      `   POST mentor → ${allowed.status} ${allowed.body}`
  );
  expect(allowed.status, "an OPEN provider could not be followed — the rule refuses everything").toBe(200);
  const wrote = await prisma.connection.count({
    where: { kind: "MENTOR", to_user_id: openUser.id },
  });
  console.log(`   MENTOR rows against the open target: ${wrote}`);
  expect(wrote, "the allowed follow wrote no row").toBe(1);

  /* ⚠ TORN DOWN. The MENTOR row cascades with the user. */
  await prisma.person.delete({ where: { id: openPerson.id } });
  await prisma.user.delete({ where: { id: openUser.id } });
  const after = await prisma.connection.count({ where: { kind: "MENTOR" } });
  console.log(`   MENTOR rows left in the database afterwards: ${after}`);
  expect(after, "the throwaway follow was left behind").toBe(0);

  await page.close();
});

/**
 * ── ⚠⚠ ITEM 1c — ALREADY BUILT, SO IT IS VERIFIED RATHER THAN REBUILT ────────────────────
 *
 * ⚠ **SCOTT: *"Invite a Colleague with an email that already belongs to a member says so and
 * offers the colleague request."*** ⚠⚠ **`E525` SHIPPED THIS.** The route answers a known
 * address with **200 and the member's card** — deliberately not a 409 and not an `error` key,
 * *"nothing the client can paint red"* — and `InviteColleagueClient` renders `MemberRow` plus
 * `ConnectControls`.
 * ⚠⚠⚠ **A CODE READ IS NOT A MEASUREMENT.** This drives the real form, because "it is already
 * built" is exactly the claim that deserves evidence before it goes in a report.
 */
test("E721 item 1c — inviting an address that is already a member offers the colleague request", async ({
  browser,
}) => {
  const prisma = db();
  /* ⚠ A REAL MEMBER WHO IS NOT THE VIEWER AND NOT ALREADY A COLLEAGUE — resolved at runtime,
     never typed in, so this cannot pass against a stale fixture. */
  const viewer = await prisma.user.findFirst({
    where: { email: { equals: VIEWER, mode: "insensitive" } },
    select: { id: true },
  });
  const target = await prisma.user.findFirst({
    where: {
      id: { not: viewer!.id },
      email: { not: { contains: "example" } },
      person: { isNot: null },
      connectionsSent: { none: {} },
      connectionsReceived: { none: {} },
    },
    select: { email: true, person: { select: { first_name: true, last_name: true } } },
  });
  expect(target?.email, "no unconnected member to invite").toBeTruthy();

  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await signInAsSeeded(page, VIEWER);
  await page.goto("/connect/invite", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  await page.fill('input[type="email"]', target!.email);
  /*
    ⚠⚠⚠ THE FORM IS TWO STEPS AND THE FIRST CLICK DOES NOT POST. ⚠ A first version of this
    test clicked `submit` once, landed on the *"Send this invitation?"* confirm panel, and
    asserted against a page that had never called the route — **it failed on correct code**,
    which is ruling 10 in a test I wrote myself.
    ⚠⚠ **CLICKING THROUGH IS SAFE FOR THIS CASE SPECIFICALLY:** the address belongs to a
    member (it is resolved from `prisma.user` above), so `E525`'s branch answers 200 with their
    card and **writes nothing and sends nothing** — asserted below. `MAIL_CAPTURE` is set.
  */
  await page.click('button[type="submit"]');
  await page.waitForTimeout(900);
  await page.getByRole("button", { name: /send invitation/i }).click();
  await page.waitForTimeout(2500);

  const seen = await page.evaluate(() => {
    const body = (document.body.innerText ?? "").replace(/\s+/g, " ");
    return {
      saysAlready: /already on Panameer/i.test(body),
      buttons: [...document.querySelectorAll("button")].map((b) => (b.textContent ?? "").trim()),
      /* ⚠ AND NOTHING RED — `E525`'s ruling is that this is an ANSWER, not a warning. */
      red: document.querySelectorAll('[class*="red-"]').length,
    };
  });
  console.log(
    `\n══ E721 ITEM 1c · inviting ${target!.person!.first_name} ${target!.person!.last_name} ══\n` +
      `   says "already on Panameer": ${seen.saysAlready}\n` +
      `   controls offered: ${seen.buttons.filter(Boolean).join(", ")}\n` +
      `   red/error elements: ${seen.red}`
  );
  await page.screenshot({ path: join(OUT, "invite-already-member.png"), fullPage: true });

  expect(seen.saysAlready, "it does not say the address already belongs to a member").toBe(true);
  expect(
    seen.buttons.join(" "),
    "it says they are a member but offers no colleague request"
  ).toContain("Connect as Colleague");
  expect(seen.red, "the already-a-member answer is painted as an error").toBe(0);

  /* ⚠⚠ AND NOTHING WAS WRITTEN — no invitation row, no email. `E525`: "NOTHING WAS WRITTEN
     getting here." */
  const invites = await prisma.colleagueInvite.count({
    /* ⚠ THE COLUMN IS `invitee_email`, READ OFF THE SCHEMA — `email` does not exist on this
       model and the compiler said so. */
    where: { invitee_email: { equals: target!.email, mode: "insensitive" } },
  });
  console.log(`   ColleagueInvite rows for that address: ${invites}`);
  expect(invites, "an invitation was written for somebody who is already a member").toBe(0);

  await page.close();
});
