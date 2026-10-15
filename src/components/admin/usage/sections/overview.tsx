import type { UsageApp } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { change, distinctSeries, inCur, listHref, metric, span, type Ctx } from "@/lib/admin-usage/core";
import { isoDay, peopleList, personUsers, type Lists } from "@/lib/admin-usage/lists";
import { VISIBILITY_THRESHOLD } from "@/lib/completeness";
import { UsageChart } from "@/components/admin/usage/UsageChart";
import { Bars, DataTable, Funnel, Grid2, Tile, Tiles } from "@/components/admin/usage/parts";

// A-E002: Overview — members active per day, the four tiles, where members spend time, the sign-up funnel, Lack of Use.
const APPS: { app: UsageApp | "ALL"; label: string }[] = [
  { app: "ALL", label: "All Apps" }, { app: "CONNECT", label: "Connect" }, { app: "LEARN", label: "Learn" }, { app: "WORK", label: "Work" },
  { app: "SHOP", label: "Shop" }, { app: "ORDERS", label: "Orders" }, { app: "PAY", label: "Pay" },
];
const WEEK = 7 * 86_400_000;

async function data(c: Ctx) {
  const since = span(c);
  const [events, users, lessons, messages, conns, enrolls, attempts, threads, posts, wrs, proposals, estimates, svcs, orders, prs, imports, recs] = await Promise.all([
    prisma.usageEvent.findMany({ where: { day: since }, select: { user_id: true, app: true, day: true } }),
    prisma.user.findMany({ select: { id: true, created_at: true, email_verified: true, last_login: true } }),
    prisma.lessonProgress.findMany({ where: { completed_at: since }, select: { user_id: true, completed_at: true } }),
    prisma.message.findMany({ where: { created_at: since }, select: { from_user_id: true, created_at: true } }),
    prisma.connection.findMany({ select: { from_user_id: true, to_user_id: true, status: true, created_at: true, kind: true } }),
    prisma.enrollment.findMany({ where: { created_at: since }, select: { user_id: true, created_at: true } }),
    prisma.certificationAttempt.findMany({ where: { created_at: since, is_preview: false }, select: { user_id: true, created_at: true } }),
    prisma.forumThread.findMany({ where: { created_at: since }, select: { author_person_id: true, created_at: true } }),
    prisma.forumPost.findMany({ where: { created_at: since }, select: { author_person_id: true, created_at: true } }),
    prisma.workRequest.findMany({ where: { posted_at: since }, select: { buyer_person_id: true, posted_at: true } }),
    prisma.proposal.findMany({ where: { submitted_at: since }, select: { provider_person_id: true, submitted_at: true } }),
    prisma.estimate.findMany({ where: { sent_at: since }, select: { provider_person_id: true, sent_at: true } }),
    prisma.providerService.findMany({ where: { published_at: since }, select: { published_at: true } }),
    prisma.workOrder.findMany({ select: { id: true, buyer_person_id: true, provider_person_id: true, created_at: true, status: true, buyer_accepted_at: true, provider_accepted_at: true } }),
    prisma.paymentRequest.findMany({ where: { submitted_at: since }, select: { provider_person_id: true, submitted_at: true } }),
    prisma.profileImport.findMany({ where: { created_at: since }, select: { created_at: true } }),
    prisma.recommendationRequest.findMany({ where: { created_at: since }, select: { created_at: true } }),
  ]);
  return { events, users, lessons, messages, conns, enrolls, attempts, threads, posts, wrs, proposals, estimates, svcs, orders, prs, imports, recs };
}

async function lackOfUse(c: Ctx) {
  const now = Date.now();
  const [users, events, profiles, paths, conns, orders] = await Promise.all([
    prisma.user.findMany({ where: { created_at: { lt: new Date(now - WEEK) } }, select: { id: true, created_at: true, last_login: true } }),
    prisma.usageEvent.groupBy({ by: ["user_id"], _max: { day: true } }),
    prisma.providerProfile.findMany({ where: { completeness: { lt: 50 } }, select: { person_id: true } }),
    prisma.learningPath.findMany({ where: { status: "PUBLISHED", enrollments: { none: {} } }, select: { id: true, title: true, slug: true } }),
    prisma.connection.findMany({ where: { status: "PENDING", created_at: { lt: new Date(now - WEEK) } }, select: { from_user_id: true, to_user_id: true, created_at: true } }),
    prisma.workOrder.findMany({ where: { status: { in: ["ISSUED", "ACCEPTED"] } }, select: { id: true, order_number: true, created_at: true, buyer_person_id: true, provider_person_id: true } }),
  ]);
  const lastSeen = new Map(events.map((e) => [e.user_id, e._max.day]));
  const neverBack = users.filter((u) => c.userOk(u.id) && (!u.last_login || u.last_login.getTime() - u.created_at.getTime() < 86_400_000) && !(lastSeen.get(u.id) && lastSeen.get(u.id)!.getTime() - u.created_at.getTime() > 86_400_000));
  const lowProfile = profiles.filter((p) => c.personOk(p.person_id));
  const waitingConns = conns.filter((x) => c.userOk(x.from_user_id) && c.userOk(x.to_user_id));
  const waitingOrders = orders.filter((o) => c.personOk(o.buyer_person_id) || c.personOk(o.provider_person_id));
  return { neverBack, lowProfile, paths, waitingConns, waitingOrders };
}

