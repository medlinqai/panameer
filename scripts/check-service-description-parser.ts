// SD-E002: parse SD-001–003 (built from the de-identified sample sheet, with a fake recruiter sign-off added) and check
// each fills Title, Where, Contract type, Role and ≥8 matched skills, and that no contact detail survives.
// Usage: npx tsx --env-file=.env.local scripts/check-service-description-parser.ts   (calls the AI parser; needs the key)
import ExcelJS from "exceljs";
import { readFileSync } from "node:fs";
import { prisma } from "@/lib/prisma";
import { parsePosting } from "@/lib/service-description";

const SD004 = "../../1. Project Documents/2. Design/10. Work Requests for Parser/SD-004_P2P_AP_transformation.txt";
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
    const t0 = Date.now();
    const out = await parsePosting(text);
    if (!out.ok) { console.log(v("Ref"), "PARSER FAILED", out.reason); fails++; continue; }
    const sd = out.sd;
    const leaks = /jane|doe|acme|555-0199|@|linkedin/i.test(sd.sourceText + JSON.stringify({ ...sd, sourceText: "" }));
    // PC-E001: all three classify as ERP & Oracle › Corporate Systems, high.
    const cls = sd.category === "ERP & Oracle" && sd.businessType === "Corporate Systems" && sd.classConfidence === "high";
    const ok = cls && !!sd.title && !!sd.worksite && sd.contractTypes.length > 0 && !!sd.roleId && sd.skills.length >= 8 && !leaks;
    if (!ok) fails++;
    console.log(`${ok ? "PASS" : "FAIL"} ${v("Ref")} · ${sd.category} › ${sd.businessType} (${sd.classConfidence}) · ${sd.title} · ${sd.worksite} ${sd.city} ${sd.state} ${sd.onsiteDays ?? ""}d · ${sd.contractTypes.join("/")} · role ${sd.roleId ? "✓" : "✗"} · ${sd.domains.join("/")} · ${sd.product} · ${sd.skills.length} matched (${sd.skills.slice(0, 8).map((s) => s.name).join(", ")}) · custom ${sd.customSkills.length} (${sd.customSkills.join(", ")}) · contact ${leaks ? "LEAKED" : "stripped"} · ${Date.now() - t0}ms`);
  }
  // SM-E004: SD-004 (P2P / AP Finance Transformation SME) — catalog skills, P2P domain, no generic-word matches.
  {
    const text = readFileSync(SD004, "utf8");
    const t0 = Date.now();
    const out = await parsePosting(text);
    if (!out.ok) { console.log("SD-004 PARSER FAILED", out.reason); fails++; }
    else {
      const sd = out.sd;
      const names = sd.skills.map((k) => k.name);
      const has = (...alts: string[]) => alts.some((a) => names.includes(a));
      const want = [["Purchasing", "Purchase Orders", "Purchase Order Management", "Requisitioning & Demand Management"], ["Payables"], ["Payments", "Payments & Cash Management"], ["Supplier Portal", "Supplier Registration", "Supplier Management", "Supplier Qualification Management"], ["Procurement Contracts"]];
      const missing = want.filter((alts) => !has(...alts)).map((a) => a[0]);
      const wrong = ["Order Management", "Lease Accounting", "Onboarding"].filter((w) => names.includes(w));
      const roleOk = ["Functional Consultant", "Functional Lead", "Business Process Lead"].includes(sd.specificRole);
      const ok = roleOk && sd.domains.includes("P2P") && !missing.length && !wrong.length && sd.customSkills.length <= 8;
      if (!ok) fails++;
      console.log(`${ok ? "PASS" : "FAIL"} SD-004 · role ${sd.specificRole || "—"} · domains ${sd.domains.join("/")} · skills ${names.join(", ")} · missing [${missing.join(", ")}] · wrong [${wrong.join(", ")}] · custom ${sd.customSkills.length} (${sd.customSkills.join(", ")}) · ${Date.now() - t0}ms`);
    }
  }
  await prisma.$disconnect();
  process.exit(fails ? 1 : 0);
})();
