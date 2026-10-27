import { NextResponse } from "next/server";
import { guardApi } from "@/lib/guard";
import { intakeJobs, parseSheet } from "@/lib/external-jobs";

export const runtime = "nodejs";

// EX-E001: CSV / XLSX from an agent → the intake (columns matched automatically).
export async function POST(request: Request) {
  const gate = await guardApi("canAdminister");
  if (gate instanceof NextResponse) return gate;
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || !file.size) return NextResponse.json({ error: "Upload a CSV or XLSX file." }, { status: 400 });
  if (!/\.(csv|xlsx)$/i.test(file.name)) return NextResponse.json({ error: "Only CSV or XLSX." }, { status: 400 });
  const jobs = await parseSheet(await file.arrayBuffer(), file.name).catch(() => null);
  if (!jobs) return NextResponse.json({ error: "We couldn't read that file." }, { status: 400 });
  if (!jobs.length) return NextResponse.json({ error: "No rows with a job title were found." }, { status: 400 });
  return NextResponse.json({ ok: true, ...(await intakeJobs(jobs, "CSV")) });
}
