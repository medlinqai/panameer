import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { signIn } from "./_auth";
import { db } from "./_db";
import { GATE_PROVIDER_EMAIL } from "./_persona";

/**
 * ── ⚠⚠⚠ EVERY FIGURE ON `/community` IS A COUNT, NOT A LITERAL (`P2-A3-E601`)
 *
 * ⚠ SCOTT, 2026-09-22, WS-A item 4: *"for the Community page, assert that each
 * printed figure matches a direct database count for the signed-in persona, and
 * that no figure is a literal in the source. Count > 0 (`E586`). **This is the
 * assertion that was missing.**"*
 *
 * ── ⚠⚠ WHY IT EXISTS, AND IT IS NOT THE REASON THE BRIEF GAVE ─────────────
 *
 * ⚠ The brief was written against a screenshot showing `Level 3 · 340 XP · #4`
 * and *"Raj Bhatt just joined from your invite"* on `/community`. ⚠⚠⚠ THE
 * PREMISE CHECK FOUND NONE OF IT ON THE PAGE — every one of those strings lives
 * in `community_page_2026-09-20.html`, the MOCKUP, and `Raj Bhatt` appears
 * nowhere in `src/` at all. **The screenshot was of the mockup.**
 * ⚠⚠ SO THIS GATE GUARDS A DEFECT THAT NEVER SHIPPED, AND THAT IS THE POINT:
 * the page was right by care rather than by construction, and nothing would have
 * said so if it stopped being right. ⚠ Scott's rulings, recorded in the brief:
 * **there is no XP in Panameer**, and **a mockup's names and numbers are
 * illustration — nothing renders unless it was counted.**
 *
 * ── ⚠⚠⚠ THE TWO HALVES ARE DIFFERENT KINDS OF ASSERTION, ON PURPOSE ───────
 *
 * ⚠ **§1 RENDERS THE REAL PAGE AND RECONCILES IT TO THE DATABASE.** It proves
 * the figures are TRUE for the signed-in persona. ⚠⚠ It cannot prove they were
 * COMPUTED — a hardcoded `8` would pass while Priya happens to have 8.
 * ⚠ **§2 SCANS THE SOURCE FOR LITERALS.** It proves they are not typed in. ⚠⚠
 * It cannot prove they are RIGHT — a real query returning a wrong number passes.
 * ⚠⚠⚠ NEITHER HALF IS SUFFICIENT AND THAT IS WHY BOTH ARE HERE. The mockup
 * defect would have been caught by §2; a broken query only by §1.
 *
 * ── ⚠⚠⚠ WHAT THIS GATE CANNOT PROVE, MEASURED, NOT ASSUMED ────────────────
 *
 * ⚠ **IT CANNOT CATCH THE `E601` WS-A DEFECT ITSELF — the legend printing the
 * DRAWN counts instead of the TOTALS.** ⚠⚠ THE GATE PERSONA'S COMMUNITY IS NOT
 * BIG ENOUGH TO BE CAPPED: 8 joined, 1 invited, 4 reachable, `overflow` zero on
 * all three, so drawn and total are the SAME NUMBERS and every assertion here
 * agrees either way. ⚠ **PROVED BY MUTATION:** reverting `nJ` to the drawn count
 * left this suite fully green.
 * ⚠⚠⚠ **THAT HALF IS HELD IN `community-web.spec.ts`**, whose fabricated payload
 * IS capped — 14 joined drawn with `overflow.joined: 3` — so the legend must
 * read 17 while 36 of 39 nodes are drawn. ⚠ The same mutation fails there
 * loudly: `Expected "17 joined…" Received "14 joined…"`.
 * ⚠⚠ **RECORDED RATHER THAN PAPERED OVER, AND DELIBERATELY NOT FIXED BY SEEDING
 * THE PERSONA A BIGGER NETWORK:** her counts are quoted by other gates and by
 * the briefs, and `E569`'s ruling is that row counts are not moved to make a
 * gate convenient. ⚠ A fixture proves the CAPPED case; the live page proves the
 * TRUE case. Neither can do the other's job.
 *
 * ⚠ **NO WRITES.** `/community` is not a profile, so `E598`'s view-row rule does
 * not bite — and this gate creates no rows at all, so there is nothing to tear
 * down. ⚠ It reads the SAME persona every other shell gate signs in as.
 */

