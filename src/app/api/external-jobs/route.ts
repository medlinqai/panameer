import { NextResponse } from "next/server";
import { intakeJobs, keyIsValid, type RawJob } from "@/lib/external-jobs";

export const runtime = "nodejs";

// EX-E001: the agent connection (and the Job Clipper's Send to Panameer) — POST jobs with a private key from
// Admin › External Jobs › Keys. Same intake as every other route.
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Api-Key" };
export function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }); }

export async function POST(request: Request) {
  const key = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  if (!(await keyIsValid(key))) return NextResponse.json({ error: "A valid key is required (Admin › External Jobs › Keys)." }, { status: 401, headers: CORS });
  const body = (await request.json().catch(() => null)) as { jobs?: RawJob[]; via?: string } | RawJob | null;
  const list = body && "jobs" in body && Array.isArray(body.jobs) ? body.jobs : body && "title" in body ? [body as RawJob] : [];
  if (!list.length) return NextResponse.json({ error: "Send { jobs: [{ title, company, location, url, description, salary }] }." }, { status: 400, headers: CORS });
  const via = body && "via" in body && body.via === "CLIPPER" ? "CLIPPER" : "AGENT";
  const clean = list.slice(0, 500).map((j) => ({ ...j, title: String(j.title ?? "").slice(0, 300), tags: Array.isArray(j.tags) ? j.tags.map(String).slice(0, 10) : [] }));
  return NextResponse.json({ ok: true, ...(await intakeJobs(clean, via)) }, { headers: CORS });
}
