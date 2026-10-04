import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { IMPORT_COLUMNS } from "@/lib/plan/import";

export async function GET() {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Plan");
  sheet.addRow([...IMPORT_COLUMNS]);
  sheet.getRow(1).font = { bold: true };
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
      "Cache-Control": "no-store",
    },
  });
}
