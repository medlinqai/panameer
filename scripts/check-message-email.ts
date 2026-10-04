import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { decideMessageEmail, MESSAGE_EMAIL_WINDOW_MS } from "@/lib/message-email-batch";
import { NOTIFICATION_EMAIL_EVENTS } from "@/lib/notification-email";
import { recordProfileView } from "@/lib/profile-views";

// R-E018: message emails are on, and batched to one per sender per 15 minutes. Throwaway users only.
let pass = 0;
const fails: string[] = [];
const check = (n: string, ok: boolean, d = "") => (ok ? pass++ : fails.push(`${n}${d ? " — " + d : ""}`));

const t0 = new Date("2026-10-04T12:00:00Z");
check("1 — first message mails", JSON.stringify(decideMessageEmail(null, t0, 1)) === '{"hold":false,"count":1}');
check("2 — inside 15 min holds", decideMessageEmail(t0, new Date(t0.getTime() + MESSAGE_EMAIL_WINDOW_MS - 1), 3).hold === true);
const after = decideMessageEmail(t0, new Date(t0.getTime() + MESSAGE_EMAIL_WINDOW_MS), 3);
check("3 — after the window one mail covers the backlog", !after.hold && after.count === 3);
check("4 — message.received is on the email allowlist", NOTIFICATION_EMAIL_EVENTS.includes("message.received"));

const TAG = `e2e-msgmail-${Date.now()}`;
(async () => {
  const host = await prisma.person.findFirst({ select: { company_id: true, site_id: true }, orderBy: { created_at: "asc" } });
  const mk = async (n: string) => {
    const u = await prisma.user.create({ data: { email: `${TAG}-${n}@example.seed`, password_hash: "x", first_name: n, last_name: "Test" }, select: { id: true } });
    const p = await prisma.person.create({ data: { user_id: u.id, first_name: n, last_name: "Test", company_id: host!.company_id, site_id: host!.site_id }, select: { id: true } });
    return { userId: u.id, personId: p.id };
  };
  const a = await mk("Daniel");
  const b = await mk("Recipient");
  try {
    const send = async (i: number) => {
      const m = await prisma.message.create({ data: { from_user_id: a.userId, to_user_id: b.userId, body: `hi ${i}` }, select: { id: true } });
      await notify({ event: "message.received", personId: b.personId, entityType: "message", entityId: m.id, vars: { senderName: "Daniel Test" } });
    };
    await send(0);
    const first = await prisma.notification.findFirst({ where: { person_id: b.personId, event_key: "message.received" }, select: { id: true, email_sent_at: true, suppressed_reason: true } });
    check("5 — the first message attempted an email", first?.email_sent_at != null || /^email_(refused|suppressed)$/.test(first?.suppressed_reason ?? ""), JSON.stringify(first));
    // Locally the transport refuses every address, so stand in for a delivered first mail.
    await prisma.notification.update({ where: { id: first!.id }, data: { email_sent_at: new Date(), suppressed_reason: null } });
    await send(1);
    await send(2);
    const rest = await prisma.notification.findMany({
      where: { person_id: b.personId, event_key: "message.received", id: { not: first!.id } },
      select: { email_sent_at: true, suppressed_reason: true },
    });
    check("6 — the next two are held inside the window", rest.length === 2 && rest.every((r) => r.email_sent_at == null && r.suppressed_reason === "email_batched"), JSON.stringify(rest));

    // Run 13: any other action event bursts are held too — one email per person per event per 15 min.
    await notify({ event: "work.order_offered", personId: b.personId, entityType: "order", entityId: null, vars: { orderId: "x" } });
    const o1 = await prisma.notification.findFirst({ where: { person_id: b.personId, event_key: "work.order_offered" }, select: { id: true } });
    await prisma.notification.update({ where: { id: o1!.id }, data: { email_sent_at: new Date(), suppressed_reason: null } });
    await notify({ event: "work.order_offered", personId: b.personId, entityType: "order", entityId: null, vars: { orderId: "y" } });
    const o2 = await prisma.notification.findFirst({ where: { person_id: b.personId, event_key: "work.order_offered", id: { not: o1!.id } }, select: { email_sent_at: true, suppressed_reason: true } });
    check("7 — a second action email of the same kind inside 15 minutes is held", o2?.email_sent_at == null && o2?.suppressed_reason === "email_batched", JSON.stringify(o2));
    check("8 — work.order_offered is on the email allowlist", NOTIFICATION_EMAIL_EVENTS.includes("work.order_offered"));

    // Run 13 lane 3: profile views group into one bell line per day, linking to /usage.
    const prof = await prisma.providerProfile.create({ data: { person_id: b.personId, status: "ACTIVE", currency: "USD" }, select: { id: true } });
    const c = await mk("Viewer");
    try {
      await recordProfileView({ profileId: prof.id, viewerUserId: a.userId, isOwner: false });
      await recordProfileView({ profileId: prof.id, viewerUserId: c.userId, isOwner: false });
      await recordProfileView({ profileId: prof.id, viewerUserId: c.userId, isOwner: false });
      const views = await prisma.notification.findMany({ where: { person_id: b.personId, event_key: "profile.viewed" }, select: { title: true, href: true } });
      check("9 — two viewers today make ONE bell row", views.length === 1, JSON.stringify(views));
      check("10 — it reads '2 people viewed your profile today' and opens /usage", views[0]?.title === "2 people viewed your profile today" && views[0]?.href === "/usage", JSON.stringify(views));
    } finally {
      await prisma.profileView.deleteMany({ where: { profile_id: prof.id } });
      await prisma.providerProfile.delete({ where: { id: prof.id } });
      await prisma.person.deleteMany({ where: { id: c.personId } });
      await prisma.user.deleteMany({ where: { id: c.userId } });
    }
  } finally {
    await prisma.notification.deleteMany({ where: { person_id: { in: [a.personId, b.personId] } } });
    await prisma.message.deleteMany({ where: { from_user_id: a.userId } });
    await prisma.person.deleteMany({ where: { id: { in: [a.personId, b.personId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [a.userId, b.userId] } } });
    await prisma.$disconnect();
  }
  if (fails.length) {
    console.log(`check:message-email — ${fails.length} FAILED, ${pass} passed\n`);
    for (const f of fails) console.log("  ✗ " + f);
    process.exit(1);
  }
  console.log(`check:message-email — all ${pass} passed`);
})();
