import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { SourcingError } from "@/lib/sourcing";

// IW-E002/E005: the buyer publishes Open Times (one calendar for every job); providers book a slot inside them.
// A slot = slot_minutes, then a gap (default 5) before the next; nothing may overlap another SCHEDULED interview of that buyer.
const MIN = 60_000;
export type OpenWindow = { id: string; startsAt: string; endsAt: string; timeZone: string; booked: { id: string; startsAt: string; minutes: number; who: string; jobTitle: string }[] };

async function me(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!p) throw new SourcingError("No person for this account.", "NOT_FOUND");
  return p.id;
}

/** "2026-10-26" + "13:00" in an IANA zone → the UTC instant. */
export function zonedToUtc(date: string, time: string, tz: string): Date {
  const [y, m, d] = date.split("-").map(Number), [h, mi] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  const off = (at: number) => { const p = new Date(new Date(at).toLocaleString("en-US", { timeZone: tz })).getTime() - new Date(new Date(at).toLocaleString("en-US", { timeZone: "UTC" })).getTime(); return p; };
  let t = guess - off(guess);
  t = guess - off(t);
  return new Date(t);
}

export async function addOpenTime(viewer: Viewer, input: { date: string; from: string; to: string; timeZone: string }) {
  const personId = await me(viewer);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !/^\d{2}:\d{2}$/.test(input.from) || !/^\d{2}:\d{2}$/.test(input.to)) throw new SourcingError("Pick a date, a From time and a To time.", "INVALID");
  const tz = (() => { try { new Intl.DateTimeFormat("en-US", { timeZone: input.timeZone }); return input.timeZone; } catch { return "America/New_York"; } })();
  const starts = zonedToUtc(input.date, input.from, tz), ends = zonedToUtc(input.date, input.to, tz);
  if (ends <= starts) throw new SourcingError("To must be after From.", "INVALID");
  if (ends.getTime() <= Date.now()) throw new SourcingError("That window is already over.", "INVALID");
  const clash = await prisma.buyerOpenTime.findFirst({ where: { person_id: personId, starts_at: { lt: ends }, ends_at: { gt: starts } }, select: { id: true } });
  if (clash) throw new SourcingError("That overlaps an Open Time you already have.", "INVALID");
  return prisma.buyerOpenTime.create({ data: { person_id: personId, starts_at: starts, ends_at: ends, time_zone: tz }, select: { id: true } });
}

/** Remove a window — not while an interview is booked inside it. */
export async function removeOpenTime(viewer: Viewer, id: string) {
  const personId = await me(viewer);
  const w = await prisma.buyerOpenTime.findFirst({ where: { id, person_id: personId } });
  if (!w) throw new SourcingError("That Open Time isn't yours.", "NOT_FOUND");
  const booked = (await scheduled(personId)).some((s) => s.start < w.ends_at.getTime() && s.end > w.starts_at.getTime());
  if (booked) throw new SourcingError("An interview is booked in this window — cancel it first.", "INVALID");
  await prisma.buyerOpenTime.delete({ where: { id: w.id } });
}

/** Every SCHEDULED interview this buyer runs, on any job (start/end in ms; old-flow rows use their confirmed line). */
async function scheduled(buyerPersonId: string, db: Pick<typeof prisma, "interviewRequest"> = prisma) {
  const rows = await db.interviewRequest.findMany({ where: { requested_by_person_id: buyerPersonId, status: "SCHEDULED" }, select: { id: true, job_id: true, provider_person_id: true, confirmed_line_id: true, duration_minutes: true, slot_minutes: true, response: { select: { lines: { select: { id: true, starts_at: true } } } } } });
  return rows.flatMap((r) => {
    const line = r.response?.lines.find((l) => l.id === r.confirmed_line_id);
    if (!line) return [];
    const minutes = r.slot_minutes ?? r.duration_minutes;
    return [{ id: r.id, jobId: r.job_id, providerPersonId: r.provider_person_id, start: line.starts_at.getTime(), end: line.starts_at.getTime() + minutes * MIN, minutes }];
  });
}

/** Free slots from now on: Open Times cut into slot + gap, minus every booked interview (and its gap). */
export async function freeSlots(buyerPersonId: string, slotMinutes: number, gapMinutes = 5, db: Pick<typeof prisma, "interviewRequest" | "buyerOpenTime"> = prisma): Promise<Date[]> {
  const now = Date.now();
  const [windows, busy] = await Promise.all([
    db.buyerOpenTime.findMany({ where: { person_id: buyerPersonId, ends_at: { gt: new Date(now) } }, orderBy: { starts_at: "asc" } }),
    scheduled(buyerPersonId, db),
  ]);
  const out: Date[] = [];
  for (const w of windows) {
    for (let t = w.starts_at.getTime(); t + slotMinutes * MIN <= w.ends_at.getTime(); t += (slotMinutes + gapMinutes) * MIN) {
      if (t < now) continue;
      const end = t + slotMinutes * MIN;
      if (busy.some((b) => t < b.end + gapMinutes * MIN && end + gapMinutes * MIN > b.start)) continue;
      out.push(new Date(t));
    }
  }
  return out;
}

