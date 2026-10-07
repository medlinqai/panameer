// Seeds the glossary from the draft workbook (sheet "Glossary"); re-runs update by term, never duplicate.
// "Scott to confirm" rows and "Admin only" rows seed as ADMIN. Usage: npx tsx --env-file=.env.local scripts/seed-glossary.ts [--apply]
import path from "node:path";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { termKey } from "@/lib/glossary";

const FILE = process.env.GLOSSARY_XLSX ?? path.resolve(process.cwd(), "../2. Claude Sub-Files/panameer_glossary_draft_2026-10-07.xlsx");
type Row = { term: string; category: string; type: string; definition: string; also: string | null; dont: string | null; shown: string; confirm: string | null };
const EXTRA: Row[] = [
  { term: "Buyer Profile", category: "Profile", type: "Panameer term", definition: "A buyer person's profile: photo, title, company, overview, work history, education, languages and location. No completeness gate — it never blocks posting work.", also: null, dont: null, shown: "Public", confirm: null },
  { term: "Buyer Track Record", category: "Company & payment", type: "Panameer term", definition: "Shown on a buyer company's page, built from real activity: validated, member since, work orders issued and completed, paid on time, average days to pay, industry, size, location and ERP used. A company with no history shows \"New buyer on Panameer\".", also: null, dont: null, shown: "Public", confirm: null },
];
const text = (v: ExcelJS.CellValue) => (v == null ? "" : typeof v === "object" && "richText" in v ? v.richText.map((r) => r.text).join("") : typeof v === "object" && "text" in v ? String(v.text) : String(v)).trim();

(async () => {
  const apply = process.argv.includes("--apply");
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(FILE);
  const ws = wb.getWorksheet("Glossary");
  if (!ws) throw new Error("No sheet named Glossary");
  const rows: Row[] = [];
  ws.eachRow((row, n) => {
    if (n === 1) return;
    const c = (i: number) => text(row.getCell(i).value);
    if (!c(1) || !c(4)) return;
    rows.push({ term: c(1), category: c(2), type: c(3), definition: c(4), also: c(5) || null, dont: c(6) || null, shown: c(7), confirm: c(8) || null });
  });
  for (const e of EXTRA) if (!rows.some((r) => termKey(r.term) === termKey(e.term))) rows.push(e);
  const existing = new Map((await prisma.glossaryTerm.findMany({ select: { term_key: true } })).map((r) => [r.term_key, true]));
  let created = 0, updated = 0, admin = 0;
  for (const r of rows) {
    const visibility = r.confirm || /admin/i.test(r.shown ?? "") ? ("ADMIN" as const) : ("PUBLIC" as const);
    if (visibility === "ADMIN") admin++;
    const key = termKey(r.term);
    if (existing.has(key)) updated++;
    else created++;
    if (!apply) continue;
    const data = { term: r.term, category: r.category || null, type: r.type || null, definition: r.definition, also_called: r.also, dont_say: r.dont, visibility, confirm_note: r.confirm };
    await prisma.glossaryTerm.upsert({ where: { term_key: key }, create: { ...data, term_key: key }, update: data });
  }
  console.log(JSON.stringify({ file: path.basename(FILE), rows: rows.length, created, updated, admin, applied: apply }));
  process.exit(0);
})();
