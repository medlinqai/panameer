// SD-E002: parse SD-001–003 (built from the de-identified sample sheet, with a fake recruiter sign-off added) and check
// each fills Title, Where, Contract type, Role and ≥8 matched skills, and that no contact detail survives.
// Usage: npx tsx --env-file=.env.local scripts/check-service-description-parser.ts   (calls the AI parser; needs the key)
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { aiExtractServiceDescription, stripContacts } from "@/lib/work-request/job-import";
import { fromParsed } from "@/lib/service-description";

const SHEET = "../../1. Project Documents/2. Design/10. Work Requests for Parser/Panameer_Service_Description_Upload.xlsx";
const CONTRACT: Record<string, string> = { "SD-001": "C2C only.", "SD-002": "Contract: C2C or W2.", "SD-003": "1099 or C2C." };
const SIGN_OFF = "\n\nThanks,\nJane Doe\nSenior Technical Recruiter | Acme Staffing\njane.doe@acme-staffing.com | (404) 555-0199\nhttps://www.linkedin.com/in/janedoe";

(async () => {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(SHEET);
  const ws = wb.getWorksheet("Service Descriptions")!;
  const head = (ws.getRow(1).values as unknown[]).slice(1).map(String);
  let fails = 0;
  for (let r = 2; r <= ws.rowCount; r++) {
    const v = (k: string) => String(ws.getRow(r).getCell(head.indexOf(k) + 1).value ?? "").trim();
    if (!v("Ref")) continue;
    const where = v("Where") === "Offsite" ? "Remote." : `${v("Where")} — ${v("City, State")}${v("Onsite Days / Week") ? `, ${v("Onsite Days / Week")} days a week onsite` : ""}.`;
    const text = [`${v("Title")}`, `Location: ${where}`, CONTRACT[v("Ref")] ?? "", `Start: ${v("Start")}. Duration: ${v("How Long")}.`, `${v("Role")} role · ${v("Domain")} · Oracle ${v("Product")}.`, "", v("Summary"), "", "Responsibilities:", v("Responsibilities (one per line)"), "", "Required:", v("Required"), `${v("Years Experience")}+ years of experience.`, "", "Nice to have:", v("Nice to Have"), "", `Skills: ${v("Skills (comma separated)")}`, SIGN_OFF].join("\n");
    const out = await aiExtractServiceDescription(text);
    if (!out.ok) { console.log(v("Ref"), "PARSER FAILED", out.reason, out.message); fails++; continue; }
    const sd = await fromParsed(out.data, stripContacts(text));
    const leaks = /jane|doe|acme|555-0199|@|linkedin/i.test(sd.sourceText + JSON.stringify(out.data));
    const ok = !!sd.title && !!sd.worksite && sd.contractTypes.length > 0 && !!sd.roleId && sd.skills.length >= 8 && !leaks;
    if (!ok) fails++;
    console.log(`${ok ? "PASS" : "FAIL"} ${v("Ref")} · ${sd.title} · ${sd.worksite} ${sd.city} ${sd.state} ${sd.onsiteDays ?? ""}d · ${sd.contractTypes.join("/")} · role ${sd.roleId ? "✓" : "✗"} · ${out.data.domains.join("/")} · ${sd.product} · ${sd.skills.length} matched (${sd.skills.slice(0, 8).map((s) => s.name).join(", ")}) · custom ${sd.customSkills.length} · contact ${leaks ? "LEAKED" : "stripped"} · ${out.ms}ms`);
  }
  await prisma.$disconnect();
  process.exit(fails ? 1 : 0);
})();
