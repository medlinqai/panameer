// /**
//  * `npm run check:stats-live`.
//  *
//  *
//  * NUMBERS ARE THE SAME NUMBER, and it cannot exercise a branch no seeded
//  * persona reaches.
//  * front branch is seeded and rendered, not merely asserted."*
//  *
//  *
//  * scoped teardown, and it removes exactly what it wrote."*
//  * forbid this gate creating the handful of rows it needs and deleting **those
//  * rows, by id**, afterwards.
//  * by a `where` that describes the rows, because a describing delete can match
//  * something it did not create. That is the `wipe:connection-graph` discipline.
//  * leaves rows behind on failure is a gate that poisons the next run.
//  *
//  *
//  * "some counted activity AND no history" — all 14 sampled are either all-zero
//  * (action back, face up) or have invite history (trend back), so `creditLine`'s
//  * non-empty branch never runs on live data.
//  * was created this month, so `90 Days` and `YTD` cannot be told apart on live
//  * data by anything except bucket arithmetic. One row dated in January makes the
//  * two periods genuinely different.
//  */
// import { chromium, type Page } from "playwright";
// import { prisma } from "@/lib/prisma";
// 
// const BASE = process.env.STATS_LIVE_BASE ?? "http://localhost:3199";
// const PASSWORD = "Panameer123";
// 
// let pass = 0;
// const failures: string[] = [];
// const check = (name: string, ok: boolean, detail = "") => {
//   if (ok) {
//     pass++;
//     console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
//   } else {
//     failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
//     console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
//   }
// };
// 
// const wroteInvites: string[] = [];
// const wroteConnections: string[] = [];
// 
// async function signIn(page: Page, email: string) {
//   await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
//   await page.waitForSelector('input[type="email"]');
//   await page.waitForTimeout(800);
//   await page.click('input[type="email"]');
//   await page.type('input[type="email"]', email, { delay: 4 });
//   await page.click('input[type="password"]');
//   await page.type('input[type="password"]', PASSWORD, { delay: 4 });
//   await Promise.all([
//     page.waitForResponse((r) => r.url().includes("/api/auth/callback/credentials")),
//     page.click('button[type="submit"]'),
//   ]);
//   await page.waitForTimeout(1000);
// }
// 
// /**
//  * away. A sweep that read only the visible faces would miss exactly the
//  * duplicates a flip introduces, which is how `Proposals Sent` came to render as
//  * both `0` and a dash without anybody noticing.
//  * for a `visibility: hidden` node, so every hidden figure would vanish and the
//  */
// const SWEEP = `(() => {
//   const isFigure = (t) => /^(\\u2014|\\$?[\\d,]+(\\.\\d+)?%?)$/.test(t);
//   const out = [];
//   for (const el of document.querySelectorAll("p,span,strong,div,td")) {
//     if (el.children.length) continue;
//     const t = (el.textContent || "").trim();
//     if (!t || !isFigure(t)) continue;
//     let label = "", n = el;
//     for (let i = 0; i < 4 && n && !label; i++) {
//       n = n.parentElement;
//       if (!n) break;
//       const ts = [...n.querySelectorAll("p,span,strong,dt,h2,h3")]
//         .filter((x) => !x.children.length)
//         .map((x) => (x.textContent || "").trim())
//         .filter((x) => x && !isFigure(x));
//       if (ts.length) label = ts[0];
//     }
//     const flip = el.closest(".pm-flip");
//     out.push({
//       value: t,
//       label: label.slice(0, 44),
//       where: el.closest(".pm-hive") ? "hive" : flip ? "card" : "old",
//       cell: el.closest(".pm-hive-cell")?.dataset.cell ?? null,
//     });
//   }
//   return out;
// })()`;
// 
// async function main() {
//   const browser = await chromium.launch();
//   try {
//     /* ── the persona, chosen BY SHAPE from the database ──────────────────── */
//     const person = await prisma.person.findFirst({
//       where: { user: { email: "sw_user17@straterp.com" } },
//       select: { id: true, user_id: true, user: { select: { email: true } } },
//     });
//     if (!person?.user_id) throw new Error("the fixture persona was not found");
// 
//     const before = await prisma.colleagueInvite.count({
//       where: { inviter_person_id: person.id },
//     });
//     check(
//       before === 0,
//       `${before} existing invitations`
//     );
// 
//     const ctx = await browser.newContext({ viewport: { width: 390, height: 900 } });
//     const page = await ctx.newPage();
//     await signIn(page, person.user!.email);
// 
//     /* ── 3 · THE CREDITED-FRONT BRANCH, SEEDED AND RENDERED ──────────────── */
//     /**
//      * via an ACCEPTED invitation) with NO history in the trend window — so the
//      * card shows its FRONT, and its back is the ACTION back carrying a real
//      * credit line rather than "Nothing counted on this card yet."
//      * makes the series empty while the figure is not.
//      */
//     const longAgo = new Date(new Date().getFullYear(), 0, 15);
//     const seeded = await prisma.colleagueInvite.create({
//       data: {
//         inviter_person_id: person.id,
//            so even if something later tried to mail this row, the transport
//            refuses it: a gate's fixture must never be able to send real mail. */
//         expires_at: new Date(Date.now() + 86_400_000),
//         status: "PENDING",
//         created_at: longAgo,
//       },
//       select: { id: true },
//     });
//     wroteInvites.push(seeded.id);
// 
//     /*
// 
//       passed the gate, because every compared figure was `0` and any two zeros
//       row, not one of the four honeycomb HEADLINES (`Profile Views`,
//       `Colleagues`, `Lessons Completed`, `Work Orders`), so the comparison was
//       still four zeros against four zeros.
//       CELL VISIBLE. The vacuity guard below fails if it ever stops doing so.
//       exists; the teardown removes it by id, so that is measured in seconds and
//       reversed exactly.
//     */
//     /*
//       pointed at the WRONG FIELD still drew the right number, and the mutation
//       DISTINGUISHABLE and a mis-pointed cell is visible. **A fixture has to make
//       the values it compares differ, or the comparison is decoration.**
//     */
//     const counterparts = await prisma.user.findMany({
//       where: { email: { in: ["sw_user16@straterp.com", "sw_user15@straterp.com"] } },
//       select: { id: true },
//     });
//     if (counterparts.length !== 2) throw new Error("the counterpart personas were not found");
//     for (const c of counterparts) {
//       const conn = await prisma.connection.create({
//         data: {
//           from_user_id: person.user_id,
//           to_user_id: c.id,
//           kind: "COLLEAGUE",
//           status: "ACCEPTED",
//         },
//         select: { id: true },
//       });
//       wroteConnections.push(conn.id);
//     }
//     check(
//       wroteInvites.length === 1,
//       wroteInvites[0]
//     );
// 
// 
//     /* ── 1 · NO FIGURE RENDERS AS BOTH A NUMBER AND A DASH ───────────────── */
//     await page.goto(`${BASE}/stats`, { waitUntil: "networkidle" });
//     await page.waitForTimeout(600);
//     const rows: { value: string; label: string; where: string; cell: string | null }[] =
//       await page.evaluate(SWEEP);
// 
//     const kinds = new Map<string, Set<string>>();
//     for (const r of rows) {
//       if (!r.label) continue;
//       const k = kinds.get(r.label) ?? new Set<string>();
//       k.add(r.value === "—" ? "dash" : "number");
//       kinds.set(r.label, k);
//     }
//     const both = [...kinds].filter(([, k]) => k.size > 1).map(([l]) => l);
//     check(
//       both.length === 0,
//       both.length ? `both: ${both.join(" · ")}` : `${kinds.size} distinct labels`
//     );
// 
//     /* ── 2 · THE CELL AND THE CARD READ ONE VALUE ────────────────────────── */
//     /**
//      * asserted, not assumed: the gate proves the cell and the card read the
//      * same value, rather than skipping them."*
//      */
//     const pairs: [string, string][] = [
//       ["profile", "Profile Views"],
//       ["network", "Colleagues"],
//       ["learning", "Lessons Completed"],
//       ["work", "Work Orders"],
//     ];
//     let compared = 0;
//     for (const [cell, cardLabel] of pairs) {
//       const cellRow = rows.find((r) => r.cell === cell);
//          THEN RETURNS THE BARE FRONT WITH NO `.pm-flip` WRAPPER — correctly, by
//          at all, and keying on that classification silently dropped one of the
//          four pairs while the count still read 3. */
//       const cardRow = rows.find((r) => r.where !== "hive" && r.label === cardLabel);
//       if (!cellRow || !cardRow) {
//         console.log(
//         );
//         continue;
//       }
//       compared++;
//       check(
//         cellRow.value === cardRow.value,
//         `${cellRow.value} vs ${cardRow.value}`
//       );
//     }
//     check(
//       compared === pairs.length,
//       `${compared}/${pairs.length} compared`
//     );
//     /*
//       DIFFERENT field passed this gate, because every figure on the page was
//       COUNT — four comparisons ran, all of them vacuous.
//       its neighbours are 0, which is what makes a mis-pointed cell visible.
//     */
//     const nonZero = pairs
//       .map(([cell]) => rows.find((r) => r.cell === cell))
//       .filter((r) => r && r.value !== "0" && r.value !== "\u2014");
//     check(
//       nonZero.length > 0,
//     );
// 
//     /*
//       enough: with `Colleagues` = 1 and `Invites Sent` = 1, a cell pointed at
//       GUARD THAT MAKES MUTATION 2 FAIL — it fails the gate if the fixture ever
//       stops distinguishing the two fields it exists to tell apart.
//     */
//     const colleaguesRow = rows.find((r) => r.where !== "hive" && r.label === "Colleagues");
//     const invitesRow = rows.find((r) => r.where !== "hive" && r.label === "Invites Sent");
//     check(
//       !!colleaguesRow && !!invitesRow && colleaguesRow.value !== invitesRow.value,
//       `Colleagues=${colleaguesRow?.value} · Invites Sent=${invitesRow?.value}`
//     );
// 
// 
//     await page.goto(`${BASE}/stats?period=90d`, { waitUntil: "networkidle" });
//     await page.waitForTimeout(500);
//     const credit = await page.evaluate(() => {
//       const f = [...document.querySelectorAll(".pm-flip")].find((x) =>
//         [...x.querySelectorAll("h2")].some((h) => h.textContent?.trim() === "Your Network")
//       );
//       if (!f) return null;
//       const faces = f.querySelector(".pm-flip-faces")!;
//       return {
//         showing: (f as HTMLElement).dataset.showing,
//       };
//     });
//     check(
//       !!credit && /1 invitation sent/.test(credit.backText),
//       credit ? credit.backText.slice(0, 90) : "no network card"
//     );
//     check(
//       !!credit && !/Nothing counted on this card yet/.test(credit.backText),
//       "the empty branch is not the one that ran"
//     );
// 
//     /* ── 4 · PERIOD WINDOWING, ON A SEEDED DATED ROW ─────────────────────── */
//     /**
//      * database was created THIS MONTH, so `90 Days` and `YTD` cover the same
//      * it falls OUTSIDE the 13-week window and INSIDE year-to-date.
//      * THE SAME MINUTE — which is exactly what a working window does and what a
//      * period control that only moves a pill cannot.
//      */
//     /**
//      * the data picks the ACTION back, which is the rule the cards have carried
//      * since correction 3. **The gate was asserting a shape the design does not
//      * produce.**
//      * member, in the same minute, gets a card with NO history at 90 days and a
//      * drawn line at year-to-date. Live data cannot show that, because every
//      * dated row in the database was created this month.
//      */
//     const readBack = async (period: string) => {
//       await page.waitForTimeout(400);
//          inside one `evaluate`, so it read the DOM React had not re-rendered yet
//          and reported the FRONT face as if it were the back. */
//       await page.evaluate(() => {
//         const f = [...document.querySelectorAll(".pm-flip")].find((x) =>
//           [...x.querySelectorAll("h2")].some((h) => h.textContent?.trim() === "Your Network")
//         );
//         if (f && (f as HTMLElement).dataset.showing === "front") {
//           f.querySelector<HTMLButtonElement>(".pm-flip-toggle")?.click();
//         }
//       });
//       await page.waitForTimeout(450);
//       return page.evaluate(() => {
//         const f = [...document.querySelectorAll(".pm-flip")].find((x) =>
//           [...x.querySelectorAll("h2")].some((h) => h.textContent?.trim() === "Your Network")
//         );
//         if (!f) return null;
//         const faces = f.querySelector(".pm-flip-faces")!;
//         const vis = [...faces.children].find(
//           (c) => getComputedStyle(c).visibility !== "hidden"
//         ) as HTMLElement | undefined;
//         const svg = vis?.querySelector("svg[role='img']");
//         const text = vis?.textContent?.replace(/\s+/g, " ").trim() ?? "";
//         return {
//           showing: (f as HTMLElement).dataset.showing,
//           kind: svg ? "trend" : /Invite a Colleague/.test(text) ? "action" : "other",
//           points: svg ? svg.querySelectorAll("circle").length : 0,
//           label: svg?.getAttribute("aria-label") ?? null,
//           text: text.slice(0, 80),
//         };
//       });
//     };
//     const d90 = await readBack("90d");
//     const ytd = await readBack("ytd");
//     check(
//       !!d90 && d90.showing === "back" && d90.kind === "action",
//       d90 ? `${d90.kind} back · ${d90.text}` : "no back face"
//     );
//     check(
//       !!ytd && ytd.kind === "trend" && /1 in total/.test(ytd.label ?? ""),
//       ytd ? `${ytd.kind} back · ${ytd.points} points · ${ytd.label}` : "no back face"
//     );
//     check(
//       !!d90 && !!ytd && d90.kind !== ytd.kind,
//       `90d=${d90?.kind} vs ytd=${ytd?.kind}`
//     );
// 
//     await ctx.close();
//   } finally {
//     /*
//       match rows this run did not write, including a row left by a crashed
//       earlier run that somebody is mid-way through investigating.
//     */
//     if (wroteConnections.length) {
//       const removed = await prisma.connection.deleteMany({
//         where: { id: { in: wroteConnections } },
//       });
//       if (removed.count !== wroteConnections.length) {
//       }
//     }
//     if (wroteInvites.length) {
//       const removed = await prisma.colleagueInvite.deleteMany({
//         where: { id: { in: wroteInvites } },
//       });
//       if (removed.count !== wroteInvites.length) {
//         failures.push(`teardown removed ${removed.count} of ${wroteInvites.length}`);
//       }
//       const left = await prisma.colleagueInvite.count({ where: { id: { in: wroteInvites } } });
//       if (left !== 0) failures.push(`${left} seeded rows survived teardown`);
//     }
//     await browser.close();
//   }
// }
// 
// main()
//   .then(async () => {
//     if (failures.length) {
//       console.error(`\ncheck:stats-live — ${failures.length} FAILED, ${pass} passed\n`);
//       for (const f of failures) console.error(`  ✗ ${f}`);
//       process.exit(1);
//     }
//     console.log(`check:stats-live — ${pass}/${pass} passed`);
//     process.exit(0);
//   })
//   .catch(async (e) => {
//     console.error("check:stats-live — ERRORED", e);
//     process.exit(1);
//   });
// 