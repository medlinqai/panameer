/**
 * ⚠⚠⚠ ONE `filed` EVENT PER EXISTING TICKET (`P2-ALL-E761`).
 *
 *   npm run backfill:ticket-events -- --dry
 *   npm run backfill:ticket-events
 *
 * ⚠⚠ **SCOTT'S RULE, VERBATIM: *"No backfill can be honest."*** Existing tickets
 * have no past events — nobody recorded who assigned `PAN-CTXFTX` or when — and
 * **nothing is invented to fill that in.** ⚠ The ONE thing we do know for certain
 * is that each ticket was filed, by its reporter, at `created_at`. That single
 * event is written so every timeline has a beginning; everything before "now"
 * stays absent, visibly.
 *
 * ⚠ **IDEMPOTENT:** a ticket that already has a `filed` event is skipped, so a
 * second run writes nothing.
 */
import { config } from "dotenv";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

config({ path: join(process.cwd(), ".env.local"), quiet: true });

async function main() {
  const dry = process.argv.includes("--dry");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  const tickets = await prisma.supportTicket.findMany({
    select: { id: true, ticket_code: true, reporter_person_id: true, created_at: true },
    orderBy: { created_at: "asc" },
  });
  const existing = await prisma.ticketEvent.findMany({
    where: { kind: "filed" },
    select: { ticket_id: true },
  });
  const have = new Set(existing.map((e) => e.ticket_id));

  let written = 0;
  let skipped = 0;
  for (const t of tickets) {
    if (have.has(t.id)) {
      skipped++;
      continue;
    }
    if (!dry) {
      await prisma.ticketEvent.create({
        data: {
          ticket_id: t.id,
          actor_person_id: t.reporter_person_id,
          kind: "filed",
          /* ⚠ The ticket's OWN created_at, not now — the event records when it
             was filed, and a backfill stamped with today would be the invented
             history this script exists to avoid. */
          created_at: t.created_at,
        },
      });
    }
    written++;
  }

  const total = await prisma.ticketEvent.count();
  console.log(
    [
      "",
      `backfill:ticket-events — ${dry ? "DRY RUN, nothing written" : "written"}`,
      `  tickets        : ${tickets.length}`,
      `  filed written  : ${written}`,
      `  already had one: ${skipped}`,
      `  ticket_events now: ${total}`,
      "  ⚠ Nothing else is backfilled. Assignments and status changes before today",
      "    were never recorded and are not invented.",
      "",
    ].join("\n")
  );
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
