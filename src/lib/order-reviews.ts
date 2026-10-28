import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import type { OrderReviewSide } from "@prisma/client";
import { writeAudit } from "@/lib/admin/audit";

// OR-E001–E005: Order Review — both sides review each other at the end of every Order.
const DAY = 86_400_000;
export const REVIEW_WINDOW_DAYS = 14;
export const REVIEW_EDIT_DAYS = 7;
export const COMMENT_MAX = 500;
const DONE = ["CLOSED", "FINALLY_CLOSED"] as const;

/** The four scores each side gives, in screen order. */
export const REVIEW_FIELDS = {
  BUYER: [["quality_of_work", "Quality of Work"], ["on_time", "On Time"], ["communication", "Communication"], ["value", "Value"]],
  SELLER: [["clear_scope", "Clear Scope"], ["pays_on_time", "Pays On Time"], ["communication", "Communication"], ["would_work_again", "Would Work Again"]],
} as const satisfies Record<OrderReviewSide, readonly (readonly [string, string])[]>;
type Field = (typeof REVIEW_FIELDS)[OrderReviewSide][number][0];

export class ReviewError extends Error {}

const completedAt = (o: { completed_at: Date | null; updated_at: Date }) => o.completed_at ?? o.updated_at;
export const reviewDue = (o: { completed_at: Date | null; updated_at: Date }) => new Date(completedAt(o).getTime() + REVIEW_WINDOW_DAYS * DAY);

/** A review shows once both sides have submitted, or when the 14-day window ends. */
export function shownAt(r: { submitted_at: Date }, other: { submitted_at: Date } | null | undefined, due: Date): Date {
  return other ? new Date(Math.max(r.submitted_at.getTime(), other.submitted_at.getTime())) : due;
}
const isShown = (r: { submitted_at: Date }, other: { submitted_at: Date } | null | undefined, due: Date) => shownAt(r, other, due).getTime() <= Date.now();

const ORDER_SEL = { id: true, order_number: true, description: true, status: true, buyer_person_id: true, provider_person_id: true, completed_at: true, updated_at: true } as const;

/** The review form's facts for the signed-in person on one Completed Order (owner-scoped). */
export async function reviewContext(viewer: Viewer, orderId: string) {
  const me = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  const o = await prisma.workOrder.findUnique({ where: { id: orderId }, select: { ...ORDER_SEL, orderReviews: true } });
  if (!me || !o) throw new ReviewError("That Order isn't yours to review.");
  const side: OrderReviewSide | null = o.buyer_person_id === me.id ? "BUYER" : o.provider_person_id === me.id ? "SELLER" : null;
  if (!side) throw new ReviewError("That Order isn't yours to review.");
  if (!(DONE as readonly string[]).includes(o.status)) throw new ReviewError("You can review this Order once it's Completed.");
  const due = reviewDue(o);
  const mine = o.orderReviews.find((r) => r.side === side) ?? null;
  const theirs = o.orderReviews.find((r) => r.side !== side) ?? null;
  const shown = mine ? shownAt(mine, theirs, due) : null;
  const canEdit = mine ? !shown || shown.getTime() > Date.now() || Date.now() - shown.getTime() <= REVIEW_EDIT_DAYS * DAY : Date.now() <= due.getTime();
  const otherName = side === "BUYER" ? await sellerName(viewer, o.provider_person_id) : await buyerCompanyName(o.buyer_person_id);
  return { order: o, side, due, mine, theirs: theirs && isShown(theirs, mine, due) ? theirs : null, canEdit, otherName, title: orderTitle(o) };
}

export const orderTitle = (o: { description: string | null; order_number: string }) => (o.description?.trim() || o.order_number).slice(0, 80);

async function sellerName(viewer: Viewer, personId: string) {
  const { identityVisibleTo, providerLabel, providerNumbers } = await import("@/lib/provider-number");
  const [p, seen] = await Promise.all([
    prisma.person.findUnique({ where: { id: personId }, select: { first_name: true, last_name: true, providerProfile: { select: { id: true } } } }),
    identityVisibleTo(viewer, [personId]).catch(() => new Set<string>()),
  ]);
  if (!p) return "Your Provider";
  if (seen.has(personId) || !p.providerProfile) return `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Your Provider";
  return providerLabel((await providerNumbers([p.providerProfile.id])).get(p.providerProfile.id));
}
async function buyerCompanyName(personId: string) {
  const p = await prisma.person.findUnique({ where: { id: personId }, select: { first_name: true, last_name: true, company: { select: { name: true } } } });
  return p?.company?.name ?? (`${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "The Buyer");
}

