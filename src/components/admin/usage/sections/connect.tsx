import { prisma } from "@/lib/prisma";
import { daysBetween, fmtDays, inCur, listHref, median, metric, series, span, type Ctx } from "@/lib/admin-usage/core";
import { peopleList, personUsers, type Lists } from "@/lib/admin-usage/lists";
import { UsageChart } from "@/components/admin/usage/UsageChart";
import { Bars, Grid2, Tile, Tiles } from "@/components/admin/usage/parts";

// A-E005: Connect — requests sent / accepted / waiting (+ median days to accept), follows, mentor requests, messages, group posts.
async function data(c: Ctx) {
  const [conns, messages, threads, posts] = await Promise.all([
    prisma.connection.findMany({ select: { from_user_id: true, to_user_id: true, kind: true, status: true, created_at: true, responded_at: true } }),
    prisma.message.findMany({ where: { created_at: span(c) }, select: { from_user_id: true, created_at: true } }),
    prisma.forumThread.findMany({ where: { created_at: span(c) }, select: { author_person_id: true, created_at: true } }),
    prisma.forumPost.findMany({ where: { created_at: span(c) }, select: { author_person_id: true, created_at: true } }),
  ]);
  return {
    conns: conns.filter((x) => c.userOk(x.from_user_id) && c.userOk(x.to_user_id)),
    messages: messages.filter((m) => c.userOk(m.from_user_id)),
    threads: threads.filter((t) => c.personOk(t.author_person_id)),
    posts: posts.filter((p) => c.personOk(p.author_person_id)),
  };
}

export async function connectLists(c: Ctx): Promise<Lists> {
  const col = async (f: (x: Awaited<ReturnType<typeof data>>["conns"][number]) => boolean, title: string) => peopleList(title, (await data(c)).conns.filter(f).map((x) => x.from_user_id));
  return {
    sent: () => col((x) => x.kind === "COLLEAGUE" && inCur(c, x.created_at), `Connection requests sent (${c.label}) — by sender`),
    accepted: () => col((x) => x.kind === "COLLEAGUE" && x.status === "ACCEPTED" && inCur(c, x.responded_at), `Accepted (${c.label}) — by sender`),
    waiting: async () => peopleList("Connection requests waiting now — the members asked", (await data(c)).conns.filter((x) => x.kind === "COLLEAGUE" && x.status === "PENDING").map((x) => x.to_user_id)),
    follows: () => col((x) => x.kind === "FOLLOW" && inCur(c, x.created_at), `Follows (${c.label}) — by follower`),
    mentor: () => col((x) => x.kind === "MENTOR" && inCur(c, x.created_at), `Mentor requests (${c.label}) — by requester`),
    posts: async () => { const d = await data(c); return peopleList(`Group posts and replies (${c.label}) — by author`, personUsers(c, [...d.threads, ...d.posts].filter((x) => inCur(c, x.created_at)).map((x) => x.author_person_id))); },
  };
}

export async function Connect({ c }: { c: Ctx }) {
  const d = await data(c);
  const col = d.conns.filter((x) => x.kind === "COLLEAGUE");
  const acceptDays = col.filter((x) => x.status === "ACCEPTED" && x.responded_at && inCur(c, x.responded_at)).map((x) => daysBetween(x.created_at, x.responded_at!));
  return (
    <div className="space-y-3">
      <UsageChart title="Messages per Day" subtitle={c.label} points={series(c, d.messages.map((m) => m.created_at))} />
      <Tiles>
        <Tile label="Requests Sent" {...metric(c, col.map((x) => x.created_at))} href={listHref(c, "sent")} />
        <Tile label="Accepted" {...metric(c, col.filter((x) => x.status === "ACCEPTED").map((x) => x.responded_at))} href={listHref(c, "accepted")} />
        <Tile label="Waiting Now" value={col.filter((x) => x.status === "PENDING").length} href={listHref(c, "waiting")} />
        <Tile label="Median Days to Accept" value={fmtDays(median(acceptDays))} />
      </Tiles>
      <Grid2>
        <Bars title="Following and Mentoring" subtitle={c.label} rows={[
          { label: "Follows", n: d.conns.filter((x) => x.kind === "FOLLOW" && inCur(c, x.created_at)).length, href: listHref(c, "follows") },
          { label: "Mentor requests", n: d.conns.filter((x) => x.kind === "MENTOR" && inCur(c, x.created_at)).length, href: listHref(c, "mentor") },
        ]} />
        <Bars title="Groups" subtitle={c.label} rows={[
          { label: "Posts", n: d.threads.filter((t) => inCur(c, t.created_at)).length, href: listHref(c, "posts") },
          { label: "Replies", n: d.posts.filter((p) => inCur(c, p.created_at)).length, href: listHref(c, "posts") },
        ]} />
      </Grid2>
    </div>
  );
}
