import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

/**
 * WS-0 ACCEPTANCE, as a command (brief_per_job_skill_model).
 *
 *   npm run check:catalog
 *
 * The brief's WS-0 acceptance is four claims about the database, and "I looked
 * at the seed output" is not a check — the seed reports what it MEANT to write.
 * This reads back what is actually there, and exits non-zero if any claim
 * fails, so it can gate a push instead of being re-verified by eye each time.
 *
 * The one claim that matters most is the third. Role is DERIVED from a job's
 * skills in this model; a skill name owned by two roles makes that derivation a
 * coin flip, and it would fail silently — a provider tagged Technology-Specific
 * on the strength of a module that was really an application one.
 */

const EXPECT = {
  app: 302,
  tech: 264,
  opsProject: 101,
  capabilityDomains: 85,
};

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  const fails: string[] = [];
  const ok = (label: string, pass: boolean, detail: string) => {
    console.log(`  ${pass ? "PASS" : "FAIL"}  ${label} — ${detail}`);
    if (!pass) fails.push(label);
  };

  try {
    const roles = await prisma.roleType.findMany({ select: { id: true, name: true } });
    const idOf = (n: string) => roles.find((r) => r.name === n)?.id ?? "";

    const count = (name: string) =>
      prisma.skill.count({ where: { role_type_id: idOf(name), is_custom: false } });

    const app = await count("Application-Specific");
    const tech = await count("Technology-Specific");
    const ops = await count("Operations-Specific");
    const proj = await count("Project-Specific");

    console.log("\nWS-0 — v5 catalog\n");
    /*
      302 AND 264, NOT the brief's 326 and 266.

      Those two numbers are the raw row counts of the two vendor sheets, and
      they cannot coexist with the brief's own cleanup instruction: 24 of the
      326 App rows are the dual-role analytics/developer names the same
      paragraph says must exist only under Technology-Specific. Removing them
      leaves 302. The Tech sheet separately lists two rows twice over (Change
      Impact Analyzer, Business Process Security Policies), leaving 264.

      Where a count and a property disagree, the property wins — unambiguous
      skill→role is what the derivation depends on, and 326 is just how many
      lines the spreadsheet happens to have.
    */
    ok("App-Specific modules", app === EXPECT.app, `${app} (sheet 326 − 24 dual-role)`);
    ok("Technology-Specific tools", tech === EXPECT.tech, `${tech} (sheet 266 − 2 exact dupes)`);
    ok("Ops + Project capabilities", ops + proj === EXPECT.opsProject, `${ops} + ${proj} = ${ops + proj}`);

    // --- the property the model depends on ---------------------------------
    const named = await prisma.skill.findMany({
      where: { is_custom: false },
      select: { name: true, role_type_id: true },
    });
    const rolesByName = new Map<string, Set<string>>();
    for (const s of named) {
      rolesByName.set(s.name, (rolesByName.get(s.name) ?? new Set()).add(s.role_type_id));
    }
    const vendorIds = new Set([idOf("Application-Specific"), idOf("Technology-Specific")]);
    const crossVendor = [...rolesByName.entries()].filter(
      ([, ids]) => [...ids].filter((i) => vendorIds.has(i)).length > 1
    );
    ok(
      "no skill name spans App and Tech",
      crossVendor.length === 0,
      crossVendor.length ? crossVendor.map(([n]) => n).join(", ") : "0 collisions"
    );

    /*
      The six App/Ops overlaps are REPORTED, not failed. "Project Costing" is a
      real Oracle module and a real generic capability; they are different
      things that share a word. The brief says Ops/Project are unchanged, and
      the parser's vocabulary is vendor-only (aliases exist on vendor rows
      alone), so role derivation never sees the Ops reading.
    */
    const agnosticIds = new Set([idOf("Operations-Specific"), idOf("Project-Specific")]);
    const vendorVsAgnostic = [...rolesByName.entries()].filter(
      ([, ids]) =>
        [...ids].some((i) => vendorIds.has(i)) && [...ids].some((i) => agnosticIds.has(i))
    );
    console.log(
      `  NOTE  ${vendorVsAgnostic.length} name(s) exist as both a vendor module and an agnostic ` +
        `capability — by design: ${vendorVsAgnostic.map(([n]) => n).join(", ")}`
    );

    // --- aliases + category -------------------------------------------------
    const appNoAlias = await prisma.skill.count({
      where: { role_type_id: idOf("Application-Specific"), is_custom: false, aliases: { isEmpty: true } },
    });
    const techWithCategory = await prisma.skill.count({
      where: { role_type_id: idOf("Technology-Specific"), is_custom: false, NOT: { category: null } },
    });
    ok(
      "vendor skills carry aliases",
      app - appNoAlias > 0,
      `${app - appNoAlias}/${app} App modules have at least one alias`
    );
    ok(
      "tech tools carry a category",
      techWithCategory > 0,
      `${techWithCategory}/${tech} tools categorised`
    );

    // --- buyer vocabulary ---------------------------------------------------
    const caps = await prisma.capabilityDomain.count();
    const bridge = await prisma.capabilityModuleBridge.count();
    const bridgeLinked = await prisma.capabilityModuleBridge.count({ where: { NOT: { skill_id: null } } });
    ok("capability domains seeded", caps === EXPECT.capabilityDomains, `${caps}`);
    ok("bridge seeded and mostly linked", bridge > 0 && bridgeLinked / bridge > 0.9,
      `${bridgeLinked}/${bridge} rows resolve to a Skill`);

    console.log(
      fails.length ? `\n${fails.length} FAILED: ${fails.join(", ")}\n` : "\nAll WS-0 checks passed.\n"
    );
    if (fails.length) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