export type ReviewInput = Partial<Record<Field, number>> & { comment?: string | null };

/** Submit or edit this side's review. Scores 1–5 on all four; comment up to 500 characters. */
export async function submitReview(viewer: Viewer, orderId: string, input: ReviewInput) {
  const ctx = await reviewContext(viewer, orderId);
  if (!ctx.canEdit) throw new ReviewError(ctx.mine ? "This review can no longer be edited." : "The review window for this Order has closed.");
  const scores: Partial<Record<Field, number>> = {};
  for (const [k, label] of REVIEW_FIELDS[ctx.side]) {
    const v = Number(input[k]);
    if (!Number.isInteger(v) || v < 1 || v > 5) throw new ReviewError(`Give ${label} 1 to 5 stars.`);
    scores[k] = v;
  }
  const comment = (input.comment ?? "").trim();
  if (comment.length > COMMENT_MAX) throw new ReviewError(`Keep the comment to ${COMMENT_MAX} characters.`);
  const vals = Object.values(scores) as number[];
  const overall = vals.reduce((a, b) => a + b, 0) / vals.length;
  const o = ctx.order;
  const reviewee = ctx.side === "BUYER" ? o.provider_person_id : o.buyer_person_id;
  const company = ctx.side === "SELLER" ? (await prisma.person.findUnique({ where: { id: o.buyer_person_id }, select: { company_id: true } }))?.company_id ?? null : null;
  const data = { ...scores, communication: scores.communication!, overall, comment: comment || null };
  await prisma.orderReview.upsert({
    where: { work_order_id_side: { work_order_id: o.id, side: ctx.side } },
    create: { work_order_id: o.id, side: ctx.side, reviewer_person_id: ctx.side === "BUYER" ? o.buyer_person_id : o.provider_person_id, reviewee_person_id: reviewee, reviewee_company_id: company, ...data },
    update: data,
  });
  // The Worklist line (and its bell entry) clears now.
  const reviewer = ctx.side === "BUYER" ? o.buyer_person_id : o.provider_person_id;
  await prisma.notification.updateMany({ where: { person_id: reviewer, href: `/orders/${o.id}/review`, resolved_at: null }, data: { resolved_at: new Date(), read_at: new Date() } });
  return reviewContext(viewer, orderId);
}

/** Worklist: one "Review …" line per Completed Order still waiting on this side's review, due 14 days after completion. */
export async function reviewLines(viewer: Viewer, personId: string, side: "buyer" | "provider") {
  const s: OrderReviewSide = side === "buyer" ? "BUYER" : "SELLER";
  const since = new Date(Date.now() - REVIEW_WINDOW_DAYS * DAY);
  const orders = await prisma.workOrder.findMany({
    where: { ...(s === "BUYER" ? { buyer_person_id: personId } : { provider_person_id: personId }), status: { in: [...DONE] }, OR: [{ completed_at: { gte: since } }, { completed_at: null, updated_at: { gte: since } }], orderReviews: { none: { side: s } } },
    orderBy: { updated_at: "desc" }, take: 20, select: ORDER_SEL,
  });
  const out: { key: string; what: string; detail: string; dueAt: string | null; href: string; action: string }[] = [];
  for (const o of orders) {
    const name = s === "BUYER" ? await sellerName(viewer, o.provider_person_id) : await buyerCompanyName(o.buyer_person_id);
    out.push({ key: o.id, what: `Review ${name} · ${orderTitle(o)}`, detail: o.order_number, dueAt: reviewDue(o).toISOString(), href: `/orders/${o.id}/review`, action: "Review" });
  }
  return out;
}

export type Rating = { avg: number; n: number; parts: Record<string, number> };

/** Visible reviews about these people (seller side) or companies (buyer side), rolled up. */
async function visibleReviews(where: { side: OrderReviewSide; reviewee_person_id?: { in: string[] }; reviewee_company_id?: { in: string[] } }) {
  const rows = await prisma.orderReview.findMany({ where, orderBy: { submitted_at: "desc" }, include: { workOrder: { select: { completed_at: true, updated_at: true, orderReviews: { select: { side: true, submitted_at: true } } } } } });
  return rows.filter((r) => isShown(r, r.workOrder.orderReviews.find((x) => x.side !== r.side), reviewDue(r.workOrder)));
}
function roll<T extends { overall: number } & Record<string, unknown>>(rows: T[], side: OrderReviewSide): Rating {
  const parts: Record<string, number> = {};
  for (const [k, label] of REVIEW_FIELDS[side]) parts[label] = rows.reduce((n, r) => n + Number(r[k] ?? 0), 0) / (rows.length || 1);
  return { avg: rows.reduce((n, r) => n + r.overall, 0) / (rows.length || 1), n: rows.length, parts };
}

