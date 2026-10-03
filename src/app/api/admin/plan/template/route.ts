import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { IMPORT_COLUMNS } from "@/lib/plan/import";

/**
 * GET /api/admin/plan/template — the Panameer plan template (`P2-ALL-E786`).
 *
 * ⚠ It is generated rather than committed as a binary, so the headings can only
 * ever be `IMPORT_COLUMNS` — the same constant the reader matches on. ⚠⚠ A
 * checked-in .xlsx would be a second copy of the column list, and the first time
 * one changed the template would quietly stop importing (`E585`).
 */
export async function GET() {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Plan");
  sheet.addRow([...IMPORT_COLUMNS]);
  sheet.getRow(1).font = { bold: true };
  /** ⚠⚠ THE EXAMPLE ROWS ARE THE DOCUMENTATION. Level 1/2 and the three types
   *  are hard to explain in a heading and obvious in two lines of example. */
  /** ⚠⚠ THE EXAMPLES NOW CARRY `R1` IN THE RELEASE COLUMN. The template is the
   *  documentation, and a blank column teaches people to leave it blank — which
   *  is how the live plan lost its whole R1 scope on 2026-10-03. */
  sheet.addRow([1, "Build", "phase", "2026-09-20", "2026-11-01", "In progress", "Scott", "", "R1"]);
  sheet.addRow([2, "Public", "task", "2026-09-20", "2026-09-30", "Done", "Scott", 40, "R1"]);
  sheet.addRow([2, "Register", "task", "", "", "Planned", "", "", "R1"]);
  sheet.addRow([2, "Learn", "task", "", "", "Planned", "", "", ""]);
  sheet.addRow([1, "R1 — Public beta", "milestone", "2026-11-15", "2026-11-15", "Planned", "", "", "R1"]);
  sheet.columns.forEach((c) => {
    c.width = 18;
  });

  const buf = await wb.xlsx.writeBuffer();
  return new NextResponse(buf as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="panameer-plan-template.xlsx"',
      /** ⚠ Never cached: the headings come from a constant that can change. */
      "Cache-Control": "no-store",
    },
  });
}
