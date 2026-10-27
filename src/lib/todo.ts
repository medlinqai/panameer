import { prisma } from "@/lib/prisma";
import type { AppKey, AttentionItem, AttentionLine } from "@/lib/attention";
import { findCategory } from "@/lib/notification-categories";
import { ACTION_EVENTS } from "@/lib/action-rule";

/** NC-E002: plain words — "Order", never "Work Order"; no raw system numbers. */
export const plainTitle = (t: string) => t.replace(/\bWork Orders?\b/g, (m) => (m.endsWith("s") ? "Orders" : "Order")).replace(/\s*\b(?:WO|WR|JB|RQ|OR|SE|PR|PO|EST)-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*\b/g, "").replace(/\s{2,}/g, " ").replace(/\s+([·—,.])/g, " $1").trim();

const SMALL = new Set(["a", "an", "the", "and", "or", "for", "of", "on", "to", "in", "at", "by"]);
const titleCase = (t: string) => t.split(" ").map((w, i) => (i > 0 && SMALL.has(w) ? w : w.charAt(0).toUpperCase() + w.slice(1))).join(" ");

// WK-E008: one to-do list. Things You Need to Do lines are kept in the Worklist (action notifications, DIGEST so the bell
// isn't flooded); every panel reads the Worklist — the dashboard all apps, each app home its own. Done in either place = done in both.
const APP_CATEGORY: Record<string, string> = { request: "work_request.matched", order: "work_order.status", shop: "service_product.offers", estimate: "service_product.offers", settlement: "buyer.settlement.approval", payment: "buyer.settlement.approval", connect: "community.activity", learn: "learn.progress" };
const CATEGORY_APP: Record<string, AppKey> = { "work_request.matched": "request", "buyer.proposals.received": "request", "buyer.provider.responded": "request", "work_order.status": "order", "buyer.work_order.status": "order", "milestone.due": "order", "buyer.settlement.approval": "settlement", "buyer.timesheet.approval": "settlement", "service_product.offers": "shop", "buyer.offers.answered": "shop", "community.activity": "connect", "recommendation.received": "connect", "message.received": "connect", "learn.progress": "learn", "profile.updates": "connect", "profile.visibility": "connect" };
const key = (side: string, l: AttentionLine) => `todo:${side}:${l.href}|${l.what}`.slice(0, 480);
const last = new Map<string, number>();

/** Write the derived lines into the Worklist and resolve the ones that no longer apply (this side only). Throttled to once per 30 s. */
export async function syncTodo(personId: string, side: "buyer" | "provider", items: AttentionItem[]) {
  const now = Date.now();
  if ((last.get(`${personId}:${side}`) ?? 0) > now - 30_000) return;
  last.set(`${personId}:${side}`, now);
  const open = await prisma.notification.findMany({ where: { person_id: personId, requires_action: true, resolved_at: null }, select: { id: true, dedupe_key: true, href: true } });
  const want = new Map<string, { app: string; group: string; l: AttentionLine }>();
  for (const i of items) {
    const lines = i.lines?.length ? i.lines : [{ key: i.id, what: i.title ?? i.what, detail: i.sub ?? i.appLabel, dueAt: i.dueAt, href: i.href, action: i.action }];
    for (const l of lines) want.set(key(side, l), { app: i.app, group: i.title ?? i.what, l });
  }
  const stale = open.filter((n) => n.dedupe_key?.startsWith(`todo:${side}:`) && !want.has(n.dedupe_key)).map((n) => n.id);
  if (stale.length) await prisma.notification.updateMany({ where: { id: { in: stale } }, data: { resolved_at: new Date() } });
  for (const [k, { app, group, l }] of want) {
    const data = { title: l.what.slice(0, 300), body: l.detail || null, href: l.href, todo_app: app, todo_group: group, todo_action: l.action, due_at: l.dueAt ? new Date(l.dueAt) : null, resolved_at: null };
    await prisma.notification.upsert({
      where: { person_id_dedupe_key: { person_id: personId, dedupe_key: k } },
      create: { person_id: personId, dedupe_key: k, event_key: "todo.item", category: APP_CATEGORY[app] ?? "work_request.matched", requires_action: true, visibility: "DIGEST", delivered_in_app_at: new Date(), ...data },
      update: data,
    }).catch(() => null);
  }
}

/** Things You Need to Do, read from the Worklist: groups (top lines + See All → the Worklist filtered), optionally limited to some apps. */
export async function todoGroups(personId: string, side: "buyer" | "provider", apps?: string[]): Promise<AttentionItem[]> {
  const other = side === "buyer" ? "provider" : "buyer";
  const rows = await prisma.notification.findMany({
    where: { person_id: personId, requires_action: true, resolved_at: null, delivered_in_app_at: { not: null }, event_key: { in: [...ACTION_EVENTS] }, NOT: { dedupe_key: { startsWith: `todo:${other}:` } } },
    orderBy: [{ due_at: { sort: "asc", nulls: "last" } }, { created_at: "asc" }], take: 300,
    select: { id: true, title: true, body: true, href: true, category: true, todo_app: true, todo_group: true, todo_action: true, due_at: true, dedupe_key: true, event_key: true },
  });
  // NC-E002: one row per record — a derived line beats an older event row for the same page.
  const derived = new Set(rows.filter((n) => n.event_key === "todo.item").map((n) => n.href));
  const groups = new Map<string, AttentionItem>();
  for (const n of rows) {
    if (n.event_key !== "todo.item" && n.href && derived.has(n.href)) continue;
    const app = (n.todo_app ?? CATEGORY_APP[n.category] ?? "connect") as AppKey;
    if (apps && !apps.includes(app)) continue;
    const cat = findCategory(n.category)?.label;
    const group = n.todo_group ?? (cat ? titleCase(cat) : "To Do");
    const g = groups.get(group) ?? { id: `wl:${group}`, title: group, what: group, n: 0, app, appLabel: group, due: null, dueAt: null, href: n.todo_group ? `/worklist?group=${encodeURIComponent(group)}` : `/worklist?cat=${encodeURIComponent(n.category)}`, action: "Open", lines: [] };
    g.n = (g.n ?? 0) + 1;
    g.lines!.push({ key: n.id, what: plainTitle(n.title), detail: n.body ?? "", dueAt: n.due_at?.toISOString() ?? null, href: n.href ?? "/worklist", action: n.todo_action ?? "Open" });
    if (n.due_at && (!g.dueAt || n.due_at.toISOString() < g.dueAt)) g.dueAt = n.due_at.toISOString();
    groups.set(group, g);
  }
  return [...groups.values()];
}