/** Seller ratings by person id (what buyers said about them). */
export async function sellerRatings(personIds: string[]): Promise<Map<string, Rating>> {
  const ids = [...new Set(personIds)].filter(Boolean);
  if (!ids.length) return new Map();
  const rows = await visibleReviews({ side: "BUYER", reviewee_person_id: { in: ids } });
  return new Map(ids.map((id) => [id, roll(rows.filter((r) => r.reviewee_person_id === id), "BUYER")] as const).filter(([, r]) => r.n > 0));
}

/** Buyer ratings by company id (what sellers said about that company). */
export async function buyerRatings(companyIds: string[]): Promise<Map<string, Rating>> {
  const ids = [...new Set(companyIds)].filter(Boolean);
  if (!ids.length) return new Map();
  const rows = await visibleReviews({ side: "SELLER", reviewee_company_id: { in: ids } });
  return new Map(ids.map((id) => [id, roll(rows.filter((r) => r.reviewee_company_id === id), "SELLER")] as const).filter(([, r]) => r.n > 0));
}

/** The newest visible comments about a seller (hidden comments left out; their stars still count). */
export async function sellerComments(personId: string, take?: number) {
  const rows = (await visibleReviews({ side: "BUYER", reviewee_person_id: { in: [personId] } })).filter((r) => r.comment && !r.comment_hidden_at);
  const people = new Map((await prisma.person.findMany({ where: { id: { in: rows.map((r) => r.reviewer_person_id) } }, select: { id: true, company: { select: { name: true } } } })).map((p) => [p.id, p.company?.name ?? null]));
  return rows.slice(0, take ?? rows.length).map((r) => ({ id: r.id, overall: r.overall, comment: r.comment!, company: people.get(r.reviewer_person_id) ?? null, at: r.submitted_at }));
}

/** "★ 4.8 · 12 Reviews" — or nothing when there are none. */
export const ratingText = (r: Rating | undefined | null) => (r && r.n ? `★ ${r.avg.toFixed(1)} · ${r.n} Review${r.n === 1 ? "" : "s"}` : null);

/** Admin: hide one comment, with a reason (audited). The stars stay. */
export async function hideReviewComment(viewer: Viewer, reviewId: string, reason: string) {
  if (!viewer.isSystemAdmin) throw new ReviewError("Admins only.");
  const why = reason.trim();
  if (!why) throw new ReviewError("Give a reason.");
  const r = await prisma.orderReview.update({ where: { id: reviewId }, data: { comment_hidden_at: new Date(), comment_hidden_reason: why.slice(0, 300) } });
  await writeAudit(viewer, { action: "order_review.hide_comment", targetTable: "order_reviews", targetId: r.id, detail: { reason: why, work_order_id: r.work_order_id } });
}

/** OR-E001: the seller's "Ask {buyer} for a Recommendation" on the review confirmation — sent to the Order's buyer. */
export async function askBuyerForRecommendation(viewer: Viewer, orderId: string, origin?: string | null) {
  const ctx = await reviewContext(viewer, orderId);
  if (ctx.side !== "SELLER") throw new ReviewError("Only the provider on this Order can ask.");
  const b = await prisma.person.findUnique({ where: { id: ctx.order.buyer_person_id }, select: { first_name: true, last_name: true, user: { select: { email: true } } } });
  if (!b?.user?.email) throw new ReviewError("We don't have an email for that buyer.");
  const { requestRecommendation, RecommendationError } = await import("@/lib/recommendations");
  try {
    return await requestRecommendation(viewer, { contactName: `${b.first_name ?? ""} ${b.last_name ?? ""}`.trim() || ctx.otherName, contactEmail: b.user.email, message: `Thanks for working with me on ${ctx.title}. Would you write me a short recommendation?` }, { origin });
  } catch (e) {
    if (e instanceof RecommendationError) throw new ReviewError(e.message);
    throw e;
  }
}
