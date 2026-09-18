/**
 * ── ⚠⚠ `P2-J3-E572` — GIVE EVERY PATH GROUP A PERSON OWNER. ONE-TIME BACKFILL.
 *
 * SCOTT, 2026-09-18: *"EVERY Learning Path must have a forum (now group). The
 * owner of that group will be the creator of the learn content."*
 *
 * ⚠⚠⚠ THIS IS A ONE-TIME SCRIPT AND IT MUST STAY ONE. IT IS DELIBERATELY NOT A
 * HELPER THE APP CALLS, AND NOTHING IN `src/` MAY IMPORT IT.
 * ⚠ The owner is DERIVED ONCE, HERE, AND THEN FROZEN in `ForumBoard.host_person_id`.
 * A live derivation would change owner whenever someone authors more lessons —
 * write 20 lessons into a path and you take it over. That is tolerable while
 * ownership means *"you may confirm answers"*; it is NOT tolerable once an owner
 * can set a price and collect.
 * ⚠⚠ AN OWNER THAT SILENTLY CHANGES IS A BUG WITH A BANK ACCOUNT ATTACHED.
 * Same shape as `WorkOrder.fee_bps`: derived at the moment, frozen thereafter.
 *
 * ⚠⚠ OWNERSHIP IS NOT AUTHORITY. This script does not touch who may CONFIRM an
 * answer — that stays `teachesPathWhere`-wide, because the owner is ONE person
 * but everyone who teaches in a path may still confirm. Collapsing the two
 * re-creates the `E558` lockout.
 *
 * ⚠ DRY RUN BY DEFAULT. Pass `--apply` to write. A backfill that writes the
 * moment you run it gives you no chance to read its plan first.
 *
 *   npm run backfill:path-group-owner              # prints the plan, writes nothing
 *   npm run backfill:path-group-owner -- --apply   # writes
 */
import { prisma } from "@/lib/prisma";

const APPLY = process.argv.includes("--apply");

/** Which rule produced an owner — reported per row so the table is auditable. */
type Tier = "declared lead" | "largest contributor" | "Panameer";

/**
 * ⚠⚠ RESOLVED FROM THE DATABASE, NEVER FROM A NAME OR AN ID IN A BRIEF —
 * load-bearing rule 10. ⚠ `is_support` is the one flag that means "Panameer's
 * own staff", and it must resolve to EXACTLY ONE person. If it does not, this
 * script STOPS rather than guessing: the brief's instruction is *"if there is no
 * such row, REPORT AND STOP. Do not invent one."*
 */
async function panameerPerson() {
  const staff = await prisma.person.findMany({
    where: { is_support: true },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      title: true,
      company: { select: { name: true } },
      user: { select: { email: true, is_system_admin: true } },
    },
  });
  if (staff.length !== 1) {
    throw new Error(
      `E572 STOP — Panameer must resolve to exactly one is_support Person, found ${staff.length}. ` +
        `Do not invent one; report and stop. [${staff.map((s) => `${s.first_name} ${s.last_name}`).join(", ")}]`
    );
  }
  return staff[0];
}

