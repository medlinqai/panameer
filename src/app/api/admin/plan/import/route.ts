import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { PlanError, ensurePlan, writeImportedRows, type ImportMode } from "@/lib/plan/store";
import { planOwnerKey } from "@/lib/plan/model";
import { parsePlanFile } from "@/lib/plan/import";

export const maxDuration = 60;

const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send the file as form data." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file was attached." }, { status: 400 });
  if (file.size === 0) return NextResponse.json({ error: "That file is empty." }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 2 MB.` },
      { status: 413 },
    );
  }

  const rawMode = String(form.get("mode") ?? "");
  /** NO DEFAULT. Guessing between "add to my plan" and "delete my plan and */
  if (rawMode !== "replace" && rawMode !== "append") {
    return NextResponse.json({ error: "Choose whether to replace the plan or add to it." }, { status: 400 });
  }
  const mode = rawMode as ImportMode;

  const ownerKey = String(form.get("ownerKey") ?? "") || planOwnerKey();

  try {
    const parsed = await parsePlanFile(file.name, await file.arrayBuffer());
    /** NOTHING IS WRITTEN WHEN NO ROW SURVIVED — but the per-row reasons are */
    if (parsed.rows.length === 0) {
      return NextResponse.json(
        { error: "Nothing in that file could be imported.", problems: parsed.problems },
        { status: 400 },
      );
    }
    const plan = await ensurePlan(ownerKey, "Panameer build", gate);
    const result = await writeImportedRows(plan.id, parsed.rows, mode, gate);
    /** A PARTIAL success is reported as a success WITH its problems — 39 of 40 */
    const problems = [...parsed.problems];
    /** AN UNRECOGNISED RELEASE CODE IS SAID OUT LOUD. The rows still import */
    for (const code of result.unknownReleases) {
      problems.push({ line: 1, message: `Release "${code}" isn't one we know — those rows came in with no release.` });
    }
    return NextResponse.json({ ok: true, ...result, problems });
  } catch (e) {
    if (e instanceof PlanError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[plan:import] failed", e);
    return NextResponse.json({ error: "We couldn't read that file." }, { status: 500 });
  }
}