export async function overviewLists(c: Ctx): Promise<Lists> {
  return {
    "members-active": async () => { const d = await data(c); return peopleList(`Members active (${c.label})`, [...new Set(d.events.filter((e) => inCur(c, e.day) && c.userOk(e.user_id)).map((e) => e.user_id))]); },
    "new-members": async () => { const d = await data(c); return peopleList(`New members (${c.label})`, d.users.filter((u) => inCur(c, u.created_at) && c.userOk(u.id)).map((u) => u.id)); },
    "lessons-watched": async () => { const d = await data(c); const ls = d.lessons.filter((l) => inCur(c, l.completed_at) && c.userOk(l.user_id)); const per = new Map<string, number>(); for (const l of ls) per.set(l.user_id, (per.get(l.user_id) ?? 0) + 1); return peopleList(`Lessons watched (${c.label}) — by member`, [...per.keys()], (id) => `${per.get(id)} lessons`); },
    "messages-sent": async () => { const d = await data(c); const ms = d.messages.filter((m) => inCur(c, m.created_at) && c.userOk(m.from_user_id)); const per = new Map<string, number>(); for (const m of ms) per.set(m.from_user_id, (per.get(m.from_user_id) ?? 0) + 1); return peopleList(`Messages sent (${c.label}) — by sender`, [...per.keys()], (id) => `${per.get(id)} sent`); },
    "never-back": async () => peopleList("Signed up, never came back", (await lackOfUse(c)).neverBack.map((u) => u.id)),
    "low-profile": async () => peopleList("Profile under 50% complete", personUsers(c, (await lackOfUse(c)).lowProfile.map((p) => p.person_id))),
    "paths-no-learners": async () => ({ title: "Published paths with no learners", head: ["Learning path"], rows: (await lackOfUse(c)).paths.map((p) => ({ cells: [p.title], href: `/learn/${p.slug}` })) }),
    "connections-waiting": async () => { const l = await lackOfUse(c); return peopleList("Connection requests waiting 7+ days — the members asked", l.waitingConns.map((x) => x.to_user_id)); },
    "orders-waiting": async () => ({ title: "Work orders waiting on acceptance", head: ["Work order", "Created"], rows: (await lackOfUse(c)).waitingOrders.map((o) => ({ cells: [o.order_number, isoDay(o.created_at)], href: `/orders/${o.id}` })) }),
  };
}

