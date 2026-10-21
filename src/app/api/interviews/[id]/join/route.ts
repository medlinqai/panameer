import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { interviewForParty } from "@/lib/interview-access";
import { meetingToken } from "@/lib/daily";
import { listInterviews } from "@/lib/interviews";

// DB-E009: Join — a Daily meeting token whose display name Panameer sets (provider number / "{company} interviewer").
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.redirect(new URL("/login", request.url));
  const { id } = await params;
  const iv = await interviewForParty(viewer, id);
  if (!iv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!iv.room_url || !iv.room_name || !iv.startsAt) return NextResponse.json({ error: "Video link not set up yet." }, { status: 409 });
  const row = (await listInterviews({ providerPersonId: iv.provider_person_id, jobId: iv.job_id })).find((r) => r.id === iv.id);
  const name = iv.side === "provider" ? row?.providerLabel ?? "Provider" : `${row?.buyerCompany ?? "Buyer"} interviewer`;
  const exp = new Date(iv.startsAt.getTime() + (iv.duration_minutes + 120) * 60_000);
  const token = await meetingToken(iv.room_name, name, iv.side === "buyer", exp);
  if (!token) return NextResponse.json({ error: "Video link not set up yet." }, { status: 409 });
  return NextResponse.redirect(`${iv.room_url}?t=${encodeURIComponent(token)}`);
}