/** The buyer's upcoming windows, each with the interviews booked inside it. */
export async function myOpenTimes(personId: string): Promise<OpenWindow[]> {
  const [windows, busy] = await Promise.all([
    prisma.buyerOpenTime.findMany({ where: { person_id: personId, ends_at: { gt: new Date() } }, orderBy: { starts_at: "asc" } }),
    scheduled(personId),
  ]);
  const { providerLabel, providerNumbers } = await import("@/lib/provider-number");
  const profiles = await prisma.providerProfile.findMany({ where: { person_id: { in: busy.map((b) => b.providerPersonId) } }, select: { id: true, person_id: true } });
  const nums = await providerNumbers(profiles.map((p) => p.id));
  const jobs = await prisma.job.findMany({ where: { id: { in: busy.map((b) => b.jobId) } }, select: { id: true, title: true } });
  return windows.map((w) => ({
    id: w.id, startsAt: w.starts_at.toISOString(), endsAt: w.ends_at.toISOString(), timeZone: w.time_zone,
    booked: busy.filter((b) => b.start < w.ends_at.getTime() && b.end > w.starts_at.getTime()).sort((a, b) => a.start - b.start).map((b) => ({
      id: b.id, startsAt: new Date(b.start).toISOString(), minutes: b.minutes,
      who: providerLabel(nums.get(profiles.find((p) => p.person_id === b.providerPersonId)?.id ?? "")).replace(/^Provider /, ""),
      jobTitle: jobs.find((j) => j.id === b.jobId)?.title ?? "Job",
    })),
  }));
}

/** Free slots for one Open Times interview, as the provider sees them. */
export async function slotsForInterview(viewer: Viewer, interviewId: string) {
  const personId = await me(viewer);
  const iv = await prisma.interviewRequest.findUnique({ where: { id: interviewId }, select: { provider_person_id: true, requested_by_person_id: true, slot_minutes: true, gap_minutes: true, status: true } });
  if (!iv || iv.provider_person_id !== personId) throw new SourcingError("That interview isn't available.", "NOT_FOUND");
  if (!iv.slot_minutes || iv.status !== "REQUESTED") return [];
  return freeSlots(iv.requested_by_person_id, iv.slot_minutes, iv.gap_minutes ?? 5);
}

/** Book This Time — re-checked under a lock on the buyer, so two providers never land on one slot. */
export async function bookSlot(viewer: Viewer, interviewId: string, startsAt: string, timeZone: string) {
  const personId = await me(viewer);
  const at = new Date(startsAt);
  if (!(at.getTime() > 0)) throw new SourcingError("Pick a time.", "INVALID");
  const iv = await prisma.interviewRequest.findUnique({ where: { id: interviewId }, select: { id: true, provider_person_id: true, requested_by_person_id: true, slot_minutes: true, gap_minutes: true, status: true } });
  if (!iv || iv.provider_person_id !== personId) throw new SourcingError("That interview isn't available.", "NOT_FOUND");
  if (!iv.slot_minutes) throw new SourcingError("This interview asks you to offer times instead.", "INVALID");
  if (iv.status !== "REQUESTED") throw new SourcingError("This interview is already booked or closed.", "INVALID");
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${iv.requested_by_person_id}))`;
    const free = await freeSlots(iv.requested_by_person_id, iv.slot_minutes!, iv.gap_minutes ?? 5, tx);
    if (!free.some((f) => f.getTime() === at.getTime())) throw new SourcingError("That time was just taken — pick another.", "TAKEN");
    const res = await tx.interviewResponse.upsert({ where: { interview_request_id: iv.id }, create: { interview_request_id: iv.id, provider_person_id: personId, submitted_at: new Date() }, update: { submitted_at: new Date() }, select: { id: true } });
    await tx.interviewResponseLine.deleteMany({ where: { interview_response_id: res.id } });
    const line = await tx.interviewResponseLine.create({ data: { interview_response_id: res.id, line_number: 1, starts_at: at, time_zone: timeZone || "America/New_York" }, select: { id: true } });
    await tx.interviewRequest.update({ where: { id: iv.id }, data: { status: "SCHEDULED", confirmed_line_id: line.id, duration_minutes: iv.slot_minutes! } });
  });
  const { afterBooked } = await import("@/lib/interviews");
  await afterBooked(iv.id, at);
}