export async function Overview({ c, app }: { c: Ctx; app: string | undefined }) {
  const d = await data(c);
  const pick = APPS.find((a) => a.app === app)?.app ?? "ALL";
  const ev = d.events.filter((e) => c.userOk(e.user_id) && (pick === "ALL" || e.app === pick));
  const firstEvent = d.events.reduce<Date | null>((m, e) => (!m || e.day < m ? e.day : m), null);
  const active = (rows: typeof d.events, cur: boolean) => new Set(rows.filter((e) => c.userOk(e.user_id) && (cur ? inCur(c, e.day) : !!c.prevFrom && e.day >= c.prevFrom && e.day < c.from)).map((e) => e.user_id)).size;
  const activeNow = active(d.events, true), activePrev = c.prevFrom ? active(d.events, false) : null;
  const realP = (p: string | null | undefined) => c.personOk(p);
  const cnt = (dates: (Date | null | undefined)[]) => dates.filter((x) => inCur(c, x)).length;
  const where = [
    { label: "Learn", n: cnt([...d.lessons.filter((l) => c.userOk(l.user_id)).map((l) => l.completed_at), ...d.enrolls.filter((e) => c.userOk(e.user_id)).map((e) => e.created_at), ...d.attempts.filter((a) => c.userOk(a.user_id)).map((a) => a.created_at)]), href: "/admin/usage?tab=learn" },
    { label: "Connect", n: cnt([...d.messages.filter((m) => c.userOk(m.from_user_id)).map((m) => m.created_at), ...d.conns.filter((x) => c.userOk(x.from_user_id)).map((x) => x.created_at), ...d.threads.filter((t) => realP(t.author_person_id)).map((t) => t.created_at), ...d.posts.filter((p) => realP(p.author_person_id)).map((p) => p.created_at)]), href: "/admin/usage?tab=connect" },
    { label: "Profile", n: cnt([...d.imports.map((i) => i.created_at), ...d.recs.map((r) => r.created_at)]), href: "/admin/usage?tab=profile" },
    { label: "Work", n: cnt([...d.wrs.filter((w) => realP(w.buyer_person_id)).map((w) => w.posted_at), ...d.proposals.filter((p) => realP(p.provider_person_id)).map((p) => p.submitted_at)]), href: "/admin/usage?tab=work" },
    { label: "Shop", n: cnt([...d.estimates.filter((e) => realP(e.provider_person_id)).map((e) => e.sent_at), ...d.svcs.map((s) => s.published_at)]), href: "/admin/usage?tab=shop" },
    { label: "Orders", n: cnt(d.orders.filter((o) => realP(o.buyer_person_id) || realP(o.provider_person_id)).map((o) => o.created_at)), href: "/admin/usage?tab=orders" },
    { label: "Pay", n: cnt(d.prs.filter((p) => realP(p.provider_person_id)).map((p) => p.submitted_at)), href: "/admin/usage?tab=pay" },
  ].sort((a, b) => b.n - a.n);
  // Funnel: members who signed up in the period — how far they got.
  const joined = d.users.filter((u) => inCur(c, u.created_at) && c.userOk(u.id));
  const ids = new Set(joined.map((u) => u.id));
  const [profiles, everLesson] = await Promise.all([
    prisma.person.findMany({ where: { user_id: { in: [...ids] } }, select: { id: true, user_id: true, providerProfile: { select: { completeness: true } }, requesterProfile: { select: { completed_at: true } } } }),
    prisma.lessonProgress.groupBy({ by: ["user_id"], where: { user_id: { in: [...ids] } } }),
  ]);
  const personOf = new Map(profiles.map((p) => [p.user_id!, p]));
  const profileDone = joined.filter((u) => { const p = personOf.get(u.id); return (p?.providerProfile?.completeness ?? 0) >= VISIBILITY_THRESHOLD || !!p?.requesterProfile?.completed_at; });
  const lessonSet = new Set(everLesson.map((r) => r.user_id));
  const connected = new Set(d.conns.filter((x) => x.status === "ACCEPTED" && x.kind === "COLLEAGUE").flatMap((x) => [x.from_user_id, x.to_user_id]));
  const ordered = new Set(d.orders.flatMap((o) => [o.buyer_person_id, o.provider_person_id]).map((p) => c.personUser.get(p)).filter(Boolean));
  const lack = await lackOfUse(c);
  const tabsHref = (a: string) => `/admin/usage?tab=overview&range=${c.range}${c.includeTest ? "&test=1" : ""}${a === "ALL" ? "" : `&app=${a}`}`;
  return (
    <div className="space-y-3">
      <UsageChart
        title="Members Active per Day"
        subtitle={firstEvent ? `since ${isoDay(firstEvent)} (tracking start)` : "tracking just started"}
        points={distinctSeries(c, ev.map((e) => ({ day: e.day, key: e.user_id })))}
        tabs={APPS.map((a) => ({ label: a.label, href: tabsHref(a.app), on: a.app === pick }))}
      />
      <Tiles>
        <Tile label="Members Active" value={activeNow} delta={change(c, activeNow, activePrev)} href={listHref(c, "members-active")} />
        <Tile label="New Members" {...metric(c, d.users.filter((u) => c.userOk(u.id)).map((u) => u.created_at))} href={listHref(c, "new-members")} />
        <Tile label="Lessons Watched" {...metric(c, d.lessons.filter((l) => c.userOk(l.user_id)).map((l) => l.completed_at))} href={listHref(c, "lessons-watched")} />
        <Tile label="Messages Sent" {...metric(c, d.messages.filter((m) => c.userOk(m.from_user_id)).map((m) => m.created_at))} href={listHref(c, "messages-sent")} />
      </Tiles>
      <Grid2>
        <Bars title="Where Members Spend Time" subtitle={`Actions ${c.label}, by app`} rows={where} />
        <Funnel title="Funnel" subtitle={`${c.label} · how far new members get`} steps={[
          { label: "Signed up", n: joined.length, href: listHref(c, "new-members") },
          { label: "Verified", n: joined.filter((u) => u.email_verified).length },
          { label: "Profile done", n: profileDone.length },
          { label: "First lesson", n: joined.filter((u) => lessonSet.has(u.id)).length },
          { label: "Connected", n: joined.filter((u) => connected.has(u.id)).length },
          { label: "First order", n: joined.filter((u) => ordered.has(u.id)).length },
        ]} />
      </Grid2>
      <DataTable title="Lack of Use" subtitle="Where to follow up" head={["What", "Count"]} rows={[
        { cells: ["Signed up, never came back", lack.neverBack.length], href: listHref(c, "never-back") },
        { cells: ["Profile under 50% complete", lack.lowProfile.length], href: listHref(c, "low-profile") },
        { cells: ["Published paths with no learners", lack.paths.length], href: listHref(c, "paths-no-learners") },
        { cells: ["Connection requests waiting 7+ days", lack.waitingConns.length], href: listHref(c, "connections-waiting") },
        { cells: ["Work orders waiting on acceptance", lack.waitingOrders.length], href: listHref(c, "orders-waiting") },
      ]} />
    </div>
  );
}