async function main() {
  const panameer = await panameerPerson();
  console.log(
    `PANAMEER AS A PERSON: ${panameer.first_name} ${panameer.last_name} · ${panameer.id}\n` +
      `  title=${panameer.title ?? "-"} · company=${panameer.company.name} · ` +
      `user=${panameer.user?.email ?? "NO USER"} · system_admin=${panameer.user?.is_system_admin ?? "-"}\n` +
      `  resolved by: the single Person with is_support = true\n`
  );

  /* ⚠ Only boards that HAVE a path. The four general boards are out of scope —
     they are retired by their own brief, and until then they have no owner. */
  const boards = await prisma.forumBoard.findMany({
    where: { learning_path_id: { not: null } },
    select: {
      id: true,
      slug: true,
      host_person_id: true,
      learningPath: {
        select: {
          id: true,
          title: true,
          expert_person_id: true,
          expert: { select: { first_name: true, last_name: true } },
          courses: {
            select: {
              sections: {
                select: {
                  lessons: {
                    select: { expert_person_id: true, created_at: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { slug: "asc" },
  });

  const plan: {
    path: string;
    slug: string;
    ownerId: string;
    ownerName: string;
    tier: Tier;
    detail: string;
  }[] = [];

  for (const b of boards) {
    const p = b.learningPath;
    if (!p) continue;

    /* ── TIER 1 — the declared lead ─────────────────────────────────────── */
    if (p.expert_person_id) {
      plan.push({
        path: p.title,
        slug: b.slug,
        ownerId: p.expert_person_id,
        ownerName: p.expert ? `${p.expert.first_name} ${p.expert.last_name}` : "(unnamed)",
        tier: "declared lead",
        detail: "LearningPath.expert_person_id",
      });
      continue;
    }

    /* ── TIER 2 — the largest lesson contributor ────────────────────────── */
    /* ⚠⚠ WHY NOT THE DECLARED LEAD ALONE: 13 of 23 paths have none, and Scott
       is the declared expert on ZERO of his 16. The narrow field hands him none
       of the paths he wrote — the same failure that locked him out of confirming
       answers in `E558` WS-B, in a new shape. */
    const lessons = p.courses
      .flatMap((c) => c.sections)
      .flatMap((s) => s.lessons)
      .filter((l): l is { expert_person_id: string; created_at: Date } => Boolean(l.expert_person_id));

    if (lessons.length > 0) {
      const byPerson = new Map<string, { n: number; earliest: Date }>();
      for (const l of lessons) {
        const cur = byPerson.get(l.expert_person_id);
        if (!cur) byPerson.set(l.expert_person_id, { n: 1, earliest: l.created_at });
        else {
          cur.n += 1;
          if (l.created_at < cur.earliest) cur.earliest = l.created_at;
        }
      }
      /* ⚠ TIE-BREAK, EXACTLY AS BRIEFED: most lessons wins; on a tie, the author
         of the EARLIEST-CREATED lesson. Deterministic — a tie must not resolve by
         whatever order the database happened to return. */
      const winner = [...byPerson.entries()].sort(
        (a, b2) => b2[1].n - a[1].n || a[1].earliest.getTime() - b2[1].earliest.getTime()
      )[0];
      const person = await prisma.person.findUnique({
        where: { id: winner[0] },
        select: { first_name: true, last_name: true },
      });
      plan.push({
        path: p.title,
        slug: b.slug,
        ownerId: winner[0],
        ownerName: person ? `${person.first_name} ${person.last_name}` : "(unnamed)",
        tier: "largest contributor",
        detail: `${winner[1].n} of ${lessons.length} attributed lessons`,
      });
      continue;
    }

    /* ── TIER 3 — Panameer, the fallback that guarantees no group is ownerless */
    plan.push({
      path: p.title,
      slug: b.slug,
      ownerId: panameer.id,
      ownerName: `${panameer.first_name} ${panameer.last_name}`,
      tier: "Panameer",
      detail: "no declared lead and no attributed lesson",
    });
  }

  console.log(`PLAN — ${plan.length} path groups\n`);
  for (const r of plan) {
    console.log(
      `  ${r.path.padEnd(46).slice(0, 46)} | ${r.ownerName.padEnd(22).slice(0, 22)} | ${r.tier.padEnd(20)} | ${r.detail}`
    );
  }
  const tally = plan.reduce<Record<string, number>>((a, r) => ((a[r.tier] = (a[r.tier] ?? 0) + 1), a), {});
  console.log(`\nBY TIER: ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(" · ")}`);

  const already = boards.filter((b) => b.host_person_id).length;
  console.log(`ALREADY OWNED (before this run): ${already} of ${boards.length}`);

  if (!APPLY) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply to write.");
    return;
  }

  /* ⚠ ONE UPDATE PER BOARD, BY ID. No `updateMany` over a derived where-clause:
     each row's owner was derived individually and is written individually. */
  let written = 0;
  for (const r of plan) {
    const board = boards.find((b) => b.slug === r.slug)!;
    await prisma.forumBoard.update({
      where: { id: board.id },
      data: { host_person_id: r.ownerId },
    });
    written += 1;
  }
  console.log(`\nWROTE ${written} row(s).`);

  const ownerless = await prisma.forumBoard.count({
    where: { learning_path_id: { not: null }, host_person_id: null },
  });
  console.log(`VERIFY — path boards still ownerless: ${ownerless} (must be 0)`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
