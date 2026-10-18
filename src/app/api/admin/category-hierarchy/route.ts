import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { writeAudit } from "@/lib/admin/audit";
import { exportWorkbook, importSheet, readSheet } from "@/lib/category-hierarchy-io";

// CH-E005: GET = the hierarchy as Excel; POST (file, apply=0|1) = import — a dry run listing the changes, then Apply.
export async function GET() {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const buf = await exportWorkbook();
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="category-hierarchy-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}

export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an .xlsx file." }, { status: 400 });
  const apply = form?.get("apply") === "1";
  try {
    const changes = await importSheet(await readSheet(await file.arrayBuffer()), apply);
    if (apply) await writeAudit(gate, { action: "category_hierarchy.import", targetTable: "commodity_groups", detail: { changes }, rowCount: changes.length });
    return NextResponse.json({ applied: apply, changes });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not read that file." }, { status: 400 });
  }
}
