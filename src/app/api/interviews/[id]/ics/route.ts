import { NextResponse } from "next/server";
import { getSessionViewer } from "@/lib/session";
import { interviewForParty } from "@/lib/interview-access";
import { listInterviews } from "@/lib/interviews";

// DB-E010: the calendar invite — Panameer is the organizer, no attendees, provider number only (no names or emails).
const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await getSessionViewer();
  if (!viewer) return NextResponse.redirect(new URL("/login", request.url));
  const { id } = await params;
  const iv = await interviewForParty(viewer, id);
  if (!iv?.startsAt) return NextResponse.json({ error: "Not scheduled" }, { status: 404 });
  const row = (await listInterviews({ providerPersonId: iv.provider_person_id, jobId: iv.job_id })).find((r) => r.id === iv.id);
  const who = iv.side === "buyer" ? row?.providerLabel ?? "Provider" : row?.buyerCompany ?? "Buyer";
  const join = new URL(`/api/interviews/${iv.id}/join`, "https://app.panameer.com").toString();
  const end = new Date(iv.startsAt.getTime() + iv.duration_minutes * 60_000);
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Panameer//Interviews//EN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    `UID:${iv.request_number}@panameer.com`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(iv.startsAt)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`Panameer interview · ${who} · ${iv.jobTitle}`)}`,
    `DESCRIPTION:${esc(`Join: ${join}\nKeep personal details out until an Order is in place.`)}`,
    `URL:${join}`, "ORGANIZER;CN=Panameer:mailto:noreply@panameer.com", "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return new NextResponse(ics, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": `attachment; filename="${iv.request_number}.ics"` } });
}
