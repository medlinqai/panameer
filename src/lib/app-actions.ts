import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import { WorkRequestError } from "@/lib/work-request";
import { answerCounter, makeOffer } from "@/lib/service-product-offers";
import { resolveNotifications } from "@/lib/notifications";

// SE-E001–E004: the in-place actions behind the Shop and Estimate Overview rows. Every one is owner-scoped.
async function me(viewer: Viewer) {
  const p = await prisma.person.findUnique({ where: { user_id: viewer.userId }, select: { id: true } });
  if (!p) throw new WorkRequestError("No person for this account.", "NOT_FOUND");
  return p.id;
}
export const offerExpiry = (o: { expires_at: Date | null; countered_at: Date | null; created_at: Date }) => o.expires_at ?? new Date((o.countered_at ?? o.created_at).getTime() + 3 * 86_400_000);

/** Buyer answers a counter with a new amount: the old offer is withdrawn and a new one goes to the seller. */
export async function counterBack(viewer: Viewer, offerId: string, amountCents: number) {
  const id = await me(viewer);
  const o = await prisma.serviceProductOffer.findFirst({ where: { id: offerId, buyer_person_id: id, status: "COUNTERED" }, select: { service_product_id: true } });
  if (!o?.service_product_id) throw new WorkRequestError("That counter-offer isn't waiting on you any more.", "NOT_FOUND");
  await answerCounter(viewer, { offerId, accept: false });
  return makeOffer(viewer, { serviceProductId: o.service_product_id, amountCents });
}

/** Either side extends how long an open offer waits. */
export async function extendOffer(viewer: Viewer, offerId: string, hours: number) {
  const id = await me(viewer);
  const h = Math.round(hours);
  if (!Number.isFinite(h) || h < 1 || h > 720) throw new WorkRequestError("Extend by 1 to 720 hours.", "INVALID");
  const o = await prisma.serviceProductOffer.findFirst({ where: { id: offerId, status: { in: ["OPEN", "COUNTERED"] }, OR: [{ buyer_person_id: id }, { provider_person_id: id }] }, select: { id: true, expires_at: true, countered_at: true, created_at: true } });
  if (!o) throw new WorkRequestError("That offer isn't open any more.", "NOT_FOUND");
  await prisma.serviceProductOffer.update({ where: { id: o.id }, data: { expires_at: new Date(Math.max(Date.now(), offerExpiry(o).getTime()) + h * 3_600_000) } });
}

/** Seller hides a product from Shop (it stays in their catalog). */
export async function hideProduct(viewer: Viewer, productId: string) {
  const id = await me(viewer);
  const r = await prisma.serviceProduct.updateMany({ where: { id: productId, providerProfile: { person_id: id } }, data: { offered: false } });
  if (!r.count) throw new WorkRequestError("That product isn't yours.", "NOT_FOUND");
}

/** Buyer shortlists an estimate in their Estimate Event. */
export async function shortlistEstimate(viewer: Viewer, estimateId: string) {
  const id = await me(viewer);
  const r = await prisma.estimate.updateMany({ where: { id: estimateId, customer_person_id: id, status: "SENT" }, data: { shortlisted_at: new Date() } });
  if (!r.count) throw new WorkRequestError("That estimate isn't waiting on you any more.", "NOT_FOUND");
  await resolveNotifications({ entity_id: estimateId, event_key: "estimate.received" });
}

/** Mark a message read (Dismiss on "Provider questions"). */
export async function dismissMessage(viewer: Viewer, messageId: string) {
  await prisma.message.updateMany({ where: { id: messageId, to_user_id: viewer.userId, read_at: null }, data: { read_at: new Date() } });
  await resolveNotifications({ entity_id: messageId, event_key: "message.received" });
}
