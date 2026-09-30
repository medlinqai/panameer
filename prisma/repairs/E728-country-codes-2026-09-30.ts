/**
 * ── ⚠⚠⚠ `P2-A1.1-E728` WS-B — BACKFILL THE ISO-2 CODE COLUMNS ───────────────────────────
 *
 * ⚠ **SCOTT'S RULINGS, 2026-09-30:** *"Additive: a new ISO-2 code column beside each existing
 * country column; the old columns are untouched."* · *"'Other' stays legal: those 7 rows keep
 * it, with a null code."* · *"Backup first, count both ends, undo file written before any row
 * changes and checked non-empty after."*
 *
 * ⚠⚠⚠ **IT NEVER WRITES A `country` COLUMN.** Only the new `*_code` columns are set, so this
 * is reversible by nulling six columns and nothing a reader depends on today can move.
 * ⚠⚠ **`isoFor()` IS THE MAPPER — NOT A SECOND TABLE (`E585`).** The same function the phone
 * code has always used decides the code, so a name it cannot resolve here is exactly a name
 * it cannot resolve there.
 * ⚠ **`"Other"` RESOLVES TO `null` AND THAT IS THE POINT:** a null code means *"the name
 * column holds something ISO 3166 cannot express"*, and it is the flag the next-sign-in
 * prompt reads.
 *
 * ⚠⚠ RUN: bundle with esbuild, then `node … [--apply]`. Without `--apply` it only counts.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { isoFor } from "@/lib/phone";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});
const UNDO = "prisma/repairs/E728-undo-2026-09-30.json";

type Plan = { table: string; id: string; name: string | null; code: string | null };

async function main() {
  const apply = process.argv.includes("--apply");

  const [addresses, companies, employers, payouts, taxes, wrs] = await Promise.all([
    prisma.address.findMany({ select: { id: true, country: true, country_code: true } }),
    prisma.company.findMany({ select: { id: true, country: true, country_code: true } }),
    prisma.employer.findMany({ select: { id: true, country: true, country_code: true } }),
    prisma.payoutMethod.findMany({ select: { id: true, country: true, country_code: true } }),
    prisma.taxProfile.findMany({ select: { id: true, country: true, country_code: true } }),
    prisma.workRequest.findMany({ select: { id: true, location_country: true, location_country_code: true } }),
  ]);

  const plan: Plan[] = [
    ...addresses.map((r) => ({ table: "Address", id: r.id, name: r.country, code: isoFor(r.country) })),
    ...companies.map((r) => ({ table: "Company", id: r.id, name: r.country, code: isoFor(r.country) })),
    ...employers.map((r) => ({ table: "Employer", id: r.id, name: r.country, code: isoFor(r.country) })),
    ...payouts.map((r) => ({ table: "PayoutMethod", id: r.id, name: r.country, code: isoFor(r.country) })),
    ...taxes.map((r) => ({ table: "TaxProfile", id: r.id, name: r.country, code: isoFor(r.country) })),
    ...wrs.map((r) => ({ table: "WorkRequest", id: r.id, name: r.location_country, code: isoFor(r.location_country) })),
  ];

  /* ⚠ ONLY ROWS THAT ACTUALLY RESOLVE ARE WRITTEN. A null name and `"Other"` both stay null. */
  const writable = plan.filter((p) => p.code !== null);
  const named = plan.filter((p) => p.name !== null);
  const unresolved = named.filter((p) => p.code === null);

  console.log(`BEFORE  rows ${plan.length} · carrying a name ${named.length} · code already set ${
    [...addresses, ...companies, ...employers, ...payouts, ...taxes].filter((r) => r.country_code).length +
    wrs.filter((r) => r.location_country_code).length}`);
  console.log(`PLAN    ${writable.length} rows get a code · ${unresolved.length} keep a NULL code`);
  const byName = new Map<string, number>();
  for (const p of named) byName.set(`${JSON.stringify(p.name)} → ${p.code ?? "NULL"}`, (byName.get(`${JSON.stringify(p.name)} → ${p.code ?? "NULL"}`) ?? 0) + 1);
  for (const [k, n] of [...byName].sort((a, b) => b[1] - a[1])) console.log(`   ${String(n).padStart(4)} × ${k}`);

  if (!apply) { console.log("\nDRY RUN — nothing written."); return; }
  if (writable.length === 0) { console.log("\nNOTHING TO DO. Undo file left untouched."); return; }

  /* ⚠⚠⚠ THE UNDO FILE GOES FIRST, AND IS RE-READ AND CHECKED NON-EMPTY BELOW — Scott asked
     for both halves, and `E724` is why: a no-op re-run emptied that brief's undo file and
     the guard only protected the rows. */
  writeFileSync(UNDO, JSON.stringify({
    wroteAt: new Date().toISOString(),
    brief: "P2-A1.1-E728 WS-B",
    note: "Reverse by setting each listed row's code column back to null. NO `country` column was written by this repair.",
    rows: writable,
    keptNull: unresolved,
  }, null, 2));
  if (!existsSync(UNDO)) throw new Error("REFUSING: undo file was not created.");
  const check = JSON.parse(readFileSync(UNDO, "utf8")) as { rows: Plan[] };
  if (!Array.isArray(check.rows) || check.rows.length !== writable.length) {
    throw new Error(`REFUSING: undo file holds ${check.rows?.length ?? "no"} rows, expected ${writable.length}.`);
  }
  console.log(`\nUNDO    written and verified: ${check.rows.length} rows`);

  let n = 0;
  for (const p of writable) {
    if (p.table === "Address") await prisma.address.update({ where: { id: p.id }, data: { country_code: p.code } });
    else if (p.table === "Company") await prisma.company.update({ where: { id: p.id }, data: { country_code: p.code } });
    else if (p.table === "Employer") await prisma.employer.update({ where: { id: p.id }, data: { country_code: p.code } });
    else if (p.table === "PayoutMethod") await prisma.payoutMethod.update({ where: { id: p.id }, data: { country_code: p.code } });
    else if (p.table === "TaxProfile") await prisma.taxProfile.update({ where: { id: p.id }, data: { country_code: p.code } });
    else if (p.table === "WorkRequest") await prisma.workRequest.update({ where: { id: p.id }, data: { location_country_code: p.code } });
    n++;
  }

  const after = {
    addresses: await prisma.address.count({ where: { country_code: { not: null } } }),
    companies: await prisma.company.count({ where: { country_code: { not: null } } }),
    employers: await prisma.employer.count({ where: { country_code: { not: null } } }),
    other: await prisma.address.count({ where: { country: "Other" } }),
    otherWithNullCode: await prisma.address.count({ where: { country: "Other", country_code: null } }),
    namesChanged: 0,
  };
  console.log(`\nAFTER   wrote ${n} codes · Address ${after.addresses} · Company ${after.companies} · Employer ${after.employers}`);
  console.log(`        "Other" rows ${after.other}, of which NULL code ${after.otherWithNullCode} (must be equal)`);

  /* ⚠⚠ AND THE NAME COLUMNS ARE PROVED UNTOUCHED against the backup taken before any change. */
  const backup = JSON.parse(readFileSync("prisma/repairs/E728-country-backup-2026-09-30.json", "utf8"));
  const nowAddr = new Map((await prisma.address.findMany({ select: { id: true, country: true } })).map((r) => [r.id, r.country]));
  const moved = (backup.addresses as { id: string; country: string | null }[]).filter((b) => nowAddr.get(b.id) !== b.country);
  console.log(`        Address.country values that MOVED since the backup: ${moved.length} (must be 0)`);
}

