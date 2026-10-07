import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { basename, join } from "node:path";

// Résumé parser benchmark (2026-10-07). Runs the real read path on every sample résumé for one config.
// Usage: npx tsx --env-file=.env.local scripts/resume-bench.ts <A|B|C>   (A gpt-5-nano · B gpt-5-mini · C Claude Sonnet)
// Real CVs are read in place; results go only to .harness/resume-bench/ (gitignored). No DB writes.
const SAMPLES = "../../1. Project Documents/2. Design/06. Resume Samples for Parser";
const OUT = process.env.BENCH_OUT || ".harness/resume-bench";
const SKIP = /contract|invoice|\bPIS\b|PISS|\bPDS\b|bank|matrix|picture|photo|MSC-|SOW-/i;
// $ per million tokens (in, out): list prices; the env price applies to every provider, so the bench sets its own.
const CONFIGS = {
  A: { model: "gpt-5-nano", price: [0.05, 0.4] },
  B: { model: "gpt-5-mini", price: [0.25, 2.0] },
  C: { model: "claude-sonnet", price: [3.0, 15.0] },
} as const;

const cfgKey = (process.argv[2] ?? "A").toUpperCase() as keyof typeof CONFIGS;
const cfg = CONFIGS[cfgKey];
if (!cfg) throw new Error("config must be A, B or C");
if (cfgKey === "C") {
  delete process.env.RESUME_PARSER_API_KEY;
  delete process.env.RESUME_PARSER_MODEL;
} else process.env.RESUME_PARSER_MODEL = cfg.model;
process.env.RESUME_PARSER_PRICE_IN_PER_M = String(cfg.price[0]);
process.env.RESUME_PARSER_PRICE_OUT_PER_M = String(cfg.price[1]);

function walk(d: string, out: string[] = []) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(docx|doc|pdf)$/i.test(e) && !SKIP.test(p)) out.push(p);
  }
  return out;
}
const csv = (v: unknown) => {
  const t = String(v ?? "");
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};
const junk = (skills: string[]) => skills.filter((s) => s.replace(/[^A-Za-z]/g, "").length <= 2 || /^(and|&)\s/i.test(s) || s.split(/\s+/).length > 8 || /[.!?]$/.test(s.trim()));

(async () => {
  const { extractText, mimeFromName } = await import("@/lib/resume/extract");
  const { readDocument } = await import("@/lib/resume/import");
  const { parseEngagementTables, engagementsToProjects } = await import("@/lib/resume/engagements");
  const { buildCompanyList, normCompany, notACompany } = await import("@/lib/resume/company-list");
  const { cleanParsedResume, catalogKey } = await import("@/lib/resume/cleanup");
  const { prisma } = await import("@/lib/prisma");
  const { OFFERABLE } = await import("@/lib/catalog");
  const catalog = new Set((await prisma.skill.findMany({ where: OFFERABLE, select: { name: true } })).map((x) => catalogKey(x.name)));
  mkdirSync(join(OUT, "json"), { recursive: true });
  const scorecard = join(OUT, "scorecard.csv");
  if (!existsSync(scorecard)) writeFileSync(scorecard, "file,config,reader,seconds,usd,employers,projects,skills,certifications,education,junk_skills,companies,text_chars,notes\n");
  const files = walk(SAMPLES).sort();
  console.log(`config ${cfgKey} (${cfg.model}) — ${files.length} résumés`);
  for (const f of files) {
    const name = f.slice(SAMPLES.length + 1);
    let text = "";
    let note = "";
    try {
      text = await extractText(readFileSync(f), mimeFromName(f) ?? "", basename(f));
    } catch (e) {
      note = `extract failed: ${e instanceof Error ? e.message : e}`;
    }
    if (text && text.length < 1500) note = `short text (${text.length} chars)`;
    const t0 = Date.now();
    let row: (string | number)[];
    try {
      if (!text) throw new Error(note || "no text");
      const read = await readDocument(text, null);
      const parsed = read.parsed;
      const engagements = parseEngagementTables(text);
      if (engagements.length) {
        const clients = new Set(engagements.map((e) => normCompany(e.client)));
        parsed.experiences = parsed.experiences.filter((x) => x.employer && !clients.has(normCompany(x.employer)) && !notACompany(x.employer));
        parsed.projects = engagementsToProjects(engagements);
        parsed.skills = [...new Set([...parsed.skills, ...engagements.flatMap((e) => e.skills)])];
      }
      cleanParsedResume(parsed, text, catalog);
      const companies = buildCompanyList(engagements, read.inventory ?? [], parsed);
      const secs = (Date.now() - t0) / 1000;
      const usd = read.usage ? (read.usage.inputTokens / 1e6) * cfg.price[0] + (read.usage.outputTokens / 1e6) * cfg.price[1] : 0;
      const reader = read.path.reader === "ai" ? `ai:${read.path.model}` : `heuristic(${read.path.reason ?? ""})`;
      const bad = junk(parsed.skills);
      if (read.failure) note = [note, read.failure.slice(0, 120)].filter(Boolean).join(" · ");
      row = [name, cfgKey, reader, secs.toFixed(1), usd.toFixed(4), parsed.experiences.length, parsed.projects.length, parsed.skills.length, parsed.certifications.length, parsed.education.length, bad.length, companies.length, text.length, note];
      writeFileSync(join(OUT, "json", `${name.replace(/[^\w.-]+/g, "_")}.${cfgKey}.json`), JSON.stringify({ file: name, config: cfgKey, model: cfg.model, reader, seconds: secs, usd, junk: bad, companies, parsed, usage: read.usage, timing: read.timing }, null, 1));
    } catch (e) {
      row = [name, cfgKey, "error", ((Date.now() - t0) / 1000).toFixed(1), 0, 0, 0, 0, 0, 0, 0, 0, text.length, `${note} ${e instanceof Error ? e.message : e}`.trim()];
    }
    appendFileSync(scorecard, row.map(csv).join(",") + "\n");
    console.log(row.slice(0, 13).join(" | "));
  }
  process.exit(0);
})();
