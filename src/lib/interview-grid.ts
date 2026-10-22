import { prisma } from "@/lib/prisma";
import { listInterviews, type InterviewRow } from "@/lib/interviews";
import { nyDayStart } from "@/lib/live-work";

// IW-E001–E003: the Interviews "Workday" — one fixed-column grid per day (Medlinq ScheduleGrid pattern), buyer and provider.
const TZ = "America/New_York";
const DAY = 86_400_000;
export type GridSide = "buyer" | "provider";
export type GridStatus = "Scheduled" | "To Confirm" | "Done" | "Declined";
export type GridRow = {
  id: string; jobId: string; jobTitle: string; startsAt: string | null; minutes: number; time: string;
  status: GridStatus;
  /** Buyer: provider number, role and photo. Provider: the hiring company. */
  who: string; role: string | null; photoUrl: string | null;
  test: "none" | "pending" | "passed" | "failed";
  ranked: boolean; unread: boolean; messagesHref: string | null;
  rate: string | null;
  live: boolean; ended: boolean; hasRoom: boolean;
};
export type GridTiles = { today: number; toConfirm: number; week: number; feedback: number; tests: number };

const ymd = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ });
const ended = (r: InterviewRow, now: number) => !!r.startsAt && Date.parse(r.startsAt) + r.minutes * 60_000 <= now;
const statusOf = (r: InterviewRow, now: number): GridStatus => {
  if (r.status === "DECLINED" || r.status === "CANCELLED") return "Declined";
  if (r.status === "REQUESTED" || r.status === "SLOTS_OFFERED") return "To Confirm";
  if (r.status === "COMPLETED" || ended(r, now)) return "Done";
  return "Scheduled";
};

/** The day's date from `?date=` (YYYY-MM-DD), else today (New York). */
export function gridDay(date?: string | null): { start: Date; key: string; prev: string; next: string; isToday: boolean } {
  const start = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? nyDayStart(new Date(`${date}T12:00:00Z`)) : nyDayStart();
  return { start, key: ymd(start), prev: ymd(new Date(start.getTime() - DAY / 2)), next: ymd(new Date(start.getTime() + DAY * 1.5)), isToday: ymd(start) === ymd(new Date()) };
}

export async function interviewGrid(side: GridSide, personId: string, userId: string) {
  const all = await listInterviews(side === "buyer" ? { buyerPersonId: personId } : { providerPersonId: personId });
  const now = Date.now();
  const counterpart = all.map((r) => (side === "buyer" ? r.providerUserId : r.buyerUserId)).filter((x): x is string => !!x);
  const pairs = all.map((r) => ({ job_id: r.jobId, provider_person_id: r.providerPersonId }));
  const [tests, unread, proposals, titles, openTests] = await Promise.all([
    prisma.testRequest.findMany({ where: { OR: pairs.length ? pairs : [{ id: "00000000-0000-0000-0000-000000000000" }] }, orderBy: { created_at: "desc" }, select: { job_id: true, provider_person_id: true, status: true, response: { select: { lines: { take: 1, select: { passed: true } } } } } }),
    prisma.message.groupBy({ by: ["from_user_id"], where: { to_user_id: userId, read_at: null, from_user_id: { in: counterpart } }, _count: { _all: true } }),
    prisma.proposal.findMany({ where: { OR: pairs.length ? pairs : [{ id: "00000000-0000-0000-0000-000000000000" }], status: { notIn: ["DRAFT", "WITHDRAWN"] } }, select: { job_id: true, provider_person_id: true, lines: { take: 1, orderBy: { line_number: "asc" }, select: { unit_price_cents: true, basis: true } } } }),
    side === "buyer" ? prisma.person.findMany({ where: { id: { in: all.map((r) => r.providerPersonId) } }, select: { id: true, title: true } }) : Promise.resolve([] as { id: string; title: string | null }[]),
    side === "buyer"
      ? prisma.testRequest.count({ where: { requested_by_person_id: personId, status: { notIn: ["COMPLETED", "DECLINED", "EXPIRED"] } } })
      : prisma.testRequest.count({ where: { provider_person_id: personId, status: { notIn: ["COMPLETED", "DECLINED", "EXPIRED"] } } }),
  ]);
  const unreadFrom = new Set(unread.map((u) => u.from_user_id));
  const rows: GridRow[] = all.map((r) => {
    const t = tests.find((x) => x.job_id === r.jobId && x.provider_person_id === r.providerPersonId);
    const passed = t?.response?.lines[0]?.passed;
    const p = proposals.find((x) => x.job_id === r.jobId && x.provider_person_id === r.providerPersonId)?.lines[0];
    const other = side === "buyer" ? r.providerUserId : r.buyerUserId;
    const start = r.startsAt ? Date.parse(r.startsAt) : null;
    return {
      id: r.id, jobId: r.jobId, jobTitle: r.jobTitle || "Job", startsAt: r.startsAt, minutes: r.minutes,
      time: r.startsAt ? new Date(r.startsAt).toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }) : "—",
      status: statusOf(r, now),
      who: side === "buyer" ? r.providerLabel.replace(/^Provider /, "") : r.buyerCompany,
      role: side === "buyer" ? titles.find((x) => x.id === r.providerPersonId)?.title ?? null : null,
      photoUrl: side === "buyer" ? r.providerPhotoUrl : null,
      test: !t ? "none" : passed === true ? "passed" : passed === false ? "failed" : "pending",
      ranked: !!r.rating, unread: !!other && unreadFrom.has(other), messagesHref: other ? `/messages?with=${other}` : null,
      rate: p?.unit_price_cents != null ? `$${Math.round(p.unit_price_cents / 100)}${p.basis === "RATE" ? "/hr" : ""}` : null,
      live: start != null && r.status === "SCHEDULED" && now >= start - 10 * 60_000 && now < start + r.minutes * 60_000,
      ended: ended(r, now) || r.status === "COMPLETED", hasRoom: r.hasRoom,
    };
  });
  const today = ymd(new Date());
  const dow = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "short" }).format(new Date()));
  const weekStart = nyDayStart(new Date(), -dow);
  const inWeek = (r: GridRow) => !!r.startsAt && Date.parse(r.startsAt) >= weekStart.getTime() && Date.parse(r.startsAt) < weekStart.getTime() + 7 * DAY;
  const tiles: GridTiles = {
    today: rows.filter((r) => r.startsAt && ymd(new Date(r.startsAt)) === today && r.status !== "Declined").length,
    toConfirm: rows.filter((r) => r.status === "To Confirm").length,
    week: rows.filter((r) => inWeek(r) && r.status !== "Declined").length,
    feedback: side === "buyer" ? rows.filter((r) => r.status === "Done" && !r.ranked).length : 0,
    tests: openTests,
  };
  return { rows, tiles, weekStart };
}

/** Rows on one New York day, by time. */
export const rowsOn = (rows: GridRow[], key: string) => rows.filter((r) => r.startsAt && ymd(new Date(r.startsAt)) === key).sort((a, b) => a.startsAt!.localeCompare(b.startsAt!));
export const dayKey = (iso: string) => ymd(new Date(iso));
