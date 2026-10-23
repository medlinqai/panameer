import { prisma } from "@/lib/prisma";
import type { Viewer } from "@/lib/access";
import type { ActGroup } from "@/components/hire/ActGroups";
import { offerExpiry } from "@/lib/app-actions";
import { providerLabel, providerNumbers, identityVisibleTo } from "@/lib/provider-number";

// SE-E001–E004: the Shop and Estimate Overviews, built like Hire's — groups of "needs you" rows with paired actions,
// one summary line, and a thin path band. Provider numbers until a Work Order is Released.
const DAY = 86_400_000;
const TZ = "America/New_York";
const usd = (c: number | null | undefined) => (c == null ? "—" : `$${(c / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`);
const when = (d: Date) => d.toLocaleString("en-US", { timeZone: TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
export type Band = { key: string; label: string; count: number; href: string; needs?: boolean }[];

async function maskedLabels(viewer: Viewer, personIds: string[]) {
  const ids = [...new Set(personIds)];
  const [profiles, seen, people] = await Promise.all([
    prisma.providerProfile.findMany({ where: { person_id: { in: ids } }, select: { id: true, person_id: true } }),
    identityVisibleTo(viewer, ids),
    prisma.person.findMany({ where: { id: { in: ids } }, select: { id: true, first_name: true, last_name: true } }),
  ]);
  const nums = await providerNumbers(profiles.map((p) => p.id));
  return (id: string) => {
    const p = people.find((x) => x.id === id);
    return seen.has(id) && p ? `${p.first_name} ${p.last_name}`.trim() : providerLabel(nums.get(profiles.find((x) => x.person_id === id)?.id ?? "")).replace(/^Provider /, "");
  };
}

// ── Shop ───────────────────────────────────────────────────────────────────────────────────────────────────────
export async function shopOverview(viewer: Viewer, personId: string, side: "buyer" | "seller") {
  const now = new Date();
  const soon = new Date(now.getTime() + DAY);
  const offers = await prisma.serviceProductOffer.findMany({
    where: { ...(side === "buyer" ? { buyer_person_id: personId } : { provider_person_id: personId }), status: { in: ["OPEN", "COUNTERED"] }, service_product_id: { not: null } },
    orderBy: { created_at: "asc" },
    select: { id: true, status: true, amount_cents: true, counter_amount_cents: true, expires_at: true, countered_at: true, created_at: true, buyer_person_id: true, provider_person_id: true, service_product_id: true },
  });
  const products = await prisma.serviceProduct.findMany({ where: { id: { in: offers.map((o) => o.service_product_id!) } }, select: { id: true, title: true, price_cents: true } });
  const title = (id: string | null) => products.find((p) => p.id === id)?.title ?? "Product";
  const listOf = (id: string | null) => products.find((p) => p.id === id)?.price_cents ?? null;
  const groups: ActGroup[] = [];
  const orderWhere = { ...(side === "buyer" ? { buyer_person_id: personId } : { provider_person_id: personId }), lines: { some: { service_product_id: { not: null } } }, status: { notIn: ["CANCELLED" as const, "CLOSED" as const, "FINALLY_CLOSED" as const] } };
  const [cartLines, woCount] = await Promise.all([
    side === "buyer" ? prisma.workRequestLine.findMany({ where: { workRequest: { buyer_person_id: personId, source: "SHOP", status: "INCOMPLETE" } }, select: { id: true, created_at: true, description: true, service_product_id: true } }) : Promise.resolve([]),
    prisma.workOrder.count({ where: orderWhere }),
  ]);

  if (side === "buyer") {
    const who = await maskedLabels(viewer, offers.map((o) => o.provider_person_id));
    const countered = offers.filter((o) => o.status === "COUNTERED");
    const expiring = offers.filter((o) => o.status === "OPEN" && offerExpiry(o) <= soon);
    const staleCart = cartLines.filter((l) => l.created_at.getTime() < now.getTime() - 3 * DAY);
    groups.push({ title: "Offers to answer", rows: countered.map((o) => ({
      key: `oa-${o.id}`, href: "/shop?tab=offers", what: `${title(o.service_product_id)} · ${who(o.provider_person_id)} countered ${usd(o.counter_amount_cents)}`,
      detail: `Your offer ${usd(o.amount_cents)} · respond by ${when(offerExpiry(o))}`,
      actions: [
        { label: "Accept", post: { url: "/api/shop/offers", body: { action: "answer", offerId: o.id, accept: true } }, toast: "Counter-offer accepted" },
        { label: "Counter", post: { url: "/api/app-actions", body: { action: "offerCounterBack", offerId: o.id } }, ask: { text: "Your new offer ($)", field: "amountCents", cents: true }, toast: "New offer sent" },
        { label: "Decline", post: { url: "/api/shop/offers", body: { action: "answer", offerId: o.id, accept: false } }, toast: "Counter-offer declined" },
      ],
    })) });
    groups.push({ title: "Offers expiring", rows: expiring.map((o) => ({
      key: `oe-${o.id}`, href: "/shop?tab=offers", what: `${title(o.service_product_id)} · your offer ${usd(o.amount_cents)}`,
      detail: `${who(o.provider_person_id)} · list ${usd(listOf(o.service_product_id))} · expires ${when(offerExpiry(o))}`,
      actions: [
        { label: "Extend", post: { url: "/api/app-actions", body: { action: "offerExtend", offerId: o.id } }, ask: { text: "Extend by how many hours?", field: "hours", initial: "48" }, toast: "Offer extended" },
        { label: "Withdraw", post: { url: "/api/shop/offers", body: { action: "withdraw", offerId: o.id } }, toast: "Offer withdrawn" },
      ],
    })) });
    groups.push({ title: "In cart", rows: staleCart.map((l) => ({
      key: `c-${l.id}`, href: "/shop?tab=cart", what: l.description ?? "Requisition item", detail: `On your requisition since ${when(l.created_at)}`,
      actions: [
        { label: "Review Requisition", href: "/shop?tab=cart" },
        { label: "Remove", post: { url: "/api/cart", body: { action: "remove", lineId: l.id } }, toast: "Removed from cart" },
      ],
    })) });
  } else {
    const buyers = await prisma.person.findMany({ where: { id: { in: offers.map((o) => o.buyer_person_id) } }, select: { id: true, company: { select: { name: true } } } });
    const co = (id: string) => buyers.find((b) => b.id === id)?.company?.name ?? "A buyer";
    const open = offers.filter((o) => o.status === "OPEN");
    const expiring = open.filter((o) => offerExpiry(o) <= soon);
    const received = open.filter((o) => offerExpiry(o) > soon);
    const mine = await prisma.serviceProduct.findMany({ where: { providerProfile: { person_id: personId }, offered: true, OR: [{ status: "DRAFT" }, { price_cents: null }, { AND: [{ cover_image_url: null }, { images: { none: {} } }] }] }, take: 20, select: { id: true, title: true, status: true, price_cents: true } });
    const offerRow = (o: (typeof offers)[number], prefix: string) => ({
      key: `${prefix}-${o.id}`, href: "/shop?tab=offers", what: `${co(o.buyer_person_id)} offered ${usd(o.amount_cents)} on ${title(o.service_product_id)}`,
      detail: `List ${usd(listOf(o.service_product_id))} · respond by ${when(offerExpiry(o))}`,
    });
    groups.push({ title: "Offers received", rows: received.map((o) => ({ ...offerRow(o, "or"), actions: [
      { label: "Accept", post: { url: "/api/provider/offers", body: { action: "accept", offerId: o.id } }, toast: "Offer accepted" },
      { label: "Counter", post: { url: "/api/provider/offers", body: { action: "counter", offerId: o.id } }, ask: { text: "Your counter ($)", field: "amountCents", cents: true }, toast: "Counter sent" },
      { label: "Decline", post: { url: "/api/provider/offers", body: { action: "deny", offerId: o.id } }, toast: "Offer declined" },
    ] })) });
    groups.push({ title: "Offers expiring", rows: expiring.map((o) => ({ ...offerRow(o, "ox"), actions: [
      { label: "Extend", post: { url: "/api/app-actions", body: { action: "offerExtend", offerId: o.id } }, ask: { text: "Extend by how many hours?", field: "hours", initial: "48" }, toast: "Offer extended" },
      { label: "Let expire", post: { url: "/api/provider/offers", body: { action: "deny", offerId: o.id, message: "This offer expired." } }, toast: "Offer left to expire" },
    ] })) });
    groups.push({ title: "Products to finish", rows: mine.map((p) => ({
      key: `p-${p.id}`, href: "/catalog/products", what: p.title || "Untitled product",
      detail: [p.status === "DRAFT" ? "Draft" : null, p.price_cents == null ? "no price" : null, "no picture yet"].filter(Boolean).join(" · "),
      actions: [
        { label: "Finish", href: "/catalog/products" },
        { label: "Hide", post: { url: "/api/app-actions", body: { action: "hideProduct", productId: p.id } }, toast: "Hidden from Shop" },
      ],
    })) });
  }
  const count = groups.reduce((n, g) => n + g.rows.length, 0);
  const band: Band = [
    { key: "browse", label: "Browse", count: 0, href: "/shop?tab=browse" },
    { key: "offer", label: "Offer", count: offers.length, href: "/shop?tab=offers", needs: groups.slice(0, 2).some((g) => g.rows.length > 0) },
    { key: "wr", label: "Request", count: cartLines.length, href: side === "buyer" ? "/shop?tab=cart" : "/shop?tab=sales" },
    { key: "wo", label: "Order Created · Orders →", count: woCount, href: "/orders/overview" },
  ];
  const summary = [`${offers.length} open offer${offers.length === 1 ? "" : "s"}`, side === "buyer" ? `${cartLines.length} in cart` : null, `${woCount} product Order${woCount === 1 ? "" : "s"} in flight`].filter(Boolean).join(" · ");
  return { groups, count, band, summary };
}

// ── Estimate ───────────────────────────────────────────────────────────────────────────────────────────────────
const KIND: Record<string, string> = { SERVICE: "Service – Rate", FIXED: "Fixed", NOT_TO_EXCEED: "Not to Exceed" };

export async function estimateOverview(viewer: Viewer, personId: string, side: "buyer" | "seller") {
  const now = new Date();
  const soon = new Date(now.getTime() + DAY);
  const groups: ActGroup[] = [];
  if (side === "buyer") {
    const events = await prisma.sourcingEvent.findMany({ where: { created_by_person_id: personId, type: "ESTIMATES" }, select: { id: true, event_number: true, status: true, deadline_at: true, work_order_id: true, job: { select: { title: true } } } });
    const open = events.filter((e) => e.status === "OPEN");
    const reqs = await prisma.estimateRequest.findMany({ where: { sourcing_event_id: { in: open.map((e) => e.id) } }, select: { sourcing_event_id: true, provider_person_id: true, cost_estimate_id: true, status: true } });
    const ests = await prisma.estimate.findMany({ where: { id: { in: reqs.map((r) => r.cost_estimate_id).filter((x): x is string => !!x) }, status: "SENT", shortlisted_at: null }, select: { id: true, provider_person_id: true, valid_until: true, revisions: { orderBy: { revision_number: "desc" }, take: 1, select: { total_cents: true, lines: { select: { kind: true } } } } } });
    const who = await maskedLabels(viewer, [...ests.map((e) => e.provider_person_id), ...reqs.map((r) => r.provider_person_id)]);
    const evOf = (estId: string) => open.find((e) => e.id === reqs.find((r) => r.cost_estimate_id === estId)?.sourcing_event_id);
    groups.push({ title: "Estimates in", rows: ests.map((e) => { const ev = evOf(e.id); const rev = e.revisions[0]; return {
      key: `ei-${e.id}`, href: ev ? `/estimate/${ev.id}` : "/estimate", what: `${who(e.provider_person_id)} · ${usd(rev?.total_cents)}`,
      detail: [ev?.job.title, [...new Set(rev?.lines.map((l) => KIND[l.kind] ?? l.kind) ?? [])].join(" + ") || null, `valid until ${e.valid_until.toLocaleDateString("en-US", { timeZone: TZ, month: "short", day: "numeric" })}`].filter(Boolean).join(" · "),
      actions: [
        { label: "Shortlist", post: { url: "/api/app-actions", body: { action: "estimateShortlist", estimateId: e.id } }, toast: "Shortlisted" },
        { label: "Decline", post: { url: "/api/app-actions", body: { action: "estimateDecline", estimateId: e.id } }, toast: "Estimate declined" },
      ] }; }) });
    const expiring = open.filter((e) => e.deadline_at <= soon);
    groups.push({ title: "Requests expiring", rows: expiring.map((e) => { const rs = reqs.filter((r) => r.sourcing_event_id === e.id); const inN = rs.filter((r) => r.status === "ANSWERED").length; return {
      key: `re-${e.id}`, href: `/estimate/${e.id}`, what: e.job.title, detail: `${e.event_number} · ${e.deadline_at <= now ? "closed" : "closes"} ${when(e.deadline_at)} · ${inN} of ${rs.length} in`,
      actions: [
        { label: "Extend", post: { url: "/api/sourcing", body: { action: "extend", eventId: e.id } }, ask: { text: "Extend by how many hours?", field: "hours", initial: "24" }, toast: "Deadline extended" },
        { label: "Close", post: { url: "/api/sourcing", body: { action: "close", eventId: e.id } }, toast: "Request closed" },
      ] }; }) });
    const providerUsers = await prisma.person.findMany({ where: { id: { in: [...new Set(reqs.map((r) => r.provider_person_id))] } }, select: { id: true, user_id: true } });
    const msgs = providerUsers.length ? await prisma.message.findMany({ where: { to_user_id: viewer.userId, read_at: null, from_user_id: { in: providerUsers.map((p) => p.user_id).filter((x): x is string => !!x) } }, orderBy: { created_at: "desc" }, take: 10, select: { id: true, from_user_id: true, body: true, created_at: true } }) : [];
    groups.push({ title: "Provider questions", rows: msgs.map((m) => { const pid = providerUsers.find((p) => p.user_id === m.from_user_id)?.id ?? ""; return {
      key: `q-${m.id}`, href: `/messages?with=${m.from_user_id}`, what: `${who(pid)} asked`, detail: `“${m.body.slice(0, 90)}${m.body.length > 90 ? "…" : ""}” · ${when(m.created_at)}`,
      actions: [{ label: "Reply", href: `/messages?with=${m.from_user_id}` }, { label: "Dismiss", post: { url: "/api/app-actions", body: { action: "dismissMessage", messageId: m.id } }, toast: "Dismissed" }] }; }) });
    const stepOf = (e: (typeof events)[number]) => (e.work_order_id ? "wo" : e.status === "AWARDED" ? "award" : reqs.some((r) => r.sourcing_event_id === e.id && r.status === "ANSWERED") ? "in" : "ask");
    const live = events.filter((e) => e.status !== "CLOSED");
    const band: Band = [
      { key: "describe", label: "Describe", count: 0, href: "/estimate/new" },
      { key: "ask", label: "Ask Providers", count: live.filter((e) => stepOf(e) === "ask").length, href: "/estimate?tab=requests" },
      { key: "in", label: "Estimates In", count: live.filter((e) => stepOf(e) === "in").length, href: "/estimate?tab=in", needs: ests.length > 0 },
      { key: "award", label: "Award", count: live.filter((e) => stepOf(e) === "award").length, href: "/estimate?tab=awarded" },
      { key: "approval", label: "Approval", count: 0, href: "/estimate?tab=awarded" },
      { key: "wo", label: "Order Created · Orders →", count: events.filter((e) => e.work_order_id).length, href: "/orders/overview" },
    ];
    const count = groups.reduce((n, g) => n + g.rows.length, 0);
    return { groups, count, band, summary: `${open.length} open request${open.length === 1 ? "" : "s"} · ${ests.length} estimate${ests.length === 1 ? "" : "s"} waiting` };
  }

  // Provider
  const reqs = await prisma.estimateRequest.findMany({ where: { provider_person_id: personId, sourcing_event_id: { not: null } }, select: { id: true, status: true, description: true, requester_person_id: true, cost_estimate_id: true, sourcing_event_id: true } });
  const events = await prisma.sourcingEvent.findMany({ where: { id: { in: reqs.map((r) => r.sourcing_event_id!) } }, select: { id: true, status: true, deadline_at: true, job: { select: { title: true } } } });
  const buyers = await prisma.person.findMany({ where: { id: { in: reqs.map((r) => r.requester_person_id) } }, select: { id: true, company: { select: { name: true } } } });
  const ests = await prisma.estimate.findMany({ where: { provider_person_id: personId, id: { in: reqs.map((r) => r.cost_estimate_id).filter((x): x is string => !!x) } }, select: { id: true, status: true, shortlisted_at: true, work_order_id: true } });
  const ev = (r: (typeof reqs)[number]) => events.find((e) => e.id === r.sourcing_event_id);
  const openReqs = reqs.filter((r) => r.status === "OPEN" && ev(r)?.status === "OPEN" && ev(r)!.deadline_at > now);
  const rowFor = (r: (typeof reqs)[number], prefix: string, actions: ActGroup["rows"][number]["actions"]) => ({
    key: `${prefix}-${r.id}`, href: `/estimates/requests/${r.id}`, what: `${buyers.find((b) => b.id === r.requester_person_id)?.company?.name ?? "A buyer"} · ${ev(r)?.job.title ?? r.description.split("\n")[0].slice(0, 80)}`,
    detail: ev(r) ? `due ${when(ev(r)!.deadline_at)}` : "", actions,
  });
  const decline = (r: (typeof reqs)[number]) => ({ label: "Decline", post: { url: `/api/estimate-requests/${r.id}`, body: { action: "decline" } }, ask: { text: "Why are you declining? (the buyer sees this)", field: "reason" }, toast: "Request declined" });
  const price = (r: (typeof reqs)[number]) => ({ label: "Price It", href: `/catalog/estimates/new?request=${r.id}${r.cost_estimate_id ? `&id=${r.cost_estimate_id}` : ""}` });
  const dueSoon = openReqs.filter((r) => !r.cost_estimate_id && ev(r)!.deadline_at <= soon);
  const toPrice = openReqs.filter((r) => !r.cost_estimate_id && ev(r)!.deadline_at > soon);
  const changes = reqs.filter((r) => r.cost_estimate_id && ests.find((e) => e.id === r.cost_estimate_id)?.status === "CHANGES_REQUESTED");
  groups.push({ title: "To price", rows: toPrice.map((r) => rowFor(r, "tp", [price(r), decline(r)])) });
  groups.push({ title: "Changes requested", rows: changes.map((r) => rowFor(r, "cr", [{ label: "Revise", href: `/catalog/estimates/new?request=${r.id}&id=${r.cost_estimate_id}` }, decline(r)])) });
  groups.push({ title: "Due soon", rows: dueSoon.map((r) => rowFor(r, "ds", [price(r), decline(r)])) });
  const woIds = ests.map((e) => e.work_order_id).filter((x): x is string => !!x);
  const toAccept = woIds.length ? await prisma.workOrder.count({ where: { id: { in: woIds }, status: "ISSUED", provider_accepted_at: null } }) : 0;
  const band: Band = [
    { key: "requested", label: "Requested", count: openReqs.filter((r) => !r.cost_estimate_id).length, href: "/estimate?tab=to-price", needs: dueSoon.length + toPrice.length > 0 },
    { key: "priced", label: "Priced", count: ests.filter((e) => e.status === "SENT" && !e.shortlisted_at).length, href: "/estimate?tab=sent" },
    { key: "shortlisted", label: "Shortlisted", count: ests.filter((e) => e.status === "SENT" && e.shortlisted_at).length, href: "/estimate?tab=sent" },
    { key: "won", label: "Won", count: ests.filter((e) => e.status === "ACCEPTED").length, href: "/estimate?tab=won" },
    { key: "accept", label: "Order to Accept · Orders →", count: toAccept, href: "/orders/overview" },
  ];
  const count = groups.reduce((n, g) => n + g.rows.length, 0);
  return { groups, count, band, summary: `${openReqs.length} open request${openReqs.length === 1 ? "" : "s"} · ${ests.filter((e) => e.status === "SENT").length} estimate${ests.filter((e) => e.status === "SENT").length === 1 ? "" : "s"} sent` };
}
