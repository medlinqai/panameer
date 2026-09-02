/**
 * BACKFILL `Lesson.duration_seconds` (`P1-J3-E361`).
 *
 * ⚠ IDEMPOTENT. Re-running must not change a correct row: every pass skips rows
 * that already carry a duration, and Pass A recomputes from the same immutable
 * string so a second run writes the same value or nothing.
 *
 * THE ORDER IS PASS A -> PASS C -> PASS B, AND THAT ORDER IS THE POINT:
 *
 *   A  convert the stored `run_time` strings                (Scott's own times)
 *   C  ⚠⚠ CROSS-CHECK those against Vimeo on the 186 lessons that have BOTH,
 *      to PROVE the 60× rule before trusting it            (measure, no writes)
 *   B  fill the remaining playable lessons from Vimeo        (only if C agrees)
 *
 * ⚠ B RUNS ONLY IF C AGREES. A broken conversion rule applied to 300 rows is
 * worse than no durations at all, so C gates B in code rather than in a comment
 * — `--force-b` exists to override it and prints a warning when used.
 *
 * Run:  npx esbuild prisma/backfill-lesson-duration.ts --bundle --platform=node \
 *         --format=cjs --packages=external --alias:@=./src \
 *         --outfile=.harness/backfill-duration.cjs && \
 *       node -r dotenv/config .harness/backfill-duration.cjs dotenv_config_path=.env.local
 *
 * Flags: `--dry` writes nothing · `--force-b` runs Pass B even if C disagreed.
 */
import { prisma } from "@/lib/prisma";
import { parseRunTime, DURATION_CEILING_SECONDS } from "@/lib/lesson-duration";

const DRY = process.argv.includes("--dry");
const FORCE_B = process.argv.includes("--force-b");

/** ⚠ How far apart an XLS value and Vimeo may be and still count as agreeing. */
const AGREE_TOLERANCE_SECONDS = 2;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Vimeo's oEmbed. ⚠ NO KEY, NO AUTH, NO ACCOUNT — and the FULL ref including any
 * privacy hash, because the unlisted videos need it.
 * ⚠ A FAILURE IS RETURNED, NEVER GUESSED.
 */
