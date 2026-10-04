import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { PlanError, ensurePlan, writeImportedRows, type ImportMode } from "@/lib/plan/store";
import { parsePlanFile } from "@/lib/plan/import";
import { WoPlanError, recordWoEvent, woPlanKey, woPlanParty } from "@/lib/wo-plan";

export const maxDuration = 60;
const MAX_BYTES = 2 * 1024 * 1024;

// Import an Excel / CSV plan onto a work order (same parser as the build plan).
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const gate = await guardApi("authenticated");
  if (gate instanceof NextResponse) return gate;
  const { id } = await params;
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the file as form data." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file was attached." }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "The limit is 2 MB." }, { status: 413 });
  const mode = String(form.get("mode") ?? "") as ImportMode;
  if (mode !== "replace" && mode !== "append") return NextResponse.json({ error: "Choose whether to replace the plan or add to it." }, { status: 400 });
  try {
    const { order, personId } = await woPlanParty(gate, id);
    const parsed = await parsePlanFile(file.name, await file.arrayBuffer());
    if (parsed.rows.length === 0) return NextResponse.json({ error: "Nothing in that file could be imported.", problems: parsed.problems }, { status: 400 });
    const plan = await ensurePlan(woPlanKey(order.id), order.order_number, gate);
    const result = await writeImportedRows(plan.id, parsed.rows, mode, gate);
    await recordWoEvent(order.id, personId, "plan.import", `imported ${result.written} plan row${result.written === 1 ? "" : "s"} from ${file.name}`);
    return NextResponse.json({ ok: true, ...result, problems: parsed.problems });
  } catch (e) {
    if (e instanceof WoPlanError) return NextResponse.json({ error: e.message }, { status: 404 });
    if (e instanceof PlanError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[orders/plan/import] failed:", e);
    return NextResponse.json({ error: "Could not import that file." }, { status: 500 });
  }
}