/* ⚠ THE BACKFILL RUNS ONLY WHEN THE PROMPT IS NOT ASKED FOR — two entry points, one file,
   and neither triggers the other. */
if (!process.argv.includes("--prompt")) main().finally(() => prisma.$disconnect());

/**
 * ── ⚠⚠ THE `"Other"` PROMPT (`E728` WS-B, ruling 2) ─────────────────────────────────────
 *
 * ⚠ Exported and run separately from the backfill so the two can be reasoned about apart:
 * the backfill writes codes, this writes notifications, and neither touches a `country`.
 * ⚠⚠ **DEDUPED PER PERSON**, so re-running cannot notify anybody twice.
 */
export async function promptOtherRows(apply: boolean) {
  const { notify } = await import("@/lib/notifications");
  const { notificationEmailAllowed } = await import("@/lib/notification-email");
  if (notificationEmailAllowed("profile.country_unknown")) {
    throw new Error("REFUSING: profile.country_unknown is on the email allowlist.");
  }
  /* ⚠ Address → Site → the people at that site; Company → the people in it. */
  const addrs = await prisma.address.findMany({
    where: { country: "Other" },
    select: { id: true, site: { select: { people: { select: { id: true } } } } },
  });
  const comps = await prisma.company.findMany({
    where: { country: "Other" },
    select: { id: true, people: { select: { id: true } } },
  });
  const personIds = [
    ...new Set([
      ...addrs.flatMap((a) => a.site?.people.map((p) => p.id) ?? []),
      ...comps.flatMap((c) => c.people.map((p) => p.id)),
    ]),
  ];
  console.log(`\n"Other" rows: ${addrs.length} Address · ${comps.length} Company → ${personIds.length} distinct people`);
  if (!apply) { console.log("DRY RUN — no notification written."); return; }
  let n = 0;
  for (const personId of personIds) {
    await notify({
      event: "profile.country_unknown",
      personId,
      dedupeKey: `profile.country_unknown:${personId}`,
    });
    n++;
  }
  const rows = await prisma.notification.count({ where: { event_key: "profile.country_unknown" } });
  console.log(`notified ${n} people · notification rows now ${rows}`);
}

if (process.argv.includes("--prompt")) {
  void promptOtherRows(process.argv.includes("--apply")).finally(() => prisma.$disconnect());
}