const PAGE = join("src", "app", "(app)", "community", "page.tsx");
const WEB = join("src", "components", "community", "CommunityWeb.tsx");
const RAIL = join("src", "components", "community", "CommunityRail.tsx");
const CARDS = join("src", "components", "community", "ColleagueCards.tsx");

/** ⚠ Comments are stripped before scanning — the house rule quotes superseded
    code (`E164`), and a quoted literal is not a rendered one. This is the same
    guard `check:community` and `check:derived-source` carry, for the same
    reason, and without it every `E164` block in these files is a false hit. */
const strip = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");

const source = (p: string) => strip(readFileSync(p, "utf8"));

test.describe("E601/WS-A — the Community page's figures", () => {
  test("⚠⚠⚠ every figure on /community matches a direct database count", async ({ page }) => {
    const prisma = db();
    try {
      /* ── the direct counts, computed here and owed nothing by the page ──
         ⚠⚠ DELIBERATELY NOT `getCommunityWeb()`. Importing the app's own
         function would make this a test that the function equals itself. The
         queries below are written from the RULE — an accepted COLLEAGUE edge, a
         pending invite, a colleague-of-a-colleague — so a change to the app's
         query has to be a change to the RULE to keep this green. */
      const me = await prisma.person.findFirst({
        where: { user: { email: GATE_PROVIDER_EMAIL } },
        select: { id: true, user_id: true },
      });
      expect(me?.user_id, "the gate persona must exist and hold a user").toBeTruthy();
      const meUser = me!.user_id!;

      const firstRows = await prisma.connection.findMany({
        where: {
          kind: "COLLEAGUE",
          status: "ACCEPTED",
          OR: [{ from_user_id: meUser }, { to_user_id: meUser }],
        },
        select: { from_user_id: true, to_user_id: true },
      });
      const firstIds = [
        ...new Set(firstRows.map((r) => (r.from_user_id === meUser ? r.to_user_id : r.from_user_id))),
      ];
      const expectJoined = firstIds.length;

      const expectInvited = await prisma.colleagueInvite.count({
        where: { inviter_person_id: me!.id, status: "PENDING" },
      });

      const secondRows = firstIds.length
        ? await prisma.connection.findMany({
            where: {
              kind: "COLLEAGUE",
              status: "ACCEPTED",
              OR: [{ from_user_id: { in: firstIds } }, { to_user_id: { in: firstIds } }],
            },
            select: { from_user_id: true, to_user_id: true },
          })
        : [];
      /* ⚠⚠ ONE NODE PER PERSON, however many paths reach them — the `E537`
         sum-versus-union mistake, in a picture. `community-web.ts` dedupes the
         same way; this re-derives it rather than trusting it. */
      const firstSet = new Set(firstIds);
      const reach = new Set<string>();
      for (const r of secondRows) {
        for (const [via, cand] of [
          [r.from_user_id, r.to_user_id],
          [r.to_user_id, r.from_user_id],
        ] as const) {
          if (!firstSet.has(via)) continue;
          if (cand === meUser || firstSet.has(cand)) continue;
          reach.add(cand);
        }
      }
      const expectReachable = reach.size;

      /* ⚠⚠ `E586` — A GATE WITH NO INPUTS MUST FAIL. If the persona's community
         were empty, every assertion below would compare 0 to 0 and pass while
         proving nothing. ⚠ This is the assertion that makes the rest mean
         something, so it comes FIRST and it is not optional. */
      expect(
        expectJoined + expectInvited + expectReachable,
        "E586: the persona has no community, so this gate would pass vacuously"
      ).toBeGreaterThan(0);

      await signIn(page);
      await page.goto("/community");
      await page.waitForSelector(".pm-web-key", { timeout: 30_000 });

      const legend = (await page.locator(".pm-web-key").innerText()).replace(/\s+/g, " ").trim();
      console.log(
        `E601/WS-A  legend "${legend}" vs DB joined=${expectJoined} invited=${expectInvited} reachable=${expectReachable}`
      );

      /* ⚠⚠⚠ THE LEGEND IS THE NETWORK, SO IT IS COMPARED TO THE TOTALS — not to
         whatever the picture had room to draw. That is the `E601` WS-A fix and
         this is what holds it. */
      expect(legend, "joined must be the TOTAL, not the drawn subset").toContain(
        `${expectJoined} joined`
      );
      expect(legend).toContain(`${expectInvited} invited`);
      expect(legend).toContain(`${expectReachable} reachable`);

      /* ⚠ AND THE PICTURE'S OWN LINE IS PRESENT AND IS ABOUT THE DRAWING — a
         separate fact, in its own words, never sharing a numeral with the
         legend. ⚠⚠ It must exist whenever anything was drawn, including when
         nothing overflowed: a line that appears only on overflow leaves "how
         much of my network is this?" answered only sometimes. */
      const more = page.locator(".pm-web-more");
      await expect(more, "the picture must always state what it drew").toHaveCount(1);
      expect((await more.innerText()).toLowerCase()).toContain("drawn");
    } finally {
      await db().$disconnect().catch(() => {});
    }
  });

  test("⚠⚠ no figure on the Community page is a literal in the source", async () => {
    /* ⚠⚠⚠ THE SHAPE, NOT A NAME LIST (`E587`). It scans the four files that
       render the page for a JSX text node that is a bare number — `>8<`, or a
       string like `"3 joined"`. A count reaches the screen as `{expression}`,
       never as typed digits, so ANY digit in rendered text is the defect.
       ⚠ Counted first (`E586`): the scan must actually have files to read. */
    const files = [PAGE, WEB, RAIL, CARDS];
    expect(files.length, "E586: nothing to scan").toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const f of files) {
      const src = source(f);
      expect(src.length, `E586: ${f} read as empty`).toBeGreaterThan(0);

      /* ⚠ A JSX text node holding digits, e.g. `>12 joined<`. ⚠⚠ It must NOT
         match `>{n} joined<` — an expression is exactly what we want, and the
         `{}` exclusion is what distinguishes them. */
      for (const m of src.matchAll(/>[^<>{}]*\b\d+\b[^<>{}]*</g)) {
        const text = m[0].slice(1, -1).trim();
        /*
          ⚠⚠⚠ A REGEX CANNOT PARSE JSX, AND THE FIRST VERSION OF THIS PROVED IT:
          it flagged `page.colleagues.length > 0 && (`, because `>` and `<` are
          also COMPARISON OPERATORS. Three false positives, all real code.
          ⚠⚠ SO THE MATCH IS NARROWED TO SOMETHING THAT CAN ONLY BE PROSE: word
          characters, spaces and sentence punctuation. Any JS operator —
          `&& || = ( ) ; ? :` — disqualifies it, because rendered text does not
          contain them and a comparison always does.
          ⚠ IT COSTS NOTHING IN COVERAGE: the defect this gate exists to catch
          is a typed-in count like `>3 joined<` or a bare `>8<`, and both are
          prose. ⚠⚠ THE TRADE IS DELIBERATE AND IS RECORDED RATHER THAN HIDDEN —
          a literal smuggled in beside an operator would not be seen here, and
          §1 is what catches that: it would no longer match the database.
        */
        if (!/^[\w\s,.·'’—–-]+$/.test(text)) continue;
        offenders.push(`${f}: >${text}<`);
      }
      /* ⚠⚠ AND A COUNT-SHAPED STRING LITERAL — `"3 joined"`, `'6 reachable'`.
         ⚠ The words are the four this page counts, so a version string or a
         `max-w-5xl` cannot trip it. */
      for (const m of src.matchAll(
        /["'`]\s*\d+\s+(joined|invited|reachable|colleagues?|members?)\b[^"'`]*["'`]/gi
      )) {
        offenders.push(`${f}: ${m[0]}`);
      }
    }

    console.log(
      `E601/WS-A  scanned ${files.length} files for rendered numeric literals — ${offenders.length} found`
    );
    expect(offenders, offenders.join("\n")).toEqual([]);
  });
});
