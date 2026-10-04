import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/resend";
import { publicPlan } from "@/lib/plan/public";
import { getPanameerPlan } from "@/lib/plan/store";

/** The Friday of the week a date falls in, as a pure `YYYY-MM-DD`. */
export function weekOf(d: Date): string {
  const copy = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  /* 5 = Friday. Walk forward to this week's Friday. */
  copy.setUTCDate(copy.getUTCDate() + ((5 - copy.getUTCDay() + 7) % 7));
  return copy.toISOString().slice(0, 10);
}

export async function composeDigest(now = new Date()): Promise<{ week: string; created: boolean }> {
  const week = weekOf(now);
  const existing = await prisma.buildDigest.findUnique({ where: { week }, select: { status: true } });
  if (existing?.status === "SENT") return { week, created: false };

  const plan = await getPanameerPlan();
  const view = plan ? publicPlan(plan.plan, plan.rows, now) : null;

  const moving = view
    ? view.rows.flatMap((r) => [r, ...r.children]).filter((r) => r.status === "In progress")
    : [];
  const pct = view?.progress.percent;

  const subject = `Panameer — what moved this week`;
  const lines = [
    pct === null || pct === undefined
      ? "The plan is being set up."
      : `The plan is ${pct}% complete.`,
    "",
    moving.length === 0
      ? "Nothing is in progress right now."
      : "In progress this week:",
    ...moving.slice(0, 12).map((r) => `• ${r.number} ${r.title}`),
    "",
    "Watch it at https://status.panameer.com",
  ];

  await prisma.buildDigest.upsert({
    where: { week },
    create: { week, subject, body: lines.join("\n"), status: "DRAFT" },
    update: { subject, body: lines.join("\n") },
  });
  return { week, created: !existing };
}

/** Who a send would reach: followers who asked for it, with an address. */
export async function digestRecipients(): Promise<{ email: string; name: string }[]> {
  const followers = await prisma.workTrackerFollower.findMany({
    where: { weekly_email: true },
    select: { person_id: true },
  });
  if (followers.length === 0) return [];
  const people = await prisma.person.findMany({
    where: { id: { in: followers.map((f) => f.person_id) } },
    select: { first_name: true, user: { select: { email: true, is_active: true } } },
  });
  return people
    .filter((p) => p.user?.email && p.user.is_active)
    .map((p) => ({ email: p.user!.email, name: p.first_name ?? "there" }));
}

/**
 * SEND. Only ever called from Scott's button — never from the cron route, which
 * does not import it.
 */
export async function sendDigest(week: string): Promise<{ sent: number }> {
  const digest = await prisma.buildDigest.findUnique({ where: { week } });
  if (!digest) throw new Error("No draft for that week.");
  if (digest.status === "SENT") throw new Error("That week has already been sent.");

  const to = await digestRecipients();
  let sent = 0;
  for (const person of to) {
    try {
      await sendEmail({
        to: person.email,
        subject: digest.subject,
        template: "build-digest",
        html: `<p>Hi ${person.name},</p>${digest.body
          .split("\n")
          .map((l) => `<p>${l || "&nbsp;"}</p>`)
          .join("")}`,
      });
      sent += 1;
    } catch {
    }
  }
  await prisma.buildDigest.update({
    where: { week },
    data: { status: "SENT", sent_at: new Date(), sent_count: sent },
  });
  return { sent };
}
