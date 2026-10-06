import { mkdirSync, writeFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { autoLinkSameLetters, likelyDomain, NEW_SKILL_WHERE } from "@/lib/catalog-review";
import { formatSkillName, sameLetters } from "@/lib/skill-match";

// Skill catalog cleanup (2026-10-06, Scott-approved). Dry run writes a CSV; --apply writes the rows.
// Usage: tsx scripts/catalog-cleanup.ts <aliases|samematch|case> [--apply]
const step = process.argv[2];
const apply = process.argv.includes("--apply");
const csv = (rows: (string | number)[][]) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(",")).join("\n") + "\n";
const out = (name: string, rows: (string | number)[][]) => {
  if (rows.length < 2) return `docs/catalog/${name} (nothing to change — file left as is)`;
  mkdirSync("docs/catalog", { recursive: true });
  writeFileSync(`docs/catalog/${name}`, csv(rows));
  return `docs/catalog/${name}`;
};

// Row 1: "procure" finds the whole Oracle procurement area.
const PROCUREMENT_DOMAINS = ["Oracle Fusion Cloud", "Oracle E-Business Suite", "PeopleSoft"];
const PROCUREMENT_AREA = /purchas|sourcing|negotiation|supplier|iprocurement|isupplier|requisition|receiving|catalog|punch-?out|spend classification/i;

async function aliases() {
  const skills = await prisma.skill.findMany({
    where: { pillar: { name: { in: PROCUREMENT_DOMAINS } }, status: "ACTIVE" },
    select: { id: true, name: true, aliases: true, pillar: { select: { name: true } } },
    orderBy: [{ pillar: { name: "asc" } }, { name: "asc" }],
  });
  const hit = skills.filter(
    (s) => PROCUREMENT_AREA.test(s.name) && !/procure/i.test(s.name) && !s.aliases.some((a) => a.toLowerCase() === "procurement")
  );
  const path = out("aliases_procurement_2026-10-06.csv", [["skill_id", "domain", "skill", "aliases_before", "aliases_after"], ...hit.map((s) => [s.id, s.pillar!.name, s.name, s.aliases.join(" · "), [...s.aliases, "procurement"].join(" · ")])]);
  if (apply) for (const s of hit) await prisma.skill.update({ where: { id: s.id }, data: { aliases: [...s.aliases, "procurement"] } });
  console.log(`aliases ${apply ? "APPLIED" : "dry run"} — ${hit.length} skills get "procurement" → ${path}`);
}

// Row 2: waiting member terms spelled the same as a Shown catalog entry are linked to it.
async function samematch() {
  const [waiting, shown, specs, liveSpecs] = await Promise.all([
    prisma.skill.findMany({ where: NEW_SKILL_WHERE, select: { id: true, name: true, pillar_id: true } }),
    prisma.skill.findMany({ where: { status: "ACTIVE", visible_to_members: true, pillar_id: { not: null }, review_pending: false, merged_into_id: null }, select: { name: true, pillar_id: true, pillar: { select: { name: true } } } }),
    prisma.specialization.findMany({ where: { origin: "PROVIDER", status: "SUGGESTED" }, select: { id: true, name: true } }),
    prisma.specialization.findMany({ where: { status: "ACTIVE" }, select: { name: true } }),
  ]);
  const rows: (string | number)[][] = [["kind", "member_term", "catalog_match", "action"]];
  for (const w of waiting) {
    const m = shown.filter((c) => sameLetters(c.name) === sameLetters(w.name));
    if (!m.length) continue;
    const domain = w.pillar_id ?? (await likelyDomain(w.id));
    const pick = m.find((c) => c.pillar_id === domain);
    rows.push(["skill", w.name, m.map((c) => `${c.name} (${c.pillar?.name})`).join(" | "), pick ? `link → ${pick.pillar?.name}` : "keep for review (match is in another domain)"]);
  }
  for (const w of specs) {
    const m = liveSpecs.find((c) => sameLetters(c.name) === sameLetters(w.name));
    if (m) rows.push(["specialization", w.name, m.name, "link"]);
  }
  const path = out("same_letter_matches_2026-10-06.csv", rows);
  // --only=Name,Name limits the apply to terms checked by hand (live profiles).
  const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7).split(",");
  const onlyIds = only ? (await prisma.skill.findMany({ where: { ...NEW_SKILL_WHERE, name: { in: only } }, select: { id: true } })).map((x) => x.id) : undefined;
  const linked = apply ? await autoLinkSameLetters(onlyIds ? { skills: onlyIds, specs: [] } : undefined) : [];
  console.log(`samematch ${apply ? `APPLIED — ${linked.length} auto-linked` : `dry run — ${rows.filter((r) => String(r[3]).startsWith("link")).length} would link`} → ${path}`);
}

// Row 3: case-only re-casing of every skill and specialization name (letters asserted identical per row).
async function recase() {
  const [skills, specs] = await Promise.all([
    prisma.skill.findMany({ select: { id: true, name: true, origin: true } }),
    prisma.specialization.findMany({ select: { id: true, name: true, origin: true } }),
  ]);
  const rows: (string | number)[][] = [["table", "id", "origin", "old", "new", "result"]];
  let done = 0;
  for (const [table, list] of [["skills", skills], ["specializations", specs]] as const) {
    for (const r of list) {
      const next = formatSkillName(r.name);
      if (next === r.name) continue;
      if (next.toLowerCase() !== r.name.toLowerCase()) throw new Error(`letters changed: "${r.name}" → "${next}"`);
      let result = "dry run";
      if (apply) {
        try {
          if (table === "skills") await prisma.skill.update({ where: { id: r.id }, data: { name: next } });
          else await prisma.specialization.update({ where: { id: r.id }, data: { name: next } });
          result = "applied";
          done++;
        } catch {
          result = "skipped — same name already exists in that domain";
        }
      }
      rows.push([table, r.id, r.origin, r.name, next, result]);
    }
  }
  const path = out("capitalization_2026-10-06.csv", rows);
  console.log(`case ${apply ? `APPLIED — ${done} re-cased` : `dry run — ${rows.length - 1} would change`} → ${path}`);
}

const steps: Record<string, () => Promise<void>> = { aliases, samematch, case: recase };
(async () => {
  if (!steps[step]) throw new Error(`step must be one of ${Object.keys(steps).join(", ")}`);
  await steps[step]();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