async function vimeoDuration(
  ref: string
): Promise<{ ok: true; seconds: number; title: string } | { ok: false; reason: string }> {
  const url = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${ref}`)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (r.status === 429) {
        /* ⚠ BACK OFF ON 429 rather than hammering. */
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!r.ok) return { ok: false, reason: `HTTP ${r.status}` };
      const j = (await r.json()) as { duration?: number; title?: string };
      if (typeof j.duration !== "number" || j.duration <= 0) {
        return { ok: false, reason: "no duration in oEmbed payload" };
      }
      return { ok: true, seconds: Math.round(j.duration), title: j.title ?? "" };
    } catch (e) {
      if (attempt === 2) {
        const m = e instanceof Error ? e.message : String(e);
        return { ok: false, reason: /abort|timeout/i.test(m) ? "timeout" : m.slice(0, 60) };
      }
      await sleep(1000);
    }
  }
  return { ok: false, reason: "retries exhausted" };
}

async function main() {
  const lessons = await prisma.lesson.findMany({
    select: { id: true, title: true, run_time: true, vimeo_ref: true, duration_seconds: true, duration_source: true },
    orderBy: { title: "asc" },
  });
  console.log(`${lessons.length} lessons · ${lessons.filter((l) => l.vimeo_ref).length} with a vimeo_ref`);
  if (DRY) console.log("⚠ --dry: nothing will be written\n");

  /* ── PASS A — convert the stored strings ─────────────────────────────────── */
  console.log("═══ PASS A · convert stored run_time ═══");
  let aFilled = 0;
  const rejects: Record<string, { title: string; raw: string }[]> = {};
  const colonSS: { title: string; raw: string; seconds: number }[] = [];
  const daysRows: { title: string; raw: string; seconds: number | null }[] = [];

  for (const l of lessons) {
    const p = parseRunTime(l.run_time);
    const isDays = /^\d+\s+days?,/.test((l.run_time ?? "").trim());
    if (!p.ok) {
      /* `empty` is the overwhelming majority and is not a finding. */
      if (p.reason !== "empty") {
        (rejects[p.reason] ??= []).push({ title: l.title, raw: p.raw });
      }
      if (isDays) daysRows.push({ title: l.title, raw: p.raw, seconds: null });
      continue;
    }
    if (/^:\d{2}$/.test((l.run_time ?? "").trim())) {
      colonSS.push({ title: l.title, raw: l.run_time!.trim(), seconds: p.seconds });
    }
    if (isDays) daysRows.push({ title: l.title, raw: l.run_time!.trim(), seconds: p.seconds });

    /* ⚠ IDEMPOTENT: already correct means no write at all. */
    if (l.duration_seconds === p.seconds && l.duration_source === "xls") continue;
    if (!DRY) {
      await prisma.lesson.update({
        where: { id: l.id },
        data: { duration_seconds: p.seconds, duration_source: "xls" },
      });
    }
    aFilled += 1;
  }
  console.log(`  filled from XLS: ${aFilled}`);
  for (const [reason, rows] of Object.entries(rejects)) {
    console.log(`  left null — ${reason}: ${rows.length}`);
    if (reason !== "status_word") rows.forEach((r) => console.log(`      "${r.raw}"  ${r.title.slice(0, 62)}`));
    else console.log(`      distinct values: ${JSON.stringify([...new Set(rows.map((r) => r.raw))])}`);
  }
  console.log(`\n  ⚠ EVERY ":SS" ROW (${colonSS.length}) — eyeball these:`);
  colonSS.forEach((r) => console.log(`      "${r.raw}" -> ${r.seconds}s   ${r.title.slice(0, 60)}`));
  console.log(`\n  ⚠ EVERY "N days" ROW (${daysRows.length}):`);
  daysRows.forEach((r) =>
    console.log(`      "${r.raw}" -> ${r.seconds === null ? `REJECTED (over ${DURATION_CEILING_SECONDS}s ceiling)` : `${r.seconds}s`}   ${r.title.slice(0, 52)}`)
  );

  /* ── PASS C — the cross-check. ⚠⚠ BEFORE PASS B, AND IT WRITES NOTHING ──── */
  console.log("\n═══ PASS C · cross-check the 60× rule against Vimeo ═══");
  const both = lessons.filter((l) => l.vimeo_ref && parseRunTime(l.run_time).ok);
  console.log(`  ${both.length} lessons have BOTH an XLS time and a video`);
  let agree = 0;
  const disagree: { title: string; xls: number; vimeo: number; diff: number }[] = [];
  const cFail: { title: string; reason: string }[] = [];
  for (const [i, l] of both.entries()) {
    const p = parseRunTime(l.run_time);
    if (!p.ok) continue;
    const v = await vimeoDuration(l.vimeo_ref!);
    if (!v.ok) { cFail.push({ title: l.title, reason: v.reason }); }
    else if (Math.abs(v.seconds - p.seconds) <= AGREE_TOLERANCE_SECONDS) agree += 1;
    else disagree.push({ title: l.title, xls: p.seconds, vimeo: v.seconds, diff: v.seconds - p.seconds });
    /* ⚠ ~4 req/s. */
    await sleep(260);
    if ((i + 1) % 40 === 0) console.log(`    …${i + 1}/${both.length}`);
  }
  const compared = agree + disagree.length;
  console.log(`  compared ${compared} (${cFail.length} unreachable)`);
  console.log(`  ⚠ AGREE within ${AGREE_TOLERANCE_SECONDS}s: ${agree}/${compared}` +
    (compared ? ` (${((agree / compared) * 100).toFixed(1)}%)` : ""));
  console.log(`  DISAGREE: ${disagree.length}`);
  disagree.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
  console.log(`  ten worst:`);
  disagree.slice(0, 10).forEach((d) =>
    console.log(`      xls=${String(d.xls).padStart(5)}s  vimeo=${String(d.vimeo).padStart(5)}s  Δ${d.diff > 0 ? "+" : ""}${d.diff}s   ${d.title.slice(0, 52)}`)
  );
  if (cFail.length) {
    console.log(`  unreachable during C:`);
    cFail.slice(0, 12).forEach((f) => console.log(`      ${f.reason}  ${f.title.slice(0, 58)}`));
  }

  /*
    ⚠⚠ THE GATE. "More than a handful" is made concrete: the rule is trusted only
    if at least 95% of comparable rows agree. Below that, Pass B does not run.
  */
  const ratio = compared ? agree / compared : 0;
  const proven = compared >= 20 && ratio >= 0.95;
  console.log(`\n  RULE ${proven ? "PROVEN" : "NOT PROVEN"} (${(ratio * 100).toFixed(1)}% agreement over ${compared} rows)`);

  if (!proven && !FORCE_B) {
    console.log("\n⚠⚠ STOPPING BEFORE PASS B. The 60× rule did not hold against real durations.");
    console.log("   Nothing further was written. Report this rather than proceeding.");
    return;
  }
  if (!proven && FORCE_B) console.log("\n⚠ --force-b: running Pass B despite Pass C. This is on the operator.");

  /* ── PASS B — Vimeo, for playable lessons Pass A did not fill ────────────── */
  console.log("\n═══ PASS B · fill from Vimeo ═══");
  const todo = await prisma.lesson.findMany({
    where: { vimeo_ref: { not: null }, duration_seconds: null },
    select: { id: true, title: true, vimeo_ref: true },
    orderBy: { title: "asc" },
  });
  console.log(`  ${todo.length} playable lessons still without a duration`);
  let bFilled = 0;
  const bFail: { title: string; reason: string }[] = [];
  const bRejected: { title: string; seconds: number }[] = [];
  for (const [i, l] of todo.entries()) {
    const v = await vimeoDuration(l.vimeo_ref!);
    if (!v.ok) { bFail.push({ title: l.title, reason: v.reason }); }
    else if (v.seconds > DURATION_CEILING_SECONDS) {
      /* ⚠ THE CEILING APPLIES TO VIMEO TOO. A real 3-hour video is still not a
         lesson, and letting it through here would defeat the harness. */
      bRejected.push({ title: l.title, seconds: v.seconds });
    } else {
      if (!DRY) {
        await prisma.lesson.update({
          where: { id: l.id },
          data: { duration_seconds: v.seconds, duration_source: "vimeo" },
        });
      }
      bFilled += 1;
    }
    await sleep(260);
    if ((i + 1) % 40 === 0) console.log(`    …${i + 1}/${todo.length}`);
  }
  console.log(`  filled from Vimeo: ${bFilled}`);
  console.log(`  over the ceiling, left null: ${bRejected.length}`);
  bRejected.forEach((r) => console.log(`      ${r.seconds}s  ${r.title.slice(0, 58)}`));
  console.log(`  ⚠ FAILURES (${bFail.length}) — reported, never guessed:`);
  bFail.forEach((f) => console.log(`      ${f.reason}  ${f.title.slice(0, 58)}`));

  /* ── coverage ────────────────────────────────────────────────────────────── */
  console.log("\n═══ COVERAGE ═══");
  const total = await prisma.lesson.count();
  const withDur = await prisma.lesson.count({ where: { duration_seconds: { not: null } } });
  const xls = await prisma.lesson.count({ where: { duration_source: "xls" } });
  const vim = await prisma.lesson.count({ where: { duration_source: "vimeo" } });
  console.log(`  ${withDur} of ${total} lessons have a duration — xls ${xls}, vimeo ${vim}`);
  const orphanNum = await prisma.lesson.count({ where: { duration_seconds: { not: null }, duration_source: null } });
  const orphanSrc = await prisma.lesson.count({ where: { duration_seconds: null, duration_source: { not: null } } });
  console.log(`  ⚠ integrity — number with no source: ${orphanNum}, source with no number: ${orphanSrc} (both must be 0)`);

  /* ⚠ THE TESTER'S PATH. This is the number that matters tomorrow. */
  const inv = await prisma.learningPath.findFirst({
    where: { title: "Inventory Management" },
    select: { courses: { select: { sections: { select: { lessons: { select: { vimeo_ref: true, duration_seconds: true } } } } } } },
  });
  const invLessons = inv?.courses.flatMap((c) => c.sections.flatMap((s) => s.lessons)) ?? [];
  const invPlayable = invLessons.filter((l) => l.vimeo_ref);
  console.log(`  ⚠ Inventory Management (the tester's path): ${invPlayable.filter((l) => l.duration_seconds).length} of ${invPlayable.length} playable lessons have a duration`);
}

main().then(() => prisma.$disconnect());
